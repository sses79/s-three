import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';

export async function openBrowser() {
  const executablePath = process.env.CHROME_PATH || [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(path => existsSync(path));
  return chromium.launch({headless: true,
    ...(executablePath ? {executablePath} : {channel: 'chrome'}),
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist',
      ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])]});
}

export async function openWatch(browser, url, {width = 1920, height = 1080, query = 'capture=1', reducedMotion = 'reduce'} = {}) {
  const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1,
    timezoneId: 'UTC', locale: 'en-GB', reducedMotion});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.goto(`${url}/?${query}`);
  await page.waitForFunction(() => window.secondShowcase?.ready || document.querySelector('#scene').dataset.error,
    null, {timeout: 60000});
  const failure = await page.locator('#scene').getAttribute('data-error');
  if (failure) throw new Error(`Viewer failed: ${failure}\n${errors.join('\n')}`);
  await page.evaluate(() => document.fonts.ready);
  return {page, errors};
}
