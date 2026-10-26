import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {auditRoomAccess} from '../tools/audit-room-access.mjs';
import {FURNITURE,placementObstacles} from '../src/layout.js';
import {FLOOR_OFFSETS} from '../src/data.js';
import {createDoor,animateDoor} from '../src/architecture.js';
import {buildEnvironment} from '../src/environment.js';
import {rectOverlaps} from '../src/door-access.js';
const report=await auditRoomAccess({includeGeometry:true});

test('All 62 door/portal approaches and moving leaf envelopes are free of furnishings and body-height fixtures',()=>{
 assert.equal(report.floors.flatMap(f=>f.doors).length,62);
 assert.deepEqual(report.issues,[]);
 for(const f of report.floors)assert.deepEqual(f.skipped,[]);
});
test('Every door can be crossed in both directions using the real movement and automatic-door logic',()=>{
 for(const d of report.floors.flatMap(f=>f.doors)){assert.equal(d.blockedSamples,0,d.id);assert.equal(d.forward,true,d.id);assert.equal(d.reverse,true,d.id);}
});
test('Room entrances and all floor equipment have walkable routes to their own circulation component',()=>{
 let entries=0,equipment=0;
 for(const r of report.floors.flatMap(f=>f.rooms)){
  if(r.structuralStair)continue;
  assert.ok(r.hubs?.length,r.id);
  for(const p of r.routes){entries++;assert.ok(p.path,r.id+' '+p.door);assert.equal(p.forward,true);assert.equal(p.reverse,true);}
  for(const p of r.equipment){equipment++;assert.ok(p.path,r.id+' '+p.id);assert.equal(p.forward,true);assert.equal(p.reverse,true);}
 }
 assert.ok(entries>=60);assert.ok(equipment>=150);
 for(const id of ['toilets-1','toilets-2'])assert.equal(report.floors.flatMap(f=>f.rooms).find(r=>r.id===id).hubs.length,2,'Separate restroom aisles keep separate entries');
});
test('Actual Three.js door meshes remain clear throughout opening, including the handles',async()=>{
 for(const f of report.floors){
  const [dx,dz]=FLOOR_OFFSETS[f.floor],walls=JSON.parse(await readFile(new URL(`../assets/collision-${f.floor}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx))),e=buildEnvironment(f.floor,walls);
  const objects=f.items.filter(p=>!['stairs','stair-landing'].includes(p.kind)).concat(f.overhead);
  for(const source of e.doors.filter(d=>!d.definition.portal)){
   const door=createDoor(source.definition);door.manual=true;
   for(let frame=0;frame<72;frame++){
    if(frame)animateDoor(door,1/60,[door.definition.x,door.definition.z]);door.group.updateMatrixWorld(true);
    for(const leaf of door.leaves){const b=new T.Box3().setFromObject(leaf.hinge,true),bounds=[b.min.x,b.min.z,b.max.x,b.max.z];
     for(const p of objects)assert.ok(!rectOverlaps(bounds,p.bounds,-.005),`${door.definition.id} hits ${p.id||p.room+' '+p.kind}, frame ${frame}`);
    }
   }
  }
 }
});
test('Stair collision follows flights and handrails and permits access from the corridor',()=>{
 for(const id of ['stairs-1','stairs-2']){
  const p=FURNITURE.find(p=>p.room===id);assert.equal(p.rotation,Math.PI);
  assert.ok(placementObstacles(p).length>1);
  const door=report.floors.flatMap(f=>f.doors).find(d=>d.rooms.includes(id));assert.equal(door.forward,true);assert.equal(door.reverse,true);
 }
});
