import * as T from '../vendor/three.module.js';
import {FLOORS,FLOOR_HEIGHT,ROOMS,elevation} from './data.js';
import {WALL_HEIGHT} from './architecture.js';
import {box,makeAsset} from './assets.js';
import {SERVICE_OPENING} from './installation.js';

// The second floor is narrower and projects north of L1 in the supplied plans.
// Only exposed L1 terraces need a roof; its occupied footprint uses the L2 slab.
export const FLOOR_FOOTPRINTS={
  1:[[-9.34,-7.85,13.29,7.96],[-13.12,-7.85,-9.34,-4.55]],
  2:[[...FLOORS[2].bounds]]
};
export const STAIR_OPENING=(()=>{const [x,z]=ROOMS.find(r=>r.id==='stairs-2').center;return [x-1.3,z-2.05,x+1.3,z+1.5];})();
export function subtractRect(rect,cut){
  const [x,z,a,b]=rect,[cx,cz,ca,cb]=cut,ix=Math.max(x,cx),iz=Math.max(z,cz),ia=Math.min(a,ca),ib=Math.min(b,cb);
  if(ix>=ia||iz>=ib)return [[...rect]];
  return [[x,z,ix,b],[ia,z,a,b],[ix,z,ia,iz],[ix,ib,ia,b]].filter(([x,z,a,b])=>a-x>.001&&b-z>.001);
}
export const ROOF_RECTS={1:FLOOR_FOOTPRINTS[1].flatMap(r=>subtractRect(r,FLOORS[2].bounds)),2:FLOOR_FOOTPRINTS[2]};
function deck(group,r,y,h,color,profile='paint'){
  const [x,z,a,b]=r;box(group,(x+a)/2,y,(z+b)/2,a-x,h,b-z,color,profile,0);
}
export function buildFloorSlab(floor){
  const group=new T.Group();group.name=`Structural slab L${floor}`;
  for(const rect of FLOOR_FOOTPRINTS[floor]){
    const pieces=floor===2?subtractRect(rect,STAIR_OPENING).flatMap(r=>subtractRect(r,SERVICE_OPENING)):[rect];
    for(const r of pieces)deck(group,r,-.12,.24,0xe7ede3);
  }
  return group;
}
export function buildBuildingEnvelope(floor){
  const roof=new T.Group(),fascia=new T.Group();roof.name=`Exposed roof L${floor}`;fascia.name=`Continuous perimeter fascia L${floor}`;
  for(const r of ROOF_RECTS[floor])deck(roof,r,FLOOR_HEIGHT-.16,.18,floor===1?0x8b9b98:0x7e8d8c,'rubber');
  // Close the plenum from the wall head into the structural deck. Internal
  // rooms retain full ceiling clearance; no new floor obstacle is introduced.
  const top=floor===1?FLOOR_HEIGHT:FLOOR_HEIGHT-.07,bottom=WALL_HEIGHT-.04,h=top-bottom;
  for(const [x,z,a,b]of FLOOR_FOOTPRINTS[floor]){
    for(const px of [x+.045,a-.045])box(fascia,px,(top+bottom)/2,(z+b)/2,.15,h,b-z,0xd1dad5,'plaster',0);
    for(const pz of [z+.045,b-.045])box(fascia,(x+a)/2,(top+bottom)/2,pz,a-x,h,.15,0xd1dad5,'plaster',0);
  }
  if(floor===2){
    const b=FLOORS[2].bounds;
    for(const x of [b[0]+.07,b[2]-.07])box(roof,x,FLOOR_HEIGHT+.01,(b[1]+b[3])/2,.14,.28,b[3]-b[1],0xd1dad5,'plaster');
    for(const z of [b[1]+.07,b[3]-.07])box(roof,(b[0]+b[2])/2,FLOOR_HEIGHT+.01,z,b[2]-b[0],.28,.14,0xd1dad5,'plaster');
    for(const x of [b[0]+3,b[0]+5]){const hvac=makeAsset('rooftop-hvac');hvac.position.set(x,FLOOR_HEIGHT-.06,b[3]-1.4);roof.add(hvac);}
  }
  return {roof,fascia};
}

export function viewBounds(floor='all',campus=false){
  if(campus)return new T.Box3(new T.Vector3(-26,-.28,-18),new T.Vector3(24,9,20));
  if(floor==='all')return new T.Box3(new T.Vector3(-13.3,-.24,-8.75),new T.Vector3(13.5,7.6,8.1));
  const [x,z,a,b]=FLOORS[floor].bounds,y=elevation(floor);return new T.Box3(new T.Vector3(x-.1,y-.24,z-.1),new T.Vector3(a+.1,y+3.4,b+.1));
}
// Fit all eight corners in both axes, including tall/portrait viewports.
export function fittedView(bounds,aspect,direction=[-1,.72,.85],fov=43,padding=1.14){
  const target=bounds.getCenter(new T.Vector3()),out=new T.Vector3(...direction).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),out).normalize(),up=new T.Vector3().crossVectors(out,right);
  const tanV=Math.tan(T.MathUtils.degToRad(fov/2)),tanH=tanV*Math.max(.1,aspect);let distance=0;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new T.Vector3(x,y,z).sub(target);distance=Math.max(distance,p.dot(out)+Math.max(Math.abs(p.dot(right))*padding/tanH,Math.abs(p.dot(up))*padding/tanV));
  }
  return {target,position:target.clone().addScaledVector(out,distance),distance};
}
