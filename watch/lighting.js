import * as THREE from 'three/webgpu';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';

export async function createLighting(renderer, scene, {hdrURL='assets/studio_small_09_2k.hdr'}={}) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const original = pmrem.fromScene(room, .04);room.dispose();
  const fill = new THREE.HemisphereLight(0xffffff, 0x83937a, 2);
  const key = new THREE.DirectionalLight(0xfff5dc, 3);key.position.set(-3, 6, 8);
  const rim = new THREE.DirectionalLight(0xd1e1ff, 2);rim.position.set(4, -1, 5);
  scene.add(fill, key, rim);
  let hdri = null, panorama = null, profile = 'original', background = 'cream';
  const describe = () => ({profile, available: !!hdri,
    name: profile === 'hdri' ? 'Studio Small 09 / 2K' : 'Original studio',
    intensity: scene.environmentIntensity, rotation: scene.environmentRotation.y,
    background, backgroundBlur: scene.backgroundBlurriness});
  const set = (name,{rotation=180}={}) => {
    profile = name === 'hdri' && hdri ? 'hdri' : 'original';
    const useHDRI = profile === 'hdri';
    scene.environment = (useHDRI ? hdri : original).texture;
    scene.environmentIntensity = useHDRI ? 1 : 1.5;
    scene.environmentRotation.set(0, useHDRI ? THREE.MathUtils.degToRad(rotation) : 0, 0);
    scene.backgroundRotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
    fill.intensity = useHDRI ? .8 : 2;
    key.intensity = useHDRI ? 1.6 : 3;
    rim.intensity = useHDRI ? .8 : 2;
    return describe();
  };
  const setBackground = name => {
    background = name === 'hdri' && panorama ? 'hdri' : 'cream';
    scene.background = background === 'hdri' ? panorama : null;
    scene.backgroundBlurriness = 0;
    scene.backgroundIntensity = 1;
    return describe();
  };
  set('original');
  let source;
  try {
    source = await new HDRLoader().loadAsync(hdrURL);
    hdri = pmrem.fromEquirectangular(source);
    source.mapping = THREE.EquirectangularReflectionMapping;
    panorama = source;
  } catch (error) {
    console.warn('Studio Small 09 could not load; using the original studio.', error);
  } finally {if(source!==panorama)source?.dispose();pmrem.dispose();}
  return {set, setBackground, describe};
}
