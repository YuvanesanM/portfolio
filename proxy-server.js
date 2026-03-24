const https = require('https');
const http  = require('http');

const PORT     = process.env.PORT     || 3000;
const GH_TOKEN = process.env.GH_TOKEN;   // set in Render env vars

// ── Portfolio config (unchanged) ──
const PORT_OWNER = 'YuvanesanM';
const PORT_REPO  = 'portfolio';
const PORT_FILE  = 'holdings.json';

// ── Finance config (new) ──
const FIN_OWNER  = 'YuvanesanM';
const FIN_REPO   = 'ireland-scotland-london-2026';
const FIN_FILE   = 'data/smk-finance.json';

http.createServer((req, res) => {

  // ── CORS ──
  // Allow both portfolio and finance domains
  const allowedOrigins = [
    'https://yuvanesanm.github.io',
    'https://portfolio.ryst.in',
    'https://finance.ryst.in'
  ];
  const origin = req.headers.origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // ════════════════════════════════════════════
  // PORTFOLIO ROUTES (unchanged)
  // ════════════════════════════════════════════

  // GET /holdings — read holdings.json from GitHub
  if (req.method === 'GET' && req.url === '/holdings') {
    ghRequest('GET', PORT_OWNER, PORT_REPO, PORT_FILE, null, (err, data) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // PUT /holdings — write holdings.json to GitHub
  if (req.method === 'PUT' && req.url === '/holdings') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        ghRequest('PUT', PORT_OWNER, PORT_REPO, PORT_FILE, payload, (err, data) => {
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

  // ════════════════════════════════════════════
  // FINANCE ROUTES (new — /finance/*)
  // ════════════════════════════════════════════

  // GET /finance — read smk-finance.json, decode base64, return raw JSON
  if (req.method === 'GET' && req.url.startsWith('/finance') && !req.url.startsWith('/finance/sha')) {
    ghRequest('GET', FIN_OWNER, FIN_REPO, FIN_FILE, null, (err, data) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err })); return; }
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) {
          const decoded = Buffer.from(parsed.content, 'base64').toString('utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(decoded);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        }
      } catch(e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      }
    });
    return;
  }

  // GET /finance/sha — return only the SHA (needed by dashboard before PUT)
  if (req.method === 'GET' && req.url === '/finance/sha') {
    ghRequest('GET', FIN_OWNER, FIN_REPO, FIN_FILE, null, (err, data) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err })); return; }
      try {
        const parsed = JSON.parse(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sha: parsed.sha }));
      } catch(e) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Could not parse SHA' }));
      }
    });
    return;
  }

  // PUT /finance — write smk-finance.json to GitHub
  if (req.method === 'PUT' && req.url === '/finance') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        ghRequest('PUT', FIN_OWNER, FIN_REPO, FIN_FILE, payload, (err, data) => {
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
    res.writeHead(200); res.end('Portfolio + Finance proxy OK'); return;
  }

  res.writeHead(404); res.end('Not found');

}).listen(PORT, () => console.log(`Proxy running on port ${PORT}`));


// ── GitHub API helper (now accepts owner/repo/file as params) ──
function ghRequest(method, owner, repo, file, body, cb) {
  const path = `/repos/${owner}/${repo}/contents/${file}`;
  const data = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'api.github.com',
    path,
    method,
    headers: {
      'Authorization': `token ${GH_TOKEN}`,
      'Accept':        'application/vnd.github.v3+json',
      'User-Agent':    'portfolio-proxy',
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
