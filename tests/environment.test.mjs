import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import * as T from '../vendor/three.module.js';
import {ROOMS,FLOORS,FLOOR_OFFSETS,FLOOR_HEIGHT} from '../src/data.js';
import {buildEnvironment} from '../src/environment.js';
import {createDoor,animateDoor,closedDoorSegments,subtractBoxes,windowCutters,planWindows,CEILING_Y,WALL_HEIGHT} from '../src/architecture.js';
import {makeAsset,ASSET_NAMES,material} from '../src/assets.js';
import {canStand,moveWithCollision,distanceToSegment} from '../src/engine.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds} from '../src/layout.js';
import {HospitalWorld} from '../src/world.js';
const walls={},env={};for(const floor of [1,2]){const [dx,dz]=FLOOR_OFFSETS[floor];walls[floor]=JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx)));env[floor]=buildEnvironment(floor,walls[floor]);}

test('Every modeled room has a ceiling, light and an entrance; the lower stairwell stays open',()=>{
 assert.equal(ROOMS.length,36);
 for(const e of Object.values(env))for(const room of e.roomSummary){assert.ok(room.detailCount>=2,room.id);if(room.openStairwell)assert.equal(room.ceiling,false);else{assert.equal(room.ceiling,true);assert.ok(room.lights>0,room.id);}if(room.type!=='corridor')assert.ok(room.doors>0,room.id);}
 assert.deepEqual(Object.values(env).flatMap(e=>e.skipped),[]);
});
test('Door frames occupy existing reference openings, including twelve private toilet stalls',()=>{
 const doors=Object.values(env).flatMap(e=>e.doors);assert.equal(doors.filter(d=>d.definition.stall).length,12);
 for(const {definition:d}of doors.filter(d=>!d.definition.portal)){assert.ok(d.width>.45&&d.width<2);assert.ok(Math.min(...walls[d.floor].map(s=>distanceToSegment(d.x,d.z,s)))>.06,d.id);}
});
test('A closed door prevents crossing, and opens physically before its collision barrier clears',()=>{
 const source=env[1].doors.find(d=>!d.definition.portal),door=createDoor(source.definition),d=door.definition;
 assert.equal(closedDoorSegments([door]).length,1);
 const bounds=[d.x-3,d.z-3,d.x+3,d.z+3],horizontal=d.rotation===0,start=horizontal?[d.x,d.z-.5]:[d.x-.5,d.z],delta=horizontal?[0,1]:[1,0];
 const blocked=moveWithCollision(start,...delta,bounds,closedDoorSegments([door]));assert.ok(Math.hypot(blocked[0]-start[0],blocked[1]-start[1])<.4);
 for(let i=0;i<70;i++)animateDoor(door,1/60,[d.x,d.z-.5]);
 assert.ok(door.progress>.99);assert.equal(closedDoorSegments([door]).length,0);assert.ok(door.leaves.some(p=>Math.abs(p.hinge.rotation.y)>.2||Math.abs(p.hinge.position.x-p.closedX)>.2));
 const clear=moveWithCollision(start,...delta,bounds,closedDoorSegments([door]));assert.ok(Math.hypot(clear[0]-start[0],clear[1]-start[1])>.95);
});
test('Walls have real window holes, retaining wall above and beside each aperture',()=>{
 const source=new T.BoxGeometry(4,2.94,.2);source.translate(0,1.47,0);
 const geometry=subtractBoxes(source,[{min:[-.6,1.35,-.3],max:[.6,2.32,.3]}]);assert.ok(geometry.attributes.position.array.every(Number.isFinite));
 const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();
 const ray=(x,y)=>new T.Raycaster(new T.Vector3(x,y,1),new T.Vector3(0,0,-1),0,2).intersectObject(mesh);
 assert.equal(ray(0,1.8).length,0);assert.ok(ray(1.4,1.8).length);assert.ok(ray(0,2.7).length);
 assert.equal(Object.values(env).reduce((n,e)=>n+e.windowDefinitions.length,0),26);
 for(const w of [...planWindows(1),...planWindows(2)]){assert.ok(w.y+w.height/2<CEILING_Y);if(w.frosted)assert.ok(w.y-w.height/2>2);}
});
test('Exposed roofs enclose the lower terrace and upper rooms while keeping the L1 stair opening',()=>{
 for(const floor of [1,2]){env[floor].roof.updateMatrixWorld(true);const r=ROOMS.find(r=>r.floor===floor&&r.type==='ward'||floor===1&&r.id==='kitchen'),[x,z]=r.center;
  const ray=new T.Raycaster(new T.Vector3(x,FLOOR_HEIGHT+2,z),new T.Vector3(0,-1,0),0,6);assert.ok(ray.intersectObject(env[floor].roof,true).length);
 }
 const stair=ROOMS.find(r=>r.id==='stairs-1'),ray=new T.Raycaster(new T.Vector3(stair.center[0],5,stair.center[1]),new T.Vector3(0,-1,0),0,6);assert.equal(ray.intersectObject(env[1].roof,true).length,0);
});
test('Cutaway and interior modes switch the envelope without clipping furniture materials',()=>{
 const context={floors:new Map([[1,{environment:env[1],architectureMaterials:[material(0xe6e8e3,0,'plaster').clone()]}]]),mode:'walk',shellFull:false,ceilingOverride:null,renderer:{shadowMap:{}}};
 const original=globalThis.document;globalThis.document={querySelector(){return null;}};
 try{HospitalWorld.prototype.syncEnvelope.call(context);assert.ok(env[1].ceilings.visible);assert.ok(env[1].roof.visible);assert.equal(context.floors.get(1).architectureMaterials[0].clippingPlanes,null);
  context.mode='orbit';HospitalWorld.prototype.syncEnvelope.call(context);assert.equal(env[1].ceilings.visible,false);assert.equal(env[1].roof.visible,false);assert.ok(context.floors.get(1).architectureMaterials[0].clippingPlanes.length);
  const asset=makeAsset('pc');asset.traverse(o=>{if(o.isMesh)assert.ok(!o.material.clippingPlanes?.length);});
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
test('Room-specific equipment and corridor safety furniture are present',()=>{
 const all=Object.values(env).flatMap(e=>e.placements),has=(room,kind)=>all.some(p=>p.room===room&&p.kind===kind);
 for(const r of ROOMS.filter(r=>['ward','clinical','icu'].includes(r.type)))for(const kind of ['bedside-table','iv-pole','bed-head-unit','privacy-curtain'])assert.ok(has(r.id,kind),r.id+' '+kind);
 for(const kind of ['microscope','test-tube-rack'])assert.ok(has('lab',kind));assert.ok(has('kitchen','fridge'));assert.ok(has('laundry','hamper'));assert.ok(has('doctors','sofa'));assert.ok(has('rehab','parallel-bars'));
 for(const r of ROOMS.filter(r=>r.type==='operation'))assert.ok(has(r.id,'surgical-light'));
 for(const id of ['corridor-n','corridor-s','corridor-2'])assert.ok(has(id,'fire-extinguisher'));
});
test('New floor equipment preserves valid navigation spawns and lies inside its room',()=>{
 for(const f of [1,2]){const obs=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===f).map(placementBounds).concat(env[f].obstacles);assert.ok(canStand(...FLOORS[f].spawn,FLOORS[f].bounds,walls[f],.18,obs));
  for(const p of env[f].placements.filter(p=>p.collidable)){const r=ROOMS.find(r=>r.id===p.room),b=p.bounds;assert.ok(b[0]>=r.bounds[0]&&b[1]>=r.bounds[1]&&b[2]<=r.bounds[2]&&b[3]<=r.bounds[3]);}
 }
});
test('All reusable assets carry base color, normal, roughness and occlusion textures',()=>{
 for(const name of ASSET_NAMES)makeAsset(name).traverse(o=>{if(o.isMesh)for(const map of ['map','normalMap','roughnessMap','aoMap'])assert.ok(o.material[map],`${name}: ${map}`);});
});

test('All 26 windows also cut through the actual supplied wall GLBs',async()=>{
 for(const floor of [1,2]){const bytes=await readFile(new URL(`../assets/models/floor-${floor}.glb`,import.meta.url)),model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),[dx,dz]=FLOOR_OFFSETS[floor],windows=planWindows(floor),cutters=windowCutters(windows).map(b=>({min:[b.min[0]-dx,b.min[1],b.min[2]-dz],max:[b.max[0]-dx,b.max[1],b.max[2]-dz]}));
  model.scene.traverse(o=>{if(o.isMesh){o.geometry.applyMatrix4(new T.Matrix4().makeScale(1,WALL_HEIGHT/2.7,1));o.geometry=subtractBoxes(o.geometry,cutters);o.material=new T.MeshBasicMaterial({side:T.DoubleSide});assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});model.scene.updateMatrixWorld(true);
  for(const w of windows){const direction=w.side==='N'?1:-1;const ray=new T.Raycaster(new T.Vector3(w.x-dx,w.y,w.z-dz-direction*.5),new T.Vector3(0,0,direction),0,1);assert.equal(ray.intersectObject(model.scene,true).length,0,w.id);}
 }
});
