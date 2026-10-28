import test from 'node:test';
import assert from 'node:assert/strict';
import {exchangeImpulse,solveContactVelocity,surfaceVelocity} from '../citrus/contact.js';

const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
function fixture(){
  return {actor:{mass:2,vx:0,vy:-3,vz:0},jelly:{nodeMass:[1,2,3,2,1],velocities:new Float64Array(15)},
    hit:{ids:[0,1,2,3,4],bary:[.1,.15,.2,.25,.3],normal:[0,1,0]}};
}
const momentum=({actor:a,jelly:j})=>[a.vx,a.vy,a.vz].map((v,k)=>a.mass*v+j.nodeMass.reduce((sum,m,i)=>sum+m*j.velocities[i*3+k],0));
const energy=({actor:a,jelly:j})=>.5*a.mass*(a.vx**2+a.vy**2+a.vz**2)+j.nodeMass.reduce((sum,m,i)=>sum+.5*m*(j.velocities[i*3]**2+j.velocities[i*3+1]**2+j.velocities[i*3+2]**2),0);

test('normal and lateral impulses conserve momentum across the dummy and deformable contact patch',()=>{
  const f=fixture(),before=momentum(f);
  exchangeImpulse(f.actor,f.jelly,f.hit,[.3,1.2,-.7]);
  momentum(f).forEach((p,k)=>close(p,before[k]));assert.ok(f.actor.vy> -3);assert.ok(f.jelly.velocities[1]<0);
});
test('restitution resolves relative closing velocity against a moving jelly surface without adding energy',()=>{
  for(const restitution of [0,.18,.6]){
    const f=fixture();for(const id of f.hit.ids)f.jelly.velocities[id*3+1]=1;
    const before=momentum(f),initialEnergy=energy(f),closingSpeed=f.actor.vy-surfaceVelocity(f.jelly,f.hit)[1];
    solveContactVelocity(f.actor,f.jelly,f.hit,{closingSpeed,restitution,normalImpulse:0,friction:0});
    close(f.actor.vy-surfaceVelocity(f.jelly,f.hit)[1],-restitution*closingSpeed);
    momentum(f).forEach((p,k)=>close(p,before[k]));assert.ok(energy(f)<=initialEnergy+1e-10);
  }
});
test('separating contacts exert no attractive normal impulse',()=>{
  const f=fixture();f.actor.vy=2;const before=structuredClone(f);
  const result=solveContactVelocity(f.actor,f.jelly,f.hit,{closingSpeed:2,restitution:.6,normalImpulse:0,friction:.55});
  assert.deepEqual(f,before);assert.equal(result.normalImpulse,0);
});
test('friction carries a resting dummy with the surface and returns its reaction to the jelly',()=>{
  const f=fixture();f.actor.vy=0;for(const id of f.hit.ids)f.jelly.velocities[id*3]=1;
  const before=momentum(f),initialEnergy=energy(f);
  const result=solveContactVelocity(f.actor,f.jelly,f.hit,{closingSpeed:0,restitution:.18,normalImpulse:.4,friction:.55});
  assert.ok(f.actor.vx>0);assert.ok(result.frictionImpulse<=.4*.55);assert.ok(energy(f)<initialEnergy);
  momentum(f).forEach((p,k)=>close(p,before[k]));
});
