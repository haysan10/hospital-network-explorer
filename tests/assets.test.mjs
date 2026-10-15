import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import * as T from '../vendor/three.module.js';
import {makeAsset,ASSET_NAMES,mergeStatic} from '../src/assets.js';

test('Both optimized GLBs load with bundled GLTFLoader and preserve floor dimensions',async()=>{
  for(const [floor,width,depth] of [[1,26.4,15.8],[2,22.62,10.9]]){
    const b=await readFile(new URL(`../assets/models/floor-${floor}.glb`,import.meta.url));
    const model=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
    let meshCount=0;model.scene.traverse(o=>{if(o.isMesh)meshCount++;});assert.equal(meshCount,2);
    const size=new T.Box3().setFromObject(model.scene).getSize(new T.Vector3());assert.ok(Math.abs(size.x-width)<.1);assert.ok(Math.abs(size.z-depth)<.1);assert.ok(size.y>2.65&&size.y<2.75);
  }
});
test('All procedural assets have finite geometry and batch without losing bounds',()=>{
  for(const name of ASSET_NAMES){
    const model=makeAsset(name),before=new T.Box3().setFromObject(model);assert.ok(!before.isEmpty());
    model.traverse(o=>{if(o.isMesh)assert.ok([...o.geometry.getAttribute('position').array].every(Number.isFinite));});
    const batched=mergeStatic(model),after=new T.Box3().setFromObject(batched);assert.ok(before.min.distanceTo(after.min)<.00001,name);assert.ok(before.max.distanceTo(after.max)<.00001,name);
  }
});
test('Every reusable asset is a valid embedded GLB without remote resources',async()=>{
  const files=(await readdir(new URL('../assets/models/',import.meta.url))).filter(f=>f.endsWith('.glb'));
  assert.ok(files.length>=26);
  for(const file of files){const b=await readFile(new URL('../assets/models/'+file,import.meta.url));assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n));assert.ok(g.buffers.every(v=>!v.uri));assert.ok((g.images||[]).every(v=>!v.uri));}
});
test('Every actual ES module import resolves to a bundled local file',async()=>{
  async function walk(url){const result=[];for(const d of await readdir(url,{withFileTypes:true})){const next=new URL(d.name+(d.isDirectory()?'/':''),url);if(d.isDirectory())result.push(...await walk(next));else if(d.name.endsWith('.js'))result.push(next);}return result;}
  const modules=[...await walk(new URL('../src/',import.meta.url)),...await walk(new URL('../vendor/',import.meta.url))];
  for(const file of modules){const source=await readFile(file,'utf8');const imports=[...source.matchAll(/^(?:import\s+(?:[^;]*?\s+from\s+)?|export\s+[^;]*?\s+from\s+)['"]([^'"]+)['"]/gm)];for(const match of imports){assert.ok(match[1].startsWith('.'),`${file}: ${match[1]}`);assert.ok((await stat(new URL(match[1],file))).isFile());}}
});
