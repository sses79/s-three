import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleShowcase, SHOWCASE_DURATION} from '../watch/showcase.js';

const snapshot = time => {const s = sampleShowcase(time);return {
  time: s.time, camera: s.position, target: s.target, finish: s.finish,
  clock: s.state.date().getTime(), stopwatch: s.state.stopwatch(),
  running: s.state.started !== null, lit: s.state.lit, mode: s.state.mode, presses: s.presses,
};};

test('seeking backwards reconstructs the same state independently of sampling order', () => {
  const expected = snapshot(5.8);
  snapshot(14);snapshot(1);snapshot(9.1);
  assert.deepEqual(snapshot(5.8), expected);
  assert.equal(expected.mode, 'stopwatch');assert.equal(expected.running, true);
  assert.ok(Math.abs(expected.stopwatch - 1000) < 1e-8);
});
test('button events switch the light and start, stop, and retain stopwatch elapsed time', () => {
  assert.equal(snapshot(2.99).lit, false);assert.equal(snapshot(3).lit, true);
  assert.equal(snapshot(9).running, false);assert.equal(snapshot(9).stopwatch, 4200);
  assert.equal(snapshot(10).mode, 'clock');assert.equal(snapshot(12).lit, false);
});
test('finish changes and endpoint camera framing are reproducible', () => {
  assert.equal(snapshot(7).finish, 'steel');assert.equal(snapshot(8).finish, 'gold');
  assert.equal(snapshot(11).finish, 'dark');assert.equal(snapshot(13).finish, 'steel');
  assert.deepEqual(snapshot(0).camera, snapshot(SHOWCASE_DURATION).camera);
  assert.deepEqual(snapshot(0).target, snapshot(SHOWCASE_DURATION).target);
});
test('time clamps to the showcase and rejects invalid input', () => {
  assert.equal(snapshot(-1).time, 0);assert.equal(snapshot(100).time, SHOWCASE_DURATION);
  assert.throws(() => sampleShowcase(NaN), TypeError);
});
