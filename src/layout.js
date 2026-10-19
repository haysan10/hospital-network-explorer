import {FRONT_OFFICE} from './circulation.js';
import {ROOMS,NETWORK} from './data.js';
// One reviewed placement schedule shared by rendering, collision and validation.
export const FOOTPRINTS={'registration-counter':[1.9,.7],'reception-terminal':[.68,1.22],bed:[1.06,2.06],pc:[1.08,1.3],chair:[.58,.57],'waiting-bench':[2.09,.49],'medical-monitor':[.42,.42],cabinet:[1.04,.42],shelf:[1.1,.45],washer:[.68,.66],plant:[.48,.48],'ct-scanner':[1.52,2.5],stairs:[2.51,3.94],'stair-landing':[2.51,3.5],toilet:[.4,.66],sink:[.68,.43],worktop:[1.1,.5],'reception-desk':[2.12,.68],'operating-table':[.62,1.62],'wall-terminal':[.62,.24],rack:[.7,.8],server:[.8,.8],ups:[.4,.61],switch:[.82,.43],router:[.82,.43],panel:[.4,.18]};
export function placementBounds(p){
  const [w,d]=FOOTPRINTS[p.kind]||[.45,.45],a=p.rotation||0,s=p.scale||1;
  const width=(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d)*s,depth=(Math.abs(Math.cos(a))*d+Math.abs(Math.sin(a))*w)*s;
  // A desk includes the chair extending toward its front (local +z).
  const shift=p.kind==='pc'?.32:p.kind==='reception-terminal'?.3:0,cx=p.x+Math.sin(a)*shift,cz=p.z+Math.cos(a)*shift;
  return [cx-width/2,cz-depth/2,cx+width/2,cz+depth/2];
}
// Handrails and flights are solid; the air between them is walkable.
export function placementObstacles(p){
  if(p.kind==='stair-landing')return [.07,1.23].map(x=>[p.x+x-.025,p.z-1.53,p.x+x+.025,p.z+1.78]);
  if(p.kind==='stairs')return [[p.x-1.26,p.z-1.48,p.x-.06,p.z+1.45],[p.x+.06,p.z-1.48,p.x+1.26,p.z+1.45],[p.x-1.26,p.z+1.36,p.x+1.26,p.z+2.02]];
  return [placementBounds(p)];
}
export const ROOM_LAYOUT=new Map();
for(const r of ROOMS){
  const [x0,z0,x1,z1]=r.bounds,[x,z]=r.center,items=[];
  const add=(kind,px,pz,rotation=0,scale=1)=>items.push({id:`${r.id}-${kind}-${items.length}`,room:r.id,floor:r.floor,kind,x:px,z:pz,rotation,scale});
  if(['ward','clinical','icu'].includes(r.type)){
    const xs=r.type==='icu'?[x0+.85,x0+2.95]:[x0+(r.type==='ward'?.75:.83)];
    for(const bx of xs){add('bed',bx,z0+1.32);if(r.type==='icu')add('medical-monitor',bx+.83,z0+.48);}
    // Storage at the foot of the bed, leaving the entry side clear.
    if(z1-z0>3.5)add('cabinet',x0+.63,z1-.36,Math.PI);
  }else if(r.type==='operation'){
    if(r.id.startsWith('ok-'))add('operating-table',x,z1-.4,Math.PI/2,.88);
    else {add('operating-table',x0+.4,z0+1.2);add('medical-monitor',x0+1.9,z1-.4);}
  }else if(r.type==='radiology')add('ct-scanner',x0+.75,z0+1.49,0,.9);
  else if(r.type==='laundry'){
    for(let i=0;i<3;i++)add('washer',x0+.44,z0+.6+i*.86,Math.PI/2);add('worktop',x0+.72,z1-.32,Math.PI);
  }else if(['storage','pharmacy','lab','kitchen'].includes(r.type)){
    const count=Math.min(3,Math.floor((x1-x0-1)/1.15));
    for(let i=0;i<count;i++){
      const west=r.type==='storage'||r.type==='kitchen';
      add(r.type==='storage'?'shelf':r.type==='lab'||r.type==='kitchen'?'worktop':'cabinet',west?x0+.32:r.id==='calibration'?x0+1.2:x0+.66+i*1.16,west?z0+.66+i*1.16:z0+.32,west?Math.PI/2:0);
    }
    if(r.type==='lab'||r.type==='kitchen')add('sink',x1-(r.id==='calibration'?.38:.48),r.id==='calibration'?z1-.42:z0+.3,r.id==='calibration'?Math.PI:0);
  }else if(r.type==='stairs')add(r.floor===1?'stairs':'stair-landing',x,z,Math.PI);
  else if(r.type==='changing')add('cabinet',x1-.55,z0+.25,0,.85);
  else if(r.type==='toilet'){
    // Toilets follow the existing stall walls rather than occupying the aisle.
    const local=(a,b)=>[x0+a,z0+b];
    if(r.id==='front-toilet'){add('toilet',...local(.83,.62));add('sink',...local(.235,2.15),Math.PI/2);}
    else if(r.floor===1){for(const [a,zs]of [[.39,[.2775,1.7525,3.165]],[4.73,[.235,1.6475,3.1225]]])for(const b of zs)add('toilet',...local(a,b),a<1?Math.PI/2:-Math.PI/2);}
    else {for(const [a,zs]of [[.34,[.2525,1.5525,3.68]],[4.29,[.2,1.575,3.68]]])for(const b of zs)add('toilet',...local(a,b),a<1?Math.PI/2:-Math.PI/2,b>3?.85:.9);}
  }else if(r.type==='registration'){
    const c=FRONT_OFFICE.counter,b=FRONT_OFFICE.waiting;add('registration-counter',c.x,c.z,c.rotation);items.at(-1).assembly='registration-workstation';add('waiting-bench',b.x,b.z,b.rotation);
  }else if(r.type==='nurse'){add('reception-desk',x0+1.05,z0+2.6);}
  else if(['office','security'].includes(r.type)&&x1-x0>3){add('cabinet',r.id==='doctors'?x1-.6:x0+.65,z0+.3);}
  if(r.id==='corridor-n')for(const bx of [-3.4,.8,8.9])add('waiting-bench',bx,z0+.29);
  if(r.id==='corridor-s')for(const bx of [-4.4,.85])add('waiting-bench',bx,z1-.29,Math.PI);
  if(r.id==='corridor-2'){add('waiting-bench',x0+4.61,z0+.29);add('waiting-bench',x0+8.41,z0+.29);add('waiting-bench',x0+5.91,z1-.29,Math.PI);}
  ROOM_LAYOUT.set(r.id,items);
}
export const FURNITURE=[...ROOM_LAYOUT.values()].flat();
export const DEVICE_PLACEMENTS=NETWORK.filter(n=>['pc','rack','server','ups','switch','router','panel'].includes(n.kind)).map(n=>({...n,kind:n.asset||n.kind,rotation:n.rotation||0,scale:1,assembly:n.id==='pc-registration'?'registration-workstation':undefined}));
