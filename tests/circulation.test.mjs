import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {FRONT_OFFICE,circulationCutters,prepareWallSegments,arrivalBarriers,overlapsRect} from '../src/circulation.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds} from '../src/layout.js';
import {buildEnvironment} from '../src/environment.js';
import {WALL_HEIGHT,subtractBoxes,animateDoor} from '../src/architecture.js';
import {makeAsset} from '../src/assets.js';
import {auditCirculation,simulateWalk} from '../tools/audit-circulation.mjs';
const raw=JSON.parse(await readFile(new URL('../assets/collision-1.json',import.meta.url))),walls=prepareWallSegments(1,raw),env=buildEnvironment(1,walls),segments=walls.concat(arrivalBarriers),obstacles=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===1).map(placementBounds).concat(env.obstacles);

test('Five visitor/staff routes remain clear at their designed widths and walk through automatic doors',async()=>{
 const audit=await auditCirculation();assert.deepEqual(audit.issues,[]);assert.equal(audit.routes.length,5);for(const route of audit.routes){assert.equal(route.blockedSamples,0,route.id);assert.equal(route.walkCompleted,true,route.id);}
});
test('The same routes can be traversed in reverse without teleporting or bypassing collision',()=>{
 for(const r of FRONT_OFFICE.routes)assert.equal(simulateWalk([...r.points].reverse(),segments,obstacles,env.doors).ok,true,r.id);
});
test('Decorations cannot occupy the entry landing or either corridor exit',()=>{
 const items=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===1).map(p=>({...p,bounds:placementBounds(p)})).concat(env.placements.filter(p=>p.collidable));
 for(const p of items)for(const zone of FRONT_OFFICE.protectedZones)assert.equal(overlapsRect(p.bounds,zone.bounds),false,`${p.id||p.kind} blocks ${zone.id}`);
 assert.deepEqual(prepareWallSegments(1,walls),walls,'Repeated preparation cannot reopen or duplicate walls');
});
async function remodeledWallScene(){
 const bytes=await readFile(new URL('../assets/models/floor-1.glb',import.meta.url)),model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 model.scene.traverse(o=>{if(o.isMesh){o.geometry.applyMatrix4(new T.Matrix4().makeScale(1,WALL_HEIGHT/2.7,1));o.geometry=subtractBoxes(o.geometry,circulationCutters(1));o.material=new T.MeshBasicMaterial({side:T.DoubleSide});}});model.scene.updateMatrixWorld(true);return model.scene;
}
test('All three enlarged openings cut through the actual wall GLB across their clear width',async()=>{
 const scene=await remodeledWallScene();for(const d of FRONT_OFFICE.doorways)for(const offset of [-.55,-.25,0,.25,.55]){
  const start=d.side==='W'?new T.Vector3(d.x-.5,1.6,d.z+offset):new T.Vector3(d.x+offset,1.6,d.z-.5),direction=d.side==='W'?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  assert.equal(new T.Raycaster(start,direction,0,1).intersectObject(scene,true).length,0,d.id+' '+offset);
 }
});
test('The entry sightline remains free of source walls, wall trim, furniture and opened door leaves',async()=>{
 const scene=await remodeledWallScene();for(const d of env.doors){d.manual=true;animateDoor(d,2,[d.definition.x,d.definition.z]);}env.root.updateMatrixWorld(true);scene.add(env.root);scene.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(-10.5,1.62,-.1),new T.Vector3(1,0,0),0,4.0);assert.equal(ray.intersectObject(scene,true).length,0);
});
test('Reception computer and counter fit as one workstation without intersecting solid furniture',()=>{
 const placed=(kind,p)=>{const g=makeAsset(kind);g.position.set(p.x,0,p.z);g.rotation.y=p.rotation;g.updateMatrixWorld(true);const boxes=[];g.traverse(o=>{if(o.isMesh&&o.geometry.type!=='TubeGeometry')boxes.push(new T.Box3().setFromObject(o,true));});return boxes;};
 const counter=placed('registration-counter',FRONT_OFFICE.counter),terminal=placed('reception-terminal',FRONT_OFFICE.terminal);
 for(const a of counter)for(const b of terminal){const overlap=a.clone().intersect(b);if(!overlap.isEmpty()){const s=overlap.getSize(new T.Vector3());assert.ok(Math.min(s.x,s.y,s.z)<.008,`Solid parts intersect: ${s.toArray()}`);}}
});
