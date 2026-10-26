import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {bindTouchStick} from '../src/input.js';import {PresentationDirector} from '../src/presentation.js';
import {init} from '../src/app.js';import {HospitalWorld} from '../src/world.js';import {FLOORS,elevation} from '../src/data.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function fixture({compact=false,touch=false,returning=true}={}){
 const doc=new EventTarget(),win=new EventTarget(),ids=new Map(),all=[];
 class Element extends EventTarget{
  constructor(tag='BUTTON',attributes={}){super();this.tagName=tag.toUpperCase();this.attributes={...attributes};this.id=attributes.id;this.dataset={};for(const[k,v]of Object.entries(attributes))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;this.value=attributes.id?.includes('quality')?'normal':attributes.value||'';this.hidden='hidden'in attributes;this.disabled='disabled'in attributes;this.style={setProperty(k,v){this[k]=v;}};this.isConnected=true;this.open=false;const classes=new Set((attributes.class||'').split(/\s+/));this.classList={add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},contains:k=>classes.has(k),toggle(k,on){on=on??!classes.has(k);on?classes.add(k):classes.delete(k);return on;}};}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}removeAttribute(k){delete this.attributes[k];if(k==='data-scene-popover')delete this.dataset.scenePopover;}
  focus(){doc.activeElement=this;}close(){this.open=false;}showModal(){this.open=true;}
  getBoundingClientRect(){return {width:compact?390:1000,height:compact?400:700,left:0,top:0};}getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()];}querySelectorAll(){return [];}setPointerCapture(){}releasePointerCapture(){}
 }
 for(const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
  const attrs={};for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';
  const el=new Element(m[1],attrs);all.push(el);if(el.id)ids.set(el.id,el);
 }
 doc.body=new Element('body');doc.documentElement=new Element('html');doc.activeElement=ids.get('orbit');doc.hidden=false;
 doc.querySelectorAll=q=>q.split(',').flatMap(selector=>{
  selector=selector.trim();if(selector==='#view-tools button')return ['orbit','walk','third-view','drone-view','exterior-view','interior-view','top-view','ceiling-view','shell-view','label-view','home-view'].map(k=>ids.get(k));
  const data=selector.match(/^\[([\w-]+)(?:="([^"]+)")?\]$/);if(data)return all.filter(e=>data[1]in e.attributes&&(data[2]===undefined||e.attributes[data[1]]===data[2]));return [];
 });
 doc.querySelector=q=>q[0]==='#'?ids.get(q.slice(1)):q==='dialog[open]'?all.find(e=>e.tagName==='DIALOG'&&e.open)||null:null;
 win.matchMedia=q=>Object.assign(new EventTarget(),{matches:q.includes('pointer')&&!q.includes('max-width')?touch:compact});win.navigator={maxTouchPoints:touch?2:0};win.innerHeight=compact?844:900;win.requestAnimationFrame=fn=>fn();
 const storage=new Map(returning?[['medilink-explorer-v1',JSON.stringify({visited:['server']})]]:[]);
 const globals={document:doc,window:win,matchMedia:win.matchMedia,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:()=>0,setTimeout:()=>0,clearTimeout:()=>{}};
 const original=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
 class World extends HospitalWorld{
  constructor(callbacks,state){
   // Constructor omits WebGL; scene transitions below use the inherited implementation.
   const w=Object.create(new.target.prototype);Object.assign(w,{callbacks,state,floor:1,mode:'orbit',shellFull:false,ceilingOverride:null,player:[...FLOORS[1].spawn],keys:{},touchMove:{},labelItems:[],obstacles:{1:[],2:[]},labelsVisible:true,lightingPreset:'day',layers:{copper:true,fiber:true,wifi:false,power:false},camera:new T.PerspectiveCamera(43,compact?.6:1.6,.05,200),controls:{target:new T.Vector3(),enabled:true,update(){},maxDistance:95},renderer:{shadowMap:{}},selectionRing:new T.Object3D(),scene:new T.Scene(),doorItems:[],floors:new Map([1,2].map(f=>[f,{root:new T.Group(),collisions:[],architectureMaterials:[new T.MeshStandardMaterial()],environment:{shellMaterials:[],ceilings:new T.Group(),fixtures:new T.Group(),roof:new T.Group()}}])),paused:false,width:compact?390:1000,height:700,reducedMotion:false});
   w.presentation={active:false,stop(){this.active=false;w.stoppedTour=true;}};w.touchCapable=()=>touch;w.updateLabels=()=>{};w.updateState=()=>{};w.load=async()=>{};w.home(false);World.last=w;return w;
  }
 }
 return {doc,win,ids,World,click(id){ids.get(id).dispatchEvent(new Event('click'));},select(value){ids.get('camera-mode').value=value;ids.get('camera-mode').focus();ids.get('camera-mode').dispatchEvent(new Event('change'));},restore(){for(const[k,v]of original)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}};
}
test('Actual app initialization wires full-building and ceiling buttons to visible scene state',async()=>{
 const f=fixture();try{await init({World:f.World});const w=f.World.last;f.click('shell-view');assert.equal(w.floor,'all');assert.equal(w.shellFull,true);assert.equal(w.framing,'building');for(const item of w.floors.values()){assert.ok(item.root.visible&&item.environment.roof.visible&&item.environment.ceilings.visible);assert.equal(item.architectureMaterials[0].clippingPlanes,null);}
  f.click('ceiling-view');for(const item of w.floors.values())assert.equal(item.environment.roof.visible||item.environment.ceilings.visible,false);assert.equal(f.ids.get('ceiling-view').textContent,'Tutup plafon');
  f.click('ceiling-view');for(const item of w.floors.values())assert.ok(item.environment.roof.visible&&item.environment.ceilings.visible);assert.equal(f.ids.get('ceiling-view').textContent,'Buka plafon');
  f.click('shell-view');assert.equal(w.shellFull,false);for(const item of w.floors.values())assert.equal(item.environment.roof.visible,false);
 }finally{f.restore();}
});
test('Visible camera selector enters first-person mode, focuses the canvas and preserves walking between floors',async()=>{
 const f=fixture();try{await init({World:f.World});const w=f.World.last;f.select('walk');assert.equal(w.mode,'walk');assert.equal(w.controls.enabled,false);assert.equal(w.camera.fov,58);assert.equal(f.doc.activeElement,f.ids.get('scene'));assert.equal(w.camera.position.y,1.62);
  f.doc.querySelectorAll('[data-floor]').find(e=>e.dataset.floor==='2').dispatchEvent(new Event('click'));assert.equal(w.mode,'walk');assert.equal(w.floor,2);assert.equal(w.camera.position.y,elevation(2)+1.62);assert.equal(f.ids.get('camera-mode').value,'walk');
  f.doc.querySelectorAll('[data-floor]').find(e=>e.dataset.floor==='1').dispatchEvent(new Event('click'));assert.equal(w.mode,'walk');assert.equal(w.camera.position.y,1.62);
  f.select('top');assert.equal(w.mode,'top');assert.equal(w.framing,'top');assert.equal(w.controls.enableRotate,false);f.click('orbit');assert.equal(w.mode,'orbit');assert.equal(f.ids.get('camera-mode').value,'orbit');assert.equal(w.controls.enabled,true);
 }finally{f.restore();}
});
test('Touch camera selection closes obstructing panels, exposes the joystick and retains floor-two walking',async()=>{
 const f=fixture({compact:true,touch:true});try{await init({World:f.World});f.click('nav-missions');assert.ok(f.doc.body.classList.contains('mobile-panel-open'));f.select('walk');const w=f.World.last;assert.equal(f.doc.body.classList.contains('mobile-panel-open'),false);assert.equal(f.ids.get('panel').inert,true);assert.ok(f.doc.body.classList.contains('walking'));assert.equal(f.ids.get('touch-pad').classList.contains('hidden'),false);assert.equal(f.doc.body.dataset.scenePopover,undefined);
  f.doc.querySelectorAll('[data-floor]').find(e=>e.dataset.floor==='2').dispatchEvent(new Event('click'));assert.equal(w.mode,'walk');assert.equal(f.ids.get('touch-pad').classList.contains('hidden'),false);
 }finally{f.restore();}
});
test('Welcome enters walking and scene controls leave an active tour before changing the building',async()=>{
 const f=fixture({returning:false});try{await init({World:f.World});assert.equal(f.ids.get('welcome').open,true);f.click('start');const w=f.World.last;assert.equal(f.ids.get('welcome').open,false);assert.equal(w.mode,'walk');assert.equal(f.ids.get('camera-mode').value,'walk');w.presentation.active=true;f.click('shell-view');assert.ok(w.stoppedTour);assert.equal(w.shellFull,true);assert.equal(w.mode,'orbit');assert.equal(f.ids.get('camera-mode').value,'orbit');
 }finally{f.restore();}
});

test('Third-person camera is selected from the actual app, follows a rendered avatar and preserves ground orientation',async()=>{
 const f=fixture();try{await init({World:f.World});f.select('third');const w=f.World.last;assert.equal(w.mode,'third');assert.equal(w.controls.enabled,false);assert.equal(f.ids.get('camera-mode').value,'third');assert.ok(w.avatar.visible);assert.ok(w.avatar.getObjectByName('leg-left'));assert.ok(w.camera.position.distanceTo(new T.Vector3(w.player[0],1.2,w.player[1]))>1);assert.equal(f.doc.activeElement,f.ids.get('scene'));
  w.yaw=.72;w.pitch=-.22;const player=[...w.player];f.select('walk');assert.equal(w.avatar.visible,false);assert.deepEqual(w.player,player);assert.equal(w.yaw,.72);assert.equal(w.pitch,-.22);
  f.click('third-view');f.doc.querySelectorAll('[data-floor]').find(e=>e.dataset.floor==='2').dispatchEvent(new Event('click'));assert.equal(w.mode,'third');assert.equal(w.floor,2);assert.equal(w.avatar.position.y,elevation(2));assert.ok(w.camera.position.y>elevation(2));f.click('orbit');assert.equal(w.avatar.visible,false);
 }finally{f.restore();}
});
function frameHarness(w,f){
 Object.assign(w,{last:0,cables:[],wifiDevices:[],particles:{instanceMatrix:{}},radio:{instanceMatrix:{}},marker:new T.Object3D(),simTime:0,speed:1,frames:0,fpsStart:0});w.renderer.render=()=>{};w.drawMap=()=>{};w.updateInteriorLights=()=>{};w.renderer.domElement=f.ids.get('scene');
}
test('Drone uses an independent camera in the real animation loop, with keyboard and touch altitude control',async()=>{
 const f=fixture({compact:true,touch:true});try{await init({World:f.World});f.click('drone-view');const w=f.World.last;frameHarness(w,f);w.touchStick=bindTouchStick(w,f.doc);assert.equal(w.mode,'drone');assert.equal(w.floor,'all');assert.equal(w.controls.enabled,false);assert.equal(f.ids.get('camera-mode').value,'drone');assert.equal(f.ids.get('drone-altitude').classList.contains('hidden'),false);assert.equal(f.ids.get('touch-pad').classList.contains('hidden'),false);
  w.dronePosition[1]=8;w.updateDroneCamera();const start=[...w.dronePosition];w.keys={KeyE:true};w.animate(50);assert.ok(w.camera.position.y>start[1]);assert.deepEqual(w.player,FLOORS[1].spawn);w.keys={};
  const e=new Event('pointerdown',{cancelable:true});Object.defineProperty(e,'pointerId',{value:7});f.ids.get('drone-down').dispatchEvent(e);const y=w.camera.position.y;w.animate(100);assert.ok(w.camera.position.y<y);{const up=new Event('pointerup');Object.defineProperty(up,'pointerId',{value:7});f.ids.get('drone-down').dispatchEvent(up);}assert.equal(w.touchLift,0);
  w.touchLift=1;w.clearInput();assert.equal(w.touchLift,0);const before=w.camera.position.clone();w.animate(150);assert.deepEqual(w.camera.position,before);f.select('walk');assert.equal(f.ids.get('drone-altitude').classList.contains('hidden'),true);assert.equal(w.mode,'walk');
 }finally{f.restore();}
});
test('Third-person movement uses the same collision path and animates the avatar only when position changes',async()=>{
 const f=fixture();try{await init({World:f.World});f.select('third');const w=f.World.last;frameHarness(w,f);w.yaw=0;w.player=[0,0];w.followEye=null;w.keys={KeyW:true};w.animate(50);assert.ok(w.player[1]<0);assert.equal(w.avatar.position.z,w.player[1]);assert.notEqual(w.avatar.getObjectByName('leg-left').rotation.x,0);
  w.floors.get(1).collisions=[[ -2,-.35,2,-.35 ]];for(let i=2;i<=30;i++)w.animate(i*50);assert.ok(w.player[1]>-.18,'Avatar cannot walk through wall');const stopped=[...w.player];w.animate(1550);assert.deepEqual(w.player,stopped);
 }finally{f.restore();}
});
test('Roomtour restores both new camera modes and drone floor, location and orientation',async()=>{
 const f=fixture();try{await init({World:f.World});const w=f.World.last;w.clearTrace=()=>{w.traceResult=null;};w.showTrace=r=>{w.traceResult=r;};w.callbacks.tour=()=>{};w.presentation=new PresentationDirector(w);
  f.select('drone');w.setFloor(2,false);w.dronePosition=[5,12,3];w.yaw=.6;w.pitch=-.3;w.updateDroneCamera();const eye=w.camera.position.clone();w.presentation.start();w.presentation.stop();assert.equal(w.mode,'drone');assert.equal(w.floor,2);assert.deepEqual(w.camera.position,eye);assert.equal(w.yaw,.6);assert.equal(w.pitch,-.3);
  f.select('third');w.player=[7,-3];w.yaw=.9;w.updateWalkCamera();w.presentation.start();w.presentation.stop();assert.equal(w.mode,'third');assert.deepEqual(w.player,[7,-3]);assert.equal(w.yaw,.9);assert.ok(w.avatar.visible);
 }finally{f.restore();}
});
test('Drone vertical controls and joystick have independent pointer lifecycles and reset together on interruption',async()=>{
 const f=fixture({compact:true,touch:true});try{await init({World:f.World});f.select('drone');const w=f.World.last;w.touchStick=bindTouchStick(w,f.doc);const pointer=(type,id,props={})=>{const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries({pointerId:id,...props}))Object.defineProperty(e,k,{value:v});return e;};
  f.ids.get('drone-up').dispatchEvent(pointer('pointerdown',1));assert.equal(w.touchLift,1);f.ids.get('touch-joystick').dispatchEvent(pointer('pointerdown',2,{clientX:195,clientY:120}));assert.notEqual(w.touchMove.forward,0);f.ids.get('touch-joystick').dispatchEvent(pointer('pointerup',2));assert.equal(w.touchMove.forward,0);assert.equal(w.touchLift,1);
  f.ids.get('drone-down').dispatchEvent(pointer('pointerdown',3));assert.equal(w.touchLift,0);f.ids.get('drone-down').dispatchEvent(pointer('pointerup',3));assert.equal(w.touchLift,1);w.clearInput();assert.equal(w.touchLift,0);assert.equal(w.touchMove.forward,0);
 }finally{f.restore();}
});
