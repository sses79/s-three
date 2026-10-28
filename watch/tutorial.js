import {ManualWatchState} from './manual-state.js';

export const MANUAL_URL = 'https://www.casio.com/content/dam/casio/global/support/manuals/watches/pdf/5/593/qw593_EN.pdf';
export const TUTORIAL_DURATION = 56;
export const TUTORIAL_BASE = Date.UTC(2026, 9, 28, 10, 9, 30);
export const TUTORIAL_EVENTS = [
  {time: 8, action: 'mode'}, {time: 8.8, action: 'mode'}, {time: 9.6, action: 'mode'},
  {time: 11.6, action: 'light'}, {time: 13, action: 'adjust'},
  {time: 15, action: 'light'}, {time: 16.5, action: 'adjust'}, {time: 18.3, action: 'mode'},
  {time: 21.2, action: 'mode'}, {time: 23, action: 'light'}, {time: 24.6, action: 'adjust'},
  {time: 26.2, action: 'light'}, {time: 27.6, action: 'adjust'}, {time: 29.2, action: 'mode'},
  {time: 32, action: 'light'},
  {time: 36, action: 'mode'}, {time: 36.8, action: 'mode'},
  {time: 39, action: 'adjust'}, {time: 43, action: 'adjust'}, {time: 46, action: 'light'},
  {time: 48.3, action: 'mode'}, {time: 49.1, action: 'mode'},
];

// Original wording and diagrams; the manufacturer manual is linked, not reproduced.
const steps = [
  {time: 0, chapter: 1, title: 'Three buttons. Four skills.', text: 'Learn to set the time, save a daily alarm, light the display, and use the stopwatch.', button: 'all', prompt: 'Meet LIGHT · MODE · ADJUST', result: 'SECOND / BUTTON GUIDE', section: 'START HERE'},
  {time: 7, chapter: 2, title: 'Enter time settings.', text: 'Press MODE three times: alarm, stopwatch, then settings. The seconds flash.', button: 'mode', prompt: 'MODE ×3', result: 'Look for flashing seconds.', section: '01 / SET THE TIME'},
  {time: 10.4, chapter: 2, title: 'Choose the hour.', text: 'Press LIGHT once to select hours. Then press ADJUST to increase the hour.', button: 'light', prompt: 'LIGHT → hours', result: 'The selected pair of digits flashes.', section: '01 / SET THE TIME'},
  {time: 12.3, chapter: 2, title: 'Add one hour.', text: 'Each press of ADJUST adds one. Here, 10 becomes 11.', button: 'adjust', prompt: 'ADJUST +1', result: 'Target hour / 11', section: '01 / SET THE TIME'},
  {time: 14, chapter: 2, title: 'Choose the minutes.', text: 'Press LIGHT again to select minutes.', button: 'light', prompt: 'LIGHT → minutes', result: 'The minute digits flash.', section: '01 / SET THE TIME'},
  {time: 15.7, chapter: 2, title: 'Add one minute.', text: 'Press ADJUST once. The minute changes from 09 to 10.', button: 'adjust', prompt: 'ADJUST +1', result: 'Target time / 11:10', section: '01 / SET THE TIME'},
  {time: 17.4, chapter: 2, title: 'Save and return.', text: 'Press MODE to finish. The clock runs with your new time.', button: 'mode', prompt: 'MODE → save', result: 'Time saved / 11:10', section: '01 / SET THE TIME'},
  {time: 20, chapter: 3, title: 'Open the daily alarm.', text: 'From the clock, press MODE once. The display shows the alarm time.', button: 'mode', prompt: 'MODE ×1', result: 'Alarm mode / AL', section: '02 / SET AN ALARM'},
  {time: 22, chapter: 3, title: 'Select the alarm hour.', text: 'Press LIGHT. The alarm hour flashes and the daily alarm is enabled.', button: 'light', prompt: 'LIGHT → hours', result: 'One daily alarm / 24-hour time', section: '02 / SET AN ALARM'},
  {time: 23.8, chapter: 3, title: 'Set the hour.', text: 'Press ADJUST once to change 07 to 08.', button: 'adjust', prompt: 'ADJUST +1', result: 'Alarm hour / 08', section: '02 / SET AN ALARM'},
  {time: 25.3, chapter: 3, title: 'Select alarm minutes.', text: 'Press LIGHT again to select minutes.', button: 'light', prompt: 'LIGHT → minutes', result: 'The minute digits flash.', section: '02 / SET AN ALARM'},
  {time: 26.8, chapter: 3, title: 'Set the minute.', text: 'Press ADJUST once. This example sets a daily alarm for 08:01.', button: 'adjust', prompt: 'ADJUST +1', result: 'Alarm time / 08:01', section: '02 / SET AN ALARM'},
  {time: 28.4, chapter: 3, title: 'Keep the alarm on.', text: 'Press MODE to finish and return to the clock. ALARM ON confirms the daily alarm is saved.', button: 'mode', prompt: 'MODE → finish', result: 'Daily alarm / 08:01 · ON', section: '02 / SET AN ALARM'},
  {time: 31, chapter: 4, title: 'Read it in the dark.', text: 'In clock mode, press the upper-left LIGHT button. The LCD lights up briefly.', button: 'light', prompt: 'LIGHT ×1', result: 'A tap gives a short lamp preview in SECOND.', section: '03 / TURN ON THE LIGHT'},
  {time: 35, chapter: 5, title: 'Open the stopwatch.', text: 'From the clock, press MODE twice: alarm, then stopwatch.', button: 'mode', prompt: 'MODE ×2', result: 'Stopwatch mode / ST', section: '04 / USE THE STOPWATCH'},
  {time: 38, chapter: 5, title: 'Start counting.', text: 'Press ADJUST to start. The last two digits count hundredths of a second.', button: 'adjust', prompt: 'ADJUST → start', result: 'Watch the elapsed time increase.', section: '04 / USE THE STOPWATCH'},
  {time: 42, chapter: 5, title: 'Stop the timer.', text: 'Press ADJUST again. The elapsed time stays on screen.', button: 'adjust', prompt: 'ADJUST → stop', result: 'Elapsed time / 00:04.00', section: '04 / USE THE STOPWATCH'},
  {time: 45, chapter: 5, title: 'Reset to zero.', text: 'With the stopwatch stopped, press LIGHT to clear the result.', button: 'light', prompt: 'LIGHT → reset', result: 'Ready again / 00:00.00', section: '04 / USE THE STOPWATCH'},
  {time: 47.5, chapter: 5, title: 'Back to the clock.', text: 'Press MODE twice to pass settings and return to the clock.', button: 'mode', prompt: 'MODE ×2', result: 'Your daily alarm stays enabled.', section: '04 / USE THE STOPWATCH'},
  {time: 50.5, chapter: 6, title: 'Your turn.', text: 'LIGHT selects or resets. MODE changes screens. ADJUST changes values or starts and stops the timer.', button: 'all', prompt: 'Try the buttons in Watch Lab', result: 'TIME · DAILY ALARM · LIGHT · STOPWATCH', section: 'PRACTICE / WATCH LAB'},
];

export function sampleTutorial(seconds) {
  if (!Number.isFinite(seconds)) throw new TypeError('Tutorial time must be finite');
  const time = Math.max(0, Math.min(TUTORIAL_DURATION, seconds));
  let clock = 0;
  const state = new ManualWatchState({now: () => TUTORIAL_BASE + clock * 1000, tick: () => clock * 1000, utc: true});
  const presses = {};
  for (const event of TUTORIAL_EVENTS) {
    if (event.time > time) break;
    clock = event.time;
    ({light: () => state.light(), mode: () => state.modeButton(), adjust: () => state.adjust()})[event.action]();
    presses[event.action] = event.time;
  }
  clock = time;
  const step = steps.findLast(item => item.time <= time);
  return {time, state, presses, position: [0, .3, 12.4], target: [0, 0, 0], finish: 'steel',
    title: step.title, detail: step.section, instruction: step.text, prompt: step.prompt, result: step.result,
    button: step.button, chapter: step.chapter, chapters: 6};
}
