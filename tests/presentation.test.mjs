import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {TOUR_STEPS,TourClock} from '../src/tour.js';
import {TOUR_PATHS} from '../src/tour-paths.js';
import {PresentationDirector,tourPose} from '../src/presentation.js';
import {HospitalWorld} from '../src/world.js';
import {GameState,EDGES,canStand} from '../src/engine.js';
import {DEVICE_MAP,FLOORS,FLOOR_OFFSETS} from '../src/data.js';
import {buildEnvironment} from '../src/environment.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementObstacles} from '../src/layout.js';
import {prepareWallSegments} from '../src/circulation.js';
import {TourNarrator} from '../src/narration.js';
const data={};for(const floor of [1,2]){const [dx,dz]=FLOOR_OFFSETS[floor],walls=prepareWallSegments(floor,JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx)))),env=buildEnvironment(floor,walls);data[floor]={walls,env,obstacles:[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===floor).flatMap(placementObstacles).concat(env.obstacles)};}
test('Fourteen presentation chapters reference real rooms, devices and network links',()=>{
 assert.equal(TOUR_STEPS.length,15);assert.equal(new Set(TOUR_STEPS.map(s=>s.id)).size,15);
 for(const step of TOUR_STEPS){assert.ok(step.text.length>50);assert.ok(step.details.length>=3);if(step.device)assert.ok(DEVICE_MAP.has(step.device),step.device);for(const id of step.edges||[])assert.ok(EDGES.some(e=>e.id===id),id);if(step.view==='room')assert.ok(TOUR_PATHS[step.id]?.length>=2,step.id);}
});
test('Presentation clock supports pause, chapter selection, completion and replay without timer jumps',()=>{
 const clock=new TourClock([{duration:.2},{duration:.2}]);clock.start();clock.tick(.1);assert.equal(clock.progress,.5);clock.toggle();clock.tick(.1);assert.equal(clock.progress,.5);clock.toggle();assert.equal(clock.tick(.1),true);assert.equal(clock.index,1);clock.tick(500);assert.equal(clock.progress,.5);clock.tick(.1);assert.equal(clock.completed,true);assert.equal(clock.playing,false);clock.toggle();assert.equal(clock.index,0);assert.equal(clock.playing,true);clock.seek(-5);assert.equal(clock.index,0);clock.seek(999);assert.equal(clock.index,1);clock.stop();assert.equal(clock.active,false);
});
test('Every sampled room-tour camera position stays on the tested walkable route',()=>{
 for(const step of TOUR_STEPS)for(let i=0;i<=200;i++){
  const pose=tourPose(step,i/200,.6);assert.ok([...pose.eye,...pose.look].every(Number.isFinite),step.id);assert.ok(pose.fov>=40&&pose.fov<=65);
  if(step.view==='room'){const d=data[step.floor];assert.ok(canStand(pose.eye[0],pose.eye[2],FLOORS[step.floor].bounds,d.walls,.18,d.obstacles),`${step.id} at ${i}: ${pose.eye}`);assert.equal(pose.eye[1],(step.floor-1)*3.4+1.62);}
 }
});
function classes(){const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),toggle:(v,on)=>{if(on)values.add(v);else values.delete(v);},contains:v=>values.has(v)};}
function mockWorld(){
 const camera=new T.PerspectiveCamera(43,1.5,.05,200);camera.position.set(-3,9,14);const state=new GameState();state.mains=false;state.ups=false;state.broken.add('link-pc-igd');
 const w={state,floor:2,mode:'orbit',layers:{copper:true,fiber:false,wifi:true,power:false},shellFull:false,ceilingOverride:null,labelsVisible:true,paused:true,player:[10.8,-3.4],yaw:.3,pitch:.1,camera,controls:{target:new T.Vector3(1,3,0),update(){},enabled:true,maxDistance:95},selectionRing:new T.Object3D(),keys:{},selected:null,reducedMotion:false,width:1000,height:700,callbacks:{tour(){}},floors:new Map([[1,{collisions:[]}],[2,{collisions:[]}]]),obstacles:{1:[],2:[]},updateLabels(){},updateState(){},syncEnvelope(){},setFloor(f){this.floor=f;},setMode(m){this.mode=m;this.camera.fov=m==='walk'?58:43;},showTrace(result){this.traceResult=result;},clearTrace(){this.traceResult=null;},updateWalkCamera(){this.camera.position.set(this.player[0],(this.floor-1)*3.4+1.62,this.player[1]);}};
 w.setLabels=HospitalWorld.prototype.setLabels;w.presentation=new PresentationDirector(w);return w;
}
test('Tour demos isolate fault, VLAN and UPS scenarios and restore the exact prior learning state',()=>{
 const oldDoc=globalThis.document,oldStorage=globalThis.localStorage;globalThis.document={body:{classList:classes()},querySelector(){return null;}};globalThis.localStorage={setItem(){}};
 try{const w=mockWorld(),original=w.state,serialized=JSON.stringify(original.serialize()),camera=w.camera.position.clone(),layers={...w.layers};w.presentation.start();assert.notEqual(w.state,original);assert.equal(w.labelsVisible,false);assert.equal(document.body.classList.contains('presenting'),true);
  w.presentation.seek(TOUR_STEPS.findIndex(s=>s.id==='icu'));w.presentation.demo();assert.ok(w.state.broken.has('link-pc-icu'));assert.ok(original.broken.has('link-pc-igd'));assert.equal(original.ups,false);w.presentation.demo();assert.equal(w.traceResult.ok,true);
  w.presentation.seek(TOUR_STEPS.findIndex(s=>s.id==='power'));w.presentation.demo();assert.equal(w.state.mains,false);assert.equal(w.state.ups,true);
  w.presentation.seek(TOUR_STEPS.findIndex(s=>s.id==='wifi'));w.presentation.demo();assert.match(w.presentation.demoMessage,/ditolak/);
  w.presentation.stop();assert.equal(w.state,original);assert.equal(JSON.stringify(original.serialize()),serialized);assert.deepEqual(w.layers,layers);assert.equal(w.floor,2);assert.equal(w.mode,'orbit');assert.equal(w.labelsVisible,true);assert.equal(w.camera.fov,43);assert.deepEqual(w.camera.position.toArray(),camera.toArray());assert.equal(document.body.classList.contains('presenting'),false);
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});
test('Manual label changes survive presentation exit and a room tour can hand off to walking',()=>{
 const oldDoc=globalThis.document;globalThis.document={body:{classList:classes()},querySelector(){return null;}};
 try{const w=mockWorld();w.presentation.start(TOUR_STEPS.findIndex(s=>s.id==='ward'));w.setLabels(true);w.presentation.stop({continueHere:true});assert.equal(w.floor,2);assert.equal(w.mode,'walk');assert.equal(w.labelsVisible,true);assert.ok(canStand(...w.player,FLOORS[2].bounds,[],.18,[]));
  w.reducedMotion=true;w.presentation.start();assert.equal(w.presentation.clock.playing,false);w.presentation.stop();
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;}
});
test('Hiding the panel recenters the mobile camera, persists across chapters, and preserves manual layer/plafond choices',()=>{
 const oldDoc=globalThis.document;globalThis.document={body:{classList:classes()},querySelector(){return null;}};
 try{const w=mockWorld(),p=w.presentation,saved={...w.layers};w.width=400;p.start(1);assert.equal(w.camera.view.enabled,true);p.setPanelHidden(true);assert.equal(w.camera.view.enabled,false);p.setLayer('power',true);p.setLayer('fiber',true);p.toggleInstallation();assert.equal(w.ceilingOverride,false);p.next();assert.equal(p.panelHidden,true);assert.equal(w.camera.view.enabled,false);assert.equal(w.layers.power,true);assert.equal(w.layers.fiber,true);assert.equal(w.ceilingOverride,false);p.setPanelHidden(false);assert.equal(w.camera.view.enabled,true);p.stop();assert.equal(p.panelHidden,false);assert.deepEqual(w.layers,saved);
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;}
});
test('Automatic chapters wait for narration to finish, pause with it and cancel audio when the tour exits',()=>{
 const oldDoc=globalThis.document;globalThis.document={body:{classList:classes()},querySelector(){return null;}};
 try{const w=mockWorld(),p=w.presentation,synth={paused:false,queue:[],getVoices(){return [];},speak(u){this.queue.push(u);},cancel(){this.queue=[];},pause(){this.paused=true;},resume(){this.paused=false;}};class Utterance{constructor(text){this.text=text;}}
  p.narrator=new TourNarrator({synth,Utterance});p.start(1);p.narrator.setEnabled(true);p.clock.elapsed=p.clock.step.duration-.05;for(let i=0;i<30;i++)p.update(.05);assert.equal(p.clock.index,1);assert.ok(p.clock.elapsed<p.clock.step.duration);p.toggle();assert.equal(synth.paused,true);const elapsed=p.clock.elapsed;p.update(.05);assert.equal(p.clock.elapsed,elapsed);p.toggle();assert.equal(synth.paused,false);for(let i=0;p.narrator.busy&&i<100;i++){if(p.narrator.utterance)p.narrator.utterance.onend();p.narrator.update(1);}p.update(.05);assert.equal(p.clock.index,2);assert.ok(p.narrator.busy);p.stop();assert.equal(p.narrator.busy,false);assert.equal(synth.queue.length,0);
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;}
});
test('Switching narration language updates the whole chapter and demos while preserving camera, timeline and hidden-panel state',()=>{
 const oldDoc=globalThis.document;globalThis.document={body:{classList:classes()},querySelector(){return null;}};
 try{const w=mockWorld(),p=w.presentation,original=JSON.stringify(w.state.serialize());p.start(TOUR_STEPS.findIndex(s=>s.id==='wifi'));p.clock.elapsed=5;p.setPanelHidden(true);const camera=w.camera.position.clone(),floor=w.floor;p.narrator.configure({language:'en',style:'presenter'});let status=p.status();assert.equal(status.step.title,'Wi-Fi and the guest boundary');assert.match(status.step.phase,/policy/);assert.ok(status.step.details[0].startsWith('Observe'));assert.equal(status.panelHidden,true);assert.equal(p.clock.elapsed,5);assert.equal(w.floor,floor);assert.deepEqual(w.camera.position,camera);p.demo();assert.match(p.status().demoMessage,/Guest VLAN policy/);p.narrator.configure({language:'id'});assert.match(p.status().step.title,/batas akses tamu/);p.stop();assert.equal(JSON.stringify(w.state.serialize()),original);
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;}
});
