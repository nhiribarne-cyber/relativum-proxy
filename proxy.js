const http = require('http');
const https = require('https');
const url = require('url');
const PORT = process.env.PORT || 3001;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === '/') { res.writeHead(200); res.end('Relativum proxy OK'); return; }
  if (parsed.pathname !== '/yahoo') { res.writeHead(404); res.end('Not found'); return; }
  const symbol   = parsed.query.symbol;
  const interval = parsed.query.interval || '1d';
  const range    = parsed.query.range    || '1y';
  if (!symbol) { res.writeHead(400); res.end('Missing ?symbol='); return; }
  const target = 'https://query1.finance.yahoo.com/v8/finance/chart/'
    + encodeURIComponent(symbol)
    + '?interval=' + encodeURIComponent(interval)
    + '&range='    + encodeURIComponent(range);
  https.get(target, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(upstream) {
    res.writeHead(upstream.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    upstream.pipe(res);
  }).on('error', function(err) { res.writeHead(502); res.end(err.message); });

}).listen(PORT, function() {
  console.log('Proxy running on http://localhost:' + PORT);
});