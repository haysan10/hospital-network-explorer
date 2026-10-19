import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {readFile} from 'node:fs/promises';
import {HospitalWorld} from '../src/world.js';
test('Hiding labels removes both room names and device beacons, updates all controls and persists the choice',()=>{
 const oldDoc=globalThis.document,oldStorage=globalThis.localStorage,values=new Map(),buttons=Object.fromEntries(['toggle-labels','label-view','tour-labels'].map(id=>['#'+id,{attributes:{},setAttribute(k,v){this.attributes[k]=v;}}])),classes=new Set();
 globalThis.document={body:{classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}}},querySelector:q=>buttons[q]};globalThis.localStorage={setItem:(k,v)=>values.set(k,v)};
 try{const camera=new T.PerspectiveCamera(43,1,.05,200);camera.position.set(0,2,5);camera.lookAt(0,1,0);const context={camera,labelItems:[false,true].map(device=>({device,floor:1,point:new T.Vector3(0,1,0),el:{style:{}}})),mode:'orbit',width:600,height:600,visibleFloor:()=>true,updateLabels:HospitalWorld.prototype.updateLabels};
  HospitalWorld.prototype.setLabels.call(context,false);assert.equal(context.labelsVisible,false);assert.ok(context.labelItems.every(l=>l.el.style.display==='none'));assert.ok(classes.has('hide-labels'));assert.equal(values.get('medilink-labels-visible'),'false');for(const b of Object.values(buttons))assert.equal(b.attributes['aria-pressed'],'false');
  HospitalWorld.prototype.setLabels.call(context,true);assert.ok(context.labelItems.every(l=>l.el.style.display===''));assert.ok(!classes.has('hide-labels'));
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});
test('Presentation controls, chapter picker and lighting controls are present once with accessible names',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');for(const id of ['start-tour','nav-tour','tour-exit','tour-play','tour-next','tour-prev','tour-chapters','tour-demo','tour-explore','tour-labels','label-view','lighting-preset','tour-lighting','tour-fullscreen'])assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
 assert.match(html,/id="tour-chapters"/);assert.match(html,/for="tour-chapters"/);assert.match(html,/id="label-view" aria-pressed="true"/);
});
