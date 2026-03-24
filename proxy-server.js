const https = require('https');

const PORT      = process.env.PORT || 3000;
const GH_TOKEN  = process.env.GH_TOKEN;   // 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 — set in Render env vars
const GH_OWNER  = 'YuvanesanM';
const GH_REPO   = 'portfolio';
const GH_FILE   = 'holdings.json';

const http = require('http');

http.createServer((req, res) => {

  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', 'https://yuvanesanm.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // ── GET /holdings — read holdings.json from GitHub ──
  if (req.method === 'GET' && req.url === '/holdings') {
    ghRequest('GET', null, (err, data) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // ── PUT /holdings — write holdings.json to GitHub ──
  if (req.method === 'PUT' && req.url === '/holdings') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        ghRequest('PUT', payload, (err, data) => {
          if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err })); return; }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      } catch(e) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ── Health check ──
  if (req.url === '/') {
    res.writeHead(200); res.end('Portfolio proxy OK'); return;
  }

  res.writeHead(404); res.end('Not found');

}).listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

// ── GitHub API helper ──
function ghRequest(method, body, cb) {
  const path = `/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;
  const data = body ? JSON.stringify(body) : null;

  const options = {
    hostname: 'api.github.com',
    path,
    method,
    headers: {
      'Authorization': `token ${GH_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'portfolio-proxy',
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
    }
  };

  const req = https.request(options, r => {
    let resp = '';
    r.on('data', chunk => resp += chunk);
    r.on('end', () => cb(null, resp));
  });
  req.on('error', err => cb(err.message, null));
  if (data) req.write(data);
  req.end();
}
