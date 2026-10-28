import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {openBrowser, openWatch} from './browser.mjs';
import {startServer} from './serve.mjs';

const {server, url} = await startServer({port: 0});
let browser;
try {
  browser = await openBrowser();
  await mkdir('out/verification', {recursive: true});
  const {page, errors} = await openWatch(browser, url, {query: ''});
  await page.locator('#brand').fill('MY SECOND');
  await page.locator('[data-finish="gold"]').click();
  await page.locator('[data-action="light"]').click();
  const saved = await page.evaluate(() => localStorage.getItem('second-watch'));
  assert.equal((await page.evaluate(() => window.secondShowcase.sample())).lit, true);
  await page.locator('#showcase-start').click();
  assert.equal((await page.evaluate(() => window.secondShowcase.sample())).playing, false);
  const render = time => page.evaluate(time => window.secondShowcase.renderAt(time), time);
  const stopwatch = await render(5.8);
  assert.equal(stopwatch.mode, 'stopwatch');assert.ok(Math.abs(stopwatch.stopwatch - 1000) < 1e-8);
  await render(6);
  const first = await page.screenshot();
  assert.equal((await render(8.5)).finish, 'gold');
  assert.equal((await render(11)).finish, 'dark');
  await render(6);
  assert.deepEqual(await page.screenshot(), first, 'The same time must produce the same image after seeking');
  await page.evaluate(() => window.secondShowcase.start({time: 14.95, playing: true}));
  await page.waitForFunction(() => !window.secondShowcase.sample().playing);
  assert.equal((await page.evaluate(() => window.secondShowcase.sample())).time, 15);
  await page.locator('#showcase-exit').click();
  assert.equal(await page.locator('#brand').inputValue(), 'MY SECOND');
  const restored = await page.evaluate(() => window.secondShowcase.sample());
  assert.equal(restored.finish, 'gold');assert.equal(restored.lit, true);assert.equal(restored.active, false);
  assert.equal(await page.evaluate(() => localStorage.getItem('second-watch')), saved);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({path: 'out/verification/watch-lab.png', fullPage: true});
  assert.deepEqual(errors, []);
  console.log(`Desktop ${restored.renderer}: live controls, state restoration, backward seeking, identical captures passed`);
  const fallback = await openWatch(browser, url, {query: 'capture=1&webgl=1'});
  const fallbackState = await fallback.page.evaluate(() => window.secondShowcase.renderAt(8.5));
  assert.equal(fallbackState.renderer, 'WebGL2');assert.equal(fallbackState.finish, 'gold');
  assert.deepEqual(fallback.errors, []);console.log('Forced WebGL2: model, face, and showcase passed');
  const mobile = await openWatch(browser, url, {width: 390, height: 844, query: 'showcase=1'});
  await mobile.page.evaluate(() => window.secondShowcase.renderAt(3.115));
  assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth), 390);
  await mobile.page.screenshot({path: 'out/verification/mobile-showcase.png'});
  await mobile.page.locator('#showcase-exit').click();
  await mobile.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await mobile.page.screenshot({path: 'out/verification/mobile-watch-lab.png', fullPage: true});
  assert.deepEqual(mobile.errors, []);console.log('Phone viewport and reduced-motion playback passed');
  await writeFile('out/verification/results.json', JSON.stringify({desktop: restored.renderer, fallback: fallbackState.renderer,
    tests: ['live controls', 'preference restoration', 'deterministic image', 'backward seek', 'WebGL2', 'mobile', 'reduced motion']}, null, 2));
} finally {
  await browser?.close();await new Promise(resolve => server.close(resolve));
}
