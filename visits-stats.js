// /api/visits-stats.js
// Returns both visit counters. Owner-only — requires a valid session token,
// since these numbers were explicitly decided to stay private.

import { verifyToken } from './_auth.js';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Not authorized.' });
    return;
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: 'Storage not configured on the server yet.' });
    return;
  }

  try {
    const [platformRes, landingRes] = await Promise.all([
      fetch(`${REDIS_URL}/get/visits:platform`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } }),
      fetch(`${REDIS_URL}/get/visits:landing`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } })
    ]);
    const platformData = await platformRes.json();
    const landingData = await landingRes.json();
    res.status(200).json({
      platform: parseInt(platformData.result, 10) || 0,
      landing: parseInt(landingData.result, 10) || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read visit stats', detail: String(err) });
  }
}
