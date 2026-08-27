// /api/quote.js
// Runs on Vercel's own server — fetches Yahoo Finance directly.
// No third-party CORS proxy involved, since server-to-server requests
// aren't subject to browser CORS restrictions at all.
//
// Usage from the browser: fetch('/api/quote?symbol=^FTSE')

export default async function handler(req, res) {
  const { symbol } = req.query;

  if (!symbol) {
    res.status(400).json({ error: 'Missing symbol parameter' });
    return;
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const yahooRes = await fetch(yahooUrl, {
      headers: {
        // Some Yahoo endpoints are picky about requests with no browser-like UA
        'User-Agent': 'Mozilla/5.0 (compatible; ProportionalPlatform/1.0)'
      }
    });

    if (!yahooRes.ok) {
      res.status(502).json({ error: `Yahoo responded with ${yahooRes.status}` });
      return;
    }

    const data = await yahooRes.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (typeof price !== 'number') {
      res.status(502).json({ error: 'No price in Yahoo response' });
      return;
    }

    // Cache briefly at the edge so rapid repeated calls don't all hit Yahoo directly
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json({ symbol, price });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed', detail: String(err) });
  }
}
