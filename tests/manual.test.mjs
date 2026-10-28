import test from 'node:test';
import assert from 'node:assert/strict';
import {ManualWatchState} from '../watch/manual-state.js';
import {sampleTutorial,TUTORIAL_DURATION} from '../watch/tutorial.js';

function fixture(){let wall=Date.UTC(2026,9,28,10,9,30),mono=0;return {
  state:new ManualWatchState({now:()=>wall,tick:()=>mono,utc:true}),
  advance(ms){wall+=ms;mono+=ms;},setWall(ms){wall=ms;},
};}
test('manual time setting uses MODE three times, LIGHT field selection, ADJUST, then MODE save',()=>{
  const f=fixture(),s=f.state;
  s.modeButton();assert.equal(s.mode,'alarm');s.modeButton();assert.equal(s.mode,'stopwatch');s.modeButton();
  assert.equal(s.mode,'setting');assert.equal(s.field,'seconds');
  s.light();s.adjust();assert.equal(s.date().getUTCHours(),11);
  s.light();s.adjust();assert.equal(s.date().getUTCMinutes(),10);
  s.modeButton();assert.equal(s.mode,'clock');assert.equal(s.edit,null);
  f.advance(1000);assert.equal(s.date().getUTCSeconds(),31);
});
test('daily alarm is edited, enabled, saved and restored using the physical button actions',()=>{
  const s=fixture().state;s.modeButton();s.light();s.adjust();s.light();s.adjust();s.modeButton();
  assert.equal(s.mode,'clock');assert.equal(s.alarmHour,8);assert.equal(s.alarmMinute,1);assert.equal(s.alarmEnabled,true);
  const restored=new ManualWatchState(s.snapshot());assert.equal(restored.alarmHour,8);assert.equal(restored.alarmMinute,1);
  assert.equal(restored.alarmEnabled,true);assert.equal(restored.alarmField,null);
  s.modeButton();s.adjust();assert.equal(s.alarmEnabled,false);assert.equal(s.chimeEnabled,true);
  s.adjust();assert.equal(s.alarmEnabled,true);assert.equal(s.chimeEnabled,true);
  s.adjust();assert.equal(s.alarmEnabled,false);assert.equal(s.chimeEnabled,false);
});
test('the alarm rings once in its minute, can be dismissed, and runs again the next day',()=>{
  const f=fixture(),s=f.state;s.alarmHour=8;s.alarmMinute=1;s.alarmEnabled=true;
  f.setWall(Date.UTC(2026,9,29,8,1));assert.equal(s.pollAlarm(),'alarm');assert.equal(s.ringing,true);
  assert.equal(s.pollAlarm(),null);s.light();assert.equal(s.ringing,false);assert.equal(s.pollAlarm(),null);
  f.setWall(Date.UTC(2026,9,30,8,1));assert.equal(s.pollAlarm(),'alarm');f.advance(20001);assert.equal(s.ringing,false);
  const fresh=new ManualWatchState({now:()=>Date.UTC(2026,9,29,8,1,20),alarmHour:8,alarmMinute:1,alarmEnabled:true,utc:true});
  assert.equal(fresh.pollAlarm(),null,'Opening the page midway through the alarm minute must not ring late');
});
test('the lamp is timed and stopwatch LIGHT performs split or reset according to running state',()=>{
  const f=fixture(),s=f.state;s.light();assert.equal(s.lit,true);f.advance(1201);assert.equal(s.lit,false);
  s.modeButton();s.modeButton();s.adjust();f.advance(1500);s.light();assert.equal(s.displayStopwatch(),1500);
  f.advance(1000);assert.equal(s.stopwatch(),2500);assert.equal(s.displayStopwatch(),1500);
  s.light();s.adjust();assert.equal(s.stopwatch(),2500);s.light();assert.equal(s.stopwatch(),0);
});
const snapshot=time=>{const s=sampleTutorial(time);return {mode:s.state.mode,clock:s.state.date().getTime(),
  field:s.state.field,alarm:[s.state.alarmHour,s.state.alarmMinute,s.state.alarmEnabled],
  stopwatch:s.state.stopwatch(),running:s.state.started!==null,lit:s.state.lit,button:s.button,presses:s.presses};};
test('tutorial reaches the instructed clock, alarm and stopwatch outcomes',()=>{
  assert.equal(sampleTutorial(9.8).state.mode,'setting');
  assert.equal(sampleTutorial(18.6).state.date().getUTCHours(),11);assert.equal(sampleTutorial(18.6).state.date().getUTCMinutes(),10);
  assert.deepEqual(snapshot(29.5).alarm,[8,1,true]);assert.equal(snapshot(29.5).mode,'clock');
  assert.equal(snapshot(32.5).lit,true);assert.equal(snapshot(33.5).lit,false);
  assert.equal(snapshot(40.5).stopwatch,1500);assert.equal(snapshot(43.5).stopwatch,4000);
  assert.equal(snapshot(43.5).running,false);assert.equal(snapshot(46.5).stopwatch,0);
});
test('tutorial can be sampled backwards without changing the saved outcomes',()=>{
  const expected=snapshot(29.5);snapshot(55);snapshot(2);snapshot(43);
  assert.deepEqual(snapshot(29.5),expected);assert.equal(sampleTutorial(100).time,TUTORIAL_DURATION);
  assert.equal(sampleTutorial(-1).time,0);assert.throws(()=>sampleTutorial(Infinity),TypeError);
});
