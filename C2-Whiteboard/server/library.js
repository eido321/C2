import {createHash, randomBytes, scrypt as derive, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt = promisify(derive);
const digest = value => createHash('sha256').update(value).digest('hex');
const tables = [
  'CREATE TABLE IF NOT EXISTS wb_users (id uuid PRIMARY KEY, username text UNIQUE NOT NULL, salt text NOT NULL, hash text NOT NULL)',
  'CREATE TABLE IF NOT EXISTS wb_sessions (token text PRIMARY KEY, owner uuid NOT NULL REFERENCES wb_users, expires timestamptz NOT NULL)',
  'CREATE TABLE IF NOT EXISTS wb_sheets (owner uuid NOT NULL REFERENCES wb_users, id text NOT NULL, revision integer NOT NULL, name text NOT NULL, board jsonb NOT NULL, modified timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner,id))',
  'CREATE TABLE IF NOT EXISTS wb_attempts (bucket text PRIMARY KEY, count integer NOT NULL, expires timestamptz NOT NULL)',
];

export function createLibrary(query) {
  let ready;
  async function initialize() {
    for (const statement of tables) await query(statement, []);
  }

  return async function library(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, error) => res.status(status).json({error});
    if (req.method !== 'POST') return fail(405, 'Use POST.');
    if (!req.headers['content-type']?.startsWith('application/json')) return fail(415, 'Use JSON.');
    const {action, username, password, board, id, revision} = req.body || {};
    const cookie = /(?:^|;\s*)wb_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    if (!cookie && action === 'session') return res.json({username: null});
    ready ??= initialize().catch(error => { ready = undefined; throw error; });
    await ready;

    const setCookie = (value, seconds) => res.setHeader('Set-Cookie', `wb_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${process.env.VERCEL ? '; Secure' : ''}`);
    if (action === 'register' || action === 'login') {
      const name = typeof username === 'string' ? username.trim().toLowerCase() : '';
      if (!/^[a-z0-9_-]{3,40}$/.test(name) || typeof password !== 'string' || password.length > 256 || !password.length)
        return fail(400, 'Enter a username of 3–40 letters, digits, underscores or hyphens, and a password.');
      if (action === 'register' && password.length < 6) return fail(400, 'Choose a password of at least 6 characters.');
      const address = req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'local';
      await query('DELETE FROM wb_attempts WHERE expires <= now()', []);
      const [limit] = await query("INSERT INTO wb_attempts VALUES ($1,1,now()+interval '10 minutes') ON CONFLICT(bucket) DO UPDATE SET count=wb_attempts.count+1 RETURNING count", [digest(String(address))]);
      if (limit.count > 60) return fail(429, 'Too many attempts. Try again in ten minutes.');
      let owner;
      if (action === 'register') {
        const salt = randomBytes(16).toString('hex');
        const hash = (await scrypt(password, salt, 64)).toString('hex');
        const [row] = await query('INSERT INTO wb_users VALUES ($1,$2,$3,$4) ON CONFLICT(username) DO NOTHING RETURNING id', [crypto.randomUUID(), name, salt, hash]);
        if (!row) return fail(409, 'Choose a different username.');
        owner = row.id;
      } else {
        const [row] = await query('SELECT id,salt,hash FROM wb_users WHERE username=$1', [name]);
        const hash = await scrypt(password, row?.salt || 'unused-account-salt', 64);
        if (!row || !timingSafeEqual(hash, Buffer.from(row.hash, 'hex'))) return fail(401, 'Incorrect username or password.');
        owner = row.id;
      }
      const token = randomBytes(32).toString('hex');
      await query('DELETE FROM wb_sessions WHERE expires <= now()', []);
      await query("INSERT INTO wb_sessions VALUES ($1,$2,now()+interval '30 days')", [digest(token), owner]);
      setCookie(token, 2592000);
      return res.json({username: name});
    }
    const [user] = cookie ? await query('SELECT u.id,u.username FROM wb_users u JOIN wb_sessions s ON s.owner=u.id WHERE s.token=$1 AND s.expires>now()', [digest(cookie)]) : [];
    if (action === 'session') return res.json({username: user?.username ?? null});
    if (action === 'logout') {
      if (cookie) await query('DELETE FROM wb_sessions WHERE token=$1', [digest(cookie)]);
      setCookie('', 0);
      return res.json({});
    }
    if (!user) return fail(401, 'Sign in to access your sheets.');
    if (action === 'list') return res.json({sheets: await query('SELECT id,name,modified FROM wb_sheets WHERE owner=$1 ORDER BY modified DESC', [user.id])});
    if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) return fail(400, 'Invalid sheet identifier.');
    if (action === 'delete') {
      const [deleted] = await query('DELETE FROM wb_sheets WHERE owner=$1 AND id=$2 RETURNING id', [user.id, id]);
      return deleted ? res.json({id: deleted.id}) : fail(404, 'Sheet not found.');
    }
    if (action === 'open') {
      const [sheet] = await query('SELECT board,revision FROM wb_sheets WHERE owner=$1 AND id=$2', [user.id,id]);
      return sheet ? res.json(sheet) : fail(404, 'Sheet not found.');
    }
    if (action !== 'save') return fail(400, 'Unknown action.');
    if (!board || typeof board.name !== 'string' || board.name.length > 300 || !Array.isArray(board.blocks) || !Array.isArray(board.groups) || !board.viewport || !Number.isInteger(revision) || revision < 0) return fail(400, 'Invalid character sheet.');
    const data = JSON.stringify(board);
    if (Buffer.byteLength(data) > 3500000) return fail(413, 'This sheet exceeds the 3.5 MB cloud save limit.');
    const args = [user.id,id,board.name,data];
    const [saved] = revision === 0
      ? await query('INSERT INTO wb_sheets(owner,id,name,board,revision) VALUES ($1,$2,$3,$4,1) ON CONFLICT DO NOTHING RETURNING revision', args)
      : await query('UPDATE wb_sheets SET name=$3,board=$4,revision=revision+1,modified=now() WHERE owner=$1 AND id=$2 AND revision=$5 RETURNING revision', [...args,revision]);
    return saved ? res.json(saved) : fail(409, 'Another tab saved this sheet. Export your edits before reopening the latest version.');
  };
}





