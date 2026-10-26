import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {ROOMS,NETWORK,roomById} from '../src/data.js';
import {PHARMACY_LINK,prepareWallSegments} from '../src/circulation.js';
import {findDoors,buildServiceArchitecture} from '../src/architecture.js';
import {SERVICE_DOORWAYS} from '../src/service-layout.js';
import {FURNITURE} from '../src/layout.js';
import {deviceLead,EDGES,GameState,traceRoute} from '../src/engine.js';
import {powerLead} from '../src/installation.js';
import * as T from '../vendor/three.module.js';
const count=(id,kind)=>NETWORK.filter(n=>n.room===id&&(!kind||n.kind===kind)).length;
test('Revised clinical program occupies the original six bays and gives each new poli a workstation and AP',()=>{
 const bounds={lab:[-3.35,-7.64,.76,-3.75],'pharmacy-depot':[.87,-7.64,4.86,-3.75],'pharmacy-store':[4.97,-7.64,8.86,-3.75],'poli-general':[-9.13,3.55,-4.47,7.75],'poli-ent':[-4.36,3.55,.85,7.75],'poli-dental':[.97,3.55,5.34,7.75]};
 for(const [id,b]of Object.entries(bounds))assert.deepEqual(roomById(id).bounds,b,id);
 for(const id of ['poli-general','poli-ent','poli-dental']){assert.equal(count(id,'pc'),1);assert.equal(count(id,'ap'),1);}
 assert.ok(FURNITURE.some(p=>p.room==='lab'&&p.kind==='worktop'));assert.ok(FURNITURE.some(p=>p.room==='poli-ent'&&p.kind==='ent-chair'));assert.ok(FURNITURE.some(p=>p.room==='poli-dental'&&p.kind==='dental-chair'));
 for(const id of ['poly','staff-lounge','storage','service-office'])assert.equal(roomById(id),undefined);
});
test('Pharmacy connection cuts the shared source wall and creates one internal operable door',async()=>{
 const source=JSON.parse(await readFile(new URL('../assets/collision-1.json',import.meta.url))),walls=prepareWallSegments(1,source),doors=findDoors(1,source),d=doors.find(d=>d.id===PHARMACY_LINK.id);
 assert.deepEqual(d.rooms,['pharmacy-depot','pharmacy-store']);assert.equal(d.portal,false);assert.equal(doors.filter(d=>d.id===PHARMACY_LINK.id).length,1);
 assert.ok(!walls.some(s=>Math.abs(s[0]-d.x)<.15&&Math.abs(s[2]-d.x)<.15&&Math.min(s[1],s[3])<d.z&&Math.max(s[1],s[3])>d.z));
});
test('Rear service bays are separate, with a kitchen beside laundry, dry linen storage and explicit receiving doors',()=>{
 assert.equal(count('ipsrs'),0);assert.equal(count('calibration','pc'),0);assert.equal(count('calibration','ap'),1);
 assert.equal(roomById('ipsrs').bounds[2],-5.62);assert.equal(roomById('calibration').bounds[0],-5.51);
 assert.ok(Math.abs(roomById('kitchen').bounds[2]-roomById('laundry').bounds[0])<.12);assert.equal(roomById('medical-storage').type,'storage');assert.equal(roomById('linen-clean').bounds[0],9.02);
 const shell=buildServiceArchitecture();shell.updateMatrixWorld(true);const hits=new T.Raycaster(new T.Vector3(-6,1.4,16.9),new T.Vector3(1,0,0),0,1).intersectObject(shell,true);assert.ok(hits.length,'Real partition between maintenance and calibration');
 for(const id of ['door-kitchen-delivery','door-laundry-dirty'])assert.equal(SERVICE_DOORWAYS.find(d=>d.id===id).side,'S');
});
test('Only the large operating room keeps one AP; no operating room contains an office computer',()=>{
 for(const r of ROOMS.filter(r=>r.type==='operation')){assert.equal(count(r.id,'pc'),0);assert.equal(count(r.id,'ap'),r.id==='operation'?1:0);}
});
test('Outdoor guest Wi-Fi has separated buried LAN and power drops and an isolated guest client',()=>{
 const ap=NETWORK.find(n=>n.id==='ap-outdoor'),guest=NETWORK.find(n=>n.id==='guest-outdoor');assert.equal(ap.asset,'outdoor-ap');assert.equal(ap.guestVlan,30);assert.equal(guest.sw,ap.id);assert.equal(guest.vlan,30);assert.ok(!ROOMS.some(r=>r.id===ap.room),'Exterior AP does not create an indoor ceiling or light atlas region');
 const lan=deviceLead(ap),power=powerLead(ap);assert.ok(lan.some(p=>p[1]<0));assert.ok(power.some(p=>p[1]<0));assert.notEqual(lan[3][0],power[3][0]);assert.notEqual(lan[3][1],power[3][1]);assert.ok(EDGES.some(e=>e.a===ap.id&&e.type==='copper'));
 const state=new GameState();assert.equal(traceRoute(guest.id,'server',state).reason,'policy');assert.ok(traceRoute(guest.id,'server',state,{policy:false}).ok);state.broken.add('link-ap-outdoor');assert.equal(traceRoute(guest.id,'server',state,{policy:false}).reason,'link');
});
test('Both SVG plans contain the live room and device inventory, including the revised pharmacy and OK program',async()=>{
 for(const f of [1,2]){const svg=await readFile(new URL(`../assets/denah-lantai-${f}.svg`,import.meta.url),'utf8');for(const r of ROOMS.filter(r=>r.floor===f))assert.ok(svg.includes(`data-room="${r.id}"`),r.id);for(const n of NETWORK.filter(n=>n.floor===f))assert.ok(svg.includes(`data-device="${n.id}"`),n.id);assert.ok(svg.includes('data-version="4.5.0"'));for(const id of ['ap-ok-1','ap-ok-2','ap-ok-3','pc-ipsrs','pc-calibration'])assert.ok(!svg.includes(`data-device="${id}"`));}
});
