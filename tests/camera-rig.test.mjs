import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three.module.js';
import {followPose,resolveBoom,droneStep} from '../src/camera-rig.js';import {makeAsset} from '../src/assets.js';
test('Follow camera stays behind its subject, shrinks before walls and furniture, and stays below an indoor ceiling',()=>{
 const open=followPose([0,0],0,-.12);assert.ok(open.eye[2]>2);assert.ok(open.eye[1]>.4&&open.eye[1]<2.7);
 const wall=followPose([0,0],0,-.12,0,[[-3,1,3,1]]);assert.ok(wall.eye[2]<.86);assert.ok(wall.eye[2]>0);
 const cabinet=followPose([0,0],Math.PI/2,-.12,3.4,[],[[1,-1,2,1]]);assert.ok(cabinet.eye[0]<.86);assert.ok(cabinet.eye[1]>=3.85&&cabinet.eye[1]<=6.1);
 for(const yaw of [0,.7,Math.PI,4.5])for(const pitch of [-2,0,2]){const p=followPose([1,2],yaw,pitch);assert.ok(p.eye.every(Number.isFinite));assert.ok(p.eye[1]>=.45&&p.eye[1]<=2.7);}
 assert.deepEqual(resolveBoom([0,1,0],[0,1,2],[],[]),[0,1,2]);
});
test('Drone translation is bounded, normalized and consistent at 30 and 60 FPS',()=>{
 const bounds=[-26,-18,24,28];let a=[0,8,0],b=[0,8,0];for(let i=0;i<30;i++)a=droneStep(a,.4,1,1,1,1/30,bounds);for(let i=0;i<60;i++)b=droneStep(b,.4,1,1,1,1/60,bounds);for(let i=0;i<3;i++)assert.ok(Math.abs(a[i]-b[i])<1e-9);
 assert.ok(Math.abs(Math.hypot(...a.map((v,i)=>v-[0,8,0][i]))-4.4)<1e-9);const max=droneStep([500,500,500],0,0,0,0,.01,bounds);assert.deepEqual(max,[23.7,36,27.7]);const min=droneStep([-500,-500,-500],0,0,0,0,.01,bounds);assert.deepEqual(min,[-25.7,.4,-17.7]);
});
test('Visitor avatar has articulated limbs, finite textured geometry and human proportions',()=>{
 const avatar=makeAsset('visitor-avatar');for(const name of ['leg-left','leg-right','arm-left','arm-right'])assert.ok(avatar.getObjectByName(name));let triangles=0;avatar.traverse(o=>{if(o.isMesh){const g=o.geometry;for(const attr of ['position','normal','uv','tangent'])assert.ok(g.attributes[attr].array.every(Number.isFinite));for(const map of ['map','normalMap','roughnessMap','aoMap'])assert.ok(o.material[map]);triangles+=(g.index?.count||g.attributes.position.count)/3;}});assert.ok(triangles<60000);
 const b=new T.Box3().setFromObject(avatar,true);assert.ok(b.min.y>=0&&b.max.y>1.65&&b.max.y<1.9);
});
