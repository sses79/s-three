import {createJellySolver} from './solver.js';
import {surfaceVelocity,solveContactVelocity} from './contact.js';

export const STEP=1/120;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a.reduce((sum,v,k)=>sum+v*b[k],0);
const emptyContact=()=>({count:0,load:0,normalImpulse:0,frictionImpulse:0,point:null,normal:[0,1,0],onDummy:[0,0,0],onJelly:[0,0,0]});

export class CitrusPlayground {
  constructor(){
    this.jelly=createJellySolver();this.mass=.02;this.jumpSpeed=4.2;
    this.restitution=.18;this.friction=.55;this.input={x:0,z:0};this.reset();
  }
  reset(){
    this.jelly.reset();this.time=0;this.landings=0;this.jumps=0;this.jellyBounces=0;this.lastBounce=-10;
    this.jumpBuffer=0;this.lastLanding=-10;this.peakDent=0;this.peakLoad=0;this.contact=emptyContact();this.input={x:0,z:0};
    this.actor={x:0,z:.78,y:.56,vy:0,vx:0,vz:0,mass:this.mass,yaw:.65,grounded:true,support:'jelly',sinceGround:0,jumpAt:-10,airAt:-10,landAt:-10};
    this.actor.y=this.surface(0,.78)?.height??.56;
  }
  requestJump(){this.jumpBuffer=.16;}
  bounceJelly(){
    if(this.time-this.lastBounce<.5)return false;
    const a=this.actor,hit=this.surface(a.x,a.z);
    // An external tap acts ONLY on the jelly. All subsequent dummy motion
    // must come from contact with its moving surface.
    this.jelly.impulse(hit?a.x:0,hit?a.z:.78,.2,.5);
    this.jellyBounces++;this.lastBounce=this.time;return true;
  }
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
      if(best&&height<=best.height)continue;
      const ab=[p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2]],ac=[p[c]-p[a],p[c+1]-p[a+1],p[c+2]-p[a+2]];
      let normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      const length=Math.hypot(...normal);normal=normal.map(n=>n/length*(normal[1]<0?-1:1));
      if(normal[1]<.35)continue; // Too steep to support a sole; sides use the entry barrier.
      best={ids,bary:[u,v,w],height,normal};
    }
    return best;
  }
  support(x,z){
    const hit=this.surface(x,z);if(!hit)return null;
    // A sole has area. Spread pressure across a small pad rather than driving
    // one light surface vertex into a tetrahedron during a heavy landing.
    const j=this.jelly,ids=[],bary=[];let sum=0;
    for(let id=j.layerSize*4;id<j.count;id++){
      const distance=Math.hypot(j.positions[id*3]-x,j.positions[id*3+2]-z);
      if(distance>=.22)continue;
      const weight=1-distance/.22;ids.push(id);bary.push(weight);sum+=weight;
    }
    if(!sum)return hit;
    for(let i=0;i<bary.length;i++)bary[i]/=sum;
    return {...hit,ids,bary,height:ids.reduce((height,id,i)=>height+j.positions[id*3+1]*bary[i],0)};
  }
  step(h=STEP){
    const a=this.actor,j=this.jelly,wasGrounded=a.grounded;
    a.mass=this.mass;this.contact=emptyContact();
    this.time+=h;this.jumpBuffer=Math.max(0,this.jumpBuffer-h);a.sinceGround+=h;
    if(this.jumpBuffer>0&&a.sinceGround<.1){
      const hit=a.support==='jelly'?this.surface(a.x,a.z):null;
      const target=this.jumpSpeed+Math.max(0,hit?surfaceVelocity(j,hit)[1]:0),reaction=this.mass*(target-a.vy);
      a.vy=target;a.grounded=false;a.sinceGround=1;a.jumpAt=this.time;this.jumpBuffer=0;this.jumps++;
      if(hit)j.impulse(a.x,a.z,-reaction);
    }
    const moving=Math.hypot(this.input.x,this.input.z)>.01,acceleration=wasGrounded?14:7;
    const blend=Math.min(1,acceleration*h),speed=1.1;
    a.vx+=(this.input.x*speed-a.vx)*blend;a.vz+=(this.input.z*speed-a.vz)*blend;
    if(moving)a.yaw=Math.atan2(this.input.x,this.input.z);
    const previousY=a.y,impactVy=a.vy,oldX=a.x,oldZ=a.z;
    a.x=clamp(a.x+a.vx*h,-3.2,3.2);a.z=clamp(a.z+a.vz*h,-1.5,3.2);
    const blocking=this.surface(a.x,a.z);
    if(blocking&&previousY<blocking.height-.12){a.x=oldX;a.z=oldZ;a.vx=0;a.vz=0;}
    a.vy-=9.81*h;a.y+=a.vy*h;
    let floorContact=false;
    const invActor=j.massUnit/this.mass,contacts=new Map();
    j.step(h,()=>{
      for(const foot of [-.09,.09]){
        const x=a.x+Math.cos(a.yaw)*foot,z=a.z-Math.sin(a.yaw)*foot,hit=this.support(x,z);
        if(!hit)continue;
        const previousHeight=hit.ids.reduce((sum,id,k)=>sum+j.previous[id*3+1]*hit.bary[k],0);
        if(previousY<previousHeight-.12)continue; // No support from underneath.
        const depth=(hit.height-a.y)*hit.normal[1];
        if(depth<=0)continue;
        const existing=contacts.get(foot),v=surfaceVelocity(j,hit);
        const closingSpeed=existing?.closingSpeed??dot([a.vx-v[0],a.vy-v[1],a.vz-v[2]],hit.normal);
        const inverseSoft=hit.ids.reduce((sum,id,k)=>sum+j.weights[id]*hit.bary[k]**2,0);
        const lambda=depth/(invActor+inverseSoft);
        const correction=hit.normal.map(n=>lambda*n);
        a.x+=correction[0]*invActor;a.y+=correction[1]*invActor;a.z+=correction[2]*invActor;
        for(let k=0;k<hit.ids.length;k++)for(let axis=0;axis<3;axis++)j.positions[hit.ids[k]*3+axis]-=correction[axis]*j.weights[hit.ids[k]]*hit.bary[k];
        const impulse=lambda*j.massUnit/h;
        contacts.set(foot,{hit,closingSpeed,normalImpulse:(existing?.normalImpulse??0)+impulse,x,z});
        for(let k=0;k<3;k++)this.contact.onDummy[k]+=impulse*hit.normal[k]/h;
      }
      if(a.y<.065){a.y=.065;floorContact=true;}
    });
    a.vx=(a.x-oldX)/h;a.vy=(a.y-previousY)/h;a.vz=(a.z-oldZ)/h;
    for(const contact of contacts.values()){
      const response=solveContactVelocity(a,j,contact.hit,{
        closingSpeed:contact.closingSpeed,restitution:this.restitution,normalImpulse:contact.normalImpulse,friction:this.friction,
      });
      this.contact.normalImpulse+=contact.normalImpulse+response.normalImpulse;
      this.contact.frictionImpulse+=response.frictionImpulse;
      for(let k=0;k<3;k++)this.contact.onDummy[k]+=response.normalImpulse*contact.hit.normal[k]/h;
      this.contact.point={x:contact.x,y:contact.hit.height,z:contact.z};this.contact.normal=contact.hit.normal;
    }
    if(floorContact)a.vy=Math.max(0,a.vy);
    for(const key of ['vx','vy','vz'])a[key]=clamp(a[key],-12,12);
    const softContact=contacts.size>0;
    this.contact.count=contacts.size;this.contact.load=this.contact.onDummy[1]/(this.mass*9.81);
    this.contact.onJelly=this.contact.onDummy.map(f=>-f);this.peakLoad=Math.max(this.peakLoad,this.contact.load);
    a.grounded=softContact||floorContact;a.support=softContact?'jelly':floorContact?'floor':'air';
    if(wasGrounded&&!a.grounded)a.airAt=this.time;
    if(a.grounded){
      a.sinceGround=0;
      if(!wasGrounded&&impactVy<-.7&&this.time-this.lastLanding>.2){a.landAt=this.time;this.lastLanding=this.time;if(softContact)this.landings++;}
    }
    this.peakDent=Math.max(this.peakDent,j.diagnostics.maxDent);
    if(!Number.isFinite(a.y)||a.y< -2)this.reset();
  }
  get diagnostics(){return {time:this.time,jumps:this.jumps,landings:this.landings,jellyBounces:this.jellyBounces,peakDent:this.peakDent,
    mass:this.mass,restitution:this.restitution,friction:this.friction,contact:this.contact,peakLoad:this.peakLoad,actor:{...this.actor},jelly:this.jelly.diagnostics};}
}
