// Keep the original rig and meshes, retaining only the five clips used here.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=process.argv[2];
if(!source)throw new Error('Usage: node citrus/prepare-character.mjs /path/to/character.glb');
const bytes=await fs.readFile(source),length=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.toString('utf8',20,20+length));
const bin=bytes.subarray(28+length,28+length+bytes.readUInt32LE(20+length));
const names=['Idle_Loop','Walk_Loop','Jump_Start','Jump_Loop','Jump_Land'];
gltf.animations=gltf.animations.filter(clip=>names.includes(clip.name));
const accessors=new Set();
for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){Object.values(primitive.attributes).forEach(a=>accessors.add(a));if(primitive.indices!==undefined)accessors.add(primitive.indices);}
for(const skin of gltf.skins)if(skin.inverseBindMatrices!==undefined)accessors.add(skin.inverseBindMatrices);
for(const clip of gltf.animations)for(const sampler of clip.samplers){accessors.add(sampler.input);accessors.add(sampler.output);}
const views=new Set([...accessors].map(i=>gltf.accessors[i].bufferView));
for(const image of gltf.images||[])if(image.bufferView!==undefined)views.add(image.bufferView);
const viewMap=new Map(),parts=[],newViews=[];let offset=0;
for(const id of [...views].sort((a,b)=>a-b)){
  const view=gltf.bufferViews[id],part=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  viewMap.set(id,newViews.length);newViews.push({...view,byteOffset:offset});parts.push(part);offset+=part.length;
  const padding=(4-offset%4)%4;if(padding){parts.push(Buffer.alloc(padding));offset+=padding;}
}
const accessorMap=new Map(),newAccessors=[];
for(const id of [...accessors].sort((a,b)=>a-b)){accessorMap.set(id,newAccessors.length);const a=gltf.accessors[id];if(a.sparse)throw new Error('Sparse accessor requires explicit handling');newAccessors.push({...a,bufferView:viewMap.get(a.bufferView)});}
for(const mesh of gltf.meshes)for(const p of mesh.primitives){for(const key of Object.keys(p.attributes))p.attributes[key]=accessorMap.get(p.attributes[key]);if(p.indices!==undefined)p.indices=accessorMap.get(p.indices);}
for(const skin of gltf.skins)skin.inverseBindMatrices=accessorMap.get(skin.inverseBindMatrices);
for(const clip of gltf.animations)for(const s of clip.samplers){s.input=accessorMap.get(s.input);s.output=accessorMap.get(s.output);}
for(const image of gltf.images||[])if(image.bufferView!==undefined)image.bufferView=viewMap.get(image.bufferView);
gltf.accessors=newAccessors;gltf.bufferViews=newViews;gltf.buffers=[{byteLength:offset}];
gltf.asset.extras={source:'https://quaternius.itch.io/universal-animation-library',license:'CC0-1.0',retainedClips:names};
let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const binary=Buffer.concat(parts),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);
jh.writeUInt32LE(json.length);jh.write('JSON',4);bh.writeUInt32LE(binary.length);bh.write('BIN\0',4);
const output=Buffer.concat([header,jh,json,bh,binary]);await fs.writeFile(new URL('./assets/character.glb',import.meta.url),output);
await fs.writeFile(new URL('./source/character.json',import.meta.url),JSON.stringify({sourceSha256:createHash('sha256').update(bytes).digest('hex'),outputSha256:createHash('sha256').update(output).digest('hex'),bytes:output.length,clips:names},null,2)+'\n');
console.log(`Prepared ${output.length} bytes with ${names.length} original animation clips`);
