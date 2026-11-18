import {neon} from '@neondatabase/serverless';
import {createLibrary} from '../server/library.js';

let handler;
export default async function library(req, res) {
  try {
    if (!handler) {
      const db = neon(process.env.DATABASE_URL);
      handler = createLibrary((sql, params) => db.query(sql, params));
    }
    await handler(req, res);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({error: 'Your library is temporarily unavailable.'});
  }
}
