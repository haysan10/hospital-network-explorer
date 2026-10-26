import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three.module.js';
import{ROOMS}from'../src/data.js';import{roomIrradiance,LIGHT_ATLAS,indoorLightTexture,indoorLightUniforms,setIndoorLightState,applyIndoorLighting}from'../src/indoor-lighting.js';import{LIGHTING_PRESETS}from'../src/lighting.js';import{material,floorMaterial}from'../src/materials.js';
test('Every room and corridor receives broad diffuse illumination across its full footprint, independent of camera selection',()=>{
 for(const r of ROOMS){const [x,z,a,b]=r.bounds,values=[];for(const u of [.08,.5,.92])for(const v of [.08,.5,.92]){const c=roomIrradiance(x+(a-x)*u,z+(b-z)*v,r.floor);assert.ok(c.slice(0,3).every(n=>n>.5&&n<1),r.id);assert.ok(c[3]>0);values.push(c[0]);}assert.ok(Math.max(...values)/Math.min(...values)<1.1,r.id+' must not have a small light hotspot');}
 assert.deepEqual(roomIrradiance(-20,12,1),[0,0,0,0]);assert.deepEqual(roomIrradiance(6.65,10,2),[0,0,0,0]);
});
test('The actual two-floor texture covers occupied centers without lighting the outdoor courtyard',()=>{
 const {bounds:[x,z,a,b],width,rows}=LIGHT_ATLAS,{data}=indoorLightTexture.image;assert.equal(data.length,width*rows*2*4);assert.equal(indoorLightTexture.generateMipmaps,false);
 for(const r of ROOMS){const px=Math.min(width-1,Math.floor((r.center[0]-x)/(a-x)*width)),pz=Math.min(rows-1,Math.floor((r.center[1]-z)/(b-z)*rows)),i=((r.floor-1)*rows*width+pz*width+px)*4;assert.ok(data[i]>120&&data[i+3]>0,r.id);}
 assert.equal(indoorLightTexture.magFilter,T.LinearFilter);assert.ok(data.every(Number.isFinite));
});
test('Room bounce follows mains and selected emergency zones while retaining day, dusk and night',()=>{
 for(const preset of Object.values(LIGHTING_PRESETS)){setIndoorLightState({mains:true,ups:true},preset);assert.deepEqual(indoorLightUniforms.uHospitalLightPower.value.toArray(),[1,0]);assert.ok(indoorLightUniforms.uHospitalLightStrength.value>=1);setIndoorLightState({mains:false,ups:true},preset);assert.deepEqual(indoorLightUniforms.uHospitalLightPower.value.toArray(),[0,1]);setIndoorLightState({mains:false,ups:false},preset);assert.deepEqual(indoorLightUniforms.uHospitalLightPower.value.toArray(),[0,0]);}
 const corridor=ROOMS.find(r=>r.id==='corridor-s'),ward=ROOMS.find(r=>r.id==='ward-a');assert.equal(roomIrradiance(...corridor.center,1)[3],1);assert.equal(roomIrradiance(...ward.center,2)[3],.5);setIndoorLightState({mains:true,ups:true},LIGHTING_PRESETS.day);
});
test('Real PBR and floor shaders add indirect irradiance before AO and preserve batching, instancing and material maps',()=>{
 for(const m of [material(0xc4d8d2,0,'polymer'),material(0xa3b4af,0,'steel'),floorMaterial(0xc4d8d2,'resin')]){const shader={uniforms:{},vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader};m.onBeforeCompile(shader);assert.equal(shader.uniforms.uHospitalLightAtlas.value,indoorLightTexture);assert.match(shader.vertexShader,/instanceMatrix\*hospitalWorldPosition/);assert.match(shader.vertexShader,/batchingMatrix\*hospitalWorldPosition/);assert.match(shader.fragmentShader,/irradiance\+=hospitalBounce/);assert.ok(shader.fragmentShader.indexOf('irradiance+=hospitalBounce')<shader.fragmentShader.indexOf('#include <aomap_fragment>'));assert.ok(m.map&&m.normalMap&&m.roughnessMap&&m.aoMap);}
 const shader={uniforms:{},vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader};applyIndoorLighting(shader);assert.match(shader.fragmentShader,/hospitalEnergy=uHospitalLightPower.x/);assert.match(shader.fragmentShader,/hospitalInside/);assert.match(shader.fragmentShader,/hospitalLocalY/);
});
