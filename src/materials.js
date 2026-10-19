import * as T from '../vendor/three.module.js';
export const PALETTE={ivory:0xf1eee5,wall:0xe6e8e3,teal:0x3e8185,navy:0x233f50,oak:0xbd9666,sage:0x829b86,blue:0x698fa9,clay:0xb7765e,metal:0x9baeb3};
export const ROOM_ACCENTS={clinical:PALETTE.teal,ward:PALETTE.sage,icu:0x497e8b,operation:0x6a9bab,lab:PALETTE.blue,radiology:0x70839c,pharmacy:0x7c9984,office:0x7c8b9f,registration:PALETTE.clay,nurse:PALETTE.teal,corridor:PALETTE.teal,toilet:0x8dadaa,stairs:0x7c9192};
const cache=new Map(),maps=new Map();
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);},clamp=x=>Math.max(0,Math.min(1,x));
export function surfaceMaps(profile='vinyl',size=128){
 const key=`${profile}:${size}`;if(maps.has(key))return maps.get(key);
 const heights=new Float32Array(size*size),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),color=new Uint8Array(size*size*4),ao=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let h=.5,grain=hash(x,y);
  if(profile==='vinyl'){
   const px=x/8,py=y/8,cx=Math.floor(px),cy=Math.floor(py);let d1=10,d2=10;
   for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const gx=cx+i,gy=cy+j,sx=(gx%16+16)%16,sy=(gy%16+16)%16,d=Math.hypot(gx+hash(sx,sy)-px,gy+hash(sx+51,sy+23)-py);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
   h=clamp(Math.pow(clamp((d2-d1)*3.1),.55)*.78+.22-(grain>.955?.32:0));
  }else if(profile==='fabric')h=.5+.18*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2)+grain*.08;
  else if(profile==='wood')h=.5+.21*Math.sin(x*.19635+Math.sin(y*.049087)*1.6)+.09*Math.sin(x*.58905+Math.sin(y*.098175))+grain*.04;
  else if(profile==='steel')h=.45+hash(x,0)*.2+grain*.03;
  else if(profile==='terrazzo')h=.45+grain*.1+(grain>.97?.25:0);
  else if(profile==='ceiling')h=.52-(grain>.92?.22:0);
  else if(profile==='plaster')h=.45+grain*.18;
  else if(profile==='ceramic')h=.5+grain*.02;
  else if(profile==='rubber')h=.4+grain*.24;
  else if(profile==='leaf')h=.5+Math.sin(x*.09817)*.14+Math.abs(Math.sin(y*.19635))*.1;
  else h=.45+grain*.1;
  heights[y*size+x]=h;
  const base=profile==='wood'?.75+h*.23:profile==='fabric'?.87+h*.1:profile==='terrazzo'?(grain>.97?.77:.94+grain*.04):profile==='ceiling'?.88+h*.11:.91+h*.07;
  const p=(y*size+x)*4,v=clamp(base)*255;color.set([v,v,v,255],p);const occ=Math.round((.89+clamp(h)*.11)*255);ao.set([occ,occ,occ,255],p);
 }
 const at=(x,y)=>heights[(y+size)%size*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const sx=at(x-1,y-1)+2*at(x-1,y)+at(x-1,y+1)-at(x+1,y-1)-2*at(x+1,y)-at(x+1,y+1),sy=at(x-1,y-1)+2*at(x,y-1)+at(x+1,y-1)-at(x-1,y+1)-2*at(x,y+1)-at(x+1,y+1);
  const strength=profile==='vinyl'?.5:profile==='fabric'?.4:profile==='glass'?.015:profile==='ceiling'?.3:.14,n=new T.Vector3(sx*strength,sy*strength,1).normalize(),p=(y*size+x)*4;
  normal.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],p);
  const base={steel:.42,wood:.62,glass:.16,ceramic:.45,rubber:.84,ceiling:.9,plaster:.88}[profile]??.7,v=clamp(base+at(x,y)*.12)*255;rough.set([v,v,v,255],p);
 }
 const texture=(data,srgb=false)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(12,12);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;if(srgb)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;};
 const result={map:texture(color,true),normalMap:texture(normal),roughnessMap:texture(rough),aoMap:texture(ao)};maps.set(key,result);return result;
}
export function material(color=PALETTE.ivory,emissive=0,profile='paint'){
 const key=`${color}:${emissive}:${profile}`;if(cache.has(key))return cache.get(key);
 const metal=profile==='steel',soft=['vinyl','fabric'].includes(profile),glass=profile==='glass';
 const m=new T.MeshPhysicalMaterial({color,roughness:metal?.66:soft?.85:glass?.18:.72,metalness:metal?.82:.015,emissive,emissiveIntensity:emissive?.85:0,clearcoat:['vinyl','paint','ceramic'].includes(profile)?.16:0,clearcoatRoughness:.5,sheen:profile==='fabric'?.3:0,sheenColor:new T.Color(color),aoMapIntensity:.3,...surfaceMaps(profile)});
 if(glass){m.transparent=true;m.opacity=.38;m.depthWrite=false;m.side=T.DoubleSide;}
 m.name=`${profile}-${Number(color).toString(16)}`;m.userData.surface=profile;
 m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nfloat medilinkGrain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 #ifdef USE_NORMALMAP
  float microGrain=medilinkGrain(floor(vNormalMapUv*1024.0));
  roughnessFactor=clamp(roughnessFactor+(microGrain-0.5)*0.025,0.08,1.0);
 #endif`);};m.customProgramCacheKey=()=>`medilink-pbr-v3-${profile}`;cache.set(key,m);return m;
}
export function floorMaterial(color){
 const key=`floor:${color}`;if(cache.has(key))return cache.get(key);
 const m=material(color,0,'terrazzo').clone();m.name='Hospital terrazzo';m.roughness=.68;
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHospitalPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHospitalPosition=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHospitalPosition;').replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=vHospitalPosition.xz;vec2 cell=abs(fract(p*0.8)-0.5);float grout=smoothstep(0.485,0.498,max(cell.x,cell.y));
   float fleck=fract(sin(dot(floor(p*95.0),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(0.985+0.015*fleck,0.86,grout*0.4);`);
 };m.customProgramCacheKey=()=> 'medilink-terrazzo-v3';cache.set(key,m);return m;
}
