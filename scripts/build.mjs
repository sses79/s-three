import {build as bundle} from 'esbuild';
import {mkdir, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = fileURLToPath(new URL('../dist/', import.meta.url));

export async function build() {
  await mkdir(new URL('../dist/assets/', import.meta.url), {recursive: true});
  await mkdir(new URL('../dist/citrus/assets/', import.meta.url), {recursive: true});
  await bundle({absWorkingDir: root, entryPoints: ['watch/main.js'], bundle: true,
    minify: true, format: 'esm', outfile: 'dist/app.js'});
  await bundle({absWorkingDir: root, entryPoints: ['citrus/main.js'], bundle: true,
    minify: true, format: 'esm', outfile: 'dist/citrus/app.js'});
  for (const path of ['index.html', 'style.css', 'assets/watch.glb', 'assets/studio_small_09_2k.hdr']) {
    await copyFile(new URL('../watch/' + path, import.meta.url), new URL('../dist/' + path, import.meta.url));
  }
  for(const path of ['index.html','style.css','assets/character.glb']){
    await copyFile(new URL('../citrus/'+path,import.meta.url),new URL('../dist/citrus/'+path,import.meta.url));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built SECOND and Citrus into dist/');
}
