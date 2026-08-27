// /api/login.js
// Checks the submitted password against the server-side secret and, if it
// matches, issues a session token the browser can use to unlock write access.
// The real password never lives in any file that gets deployed — only in a
// Vercel environment variable.

import crypto from 'crypto';
import { createToken } from './_auth.js';

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!OWNER_PASSWORD) {
    res.status(500).json({ error: 'Owner password not configured on the server yet.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const submitted = (body && body.password) || '';

  const a = Buffer.from(submitted);
  const b = Buffer.from(OWNER_PASSWORD);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  res.status(200).json({ token: createToken() });
}
