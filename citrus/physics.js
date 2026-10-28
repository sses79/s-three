import {createJellySolver} from './solver.js';

export const STEP=1/120;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export class CitrusPlayground {
  constructor(){this.jelly=createJellySolver();this.mass=.02;this.jumpSpeed=4.2;this.input={x:0,z:0};this.reset();}
  reset(){
    this.jelly.reset();this.time=0;this.landings=0;this.jumps=0;this.jumpBuffer=0;this.lastLanding=-10;this.peakDent=0;
    this.actor={x:0,z:.78,y:.56,vy:0,vx:0,vz:0,yaw:.65,grounded:true,support:'jelly',sinceGround:0,jumpAt:-10,landAt:-10};
    this.actor.y=this.surface(0,.78)?.height??.56;
  }
  requestJump(){this.jumpBuffer=.16;}
  move(x,z){const length=Math.hypot(x,z);this.input={x:length>1?x/length:x,z:length>1?z/length:z};}
  surface(x,z){
    const p=this.jelly.positions;let best=null;
    for(const ids of this.jelly.topTriangles){
      const[a,b,c]=ids.map(i=>i*3),den=(p[b+2]-p[c+2])*(p[a]-p[c])+(p[c]-p[b])*(p[a+2]-p[c+2]);
      if(Math.abs(den)<1e-10)continue;
      const u=((p[b+2]-p[c+2])*(x-p[c])+(p[c]-p[b])*(z-p[c+2]))/den;
      const v=((p[c+2]-p[a+2])*(x-p[c])+(p[a]-p[c])*(z-p[c+2]))/den,w=1-u-v;
      if(u<-.0001||v<-.0001||w<-.0001)continue;
      const height=u*p[a+1]+v*p[b+1]+w*p[c+1];
      if(!best||height>best.height)best={ids,bary:[u,v,w],height};
    }
    return best;
  }
  step(h=STEP){
    const a=this.actor,j=this.jelly,wasGrounded=a.grounded;
    this.time+=h;this.jumpBuffer=Math.max(0,this.jumpBuffer-h);
    a.sinceGround+=h;
    if(this.jumpBuffer>0&&a.sinceGround<.1){
      a.vy=this.jumpSpeed;a.grounded=false;a.sinceGround=1;a.jumpAt=this.time;this.jumpBuffer=0;this.jumps++;
      // The take-off reaction is distributed over the soft platform's top layers.
      if(a.support==='jelly')j.impulse(a.x,a.z,-this.mass*this.jumpSpeed);
    }
    const moving=Math.hypot(this.input.x,this.input.z)>.01,acceleration=wasGrounded?14:7;
    const blend=Math.min(1,acceleration*h),speed=1.1;
    a.vx+=(this.input.x*speed-a.vx)*blend;a.vz+=(this.input.z*speed-a.vz)*blend;
    if(moving)a.yaw=Math.atan2(this.input.x,this.input.z);
    const previousY=a.y,impactVy=a.vy;
    const oldX=a.x,oldZ=a.z;
    a.x=clamp(a.x+a.vx*h,-3.2,3.2);a.z=clamp(a.z+a.vz*h,-1.5,3.2);
    // A simple lateral barrier prevents a character below the top from walking
    // through the slab. Jumping above it still permits a normal soft landing.
    const blocking=this.surface(a.x,a.z);
    if(blocking&&previousY<blocking.height-.12){a.x=oldX;a.z=oldZ;a.vx=0;a.vz=0;}
    a.vy-=9.81*h;a.y+=a.vy*h;
    let touching=false,softContact=false;
    const invActor=(.42/j.count)/this.mass;
    const contacts=[-.09,.09].map(offset=>({x:a.x+Math.cos(a.yaw)*offset,z:a.z-Math.sin(a.yaw)*offset}));
    j.step(h,()=>{
      for(const foot of contacts){
        const hit=this.surface(foot.x,foot.z);
        if(!hit||previousY<hit.height-.12||a.y>hit.height+.001||a.vy>1&&!wasGrounded)continue;
        const depth=hit.height-a.y;
        if(depth<=0)continue;
        const inverseSoft=hit.ids.reduce((sum,id,k)=>sum+j.weights[id]*hit.bary[k]**2,0);
        const lambda=depth/(invActor+inverseSoft);
        a.y+=lambda*invActor;
        for(let k=0;k<3;k++)j.positions[hit.ids[k]*3+1]-=lambda*j.weights[hit.ids[k]]*hit.bary[k];
        touching=true;softContact=true;
      }
      if(a.y<.065){a.y=.065;touching=true;}
    });
    a.vy=clamp((a.y-previousY)/h,-12,12);
    a.grounded=touching;a.support=softContact?'jelly':touching?'floor':'air';
    if(touching){
      a.sinceGround=0;
      if(!wasGrounded&&impactVy<-.7&&this.time-this.lastLanding>.2){a.landAt=this.time;this.lastLanding=this.time;if(softContact)this.landings++;}
    }
    const dent=j.diagnostics.maxDent;this.peakDent=Math.max(this.peakDent,dent);
    if(!Number.isFinite(a.y)||a.y< -2)this.reset();
  }
  get diagnostics(){const a=this.actor;return {time:this.time,jumps:this.jumps,landings:this.landings,peakDent:this.peakDent,
    mass:this.mass,actor:{...a},jelly:this.jelly.diagnostics};}
}
