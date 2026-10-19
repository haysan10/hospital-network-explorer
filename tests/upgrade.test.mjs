import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import * as T from '../vendor/three.module.js';
import {ASSET_NAMES,makeAsset,mergeStatic,cushionGeometry,addPlanarUVs} from '../src/assets.js';
import {ROOMS,FLOOR_HEIGHT,FLOOR_OFFSETS,FLOORS,NETWORK} from '../src/data.js';
import {EDGES,clipPathToFloor,edgeVisible,pathLength,distanceToSegment,canStand} from '../src/engine.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds} from '../src/layout.js';

const walls={};for(const f of [1,2]){const [dx,dz]=FLOOR_OFFSETS[f];walls[f]=JSON.parse(await readFile(new URL(`../assets/collision-${f}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx)));}
test('Reviewed furnishings remain in their rooms without wall or furniture intersections; bed-PC clearance >= 1',()=>{
 const report=JSON.parse(execFileSync(process.execPath,['tools/audit-layout.mjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}));
 assert.deepEqual(report.issues,[]);assert.ok(report.objects>=100);assert.ok(report.clearances.length>=9);for(const {gap}of report.clearances)assert.ok(gap>=1);
});
test('Internal stair floors share an axis and lower flight meets the upper landing',()=>{
 const stairs=FURNITURE.filter(p=>['stairs','stair-landing'].includes(p.kind));assert.equal(stairs.length,2);
 assert.ok(Math.hypot(stairs[0].x-stairs[1].x,stairs[0].z-stairs[1].z)<.001);
 const model=makeAsset('stairs');let treadTop=0;model.traverse(o=>{if(o.isMesh&&o.geometry.userData.rounded){const b=new T.Box3().setFromObject(o,true);if(b.getSize(new T.Vector3()).y<.2&&b.max.y<=FLOOR_HEIGHT+.03)treadTop=Math.max(treadTop,b.max.y);}});
 assert.ok(Math.abs(treadTop-FLOOR_HEIGHT)<.02);
});
test('Eight corridor benches sit along solid walls; at least 0.9 scene units remain for circulation',()=>{
 const benches=FURNITURE.filter(p=>p.kind==='waiting-bench'&&p.room.startsWith('corridor'));assert.equal(benches.length,8);
 for(const p of benches){const room=ROOMS.find(r=>r.id===p.room),back=p.rotation?room.bounds[3]:room.bounds[1];
  for(let x=p.x-.98;x<p.x+.98;x+=.08)assert.ok(Math.min(...walls[p.floor].map(s=>distanceToSegment(x,back,s)))<.16,`${p.id} blocks a door`);
  const free=(room.bounds[3]-room.bounds[1])-.49;assert.ok(free>=.9);
 }
});
test('Fiber geometry and packets remain visible in either floor view without leaking across its slab',()=>{
 const fiber=EDGES.find(e=>e.id==='link-core-sw-l2');assert.ok(fiber);
 const lengths=[];for(const f of [1,2]){assert.ok(edgeVisible(fiber,f));const paths=clipPathToFloor(fiber.points,f);assert.ok(paths.length);lengths.push(paths.reduce((s,p)=>s+pathLength(p),0));for(const p of paths.flat())assert.ok(f===1?p[1]<=FLOOR_HEIGHT-.12+.00001:p[1]>=FLOOR_HEIGHT-.12-.00001);}
 assert.ok(Math.abs(lengths[0]+lengths[1]-pathLength(fiber.points))<.00001);
 const west=EDGES.find(e=>e.id==='link-l2-west');assert.equal(west.type,'fiber');assert.deepEqual(west.floors,[2]);assert.ok(pathLength(west.points)>15);assert.deepEqual(clipPathToFloor(west.points,1),[]);
});
test('Every small operating room and reference corridor has its network endpoint',()=>{
 for(const r of ['ok-1','ok-2','ok-3'])assert.ok(NETWORK.some(n=>n.id===`pc-${r}`&&n.asset==='wall-terminal'));
 for(const r of ['corridor-n','corridor-s','corridor-2','stairs-2'])assert.ok(NETWORK.some(n=>n.id===`ap-${r}`));
});
test('All navigation spawn points remain clear with the new furnishings',()=>{
 for(const f of [1,2]){const obstacles=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===f).map(placementBounds);assert.ok(canStand(...FLOORS[f].spawn,FLOORS[f].bounds,walls[f],.18,obstacles),`spawn L${f}`);}
});
test('Updated assets keep UV/tangent attributes after batching and stay under 60k triangles each',()=>{
 for(const name of ASSET_NAMES){const model=makeAsset(name);let triangles=0;
  model.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;triangles+=(g.index?.count||g.attributes.position.count)/3;for(const a of ['uv','tangent']){assert.ok(g.attributes[a],`${name} ${a}`);assert.ok([...g.attributes[a].array].every(Number.isFinite));}});
  assert.ok(triangles<60000,`${name}: ${triangles}`);
  mergeStatic(model).traverse(o=>{if(o.isMesh){assert.equal(o.geometry.attributes.uv.count,o.geometry.attributes.position.count);assert.equal(o.geometry.attributes.tangent.count,o.geometry.attributes.position.count);}});
 }
 const g=cushionGeometry(.9,.19,1.9,.07,6,.02);assert.ok(g.attributes.position.count>100);assert.ok(g.boundingBox.max.y>.095);
});
test('Exported GLBs have valid buffer ranges, tangents and embedded PBR images',async()=>{
 for(const name of ASSET_NAMES){const b=await readFile(new URL(`../assets/models/${name}.glb`,import.meta.url)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);let triangles=0;
  for(const view of g.bufferViews)assert.ok((view.byteOffset||0)+view.byteLength<=bin.length,name);
  for(const mesh of g.meshes)for(const p of mesh.primitives){assert.ok(p.attributes.TEXCOORD_0!==undefined);assert.ok(p.attributes.TANGENT!==undefined);triangles+=g.accessors[p.indices??p.attributes.POSITION].count/3;}
  assert.ok(triangles<60000);assert.ok(g.images?.length>0,name);
  for(const m of g.materials){if(!m.name||m.name==='')continue;assert.ok(m.pbrMetallicRoughness.baseColorTexture,name);assert.ok(m.occlusionTexture,name);assert.ok(m.normalTexture,name);assert.ok(m.pbrMetallicRoughness.metallicRoughnessTexture,name);}
  for(const image of g.images){const v=g.bufferViews[image.bufferView],png=bin.subarray(v.byteOffset,v.byteOffset+v.byteLength);assert.equal(png.subarray(1,4).toString(),'PNG');const width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.equal(width,128);assert.equal(height,128);}
 }
});

test('Source wall geometry receives finite UVs and tangents before PBR shading',async()=>{
 for(const floor of [1,2]){const bytes=await readFile(new URL(`../assets/models/floor-${floor}.glb`,import.meta.url));const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  model.scene.traverse(o=>{if(o.isMesh){const before=new T.Box3().setFromObject(o,true);addPlanarUVs(o.geometry);for(const a of ['uv','tangent']){assert.ok(o.geometry.attributes[a]);assert.ok([...o.geometry.attributes[a].array].every(Number.isFinite));}const after=new T.Box3().setFromObject(o,true);assert.ok(before.equals(after));}});
 }
});
