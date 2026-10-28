import {WatchState} from './state.js';

export const SHOWCASE_DURATION = 15;
export const SHOWCASE_BASE = Date.UTC(2026, 9, 28, 10, 9, 30);
export const SHOWCASE_EVENTS = [
  {time: 3, action: 'light'},
  {time: 4.4, action: 'mode'},
  {time: 4.8, action: 'adjust'},
  {time: 9, action: 'adjust'},
  {time: 10, action: 'mode'},
  {time: 11.8, action: 'light'},
];
export const SHOWCASE_SHOTS = [
  {time: 0, position: [3, 3, 37], target: [0, -2, 0]},
  {time: 2.7, position: [1.3, .6, 11.8], target: [0, 0, 0]},
  {time: 5.5, position: [-2, 1, 12.5], target: [0, 0, 0]},
  {time: 8, position: [2.2, .8, 13], target: [0, 0, 0]},
  {time: 10.5, position: [-2, 1.2, 13.5], target: [0, 0, 0]},
  {time: 12, position: [1.3, .6, 12.5], target: [0, 0, 0]},
  {time: 15, position: [3, 3, 37], target: [0, -2, 0]},
];

const captions = [
  {time: 0, title: 'Old soul. Live seconds.', detail: 'SECOND / AN OBJECT STUDY'},
  {time: 2.7, title: 'A little light.', detail: 'A PHYSICAL BUTTON. A LIVE DISPLAY.'},
  {time: 4.4, title: 'Make time for it.', detail: 'START. STOP. EVERY HUNDREDTH COUNTS.'},
  {time: 7.5, title: 'A warmer hour.', detail: 'FINISH / GOLD'},
  {time: 10, title: 'After hours.', detail: 'FINISH / GRAPHITE'},
  {time: 12.5, title: 'Make every second yours.', detail: 'SECOND / WATCH LAB'},
];

export function sampleShowcase(seconds) {
  if (!Number.isFinite(seconds)) throw new TypeError('Showcase time must be finite');
  const time = Math.max(0, Math.min(SHOWCASE_DURATION, seconds));
  // Replay the small event log from a known state, including when seeking backwards.
  let clock = 0;
  const state = new WatchState({now: () => SHOWCASE_BASE + clock * 1000, tick: () => clock * 1000});
  const presses = {};
  for (const event of SHOWCASE_EVENTS) {
    if (event.time > time) break;
    clock = event.time;
    ({light: () => state.light(), mode: () => state.modeButton(), adjust: () => state.adjust()})[event.action]();
    presses[event.action] = event.time;
  }
  clock = time;
  const next = SHOWCASE_SHOTS.findIndex(shot => shot.time > time);
  const a = SHOWCASE_SHOTS[next < 0 ? SHOWCASE_SHOTS.length - 1 : Math.max(0, next - 1)];
  const b = next < 0 ? a : SHOWCASE_SHOTS[next];
  const p = a === b ? 0 : (time - a.time) / (b.time - a.time);
  const ease = p * p * (3 - 2 * p);
  const interpolate = key => a[key].map((value, i) => value + (b[key][i] - value) * ease);
  const caption = captions.findLast(item => item.time <= time);
  return {time, state, presses, position: interpolate('position'), target: interpolate('target'),
    finish: time < 7.5 || time >= 12.5 ? 'steel' : time < 10 ? 'gold' : 'dark',
    title: caption.title, detail: caption.detail,
    chapter: captions.indexOf(caption) + 1, chapters: captions.length};
}
