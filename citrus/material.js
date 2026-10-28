import * as THREE from 'three/webgpu';

const palettes={orange:['#e88a24','#f7b749','#fff0b8','#bc5c19'],lemon:['#cbbb36','#f2df70','#fff7c3','#a78c19'],ruby:['#b94337','#f29164','#ffe4b6','#b26024']};
export function citrusMaterials(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const flesh=new THREE.MeshPhysicalMaterial({map:texture,roughness:.32,metalness:0,transmission:.18,thickness:.35,
    attenuationColor:'#dc8a35',attenuationDistance:.8,ior:1.36,specularIntensity:.35,clearcoat:.4,clearcoatRoughness:.28});
  const rind=new THREE.MeshPhysicalMaterial({color:'#d17b28',roughness:.3,clearcoat:.6,transmission:.06,thickness:.3});
  const setPreset=name=>{
    const [base,highlight,pith,skin]=palettes[name]||palettes.orange,c=canvas.getContext('2d');
    c.fillStyle=pith;c.fillRect(0,0,1024,512);
    const grad=c.createRadialGradient(440,420,20,512,512,490);grad.addColorStop(0,highlight);grad.addColorStop(1,base);
    c.fillStyle=grad;c.beginPath();c.arc(512,512,489,Math.PI,0);c.fill();
    let seed=415;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
    for(let i=0;i<6500;i++){
      const a=random()*Math.PI,r=Math.sqrt(random())*465,x=512+Math.cos(a)*r,y=512-Math.sin(a)*r;
      c.save();c.translate(x,y);c.rotate(-a+Math.PI/2);c.fillStyle=i%3?highlight:pith;c.globalAlpha=.13+random()*.18;
      c.beginPath();c.ellipse(0,0,1+random()*2,4+random()*7,0,0,Math.PI*2);c.fill();c.restore();
    }
    c.strokeStyle=pith;c.lineWidth=5;c.globalAlpha=.8;
    for(let i=0;i<=8;i++){const a=i*Math.PI/8;c.beginPath();c.moveTo(512,512);c.lineTo(512+Math.cos(a)*472,512-Math.sin(a)*472);c.stroke();}
    c.globalAlpha=1;c.strokeStyle=pith;c.lineWidth=19;c.beginPath();c.arc(512,512,477,Math.PI,0);c.stroke();
    c.strokeStyle=skin;c.lineWidth=8;c.beginPath();c.arc(512,512,488,Math.PI,0);c.stroke();
    texture.needsUpdate=true;rind.color.set(skin);flesh.attenuationColor.set(base);
  };
  setPreset('orange');return {materials:[flesh,rind],setPreset};
}
