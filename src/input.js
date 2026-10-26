import {isDirectCamera} from './camera-rig.js';
// Pointer state is shared by mouse, pen and touch. A pinch/drag never selects a device.
export class ScenePointers{
 constructor(){this.points=new Map();this.blockTap=false;this.lookPointer=null;}
 begin(e,walk=false){if(!this.points.size)this.blockTap=false;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,distance:0,time:e.timeStamp||0});if(this.points.size>1)this.blockTap=true;if(walk&&this.lookPointer===null)this.lookPointer=e.pointerId;}
 move(e){const p=this.points.get(e.pointerId);if(!p)return null;const delta={x:e.clientX-p.lastX,y:e.clientY-p.lastY};p.distance=Math.max(p.distance,Math.hypot(e.clientX-p.x,e.clientY-p.y));p.lastX=e.clientX;p.lastY=e.clientY;return this.lookPointer===e.pointerId?delta:null;}
 end(e){const p=this.points.get(e.pointerId),pick=Boolean(p&&!this.blockTap&&p.distance<8&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<8&&(e.timeStamp||0)-p.time<650);this.points.delete(e.pointerId);if(this.lookPointer===e.pointerId)this.lookPointer=null;return pick;}
 cancel(id){if(id===undefined){this.points.clear();this.lookPointer=null;}else{this.points.delete(id);if(this.lookPointer===id)this.lookPointer=null;}this.blockTap=true;}
}
export function stickVector(dx,dy,radius=42,deadZone=.12){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||radius<=0)return {right:0,forward:0,x:0,y:0};
 const length=Math.hypot(dx,dy),distance=Math.min(1,length/radius),scale=length?Math.min(radius,length)/length:0,amount=distance<=deadZone?0:(distance-deadZone)/(1-deadZone);
 return {right:amount?dx/length*amount:0,forward:amount?-dy/length*amount:0,x:dx*scale,y:dy*scale};
}
export function movementVector(keys={},touch={}){
 let forward=Number(Boolean(keys.KeyW||keys.ArrowUp))-Number(Boolean(keys.KeyS||keys.ArrowDown))+(touch.forward||0),right=Number(Boolean(keys.KeyD||keys.ArrowRight))-Number(Boolean(keys.KeyA||keys.ArrowLeft))+(touch.right||0);const length=Math.max(1,Math.hypot(forward,right));return {forward:forward/length,right:right/length};
}
export function bindTouchStick(world,doc=document){
 const zone=doc.querySelector('#touch-joystick'),thumb=doc.querySelector('#joystick-thumb');let pointer=null;const lifts=new Map(),syncLift=()=>{world.touchLift=Math.max(-1,Math.min(1,[...lifts.values()].reduce((s,v)=>s+v,0)));};
 const reset=()=>{pointer=null;world.touchMove={forward:0,right:0};if(thumb)thumb.style.transform='translate(-50%, -50%)';zone?.setAttribute('data-active','false');};
 const move=e=>{if(e.pointerId!==pointer)return;e.preventDefault();const r=zone.getBoundingClientRect(),v=stickVector(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,Math.max(20,r.width/2-24));world.touchMove={forward:v.forward,right:v.right};thumb.style.transform=`translate(calc(-50% + ${v.x}px), calc(-50% + ${v.y}px))`;};
 zone?.addEventListener('pointerdown',e=>{if(pointer!==null||!isDirectCamera(world.mode))return;e.preventDefault();pointer=e.pointerId;zone.setPointerCapture(pointer);zone.setAttribute('data-active','true');move(e);});zone?.addEventListener('pointermove',move);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])zone?.addEventListener(type,e=>{if(e.pointerId===pointer)reset();});
 for(const [id,lift]of [['drone-up',1],['drone-down',-1]]){const b=doc.querySelector('#'+id);b?.addEventListener('pointerdown',e=>{if(world.mode!=='drone')return;e.preventDefault();b.setPointerCapture(e.pointerId);lifts.set(e.pointerId,lift);syncLift();});for(const type of ['pointerup','pointercancel','lostpointercapture'])b?.addEventListener(type,e=>{lifts.delete(e.pointerId);syncLift();});}
 doc.querySelector('#touch-inspect')?.addEventListener('click',()=>world.inspectNearest());reset();return {reset(){reset();lifts.clear();world.touchLift=0;}};
}
export function renderBudget(width,height,dpr=1,quality='normal',coarse=false){const cap={eco:1,normal:coarse?1.25:1.35,high:coarse?1.6:2}[quality]||1.35,budget=coarse?1500000:4500000;return Math.min(dpr||1,cap,Math.sqrt(budget/Math.max(1,width*height)));}
// Keep labels readable on compact screens; all rooms remain reachable from the map/list.
export function compactLabels(items,width,height,{top=116,bottom=18,limit=8}={}){
 const chosen=[];for(const p of [...items].sort((a,b)=>(b.selected?100:0)+(b.device?10:0)-(a.selected?100:0)-(a.device?10:0)||a.distance-b.distance)){
  const w=p.device?44:Math.min(156,Math.max(64,p.name.length*6+16)),h=44,box=[p.x-w/2,p.y-h/2,p.x+w/2,p.y+h/2];if(box[0]<6||box[2]>width-6||box[1]<top||box[3]>height-bottom)continue;
  if(chosen.some(q=>box[0]<q.box[2]+5&&box[2]>q.box[0]-5&&box[1]<q.box[3]+5&&box[3]>q.box[1]-5))continue;chosen.push({...p,box});if(chosen.length>=limit)break;
 }return new Set(chosen.map(p=>p.id));
}
