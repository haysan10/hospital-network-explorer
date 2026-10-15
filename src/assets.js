import * as T from '../vendor/three.module.js';
import {surface} from './surfaces.js';
// All added furniture and devices are made here. No external textures or CDNs.
const mats=new Map();
const surfaceType=new Map([[0x65b5b2,'fabric'],[0x819da4,'metal'],[0xc1a280,'wood'],[0xc4d7d8,'metal'],[0xe6eeeb,'linen'],[0xc6ddda,'metal'],[0x627e87,'metal'],[0xa3babc,'tile']]);
export function material(color,emissive=0) {
  if(!emissive&&surfaceType.has(color))return surface(color,surfaceType.get(color));
  const key=`${color}:${emissive}`;
  if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.5,metalness:.12,emissive,emissiveIntensity:emissive?.65:0}));
  return mats.get(key);
}
const WHITE=0xf3f7f5,TEAL=0x65b5b2,DARK=0x223b48,METAL=0x819da4,WOOD=0xc1a280;
const unitBox=new T.BoxGeometry(1,1,1),unitCylinder=new T.CylinderGeometry(1,1,1,10);
export function box(g,x,y,z,w,h,d,color=WHITE) {
  const mat=typeof color==='object'?color:material(color);
  let geometry=unitBox;
  if(mat.map){geometry=unitBox.clone();const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i));uv.setXY(i,nx>.5?pos.getZ(i)*d:pos.getX(i)*w,ny>.5?pos.getZ(i)*d:pos.getY(i)*h);}}
  const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
export function cylinder(g,x,y,z,r,h,color=METAL) {
  const mesh=new T.Mesh(unitCylinder,material(color));mesh.position.set(x,y,z);mesh.scale.set(r,h,r);mesh.castShadow=true;g.add(mesh);return mesh;
}
function rounded(g,x,y,z,w,h,d,color,r=.035){
  const geo=new T.BoxGeometry(w,h,d,4,4,6),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),c=new T.Vector3(T.MathUtils.clamp(v.x,-w/2+r,w/2-r),T.MathUtils.clamp(v.y,-h/2+r,h/2-r),T.MathUtils.clamp(v.z,-d/2+r,d/2-r));const n=v.sub(c).normalize().multiplyScalar(r).add(c);p.setXYZ(i,n.x,n.y,n.z);}
  geo.computeVertexNormals();const mesh=new T.Mesh(geo,typeof color==='object'?color:material(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function led(g,x,y,z,color=0x49e5bd) {return box(g,x,y,z,.032,.027,.025,material(color,color));}
function screen(g,x,y,z,w=.55,h=.35) {
  box(g,x,y,z,w,h,.055,DARK);box(g,x,y,z+.032,w*.9,h*.83,.01,material(0x214b63,0x214b63));
  for(let i=0;i<14;i++){const wave=Math.sin(i*.85)*h*.12+(i===8?h*.22:0);box(g,x-w*.37+i*w*.055,y+wave,z+.042,w*.05,.007,.006,material(0x61d7bb,0x61d7bb));}
  for(let i=0;i<3;i++)box(g,x-w*.2,y-h*.26+i*.022,z+.042,w*.32,.008,.005,material(0x5e9eb0,0x214b63));
}
function wheels(g,x,z,w,d,y=.12) {for(const a of [-1,1])for(const b of [-1,1]){const c=cylinder(g,x+a*w/2,y,z+b*d/2,.07,.09,DARK);c.rotation.x=Math.PI/2;}}
export function makeAsset(kind) {
  const g=new T.Group();g.name=kind;
  switch(kind) {
    case 'server': case 'rack': {
      const w=kind==='server'?.75:.63,h=kind==='server'?2:1.85;
      box(g,0,h/2,0,w,h,.78,DARK);box(g,0,h/2,.405,w-.08,h-.08,.035,0x314d59);
      for(let i=0;i<9;i++){
        const y=.19+i*.175;box(g,0,y,.43,w-.14,.125,.06,0x627e87);
        for(let j=0;j<6;j++)box(g,-w*.27+j*.045,y,.467,.023,.065,.006,DARK);
        led(g,w*.28,y,.47,i%3===0?0x53c8ed:0x49e5bd);
      }
      for(const x of [-w/2+.025,w/2-.025])box(g,x,h/2,.46,.025,h-.12,.025,METAL);
      for(let i=0;i<4;i++){const cable=new T.Mesh(new T.TorusGeometry(.045,.008,4,10,Math.PI),material([0x366bff,0x10bcae][i%2]));cable.position.set(-.14+i*.08,1.71,.5);g.add(cable);}
      box(g,0,h+.025,0,w+.04,.05,.83,0x49636d);break;
    }
    case 'switch': {
      box(g,0,.07,0,.72,.14,.35,0x405d6b);
      for(let i=0;i<12;i++){box(g,-.31+i*.051,.07,.182,.035,.048,.014,DARK);led(g,-.31+i*.051,.119,.183);}
      box(g,0,.147,0,.7,.014,.33,METAL);for(let i=0;i<8;i++)box(g,-.25+i*.065,.157,-.05,.026,.004,.15,DARK);break;
    }
    case 'router': {
      box(g,0,.06,0,.46,.12,.3,WHITE);for(const x of [-.18,0,.18])cylinder(g,x,.2,-.1,.014,.33,DARK);
      for(let i=0;i<4;i++)led(g,-.12+i*.065,.065,.157);break;
    }
    case 'ap': {
      cylinder(g,0,0,0,.23,.065,WHITE);cylinder(g,0,.04,0,.19,.02,0xe0eae6);cylinder(g,0,.058,0,.035,.008,0x21d9b0);break;
    }
    case 'pc': {
      box(g,0,.75,0,1.15,.08,.64,WOOD);
      for(const x of [-.49,.49])for(const z of [-.24,.24])box(g,x,.36,z,.045,.72,.045,WHITE);
      box(g,0,.83,-.1,.25,.03,.16,DARK);box(g,0,.94,-.15,.04,.22,.035,METAL);screen(g,0,1.09,-.16,.57,.34);
      box(g,-.06,.802,.15,.4,.023,.12,0xc2d3d6);for(let row=0;row<3;row++)for(let col=0;col<10;col++)box(g,-.23+col*.037,.817,.11+row*.034,.027,.008,.024,DARK);box(g,.24,.8,.15,.07,.025,.1,DARK);
      box(g,.36,.35,-.05,.21,.43,.37,DARK);led(g,.35,.53,.14);
      const chair=makeAsset('chair');chair.position.set(0,0,.72);g.add(chair);break;
    }
    case 'chair': {
      rounded(g,0,.47,0,.48,.09,.47,TEAL);rounded(g,0,.75,.2,.48,.52,.07,TEAL,.025);cylinder(g,0,.23,0,.045,.4,METAL);
      for(const x of [-.27,.27]){box(g,x,.62,0,.025,.23,.035,METAL);box(g,x,.74,0,.07,.04,.3,DARK);}
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const caster=cylinder(g,Math.sin(a)*.28,.055,Math.cos(a)*.28,.04,.05,DARK);caster.rotation.z=Math.PI/2;const leg=box(g,Math.sin(a)*.14,.07,Math.cos(a)*.14,.06,.045,.35,METAL);leg.rotation.y=a;}
      break;
    }
    case 'bed': {
      box(g,0,.43,0,.98,.18,1.95,METAL);rounded(g,0,.58,0,.93,.18,1.92,surface(WHITE,'linen'),.06);rounded(g,0,.7,.23,.94,.1,1.3,TEAL,.035);
      rounded(g,0,.72,-.67,.63,.14,.38,surface(0xe6eeeb,'linen'),.055);
      for(const z of [-1.01,1.01]){box(g,0,.7,z,1,.72,.07,WHITE);box(g,0,1.09,z,.95,.055,.08,TEAL);}
      for(const x of [-.43,.43])box(g,x,.755,.23,.012,.015,1.22,0x46928e);for(const z of [-.32,.35,.82])box(g,0,.758,z,.83,.012,.012,0x46928e);
      wheels(g,0,0,.8,1.65);for(const x of [-.53,.53])box(g,x,.85,0,.04,.36,1.2,0xc4d7d8);break;
    }
    case 'medical-monitor': {
      box(g,0,.12,0,.4,.09,.42,WHITE);cylinder(g,0,.65,0,.035,1.1,METAL);screen(g,0,1.28,0,.43,.32);break;
    }
    case 'ups': {
      box(g,0,.43,0,.42,.86,.62,DARK);box(g,0,.55,.32,.31,.42,.025,0x34525b);
      screen(g,0,.68,.337,.23,.13);for(let i=0;i<6;i++)box(g,0,.15+i*.044,.32,.29,.016,.01,METAL);break;
    }
    case 'panel': {
      box(g,0,0,0,.42,.66,.18,0xcbd8d5);box(g,0,0,.1,.36,.6,.025,WHITE);
      for(let i=0;i<3;i++){box(g,-.1+i*.1,.03,.13,.06,.23,.04,DARK);box(g,-.1+i*.1,.08,.158,.045,.05,.02,0xe0a136);}
      break;
    }
    case 'tablet': {
      box(g,0,.025,0,.3,.035,.4,DARK);box(g,0,.047,0,.26,.008,.34,material(0x316d84,0x316d84));break;
    }
    case 'cabinet': {
      box(g,0,.9,0,1.1,1.8,.42,WHITE);for(const x of [-.28,.28]){box(g,x,.94,.22,.52,1.65,.035,0xc6ddda);box(g,x+Math.sign(x)*-.15,.95,.25,.025,.17,.03,METAL);}
      break;
    }
    case 'shelf': {
      for(const x of [-.55,.55])for(const z of [-.22,.22])box(g,x,.85,z,.04,1.7,.04,METAL);
      for(let i=0;i<4;i++){box(g,0,.12+i*.45,0,1.15,.045,.5,WHITE);for(let j=0;j<4;j++)box(g,-.43+j*.28,.25+i*.45,0,.18,.22,.29,[0x95b5ad,0xcab99a,0xa3bac7][j%3]);}break;
    }
    case 'washer': {
      box(g,0,.45,0,.7,.9,.65,WHITE);const c=cylinder(g,0,.42,.34,.24,.06,DARK);c.rotation.x=Math.PI/2;const d=cylinder(g,0,.42,.38,.18,.025,0x7899a3);d.rotation.x=Math.PI/2;box(g,0,.79,.34,.6,.11,.03,0xd0dedb);break;
    }
    case 'plant': {
      cylinder(g,0,.18,0,.18,.35,0xc8b59c);
      for(let i=0;i<5;i++){const a=i*1.26;const leaf=box(g,Math.cos(a)*.1,.58+i%2*.1,Math.sin(a)*.1,.1,.6,.06,0x6d9f88);leaf.rotation.z=Math.cos(a)*.4;leaf.rotation.x=Math.sin(a)*.4;}break;
    }
    case 'ct-scanner': {
      box(g,0,.45,.3,.7,.15,1.9,WHITE);box(g,0,.23,.8,.5,.43,.5,0xa4c4c4);
      const torus=new T.Mesh(new T.TorusGeometry(.59,.18,8,24),material(WHITE));torus.position.set(0,.87,-.4);g.add(torus);
      box(g,0,.3,-.45,1.45,.6,.6,0xc9dcda);break;
    }
    case 'stairs': {
      for(let i=0;i<9;i++)box(g,0,(i+1)*.085,-.9+i*.22,1.2,(i+1)*.17,.22,0xa3babc);
      for(const x of [-.65,.65])for(let i=0;i<4;i++)cylinder(g,x,.7+i*.22,-.7+i*.5,.02,1,TEAL);break;
    }
    case 'cable-tray': {
      for(const x of [-.15,.15])box(g,x,0,0,.025,.09,2,METAL);
      for(let i=0;i<10;i++)box(g,0,-.04,-.9+i*.2,.3,.02,.025,METAL);break;
    }
    case 'cctv': {
      cylinder(g,0,0,0,.12,.05,WHITE);const dome=new T.Mesh(new T.SphereGeometry(.1,12,8,0,Math.PI*2,0,Math.PI/2),material(DARK));dome.rotation.x=Math.PI;dome.position.y=-.01;g.add(dome);break;
    }
    case 'socket': {box(g,0,0,0,.14,.14,.025,WHITE);for(const x of [-.03,.03])cylinder(g,x,0,.02,.013,.02,DARK).rotation.x=Math.PI/2;break;}
    default: box(g,0,.5,0,.8,1,.5,WHITE);
  }
  return g;
}
export const ASSET_NAMES=['server','rack','switch','router','ap','pc','chair','bed','medical-monitor','ups','panel','tablet','cabinet','shelf','washer','plant','ct-scanner','stairs','cable-tray','cctv','socket'];
export function mergeStatic(root) {
  // Batches by material. Only use for immutable furniture, never animated parts.
  root.updateMatrixWorld(true);
  const groups=new Map();
  root.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);
    const pos=geo.getAttribute('position'),norm=geo.getAttribute('normal'),uv=geo.getAttribute('uv'),key=o.material.uuid;
    if(!groups.has(key))groups.set(key,{mat:o.material,p:[],n:[],u:[]});const b=groups.get(key);b.p.push(pos.array);b.n.push(norm.array);b.u.push(uv?uv.array:new Float32Array(pos.count*2));geo.dispose();
  });
  const result=new T.Group();
  const concat=arrays=>{const out=new Float32Array(arrays.reduce((s,a)=>s+a.length,0));let offset=0;arrays.forEach(a=>{out.set(a,offset);offset+=a.length;});return out;};
  for(const b of groups.values()) {
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(concat(b.p),3));geo.setAttribute('normal',new T.BufferAttribute(concat(b.n),3));geo.setAttribute('uv',new T.BufferAttribute(concat(b.u),2));
    const mesh=new T.Mesh(geo,b.mat);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);
  }
  return result;
}
