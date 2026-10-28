import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {openBrowser, openWatch} from './browser.mjs';
import {startServer} from './serve.mjs';
import {SHOWCASE_DURATION} from '../watch/showcase.js';
import {TUTORIAL_DURATION} from '../watch/tutorial.js';

const args = process.argv.slice(2), mode = args[0] || 'sheet';
const option = (key, fallback) => {const index = args.indexOf('--' + key); return index < 0 ? fallback : args[index + 1];};
if (!['stills', 'sheet', 'video'].includes(mode)) throw new Error('Use stills, sheet, or video');
const film=option('film','showcase');
if(!['showcase','tutorial'].includes(film))throw new Error('Film must be showcase or tutorial');
const duration=film==='tutorial'?TUTORIAL_DURATION:SHOWCASE_DURATION;
const lighting=option('lighting','hdri');
if(!['hdri','original'].includes(lighting))throw new Error('Lighting must be hdri or original');
const width = Number(option('width', '1920')), height = Number(option('height', '1080'));
const fps = Number(option('fps', '30'));
if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 320 || width > 7680 || height > 4320) throw new Error('Invalid capture dimensions');
if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new Error('Invalid frame rate');
if (mode === 'video' && (width % 2 || height % 2)) throw new Error('Video dimensions must be even');
const times = option('times', film==='tutorial'?'3,9.8,13.2,18.6,24.8,29.5,32.5,40.5,46.5':'0,3.115,5.8,8.5,10.8,14.7').split(',').map(Number);
if (times.some(time => !Number.isFinite(time) || time < 0 || time > duration)) throw new Error(`Times must be between 0 and ${duration} seconds`);
const basename=film==='tutorial'?'second-tutorial':'second';
const destination = resolve(option('out', mode === 'stills' ? `out/${basename}-stills` : `out/${basename}.${mode === 'video' ? 'mp4' : 'png'}`));
const {server, url} = await startServer({port: 0});
let browser, encoder;
const frames = [];
try {
  browser = await openBrowser();
  const {page, errors} = await openWatch(browser, url, {width, height,
    query: `capture=1&lighting=${lighting}${film==='tutorial'?'&tutorial=1':''}${args.includes('--webgl') ? '&webgl=1' : ''}`});
  const render = async time => {
    const state = await page.evaluate(time => window.secondShowcase.renderAt(time), time);
    if (errors.length) throw new Error(errors.join('\n'));
    return {state, image: await page.screenshot({type: 'png'})};
  };
  await mkdir(mode === 'stills' ? destination : dirname(destination), {recursive: true});
  if (mode === 'video') {
    encoder = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-vcodec', 'png',
      '-framerate', String(fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], {stdio: ['pipe', 'inherit', 'inherit']});
    const completed = new Promise((resolve, reject) => {
      encoder.once('error', reject);
      encoder.once('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
    });
    // Attach error handling immediately, including an unavailable ffmpeg executable.
    completed.catch(() => {});
    let pipeError;
    encoder.stdin.on('error', error => {pipeError = error;});
    for (let frame = 0; frame < duration * fps; frame++) {
      if (pipeError) throw pipeError;
      const {state, image} = await render(frame / fps);
      if (!encoder.stdin.write(image)) await once(encoder.stdin, 'drain');
      frames.push(state);
      if (frame % fps === 0) console.log(`${frame / fps} / ${duration}s`);
    }
    encoder.stdin.end(); await completed;
  } else {
    const images = [];
    for (const time of times) {
      const {state, image} = await render(time);frames.push(state);
      if (mode === 'stills') await writeFile(resolve(destination, `${time.toFixed(3).padStart(6, '0')}.png`), image);
      else images.push({time, data: image.toString('base64')});
    }
    if (mode === 'sheet') {
      const data = await page.evaluate(async ({images, aspect}) => {
        const cellWidth = 640, cellHeight = Math.round(cellWidth / aspect), gap = 12, label = 30, columns = 3;
        const canvas = document.createElement('canvas');
        canvas.width = columns * (cellWidth + gap) + gap;
        canvas.height = Math.ceil(images.length / columns) * (cellHeight + label + gap) + gap;
        const context = canvas.getContext('2d');context.fillStyle = '#eeeae2';context.fillRect(0, 0, canvas.width, canvas.height);
        for (let index = 0; index < images.length; index++) {
          const item = images[index], image = new Image();image.src = 'data:image/png;base64,' + item.data;await image.decode();
          const x = gap + index % columns * (cellWidth + gap), y = gap + Math.floor(index / columns) * (cellHeight + label + gap);
          context.drawImage(image, x, y, cellWidth, cellHeight);
          context.fillStyle = '#536347';context.font = '13px monospace';context.fillText(item.time.toFixed(3) + ' seconds', x, y + cellHeight + 20);
        }
        return canvas.toDataURL('image/png').split(',')[1];
      }, {images, aspect: width / height});
      await writeFile(destination, Buffer.from(data, 'base64'));
    }
  }
  const manifest = mode === 'stills' ? resolve(destination, 'manifest.json') : destination + '.json';
  await writeFile(manifest, JSON.stringify({film,lighting,duration,width, height, ...(mode === 'video' ? {fps} : {}), frames}, null, 2) + '\n');
  console.log(`Saved ${destination}`);
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill();
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
