import {SERVICE_REPLACEMENT,SERVICE_WALLS} from './service-layout.js';
// Front-office layout contract: every visible opening, collision cut and
// protected visitor route is derived from these same coordinates.
export const FRONT_OFFICE={
 room:'registration',bounds:[-9.13,-2.1,-3.46,1.9],
 arrivalBounds:[-13.08,-2.25,-9.13,2.25],spawn:[-12.15,-.1],yaw:-Math.PI/2,
 counter:{x:-5.5,z:-.1,rotation:-Math.PI/2},terminal:{x:-5.42,z:-.1,rotation:Math.PI/2},
 waiting:{x:-6.25,z:-1.72,rotation:0},service:[-6.5,-.1],waitingAccess:[-6.65,-.98],
 doorways:[
  {id:'door-registration-main',side:'W',x:-9.13,z:-.1,width:1.8,label:'PINTU MASUK UTAMA'},
  {id:'door-registration-north',side:'N',x:-8.05,z:-2.1,width:1.4,label:'KORIDOR UTARA · IGD'},
  {id:'door-registration-south',side:'S',x:-8.05,z:1.9,width:1.4,label:'KORIDOR SELATAN'}
 ],
 protectedZones:[
  {id:'entry-landing',bounds:[-9.09,-.82,-6.15,.62]},
  {id:'north-south-spine',bounds:[-8.65,-3.64,-7.45,3.44]}
 ],
 routes:[
  {id:'arrival-service',name:'Pintu masuk → loket',width:1.2,points:[[-12.15,-.1],[-8.7,-.1],[-6.5,-.1]]},
  {id:'service-waiting',name:'Loket → ruang tunggu',width:.9,points:[[-6.5,-.1],[-6.65,-.98]]},
  {id:'service-north',name:'Loket → koridor utara',width:1.2,points:[[-6.5,-.1],[-8.05,-.1],[-8.05,-2.85]]},
  {id:'service-south',name:'Loket → koridor selatan',width:1.2,points:[[-6.5,-.1],[-8.05,-.1],[-8.05,2.7]]},
  {id:'staff-access',name:'Akses petugas ke belakang loket',width:.8,points:[[-8.05,2.7],[-8.05,.9],[-6.4,.9],[-6.4,1.4],[-3.98,1.4],[-3.98,-.1]]}
 ]
};
export const PHARMACY_LINK={id:'door-pharmacy-internal',room:'pharmacy-depot',rooms:['pharmacy-depot','pharmacy-store'],floor:1,side:'E',x:4.915,z:-5.45,width:1.1,rotation:Math.PI/2,label:'AKSES INTERNAL FARMASI',name:'Penghubung depo–gudang farmasi',portal:false,privacy:true,sliding:true,sign:1};
export function circulationCutters(floor){
 if(floor!==1)return [];
 return [SERVICE_REPLACEMENT,{min:[PHARMACY_LINK.x-.28,-.12,PHARMACY_LINK.z-.55],max:[PHARMACY_LINK.x+.28,2.25,PHARMACY_LINK.z+.55]},...FRONT_OFFICE.doorways.map(d=>({min:d.side==='W'?[d.x-.28,-.12,d.z-d.width/2]:[d.x-d.width/2,-.12,d.z-.28],max:d.side==='W'?[d.x+.28,2.25,d.z+d.width/2]:[d.x+d.width/2,2.25,d.z+.28]}))];
}
function subtractRect(segment,rect){
 let enter=0,leave=1;for(let axis=0;axis<2;axis++){
  const a=segment[axis],delta=segment[axis+2]-a;
  if(Math.abs(delta)<1e-10){if(a<rect[axis]||a>rect[axis+2])return [segment];}
  else{const t0=(rect[axis]-a)/delta,t1=(rect[axis+2]-a)/delta;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));if(enter>leave)return [segment];}
 }
 const at=t=>[segment[0]+(segment[2]-segment[0])*t,segment[1]+(segment[3]-segment[1])*t],result=[];
 if(enter>1e-6)result.push([...at(0),...at(enter)]);if(leave<1-1e-6)result.push([...at(leave),...at(1)]);return result.filter(s=>Math.hypot(s[2]-s[0],s[3]-s[1])>.002);
}
export function prepareWallSegments(floor,segments){
 let result=segments.filter(s=>floor!==1||!SERVICE_WALLS.some(t=>{
 const h=Math.abs(t[1]-t[3])<1e-8,axis=h?0:1,k=h?1:0;return Math.abs(s[k]-t[k])<1e-8&&Math.abs(s[k+2]-t[k])<1e-8&&Math.min(s[axis],s[axis+2])>=Math.min(t[axis],t[axis+2])-1e-8&&Math.max(s[axis],s[axis+2])<=Math.max(t[axis],t[axis+2])+1e-8;
 })).map(s=>[...s]);for(const c of circulationCutters(floor)){const r=[c.min[0],c.min[2],c.max[0],c.max[2]];result=result.flatMap(s=>subtractRect(s,r));}if(floor===1)result.push(...SERVICE_WALLS.map(s=>[...s]));return [...new Map(result.map(s=>[s.map(v=>v.toFixed(4)).join(','),s])).values()];
}
export const arrivalBarriers=[[-13.08,-2.25,-9.34,-2.25],[-13.08,2.25,-9.34,2.25]];
export const overlapsRect=(a,b,margin=0)=>a[0]<b[2]+margin&&a[2]>b[0]-margin&&a[1]<b[3]+margin&&a[3]>b[1]-margin;
