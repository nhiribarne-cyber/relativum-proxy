const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Allowed origins — add your own domain here if needed
const ALLOWED_ORIGINS = ['*'];

http.createServer((req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);

  // Health check — Render pings this to confirm the service is up
  if (parsed.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Relativum proxy OK');
    return;
  }

  if (parsed.pathname !== '/yahoo' && parsed.pathname !== '/search') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  // ── Search route ──────────────────────────────────────────────────────────
  if (parsed.pathname === '/search') {
    const q = parsed.query.q;
    if (!q) { res.writeHead(400); res.end('Missing ?q='); return; }
    const target = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    console.log(`[search] ${q}`);
    https.get(target, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, upstream => {
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      upstream.pipe(res);
    }).on('error', err => { res.writeHead(502); res.end(err.message); });
    return;
  }

  // ── Chart data route ───────────────────────────────────────────────────────

  const { symbol, interval = '1d', range = '1y' } = parsed.query;

  if (!symbol) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing ?symbol=');
    return;
  }

  const target =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  };

  console.log(`[proxy] ${symbol} ${range} ${interval}`);

  https.get(target, options, upstream => {
    res.writeHead(upstream.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    upstream.pipe(res);
  }).on('error', err => {
    console.error('[proxy] error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Upstream error: ${err.message}`);
  });

}).listen(PORT, () => {
  console.log(`Relativum proxy listening on port ${PORT}`);
});
