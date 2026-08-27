// /api/visit.js
// Increments a named visit counter. Public — anyone loading either page
// triggers this once. No personal data is stored, just a running total.
//
// Usage: POST /api/visit  with body { "site": "platform" } or { "site": "landing" }

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const VALID_SITES = ['platform', 'landing'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: 'Storage not configured on the server yet.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const site = body && body.site;

  if (!VALID_SITES.includes(site)) {
    res.status(400).json({ error: 'site must be "platform" or "landing"' });
    return;
  }

  try {
    const key = `visits:${site}`;
    const redisRes = await fetch(`${REDIS_URL}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    if (!redisRes.ok) throw new Error('Redis incr failed: ' + redisRes.status);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record visit', detail: String(err) });
  }
}
