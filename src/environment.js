import {FRONT_OFFICE,prepareWallSegments,overlapsRect} from './circulation.js';
import * as T from '../vendor/three.module.js';
import {ROOMS,terminalOutlet} from './data.js';
import {makeAsset,box,mergeStatic,material} from './assets.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds,placementObstacles} from './layout.js';
import {PALETTE,ROOM_ACCENTS,floorMaterial} from './materials.js';
import {CEILING_Y,sideRuns,findDoors,createDoor,planWindows,createWindow} from './architecture.js';
import {doorApproach,doorSweep,segmentIntersectsRect} from './door-access.js';
import {navigationGrid,roomDoorPoint,pathRectangles,equipmentAccessPoints,accessHubs} from './navigation.js';
import {ROOM_LIGHT_COLORS} from './lighting.js';
import {buildBuildingEnvelope} from './building-envelope.js';

const overlaps=(a,b,margin=.04)=>a[0]<b[2]+margin&&a[2]>b[0]-margin&&a[1]<b[3]+margin&&a[3]>b[1]-margin;
export const segmentHitsRect=segmentIntersectsRect;
export function makeSign(text,width=.8,color=PALETTE.teal,small='MEDILINK'){
 const group=new T.Group();box(group,0,0,0,width,.21,.025,color,'paint');
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,768,192);ctx.fillStyle='#f6f4ec';ctx.font='600 54px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,91,720);ctx.font='24px sans-serif';ctx.fillText(small,384,143,720);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;const face=new T.Mesh(new T.PlaneGeometry(width-.018,.192),new T.MeshStandardMaterial({map,roughness:.68}));face.position.z=.015;group.add(face);const back=face.clone();back.position.z=-.015;back.rotation.y=Math.PI;group.add(back);
 }
 group.userData.signText=text;return group;
}
function floorArrow(group,x,z,rotation){
 const shape=new T.Shape();shape.moveTo(-.16,-.045);shape.lineTo(.015,-.045);shape.lineTo(.015,-.115);shape.lineTo(.2,0);shape.lineTo(.015,.115);shape.lineTo(.015,.045);shape.lineTo(-.16,.045);shape.closePath();
 const geo=new T.ShapeGeometry(shape);geo.computeTangents();const arrow=new T.Mesh(geo,material(0x588b85,0,'vinyl'));arrow.rotation.x=-Math.PI/2;arrow.rotation.z=rotation;arrow.position.set(x,.024,z);group.add(arrow);
}
function rectSlab(group,bounds,y,thickness,color,profile='paint',hole=null){
 const [x0,z0,x1,z1]=bounds,rect=(a,b,c,d)=>{if(c-a>.01&&d-b>.01)box(group,(a+c)/2,y,(b+d)/2,c-a,thickness,d-b,color,profile);};
 if(!hole){rect(x0,z0,x1,z1);return;}
 const [a,b,c,d]=hole;rect(x0,z0,a,z1);rect(c,z0,x1,z1);rect(a,z0,c,b);rect(a,d,c,z1);
}
export function buildEnvironment(floor,walls){
 walls=prepareWallSegments(floor,walls);const arrivalObstacles=[],bodyObstacles=[];
 const root=new T.Group(),trim=new T.Group(),detail=new T.Group(),ceilings=new T.Group(),fixtures=new T.Group(),lightMaterials=new Map(),{roof,fascia}=buildBuildingEnvelope(floor);root.name=`Interior environment L${floor}`;
 const doors=findDoors(floor,walls).map(createDoor),windows=planWindows(floor),placements=[],skipped=[],lightPoints=[],roomSummary=[];
 const baseItems=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===floor),baseObstacles=baseItems.flatMap(placementObstacles);
 const occupied=baseItems.map(p=>({...p,bounds:placementBounds(p)}));
 const blockedDoorAreas=doors.flatMap(({definition:d})=>[doorApproach(d),...doorSweep(d)]);
 // Reserve continuous routes before adding any movable detail. Toilets may
 // contain separate men's/women's circulation components, each with its entry.
 const accessRoutes=[],accessAreas=[];
 for(const r of ROOMS.filter(r=>r.floor===floor&&r.type!=='stairs')){
  const entries=doors.filter(d=>!d.definition.stall&&(d.definition.rooms.includes(r.id)||r.type==='corridor'&&d.definition.x>r.bounds[0]&&d.definition.x<r.bounds[2]&&d.definition.z>r.bounds[1]-.2&&d.definition.z<r.bounds[3]+.2)).map(d=>roomDoorPoint(d.definition,r));
  if(r.type==='corridor')entries.push([r.bounds[0]+.3,r.center[1]],[r.bounds[2]-.3,r.center[1]]);
  const grid=navigationGrid(r.bounds.map((v,i)=>v+(i<2?-.1:.1)),walls,baseObstacles,.2),hubs=accessHubs(grid,r.center,entries);
  const destinations=entries.concat(doors.filter(d=>d.definition.stall&&d.definition.rooms.includes(r.id)).flatMap(({definition:d})=>[[d.x-.34,d.z],[d.x+.34,d.z]]));
  for(const item of occupied.filter(p=>p.room===r.id)){
    const point=equipmentAccessPoints(item.bounds,item.y>1.2).find(p=>hubs.some(h=>grid.path(h,p)));if(point)destinations.push(point);
  }
  for(const p of destinations){const path=hubs.map(h=>grid.path(h,p)).find(Boolean);if(path){accessRoutes.push({room:r.id,path});accessAreas.push(...pathRectangles(path));}}
 }
 function placeFloor(r,kind,target,rotation=0,scale=1){
  const model=makeAsset(kind);model.scale.setScalar(scale);const [x0,z0,x1,z1]=r.bounds,orientations=[rotation,rotation+Math.PI/2,rotation-Math.PI/2,rotation+Math.PI].map(a=>{model.rotation.y=a;return {rotation:a,local:new T.Box3().setFromObject(model,true)};});
  const candidates=[target];for(let radius=.2;radius<2.8;radius+=.2)for(let i=0;i<12;i++){const a=i*Math.PI/6;candidates.push([target[0]+Math.cos(a)*radius,target[1]+Math.sin(a)*radius]);}
  const fallback=[];for(let x=x0+.2;x<x1-.15;x+=.15)for(let z=z0+.2;z<z1-.15;z+=.15)fallback.push([x,z]);fallback.sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1]));candidates.push(...fallback);
  for(const [x,z]of candidates)for(const {rotation:a,local}of orientations){const b=[local.min.x+x,local.min.z+z,local.max.x+x,local.max.z+z];
   if(b[0]<x0+.035-1e-6||b[2]>x1-.035+1e-6||b[1]<z0+.035-1e-6||b[3]>z1-.035+1e-6)continue;
   if(floor===1&&FRONT_OFFICE.protectedZones.some(zone=>overlapsRect(b,zone.bounds,.05)))continue;
   if(occupied.some(o=>o.room===r.id&&overlaps(b,o.bounds))||blockedDoorAreas.some(area=>overlaps(b,area,.025))||accessAreas.some(area=>overlaps(b,area,.015)))continue;
   const inset=[b[0]+.02,b[1]+.02,b[2]-.02,b[3]-.02];if(walls.some(s=>segmentHitsRect(s,inset)))continue;
   model.rotation.y=a;model.position.set(x,0,z);detail.add(model);occupied.push({room:r.id,bounds:b});placements.push({kind,room:r.id,floor,x,z,y:0,rotation:a,scale,bounds:b,collidable:true});return model;
  }skipped.push({room:r.id,kind,reason:'No clear footprint without blocking doors or existing equipment'});return null;
 }
 function bodyBounds(o){const bounds=[];o.updateMatrixWorld(true);o.traverse(mesh=>{if(mesh.isMesh){const b=new T.Box3().setFromObject(mesh,true);if(b.min.y<1.95&&b.max.y>.15)bounds.push([b.min.x,b.min.z,b.max.x,b.max.z]);}});return bounds;}
 function elevated(r,kind,x,y,z,rotation=0,scale=1,parent=detail){
  const o=makeAsset(kind);o.position.set(x,y,z);o.rotation.y=rotation;o.scale.setScalar(scale);
  if(kind==='ceiling-light'){const color=ROOM_LIGHT_COLORS[r.type]||0xf0f6ee;o.traverse(mesh=>{if(mesh.isMesh&&mesh.material.emissive?.getHex()){const base=mesh.material,key=base.uuid+color;let m=lightMaterials.get(key);if(!m){m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;m.color.setHex(color);m.emissive.setHex(color);lightMaterials.set(key,m);}mesh.material=m;}});}
  if(kind==='privacy-curtain')for(const a of [rotation,rotation+Math.PI]){
   o.rotation.y=a;o.position.z=z+Math.cos(a)*.12;
   if(!bodyBounds(o).some(b=>blockedDoorAreas.concat(accessAreas).some(area=>overlaps(b,area,.015))))break;
  }
  const bodies=bodyBounds(o);bodyObstacles.push(...bodies);parent.add(o);placements.push({kind,room:r.id,floor,x:o.position.x,y,z:o.position.z,rotation:o.rotation.y,scale,collidable:false,bodyBounds:bodies});return o;
 }
 function wallObject(r,kind,side='N',target=r.center[0],height=2.42){
  const model=makeAsset(kind),local=new T.Box3().setFromObject(model,true),half=local.getSize(new T.Vector3()).x/2+.035;
  const runs=sideRuns(r,walls,true).filter(d=>d.side===side&&d.width>half*2).sort((a,b)=>Math.abs((a.start+a.end)/2-target)-Math.abs((b.start+b.end)/2-target));
  for(const d of runs){const candidates=[T.MathUtils.clamp(target,d.start+half,d.end-half)];for(let v=d.start+half;v<d.end-half;v+=.1)candidates.push(v);candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));
   for(const v of candidates){const x=d.h?v:d.k+(side==='W'?.055:-.055),z=d.h?d.k+(side==='N'?.055:-.055):v,rot={N:0,S:Math.PI,W:Math.PI/2,E:-Math.PI/2}[side];
    model.position.set(x,height,z);model.rotation.y=rot;
    if(bodyBounds(model).some(b=>blockedDoorAreas.concat(accessAreas).some(area=>overlaps(b,area,.015))))continue;
    return elevated(r,kind,x,height,z,rot);
   }
  }return null;
 }
 for(const r of ROOMS.filter(r=>r.floor===floor)){
  const [x0,z0,x1,z1]=r.bounds,[x,z]=r.center,accent=ROOM_ACCENTS[r.type]??PALETTE.blue,start=placements.length;
  // Acoustic ceiling panels, luminaires, diffusers, detector and sprinkler.
  if(!(r.type==='stairs'&&floor===1)){
   rectSlab(ceilings,[x0-.055,z0-.055,x1+.055,z1+.055],CEILING_Y+.04,.07,0xedece4,'ceiling');
   for(let gx=x0+.6;gx<x1;gx+=.6)box(ceilings,gx,CEILING_Y-.002,z,.009,.008,z1-z0,0xc4ceca,'steel');
   for(let gz=z0+.6;gz<z1;gz+=.6)box(ceilings,x,CEILING_Y-.002,gz,x1-x0,.008,.009,0xc4ceca,'steel');
   const count=r.type==='corridor'?Math.max(1,Math.floor((x1-x0)/3)):Math.min(3,Math.max(1,Math.ceil((x1-x0)*(z1-z0)/11)));
   for(let i=0;i<count;i++){const lx=x0+(i+.5)*(x1-x0)/count,lz=r.type==='corridor'?z:z0+(z1-z0)*.5;
    elevated(r,'ceiling-light',lx,CEILING_Y-.035,lz,0,1,fixtures);lightPoints.push({room:r.id,floor,x:lx,y:CEILING_Y-.18,z:lz,color:ROOM_LIGHT_COLORS[r.type]||0xf0f6ee});
   }
   elevated(r,'air-vent',x0+.43,CEILING_Y-.035,z0+.42,0,.8,fixtures);elevated(r,'smoke-detector',x1-.25,CEILING_Y-.045,z1-.26,0,1,fixtures);elevated(r,'sprinkler',x1-.4,CEILING_Y-.035,z0+.35,0,1,fixtures);
  }else{elevated(r,'ceiling-light',x0+.3,2.5,z0+.15,0,.65,detail);}
  // Lower wall protection, skirting and corridor handrails stop at every door.
  for(const run of sideRuns(r,walls,true)){
   const length=run.width-.04;if(length<.12)continue;const v=(run.start+run.end)/2,px=run.h?v:run.k+(run.side==='W'?.018:-.018),pz=run.h?run.k+(run.side==='N'?.018:-.018):v;
   box(trim,px,.07,pz,run.h?length:.025,.13,run.h?.025:length,0x647e7c,'rubber');
   box(trim,px,.62,pz,run.h?length:.018,1.04,run.h?.018:length,new T.Color(accent).lerp(new T.Color(PALETTE.ivory),.73).getHex(),'paint');
   if(r.type==='corridor')box(trim,px,.89,pz,run.h?length:.065,.07,run.h?.065:length,PALETTE.oak,'wood');
  }
  wallObject(r,'wall-clock','N',x1-.28,2.5);
  const roomDoors=doors.filter(d=>d.definition.rooms.includes(r.id));
  for(const door of roomDoors.filter(d=>d.definition.room===r.id&&!d.definition.stall)){const d=door.definition,sign=makeSign(d.label??r.name,Math.min(1.2,Math.max(.65,d.width)),accent,`LANTAI ${floor} · ${r.type==='stairs'?'AKSES VERTIKAL':'MEDILINK'}`);sign.position.set(d.x,2.47,d.z);sign.rotation.y={N:Math.PI,S:0,W:-Math.PI/2,E:Math.PI/2}[d.side];detail.add(sign);placements.push({kind:'room-sign',room:r.id,floor,x:d.x,y:2.47,z:d.z,collidable:false});}
  if(r.type==='corridor'){
   const sign=makeSign(floor===1?'IGD · POLIKLINIK →':'RAWAT INAP · ICU →',Math.min(1.15,z1-z0-.12),PALETTE.teal,'← TANGGA · PUSAT LAYANAN');sign.position.set(x,2.45,z);sign.rotation.y=-Math.PI/2;for(const px of [-.4,.4])box(sign,px,.26,0,.008,.32,.008,PALETTE.metal,'steel');detail.add(sign);
   for(const bx of [x0+.15,x1-.15])box(detail,bx,.026,z,.08,.005,z1-z0-.18,accent,'vinyl');
   wallObject(r,'fire-extinguisher','N',x0+.35,.64);
   if(r.id!=='circulation-west-2'){placeFloor(r,'waste-bin',[x1-.4,z0+.3]);if(r.id==='corridor-s')placeFloor(r,'water-dispenser',[x0+.45,z0+.26]);}
  }
  if(['ward','clinical','icu'].includes(r.type))for(const bed of FURNITURE.filter(p=>p.room===r.id&&p.kind==='bed')){
   wallObject(r,'bed-head-unit','N',bed.x,1.2);placeFloor(r,'bedside-table',[bed.x+.83,z0+.65]);
   placeFloor(r,'iv-pole',[bed.x+.86,bed.z+.61]);elevated(r,'privacy-curtain',bed.x,0,bed.z,0,1,detail);
  }
  if(r.type==='icu'||['igd','poly','usg'].includes(r.id))placeFloor(r,r.id==='usg'?'ultrasound':'medicine-trolley',[x1-.5,z1-.48]);
  if(r.id==='rehab')placeFloor(r,'parallel-bars',[x1-.7,z1-1.0],0,.8);
  if(r.type==='lab'){
   const work=FURNITURE.find(p=>p.room===r.id&&p.kind==='worktop');if(work){elevated(r,'microscope',work.x-.23,.93,work.z);elevated(r,'test-tube-rack',work.x+.26,.93,work.z);}
   placeFloor(r,'waste-bin',[x0+.3,z1-.4]);
  }
  if(r.type==='pharmacy')placeFloor(r,'medicine-trolley',[x0+.45,z1-.48]);
  if(r.type==='storage')placeFloor(r,'medicine-trolley',[x0+.5,z1-.5]);
  if(r.type==='kitchen')placeFloor(r,'fridge',[x0+.4,z1-1.1]);
  if(r.type==='laundry')placeFloor(r,'hamper',[x1-.4,z0+1.55]);
  if(r.type==='toilet'){
   const sink=r.id!=='front-toilet'?placeFloor(r,'sink',r.floor===2?[x0+1.5,z0+.25]:[x,z0+.26]):null;
   if(r.id==='front-toilet'){wallObject(r,'mirror','W',z0+2.15,1.65);wallObject(r,'soap-dispenser','W',z0+2.57,1.15);}else if(sink){
    const side=Math.abs(Math.sin(sink.rotation.y))>.5?(Math.sin(sink.rotation.y)>0?'W':'E'):(Math.cos(sink.rotation.y)>0?'N':'S'),along=['N','S'].includes(side)?sink.position.x:sink.position.z;
    wallObject(r,'mirror',side,along,1.65);wallObject(r,'soap-dispenser',side,along+.43,1.15);
   }placeFloor(r,'waste-bin',[x1-.26,r.id==='front-toilet'?z0+1.2:z1-.35]);
  }
  if(r.type==='operation'){
   const table=FURNITURE.find(p=>p.room===r.id&&p.kind==='operating-table');if(table)elevated(r,'surgical-light',table.x,0,table.z,0,1,fixtures);
   if(!r.id.startsWith('ok-'))placeFloor(r,'medicine-trolley',[x1-.42,z1-.4]);
  }
  if(r.id==='doctors'){placeFloor(r,'sofa',[x0+.48,z0+1.2],Math.PI/2,.9);placeFloor(r,'plant',[x0+.35,z1-.35],0,.8);}
  if(r.id==='management'){placeFloor(r,'meeting-table',[x0+1.05,z0+1.65]);placeFloor(r,'chair',[x0+1.05,z0+2.5]);}
  if(r.id==='registration'){
   placeFloor(r,'plant',[x1-.32,z0+.4],0,.9);
   const c=FRONT_OFFICE.counter,sign=makeSign('PENDAFTARAN',1.65,PALETTE.teal,'LAYANAN DI SINI · RUANG TUNGGU DI KIRI');sign.position.set(c.x,2.32,c.z);sign.rotation.y=-Math.PI/2;for(const px of [-.6,.6])box(sign,px,.29,0,.008,.43,.008,PALETTE.metal,'steel');detail.add(sign);placements.push({kind:'front-office-wayfinding',room:r.id,floor,x:c.x,y:2.32,z:c.z,collidable:false});
   for(const [px,pz,rotation]of [[-8.6,-.1,0],[-7.4,-.1,0],[-8.05,-1.25,Math.PI/2],[-8.05,1.2,-Math.PI/2]])floorArrow(detail,px,pz,rotation);
  }
  if(r.id==='security')placeFloor(r,'waste-bin',[x0+.28,z0+.3]);
  if(r.id==='server-room')wallObject(r,'air-vent','S',x1-.6,2.35);
  if(r.type==='changing')placeFloor(r,'hamper',[x0+.3,z0+.3],0,.75);
  // Wall details stay outside the same door and circulation reservations.
  if(['registration','ward','office','corridor'].includes(r.type))wallObject(r,'wall-art',r.type==='corridor'?'S':'W',r.type==='corridor'?x:z0+1.9,1.65);
  if(r.type==='corridor')for(const px of [x0+1.35,x1-1.35])wallObject(r,'exit-sign','N',px,2.38);
  const terminal=DEVICE_PLACEMENTS.find(p=>p.room===r.id&&['pc','wall-terminal','reception-terminal'].includes(p.kind));
  if(terminal){const p=terminalOutlet(terminal),rot={N:0,S:Math.PI,W:Math.PI/2,E:-Math.PI/2,floor:0}[p.side],outlet=elevated(r,'data-outlet',p.x,p.y,p.z,rot);outlet.userData.endpoint=terminal.id;
   if(p.mount==='floor')outlet.rotation.x=-Math.PI/2;
   else{const h=3.08-p.y,normal={N:[0,-.035],S:[0,.035],W:[-.035,0],E:[.035,0]}[p.side];box(detail,p.x+normal[0],p.y+h/2,p.z+normal[1],['N','S'].includes(p.side)?.04:.025,h,['N','S'].includes(p.side)?.025:.04,0xd6ded4,'paint',.004);}
  }
  if(r.type==='server'||r.id==='nurse'){
   const rack=DEVICE_PLACEMENTS.find(p=>p.room===r.id&&['server','rack'].includes(p.kind));if(rack){const a=rack.rotation||0;elevated(r,'fiber-panel',rack.x+Math.sin(a)*.46,1.68,rack.z+Math.cos(a)*.46,a,1);}
  }
  roomSummary.push({id:r.id,name:r.name,floor,type:r.type,ceiling:!(r.type==='stairs'&&floor===1),openStairwell:r.type==='stairs'&&floor===1,lights:lightPoints.filter(p=>p.room===r.id).length,doors:roomDoors.length,detailCount:placements.length-start,accent:'#'+accent.toString(16)});
 }
 if(floor===1){
  const b=FRONT_OFFICE.arrivalBounds;rectSlab(detail,b,-.12,.24,0xcdd5ce,'paint');rectSlab(detail,b,.007,.025,floorMaterial(0xe4e1d5));
  rectSlab(roof,[-12.65,-2.15,-9.2,2.15],CEILING_Y+.14,.16,0xb4c3bd,'steel');rectSlab(ceilings,[-12.65,-2.15,-9.2,2.15],CEILING_Y+.04,.06,0xe9e9df,'paint');
  for(const px of [-12.45,-9.65])for(const pz of [-1.9,1.9]){box(trim,px,1.49,pz,.11,2.98,.11,PALETTE.metal,'steel');arrivalObstacles.push([px-.08,pz-.08,px+.08,pz+.08]);}
  for(const pz of [-1.75,1.75]){const plant=makeAsset('plant');plant.position.set(-11.5,0,pz);plant.scale.setScalar(1.15);detail.add(plant);arrivalObstacles.push([-11.8,pz-.31,-11.2,pz+.31]);}
  for(const pz of [-2.25,2.25])box(trim,-11.2,.12,pz,3.74,.24,.08,0x8fa49b,'paint');
  const entrySign=makeSign('MEDILINK · MASUK UTAMA',2.7,PALETTE.teal,'PENDAFTARAN →');entrySign.position.set(-12.45,2.58,-.1);entrySign.rotation.y=-Math.PI/2;detail.add(entrySign);
  for(const px of [-11.7,-10.1]){const lamp=makeAsset('ceiling-light');lamp.position.set(px,CEILING_Y-.035,-.1);fixtures.add(lamp);lightPoints.push({room:'arrival',floor:1,x:px,y:CEILING_Y-.18,z:-.1,color:0xffecd0});}
  for(const px of [-11.5,-10.3,-9.7])floorArrow(detail,px,-.1,0);
 }
 const windowsGroup=new T.Group();for(const w of windows)windowsGroup.add(createWindow(w));
 const batchedTrim=mergeStatic(trim),batchedDetails=mergeStatic(detail),batchedCeiling=mergeStatic(ceilings),batchedFixtures=mergeStatic(fixtures),batchedRoof=mergeStatic(roof),batchedFascia=mergeStatic(fascia);
 root.add(batchedTrim,batchedDetails,batchedCeiling,batchedFixtures,batchedRoof,batchedFascia,windowsGroup);for(const door of doors)root.add(door.group);
 // Clone only shell materials, so cutaway clipping never affects furniture.
 const luminaireMaterials=[];batchedFixtures.traverse(o=>{if(o.isMesh&&o.material.emissive?.getHex()){const clone=o.material.clone();clone.onBeforeCompile=o.material.onBeforeCompile;clone.customProgramCacheKey=o.material.customProgramCacheKey;o.material=clone;luminaireMaterials.push(clone);}});
 const shellMaterials=[],clones=new Map();for(const target of [batchedTrim,batchedFascia,windowsGroup,...doors.map(d=>d.group)])target.traverse(o=>{if(o.isMesh){if(!clones.has(o.material.uuid)){const clone=o.material.clone();clone.onBeforeCompile=o.material.onBeforeCompile;clone.customProgramCacheKey=o.material.customProgramCacheKey;clones.set(o.material.uuid,clone);shellMaterials.push(clone);}o.material=clones.get(o.material.uuid);}});
 return {root,trim:batchedTrim,details:batchedDetails,ceilings:batchedCeiling,fixtures:batchedFixtures,roof:batchedRoof,fascia:batchedFascia,windows:windowsGroup,windowDefinitions:windows,doors,placements,skipped,lightPoints,roomSummary,accessRoutes,shellMaterials,luminaireMaterials,obstacles:placements.filter(p=>p.collidable).map(p=>p.bounds).concat(bodyObstacles,arrivalObstacles)};
}
