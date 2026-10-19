import * as T from '../vendor/three.module.js';
import {box,cylinder,makeAsset,mergeStatic,material} from './assets.js';
import {makeSign} from './environment.js';
export const CAMPUS_BOUNDS=[-26,-18,24,20];
export const CAMPUS_ROADS=[[-21,-15,21,-11],[-21,11,21,15],[-21,-11,-17,11],[17,-11,21,11]];
export const CAMPUS_WALK=[[-23.5,-.1],[-19,-.1],[-15.4,-.1],[-12.15,-.1]];
function terrainMaterial(color,profile,grain){
 const base=material(color,0,profile),m=base.clone();m.onBeforeCompile=shader=>{
  base.onBeforeCompile(shader);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCampusPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCampusPosition=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCampusPosition;').replace('#include <color_fragment>',`#include <color_fragment>\nfloat siteGrain=fract(sin(dot(floor(vCampusPosition.xz*${grain.toFixed(1)}),vec2(13.37,78.21)))*43758.5453);diffuseColor.rgb*=0.94+0.1*siteGrain;`);
 };m.customProgramCacheKey=()=>`campus-${profile}-${grain}`;return m;
}
export function createContactShadows(bounds){
 const data=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5),i=(y*32+x)*4;data.set([255,255,255,Math.max(0,1-d)**2*135],i);}
 const map=new T.DataTexture(data,32,32,T.RGBAFormat);map.needsUpdate=true;map.magFilter=T.LinearFilter;
 const geo=new T.PlaneGeometry(1,1),m=new T.MeshBasicMaterial({color:0x172a26,alphaMap:map,map,transparent:true,opacity:.28,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const mesh=new T.InstancedMesh(geo,m,bounds.length),dummy=new T.Object3D();mesh.name='Soft contact grounding';mesh.renderOrder=1;
 bounds.forEach((b,i)=>{dummy.position.set((b[0]+b[2])/2,.025,(b[1]+b[3])/2);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(b[2]-b[0]+.48,b[3]-b[1]+.48,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});return mesh;
}
export function buildCampus(){
 const root=new T.Group(),ground=new T.Group(),detail=new T.Group(),vegetation=new T.Group(),lights=[],placements=[],obstacles=[],barriers=[];root.name='MediLink campus';
 const grass=terrainMaterial(0x829978,'leaf',75),asphalt=terrainMaterial(0x697776,'rubber',85),paving=terrainMaterial(0xd2d2c2,'terrazzo',12),wind={value:0},windMaterials=new Map(),glowMaterials=[];
 const slab=(b,y,h,m)=>box(ground,(b[0]+b[2])/2,y,(b[1]+b[3])/2,b[2]-b[0],h,b[3]-b[1],m);
 slab(CAMPUS_BOUNDS,-.23,.22,grass);
 for(const b of CAMPUS_ROADS)slab(b,-.075,.12,asphalt);
 for(const b of [[-16.7,-10.1,-13.35,10.2],[-13.35,-10.1,15.4,-8.9],[-13.35,8.6,15.4,10.2],[14.1,-8.9,15.4,8.6],[-24.5,-1.65,-12.6,1.45]])slab(b,-.035,.07,paving);
 for(const z of [-10.18,10.27])box(detail,.5,.025,z,30.2,.12,.12,0xb0b6a9,'ceramic');
 for(let x=-20;x<20;x+=3.5)for(const z of [-13,13])box(detail,x,-.009,z,1.6,.006,.065,0xe5d8a7,'paint');
 for(let z=-9;z<10;z+=3.5)for(const x of [-19,19])box(detail,x,-.009,z,.065,.006,1.6,0xe5d8a7,'paint');
 for(let x=-20.6;x<-17.2;x+=.5)box(detail,x,-.004,-.1,.27,.008,2.5,0xf2eee0,'paint');
 for(let z=-9.5;z<10;z+=1.2)box(detail,-14.9,.003,z,3.15,.005,.014,0xa8b4aa,'ceramic');
 for(const x of [-23.2,22.1])for(let z=-15;z<18;z+=3)box(detail,x,-.006,z,.08,.01,.48,0xd2d8c7,'paint');
 function asset(kind,x,z,rotation=0,scale=1,solid=true){
  const model=makeAsset(kind);model.position.set(x,0,z);model.rotation.y=rotation;model.scale.setScalar(scale);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
   if(o.material.userData.surface==='leaf'){const base=o.material;let m=windMaterials.get(base.uuid);if(!m){m=base.clone();m.onBeforeCompile=shader=>{base.onBeforeCompile(shader);shader.uniforms.uCampusTime=wind;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uCampusTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uCampusTime*0.65+position.y*1.7+position.z)*0.018*max(0.0,position.y-1.4);');};m.customProgramCacheKey=()=>`campus-wind-${base.name}`;windMaterials.set(base.uuid,m);}o.material=m;}
   if(['street-light','bollard-light'].includes(kind)&&o.material.emissive?.getHex()){const m=o.material.clone();m.onBeforeCompile=o.material.onBeforeCompile;m.customProgramCacheKey=o.material.customProgramCacheKey;o.material=m;glowMaterials.push(m);}
  }});
  const b=new T.Box3().setFromObject(model,true),bounds=[b.min.x,b.min.z,b.max.x,b.max.z];(kind==='garden-tree'?vegetation:detail).add(model);placements.push({kind,x,z,rotation,scale,bounds});
  if(solid)obstacles.push(kind==='garden-tree'?[x-.23,z-.23,x+.23,z+.23]:bounds);return model;
 }
 for(const [x,z,s]of [[-15,7.4,1],[-15,-9.4,.95],[-9,-9.8,.8],[-3,-9.9,.9],[4,-9.9,.85],[11,-9.9,.85],[-9,9.7,.85],[-3,9.7,.9],[4,9.7,.85],[11,9.7,.9],[15.8,-5,.85],[15.8,4,.85],[-23.6,-8,1],[-23.6,15,1],[22.5,17,1]])asset('garden-tree',x,z,0,s);
 for(const z of [4.5,7.2,9.9]){slab([-25.1,z-1.15,-21.3,z+1.15],-.06,.1,asphalt);for(const a of [-1.15,1.15])box(detail,-23.2,-.002,z+a,3.7,.006,.055,0xeae4d0,'paint');asset('car',-23.2,z,Math.PI/2,.95);}
 asset('ambulance',-15.2,-5.8,Math.PI,.96);
 for(const [x,z,a]of [[-14.8,3.8,-Math.PI/2],[-14.8,6.1,-Math.PI/2],[-6,9.55,Math.PI],[7,9.55,Math.PI]])asset('garden-bench',x,z,a,.9);
 for(const [x,z]of [[-16.4,-8.5],[-16.4,4.1],[-16.4,10.1],[15.8,-9.5],[15.8,9.5],[-10,15.6],[10,15.6]]){asset('street-light',x,z);lights.push({floor:0,x:x+.65,y:3.68,z,color:0xffddb3});}
 for(const x of [-15.5,-13.7])for(const z of [-1.45,1.25]){asset('bollard-light',x,z,.0,.9);lights.push({floor:0,x,y:.6,z,color:0xffddb3});}
 // A framed entrance totem faces the road, outside the pedestrian route.
 box(detail,-15.2,1.43,-3.0,.18,2.86,1.2,0x315c60,'paint',.045,4);
 box(detail,-15.31,2.4,-3,.025,.42,.14,0xf1eada);box(detail,-15.31,2.4,-3,.025,.14,.42,0xf1eada);
 const title=makeSign('MEDILINK',1.04,0x315c60,'RUMAH SAKIT · MASUK →');title.position.set(-15.31,1.77,-3);title.rotation.y=-Math.PI/2;title.scale.y=2.2;detail.add(title);obstacles.push([-15.4,-3.65,-15,-2.35]);
 const hospital=makeSign('MEDILINK · HOSPITAL',3.4,0x315c60,'LAYANAN · PERAWATAN · TERHUBUNG');hospital.position.set(-12.67,3.05,-.1);hospital.rotation.y=-Math.PI/2;hospital.scale.y=1.8;detail.add(hospital);
 // Perimeter fence retains a clear western pedestrian gate and south service gate.
 for(const [a,b]of [[[-25.5,-17.5],[23.5,-17.5]],[[-25.5,19.5],[-3,19.5]],[[3,19.5],[23.5,19.5]],[[-25.5,-17.5],[-25.5,-2]], [[-25.5,1.8],[-25.5,19.5]],[[23.5,-17.5],[23.5,19.5]]]){
  barriers.push([...a,...b]);const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/2.2),h=a[1]===b[1];
  for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;box(detail,x,.6,z,.065,1.2,.065,0x748981,'steel');}
  for(const y of [.35,.85])box(detail,(a[0]+b[0])/2,y,(a[1]+b[1])/2,h?length:.035,.045,h?.035:length,0x748981,'steel');
 }
 // Drain covers and accessible kerb cuts add scale without obstructing arrival.
 for(const z of [-8,8])for(const x of [-16.85,16.8]){box(detail,x,.005,z,.22,.014,.75,0x71817c,'steel');for(let i=0;i<8;i++)box(detail,x,.015,z-.31+i*.09,.18,.006,.025,0x384d4b,'rubber');}
 root.add(mergeStatic(ground),mergeStatic(detail),mergeStatic(vegetation));
 return {root,placements,obstacles,barriers,lights,glowMaterials,update:time=>{wind.value=time;},setLighting:(preset,powered=true)=>{for(const m of glowMaterials)m.emissiveIntensity=powered?(preset==='day'?.22:1.7):0;}};
}
