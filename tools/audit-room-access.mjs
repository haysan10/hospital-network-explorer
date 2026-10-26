import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three.module.js';
import {ROOMS,FLOORS,FLOOR_OFFSETS} from '../src/data.js';
import {makeAsset} from '../src/assets.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds,placementObstacles} from '../src/layout.js';
import {buildEnvironment} from '../src/environment.js';
import {prepareWallSegments} from '../src/circulation.js';
import {blocksDoor,doorApproach} from '../src/door-access.js';
import {navigationGrid,roomDoorPoint,equipmentAccessPoints,accessHubs} from '../src/navigation.js';
import {canStand} from '../src/engine.js';
import {simulateWalk,routeSamples} from './audit-circulation.mjs';

export function bodyBounds(p){
  const model=makeAsset(p.kind);model.position.set(p.x,p.y||0,p.z);model.rotation.y=p.rotation||0;model.scale.setScalar(p.scale||1);model.updateMatrixWorld(true);
  const result=[];model.traverse(o=>{if(o.isMesh){const b=new T.Box3().setFromObject(o,true);if(b.min.y<1.95&&b.max.y>.15)result.push([b.min.x,b.min.z,b.max.x,b.max.z]);}});return result;
}
export async function auditRoomAccess({includeGeometry=false}={}){
 const issues=[],floors=[];
 for(const floor of [1,2]){
  const [dx,dz]=FLOOR_OFFSETS[floor],walls=prepareWallSegments(floor,JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx)))),environment=buildEnvironment(floor,walls);
  const base=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===floor).map(p=>({...p,bounds:placementBounds(p)}));
  const items=base.concat(environment.placements.filter(p=>p.collidable)),obstacles=base.flatMap(placementObstacles).concat(environment.obstacles);
  const overhead=environment.placements.filter(p=>!p.collidable&&!['room-sign','front-office-wayfinding'].includes(p.kind)).flatMap(p=>bodyBounds(p).map(bounds=>({...p,bounds})));
  const doors=[];issues.push(...environment.skipped.map(p=>({...p,problem:'Required detail could not be placed'})));
  for(const {definition:d}of environment.doors){
    const loose=items.filter(p=>!['stairs','stair-landing'].includes(p.kind));
    for(const p of loose.filter(p=>blocksDoor(p.bounds,d)))issues.push({door:d.id,id:p.id||p.room+'-'+p.kind,problem:'Furnishing obstructs approach or moving leaf'});
    for(const p of overhead.filter(p=>blocksDoor(p.bounds,d)))issues.push({door:d.id,id:p.room+'-'+p.kind,problem:'Body-height fixture obstructs door'});
    const h=d.rotation===0,depth=d.portal&&d.room.startsWith('stairs')?.22:d.stall?.34:.52,points=h?[[d.x,d.z-depth],[d.x,d.z+depth]]:[[d.x-depth,d.z],[d.x+depth,d.z]];
    const blocked=routeSamples(points).filter(p=>!canStand(...p,FLOORS[floor].bounds,walls,.18,obstacles));
    const forward=simulateWalk(points,walls,obstacles,environment.doors,floor),reverse=simulateWalk([...points].reverse(),walls,obstacles,environment.doors,floor);
    doors.push({id:d.id,rooms:d.rooms,stall:Boolean(d.stall),portal:d.portal,approach:doorApproach(d),crossing:points,blockedSamples:blocked.length,forward:forward.ok,reverse:reverse.ok});
    if(blocked.length||!forward.ok||!reverse.ok)issues.push({door:d.id,problem:'Door crossing blocked',blocked:blocked.slice(0,2),forward,reverse});
  }
  const rooms=[];
  for(const r of ROOMS.filter(r=>r.floor===floor)){
    if(r.type==='stairs'){rooms.push({id:r.id,structuralStair:true,doors:doors.filter(d=>d.rooms.includes(r.id)).map(d=>d.id)});continue;}
    const inset=[r.bounds[0]-.1,r.bounds[1]-.1,r.bounds[2]+.1,r.bounds[3]+.1],grid=navigationGrid(inset,walls,obstacles,.19);
    const entries=environment.doors.filter(d=>!d.definition.stall&&d.definition.rooms.includes(r.id)).map(d=>roomDoorPoint(d.definition,r));
    if(r.type==='corridor')entries.push([r.bounds[0]+.3,r.center[1]],[r.bounds[2]-.3,r.center[1]]);
    const hubs=accessHubs(grid,r.center,entries),routes=[];if(!hubs.length){issues.push({room:r.id,problem:'No usable interior connected to entry'});continue;}
    for(const {definition:d}of environment.doors.filter(d=>d.definition.rooms.includes(r.id))){
      const points=d.stall?[[d.x-.34,d.z],[d.x+.34,d.z]]:[roomDoorPoint(d,r)];
      for(const p of points){const path=hubs.map(h=>grid.path(p,h)).find(Boolean),walk=path&&simulateWalk(path,walls,obstacles,environment.doors,floor),reverse=path&&simulateWalk([...path].reverse(),walls,obstacles,environment.doors,floor);routes.push({door:d.id,from:p,path,forward:walk?.ok,reverse:reverse?.ok});if(!path||!walk.ok||!reverse.ok)issues.push({room:r.id,door:d.id,from:p,hubs,problem:'Door cannot reach room circulation area',walk,reverse});}
    }
    const equipment=[];for(const p of items.filter(p=>p.room===r.id)){
      const accessible=equipmentAccessPoints(p.bounds,p.y>1.2).map(q=>({point:q,path:hubs.map(h=>grid.path(h,q)).find(Boolean)})).find(q=>q.path);
      const walk=accessible&&simulateWalk(accessible.path,walls,obstacles,environment.doors,floor),reverse=accessible&&simulateWalk([...accessible.path].reverse(),walls,obstacles,environment.doors,floor);
      equipment.push({id:p.id||p.kind,kind:p.kind,point:accessible?.point,path:accessible?.path,forward:walk?.ok,reverse:reverse?.ok});if(!accessible||!walk.ok||!reverse.ok)issues.push({room:r.id,id:p.id||p.kind,problem:'Equipment has no reachable use side',walk,reverse});
    }
    rooms.push({id:r.id,hubs,routes,equipment});
  }
  floors.push({floor,doors,rooms,skipped:environment.skipped,...(includeGeometry?{walls,items,overhead}: {})});
 }
 return {version:'4.5.0',units:'illustrative scene units',floors,issues};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=await auditRoomAccess({includeGeometry:process.argv.includes('--geometry')});if(process.argv.includes('--save'))await writeFile(new URL('../docs/room-access-audit.json',import.meta.url),JSON.stringify(report,null,2));
 console.log(JSON.stringify({floors:report.floors.map(f=>({floor:f.floor,doors:f.doors.length,rooms:f.rooms.length,skipped:f.skipped})),issues:report.issues},null,2));if(report.issues.length)process.exitCode=1;
}
