import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {FLOORS,FLOOR_HEIGHT,NETWORK,DEVICE_MAP,ROOMS,elevation} from '../src/data.js';
import {EDGES,traceRoute,GameState,canStand,pathLength} from '../src/engine.js';
import {InstallationSession,INSTALL_STEPS,DISTRIBUTION_STEPS,PRESENTATION_SLIDES,STAIR_LANDINGS,STAIR_PATH,stairPosition,nearStairs} from '../src/experience.js';
import {HospitalWorld} from '../src/world.js';
import {makeRoof,makeCeiling,makeConnector,cutStairDoorway} from '../src/building.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {makeAsset,mergeStatic} from '../src/assets.js';

const baseline=()=>({mains:true,ups:true,broken:new Set()});
test('Installation requires ordered correct work, persists it, and assembles the exact original graph',()=>{
  let session=new InstallationSession();assert.equal(session.links.size,0);assert.equal(session.verify().ok,false);
  assert.equal(session.choose(2,INSTALL_STEPS[2].answer).ok,false);
  for(let i=0;i<INSTALL_STEPS.length;i++){
    const before=session.links.size;assert.equal(session.choose(i,(INSTALL_STEPS[i].answer+1)%3).ok,false);assert.equal(session.links.size,before);
    assert.equal(session.choose(i,INSTALL_STEPS[i].answer).ok,true);assert.equal(session.choose(i,INSTALL_STEPS[i].answer).ok,false);
    session=new InstallationSession(JSON.parse(JSON.stringify(session.serialize())));assert.equal(session.index,i+1);
    if(i===2){assert.equal(traceRoute('pc-icu','server',baseline(),{edges:EDGES.filter(e=>session.links.has(e.id))}).ok,false);}
  }
  assert.equal(session.done,true);assert.deepEqual([...session.links].sort(),EDGES.map(e=>e.id).sort());assert.equal(session.verify().ok,true);
  assert.equal(session.verify().results.length,3);assert.equal(session.verify().guest.reason,'policy');
  assert.equal(new InstallationSession({completed:['backbone','verify']}).index,0);
});
test('Guest policy is evaluated only after a powered physical path exists',()=>{
  assert.equal(traceRoute('guest','server',baseline(),{edges:[]}).reason,'link');
  const state=baseline();state.broken.add('link-ap-registration');assert.equal(traceRoute('guest','server',state).reason,'link');
  state.broken.clear();assert.equal(traceRoute('guest','server',state).reason,'policy');state.mains=false;assert.equal(traceRoute('guest','server',state).reason,'power');
});
test('Guides and presentation use real devices and routable original distribution branches',()=>{
  for(const config of [...DISTRIBUTION_STEPS,...PRESENTATION_SLIDES,...INSTALL_STEPS]){
    if(config.target)assert.ok(DEVICE_MAP.has(config.target),config.title);
    if(config.route)assert.equal(traceRoute(...config.route,baseline(),{policy:false}).ok,true,config.title);
  }
  const destinations=new Set(EDGES.filter(e=>e.a==='core').map(e=>e.b));assert.deepEqual([...destinations].sort(),['sw-l2','sw-north','sw-south']);
  assert.equal(NETWORK.length,53);assert.equal(EDGES.length,48);
});
test('Connected stairs run continuously between both original rooms and both landings remain walkable',async()=>{
  for(const floor of [1,2]){
    const p=STAIR_LANDINGS[floor],r=ROOMS.find(r=>r.id===`stairs-${floor}`),walls=JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url),'utf8'));
    assert.ok(p[0]>r.bounds[0]&&p[0]<r.bounds[2]&&p[1]>r.bounds[1]&&p[1]<r.bounds[3]);assert.equal(canStand(...p,FLOORS[floor].bounds,walls),true);
    assert.equal(nearStairs(floor,p),true);assert.equal(nearStairs(floor,[0,0]),false);
  }
  assert.deepEqual(stairPosition(1,0),[...STAIR_PATH[0]]);assert.deepEqual(stairPosition(1,1),[9.5,FLOOR_HEIGHT,2.3]);assert.deepEqual(stairPosition(2,1),STAIR_PATH[0]);
  let prior=stairPosition(1,0);for(let i=1;i<=1000;i++){const p=stairPosition(1,i/1000);assert.ok(p.every(Number.isFinite));assert.ok(p[1]>=prior[1]-.0001);assert.ok(Math.hypot(...p.map((v,j)=>v-prior[j]))<=pathLength(STAIR_PATH)/1000+.0001);prior=p;}
});
test('Actual stair transit finishes on the destination without leaving walking mode or hiding a connected storey',()=>{
  const world=Object.create(HospitalWorld.prototype);Object.assign(world,{floor:1,mode:'walk',transit:{from:1,to:2,time:0,duration:9},camera:new T.PerspectiveCamera(),callbacks:{floor(){},toast(){}},updateState(){}});
  assert.equal(world.visibleFloor(1),true);assert.equal(world.visibleFloor(2),true);
  for(let i=0;i<181;i++)world.updateTransit(.05);
  assert.equal(world.transit,null);assert.equal(world.floor,2);assert.equal(world.mode,'walk');assert.deepEqual(world.player,STAIR_LANDINGS[2]);assert.ok(Math.abs(world.camera.position.y-elevation(2)-1.62)<1e-6);
  world.transit={from:2,to:1,time:0,duration:1};world.updateTransit(1);assert.equal(world.floor,1);assert.deepEqual(world.player,STAIR_LANDINGS[1]);
});
test('Roofs cover each floor footprint and batched textured geometry keeps UV coordinates',()=>{
  for(const floor of [1,2]){
    const roof=makeRoof(floor),ceil=makeCeiling(floor),bounds=new T.Box3().setFromObject(roof),b=FLOORS[floor].bounds;
    assert.ok(bounds.min.x<=b[0]&&bounds.max.x>=b[2]);assert.ok(bounds.min.z<=b[1]&&bounds.max.z>=b[3]);assert.ok(bounds.min.y>2.6);assert.ok(!new T.Box3().setFromObject(ceil).isEmpty());
    roof.traverse(o=>{if(o.isMesh){assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));if(o.material.map)assert.equal(o.geometry.attributes.uv.count,o.geometry.attributes.position.count);}});
  }
  for(const kind of ['pc','bed','chair','rack','cabinet']){
    const model=mergeStatic(makeAsset(kind));let textured=0;model.traverse(o=>{if(o.isMesh&&o.material.map){textured++;const uv=o.geometry.attributes.uv;assert.equal(uv.count,o.geometry.attributes.position.count);assert.ok([...uv.array].some(v=>v!==0));assert.equal(o.material.map.image.width,128);}});assert.ok(textured>0,kind);
  }
  const connector=makeConnector(),bounds=new T.Box3().setFromObject(connector);for(const p of STAIR_PATH)assert.ok(bounds.containsPoint(new T.Vector3(p[0],p[1],p[2])));
});
test('Roof visibility distinguishes exterior, floor cutaway, and ceiling during a walk',()=>{
  const world=Object.create(HospitalWorld.prototype);world.floor='all';world.mode='orbit';world.roofMode='auto';world.floors=new Map([1,2].map(n=>[n,{root:new T.Group(),architecture:new T.Group(),details:new T.Group(),roof:new T.Group(),ceiling:new T.Group()}]));
  world.updateEnvelope();assert.equal(world.floors.get(2).roof.visible,true);assert.equal(world.floors.get(1).architecture.scale.y,1);
  world.floor=1;world.updateEnvelope();assert.equal(world.floors.get(1).roof.visible,false);assert.equal(world.floors.get(2).root.visible,false);
  world.mode='walk';world.updateEnvelope();assert.equal(world.floors.get(1).ceiling.visible,true);assert.equal(world.floors.get(1).architecture.scale.y,1);
  world.roofMode='open';world.updateEnvelope();assert.equal(world.floors.get(1).ceiling.visible,false);
});
test('East stair doorways have an actual opening after clipping the original GLB wall triangles',async()=>{
  for(const floor of [1,2]){
    const file=await readFile(new URL(`../assets/models/floor-${floor}.glb`,import.meta.url));const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
    const z=floor===1?.6:2.3;gltf.scene.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(floor===1?12.3:10.5,1.62,z),new T.Vector3(1,0,0),0,2);
    assert.ok(ray.intersectObject(gltf.scene,true).length>0,`original external wall L${floor}`);cutStairDoorway(gltf.scene,floor);gltf.scene.updateMatrixWorld(true);assert.equal(ray.intersectObject(gltf.scene,true).length,0,`open stair door L${floor}`);
  }
});
