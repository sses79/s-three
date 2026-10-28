import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from './build.mjs';

// Serve only the browser build. Blender sources and repository files stay private.
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/assets/watch.glb', ['assets/watch.glb', 'model/gltf-binary']],
]);

export async function startServer({port = 5173, host = '127.0.0.1', rebuild = true} = {}) {
  if (rebuild) await build();
  const server = createServer(async (request, response) => {
    const route = routes.get(new URL(request.url, 'http://localhost').pathname);
    if (!route || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    try {
      const bytes = await readFile(new URL('../dist/' + route[0], import.meta.url));
      response.writeHead(200, {'Content-Type': route[1], 'Content-Length': bytes.length,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(500); response.end('Build unavailable');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(port, host, resolve);
  });
  return {server, url: `http://${host}:${server.address().port}`};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {url} = await startServer({port: Number(process.env.PORT || 5173)});
  console.log(`SECOND: ${url}`);
}
