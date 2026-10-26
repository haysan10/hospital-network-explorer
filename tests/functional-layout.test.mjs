import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {ROOMS,NETWORK,DEVICE_MAP} from '../src/data.js';
import {EDGES} from '../src/engine.js';
import {createPowerFeeds} from '../src/installation.js';
import {SERVICE_DOORWAYS} from '../src/service-layout.js';
import {buildServiceArchitecture,planWindows} from '../src/architecture.js';
import {FLOOR_FOOTPRINTS} from '../src/building-envelope.js';
import {ROOM_FINISHES,finishAssetForRoom,floorMaterial} from '../src/materials.js';
import {makeAsset} from '../src/assets.js';
import {auditServiceFlow} from '../tools/audit-service-flow.mjs';

test('Support rooms are physically in the rear wing, with no office PCs in any operating room or wet production room',()=>{
 for(const id of ['kitchen','laundry','ipsrs'])assert.ok(ROOMS.find(r=>r.id===id).bounds[1]>=13.5);
 for(const r of ROOMS.filter(r=>r.type==='operation'||['kitchen','laundry'].includes(r.type)))assert.equal(NETWORK.some(n=>n.room===r.id&&n.kind==='pc'),false);
 assert.equal(DEVICE_MAP.get('sw-l2-west').room,'circulation-west-2');assert.equal(DEVICE_MAP.get('sw-south').room,'medical-storage');
 for(const r of ROOMS)assert.ok(ROOM_FINISHES[r.type],r.id);
});
test('Staff, food delivery and soiled-linen routes traverse real collisions and automatic doors in both directions',async()=>{
 const report=await auditServiceFlow();assert.equal(report.routes.length,8);assert.deepEqual(report.issues,[]);
});
test('Constructed rear-wing walls contain actual door apertures, lintels and window openings',()=>{
 const shell=buildServiceArchitecture();shell.updateMatrixWorld(true);
 const ray=(d,y,offset=0)=>{const h=d.rotation===0,position=new T.Vector3(d.x+(h?offset:-.35),y,d.z+(h?-.35:offset)),direction=new T.Vector3(h?0:1,0,h?1:0);return new T.Raycaster(position,direction,0,.7).intersectObject(shell,true);};
 for(const d of SERVICE_DOORWAYS){for(const off of [-.3,0,.3])assert.equal(ray(d,1.6,off).length,0,d.id);assert.ok(ray(d,2.6).length,d.id+' lintel');}
 for(const w of planWindows(1).filter(w=>w.z>18)){const d={...w,rotation:0};assert.equal(ray(d,w.y).length,0,w.id);assert.ok(ray(d,2.75).length,w.id+' wall head');}
 for(const [i,a]of FLOOR_FOOTPRINTS[1].entries())for(const b of FLOOR_FOOTPRINTS[1].slice(i+1))assert.ok(Math.min(a[2],b[2])<=Math.max(a[0],b[0])+1e-8||Math.min(a[3],b[3])<=Math.max(a[1],b[1])+1e-8,'Coplanar slabs must not overlap');
 shell.traverse(o=>{if(o.isMesh)for(const a of ['position','normal','uv','tangent'])assert.ok(o.geometry.attributes[a].array.every(Number.isFinite));});
});
test('Clinical surfaces exclude exposed wood and operating-room floors remain seamless in the GLSL finish',()=>{
 for(const type of ['operation','clinical','icu','lab','kitchen','laundry']){const o=finishAssetForRoom(makeAsset('cabinet'),{type});o.traverse(m=>{if(m.isMesh)assert.notEqual(m.material.userData.surface,'wood',type);});assert.equal(ROOM_FINISHES[type].ceiling,'polymer');}
 assert.equal(ROOM_FINISHES.operation.floor,'resin');const m=floorMaterial(0xc3d8d5,'resin'),shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};m.onBeforeCompile(shader);assert.match(shader.fragmentShader,/grout\*0.0/);assert.ok(m.normalMap&&m.roughnessMap&&m.aoMap);
});
test('Rear-wing network and panel feeds stay under the covered link instead of spanning the open courtyard',()=>{
 for(const edge of EDGES.filter(e=>e.type!=='wifi'&&!DEVICE_MAP.get(e.a).exterior))for(let i=1;i<edge.points.length;i++){const a=edge.points[i-1],b=edge.points[i];if(a[1]<3.3&&a[2]!==b[2]&&Math.min(a[2],b[2])<11&&Math.max(a[2],b[2])>8)assert.ok(Math.abs(a[0]-6.65)<.5,edge.id);}
 const feeds=createPowerFeeds();assert.equal(feeds.find(f=>f.device.id==='panel-boh').source.id,'panel-1');for(const f of feeds.filter(f=>f.device.z>11&&!f.device.protected&&f.device.id!=='panel-boh'))assert.equal(f.source.id,'panel-boh');
 for(const f of feeds.filter(f=>!f.device.exterior))for(let i=1;i<f.points.length;i++){const a=f.points[i-1],b=f.points[i];if(f.floor===1&&a[2]!==b[2]&&Math.min(a[2],b[2])<11&&Math.max(a[2],b[2])>8)assert.ok(Math.abs(a[0]-6.2)<.02,f.device.id);}
});
