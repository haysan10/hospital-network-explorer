import {SERVICE_ROOMS,SERVICE_DOORWAYS,SERVICE_WALLS} from './service-layout.js';
import {FRONT_OFFICE,PHARMACY_LINK,prepareWallSegments} from './circulation.js';
import * as T from '../vendor/three.module.js';
import {ROOMS,FLOORS,FLOOR_OFFSETS} from './data.js';
import {distanceToSegment} from './engine.js';
import {box,makeAsset,material,mergeStatic,addPlanarUVs} from './assets.js';
export const WALL_HEIGHT=2.94,CEILING_Y=2.92,DOOR_HEIGHT=2.1;
export function sideDefinitions(r){const [x0,z0,x1,z1]=r.bounds;return [{side:'N',a:x0,b:x1,k:z0,h:true},{side:'S',a:x0,b:x1,k:z1,h:true},{side:'W',a:z0,b:z1,k:x0,h:false},{side:'E',a:z0,b:z1,k:x1,h:false}];}
export function sideRuns(r,walls,solid=false){
 const runs=[];
 for(const d of sideDefinitions(r)){
  const nearby=walls.filter(s=>d.h?Math.min(s[1],s[3])<=d.k+.16&&Math.max(s[1],s[3])>=d.k-.16:Math.min(s[0],s[2])<=d.k+.16&&Math.max(s[0],s[2])>=d.k-.16);
  let start=null;const step=.025,count=Math.ceil((d.b-d.a)/step);
  for(let i=0;i<=count;i++){
   const v=Math.min(d.b,d.a+i*step),x=d.h?v:d.k,z=d.h?d.k:v,wall=nearby.some(s=>distanceToSegment(x,z,s)<.07),match=i<count&&(solid?wall:!wall);
   if(match&&start===null)start=v;
   if(!match&&start!==null){if(v-start>(solid?.13:.29))runs.push({...d,start,end:v,width:v-start});start=null;}
  }
 }return runs;
}
export function findDoors(floor,walls){
 walls=prepareWallSegments(floor,walls);const list=[];
 for(const r of ROOMS.filter(r=>r.floor===floor&&r.type!=='corridor'&&r.id!=='registration'&&!SERVICE_ROOMS.has(r.id)))for(const gap of sideRuns(r,walls)){
  if(floor===1&&PHARMACY_LINK.rooms.includes(r.id)&&!gap.h&&Math.abs((gap.start+gap.end)/2-PHARMACY_LINK.z)<.2)continue;
  const width=gap.width+.10,mid=(gap.start+gap.end)/2,x=gap.h?mid:gap.k,z=gap.h?gap.k:mid;
  // Wide openings to the nurse station and stairs remain accessible portals.
  const portal=width>2.25;
  const existing=list.find(d=>Math.hypot(d.x-x,d.z-z)<.22);
  if(existing){existing.rooms.push(r.id);const previous=ROOMS.find(q=>q.id===existing.room),area=q=>(q.bounds[2]-q.bounds[0])*(q.bounds[3]-q.bounds[1]);if(area(r)<area(previous)){existing.room=r.id;existing.name=r.name;existing.side=gap.side;existing.sign=gap.side==='S'||gap.side==='E'?1:-1;}continue;}
  list.push({id:`door-${r.id}-${gap.side}-${list.length}`,room:r.id,rooms:[r.id],name:r.name,floor,x,z,width:Math.min(width,gap.b-gap.a-.08),side:gap.side,rotation:gap.h?0:Math.PI/2,portal,privacy:['toilet','changing'].includes(r.type),sliding:!portal&&width>.83&&['clinical','ent','dental','icu','operation','radiology'].includes(r.type),sign:gap.side==='S'||gap.side==='E'?1:-1});
 }
 if(floor===1)for(const d of FRONT_OFFICE.doorways)list.push({...d,room:'registration',rooms:['registration'],name:d.label,floor:1,rotation:d.side==='W'?Math.PI/2:0,portal:false,privacy:false,sliding:true,glazed:true,sign:d.side==='S'?1:-1});
 if(floor===1)list.push({...PHARMACY_LINK},...SERVICE_DOORWAYS.map(d=>({...d,rooms:[...d.rooms]})));
 // Internal toilet stalls are openings in partition lines inside each restroom.
 for(const r of ROOMS.filter(r=>r.floor===floor&&r.type==='toilet')){
  const [x0,z0,x1,z1]=r.bounds;
  for(const horizontal of [false,true]){
   const axes=[];for(const s of walls){const constant=horizontal?Math.abs(s[1]-s[3])<.015:Math.abs(s[0]-s[2])<.015,len=horizontal?Math.abs(s[0]-s[2]):Math.abs(s[1]-s[3]),k=horizontal?(s[1]+s[3])/2:(s[0]+s[2])/2;
    if(constant&&len>.15&&k>(horizontal?z0:x0)+.2&&k<(horizontal?z1:x1)-.2&&!axes.some(v=>Math.abs(v-k)<.14))axes.push(k);
   }
   for(const k of axes){const a=horizontal?x0:z0,b=horizontal?x1:z1,dummy={bounds:horizontal?[a,k,b,k+.01]:[k,a,k+.01,b]};
    const gaps=sideRuns(dummy,walls).filter(g=>g.side===(horizontal?'N':'W')&&g.start>a+.18&&g.end<b-.18&&g.width<.85);
    for(const gap of gaps){const mid=(gap.start+gap.end)/2,x=horizontal?mid:k,z=horizontal?k:mid;if(list.some(d=>Math.hypot(d.x-x,d.z-z)<.24))continue;
     list.push({id:`door-stall-${r.id}-${list.length}`,room:r.id,rooms:[r.id],name:'Toilet pribadi',floor,x,z,width:gap.width+.1,side:horizontal?'N':'W',rotation:horizontal?0:Math.PI/2,portal:false,privacy:true,sliding:false,sign:!horizontal&&x>r.center[0]?1:-1,stall:true});
    }
   }
  }
 }return list;
}
export function createDoor(d){
 const group=new T.Group();group.name=d.id;group.position.set(d.x,0,d.z);group.rotation.y=d.rotation;const fixed=new T.Group();group.add(fixed);
 for(const x of [-d.width/2-.025,d.width/2+.025])box(fixed,x,1.1,0,.05,2.2,.12,0xd4ded8,'steel');box(fixed,0,2.2,0,d.width+.1,.07,.14,0xd4ded8,'steel');
 const leaves=[];
 if(!d.portal){
  const count=d.width>.86?2:1,leafWidth=(d.width-.035)/count;
  for(let i=0;i<count;i++){
   const hinge=new T.Group(),direction=i===0?1:-1;hinge.position.x=i===0?-d.width/2+.012:d.width/2-.012;
   const leaf=makeAsset(d.glazed?'entrance-leaf':'door-leaf');leaf.traverse(o=>{if(!o.isMesh)return;const profile=o.material.userData.surface;if(d.privacy&&profile==='glass')o.material=material(0xd6dfd7,0,'paint');if(profile==='wood')o.material=material(d.room?.startsWith('ok-')||d.room==='operation'?0xb9d4d1:0xd4dfd8,0,'polymer');});leaf.scale.x=leafWidth/.82;leaf.position.x=direction*leafWidth/2;hinge.add(mergeStatic(leaf));group.add(hinge);leaves.push({hinge,closedX:hinge.position.x,direction,width:leafWidth});
  }
  if(d.sliding)box(fixed,0,2.28,0,d.width+.18,.11,.17,0xc1ceca,'steel');
 }
 group.remove(fixed);const fixedBatch=mergeStatic(fixed);group.add(fixedBatch);
 return {definition:d,group,fixed:fixedBatch,leaves,progress:0,target:false,manual:null};
}
export function animateDoor(door,dt,player=null){
 const d=door.definition;if(d.portal)return false;
 const near=player&&Math.hypot(player[0]-d.x,player[1]-d.z)<1.65;
 door.target=door.manual===null?Boolean(near):door.manual;
 const next=T.MathUtils.damp(door.progress,door.target?1:0,7,dt),changed=Math.abs(next-door.progress)>.0001;door.progress=next;
 for(const p of door.leaves){if(d.sliding)p.hinge.position.x=p.closedX-p.direction*p.width*next;else p.hinge.rotation.y=d.sign*p.direction*next*Math.PI*.48;}
 if(!near&&door.manual===true)door.manual=null;return changed;
}
export function closedDoorSegments(doors){
 const result=[];for(const door of doors){if(door.definition.portal||door.progress>.82)continue;const d=door.definition,half=(d.width-.04)/2,c=Math.cos(d.rotation),s=Math.sin(d.rotation);result.push([d.x-half*c,d.z+half*s,d.x+half*c,d.z-half*s]);}return result;
}
export function planWindows(floor){
 const windows=[],[dx,dz]=FLOOR_OFFSETS[floor];
 for(const r of ROOMS.filter(r=>r.floor===floor&&r.type!=='corridor')){
  let side=null;const [x0,z0,x1,z1]=r.bounds;
  if(floor===1&&Math.abs(z0+7.64)<.05)side='N';
  else if(floor===1&&Math.abs(z1-7.75)<.05&&r.id!=='service-access')side='S';
  else if(floor===1&&Math.abs(z1-18.9)<.05)side='S';
  else if(floor===2&&Math.abs(z0-(-5.24+dz))<.05)side='N';
  else if(floor===2&&Math.abs(z1-(5.25+dz))<.05)side='S';
  if(!side||r.type==='server')continue;
  const count=x1-x0>5?2:1;
  for(let i=0;i<count;i++){const width=Math.min(1.18,(x1-x0)/count-.55),x=x0+(i+.5)*(x1-x0)/count,z=side==='N'?z0-.065:z1+.065;
   if(width>.5)windows.push({id:`window-${r.id}-${i}`,room:r.id,floor,x,z,width,height:['toilet','operation'].includes(r.type)?.45:.95,y:['toilet','operation'].includes(r.type)?2.35:1.84,side,frosted:['toilet','operation'].includes(r.type)});
  }
 }return windows;
}
export function windowCutters(windows){return windows.map(w=>({min:[w.x-w.width/2,w.y-w.height/2,w.z-.23],max:[w.x+w.width/2,w.y+w.height/2,w.z+.23]}));}
// Subtract axis-aligned aperture volumes from triangles. Retains all exterior
// polygon pieces, including the top/bottom wall bands around real windows.
export function subtractBoxes(geometry,cutters){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone(),p=g.attributes.position,n=g.attributes.normal,out=[],norm=[];
 const split=(poly,axis,value,sign)=>{
  const inside=[],outside=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-value)*sign,db=(b.p[axis]-value)*sign,ina=da>=-1e-8,inb=db>=-1e-8;
   (ina?inside:outside).push(a);if(ina!==inb){const t=da/(da-db),v={p:a.p.map((x,j)=>x+(b.p[j]-x)*t),n:a.n.map((x,j)=>x+(b.n[j]-x)*t)};inside.push(v);outside.push(v);}}
  return {inside,outside};
 };
 for(let i=0;i<p.count;i+=3){
  let polys=[[0,1,2].map(k=>({p:[p.getX(i+k),p.getY(i+k),p.getZ(i+k)],n:[n.getX(i+k),n.getY(i+k),n.getZ(i+k)]}))];
  for(const box of cutters){const next=[];
   for(const poly of polys){if([0,1,2].some(axis=>Math.max(...poly.map(v=>v.p[axis]))<box.min[axis]||Math.min(...poly.map(v=>v.p[axis]))>box.max[axis])){next.push(poly);continue;}
    let remaining=poly;for(const [axis,value,sign]of [[0,box.min[0],1],[0,box.max[0],-1],[1,box.min[1],1],[1,box.max[1],-1],[2,box.min[2],1],[2,box.max[2],-1]]){
     if(remaining.length<3)break;const s=split(remaining,axis,value,sign);if(s.outside.length>=3)next.push(s.outside);remaining=s.inside;
    }
   }polys=next;
  }
  for(const poly of polys)for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){out.push(...v.p);norm.push(...v.n);}
 }
 g.dispose();const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(out,3));result.setAttribute('normal',new T.Float32BufferAttribute(norm,3));result.setIndex(Array.from({length:out.length/3},(_,i)=>i));result.computeBoundingBox();return result;
}
export function createWindow(w){
 const group=new T.Group();group.position.set(w.x,w.y,w.z);
 for(const x of [-w.width/2-.025,w.width/2+.025])box(group,x,0,0,.05,w.height+.1,.16,0xd8e2dd,'steel');
 for(const y of [-w.height/2-.025,w.height/2+.025])box(group,0,y,0,w.width+.1,.05,.16,0xd8e2dd,'steel');
 box(group,0,0,0,w.width-.02,w.height-.02,.016,w.frosted?0xb4cdcc:0x94b7c4,'glass');box(group,0,-w.height/2-.06,0,w.width+.15,.055,.25,0xe1e6de,'ceramic');
 box(group,0,0,0,.027,w.height,.08,METAL,'steel');return group;
}
const METAL=0x9baeb3;

export function buildServiceArchitecture(materials=[]){
 const service=new T.Group();service.name='Back office constructed walls';
 for(const [x,z,a,b]of SERVICE_WALLS)box(service,(x+a)/2,WALL_HEIGHT/2,(z+b)/2,Math.abs(a-x)+.1,WALL_HEIGHT,Math.abs(b-z)+.1,0xe6e8e3,'plaster',0);
 for(const d of SERVICE_DOORWAYS)box(service,d.x,(2.25+WALL_HEIGHT)/2,d.z,d.rotation===0?d.width+.1:.1,WALL_HEIGHT-2.25,d.rotation===0?.1:d.width+.1,0xe6e8e3,'plaster',0);
 const cutters=windowCutters(planWindows(1)),clones=new Map();
 service.traverse(o=>{if(o.isMesh){const old=o.geometry;o.geometry=subtractBoxes(old,cutters.map(b=>({min:b.min.map((v,i)=>v-o.position.getComponent(i)),max:b.max.map((v,i)=>v-o.position.getComponent(i))})));old.dispose();addPlanarUVs(o.geometry);const base=o.material;let m=clones.get(base.uuid);if(!m){m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;clones.set(base.uuid,m);materials.push(m);}o.material=m;}});
 return mergeStatic(service);
}
