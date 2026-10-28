import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../scripts/serve.mjs';

test('preview serves browser files and rejects source and traversal paths', async () => {
  const {server, url} = await startServer({port: 0});
  try {
    for (const path of ['/', '/app.js', '/style.css', '/assets/watch.glb', '/assets/studio_small_09_2k.hdr','/citrus/','/citrus/app.js','/citrus/style.css','/citrus/assets/character.glb']) {
      assert.equal((await fetch(url + path)).status, 200, path);
    }
    for (const path of ['/package.json', '/watch/source/second-watch.blend', '/.git/config', '/%2e%2e/package.json']) {
      assert.equal((await fetch(url + path)).status, 404, path);
    }
  } finally {await new Promise(resolve => server.close(resolve));}
});
