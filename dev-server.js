/* Servidor de desarrollo con recarga automática. Sin dependencias.
   Uso:  node dev-server.js        (puerto por defecto 3000)
         PORT=4000 node dev-server.js
   Vigila el proyecto y recarga el navegador al guardar HTML, CSS, JS o imágenes. */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const START_PORT = Number(process.env.PORT) || 3000;
const IGNORE = ['.claude', 'node_modules', '.git', '_recursoslocales'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4'
};

const clients = new Set();

const RELOAD_SNIPPET = `<script>
(() => {
  const es = new EventSource('/__reload');
  es.onmessage = () => location.reload();
  es.onerror = () => {
    // Si el servidor se reinicia, reintenta y recarga al volver
    es.close();
    const retry = setInterval(() => {
      fetch('/__reload', { method: 'HEAD' }).then(() => { clearInterval(retry); location.reload(); }).catch(() => {});
    }, 800);
  };
})();
</script>`;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/__reload') {
    if (req.method === 'HEAD') { res.writeHead(200); return res.end(); }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let file = path.join(ROOT, url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Prohibido'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404: no encontrado');
    }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };

    if (ext === '.html') {
      const html = data.toString('utf8');
      const body = html.includes('</body>') ? html.replace('</body>', `${RELOAD_SNIPPET}</body>`) : html + RELOAD_SNIPPET;
      res.writeHead(200, headers);
      return res.end(body);
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

// Vigilancia de archivos (recursiva, con debounce para agrupar guardados)
let timer;
fs.watch(ROOT, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  if (IGNORE.some((dir) => filename.split(path.sep)[0] === dir)) return;
  if (/(~|\.swp|\.tmp)$/.test(filename)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`↻ Cambio en ${filename}, recargando…`);
    clients.forEach((c) => c.write('data: reload\n\n'));
  }, 120);
});

const listen = (port) => {
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE') listen(port + 1);
    else throw e;
  });
  server.listen(port, () => {
    console.log(`\n  Perla Dental · servidor de desarrollo\n  http://localhost:${port}\n  Recarga automática activada. Ctrl+C para parar.\n`);
  });
};

listen(START_PORT);
