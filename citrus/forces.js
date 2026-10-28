import * as THREE from 'three/webgpu';

export class ForceIndicators {
  constructor(scene){
    this.group=new THREE.Group();scene.add(this.group);
    this.up=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.5,0x477e71,.11,.065);
    this.down=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),.5,0xc97735,.11,.065);
    this.group.add(this.up,this.down);
    this.group.traverse(object=>{if(object.material){object.material.depthTest=false;object.material.transparent=true;object.material.opacity=.9;object.renderOrder=10;}});
  }
  update(world,enabled,camera){
    const c=world.contact;this.group.visible=enabled&&c.count>0&&c.load>.02;if(!this.group.visible)return;
    const direction=new THREE.Vector3(...c.onDummy).normalize(),length=.24+Math.min(.55,Math.log1p(c.load)*.2);
    const forward=camera.getWorldDirection(new THREE.Vector3()),offset=new THREE.Vector3(-forward.z,0,forward.x).normalize().multiplyScalar(.45);
    this.up.position.set(world.actor.x,world.actor.y+.12,world.actor.z).add(offset);this.up.setDirection(direction);
    this.down.position.set(c.point.x,c.point.y-.025,c.point.z).sub(offset);this.down.setDirection(direction.clone().negate());
    this.up.setLength(length,.11,.065);this.down.setLength(length,.11,.065);
  }
}
