import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {HospitalWorld} from '../src/world.js';
import {PresentationDirector} from '../src/presentation.js';
import {GameState} from '../src/engine.js';
import {FLOORS,FLOOR_HEIGHT,ROOMS} from '../src/data.js';
import {WALL_HEIGHT} from '../src/architecture.js';
import {buildBuildingEnvelope,buildFloorSlab,FLOOR_FOOTPRINTS,ROOF_RECTS,STAIR_OPENING,fittedView,viewBounds} from '../src/building-envelope.js';

function dom(run){
  const oldDoc=globalThis.document,oldMedia=globalThis.matchMedia,buttons=new Map();
  const el=()=>({textContent:'',attributes:{},style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;}});
  globalThis.document={body:el(),querySelector(q){if(!buttons.has(q))buttons.set(q,el());return buttons.get(q);}};globalThis.matchMedia=()=>({matches:false});
  try{return run(buttons);}finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;if(oldMedia===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=oldMedia;}
}
function world(){
  const w=Object.create(HospitalWorld.prototype);Object.assign(w,{floor:1,mode:'orbit',shellFull:false,ceilingOverride:null,labelsVisible:true,lightingPreset:'day',state:new GameState(),floors:new Map([1,2].map(f=>[f,{root:new T.Group(),collisions:[],architectureMaterials:[new T.MeshStandardMaterial()],environment:{shellMaterials:[],ceilings:new T.Group(),fixtures:new T.Group(),roof:new T.Group()}}])),obstacles:{1:[],2:[]},camera:new T.PerspectiveCamera(43,1.6,.05,200),controls:{target:new T.Vector3(),update(){},enabled:true,maxDistance:95},renderer:{shadowMap:{}},callbacks:{floor(){},toast(){},tour(){}},labelItems:[],selectionRing:new T.Object3D(),player:[...FLOORS[1].spawn],layers:{copper:true,fiber:true,wifi:false,power:false},keys:{},paused:false,reducedMotion:false,width:1000,height:700});
  w.camera.position.set(16,25,29);w.presentation=new PresentationDirector(w);w.clearTrace=()=>{w.traceResult=null;};w.showTrace=result=>{w.traceResult=result;};return w;
}
const open=w=>{for(const f of w.floors.values()){assert.equal(f.environment.roof.visible,false);assert.equal(f.environment.ceilings.visible,false);assert.ok(f.architectureMaterials[0].clippingPlanes?.length);}assert.equal(w.shellFull,false);};

test('Full building includes both floors, closes the shell, and switches back to an unobstructed floor plan',()=>dom(buttons=>{
  const w=world();w.toggleShell();assert.equal(w.floor,'all');assert.equal(w.shellFull,true);assert.equal(w.framing,'building');
  for(const f of w.floors.values()){assert.equal(f.root.visible,true);assert.equal(f.environment.roof.visible,true);assert.equal(f.architectureMaterials[0].clippingPlanes,null);}
  assert.equal(buttons.get('#shell-view').attributes['aria-pressed'],'true');
  for(const floor of [2,1,'all']){w.setFloor(floor);open(w);for(const [f,item]of w.floors)assert.equal(item.root.visible,floor==='all'||floor===f);w.toggleShell();}
  w.toggleShell();open(w);
}));
test('Opening the ceiling opens the roof too, and reset/top view clear stale exterior state',()=>dom(()=>{
  const w=world();w.exteriorView();assert.equal(w.framing,'campus');w.toggleCeiling();assert.equal(w.shellFull,true);for(const f of w.floors.values()){assert.equal(f.environment.roof.visible,false);assert.equal(f.environment.ceilings.visible,false);assert.equal(f.architectureMaterials[0].clippingPlanes,null);}
  w.toggleCeiling();assert.ok([...w.floors.values()].every(f=>f.environment.roof.visible));w.topView();open(w);assert.equal(w.mode,'top');assert.equal(w.exteriorFocused,false);
  w.exteriorView();w.home(false);open(w);assert.equal(w.mode,'orbit');assert.equal(w.ceilingOverride,null);assert.equal(w.exteriorFocused,false);
}));
test('Walking retains the complete physical building on either floor and hides the other floor on exit',()=>dom(()=>{
  const w=world();for(const floor of [1,2]){w.setFloor(floor,false);w.setMode('walk');assert.equal(w.floor,floor);for(const f of w.floors.values()){assert.equal(f.root.visible,true);assert.equal(f.environment.roof.visible,true);}
    w.home(false);for(const [f,item]of w.floors)assert.equal(item.root.visible,f===floor);open(w);
  }
}));
test('Full-building labels stay behind its closed roof and return when opened without changing the label preference',()=>dom(()=>{
  const w=world();w.floor='all';w.shellFull=true;w.width=600;w.height=600;w.camera.position.set(0,3,7);w.camera.lookAt(0,1,0);w.labelItems=[{floor:1,device:false,point:new T.Vector3(0,1,0),el:{style:{}}}];
  w.updateLabels();assert.equal(w.labelItems[0].el.style.display,'none');assert.equal(w.labelsVisible,true);w.ceilingOverride=false;w.updateLabels();assert.equal(w.labelItems[0].el.style.display,'');
}));
test('Presentation restores the full-building shell and camera after real floor/mode transitions',()=>dom(()=>{
  const w=world();w.exteriorView();w.frameView('campus',false);const position=w.camera.position.clone(),target=w.controls.target.clone(),far=w.camera.far,maxDistance=w.controls.maxDistance;
  w.presentation.start();w.presentation.seek(9);assert.equal(w.mode,'tour');assert.ok([...w.floors.values()].every(f=>f.root.visible));w.presentation.stop();
  assert.equal(w.floor,'all');assert.equal(w.shellFull,true);assert.equal(w.ceilingOverride,null);assert.equal(w.exteriorFocused,true);assert.equal(w.framing,'campus');assert.equal(w.camera.far,far);assert.equal(w.controls.maxDistance,maxDistance);assert.deepEqual(w.camera.position,position);assert.deepEqual(w.controls.target,target);assert.ok([...w.floors.values()].every(f=>f.root.visible&&f.environment.roof.visible));
}));
test('Camera framing contains the whole building/campus in portrait and landscape, including after resizing',()=>dom(()=>{
  for(const aspect of [.3,.5,.75,1,1.7,3])for(const kind of ['building','campus','floor','top']){
    const w=world();w.camera.aspect=aspect;w.floor='all';w.frameView(kind,false);const b=viewBounds('all',kind==='campus');w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).project(w.camera);assert.ok(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1&&p.z>-1,`${kind} aspect ${aspect}: ${p.toArray()}`);}
    assert.ok(w.controls.maxDistance>w.camera.position.distanceTo(w.controls.target));
  }
  const w=world();w.toggleShell();document.querySelector('#world').getBoundingClientRect=()=>({width:320,height:760});w.renderer.setSize=()=>{};w.setQuality=()=>{};w.onResize();assert.equal(w.flight,null);assert.equal(w.framing,'building');assert.equal(w.camera.aspect,320/760);assert.ok(w.camera.position.toArray().every(Number.isFinite));
}));
test('Distant portrait framing stays within fog and camera clipping ranges, then walking resets the fog',()=>dom(()=>{
  const w=world();w.scene=new T.Scene();w.scene.fog=new T.Fog(0xedf0e9,52,125);w.camera.aspect=.3;w.floor='all';w.frameView('campus',false);const distance=w.camera.position.distanceTo(w.controls.target);
  assert.ok(distance>250);assert.ok(w.scene.fog.near>200);assert.ok(w.scene.fog.far>distance+60);assert.ok(w.camera.far>w.controls.maxDistance+60);
  w.setMode('walk');w.updateViewDistance();assert.equal(w.scene.fog.near,52);assert.equal(w.scene.fog.far,125);
}));
test('Fascia seals the wall-to-deck gap along all exterior edges on both floors',()=>{
  for(const floor of [1,2]){const {fascia}=buildBuildingEnvelope(floor);fascia.updateMatrixWorld(true);
    for(const [x,z,a,b]of FLOOR_FOOTPRINTS[floor])for(const y of [WALL_HEIGHT+.015,3.07,3.2,3.31])for(const t of [.1,.35,.6,.9]){
      const rays=[[[x-.3,y,z+(b-z)*t],[1,0,0]],[[a+.3,y,z+(b-z)*t],[-1,0,0]],[[x+(a-x)*t,y,z-.3],[0,0,1]],[[x+(a-x)*t,y,b+.3],[0,0,-1]]];
      for(const [origin,direction]of rays)assert.ok(new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,.5).intersectObject(fascia,true).length,`L${floor} ${origin}`);
    }
  }
});
test('L1 exposed roofs do not overlap the L2 structural slab, whose stair opening remains clear',()=>{
  const [x,z,a,b]=FLOORS[2].bounds;for(const [rx,rz,ra,rb]of ROOF_RECTS[1])assert.ok(Math.min(a,ra)-Math.max(x,rx)<=.001||Math.min(b,rb)-Math.max(z,rz)<=.001);
  const slab=buildFloorSlab(2);slab.updateMatrixWorld(true);const stair=ROOMS.find(r=>r.id==='stairs-2'),ray=(px,pz)=>new T.Raycaster(new T.Vector3(px,1,pz),new T.Vector3(0,-1,0),0,2).intersectObject(slab,true);
  assert.equal(ray(...stair.center).length,0);assert.ok(ray(STAIR_OPENING[0]-.2,stair.center[1]).length);assert.ok(ray((x+a)/2,(z+b)/2).length);
});
