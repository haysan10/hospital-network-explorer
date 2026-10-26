import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {ROOMS,FLOORS} from '../src/data.js';
import {prepareWallSegments} from '../src/circulation.js';
import {buildEnvironment} from '../src/environment.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementObstacles} from '../src/layout.js';
import {buildCampus} from '../src/campus.js';
import {canStand} from '../src/engine.js';
import {simulateWalk,routeSamples} from './audit-circulation.mjs';
export async function auditServiceFlow(){
 const campus=buildCampus(),walls=prepareWallSegments(1,JSON.parse(await readFile(new URL('../assets/collision-1.json',import.meta.url)))).concat(campus.barriers),environment=buildEnvironment(1,walls),obstacles=[...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===1).flatMap(placementObstacles).concat(environment.obstacles,campus.obstacles);
 const definitions=[
  {id:'staff-kitchen',width:.8,points:[[6.65,2.72],[6.65,12.65],[2.75,12.65],[2.75,14.7]]},
  {id:'staff-maintenance',width:.8,points:[[6.65,12.65],[-7.35,12.65],[-7.35,15]]},
  {id:'staff-calibration',width:.8,points:[[6.65,12.65],[-3.65,12.65],[-3.65,15]]},
  {id:'clean-linen',width:.8,points:[[6.65,12.65],[11,12.65],[11,15]]},
  {id:'maintenance-receiving-west',width:.8,points:[[-9.8,16.2],[-8.3,16.2]]},
  {id:'food-delivery-rear',width:.8,points:[[2.75,19.2],[2.75,18]]},
  {id:'soiled-linen-rear',width:.8,points:[[7.65,19.2],[7.65,18]]},
  {id:'clean-linen-dispatch-east',width:.8,points:[[13.5,16.2],[12,16.2]]}
 ];
 const routes=definitions.map(r=>{const blocked=routeSamples(r.points).filter(p=>!canStand(...p,FLOORS[1].bounds,walls,r.width/2,obstacles));return {...r,blockedSamples:blocked.length,blockedPoints:blocked.slice(0,4),forward:simulateWalk(r.points,walls,obstacles,environment.doors).ok,reverse:simulateWalk([...r.points].reverse(),walls,obstacles,environment.doors).ok};});
 const issues=routes.filter(r=>r.blockedSamples||!r.forward||!r.reverse).map(r=>({id:r.id,problem:'Service route obstructed',...r}));
 return {version:'4.5.0',units:'illustrative scene units',rooms:ROOMS.filter(r=>['kitchen','laundry','ipsrs','linen-clean'].includes(r.id)).map(r=>({id:r.id,bounds:r.bounds})),routes,issues};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const report=await auditServiceFlow();if(process.argv.includes('--save'))await writeFile(new URL('../docs/service-flow-audit.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.issues.length)process.exitCode=1;}
