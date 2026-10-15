import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameState,EDGES,traceRoute,powered,pointOnPath,pathLength,canStand,moveWithCollision,safeSpot} from '../src/engine.js';
import {NETWORK,DEVICE_MAP,FLOORS,MISSIONS,QUIZ} from '../src/data.js';

test('Every network endpoint has a valid graph connection and finite cable coordinates',()=>{
  const ids=NETWORK.map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
  assert.equal(new Set(EDGES.map(e=>e.id)).size,EDGES.length);
  for(const e of EDGES){assert.ok(DEVICE_MAP.has(e.a));assert.ok(DEVICE_MAP.has(e.b));assert.ok(e.points.length>1);assert.ok(e.points.flat().every(Number.isFinite));assert.ok(pathLength(e.points)>0);}
  for(const n of NETWORK.filter(n=>n.network!==false&&n.id!=='guest'))assert.equal(traceRoute(n.id,'server',new GameState()).ok,true,n.id);
});
test('IGD reaches server through access and core, in physical order',()=>{
  const r=traceRoute('pc-igd','server',new GameState());assert.equal(r.ok,true);assert.deepEqual(r.nodes,['pc-igd','sw-north','core','server']);assert.ok(r.length>0);
});
test('L2 traverses the fiber backbone and route contains both elevations',()=>{
  const r=traceRoute('pc-icu','server',new GameState());assert.equal(r.ok,true);assert.deepEqual(r.nodes,['pc-icu','sw-l2','core','server']);
  assert.ok(r.edges.some(e=>e.type==='fiber'&&e.floors.length===2));
});
test('Guest has a physical path, but the simulated policy denies internal server access',()=>{
  const s=new GameState();assert.equal(traceRoute('guest','server',s).reason,'policy');assert.equal(traceRoute('guest','server',s,{policy:false}).ok,true);
});
test('Breaking the ICU drop isolates that terminal without breaking its access point or other rooms',()=>{
  const s=new GameState();s.startFault();assert.equal(traceRoute('pc-icu','server',s).reason,'link');assert.equal(traceRoute('ap-icu','server',s).ok,true);assert.equal(traceRoute('pc-ward-a','server',s).ok,true);
  assert.equal(s.repair('pc-icu'),false);s.diagnose('pc-icu');assert.equal(s.repair('pc-icu'),true);assert.equal(traceRoute('pc-icu','server',s).ok,true);
});
test('An upstream failure affects dependent terminals and preserves other access areas',()=>{
  const s=new GameState();s.broken.add('link-core-sw-north');assert.equal(traceRoute('pc-igd','server',s).reason,'link');assert.equal(traceRoute('pc-registration','server',s).ok,true);
});
test('UPS maintains selected circuits only and end-to-end routing requires every intermediate node powered',()=>{
  const s=new GameState();s.outage();assert.equal(powered(DEVICE_MAP.get('server'),s),true);assert.equal(powered(DEVICE_MAP.get('pc-igd'),s),false);
  assert.equal(traceRoute('pc-nurse','server',s).ok,true);assert.equal(traceRoute('pc-registration','server',s).reason,'power');
  s.ups=false;assert.equal(powered(DEVICE_MAP.get('server'),s),false);s.mains=true;assert.equal(traceRoute('pc-igd','server',s).ok,true);
});
test('All six learning activities award exactly 1000 XP once, in mission order',()=>{
  const s=new GameState();s.inspect('core');s.inspect('core');assert.equal(s.xp,100);s.trace('pc-igd');s.startFault();s.diagnose('pc-icu');s.repair('pc-icu');s.trace('guest');s.outage();
  QUIZ.forEach((q,i)=>assert.equal(s.answer(i,q.answer),true));assert.deepEqual(s.completed,MISSIONS.map(m=>m.id));assert.equal(s.xp,1000);
  s.record('power');s.inspect('server');assert.equal(s.xp,1000);assert.equal(s.answer(0,QUIZ[0].answer),false);
});
test('Wrong quiz answers do not complete evaluation and progress survives serialization',()=>{
  const s=new GameState();assert.equal(s.answer(0,2),false);assert.equal(s.quiz.length,0);s.inspect('core');s.trace('pc-igd');
  s.answer(0,QUIZ[0].answer);const restored=new GameState(JSON.parse(JSON.stringify(s.serialize())));assert.deepEqual(restored.completed,s.completed);assert.equal(restored.quiz.length,1);assert.equal(restored.mains,true);assert.equal(restored.broken.size,0);
});
test('Data packet interpolation is bounded and distance follows the polyline',()=>{
  const points=[[0,0,0],[3,0,0],[3,0,4]];assert.equal(pathLength(points),7);assert.deepEqual(pointOnPath(points,0),points[0]);assert.deepEqual(pointOnPath(points,1),points[2]);assert.deepEqual(pointOnPath(points,3/7),points[1]);
});
test('Walk collision prevents tunneling through a thin wall and supports sliding',()=>{
  const bounds=[-10,-10,10,10],wall=[[0,-10,0,10]];
  assert.equal(canStand(0,0,bounds,wall),false);const p=moveWithCollision([-2,0],5,2,bounds,wall);assert.ok(p[0]<-.17);assert.ok(p[1]>1.9);
  assert.equal(canStand(10,0,bounds,wall),false);assert.ok(safeSpot([0,0],bounds,wall));
});
test('Both floorplan spawn locations and safe inspection points are navigable',async()=>{
  for(const floor of [1,2]){
    const walls=JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url),'utf8')),f=FLOORS[floor];
    assert.ok(walls.length>100);assert.equal(canStand(...f.spawn,f.bounds,walls),true,`spawn floor ${floor}`);
    for(const n of NETWORK.filter(n=>n.floor===floor))assert.ok(safeSpot([n.x,n.z+1.1],f.bounds,walls),n.id);
  }
});
