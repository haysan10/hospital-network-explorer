import {canStand} from './engine.js';
// A small deterministic grid is used for layout validation, never to move the
// avatar. Final routes are replayed through the application's movement physics.
export function navigationGrid(bounds,walls,obstacles,radius=.2,step=.075){
  const touches=b=>b[0]<=bounds[2]+radius&&b[2]>=bounds[0]-radius&&b[1]<=bounds[3]+radius&&b[3]>=bounds[1]-radius;
  walls=walls.filter(s=>touches([Math.min(s[0],s[2]),Math.min(s[1],s[3]),Math.max(s[0],s[2]),Math.max(s[1],s[3])]));obstacles=obstacles.filter(touches);
  const nx=Math.ceil((bounds[2]-bounds[0])/step)+1,nz=Math.ceil((bounds[3]-bounds[1])/step)+1;
  const points=Array.from({length:nx*nz},(_,i)=>[bounds[0]+(i%nx)*step,bounds[1]+Math.floor(i/nx)*step]);
  const valid=points.map(p=>canStand(...p,bounds,walls,radius,obstacles));
  const neighbors=points.map((p,i)=>valid[i]?[i%nx>0?i-1:-1,i%nx<nx-1?i+1:-1,i-nx,i+nx].filter(j=>j>=0&&j<points.length&&valid[j]&&canStand(...p.map((v,k)=>(v+points[j][k])/2),bounds,walls,radius,obstacles)):[]);
  const components=new Int32Array(points.length).fill(-1);let component=0;
  for(let i=0;i<points.length;i++)if(valid[i]&&components[i]<0){const queue=[i];components[i]=component;for(let k=0;k<queue.length;k++)for(const j of neighbors[queue[k]])if(components[j]<0){components[j]=component;queue.push(j);}component++;}
  const nearest=p=>{let best=-1,distance=.16;for(let i=0;i<points.length;i++)if(valid[i]){const dist=Math.hypot(points[i][0]-p[0],points[i][1]-p[1]);if(dist<distance){distance=dist;best=i;}}return best;};
  function path(start,end){
    if(!canStand(...start,bounds,walls,radius,obstacles)||!canStand(...end,bounds,walls,radius,obstacles))return null;
    const clear=route=>route.slice(1).every((p,i)=>{const a=route[i],n=Math.ceil(Math.hypot(p[0]-a[0],p[1]-a[1])/.035);for(let k=0;k<=n;k++)if(!canStand(...a.map((v,j)=>v+(p[j]-v)*(n?k/n:0)),bounds,walls,radius,obstacles))return false;return true;});
    for(const elbow of [[end[0],start[1]],[start[0],end[1]]]){const direct=[start,elbow,end];if(clear(direct))return direct;}
    const a=nearest(start),b=nearest(end);if(a<0||b<0)return null;
    const parents=new Int32Array(points.length).fill(-1),queue=[a];parents[a]=a;
    for(let q=0;q<queue.length&&parents[b]<0;q++){
      const i=queue[q];for(const j of neighbors[i]){
        if(parents[j]>=0)continue;
        parents[j]=i;queue.push(j);
      }
    }
    if(parents[b]<0)return null;
    const route=[];for(let i=b;;i=parents[i]){route.push(points[i]);if(i===a)break;}route.reverse();
    const compact=[start];for(let i=1;i<route.length-1;i++){const a=route[i-1],b=route[i],c=route[i+1];if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))>1e-8)compact.push(b);}
    compact.push(route.at(-1),end);return compact;
  }
  return {path,points,valid,components,componentAt:p=>{const i=nearest(p);return i<0?-1:components[i];}};
}
export function roomDoorPoint(d,r,depth=.34){
  const h=d.rotation===0,[x0,z0,x1,z1]=r.bounds;
  if(h)return [d.x,d.z+(Math.abs(d.z-z0)<Math.abs(d.z-z1)?depth:-depth)];
  return [d.x+(Math.abs(d.x-x0)<Math.abs(d.x-x1)?depth:-depth),d.z];
}
export function pathRectangles(path,halfWidth=.21){
  return path.slice(1).map((p,i)=>[Math.min(path[i][0],p[0])-halfWidth,Math.min(path[i][1],p[1])-halfWidth,Math.max(path[i][0],p[0])+halfWidth,Math.max(path[i][1],p[1])+halfWidth]);
}
export function equipmentAccessPoints(b,wallMounted=false){
  const [x0,z0,x1,z1]=b,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const points=[[cx,z0-.26],[cx,z1+.26],[x0-.26,cz],[x1+.26,cz],[x0-.26,z0+.23],[x1+.26,z0+.23],[x0+.23,z1+.26],[x1-.23,z1+.26]];
  if(wallMounted)for(const reach of [.6,.85,1.05])points.push([cx,z0-reach],[cx,z1+reach],[x0-reach,cz],[x1+reach,cz]);return points;
}
export function accessHubs(grid,center,entrances){
  const components=new Set(entrances.map(p=>grid.componentAt(p)).filter(c=>c>=0)),hubs=[];
  for(const component of components){const points=grid.points.filter((p,i)=>grid.valid[i]&&grid.components[i]===component);points.sort((a,b)=>Math.hypot(a[0]-center[0],a[1]-center[1])-Math.hypot(b[0]-center[0],b[1]-center[1]));if(points[0])hubs.push(points[0]);}return hubs;
}
