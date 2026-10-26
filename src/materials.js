import {applyIndoorLighting} from './indoor-lighting.js';
import * as T from '../vendor/three.module.js';
export const PALETTE={ivory:0xf1eee5,wall:0xe6e8e3,teal:0x3e8185,navy:0x233f50,oak:0xbd9666,sage:0x829b86,blue:0x698fa9,clay:0xb7765e,metal:0x9baeb3};
export const ROOM_ACCENTS={ent:0x528f94,dental:0x638fac,clinical:PALETTE.teal,ward:PALETTE.sage,icu:0x497e8b,operation:0x6a9bab,lab:PALETTE.blue,radiology:0x70839c,pharmacy:0x7c9984,office:0x7c8b9f,registration:PALETTE.clay,nurse:PALETTE.teal,corridor:PALETTE.teal,toilet:0x8dadaa,stairs:0x7c9192,kitchen:0x8b9b7e,laundry:0x789da7,linen:0x91aa8b,workshop:0x7f9193,staff:0xad9982};
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
  else if(['resin','polymer','sheet-vinyl'].includes(profile))h=.5+grain*.018;
  else if(profile==='wet-tile')h=.5+grain*.1;
  else if(profile==='concrete')h=.48+grain*.12;
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
  const strength=profile==='vinyl'?.5:profile==='fabric'?.4:['glass','resin','polymer','sheet-vinyl'].includes(profile)?.015:profile==='ceiling'?.3:.14,n=new T.Vector3(sx*strength,sy*strength,1).normalize(),p=(y*size+x)*4;
  normal.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],p);
  const base={resin:.55,polymer:.53,'sheet-vinyl':.63,'wet-tile':.82,concrete:.88,steel:.42,wood:.62,glass:.16,ceramic:.45,rubber:.84,ceiling:.9,plaster:.88}[profile]??.7,v=clamp(base+at(x,y)*.12)*255;rough.set([v,v,v,255],p);
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
 #endif`);applyIndoorLighting(shader);};m.customProgramCacheKey=()=>`medilink-pbr-v4-${profile}-room-bounce`;cache.set(key,m);return m;
}
export function floorMaterial(color,profile='terrazzo'){
 const tiled=['terrazzo','wet-tile','antistatic'].includes(profile);
 const key=`floor:${color}:${profile}`;if(cache.has(key))return cache.get(key);
 const m=material(color,0,profile==='antistatic'?'polymer':profile).clone();m.name=`Hospital ${profile}`;m.roughness=profile==='wet-tile'?.88:.68;
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHospitalPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHospitalPosition=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHospitalPosition;').replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=vHospitalPosition.xz;vec2 cell=abs(fract(p*0.8)-0.5);float grout=smoothstep(0.485,0.498,max(cell.x,cell.y));
   float fleck=fract(sin(dot(floor(p*95.0),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(0.985+0.015*fleck,0.86,grout*${tiled?'0.4':'0.0'});`);
  applyIndoorLighting(shader);
 };m.customProgramCacheKey=()=> `medilink-floor-v6-${profile}-room-bounce`;cache.set(key,m);return m;
}

// Concept finish schedule; no surveyed dimensions or clinical certification.
export const ROOM_FINISHES={ent:{floor:'sheet-vinyl',ceiling:'polymer',color:0xd5e2dd,furniture:'polymer'},dental:{floor:'sheet-vinyl',ceiling:'polymer',color:0xd5e2dd,furniture:'polymer'},
 operation:{floor:'resin',color:0xc3d8d5,ceiling:'polymer',furniture:'polymer',purpose:'Tindakan steril; permukaan tertutup, tanpa komputer kantor'},
 clinical:{floor:'sheet-vinyl',color:0xd7e2dc,ceiling:'polymer',furniture:'polymer',purpose:'Pemeriksaan; akses sisi bed dan area kerja terpisah'},
 ward:{floor:'sheet-vinyl',color:0xdfe3d4,ceiling:'ceiling',furniture:'polymer',purpose:'Perawatan; bed, privasi, penyimpanan dan akses petugas'},
 icu:{floor:'resin',color:0xcddedb,ceiling:'polymer',furniture:'polymer',purpose:'Perawatan intensif; monitor medis dan area kerja'},
 lab:{floor:'resin',color:0xd5dfe0,ceiling:'polymer',furniture:'polymer',purpose:'Pemeriksaan sampel; meja kerja dan sink'},
 radiology:{floor:'sheet-vinyl',color:0xd2dae2,ceiling:'polymer',furniture:'polymer',purpose:'Pencitraan; jalur akses alat dan meja operator'},
 storage:{floor:'concrete',color:0xd3dbd2,ceiling:'polymer',furniture:'polymer',purpose:'Penyimpanan alat; rak dan akses troli bebas'},
 pharmacy:{floor:'sheet-vinyl',color:0xdce2d4,ceiling:'ceiling',furniture:'polymer',purpose:'Penyimpanan obat tertutup dan pelayanan'},
 kitchen:{floor:'wet-tile',color:0xc8d0cb,ceiling:'polymer',furniture:'steel',purpose:'Penerimaan bahan dari pintu belakang, persiapan, masak dan distribusi makanan'},
 laundry:{floor:'wet-tile',color:0xbeced0,ceiling:'polymer',furniture:'steel',purpose:'Penerimaan kotor dari pintu belakang dan proses cuci; akses petugas dari koridor'},
 linen:{floor:'sheet-vinyl',color:0xdde4d6,ceiling:'polymer',furniture:'polymer',purpose:'Linen bersih disimpan terpisah dari ruang cuci'},
 workshop:{floor:'concrete',color:0xc2ccca,ceiling:'polymer',furniture:'polymer',purpose:'Pemeliharaan atau kalibrasi; bench dan penyimpanan alat'},
 toilet:{floor:'wet-tile',color:0xc8d8d3,ceiling:'polymer',furniture:'polymer',purpose:'Sanitasi; bilik privasi, sink dan dispenser sabun'},
 server:{floor:'antistatic',color:0xbfcacb,ceiling:'ceiling',furniture:'polymer',purpose:'Area kering untuk rak jaringan, UPS dan panel'},
 nurse:{floor:'sheet-vinyl',color:0xd5e1db,ceiling:'ceiling',furniture:'polymer',purpose:'Koordinasi perawatan dan distribusi jaringan'},
 staff:{floor:'sheet-vinyl',color:0xe2ddce,ceiling:'ceiling',furniture:'wood',purpose:'Istirahat staf terpisah dari proses penunjang'},
 office:{floor:'sheet-vinyl',color:0xdedfd7,ceiling:'ceiling',furniture:'wood',purpose:'Administrasi pada area kering'},
 security:{floor:'terrazzo',color:0xd6dcd4,ceiling:'ceiling',furniture:'polymer',purpose:'Pengawasan akses masuk'},
 registration:{floor:'terrazzo',color:0xe5dfce,ceiling:'ceiling',furniture:'wood',purpose:'Pendaftaran, antrean dan alur pengunjung'},
 corridor:{floor:'sheet-vinyl',color:0xe1e3d8,ceiling:'ceiling',furniture:'polymer',purpose:'Sirkulasi bebas hambatan dan wayfinding'},
 stairs:{floor:'wet-tile',color:0xcbd5cf,ceiling:'polymer',furniture:'polymer',purpose:'Akses vertikal di dalam bangunan'},
 changing:{floor:'sheet-vinyl',color:0xd6dfd7,ceiling:'polymer',furniture:'polymer',purpose:'Ganti pakaian sebelum masuk area tindakan'}
};
export function finishAssetForRoom(model,room){const finish=ROOM_FINISHES[room.type];if(!finish||finish.furniture==='wood')return model;model.traverse(o=>{if(o.isMesh&&o.material.userData.surface==='wood')o.material=material(finish.furniture==='steel'?0xb5c4c2:0xd6e1db,0,finish.furniture);});return model;}
