import * as T from '../vendor/three.module.js';
import {ROOMS,FLOOR_HEIGHT} from './data.js';
import {ROOM_LIGHT_COLORS} from './lighting.js';
// A static irradiance atlas approximates broad ceiling bounce in every room.
// It adds indirect diffuse light to PBR, so roughness, normals and AO still apply.
// One texture lookup replaces dozens of extra real-time lights on mobile GPUs.
export const LIGHT_ATLAS={bounds:[-13.6,-9.5,13.6,19.4],width:256,rows:256};
export const EMERGENCY_TYPES=new Set(['corridor','stairs','server','nurse','icu']);
const zones=ROOMS.concat({floor:1,bounds:[-12.65,-2.15,-9.2,2.15],type:'arrival'});
export function roomIrradiance(x,z,floor){
 const room=zones.find(r=>r.floor===floor&&x>=r.bounds[0]-.065&&x<=r.bounds[2]+.065&&z>=r.bounds[1]-.065&&z<=r.bounds[3]+.065);if(!room)return [0,0,0,0];
 const c=new T.Color(ROOM_LIGHT_COLORS[room.type]||0xf1f5ef).lerp(new T.Color(0xffffff),.72),[a,b,d,e]=room.bounds,px=T.MathUtils.clamp((x-a)/(d-a),0,1),pz=T.MathUtils.clamp((z-b)/(e-b),0,1),broad=.56+.045*Math.sin(px*Math.PI)*Math.sin(pz*Math.PI);
 return [c.r*broad,c.g*broad,c.b*broad,EMERGENCY_TYPES.has(room.type)||room.id==='igd'?1:.5];
}
const {width,rows,bounds:[x0,z0,x1,z1]}=LIGHT_ATLAS,data=new Uint8Array(width*rows*2*4);
for(let floor=1;floor<=2;floor++)for(let z=0;z<rows;z++)for(let x=0;x<width;x++){const value=roomIrradiance(x0+(x+.5)/width*(x1-x0),z0+(z+.5)/rows*(z1-z0),floor),i=((floor-1)*rows*width+z*width+x)*4;for(let k=0;k<4;k++)data[i+k]=Math.round(value[k]*255);}
export const indoorLightTexture=new T.DataTexture(data,width,rows*2,T.RGBAFormat);indoorLightTexture.name='Whole-building diffuse irradiance';indoorLightTexture.magFilter=indoorLightTexture.minFilter=T.LinearFilter;indoorLightTexture.wrapS=indoorLightTexture.wrapT=T.ClampToEdgeWrapping;indoorLightTexture.generateMipmaps=false;indoorLightTexture.needsUpdate=true;
export const indoorLightUniforms={uHospitalLightAtlas:{value:indoorLightTexture},uHospitalLightStrength:{value:1.0},uHospitalLightPower:{value:new T.Vector2(1,0)}};
export function setIndoorLightState(state,preset){indoorLightUniforms.uHospitalLightStrength.value=preset.diffuse??1;indoorLightUniforms.uHospitalLightPower.value.set(state.mains?1:0,!state.mains&&state.ups?1:0);}
export function applyIndoorLighting(shader){
 Object.assign(shader.uniforms??={},indoorLightUniforms);
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHospitalLightPosition;').replace('#include <project_vertex>',`#include <project_vertex>
 vec4 hospitalWorldPosition=vec4(transformed,1.0);
 #ifdef USE_BATCHING
  hospitalWorldPosition=batchingMatrix*hospitalWorldPosition;
 #endif
 #ifdef USE_INSTANCING
  hospitalWorldPosition=instanceMatrix*hospitalWorldPosition;
 #endif
 vHospitalLightPosition=(modelMatrix*hospitalWorldPosition).xyz;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vHospitalLightPosition;
 uniform sampler2D uHospitalLightAtlas;
 uniform float uHospitalLightStrength;
 uniform vec2 uHospitalLightPower;`).replace('#include <lights_fragment_begin>',`#include <lights_fragment_begin>
 #if defined(RE_IndirectDiffuse)
  float hospitalFloor=step(${FLOOR_HEIGHT-.12},vHospitalLightPosition.y);
  float hospitalLocalY=vHospitalLightPosition.y-hospitalFloor*${FLOOR_HEIGHT.toFixed(1)};
  vec2 hospitalPlanUv=(vHospitalLightPosition.xz-vec2(${x0.toFixed(1)},${z0.toFixed(1)}))/vec2(${(x1-x0).toFixed(1)},${(z1-z0).toFixed(1)});
  vec2 hospitalAtlasUv=vec2(hospitalPlanUv.x,(hospitalPlanUv.y+hospitalFloor)*0.5);
  vec4 hospitalBounce=texture2D(uHospitalLightAtlas,hospitalAtlasUv);
  float hospitalInside=step(0.0,hospitalPlanUv.x)*step(hospitalPlanUv.x,1.0)*step(0.0,hospitalPlanUv.y)*step(hospitalPlanUv.y,1.0);
  float hospitalHeight=smoothstep(-0.22,0.01,hospitalLocalY)*(1.0-smoothstep(2.94,3.17,hospitalLocalY));
  float hospitalEnergy=uHospitalLightPower.x+uHospitalLightPower.y*step(0.75,hospitalBounce.a)*0.16;
  vec3 hospitalWorldNormal=inverseTransformDirection(geometryNormal,viewMatrix);
  float hospitalDiffuse=0.68+0.32*max(0.0,hospitalWorldNormal.y);
  irradiance+=hospitalBounce.rgb*PI*uHospitalLightStrength*hospitalEnergy*hospitalHeight*hospitalInside*hospitalDiffuse;
 #endif`);
}
