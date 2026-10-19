import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import {FRONT_OFFICE,prepareWallSegments,arrivalBarriers,overlapsRect} from '../src/circulation.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds} from '../src/layout.js';
import {buildEnvironment} from '../src/environment.js';
import {FLOORS} from '../src/data.js';
import {canStand,moveWithCollision,distanceToSegment} from '../src/engine.js';
import {animateDoor,closedDoorSegments} from '../src/architecture.js';
export function routeSamples(points,step=.035){const result=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step));for(let j=0;j<=count;j++)result.push(a.map((v,k)=>v+(b[k]-v)*j/count));}return result;}
export function simulateWalk(points,segments,obstacles,doors,floor=1){
 let player=[...points[0]],frames=0;for(const d of doors){d.progress=0;d.manual=null;}
 for(const target of points.slice(1)){let attempts=0;while(Math.hypot(target[0]-player[0],target[1]-player[1])>.055&&attempts++<1800){
  for(const d of doors)animateDoor(d,1/60,player);
  const length=Math.hypot(target[0]-player[0],target[1]-player[1]),step=Math.min(.045,length),dx=(target[0]-player[0])/length*step,dz=(target[1]-player[1])/length*step;
  player=moveWithCollision(player,dx,dz,FLOORS[floor].bounds,[...segments,...closedDoorSegments(doors)],obstacles);frames++;
 }if(attempts>=1800)return {ok:false,player,target,frames};}return {ok:true,player,frames};
}
export async function auditCirculation(){
 const raw=JSON.parse(await readFile(new URL('../assets/collision-1.json',import.meta.url))),walls=prepareWallSegments(1,raw),environment=buildEnvironment(1,walls),segments=[...walls,...arrivalBarriers];
 const base=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===1),obstacles=base.map(placementBounds).concat(environment.obstacles),issues=[],routes=[];
 for(const p of base.filter(p=>p.room==='registration'))for(const zone of FRONT_OFFICE.protectedZones)if(overlapsRect(placementBounds(p),zone.bounds))issues.push({id:p.id,problem:'Blocks protected arrival/circulation zone',zone:zone.id});
 for(const route of FRONT_OFFICE.routes){
  const samples=routeSamples(route.points),blocked=samples.filter(p=>!canStand(...p,FLOORS[1].bounds,segments,route.width/2,obstacles));
  const walk=simulateWalk(route.points,segments,obstacles,environment.doors),result={id:route.id,name:route.name,testedClearWidth:route.width,samples:samples.length,blockedSamples:blocked.length,walkCompleted:walk.ok,walkFrames:walk.frames};
  routes.push(result);if(blocked.length)issues.push({id:route.id,problem:'Insufficient clear width',points:blocked.slice(0,3)});if(!walk.ok)issues.push({id:route.id,problem:'Walk fails with automatic doors',...walk});
 }
 return {version:'4.0.0',units:'illustrative scene units',mainEntranceWidth:1.8,corridorDoorWidth:1.4,reservedZones:FRONT_OFFICE.protectedZones,routes,issues};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=await auditCirculation();if(process.argv.includes('--save'))await writeFile(new URL('../docs/circulation-audit.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.issues.length)process.exitCode=1;
}
