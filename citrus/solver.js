// Geometry and XPBD core extracted from codex-3d/index.html; see source/README.md.
export function createJellySolver(){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),scale:(a,s)=>a.map(v=>v*s)};
function toast(){}
const R=1.62, CENTER_Y=1.72, A=32, L=6, Z=4, THICK=.50;
const rest=[],tetList=[],rings=[];
function node(x,y,z){rest.push(x,y,z);return rest.length/3-1}
for(let z=0;z<=Z;z++){
 const q=z/Z*2-1,layer=[],scale=1-.045*q*q;
 layer.push([node(0,CENTER_Y,q*THICK/2)]);
 for(let r=1;r<=L;r++){const ring=[];for(let a=0;a<=A;a++){const theta=a/A*Math.PI,rr=R*r/L*scale;const round=1-.18*Math.pow(r/L,8);ring.push(node(rr*Math.cos(theta),CENTER_Y-rr*Math.sin(theta),q*THICK/2*round))}layer.push(ring)}rings.push(layer);
}
// Rotate the original standing half-slice so the flesh is a horizontal platform.
for(let i=0;i<rest.length;i+=3){const y=rest[i+1],z=rest[i+2];rest[i+1]=z+.32;rest[i+2]=CENTER_Y-y;}
function volumeAt(p,a,b,c,d){const ai=a*3,bi=b*3,ci=c*3,di=d*3;const x=p[bi]-p[ai],y=p[bi+1]-p[ai+1],z=p[bi+2]-p[ai+2],u=p[ci]-p[ai],v=p[ci+1]-p[ai+1],w=p[ci+2]-p[ai+2],i=p[di]-p[ai],j=p[di+1]-p[ai+1],k=p[di+2]-p[ai+2];return (x*(v*k-w*j)+y*(w*i-u*k)+z*(u*j-v*i))/6}
function tet(a,b,c,d){if(volumeAt(rest,a,b,c,d)<0)[b,c]=[c,b];tetList.push([a,b,c,d])}
for(let z=0;z<Z;z++)for(let a=0;a<A;a++){
 const c=rings[z][0][0],d=rings[z+1][0][0],p=rings[z][1][a],q=rings[z][1][a+1],u=rings[z+1][1][a],v=rings[z+1][1][a+1];
 tet(c,p,q,v);tet(c,p,u,v);tet(c,d,u,v);
 for(let r=1;r<L;r++){
  const h=[rings[z][r][a],rings[z][r+1][a],rings[z][r+1][a+1],rings[z][r][a+1],rings[z+1][r][a],rings[z+1][r+1][a],rings[z+1][r+1][a+1],rings[z+1][r][a+1]];
  for(const ids of [[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]])tet(...ids.map(i=>h[i]));
 }
}
const edgeMap=new Map,faces=new Map;
for(const t of tetList){for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=Math.min(t[i],t[j]),b=Math.max(t[i],t[j]);edgeMap.set(a+','+b,[a,b])}for(const ids of [[1,2,3],[0,3,2],[0,1,3],[0,2,1]]){const f=ids.map(i=>t[i]),key=[...f].sort((a,b)=>a-b).join(',');if(faces.has(key))faces.delete(key);else faces.set(key,f)}}
const surface=Array.from(faces.values()).flat(),indices=new Uint32Array(surface),edges=Array.from(edgeMap.values()),lineIndices=new Uint32Array(edges.flat());
const count=rest.length/3,p=new Float32Array(rest),initial=new Float32Array(rest),vel=new Float32Array(rest.length),prev=new Float32Array(rest.length),normals=new Float32Array(rest.length),packed=new Float32Array(count*10),weights=new Float32Array(count),edgeRest=new Float32Array(edges.length),edgeFactor=new Float32Array(edges.length),edgeLambda=new Float32Array(edges.length),tetRest=new Float32Array(tetList.length),tetLambda=new Float32Array(tetList.length);
let restVolume=0;
for(let t=0;t<tetList.length;t++){const vol=volumeAt(initial,...tetList[t]);tetRest[t]=vol;restVolume+=vol;for(const i of tetList[t])weights[i]+=vol/4}
const nodeMass=Float32Array.from(weights,w=>w/restVolume*.42);for(let i=0;i<count;i++)weights[i]=1/Math.max(.1,weights[i]/(restVolume/count));
for(let e=0;e<edges.length;e++){const [a,b]=edges[e];edgeFactor[e]=Math.max(Math.hypot(initial[a*3],initial[a*3+2]),Math.hypot(initial[b*3],initial[b*3+2]))>R*.89?.24:1;edgeRest[e]=Math.hypot(initial[a*3]-initial[b*3],initial[a*3+1]-initial[b*3+1],initial[a*3+2]-initial[b*3+2])}
let paused=false,slow=false,showMesh=false,firmness=.45,damping=.35,preset=0,drag=null,orbit=null,accumulator=0,simTime=0,totalVolume=restVolume,kinetic=0;
const STEP=1/120, ITERATIONS=5,grad=new Float64Array(12);
function solveVolume(t,h){
 const ids=tetList[t],a=ids[0]*3,b=ids[1]*3,c=ids[2]*3,d=ids[3]*3;
 const ux=p[c]-p[a],uy=p[c+1]-p[a+1],uz=p[c+2]-p[a+2],vx=p[d]-p[a],vy=p[d+1]-p[a+1],vz=p[d+2]-p[a+2],wx=p[b]-p[a],wy=p[b+1]-p[a+1],wz=p[b+2]-p[a+2];
 grad[3]=(uy*vz-uz*vy)/6;grad[4]=(uz*vx-ux*vz)/6;grad[5]=(ux*vy-uy*vx)/6;
 grad[6]=(vy*wz-vz*wy)/6;grad[7]=(vz*wx-vx*wz)/6;grad[8]=(vx*wy-vy*wx)/6;
 grad[9]=(wy*uz-wz*uy)/6;grad[10]=(wz*ux-wx*uz)/6;grad[11]=(wx*uy-wy*ux)/6;
 for(let k=0;k<3;k++)grad[k]=-grad[3+k]-grad[6+k]-grad[9+k];
 const volume=(wx*grad[3]+wy*grad[4]+wz*grad[5]),alpha=2e-9/(h*h);let den=alpha;
 for(let j=0;j<4;j++)den+=weights[ids[j]]*(grad[j*3]**2+grad[j*3+1]**2+grad[j*3+2]**2);
 const dl=(-(volume-tetRest[t])-alpha*tetLambda[t])/den;tetLambda[t]+=dl;
 for(let j=0;j<4;j++){const id=ids[j],w=weights[id];for(let k=0;k<3;k++)p[id*3+k]+=w*grad[j*3+k]*dl}
}
const restCenter=[0,0,0];for(let i=0;i<count;i++)for(let j=0;j<3;j++)restCenter[j]+=initial[i*3+j]/count;
let rotation=[1,0,0,0,1,0,0,0,1],shapeGoals=new Float32Array(rest.length),recoveries=0;
function fitShape(){
 const center=[0,0,0],cov=new Float64Array(9);for(let i=0;i<count;i++)for(let j=0;j<3;j++)center[j]+=p[i*3+j]/count;
 for(let i=0;i<count;i++)for(let row=0;row<3;row++)for(let col=0;col<3;col++)cov[row*3+col]+=(p[i*3+row]-center[row])*(initial[i*3+col]-restCenter[col]);
 let m=Array.from(cov),scale=Math.hypot(...m)/Math.sqrt(3);m=m.map(v=>v/scale);
 for(let it=0;it<8;it++){
  const [a,b,c,d,e,f,g,h,i]=m,det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(Math.abs(det)<1e-9)break;
  const invT=[e*i-f*h,f*g-d*i,d*h-e*g,c*h-b*i,a*i-c*g,b*g-a*h,b*f-c*e,c*d-a*f,a*e-b*d].map(v=>v/det);
  m=m.map((v,j)=>(v+invT[j])*.5);
 }
 const determinant=m[0]*(m[4]*m[8]-m[5]*m[7])-m[1]*(m[3]*m[8]-m[5]*m[6])+m[2]*(m[3]*m[7]-m[4]*m[6]);
 if(determinant>.9&&determinant<1.1)rotation=m;
 for(let i=0;i<count;i++)for(let j=0;j<3;j++){let v=center[j];for(let k=0;k<3;k++)v+=rotation[j*3+k]*(initial[i*3+k]-restCenter[k]);shapeGoals[i*3+j]=v;}
}
function step(h,contactSolver){
 prev.set(p);edgeLambda.fill(0);tetLambda.fill(0);
 if(drag?.desired){const delta=V.sub(drag.desired,drag.target),distance=Math.hypot(...delta);drag.target=V.add(drag.target,V.scale(delta,Math.min(1,4.5*h/(distance||1))));}
 const air=Math.exp(-(.35+damping*2.8)*h);
 for(let i=0;i<count;i++){const k=i*3;vel[k+1]-=9.81*h;for(let j=0;j<3;j++){vel[k+j]*=air;p[k+j]+=vel[k+j]*h}}
 const compliance=3e-7*Math.pow(120,1-firmness),alpha=compliance/(h*h);
 fitShape();
 for(let it=0;it<ITERATIONS;it++){
  for(let e=0;e<edges.length;e++){
   const [a,b]=edges[e],ai=a*3,bi=b*3;let x=p[ai]-p[bi],y=p[ai+1]-p[bi+1],z=p[ai+2]-p[bi+2];const len=Math.hypot(x,y,z);if(len<1e-8)continue;x/=len;y/=len;z/=len;
   const al=alpha*edgeFactor[e],dl=(-(len-edgeRest[e])-al*edgeLambda[e])/(weights[a]+weights[b]+al);edgeLambda[e]+=dl;
   p[ai]+=weights[a]*x*dl;p[ai+1]+=weights[a]*y*dl;p[ai+2]+=weights[a]*z*dl;p[bi]-=weights[b]*x*dl;p[bi+1]-=weights[b]*y*dl;p[bi+2]-=weights[b]*z*dl;
  }
  for(let k=0;k<p.length;k++)p[k]+=(shapeGoals[k]-p[k])*(.0015+firmness*.002);
  for(let t=0;t<tetList.length;t++)solveVolume(t,h);
  if(drag)for(const [i,w,offset] of drag.nodes){const k=i*3,goal=V.add(drag.target,offset);for(let j=0;j<3;j++)p[k+j]+=(goal[j]-p[k+j])*w*.18}
  for(let i=0;i<count;i++){const k=i*3;if(p[k+1]<.065){p[k+1]=.065;p[k]+=(prev[k]-p[k])*.15;p[k+2]+=(prev[k+2]-p[k+2])*.15}}
  contactSolver?.(h,it);
 }
 // Internal damping removes relative motion while preserving overall momentum.
 let av=[0,0,0];for(let i=0;i<count;i++)for(let j=0;j<3;j++){vel[i*3+j]=(p[i*3+j]-prev[i*3+j])/h;av[j]+=vel[i*3+j]/count}
 const internal=1-Math.exp(-(1+damping*18)*h);kinetic=0;
 for(let i=0;i<count;i++)for(let j=0;j<3;j++){const k=i*3+j;vel[k]+=(av[j]-vel[k])*internal;vel[k]=clamp(vel[k],-12,12);kinetic+=.5*nodeMass[i]*(vel[k]*.1)**2}
 totalVolume=0;let valid=true;for(let t=0;t<tetList.length;t++){const v=volumeAt(p,...tetList[t]);totalVolume+=v;if(v< -tetRest[t]*.1)valid=false}
 for(let k=0;k<p.length;k++)if(!Number.isFinite(p[k])||Math.abs(p[k])>20){valid=false;break}
 if(!valid){p.set(prev);fitShape();for(let k=0;k<p.length;k++)p[k]+=(shapeGoals[k]-p[k])*.14;for(let i=0;i<count;i++)p[i*3+1]=Math.max(.065,p[i*3+1]);vel.fill(0);drag=null;recoveries++;totalVolume=tetList.reduce((v,t)=>v+volumeAt(p,...t),0);kinetic=0;toast('Stretch limit reached — easing back into shape.')}
 simTime+=h;
}

const layerSize=count/5;
const topTriangles=[];
for(let f=0;f<surface.length;f+=3){const ids=surface.slice(f,f+3);if(ids.every(i=>i>=layerSize*4))topTriangles.push(ids);}
function reset(){p.set(initial);prev.set(initial);vel.fill(0);drag=null;simTime=0;rotation=[1,0,0,0,1,0,0,0,1];totalVolume=restVolume;kinetic=0;recoveries=0;}
function impulse(x,z,impulse,radius=.38){
 const affected=[];let sum=0;
 for(let i=0;i<count;i++){const k=i*3,d=Math.hypot(p[k]-x,p[k+2]-z);if(d<radius&&initial[k+1]>.3){const w=(1-d/radius)**2;affected.push([i,w]);sum+=w;}}
 for(const[i,w]of affected)vel[i*3+1]+=impulse*w/(sum*nodeMass[i]);
}
return {positions:p,initial,velocities:vel,previous:prev,weights,nodeMass,indices,topTriangles,count,layerSize,restVolume,step,reset,impulse,
 setTuning(f,d){firmness=clamp(f,0,1);damping=clamp(d,0,1);},
 setDrag(value){drag=value;},
 get diagnostics(){let minY=Infinity,maxDent=0;for(let i=0;i<count;i++){minY=Math.min(minY,p[i*3+1]);if(i>=layerSize*4)maxDent=Math.max(maxDent,initial[i*3+1]-p[i*3+1]);}return {nodes:count,tetrahedra:tetList.length,surfaceTriangles:surface.length/3,volumeRatio:totalVolume/restVolume,kinetic,recoveries,finite:p.every(Number.isFinite),minY,maxDent,time:simTime};}
};
}
