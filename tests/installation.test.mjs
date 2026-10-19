import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {NETWORK,FLOORS,FLOOR_HEIGHT,elevation,devicePoint} from '../src/data.js';
import {EDGES,clipPathToFloor,powered,GameState} from '../src/engine.js';
import {INSTALLATION_LANES,RISER,SERVICE_OPENING,installationHeight,installationTrunk,createPowerFeeds} from '../src/installation.js';
import {buildFloorSlab} from '../src/building-envelope.js';
import {HospitalWorld} from '../src/world.js';
test('LAN, fiber and power trunks occupy separate lanes above each corridor and below the next slab',()=>{
 for(const floor of [1,2])for(const south of [false,true]){
  const lanes=['copper','fiber','power'].map(type=>({type,y:installationHeight(floor,type),z:installationTrunk(floor,type,south)}));
  for(const a of lanes){assert.ok(a.y>elevation(floor)+2.99);assert.ok(a.y+(a.type==='fiber'?.036:.017)<elevation(floor)+3.15);for(const b of lanes.filter(b=>b!==a))assert.ok(Math.hypot(a.y-b.y,a.z-b.z)>.2);}
  const room=FLOORS[floor];assert.ok(lanes.every(a=>a.z>room.bounds[1]&&a.z<room.bounds[3]));
 }
 for(const edge of EDGES.filter(e=>e.type!=='wifi'))assert.ok(edge.points.some(p=>Math.abs(p[1]-installationHeight(edge.floors[0],edge.type))<1e-6),edge.id);
});
test('The fiber riser has a real L2 slab penetration and stays inside both building footprints',()=>{
 const slab=buildFloorSlab(2);slab.position.y=FLOOR_HEIGHT;slab.updateMatrixWorld(true);
 for(const dx of [-.04,0,.04])for(const dz of [-.04,0,.04])assert.equal(new T.Raycaster(new T.Vector3(RISER.x+dx,4,RISER.z+dz),new T.Vector3(0,-1,0),0,1).intersectObject(slab,true).length,0);
 for(const floor of [1,2]){const [x,z,a,b]=FLOORS[floor].bounds;assert.ok(SERVICE_OPENING[0]>x&&SERVICE_OPENING[2]<a&&SERVICE_OPENING[1]>z&&SERVICE_OPENING[3]<b);}
 const edge=EDGES.find(e=>e.id==='link-core-sw-l2');assert.ok(edge.points.some((p,i)=>i&&p[0]===RISER.x&&p[2]===RISER.z&&edge.points[i-1][0]===p[0]&&Math.abs(edge.points[i-1][1]-p[1])>3));assert.ok(clipPathToFloor(edge.points,1).length&&clipPathToFloor(edge.points,2).length);
});
test('Power feeds use the correct panel or UPS, do not wire the battery tablet, and survive source selection under outage',()=>{
 const feeds=createPowerFeeds();assert.equal(feeds.length,NETWORK.filter(n=>n.kind!=='tablet'&&(n.network!==false||n.kind==='ups')).length);assert.ok(!feeds.some(f=>f.device.id==='guest'));
 for(const f of feeds){assert.ok(f.points.flat().every(Number.isFinite));assert.equal(f.source.id,f.device.kind==='ups'?`panel-${f.floor}`:f.device.protected?`ups-${f.floor}`:`panel-${f.floor}`);assert.equal(f.source.floor,f.floor);assert.ok(f.points.some(p=>Math.abs(p[1]-installationHeight(f.floor,'power'))<1e-6));}
 const state={mains:false,ups:true},protectedFeed=feeds.find(f=>f.device.id==='server'),ordinaryFeed=feeds.find(f=>f.device.id==='pc-registration'),upsCharging=feeds.find(f=>f.device.id==='ups-1');assert.ok(powered(protectedFeed.source,state)&&powered(protectedFeed.device,state));assert.equal(powered(ordinaryFeed.source,state),false);assert.equal(powered(upsCharging.source,state),false);
});
test('Wi-Fi is a dashed radio link to an AP whose uplink remains LAN, with finite line-distance data',()=>{
 const wifi=EDGES.find(e=>e.type==='wifi'),ap=NETWORK.find(n=>n.id===wifi.b);assert.equal(ap.kind,'ap');assert.ok(EDGES.some(e=>e.a===ap.id&&e.type==='copper'));assert.deepEqual(wifi.points[0],devicePoint(NETWORK.find(n=>n.id==='guest')));
 const line=HospitalWorld.prototype.wirelessLink(wifi.points);assert.equal(line.isLine,true);assert.equal(line.material.isLineDashedMaterial,true);assert.ok(line.geometry.attributes.lineDistance.array.every(Number.isFinite));assert.ok(line.geometry.attributes.lineDistance.array[1]>0);for(const n of NETWORK.filter(n=>n.kind==='ap'))assert.ok(Math.abs(devicePoint(n)[1]-(elevation(n.floor)+n.y))<.025,'AP uplink connects to the mounted asset');
});
test('Actual network scene builder and all four layer switches isolate the right meshes on each floor',()=>{
 const w=Object.create(HospitalWorld.prototype);Object.assign(w,{scene:new T.Scene(),cables:[],layers:{copper:false,fiber:false,power:false,wifi:false},floor:1,state:new GameState(),floors:new Map(),renderer:{shadowMap:{}},updateInteriorLights(){}});w.buildNetwork();assert.equal(w.cables.length,EDGES.length);assert.equal(w.powerCables.length,61);
 for(const floor of [1,2,'all'])for(const layer of ['copper','fiber','power','wifi']){
  w.floor=floor;for(const k of Object.keys(w.layers))w.layers[k]=k===layer;w.updateState();
  for(const c of w.cables){assert.equal(c.mesh.visible,layer===c.edge.type&&floor==='all');for(const [f,part]of c.parts)assert.equal(part.visible,layer===c.edge.type&&floor===f);}
  for(const p of w.powerCables)assert.equal(p.mesh.visible,layer==='power'&&(floor==='all'||floor===p.floor));assert.equal(w.radio.visible,layer==='wifi');assert.equal(w.powerParticles.visible,layer==='power');
 }
 w.floor=1;w.layers.wifi=true;w.state.broken.add('link-guest');w.updateState();const wifi=w.cables.find(c=>c.edge.type==='wifi');assert.equal(wifi.mesh.material.color.getHex(),0xc96856);wifi.parts.get(1).traverse(o=>{if(o.isLine)assert.equal(o.material.color.getHex(),0xc96856);});
});
