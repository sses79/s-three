import * as THREE from 'three/webgpu';

export class TinyCharacter {
  constructor(gltf,scene){
    this.body=new THREE.Group();this.visual=new THREE.Group();this.model=gltf.scene;
    this.visual.add(this.model);this.body.add(this.visual);scene.add(this.body);
    this.model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(this.model),size=box.getSize(new THREE.Vector3());
    this.model.scale.multiplyScalar(.8/size.y);this.model.updateMatrixWorld(true);
    const scaled=new THREE.Box3().setFromObject(this.model),center=scaled.getCenter(new THREE.Vector3());
    this.visual.position.x=-center.x;this.visual.position.z=-center.z;
    this.feet=['foot_l','foot_r','ball_l','ball_r'].map(name=>this.model.getObjectByName(name)).filter(Boolean);
    const footY=Math.min(...this.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y));
    this.soleOffset=footY-scaled.min.y;
    this.model.traverse(object=>{if(!object.isMesh)return;object.castShadow=true;object.receiveShadow=true;
      const material=object.material.clone();material.color.set(object.material.name==='M_Joints'?'#d7ded0':'#467d75');material.roughness=.43;material.metalness=.06;object.material=material;
    });
    this.mixer=new THREE.AnimationMixer(this.model);this.actions=new Map();
    for(const original of gltf.animations){const clip=original.clone();clip.tracks=clip.tracks.filter(track=>track.name!=='root.position');this.actions.set(clip.name,this.mixer.clipAction(clip));}
    this.clip='Idle_Loop';
  }
  update(actor,time){
    let name='Idle_Loop',sample=time;
    if(!actor.grounded){name=actor.vy>.3?'Jump_Start':'Jump_Loop';sample=name==='Jump_Start'?Math.min(.65,(time-actor.jumpAt)*1.7):time;}
    else if(time-actor.landAt<.3){name='Jump_Land';sample=(time-actor.landAt)*2.3;}
    else if(Math.hypot(actor.vx,actor.vz)>.15){name='Walk_Loop';sample=time*1.6;}
    const action=this.actions.get(name)||this.actions.get('Idle_Loop');
    this.mixer.stopAllAction();action.play();action.paused=true;action.time=sample%action.getClip().duration;action.setEffectiveWeight(1);this.mixer.update(0);this.clip=name;
    this.body.position.set(actor.x,actor.y,actor.z);this.body.rotation.y=actor.yaw;this.visual.position.y=0;this.body.updateMatrixWorld(true);
    const lowest=Math.min(...this.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y))-this.soleOffset;
    this.visual.position.y+=actor.y-lowest;this.body.updateMatrixWorld(true);
  }
}
