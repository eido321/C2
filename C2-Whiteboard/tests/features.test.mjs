import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {PGlite} from '@electric-sql/pglite';
import {PDFDocument, PDFName} from 'pdf-lib';
import {preview} from 'vite';
import {createLibrary} from '../server/library.js';

let browser, server, db, base;
before(async () => {
  db = new PGlite();
  const library = createLibrary(async (sql, args) => (await db.query(sql, args)).rows);
  server = await preview({
    preview: {host: '127.0.0.1', port: 0},
    plugins: [
      {
        name: 'test-library',
        configurePreviewServer(vite) {
          vite.middlewares.use('/api/library', async (req, res) => {
            try {
              const parts = [];
              for await (const part of req) parts.push(part);
              req.body = JSON.parse(Buffer.concat(parts).toString());
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };
              await library(req, res);
            } catch (error) {
              res.statusCode = 500;
              res.end(String(error));
            }
          });
        },
      },
    ],
  });
  base = 'http://127.0.0.1:' + server.httpServer.address().port;
  browser = await chromium.launch(
    process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {channel: 'chrome'},
  );
});
after(async () => {
  await browser?.close();
  await server?.close();
  await db?.close();
});

async function open(t, width = 1500) {
  const page = await browser.newPage({viewport: {width, height: 900}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  t.after(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });
  page.setDefaultTimeout(8000);
  await page.goto(base);
  return page;
}
const button = (p, name) => p.getByRole('button', {name, exact: typeof name === 'string'});
const draft = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('c2_whiteboard_v1')));
async function saved(p) {
  await p.getByText('Saved on device', {exact: true}).waitFor();
}
async function download(p, name) {
  const [file] = await Promise.all([p.waitForEvent('download', {timeout: 15000}), button(p, name).click()]);
  return readFile(await file.path());
}

test('every shipped template opens, persists, and exports a fillable PDF', async (t) => {
  const p = await open(t);
  await button(p, /Blank canvas/).waitFor();
  const dialogs = [];
  p.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });
  const names = await p.locator('button h3').allTextContents();
  assert.ok(names.length >= 14);
  for (const name of names.filter((n) => n !== 'Blank canvas')) {
    await p
      .locator('button')
      .filter({has: p.getByRole('heading', {name, exact: true})})
      .click();
    await saved(p);
    const b = await draft(p);
    assert.equal(b.name, name);
    assert.ok(b.blocks.length > 2);
    assert.equal(new Set(b.blocks.map((x) => x.id)).size, b.blocks.length);
    const bytes = await download(p, 'Export PDF');
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getForm().getFields().length > 0, name);
    await p.getByLabel('Sheet name').fill('Awaiting import');
    await p
      .locator('header input[type=file]')
      .setInputFiles({name: 'template.pdf', mimeType: 'application/pdf', buffer: bytes});
    await p.waitForFunction((expected) => document.querySelector('header input').value === expected, name);
    await saved(p);
    assert.deepEqual(
      (await draft(p)).blocks.map((b) => b.id),
      b.blocks.map((b) => b.id),
    );
    await button(p, 'Templates').click();
  }
});

test('all eight block editors, layers, canvas, shortcuts, PDF and JSON round trips', async (t) => {
  const p = await open(t);
  await button(p, /Blank canvas/).click();
  const pane = p.locator('aside').last();
  const add = async (prefix) =>
    button(p, new RegExp('^' + prefix))
      .first()
      .click();
  await add('Heading Title');
  await pane.getByLabel('Title', {exact: true}).fill('Astra → North');
  await pane.getByRole('button', {name: 'Align center'}).click();
  await pane.getByLabel('Rotation').fill('5');
  await add('Text Notes');
  await pane.getByLabel('Text', {exact: true}).fill('Field notes');
  await add('Ability Scores STR');
  await pane.getByLabel('STR', {exact: true}).fill('16');
  await add('Stat AC');
  await pane.getByLabel('Value', {exact: true}).fill('19');
  await add('List Inventory');
  assert.equal(await pane.getByPlaceholder('List item').count(), 1);
  assert.equal(await pane.getByPlaceholder('List item').inputValue(), 'Backpack');
  assert.equal(await pane.getByLabel('Title',{exact:true}).inputValue(), 'Inventory & Gear');
  await pane.getByPlaceholder('List item').first().fill('Journal');
  await button(pane, 'Numbers').click();
  await button(pane, 'Checks').click();
  await button(pane, 'Add').click();
  assert.equal(await pane.getByPlaceholder('List item').last().inputValue(), '');
  await pane.getByTitle('Checked', {exact: true}).first().check();
  await pane.getByTitle('Move down').first().click();
  await pane.getByTitle('Remove item').last().click();
  await add('Spell List Spells');
  await pane.getByTitle('Total slots').first().fill('4');
  await button(pane, 'Add level').click();
  await button(pane, 'Add spell').last().click();
  await pane.getByPlaceholder('Spell name').last().fill('Starlight');
  await pane.getByTitle('Remove level').last().click();
  await add('Image Portrait');
  const portrait = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    c.getContext('2d').fillRect(0, 0, 8, 8);
    return c.toDataURL();
  });
  await pane.getByLabel('Image URL').fill(portrait);
  await add('Divider Section');
  await pane.getByLabel('Ornament').uncheck();
  const layers = p.locator('aside').first();
  const rows = layers.locator('[draggable=true]');
  await rows.first().locator('span[title]').click();
  await rows
    .nth(1)
    .locator('span[title]')
    .click({modifiers: ['Control']});
  await p.getByTitle('Group selection', {exact: true}).waitFor();
  await p.keyboard.press('Control+g');
  await saved(p);
  assert.equal((await draft(p)).groups.length, 1);
  await p.keyboard.press('Control+Shift+g');
  await saved(p);
  assert.equal((await draft(p)).groups.length, 0);
  await rows.first().locator('span[title]').click();
  await p.keyboard.press('Control+d');
  await saved(p);
  assert.equal((await draft(p)).blocks.length, 9);
  await p.keyboard.press('Delete');
  await saved(p);
  await rows.first().getByTitle('Lock', {exact: true}).click();
  await rows.first().getByTitle('Unlock', {exact: true}).click();
  await rows.first().getByTitle('Hide', {exact: true}).click();
  await rows.first().getByTitle('Show', {exact: true}).click();
  await rows.first().hover();
  await rows.first().getByTitle('Send to back', {exact: true}).click();
  await p.getByTitle('Zoom in', {exact: true}).click();
  assert.equal(await p.getByTitle('Reset view').first().innerText(), '110%');
  await p.getByTitle('Zoom out').click();
  await p.getByTitle('Fit to content').click();
  await p.getByTitle('Reset view').first().click();
  await p.getByTitle('Snap to grid: off').click();
  await p.getByTitle('Snap to grid: on').waitFor();
  await saved(p);
  const original = JSON.parse(await download(p, 'Export JSON'));
  assert.equal(original.blocks.length, 8);
  assert.equal(original.blocks.find((b) => b.type === 'heading').style.align, 'center');
  const pdf = await PDFDocument.load(await download(p, 'Export PDF'));
  assert.ok(pdf.getPages()[0].node.Resources().lookup(PDFName.of('XObject')).keys().length);
  const stat = original.blocks.find((b) => b.type === 'statBlock');
  const form = pdf.getForm();
  const findBlock = (type) => original.blocks.find((b) => b.type === type);
  form.getTextField(stat.id + '.value').setText('23');
  form.getTextField(findBlock('heading').id + '.subtitle').setText('Night watch');
  form.getTextField(findBlock('abilityScores').id + '.str').setText('18');
  const group = findBlock('spellList').content.groups[1];
  const spellKey = findBlock('spellList').id + '.spell.' + group.spells[0].id;
  form.getTextField(spellKey + '.description').setText('PDF spell notes');
  form.getCheckBox(spellKey + '.prepared').uncheck();
  form.getCheckBox(findBlock('list').id + '.item.0.checked').check();
  const file = p.locator('header input[type=file]');
  const messages = [];
  p.on('dialog', async (d) => {
    messages.push(d.message());
    await d.accept();
  });
  await file.setInputFiles({
    name: 'sheet.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save({updateFieldAppearances: false})),
  });
  await p.waitForFunction(() =>
    JSON.parse(localStorage.getItem('c2_whiteboard_v1')).blocks.some(
      (b) => b.type === 'statBlock' && b.content.value === '23',
    ),
  );
  const imported = (await draft(p)).blocks;
  assert.equal(imported.find((b) => b.type === 'heading').content.subtitle, 'Night watch');
  assert.equal(imported.find((b) => b.type === 'abilityScores').content.abilities[0].score, 18);
  const editedSpell = imported.find((b) => b.type === 'spellList').content.groups[1].spells[0];
  assert.equal(editedSpell.prepared, false);
  assert.equal(editedSpell.description, 'PDF spell notes');
  assert.equal(imported.find((b) => b.type === 'list').content.items[0].checked, true);
  await file.setInputFiles({
    name: 'sheet.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await p.waitForFunction(() =>
    JSON.parse(localStorage.getItem('c2_whiteboard_v1')).blocks.some(
      (b) => b.type === 'statBlock' && b.content.value === '19',
    ),
  );
  const corrupt = structuredClone(original);
  corrupt.blocks[0].content = null;
  const alert = p.waitForEvent('dialog');
  await file.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(corrupt)),
  });
  await alert;
  assert.match(messages.at(-1), /Invalid sheet/);
  assert.deepEqual((await draft(p)).blocks, original.blocks);
  await p.reload();
  assert.equal(new URL(p.url()).pathname, '/whiteboard');
  await saved(p);
  assert.deepEqual((await draft(p)).blocks, original.blocks);
});

test('phone guest editor, guest draft migration, searchable private library and session boundaries', async (t) => {
  const p = await open(t, 390);
  await button(p, /Blank canvas/).click();
  await p.getByLabel('Sheet name').waitFor();
  assert.ok((await p.locator('main').boundingBox()).width > 250);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390);
  await p.getByTitle('Show layers & blocks').click();
  await button(p, /^Text Notes/).click();
  await p.getByTitle('Collapse panel').first().click();
  await p.getByTitle('Show properties').click();
  await p.locator('aside').getByLabel('Text', {exact: true}).fill('Guest journal');
  await p.getByTitle('Collapse panel').click();
  await p.getByLabel('Sheet name').fill('Warden');
  await saved(p);
  await button(p, 'Exit editor').click();
  await p.getByRole('heading', {name: 'My sheets', exact: true}).waitFor();
  await p.getByRole('heading', {name: 'Start a new sheet'}).waitFor();
  assert.equal(await p.getByTitle('Close', {exact: true}).count(), 0);
  await button(p, 'Login').click();
  await p.getByRole('heading', {name: 'Sign in'}).waitFor();
  await button(p, 'Continue without signing in').click();
  await button(p, 'Login').click();
  await button(p, 'Create an account').click();
  const password = 'abcdef';
  assert.equal(await p.getByLabel('Password').getAttribute('minlength'), '6');
  assert.equal((await p.request.post(base + '/api/library', {data:{action:'register',username:'too_short',password:'abcde'}})).status(),400);
  await p.getByLabel('Username').fill('test_warden');
  await p.getByLabel('Password').fill(password);
  await button(p, 'Create account').click();
  await button(p, /Copy this device/).click();
  await p.getByText('Saved to account', {exact: true}).waitFor();
  await button(p, 'Exit editor').click();
  await p.getByRole('heading', {name: 'D&D 2024 Classes'}).waitFor();
  const search = p.getByLabel('Find a sheet');
  await search.fill('missing');
  await p.getByText('No matching sheets.').waitFor();
  await search.fill('ward');
  await button(p, /^Warden/).click();
  await p.getByLabel('Sheet name').fill('Warden revised');
  await p.getByText('Saved to account', {exact: true}).waitFor();
  await button(p, 'Exit editor').click();
  const api = (client, data) => client.post(base + '/api/library', {data});
  const rows = (await (await api(p.request, {action: 'list'})).json()).sheets;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Warden revised');
  const id = rows[0].id;
  const {board, revision} = await (await api(p.request, {action: 'open', id})).json();
  assert.equal(board.blocks[0].content.text, 'Guest journal');
  assert.equal((await api(p.request, {action: 'save', id, board, revision: revision - 1})).status(), 409);
  await button(p, 'Sign out').click();
  await button(p, 'Login').waitFor();
  assert.equal((await api(p.request, {action: 'open', id})).status(), 401);
  const q = await open(t);
  await button(q, 'Login').click();
  await q.getByLabel('Username').fill('test_warden');
  await q.getByLabel('Password').fill(password);
  await button(q, 'Sign in').click();
  await button(q, /^Warden revised/).click();
  assert.equal(await q.getByLabel('Sheet name').inputValue(), 'Warden revised');
  const editorAddress = q.url();
  assert.equal(new URL(editorAddress).searchParams.get('sheet'), id);
  await q.reload();
  assert.equal(await q.getByLabel('Sheet name').inputValue(), 'Warden revised');
  assert.equal(q.url(), editorAddress);
  assert.equal(
    (await api(p.request, {action: 'login', username: 'test_warden', password: 'invalid'})).status(),
    401,
  );
  assert.equal((await api(p.request, {action: 'register', username: 'test_warden', password})).status(), 409);
  await api(p.request, {action: 'register', username: 'test_other', password});
  assert.deepEqual((await (await api(p.request, {action: 'list'})).json()).sheets, []);
  assert.equal((await api(p.request, {action: 'open', id})).status(), 404);
  assert.equal((await api(p.request, {action: 'delete', id})).status(), 404);
  await button(q, 'Exit editor').click();
  const trash = button(q, 'Delete Warden revised');

  await trash.click();
  const confirmation = q.getByRole('dialog',{name:'Delete character sheet?'});
  await confirmation.getByRole('button',{name:'Cancel'}).click();
  await trash.waitFor();

  await trash.click();
  await confirmation.getByRole('button',{name:'Delete sheet'}).click();
  await trash.waitFor({state:'detached'});
  assert.equal(await button(q, /Continue last whiteboard/).count(), 0);
  assert.equal((await api(q.request, {action:'open', id})).status(), 404);
});

test('pointer movement, resize handles, inline edits, panel sizing, panning and legacy HTML import', async (t) => {
  const p = await open(t);
  await button(p, /Blank canvas/).click();
  await button(p, /^Heading Title/).click();
  const block = p.locator('main .group.absolute').first();
  const move = async (element, dx, dy) => {
    const box = await element.boundingBox();
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + dx, y + dy, {steps: 5});
    await p.mouse.up();
  };
  await saved(p);
  const initial = (await draft(p)).blocks[0];
  await move(block, 32, 26);
  await saved(p);
  let current = (await draft(p)).blocks[0];
  assert.equal(current.x, initial.x + 32);
  assert.equal(current.y, initial.y + 26);
  await move(block.locator('[style*="se-resize"], [style*="nwse-resize"]').last(), 42, 20);
  await saved(p);
  current = (await draft(p)).blocks[0];
  assert.equal(current.width, initial.width + 42);
  await block.dblclick();
  await block.getByPlaceholder('Subtitle').fill('Wanderer');
  await saved(p);
  assert.equal((await draft(p)).blocks[0].content.subtitle, 'Wanderer');
  await p.keyboard.press('Escape');
  assert.equal(await block.getByPlaceholder('Subtitle').count(), 0);
  await p.keyboard.down('Space');
  await move(block, 24, 16);
  await p.keyboard.up('Space');
  await saved(p);
  assert.equal((await draft(p)).blocks[0].x, current.x);
  assert.deepEqual((await draft(p)).viewport.pan, {x: 24, y: 16});
  const area = await p.locator('main').boundingBox();
  await p.keyboard.down('Space');
  await p.mouse.move(area.x + 25, area.y + 25);
  await p.mouse.down();
  await p.mouse.move(area.x + 75, area.y + 55);
  await p.mouse.up();
  await saved(p);
  await p.keyboard.up('Space');
  assert.deepEqual((await draft(p)).viewport.pan, {x: 74, y: 46});
  const left = p.locator('aside').first();
  const originalWidth = (await left.boundingBox()).width;
  await move(left.getByRole('separator'), 36, 0);
  assert.equal((await left.boundingBox()).width, originalWidth + 36);
  await left.getByRole('separator').dblclick();
  assert.equal((await left.boundingBox()).width, originalWidth);
  const legacy = {name: 'Legacy HTML', blocks: [initial]};
  p.once('dialog', (d) => d.accept());
  await p
    .locator('header input[type=file]')
    .setInputFiles({
      name: 'legacy.html',
      mimeType: 'text/html',
      buffer: Buffer.from(
        '<script id="c2-board-data" type="application/json">' + JSON.stringify(legacy) + '</script>',
      ),
    });
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('c2_whiteboard_v1')).name === 'Legacy HTML');
  const restored = await draft(p);
  assert.deepEqual(restored.groups, []);
  assert.equal(restored.viewport.zoom, 1);
});







test('canvas selection, clipboard, movement and history', async t => {
  const p = await open(t);
  await p.context().grantPermissions(['clipboard-read','clipboard-write']);
  await button(p,/Blank canvas/).click();
  await button(p,/^Heading Title/).click();
  const pane = p.locator('aside').last();
  await pane.getByLabel('X',{exact:true}).fill('10');
  await pane.getByLabel('Y',{exact:true}).fill('60');
  await button(p,/^Text Notes/).click();
  await pane.getByLabel('X',{exact:true}).fill('410');
  await pane.getByLabel('Y',{exact:true}).fill('60');
  const area = await p.locator('main').boundingBox();
  const point = (x,y) => p.mouse.move(area.x+x,area.y+y);
  await point(3,45); await p.mouse.down(); await point(455,150); await p.mouse.up();
  assert.equal(await p.getByTitle('Group selection',{exact:true}).isEnabled(),true);
  await p.keyboard.down('Control'); await p.mouse.click(area.x+450,area.y+100); await p.keyboard.up('Control');
  assert.equal(await p.getByTitle('Group selection',{exact:true}).isEnabled(),false);
  await p.keyboard.press('Control+a');
  await point(80,95); await p.mouse.down(); await point(110,115); await p.mouse.up();
  await saved(p);
  assert.deepEqual((await draft(p)).blocks.map(b=>b.x),[40,440]);
  await p.keyboard.press('Shift+ArrowRight');
  await p.keyboard.press('Control+c');
  await p.keyboard.press('Control+v');
  await saved(p);
  assert.equal((await draft(p)).blocks.length,4);
  await p.keyboard.press('Control+x');
  await saved(p); assert.equal((await draft(p)).blocks.length,2);
  await p.keyboard.press('Control+z');
  await saved(p); assert.equal((await draft(p)).blocks.length,4);
  await p.keyboard.press('?');
  await p.getByRole('dialog',{name:'Keyboard shortcuts'}).waitFor();
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+Shift+z');
  await saved(p); assert.equal((await draft(p)).blocks.length,2);
});




test('clipboard and dropped image files persist as image blocks', async t => {
  const p = await open(t);
  await p.context().grantPermissions(['clipboard-read','clipboard-write']);
  await button(p,/Blank canvas/).click();
  await p.getByLabel('Sheet name').waitFor();
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width=32;c.height=16;
    const blob=await new Promise(resolve=>c.toBlob(resolve));
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
    const data=new DataTransfer(); data.items.add(new File([blob],'portrait.png',{type:'image/png'}));
    const canvas=document.querySelector('main .touch-none');
    const rect=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data,clientX:rect.left+75,clientY:rect.top+90}));
  });
  await p.keyboard.press('Control+v');
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('c2_whiteboard_v1')).blocks.length===2);
  const blocks=(await draft(p)).blocks;
  assert.ok(blocks.every(b=>b.type==='image' && b.content.src.startsWith('data:image/png') && b.width===32 && b.height===16));
  const dropped=blocks.find(b=>b.content.alt==='portrait.png');assert.equal(dropped.x,59);assert.ok(Math.abs(dropped.y-82)<=1);
  await p.reload(); await p.getByLabel('Sheet name').waitFor();
  assert.equal(await p.locator('main img').count(),2);
});


test('spell levels and display settings can be changed for individual spells', async (t) => {
  const p = await open(t);
  await button(p, /Blank canvas/).click();
  await button(p, /^Spell List Spells/).click();
  const pane = p.locator('aside').last();
  const spell = (name) => pane.getByRole('group', {name, exact: true});
  const canvas = p.locator('main');
  const card = (name) => canvas.getByRole('article', {name, exact: true});

  await button(spell('Magic Missile'), 'Edit Magic Missile').click();
  await spell('Magic Missile').getByLabel('Spell level').selectOption({label: '9th Level'});
  const ninthLevel = pane.getByRole('group', {name: '9th Level', exact: true});
  const firstLevel = pane.getByRole('group', {name: '1st Level', exact: true});
  assert.equal(await ninthLevel.getByPlaceholder('Spell name').inputValue(), 'Magic Missile');
  assert.equal(await firstLevel.getByPlaceholder('Spell name').inputValue(), 'Shield');

  await pane.getByLabel('New spell level').selectOption({label: '5th Level'});
  await button(pane, 'Add level').click();
  const fifthLevel = pane.getByRole('group', {name: '5th Level', exact: true});
  await button(fifthLevel, 'Add spell').click();
  await fifthLevel.getByPlaceholder('Spell name').fill('Starlight');

  const fireBolt = spell('Fire Bolt');
  await button(fireBolt, 'Edit Fire Bolt').click();
  await fireBolt.getByLabel('Use list display settings').uncheck();
  await button(fireBolt, 'Range').click();
  assert.equal(await card('Fire Bolt').getByText('120 ft', {exact: false}).count(), 0);
  assert.equal(await card('Mage Hand').getByText('30 ft', {exact: false}).count(), 1);

  await fireBolt.getByText('Spell details', {exact: true}).click();
  await fireBolt.getByLabel('Range', {exact: true}).fill('150 ft');
  await button(fireBolt, 'Range').click();
  await pane.getByText('Spell List settings', {exact: true}).click();
  await pane.getByText('List display settings', {exact: true}).click();
  await button(pane, 'Compact').click();
  assert.equal(await card('Fire Bolt').getByText('150 ft', {exact: false}).count(), 1);
  assert.equal(await card('Mage Hand').getByText('30 ft', {exact: false}).count(), 0);

  await saved(p);
  const block = (await draft(p)).blocks.find((b) => b.type === 'spellList');
  assert.deepEqual(block.content.groups.map((group) => group.level), [0, 1, 5, 9]);
  assert.deepEqual(block.content.groups[0].spells.map((entry) => entry.range), ['150 ft', '30 ft']);
  assert.equal(block.content.groups[0].spells[1].columns, undefined);

  const pdf = await PDFDocument.load(await download(p, 'Export PDF'));
  const fireBoltId = block.content.groups[0].spells[0].id;
  assert.match(pdf.getForm().getTextField(`${block.id}.spell.${fireBoltId}.meta`).getText(), /Range: 150 ft/);
  await canvas.getByText('Spells', {exact: true}).click();
  await button(fireBolt, 'Edit Fire Bolt').click();
  await fireBolt.getByLabel('Use list display settings').check();
  assert.equal(await card('Fire Bolt').getByText('150 ft', {exact: false}).count(), 0);

  await canvas.getByText('Spells', {exact: true}).dblclick();
  await canvas.getByLabel('Add spell level').selectOption({label: '7th Level'});
  await pane.getByRole('group', {name: '7th Level', exact: true}).waitFor();
});

test('the spellbook adds catalog and custom spells and tracks preparation and slots from the canvas', async (t) => {
  const p = await open(t);
  await button(p, /Blank canvas/).click();
  await button(p, /^Spell List Spells/).click();
  const canvas = p.locator('main');
  const picker = p.getByRole('dialog', {name: 'Add spells'});
  const level = canvas.getByLabel('Filter spells by level');

  await button(canvas, 'Add spell').click();
  await picker.getByLabel('Catalog spell level').selectOption({label: '9th Level'});
  await picker.getByLabel('Spellcasting class').selectOption('Wizard');
  await picker.getByLabel('Search spell catalog').fill('Meteor Swarm');
  await button(picker, 'Add Meteor Swarm').click();
  assert.equal(await button(picker, 'Added Meteor Swarm').getAttribute('aria-disabled'), 'true');
  await button(picker, 'Done').click();
  await level.selectOption({label: '9th Level'});
  assert.equal(await canvas.getByRole('article', {name: 'Meteor Swarm'}).count(), 1);
  await button(canvas, 'Prepare Meteor Swarm').click();
  await button(canvas, 'Prepared').click();
  await canvas.getByText('No spells match these filters.').waitFor();
  await button(canvas, 'Prepared').click();

  await level.selectOption({label: '1st Level'});
  await button(canvas, 'Spend 1st Level slot').click();
  assert.equal(await canvas.getByTitle('Slots remaining').textContent(), '1/2 slots');
  await button(canvas, 'Restore all spell slots').click();
  assert.equal(await canvas.getByTitle('Slots remaining').textContent(), '2/2 slots');

  await button(canvas, 'Add spell').click();
  await button(picker, 'Custom spell').click();
  await picker.getByLabel('Spell name').fill('Echo Ward');
  await picker.getByLabel('Spell level').selectOption({label: '4th Level'});
  await button(picker, 'Add custom spell').click();
  await canvas.getByRole('article', {name: 'Echo Ward'}).waitFor();
  await level.selectOption({label: 'All levels'});
  await button(canvas, 'Search your spells').click();
  await canvas.getByLabel('Search your spells').fill('Echo');
  assert.deepEqual(await canvas.getByRole('article').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label'))), ['Echo Ward']);

  await saved(p);
  await p.reload();
  await saved(p);
  await level.selectOption({label: '9th Level'});
  assert.equal(await button(canvas, 'Prepare Meteor Swarm').getAttribute('aria-pressed'), 'false');
  await level.selectOption({label: '4th Level'});
  await canvas.getByRole('article', {name: 'Echo Ward'}).waitFor();
});

test('font slider scales rendered list and spell titles and persists', async t => {
  const p = await open(t);
  await button(p,/Blank canvas/).click();
  for (const [palette,title] of [[/^List Inventory/,'Inventory & Gear'],[/^Spell List Spells/,'Spells']]) {
    await button(p,palette).click();
    const text=p.locator('main').getByText(title,{exact:true}).first();
    const pixels=()=>text.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    const before=await pixels();
    await p.getByRole('slider',{name:/Font size/}).press('End');
    assert.ok(await pixels()>before*2);
    await saved(p);
  }
  await p.reload();
  assert.equal(await p.locator('main').getByText('Spells',{exact:true}).first().evaluate(el=>getComputedStyle(el).fontSize),'64px');
});

test('two-finger wheel pans on hover and scrolls only the focused list',async t=>{
  const p=await open(t);
  await p.evaluate(()=>localStorage.setItem('c2_whiteboard_v1',JSON.stringify({
    id:'wheel',name:'Wheel check',blocks:[{id:'list',type:'list',x:30,y:35,width:300,height:180,
    content:{title:'Gear',ordered:false,items:Array.from({length:50},(_,i)=>'Item '+i)}}],
    groups:[],viewport:{pan:{x:0,y:0},zoom:1},updatedAt:Date.now()
  })));
  await p.goto(base+'/whiteboard');
  const rows=p.locator('main [data-canvas-wheel="internal-scroll"]');
  await rows.hover();await p.mouse.wheel(0,20);
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('c2_whiteboard_v1')).viewport.pan.y===-20);
  assert.equal(await rows.evaluate(el=>el.scrollTop),0);
  await rows.click();await p.mouse.wheel(0,120);
  await p.waitForFunction(()=>document.querySelector('main [data-canvas-wheel]').scrollTop>0);
  const offset=await rows.evaluate(el=>el.scrollTop);
  await p.locator('main').getByText('Gear',{exact:true}).hover();await p.mouse.wheel(0,200);
  await p.waitForFunction(prev=>document.querySelector('main [data-canvas-wheel]').scrollTop>prev,offset);
  await rows.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await rows.hover();await p.mouse.wheel(0,130);
  await p.waitForTimeout(550);
  assert.deepEqual((await draft(p)).viewport.pan,{x:0,y:-20});
  await p.keyboard.press('Escape');await rows.hover();await p.mouse.wheel(0,20);
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('c2_whiteboard_v1')).viewport.pan.y===-40);
});


test('canvas object menu groups, locks, unlocks and ungroups the selection', async t=>{
  const p=await open(t);
  await button(p,/Blank canvas/).click();
  await button(p,/^Heading Title/).click();
  await button(p,/^Text Notes/).click();
  await p.keyboard.press('Control+a');
  const object=p.locator('main [data-object-id]').last();
  const menu=p.getByRole('dialog',{name:'Object actions'});
  for(const action of ['Group','Lock','Unlock','Ungroup']) {
    await object.click({button:'right'});
    assert.ok(await menu.evaluate(el => document.activeElement === el));
    await p.keyboard.press('Tab');
    assert.ok(await menu.locator('button').first().evaluate(el => el.matches(':focus-visible')));
    const target=menu.getByRole('button',{name:action,exact:true});
    const copy=menu.getByRole('button',{name:'Copy',exact:true});
    await copy.hover();
    const highlight=await copy.evaluate(el=>getComputedStyle(el).backgroundColor);
    await target.hover();
    assert.equal(await target.evaluate(el=>getComputedStyle(el).backgroundColor),highlight);
    assert.notEqual(await copy.evaluate(el=>getComputedStyle(el).backgroundColor),highlight);
    await target.click();
    await saved(p);
    const b=await draft(p);
    assert.equal(b.groups.length,action==='Ungroup'?0:1);
    assert.ok(b.blocks.every(block=>!!block.locked===(action==='Lock')));
  }
});



test('single Ability Score card saves and exports its four casting fields',async t=>{
  const p=await open(t);
  await button(p,/Blank canvas/).click();
  await button(p,/^Ability Score Spellcasting/).click();
  const pane=p.locator('aside').last();
  for (const label of ['Spellcasting ability','Spellcasting modifier','Spell save DC','Spell attack bonus']) assert.equal(await pane.getByLabel(label,{exact:true}).inputValue(),'');
  await pane.getByLabel('Spell save DC').fill('18');
  await saved(p);
  const board=await draft(p);
  assert.equal(board.blocks[0].type,'abilityScore');
  const pdf=await PDFDocument.load(await download(p,'Export PDF'));
  assert.equal(pdf.getForm().getTextField(board.blocks[0].id+'.saveDc').getText(),'18');
  await p.reload();
  await p.locator('main .casting-card').getByText('18',{exact:true}).waitFor();
});

test('Spell Slots totals and expended diamonds persist and export',async t=>{
  const p=await open(t);await button(p,/Blank canvas/).click();
  await button(p,/^Spell Slots Track/).click();
  const card=p.locator('main .slot-card');
  assert.equal(await card.locator('b').count(),9);
  assert.deepEqual(await card.locator('.slot-total').allTextContents(),Array(9).fill(''));
  assert.equal(await card.locator('[aria-pressed=true]').count(),0);
  await p.locator('aside').last().getByLabel('Level 1 total').fill('2');
  await card.getByRole('button',{name:'Level 1 slot 2',exact:true}).click();
  await p.locator('aside').last().getByLabel('Level 9 total').fill('1');
  await card.getByRole('button',{name:'Level 9 slot 1',exact:true}).click();
  await saved(p);
  const b=(await draft(p)).blocks[0];
  const pdf=await PDFDocument.load(await download(p,'Export PDF'));
  assert.equal(pdf.getForm().getCheckBox(b.id+'.used8_0').isChecked(),true);
  await p.reload();await card.waitFor();
  assert.equal(await card.getByRole('button',{name:'Level 1 slot 2',exact:true}).getAttribute('aria-pressed'),'true');
});



test('typography controls update rendered stat text and survive refresh',async t=>{
  const p=await open(t);await button(p,/Blank canvas/).click();await button(p,/^Stat AC/).click();
  const pane=p.locator('aside').last();
  const value=p.locator('main').getByText('15',{exact:true}).first();
  const size=()=>value.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  const before=await size();await pane.getByRole('slider',{name:/Font size/}).press('End');assert.ok(await size()>before*2);
  await pane.getByLabel('Font color').fill('#006633');await saved(p);await p.reload();
  assert.equal(await value.evaluate(el=>getComputedStyle(el).color),'rgb(0, 102, 51)');
});
