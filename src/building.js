import * as T from '../vendor/three.module.js';
import {box,cylinder,mergeStatic,material} from './assets.js';
import {surface} from './surfaces.js';
import {FLOOR_HEIGHT,elevation,FLOORS} from './data.js';
import {STAIR_PATH} from './experience.js';
const steel=()=>surface(0x6d8989,'metal');
function beam(g,a,b,width=.045,color=0x738f8c){
  const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);
  const m=box(g,...va.clone().add(vb).multiplyScalar(.5).toArray(),width,delta.length(),width,color);
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function gable(g,x,y,z,width,depth,rise){
  const half=depth/2,slope=Math.atan2(rise,half),length=Math.hypot(half,rise);
  for(const side of [-1,1]){const panel=box(g,x,y+rise/2,z+side*half/2,width,.14,length,surface(0x365e62,'roof'));panel.rotation.x=side*slope;
    // Standing seams are actual shallow geometry and remain clear in overview.
    for(let sx=-width/2+.35;sx<width/2;sx+=.7){const seam=box(g,x+sx,y+rise/2+.08,z+side*half/2,.022,.026,length,surface(0x7d9e9c,'metal'));seam.rotation.x=side*slope;}
  }
  box(g,x,y+rise+.08,z,width,.12,.16,steel());
  for(const side of [-1,1]){
    const p=new Float32Array([x+side*width/2,y,z-depth/2,x+side*width/2,y+rise,z,x+side*width/2,y,z+depth/2]);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));geo.computeVertexNormals();const mat=material(0xe1e9de).clone();mat.side=T.DoubleSide;const cap=new T.Mesh(geo,mat);cap.castShadow=true;g.add(cap);
  }
  for(const side of [-1,1]){box(g,x,y-.07,z+side*half,width+.1,.14,.12,steel());}
}
export function makeRoof(floor){
  const g=new T.Group();g.name=`Roof L${floor}`;
  if(floor===2)gable(g,0,2.96,0,23.3,11.6,1.05);
  else{
    for(const side of [-1,1]){const m=box(g,1.98,2.94,side*6.88,23.22,.14,3.0,surface(0x50706d,'roof'));m.rotation.x=side*.12;box(g,1.98,2.7,side*8.35,23.28,.13,.11,steel());}
    box(g,12.2,2.98,0,2.7,.16,10.9,surface(0x50706d,'roof'));
    gable(g,-11.23,2.94,-6.15,4.1,3.8,.5);
  }
  return mergeStatic(g);
}
export function makeCeiling(floor){
  const g=new T.Group();g.name=`Ceiling L${floor}`;
  if(floor===1){box(g,1.975,2.97,.055,22.62,.16,15.8,surface(0xe4eae4,'plaster'));box(g,-11.23,2.97,-6.2,3.78,.16,3.3,surface(0xe4eae4,'plaster'));}
  else box(g,0,2.97,0,22.63,.16,10.9,surface(0xe4eae4,'plaster'));
  // Recessed luminous strips give the interior a finished ceiling.
  for(const z of floor===1?[-2.9,2.7]:[-.35])for(let x=-7.5;x<10;x+=3){box(g,x,2.875,z,1.5,.025,.12,material(0xf2fff8,0xd2eddf));}
  return mergeStatic(g);
}
export function makeEnvelopeDetails(floor){
  const g=new T.Group(),b=FLOORS[floor].bounds;
  // Separate fascia and continuous skirting give both storeys a common scale.
  const x0=floor===1?-9.25:b[0],x1=b[2];
  for(const z of [b[1]-.035,b[3]+.035]){
    box(g,(x0+x1)/2,2.83,z,x1-x0,.28,.16,surface(0xe1e8df,'plaster'));
    box(g,(x0+x1)/2,.1,z,x1-x0,.15,.09,steel());
    for(let x=x0+.9;x<x1-.5;x+=2.7){
      const glass=new T.MeshStandardMaterial({color:0x96c9cc,roughness:.13,metalness:.3,transparent:true,opacity:.72});
      box(g,x,1.57,z,.98,.96,.045,glass);
      for(const sx of [-.53,0,.53])box(g,x+sx,1.57,z+.02,.035,1.05,.055,steel());
      for(const y of [1.05,2.08])box(g,x,y,z+.02,1.1,.035,.055,steel());
    }
  }
  const x=floor===1?13.2:11.25,z=floor===1?.6:2.3;
  for(const side of [-1,1])box(g,x,1.14,z+side*.5,.16,2.28,.07,steel());box(g,x,2.31,z,.16,.1,1.08,steel());
  return mergeStatic(g);
}
export function makeConnector(){
  const group=new T.Group();group.name='Continuous east stair wing';
  const structure=new T.Group();
  // Cantilevered bridge from the original stair rooms to one shared stair wing.
  box(structure,13, -.1,.6,2.9,.2,1.2,surface(0xc8d6cc,'tile'));
  box(structure,12.85,FLOOR_HEIGHT-.1,2.3,6.9,.2,1.2,surface(0xc8d6cc,'tile'));
  box(structure,15.15,FLOOR_HEIGHT/2-.1,4.2,3.0,.2,1.3,surface(0xc8d6cc,'tile'));
  box(structure,14.3,-.1,.1,1.15,.2,1.9,surface(0xc8d6cc,'tile'));
  box(structure,16,FLOOR_HEIGHT-.1,.9,1.15,.2,3.9,surface(0xc8d6cc,'tile'));
  const flights=[[STAIR_PATH[2],STAIR_PATH[3]],[STAIR_PATH[4],STAIR_PATH[5]]];
  for(const [a,b]of flights){
    const steps=12,dz=(b[2]-a[2])/steps,dy=(b[1]-a[1])/steps;
    for(let i=0;i<steps;i++){const y=a[1]+(i+1)*dy,z=a[2]+(i+.5)*dz;box(structure,a[0],y-.08,z,1.12,.16,Math.abs(dz)+.01,surface(0xc6d3ca,'tile'));box(structure,a[0],y+.008,z-Math.sign(dz)*Math.abs(dz)*.4,1.1,.018,.028,surface(0x6b8985,'metal'));}
    for(const side of [-1,1]){const x=a[0]+side*.59;beam(structure,[x,a[1]+.98,a[2]],[x,b[1]+.98,b[2]],.05);for(let i=0;i<=4;i++){const t=i/4;cylinder(structure,x,a[1]+(b[1]-a[1])*t+.49,a[2]+(b[2]-a[2])*t,.024,.98,0x819da4);}}
  }
  for(const [x,z]of [[13.65,-.9],[16.65,-.9],[13.65,4.85],[16.65,4.85]]){box(structure,x,(FLOOR_HEIGHT+2.8)/2,z,.12,FLOOR_HEIGHT+2.8,.12,steel());}
  for(const y of [FLOOR_HEIGHT/2+.98,FLOOR_HEIGHT+.98])beam(structure,[13.7,y,4.82],[16.65,y,4.82],.05);
  for(const z of [1.69,2.91]){beam(structure,[11.28,FLOOR_HEIGHT+.98,z],[15.4,FLOOR_HEIGHT+.98,z],.05);for(let x=11.4;x<15.4;x+=1)cylinder(structure,x,FLOOR_HEIGHT+.49,z,.024,.98,0x819da4);}
  // Shared fiber riser: visible physical support for the original vertical link.
  box(structure,10.35,FLOOR_HEIGHT/2+2.6,1.4,.17,FLOOR_HEIGHT+.2,.17,surface(0xa5bcb5,'metal'));
  group.add(mergeStatic(structure));
  const glass=new T.MeshStandardMaterial({color:0xb8ddda,roughness:.14,metalness:.06,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});
  box(group,16.7,3.0,1.95,.025,6,5.7,glass);box(group,15.15,3.0,4.87,3.2,6,.025,glass);
  const roof=new T.Group();gable(roof,15.15,FLOOR_HEIGHT+2.82,1.95,3.8,6.3,.42);group.add(mergeStatic(roof));
  group.userData.roof=group.children.at(-1);return group;
}
// Subtract a doorway box from the supplied wall meshes. Splitting polygons,
// rather than deleting whole triangles, preserves the wall around the opening.
export function cutStairDoorway(architecture,floor){
  const boxBounds=floor===1?[12.9,-.1,.08,13.5,2.38,1.12]:[10.95,-.1,1.78,11.6,2.38,2.82];
  architecture.traverse(obj=>{
    if(!obj.isMesh)return;
    const original=obj.geometry,geo=original.index?original.toNonIndexed():original.clone(),pos=geo.attributes.position,norm=geo.attributes.normal;
    const positions=[],normals=[];
    function split(poly,axis,bound,sign){
      const inside=[],outside=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a.p[axis]-bound),db=sign*(b.p[axis]-bound),ia=da>=0,ib=db>=0;
        (ia?inside:outside).push(a);
        if(ia!==ib){const t=da/(da-db);const v={p:a.p.map((n,k)=>n+(b.p[k]-n)*t),n:a.n.map((n,k)=>n+(b.n[k]-n)*t)};inside.push(v);outside.push(v);}
      }
      return [inside,outside];
    }
    function emit(poly){for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]]){positions.push(...v.p);normals.push(...v.n);}}
    for(let i=0;i<pos.count;i+=3){
      let poly=[0,1,2].map(k=>({p:[pos.getX(i+k),pos.getY(i+k),pos.getZ(i+k)],n:norm?[norm.getX(i+k),norm.getY(i+k),norm.getZ(i+k)]:[0,1,0]}));
      for(const [axis,bound,sign]of [[0,boxBounds[0],1],[0,boxBounds[3],-1],[1,boxBounds[1],1],[1,boxBounds[4],-1],[2,boxBounds[2],1],[2,boxBounds[5],-1]]){
        if(poly.length<3)break;const [inside,outside]=split(poly,axis,bound,sign);if(outside.length>=3)emit(outside);poly=inside;
      }
    }
    const next=new T.BufferGeometry();next.setAttribute('position',new T.Float32BufferAttribute(positions,3));next.setAttribute('normal',new T.Float32BufferAttribute(normals,3));next.computeBoundingSphere();obj.geometry=next;geo.dispose();
  });
}
