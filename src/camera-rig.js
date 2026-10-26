export const isGroundMode=mode=>mode==='walk'||mode==='third';
export const isDirectCamera=mode=>isGroundMode(mode)||mode==='drone';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Earliest intersection with an expanded rectangle; the player is already collision-safe.
function entry(a,b,rect){
 let lo=0,hi=1;for(const [axis,i]of [[0,0],[2,1]]){const d=b[axis]-a[axis],min=rect[i]-.14,max=rect[i+2]+.14;if(Math.abs(d)<1e-9){if(a[axis]<min||a[axis]>max)return null;}else{const p=(min-a[axis])/d,q=(max-a[axis])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return null;}}
 return lo;
}
export function resolveBoom(anchor,desired,walls=[],obstacles=[]){
 const rects=walls.map(([x,z,a,b])=>[Math.min(x,a),Math.min(z,b),Math.max(x,a),Math.max(z,b)]).concat(obstacles);let t=1;
 for(const rect of rects){const hit=entry(anchor,desired,rect);if(hit!==null)t=Math.min(t,hit);}
 const distance=Math.hypot(...desired.map((v,i)=>v-anchor[i]));t=clamp(t-(t<1?.08/Math.max(.01,distance):0),0,1);
 return t===1?[...desired]:anchor.map((v,i)=>v+(desired[i]-v)*t);
}
export function followPose(player,yaw,pitch,base=0,walls=[],obstacles=[],indoor=true){
 const anchor=[player[0],base+1.2,player[1]],p=clamp(pitch,-.58,.55),d=2.6;
 const desired=[anchor[0]+Math.sin(yaw)*Math.cos(p)*d,clamp(anchor[1]-Math.sin(p)*d+.25,base+.45,base+(indoor?2.7:3.3)),anchor[2]+Math.cos(yaw)*Math.cos(p)*d];
 return {anchor,eye:resolveBoom(anchor,desired,walls,obstacles)};
}
export function droneStep(position,yaw,forward,right,lift,dt,bounds,fast=false){
 const m=Math.max(1,Math.hypot(forward,right,lift)),speed=(fast?8:4.4)*Math.max(0,Math.min(dt,.05))/m;
 return [clamp(position[0]+(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed,bounds[0]+.3,bounds[2]-.3),clamp(position[1]+lift*speed,.4,36),clamp(position[2]+(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed,bounds[1]+.3,bounds[3]-.3)];
}
