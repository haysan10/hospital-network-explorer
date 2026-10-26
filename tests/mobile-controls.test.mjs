import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import{ScenePointers,stickVector,movementVector,renderBudget,compactLabels}from'../src/input.js';
import{HospitalWorld}from'../src/world.js';
import{initResponsive,COMPACT_QUERY}from'../src/responsive.js';
function event(type,props={}){const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});return e;}
function fixture(){
 const doc=new EventTarget(),ids=new Map();
 class Element extends EventTarget{constructor(id,tag='BUTTON'){super();this.id=id;this.tagName=tag;this.attributes={};this.dataset={};this.hidden=false;this.inert=false;this.disabled=false;this.isConnected=true;this.value='';this.style={setProperty(k,v){this[k]=v;}};const values=new Set();this.classList={toggle(k,on){if(on===undefined)on=!values.has(k);on?values.add(k):values.delete(k);return on;},contains:k=>values.has(k)};}setAttribute(k,v){this.attributes[k]=String(v);}removeAttribute(k){delete this.attributes[k];if(k==='data-scene-popover')delete this.dataset.scenePopover;}getAttribute(k){return this.attributes[k];}focus(){doc.activeElement=this;}getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()];}getBoundingClientRect(){return this.rect||{left:0,top:0,width:390,height:400};}setPointerCapture(id){this.capture=id;}querySelectorAll(){return [ids.get('panel-close'),ids.get('tab-missions'),ids.get('device-filter')];}}
 const names=['scene','minimap','touch-joystick','joystick-thumb','touch-inspect','panel','panel-close','panel-backdrop','nav-missions','nav-devices','view-tools','quality','mobile-quality','tab-missions','device-filter','views-menu','layers-menu','map-menu','floor-one'];for(const id of names)ids.set(id,new Element(id,id==='device-filter'?'INPUT':'BUTTON'));
 for(const id of ['quality','mobile-quality'])ids.get(id).value='normal';for(const key of ['views','layers','map'])ids.get(key+'-menu').dataset.scenePanel=key;
 ids.get('touch-joystick').rect={left:18,top:600,width:116,height:116};ids.get('panel').rect={left:0,top:320,width:390,height:400};
 doc.body=new Element('body','BODY');doc.documentElement=new Element('html','HTML');doc.activeElement=ids.get('nav-devices');doc.querySelector=q=>q.startsWith('#')?ids.get(q.slice(1)):null;doc.querySelectorAll=q=>q==='[data-scene-panel]'?['views-menu','layers-menu','map-menu'].map(k=>ids.get(k)):q==='#view-tools button,[data-floor]'?[ids.get('floor-one')]:[];
 const win=new EventTarget();win.navigator={maxTouchPoints:2};win.innerHeight=844;win.visualViewport=new EventTarget();Object.assign(win.visualViewport,{height:844,offsetTop:0});win.requestAnimationFrame=fn=>fn();const medias=new Map();win.matchMedia=q=>{if(!medias.has(q)){const m=new EventTarget();m.matches=true;medias.set(q,m);}return medias.get(q);};
 return {doc,win,ids,medias};
}
test('Pinching, long presses, return drags and cancelled gestures never trigger a device tap',()=>{
 const p=new ScenePointers(),e=(pointerId,x,y,timeStamp=0)=>({pointerId,clientX:x,clientY:y,timeStamp});p.begin(e(1,20,20));p.begin(e(2,60,20));p.move(e(1,0,20));assert.equal(p.end(e(1,0,20,120)),false);assert.equal(p.end(e(2,60,20,130)),false);
 p.begin(e(3,20,20));p.move(e(3,60,20));p.move(e(3,20,20));assert.equal(p.end(e(3,20,20,120)),false);p.begin(e(4,20,20));assert.equal(p.end(e(4,20,20,800)),false);
 p.begin(e(5,20,20));p.cancel();assert.equal(p.end(e(5,20,20,100)),false);p.begin(e(6,20,20));assert.equal(p.end(e(6,22,21,100)),true);
});
test('Analog movement preserves slow speed, dead zone and equal diagonal speed for keyboard and touch',()=>{
 assert.deepEqual(stickVector(1,1),{right:0,forward:0,x:1,y:1});const v=stickVector(0,-21);assert.ok(v.forward>0&&v.forward<.5);assert.equal(v.right,0);const full=stickVector(100,-100);assert.ok(Math.abs(Math.hypot(full.right,full.forward)-1)<1e-9);assert.ok(Math.hypot(full.x,full.y)<=42.00001);
 assert.ok(movementVector({},v).forward<.5);const mixed=movementVector({KeyW:true,KeyD:true},full);assert.ok(Math.hypot(mixed.forward,mixed.right)<=1.00001);
});
test('One finger can move the joystick while a second finger looks; release, interruption and visibility changes stop movement',()=>{
 const f=fixture(),oldDoc=globalThis.document,oldWin=globalThis.window;globalThis.document=f.doc;globalThis.window=f.win;
 try{const w={mode:'walk',keys:{},touchMove:{},yaw:0,pitch:0,renderer:{domElement:f.ids.get('scene')},clearInput:HospitalWorld.prototype.clearInput,callbacks:{},presentation:null};HospitalWorld.prototype.bindInputs.call(w);
  f.ids.get('touch-joystick').dispatchEvent(event('pointerdown',{pointerId:1,clientX:76,clientY:624}));assert.equal(w.touchMove.forward,1);assert.equal(f.ids.get('touch-joystick').capture,1);
  f.ids.get('scene').dispatchEvent(event('pointerdown',{pointerId:2,pointerType:'touch',button:0,clientX:200,clientY:200}));f.ids.get('scene').dispatchEvent(event('pointermove',{pointerId:2,clientX:250,clientY:220}));assert.ok(w.yaw<0&&w.pitch<0);assert.equal(w.touchMove.forward,1);f.ids.get('scene').dispatchEvent(event('pointerup',{pointerId:2,clientX:250,clientY:220}));assert.equal(w.touchMove.forward,1);
  f.ids.get('touch-joystick').dispatchEvent(event('pointercancel',{pointerId:1}));assert.deepEqual(w.touchMove,{forward:0,right:0});
  f.ids.get('touch-joystick').dispatchEvent(event('pointerdown',{pointerId:3,clientX:76,clientY:624}));w.keys.KeyW=true;f.win.dispatchEvent(event('blur'));assert.deepEqual(w.keys,{});assert.deepEqual(w.touchMove,{forward:0,right:0});assert.equal(w.scenePointers.points.size,0);
  f.ids.get('touch-joystick').dispatchEvent(event('pointerdown',{pointerId:4,clientX:76,clientY:624}));f.doc.hidden=true;f.doc.dispatchEvent(event('visibilitychange'));assert.equal(w.touchMove.forward,0);
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;if(oldWin===undefined)delete globalThis.window;else globalThis.window=oldWin;}
});
test('Touch inspection selects an actual nearby device and clears movement before opening its information',()=>{
 const selected=[],w={mode:'walk',floor:1,player:[12.25,-6.8],keys:{KeyW:true},touchMove:{forward:1},clearInput:HospitalWorld.prototype.clearInput,callbacks:{select:id=>{assert.deepEqual(w.keys,{});assert.equal(w.touchMove.forward,0);selected.push(id);},toast(){}}};assert.equal(HospitalWorld.prototype.inspectNearest.call(w),true);assert.deepEqual(selected,['server']);w.mode='orbit';assert.equal(HospitalWorld.prototype.inspectNearest.call(w),false);
});
test('Compact panels open, focus, close and restore the model; desktop and keyboard viewport changes remain usable',()=>{
 const f=fixture(),camera=new T.PerspectiveCamera(43,390/728,.05,200),world={camera,width:390,height:728,mode:'orbit',clearInput(){this.cleared=true;},setQuality(q){this.quality=q;}};const r=initResponsive({world,doc:f.doc,win:f.win});assert.equal(f.ids.get('panel').inert,true);assert.equal(f.ids.get('panel-backdrop').hidden,true);
 r.openPanel();assert.equal(world.cleared,true);assert.equal(f.ids.get('panel').inert,false);assert.equal(f.doc.activeElement.id,'panel-close');assert.equal(camera.view.offsetY,200);assert.ok(f.doc.body.classList.contains('mobile-panel-open'));
 const escape=event('keydown',{code:'Escape'});f.doc.dispatchEvent(escape);assert.ok(escape.defaultPrevented);assert.equal(f.ids.get('panel').inert,true);assert.equal(f.doc.activeElement.id,'nav-devices');assert.equal(camera.view.enabled,false);
 f.ids.get('views-menu').dispatchEvent(event('click'));assert.equal(f.doc.body.dataset.scenePopover,'views');f.ids.get('map-menu').dispatchEvent(event('click'));assert.equal(f.doc.body.dataset.scenePopover,'map');assert.equal(f.ids.get('views-menu').getAttribute('aria-expanded'),'false');f.ids.get('scene').dispatchEvent(event('pointerdown'));assert.equal(f.doc.body.dataset.scenePopover,undefined);
 r.openPanel();f.doc.activeElement=f.ids.get('device-filter');f.win.visualViewport.height=350;f.win.visualViewport.dispatchEvent(event('resize'));assert.equal(f.doc.documentElement.style['--app-height'],'350px');assert.ok(f.doc.body.classList.contains('keyboard-open'));
 const media=f.medias.get(COMPACT_QUERY);media.matches=false;media.dispatchEvent(event('change'));assert.equal(f.ids.get('panel').inert,false);assert.equal(f.ids.get('panel-backdrop').hidden,true);assert.equal(f.ids.get('panel').getAttribute('role'),undefined);
 f.ids.get('mobile-quality').value='eco';f.ids.get('mobile-quality').dispatchEvent(event('change'));assert.equal(f.ids.get('quality').value,'eco');assert.equal(world.quality,'eco');
});
test('Adaptive rendering bounds pixel cost across phone, tablet, portrait, landscape and desktop sizes',()=>{
 for(const [width,height]of [[320,568],[390,844],[568,320],[768,1024],[1024,768],[1366,768],[1920,1080],[3840,2160]])for(const coarse of [false,true])for(const quality of ['eco','normal','high']){const ratio=renderBudget(width,height,3,quality,coarse);assert.ok(ratio>0&&ratio<=2);assert.ok(width*height*ratio**2<=(coarse?1500000:4500000)+1);if(quality==='eco')assert.ok(ratio<=1);}
});

test('Compact label placement avoids overlapping touch targets and keeps the selected device first',()=>{
 const items=[{id:'room',device:false,name:'Ruang operasi',x:180,y:200,distance:10},{id:'selected',selected:true,device:true,name:'SW',x:180,y:200,distance:20},{id:'other',device:true,name:'DC',x:280,y:260,distance:10},{id:'behind-toolbar',device:true,name:'DC',x:180,y:50,distance:1}];const visible=compactLabels(items,390,600);assert.ok(visible.has('selected'));assert.ok(!visible.has('room'));assert.ok(!visible.has('behind-toolbar'));assert.ok(visible.has('other'));assert.ok(visible.size<=8);
});
