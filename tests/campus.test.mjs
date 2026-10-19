import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {buildCampus,CAMPUS_BOUNDS,CAMPUS_WALK,createContactShadows} from '../src/campus.js';
import {LIGHTING_PRESETS,lightSelection,lightPower} from '../src/lighting.js';
import {buildEnvironment} from '../src/environment.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementObstacles} from '../src/layout.js';
import {NETWORK,terminalOutlet,elevation} from '../src/data.js';
import {EDGES,canStand,moveWithCollision} from '../src/engine.js';
import {FRONT_OFFICE,prepareWallSegments,arrivalBarriers} from '../src/circulation.js';
import {animateDoor,closedDoorSegments} from '../src/architecture.js';
const campus=buildCampus(),walls=prepareWallSegments(1,JSON.parse(await readFile(new URL('../assets/collision-1.json',import.meta.url)))),env=buildEnvironment(1,walls),segments=walls.concat(arrivalBarriers,campus.barriers),obstacles=FURNITURE.concat(DEVICE_PLACEMENTS).filter(p=>p.floor===1).flatMap(placementObstacles).concat(env.obstacles,campus.obstacles);
test('The campus includes vehicles, landscaped seating and actual exterior light positions with finite batched geometry',()=>{
 for(const kind of ['garden-tree','garden-bench','car','ambulance','street-light','bollard-light'])assert.ok(campus.placements.some(p=>p.kind===kind),kind);assert.equal(campus.lights.length,11);
 let meshes=0;campus.root.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.uv);assert.ok(o.geometry.attributes.tangent);}});assert.ok(meshes<120,'Campus is batched');
 campus.update(12);campus.setLighting('night');assert.ok(campus.glowMaterials.every(m=>m.emissiveIntensity>1));campus.setLighting('night',false);assert.ok(campus.glowMaterials.every(m=>m.emissiveIntensity===0));
});
test('A continuous 1.2-unit pedestrian route connects the campus to registration and works with automatic doors',()=>{
 const path=CAMPUS_WALK.concat(FRONT_OFFICE.routes[0].points.slice(1));let player=[...path[0]];
 for(const target of path.slice(1)){
  const start=[...player],n=Math.ceil(Math.hypot(target[0]-start[0],target[1]-start[1])/.04);for(let k=0;k<=n;k++){const p=start.map((v,j)=>v+(target[j]-v)*k/n);assert.ok(canStand(...p,CAMPUS_BOUNDS,segments,.6,obstacles),p.join(','));}
  let attempts=0;while(Math.hypot(target[0]-player[0],target[1]-player[1])>.05&&attempts++<1800){for(const d of env.doors)animateDoor(d,1/60,player);const len=Math.hypot(target[0]-player[0],target[1]-player[1]),speed=Math.min(.04,len);player=moveWithCollision(player,(target[0]-player[0])/len*speed,(target[1]-player[1])/len*speed,CAMPUS_BOUNDS,segments.concat(closedDoorSegments(env.doors)),obstacles);}assert.ok(attempts<1800,'Campus walk failed');
 }
});
test('All terminal LAN paths pass through their modeled data outlet before reaching the overhead distribution',()=>{
 for(const n of NETWORK.filter(n=>n.kind==='pc')){const o=terminalOutlet(n),edge=EDGES.find(e=>e.a===n.id);assert.ok(edge.points.some(p=>Math.abs(p[0]-o.x)<1e-6&&Math.abs(p[1]-(elevation(n.floor)+o.y))<1e-6&&Math.abs(p[2]-o.z)<1e-6),n.id);}
 const registration=terminalOutlet(NETWORK.find(n=>n.id==='pc-registration'));assert.equal(registration.mount,'floor');assert.ok(EDGES.find(e=>e.a==='pc-registration').points.some(p=>p[1]<0));
});
test('Day, dusk and night have bounded light pools, floor filtering, and an explicit UPS fallback',()=>{
 assert.equal(Object.keys(LIGHTING_PRESETS).length,3);const points=[{floor:0,x:0,y:3,z:0},{floor:1,x:0,y:2,z:0},{floor:2,x:0,y:6,z:0}];const selection=lightSelection(points,new T.Vector3(0,4,0),2,2,true);assert.ok(selection.length<=2);assert.ok(selection.every(p=>p.floor!==1));
 for(const p of Object.values(LIGHTING_PRESETS)){assert.equal(lightPower({mains:false,ups:false},p),0);assert.equal(lightPower({mains:false,ups:true},p),5);assert.equal(lightPower({mains:false,ups:true},p,true),0);assert.ok(p.exposure>0&&p.exposure<2);}assert.ok(LIGHTING_PRESETS.day.sunIntensity>LIGHTING_PRESETS.night.sunIntensity);
});
test('Soft contact grounding uses finite instanced geometry and does not add navigation obstacles',()=>{
 const mesh=createContactShadows([[0,0,1,2],[-2,-2,0,0]]);assert.equal(mesh.count,2);assert.equal(mesh.material.depthWrite,false);assert.ok(mesh.instanceMatrix.array.every(Number.isFinite));
});
