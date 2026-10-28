const dot=(a,b)=>a.reduce((sum,v,k)=>sum+v*b[k],0);

export function surfaceVelocity(jelly,hit){
  return [0,1,2].map(k=>hit.ids.reduce((sum,id,i)=>sum+jelly.velocities[id*3+k]*hit.bary[i],0));
}

// Contacts use the same effective masses as the XPBD solver. Applying +J to
// the body and -bary[i]*J to every patch node conserves contact momentum.
export function exchangeImpulse(actor,jelly,hit,impulse){
  const names=['vx','vy','vz'];
  for(let k=0;k<3;k++){
    actor[names[k]]+=impulse[k]/actor.mass;
    for(let i=0;i<hit.ids.length;i++){
      const id=hit.ids[i];jelly.velocities[id*3+k]-=hit.bary[i]*impulse[k]/jelly.nodeMass[id];
    }
  }
}

export function solveContactVelocity(actor,jelly,hit,{closingSpeed,restitution,normalImpulse,friction}){
  const n=hit.normal,relative=()=>{
    const v=surfaceVelocity(jelly,hit);return [actor.vx-v[0],actor.vy-v[1],actor.vz-v[2]];
  };
  const inverseMass=1/actor.mass+hit.ids.reduce((sum,id,i)=>sum+hit.bary[i]**2/jelly.nodeMass[id],0);
  // Only a closing impact gets restitution. Resting contacts have no bounce
  // threshold jitter; separating contacts never attract the body to the jelly.
  const target=closingSpeed<-.6?-restitution*closingSpeed:0;
  const impulse=Math.max(0,(target-dot(relative(),n))/inverseMass);
  exchangeImpulse(actor,jelly,hit,n.map(v=>v*impulse));
  const v=relative(),normalSpeed=dot(v,n),tangent=v.map((x,k)=>x-normalSpeed*n[k]);
  const speed=Math.hypot(...tangent),tangentImpulse=Math.min(speed/inverseMass,friction*(normalImpulse+impulse));
  if(speed>1e-8)exchangeImpulse(actor,jelly,hit,tangent.map(x=>-x/speed*tangentImpulse));
  return {normalImpulse:impulse,frictionImpulse:tangentImpulse};
}
