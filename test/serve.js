/* ══════════════════════════════════════════════════════════════
   serve.js — hand the built page to a browser over http.

   WHY NOT file:// , WHICH IS WHAT THESE TESTS USED TO DO
   ─────────────────────────────────────────────────────
   It worked for as long as the whole app was one file. The moment the
   textures moved out of the script and into dist/assets/tex/ it stopped,
   and it stopped in a way worth writing down because nothing about it
   looks like a CORS problem.

   three.js sets `crossOrigin = "anonymous"` on every image its
   TextureLoader creates. Over http that is free. Over file:// it turns
   each load into a CORS request, and a file:// response carries no
   Access-Control-Allow-Origin header — so Chromium fails all of them,
   `net::ERR_FAILED`, thirty-three at a time, and the models render as
   blank grey shapes with no error anywhere in the page.

   Electron does not do this, which is the trap: the app itself is fine,
   every screenshot looks right, and only the test suite can see the
   fault. Serving the same bytes over http is what the browser expects and
   removes the whole question — no flags, no --allow-file-access-from-files,
   and the page under test is byte-for-byte the one that ships.

     const { serve } = require('./serve.js');
     const site = await serve();            // dist/, on a free port
     await pg.goto(site.url + '/monarchy.html');
     ...
     await site.close();
══════════════════════════════════════════════════════════════ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',   '.json': 'application/json',
  '.png': 'image/png',  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',  '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function serve(dir) {
  const root = path.resolve(dir || path.join(__dirname, '..', 'dist'));
  const server = http.createServer((req, res) => {
    /* strip the query, and refuse to climb out of the directory */
    const want = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, path.normalize(want).replace(/^([/\\])+/, ''));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('no ' + want); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()]
                                           || 'application/octet-stream',
                           'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise(done => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      done({
        url: 'http://127.0.0.1:' + port,
        close: () => new Promise(r => server.close(r))
      });
    });
  });
}

module.exports = { serve };
