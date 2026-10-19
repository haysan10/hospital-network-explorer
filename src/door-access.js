// Shared by decoration placement and the whole-building access audit.
// Widths are scene units; narrow reference openings retain their supplied size.
export function doorApproach(d){
  const width=d.stall?Math.min(.43,d.width-.12):Math.min(1.08,d.width-.08);
  const depth=d.portal&&d.rooms.some(id=>id.startsWith('stairs'))?.28:d.stall?.75:d.width<.85?.72:.95;
  return d.rotation===0?[d.x-width/2,d.z-depth,d.x+width/2,d.z+depth]:[d.x-depth,d.z-width/2,d.x+depth,d.z+width/2];
}
export const rectOverlaps=(a,b,pad=0)=>a[0]<b[2]+pad&&a[2]>b[0]-pad&&a[1]<b[3]+pad&&a[3]>b[1]-pad;
export function segmentIntersectsRect(s,b){
  let lo=0,hi=1;
  for(let axis=0;axis<2;axis++){
    const start=s[axis],delta=s[axis+2]-start,min=b[axis],max=b[axis+2];
    if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;}
    else{const a=(min-start)/delta,c=(max-start)/delta;lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));if(lo>hi)return false;}
  }return true;
}
// Closely sampled leaf envelopes, including outward travel of sliding leaves.
// Unlike a full square around a hinge, these keep space beside small stalls usable.
export function doorSweep(d){
  if(d.portal)return [];
  const count=d.width>.86?2:1,w=(d.width-.035)/count,result=[];
  for(let i=0;i<count;i++)for(let step=0;step<=24;step++){
    const t=step/24,direction=i===0?1:-1,hinge=(i===0?-d.width/2+.012:d.width/2-.012)-(d.sliding?direction*w*t:0);
    const angle=d.rotation+(d.sliding?0:d.sign*direction*t*Math.PI*.48),c=Math.cos(angle),s=Math.sin(angle),hc=Math.cos(d.rotation),hs=Math.sin(d.rotation);
    const x=d.x+hinge*hc,z=d.z-hinge*hs,xx=x+direction*w*c,zz=z-direction*w*s;
    // Door panel and handle reach; leaf thickness is 0.04.
    result.push([Math.min(x,xx)-.07,Math.min(z,zz)-.07,Math.max(x,xx)+.07,Math.max(z,zz)+.07]);
  }return result;
}
export const blocksDoor=(bounds,door)=>rectOverlaps(bounds,doorApproach(door),.025)||doorSweep(door).some(b=>rectOverlaps(bounds,b,.015));
