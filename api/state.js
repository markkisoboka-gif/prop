// /api/state.js
// Shared trade-data store, backed by Upstash Redis.
//
// GET  -> returns the current platform state (public — no auth required).
// POST -> overwrites the platform state (owner-only — requires a valid
//         session token from /api/login in the Authorization header).
//
// This replaces localStorage as the platform's source of truth, so every
// visitor sees the same real data, while only the owner can change it.

import { verifyToken } from './_auth.js';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const STATE_KEY = 'platform:state';

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  return data.result; // null if key doesn't exist
}

async function redisSet(key, value) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: value
  });
  if (!res.ok) throw new Error('Redis set failed: ' + res.status);
}

export default async function handler(req, res) {
  // Allow the landing page (a different origin) to at least read state later if ever needed.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: 'Storage not configured on the server yet.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const raw = await redisGet(STATE_KEY);
      if (raw === null) {
        res.status(200).json({ state: null }); // nothing saved yet — client uses its own default
        return;
      }
      res.status(200).json({ state: JSON.parse(raw) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read state', detail: String(err) });
    }
    return;
  }

  if (req.method === 'POST') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!verifyToken(token)) {
      res.status(401).json({ error: 'Not authorized. Please sign in again.' });
      return;
    }
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid state payload' });
        return;
      }
      await redisSet(STATE_KEY, JSON.stringify(body));
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save state', detail: String(err) });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
