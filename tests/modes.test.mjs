import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ExperienceController} from '../src/modes.js';
import {GameState} from '../src/engine.js';
import {INSTALL_STEPS} from '../src/experience.js';
import * as T from '../vendor/three.module.js';

// A DOM contract harness, deliberately without a browser or WebGL renderer.
class Element {
  constructor(id,dataset={}){this.id=id;this.dataset=dataset;this.textContent='';this.innerHTML='';this.style={};this.attrs={};this.listeners={};this.classes=new Set();this.classList={toggle:(name,on)=>on===undefined?(this.classes.has(name)?this.classes.delete(name):this.classes.add(name)):on?this.classes.add(name):this.classes.delete(name),add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
  setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}
}
function setup(html){
  const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  const groups={};for(const name of ['mode','start-mode','layer'])groups[`[data-${name}]`]=[...html.matchAll(new RegExp(`data-${name}="([^"]+)"`,'g'))].map(m=>new Element('',{[name.replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]:m[1]}));
  const get=q=>{if(q==='dialog[open]')return null;if(q.startsWith('#')){const el=elements.get(q.slice(1));assert.ok(el,'UI element exists: '+q);return el;}throw new Error('Unhandled selector '+q);};
  globalThis.document={querySelector:get,querySelectorAll:q=>groups[q]||[],body:{dataset:{}}};globalThis.window={addEventListener(){}};const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  const world={floor:1,mode:'orbit',layers:{copper:true,fiber:true,wifi:false,power:false},selectionRing:{visible:false,position:new T.Vector3()},selected:null,
    setInstallationLinks(links){this.links=links;},clearTrace(){this.route=null;},setFloor(floor){this.floor=floor;this.mode='orbit';},setRoof(mode){this.roofMode=mode;},isExterior(){return this.roofMode==='solid'||this.floor==='all'&&this.roofMode==='auto';},setLayer(name,on){this.layers[name]=on;},home(){this.mode='orbit';},focusPoint(){},showTrace(result){this.route=result;if(new Set(result.nodes.map(id=>id==='sw-l2'||id==='pc-icu'?2:1)).size>1)this.floor='all';},goToStairs(){this.stairRequested=true;},travelStairs(){this.transitRequested=true;}};
  let controller;const state=new GameState();controller=new ExperienceController({world,state,toast(){},renderMissions(){get('#panel-content').innerHTML='GAME MISSIONS';},setTab(){controller.render();},selectDevice(){},exportProgress(){}});return {controller,world,state,get,groups,storage};
}

test('The four actual mode controllers can be entered, and all installation choices complete with matching scene links',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),{controller:c,world,get}=setup(html);
  c.setMode('explore');assert.equal(world.floor,'all');assert.equal(world.roofMode,'auto');assert.match(get('#panel-content').innerHTML,/Ikuti distribusi awal/);
  for(let i=0;i<6;i++){c.explore(i);assert.match(get('#panel-content').innerHTML,/guide-card/);}c.explore(6);assert.equal(world.floor,'all');
  c.setMode('game');assert.equal(get('#panel-content').innerHTML,'GAME MISSIONS');assert.equal(world.floor,1);assert.equal(get('#tab-missions').textContent,'Misi');
  c.setMode('installation');assert.equal(world.links.size,0);
  for(let i=0;i<8;i++){c.installIndex=i;c.choose(INSTALL_STEPS[i].answer);assert.equal(c.feedback.ok,true);assert.equal(world.links.size,c.install.links.size);}
  c.installIndex=8;c.render();assert.match(get('#panel-content').innerHTML,/Instalasi|INSTALASI/);assert.match(get('#panel-content').innerHTML,/Ditolak kebijakan/);assert.equal(c.exportData().installation.verification.ok,true);
  c.setMode('presentation');for(let i=0;i<8;i++){c.slide=i;c.showSlide();assert.equal(get('#slide-count').textContent,`${String(i+1).padStart(2,'0')} / 08`);assert.match(get('#panel-content').innerHTML,/CATATAN PEMBICARA/);}
  c.setMode('explore');assert.equal(c.auto,false);assert.equal(world.links,null);
});
test('Mode transitions return faults to baseline, keep earned game XP, and preserve installation progress',async()=>{
  const {controller:c,state,world,get}=setup(await readFile(new URL('../index.html',import.meta.url),'utf8'));
  state.inspect('core');state.startFault();state.mains=false;c.setMode('installation');c.choose(INSTALL_STEPS[0].answer);c.installIndex=1;c.choose(INSTALL_STEPS[1].answer);
  assert.equal(state.xp,100);assert.equal(state.mains,true);assert.equal(state.broken.size,0);const links=world.links.size;
  c.setMode('game');assert.equal(state.xp,100);assert.equal(get('#xp').textContent,'100 XP');c.setMode('installation');assert.equal(world.links.size,links);assert.equal(c.installIndex,2);
  world.transit={};c.setMode('presentation');assert.equal(c.current,'installation');
});
test('All literal bound UI selectors exist in the real HTML and element IDs are unique',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  const dynamic=new Set(['result','device-filter','device-results','ups-ready','toggle-mains','quiz-feedback']);
  for(const file of ['app','world','modes']){const js=await readFile(new URL(`../src/${file}.js`,import.meta.url),'utf8');for(const m of js.matchAll(/\$\('#([a-z][a-z0-9-]*)'\)/g))assert.ok(ids.includes(m[1])||dynamic.has(m[1]),`${file}: ${m[1]}`);}
});
