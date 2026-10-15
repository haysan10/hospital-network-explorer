import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {HospitalWorld} from '../src/world.js';
import {ROOMS} from '../src/data.js';
import {EDGES} from '../src/engine.js';

test('Actual scene cable builder produces finite tube geometry for every graph link',()=>{
  for(const e of EDGES){const mesh=HospitalWorld.prototype.tube.call(null,e.points,.02,0xffffff);assert.ok([...mesh.geometry.getAttribute('position').array].every(Number.isFinite),e.id);mesh.geometry.computeBoundingSphere();assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));mesh.geometry.dispose();mesh.material.dispose();}
});
test('Actual room builder assembles all floor zones and furniture without a renderer',()=>{
  const context={obstacles:{1:[],2:[]},makeLabel(){}};
  for(const r of ROOMS){const g=new T.Group();HospitalWorld.prototype.buildRoom.call(context,g,r);assert.ok(g.children.length>0,r.id);const bounds=new T.Box3().setFromObject(g);assert.ok(!bounds.isEmpty());assert.ok([bounds.min.x,bounds.min.y,bounds.min.z,bounds.max.x,bounds.max.y,bounds.max.z].every(Number.isFinite));}
  assert.ok(context.obstacles[1].length>0);assert.ok(context.obstacles[2].length>0);
});
