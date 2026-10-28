import test from 'node:test';
import assert from 'node:assert/strict';
import {CitrusPlayground} from '../citrus/physics.js';
import {createJellySolver} from '../citrus/solver.js';

test('flat citrus retains the original volume lattice and supports the dummy',()=>{
  const w=new CitrusPlayground();for(let i=0;i<240;i++)w.step();
  const d=w.diagnostics;assert.equal(d.jelly.nodes,995);assert.equal(d.jelly.tetrahedra,4224);assert.equal(d.jelly.surfaceTriangles,1056);
  assert.equal(d.actor.support,'jelly');assert.ok(d.actor.y>.4&&d.actor.y<.7);assert.ok(d.jelly.volumeRatio>.97&&d.jelly.volumeRatio<1.03);assert.equal(d.jelly.recoveries,0);
});
test('a jump leaves the surface, lands, and causes extra physical deformation',()=>{
  const w=new CitrusPlayground();for(let i=0;i<120;i++)w.step();const standingDent=w.jelly.diagnostics.maxDent,startY=w.actor.y;
  w.requestJump();let peak=startY,airborne=false;for(let i=0;i<360;i++){w.step();peak=Math.max(peak,w.actor.y);airborne||=w.actor.support==='air';}
  assert.equal(w.jumps,1);assert.ok(airborne);assert.ok(peak>startY+.5);assert.ok(w.landings>=1);
  assert.ok(w.peakDent>standingDent+.025);assert.equal(w.actor.support,'jelly');assert.equal(w.jelly.diagnostics.finite,true);
});
test('equal and opposite takeoff reaction reaches the soft body',()=>{
  const loaded=new CitrusPlayground(),control=new CitrusPlayground();
  for(let i=0;i<120;i++){loaded.step();control.step();}
  loaded.requestJump();loaded.step();control.step();
  assert.notDeepEqual(Array.from(loaded.jelly.positions),Array.from(control.jelly.positions));
  assert.ok(loaded.jelly.diagnostics.kinetic>control.jelly.diagnostics.kinetic);
});
test('repeated landings remain bounded at light/soft and heavy/firm settings',()=>{
  for(const [mass,firmness,damping]of [[.008,0,0],[.04,1,1]]){
    const w=new CitrusPlayground();w.mass=mass;w.jelly.setTuning(firmness,damping);
    for(let i=0;i<960;i++){if(i%240===0)w.requestJump();w.step();assert.ok(w.actor.y<3&&w.actor.y>=.06);}
    assert.equal(w.jelly.diagnostics.finite,true);assert.equal(w.jelly.diagnostics.recoveries,0);assert.ok(w.jelly.diagnostics.volumeRatio>.9&&w.jelly.diagnostics.volumeRatio<1.1);
  }
});
test('walking off the edge falls onto the floor and reset restores the platform',()=>{
  const w=new CitrusPlayground();w.move(1,0);for(let i=0;i<360;i++)w.step();assert.equal(w.actor.support,'floor');assert.ok(w.actor.x>2);
  w.reset();assert.equal(w.actor.support,'jelly');assert.equal(w.jumps,0);assert.equal(w.landings,0);assert.equal(w.jelly.diagnostics.volumeRatio,1);
});
test('a dummy on the floor cannot walk through the side of the soft platform',()=>{
  const w=new CitrusPlayground();w.move(1,0);for(let i=0;i<360;i++)w.step();
  w.move(-1,0);for(let i=0;i<330;i++)w.step();assert.equal(w.actor.support,'floor');assert.ok(w.actor.x>1.2);
});
test('the compact character has the source rig and only the five needed animations',async()=>{
  const fs=await import('node:fs/promises'),b=await fs.readFile(new URL('../citrus/assets/character.glb',import.meta.url));
  assert.equal(b.readUInt32LE(8),b.length);const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  assert.equal(j.skins[0].joints.length,65);assert.deepEqual(j.animations.map(a=>a.name).sort(),['Idle_Loop','Jump_Land','Jump_Loop','Jump_Start','Walk_Loop']);
  for(const animation of j.animations)for(const sampler of animation.samplers)assert.ok(j.accessors[sampler.input]&&j.accessors[sampler.output]);
  for(const a of j.accessors){const view=j.bufferViews[a.bufferView];assert.ok(view);assert.ok((view.byteOffset||0)+view.byteLength<=j.buffers[0].byteLength);}
  assert.ok(b.length<2_000_000);
});
