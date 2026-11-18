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
  await pane.getByPlaceholder('List item').first().fill('Journal');
  await button(pane, 'Numbers').click();
  await button(pane, 'Checks').click();
  await button(pane, 'Add').click();
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
  await button(p, /Continue last whiteboard/).click();
  await saved(p);
  assert.deepEqual((await draft(p)).blocks, original.blocks);
});

test('phone guest editor, guest draft migration, searchable private library and session boundaries', async (t) => {
  const p = await open(t, 390);
  await button(p, /Blank canvas/).click();
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
  await button(p, 'My sheets').click();
  await p.getByRole('heading', {name: 'My sheets', exact: true}).waitFor();
  await p.getByRole('heading', {name: 'Start a new sheet'}).waitFor();
  assert.equal(await p.getByTitle('Close', {exact: true}).count(), 0);
  await button(p, 'Login').click();
  await p.getByRole('heading', {name: 'Sign in'}).waitFor();
  await button(p, 'Continue without signing in').click();
  await button(p, 'Login').click();
  await button(p, 'Create an account').click();
  const password = 'test-only-account-password';
  await p.getByLabel('Username').fill('test_warden');
  await p.getByLabel('Password').fill(password);
  await button(p, 'Create account').click();
  await button(p, /Copy this device/).click();
  await p.getByText('Saved to account', {exact: true}).waitFor();
  await button(p, 'My sheets').click();
  await p.getByRole('heading', {name: 'D&D 2024 Classes'}).waitFor();
  const search = p.getByLabel('Find a sheet');
  await search.fill('missing');
  await p.getByText('No matching sheets.').waitFor();
  await search.fill('ward');
  await button(p, /Warden/).click();
  await p.getByLabel('Sheet name').fill('Warden revised');
  await p.getByText('Saved to account', {exact: true}).waitFor();
  await button(p, 'My sheets').click();
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
  await button(q, /Warden revised/).click();
  assert.equal(await q.getByLabel('Sheet name').inputValue(), 'Warden revised');
  assert.equal(
    (await api(p.request, {action: 'login', username: 'test_warden', password: 'invalid'})).status(),
    401,
  );
  assert.equal((await api(p.request, {action: 'register', username: 'test_warden', password})).status(), 409);
  await api(p.request, {action: 'register', username: 'test_other', password});
  assert.deepEqual((await (await api(p.request, {action: 'list'})).json()).sheets, []);
  assert.equal((await api(p.request, {action: 'open', id})).status(), 404);
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
  await p.mouse.move(area.x + 25, area.y + 25);
  await p.mouse.down();
  await p.mouse.move(area.x + 75, area.y + 55);
  await p.mouse.up();
  await saved(p);
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

