import * as THREE from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createLighting} from '../watch/lighting.js';
import {CitrusPlayground,STEP} from './physics.js';
import {TinyCharacter} from './character.js';
import {citrusMaterials} from './material.js';
import {ForceIndicators} from './forces.js';

const $=id=>document.getElementById(id),canvas=$('scene'),query=new URLSearchParams(location.search);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const world=new CitrusPlayground(),keys=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let renderer,scene,camera,controls,character,forces,jellyMesh,wire,geometry,material,ready=false,paused=reduced||query.has('capture'),slow=false;
let accumulator=0,last=0,dragging=null,lastRead=0;
$('tuning').open=innerWidth>760;

function syncPause(){ $('pause').textContent=paused?'Resume ▶':'Pause Ⅱ';$('pause').setAttribute('aria-pressed',String(paused)); }
function jump(){paused=false;syncPause();world.requestJump();canvas.focus({preventScroll:true});}
function reset(){world.reset();keys.clear();world.move(0,0);accumulator=0;dragging=null;if(controls){controls.enabled=true;homeCamera();}canvas.focus({preventScroll:true});}
$('jump').onclick=jump;$('touch-jump').onclick=jump;$('reset').onclick=reset;
$('pause').onclick=()=>{paused=!paused;syncPause();};
$('nudge').onclick=()=>{world.jelly.impulse(0,.78,-.04);paused=false;syncPause();};
function bounceJelly(){world.bounceJelly();paused=false;syncPause();canvas.focus({preventScroll:true});}
$('bounce').onclick=bounceJelly;
for(const name of ['firmness','damping'])$(name).oninput=()=>{world.jelly.setTuning(Number($('firmness').value)/100,Number($('damping').value)/100);$(name+'-value').textContent=$(name).value+'%';};
$('mass').oninput=()=>{world.mass=Number($('mass').value)/1000;$('mass-value').textContent=$('mass').value+' g';};
$('rebound').oninput=()=>{world.restitution=Number($('rebound').value)/100;$('rebound-value').textContent=$('rebound').value+'%';};
$('slow').onchange=e=>slow=e.target.checked;$('mesh').onchange=e=>{if(wire)wire.visible=e.target.checked;};
document.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{material?.setPreset(button.dataset.preset);document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
window.addEventListener('keydown',e=>{if(e.target.matches('input,summary'))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)jump();return;}if(e.code==='KeyB'&&!e.repeat)bounceJelly();if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}if(e.code==='KeyR')reset();});
window.addEventListener('keyup',e=>keys.delete(e.code));
for(const button of document.querySelectorAll('[data-move]')){
  const code={up:'ArrowUp',left:'ArrowLeft',down:'ArrowDown',right:'ArrowRight'}[button.dataset.move];
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(code);};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(code));
}
window.addEventListener('blur',()=>{keys.clear();world.move(0,0);});
document.addEventListener('visibilitychange',()=>{keys.clear();accumulator=0;last=0;});

function movement(){
  const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
  const right=new THREE.Vector3(-forward.z,0,forward.x),direction=right.multiplyScalar(x).addScaledVector(forward,-z);
  world.move(direction.x,direction.z);
}
function resize(){
  if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
function homeCamera(){
  const mobile=innerWidth<=760,factor=mobile?1.9:1;
  controls.target.set(0,.45,.75);camera.position.set(3.6*factor,3.5*factor,4.5*factor);
  camera.clearViewOffset();
  controls.update();
}
function updateScene(){
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  character.update(world.actor,world.time);controls.update();forces.update(world,$('forces').checked,camera);renderer.render(scene,camera);
  $('contact-load').textContent=world.contact.load.toFixed(1)+'× weight';
  $('contact-detail').textContent=world.contact.count?'Jelly supports ↑ · Dummy presses ↓':'No foot contact';
  $('peak-load').textContent=world.peakLoad.toFixed(1)+'×';
}
function diagnostics(){
  const screen=position=>{const p=position.clone().project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};};
  return {ready,paused,slow,dragging:!!dragging,backend:renderer?.backend.isWebGPUBackend?'WebGPU':'WebGL2',...world.diagnostics,
    animation:character?.clip,forcesVisible:forces.group.visible,screenActor:screen(new THREE.Vector3(world.actor.x,world.actor.y+.35,world.actor.z)),screenJelly:screen(new THREE.Vector3(.55,.54,.9))};
}
async function init(){
  renderer=new THREE.WebGPURenderer({canvas,antialias:true,alpha:true,forceWebGL:query.has('webgl')});await renderer.init();
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(36,1,.05,70);controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3.2;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.47;
  await createLighting(renderer,scene,{hdrURL:'../assets/studio_small_09_2k.hdr'}).then(lights=>lights.set('hdri'));
  const key=scene.children.find(light=>light.isDirectionalLight);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});key.shadow.normalBias=.015;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#eae5d8',roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,.055,.75);floor.receiveShadow=true;scene.add(floor);
  geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(world.jelly.positions,3).setUsage(THREE.DynamicDrawUsage));
  const faces=[],sides=[],uv=new Float32Array(world.jelly.count*2),j=world.jelly;
  for(let i=0;i<j.count;i++){uv[i*2]=(j.initial[i*3]/1.62+1)/2;uv[i*2+1]=j.initial[i*3+2]/1.62;}
  for(let i=0;i<j.indices.length;i+=3){const ids=Array.from(j.indices.slice(i,i+3));const flat=ids.every(id=>id>=j.layerSize*4)||ids.every(id=>id<j.layerSize);(flat?faces:sides).push(...ids);}
  geometry.setIndex([...faces,...sides]);geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.addGroup(0,faces.length,0);geometry.addGroup(faces.length,sides.length,1);geometry.computeVertexNormals();
  material=citrusMaterials();jellyMesh=new THREE.Mesh(geometry,material.materials);jellyMesh.castShadow=true;jellyMesh.receiveShadow=true;scene.add(jellyMesh);
  wire=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#fff7cf',wireframe:true,transparent:true,opacity:.18,depthWrite:false}));wire.visible=false;scene.add(wire);
  const gltf=await new GLTFLoader().loadAsync('assets/character.glb');character=new TinyCharacter(gltf,scene);
  forces=new ForceIndicators(scene);
  resize();homeCamera();new ResizeObserver(()=>resize()).observe(canvas);window.addEventListener('resize',homeCamera);
  character.update(world.actor,world.time);await renderer.compileAsync(scene,camera);
  ready=true;$('loading').hidden=true;$('status-dot').classList.add('ready');$('status').textContent=`${renderer.backend.isWebGPUBackend?'WEBGPU':'WEBGL2'} / LITTLE LEAPS`;syncPause();
  window.citrusPlayground={diagnostics,jump:()=>world.requestJump(),bounceJelly:()=>world.bounceJelly(),reset,pause:value=>{paused=value;syncPause();},
    advance:frames=>{for(let i=0;i<Math.min(600,Math.max(0,frames));i++){movement();world.step();}updateScene();return diagnostics();}};
  window.citrusDiagnostics=diagnostics;
  renderer.setAnimationLoop(now=>{
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!paused&&!document.hidden){movement();accumulator+=dt*(slow?.25:1);let count=0;while(accumulator>=STEP&&count++<6){world.step();accumulator-=STEP;}if(count>=6)accumulator=Math.min(accumulator,STEP);}
    updateScene();
    if(now-lastRead>120){$('landings').textContent=world.landings;$('volume').textContent=(world.jelly.diagnostics.volumeRatio*100).toFixed(1)+'%';$('actor-state').textContent=world.actor.support==='jelly'?'ON JELLY':world.actor.support==='floor'?'ON FLOOR':'AIRBORNE';lastRead=now;}
  });
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;canvas.focus({preventScroll:true});pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObject(jellyMesh)[0];if(!hit)return;
    const ids=[hit.face.a,hit.face.b,hit.face.c],bary=THREE.Triangle.getBarycoord(hit.point,...ids.map(id=>new THREE.Vector3().fromArray(j.positions,id*3)),new THREE.Vector3());
    const restHit=new THREE.Vector3();ids.forEach((id,k)=>restHit.addScaledVector(new THREE.Vector3().fromArray(j.initial,id*3),bary.getComponent(k)));
    const nodes=[];for(let i=0;i<j.count;i++){const d=new THREE.Vector3().fromArray(j.initial,i*3).distanceTo(restHit);if(d<.48)nodes.push([i,(1-d/.48)**1.2,new THREE.Vector3().fromArray(j.positions,i*3).sub(hit.point).toArray()]);}
    const normal=camera.getWorldDirection(new THREE.Vector3());dragging={id:e.pointerId,plane:new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point),start:hit.point.clone(),target:hit.point.toArray(),desired:hit.point.toArray(),nodes};
    j.setDrag(dragging);controls.enabled=false;canvas.setPointerCapture(e.pointerId);paused=false;syncPause();
  });
  canvas.addEventListener('pointermove',e=>{if(!dragging||dragging.id!==e.pointerId)return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);const point=raycaster.ray.intersectPlane(dragging.plane,new THREE.Vector3());if(!point)return;const delta=point.clone().sub(dragging.start);if(delta.length()>1.2)delta.setLength(1.2);point.copy(dragging.start).add(delta);point.y=Math.max(.12,point.y);dragging.desired=point.toArray();});
  const release=e=>{if(dragging?.id===e.pointerId){dragging=null;j.setDrag(null);controls.enabled=true;}};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release);
}
init().catch(error=>{console.error(error);$('loading').hidden=false;$('loading').textContent=`The playground could not start: ${error.message}`;canvas.dataset.error=error.message;});
