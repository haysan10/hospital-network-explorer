import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {ROOMS,FLOOR_OFFSETS} from '../src/data.js';
import {buildEnvironment,segmentHitsRect} from '../src/environment.js';
import {prepareWallSegments} from '../src/circulation.js';
import {makeAsset} from '../src/assets.js';
const floors=[],issues=[];
for(const floor of [1,2]){
 const [dx,dz]=FLOOR_OFFSETS[floor],walls=prepareWallSegments(floor,JSON.parse(await readFile(`assets/collision-${floor}.json`)).map(s=>s.map((v,i)=>v+(i%2?dz:dx)))),environment=buildEnvironment(floor,walls),placements=environment.placements;
 for(const r of environment.roomSummary){if(r.type!=='corridor'&&!r.doors)issues.push({room:r.id,problem:'No entrance'});if(!r.openStairwell&&(!r.ceiling||!r.lights))issues.push({room:r.id,problem:'Missing ceiling or luminaire'});}
 for(const p of placements.filter(p=>p.collidable)){
  const o=makeAsset(p.kind);o.position.set(p.x,p.y,p.z);o.rotation.y=p.rotation;o.scale.setScalar(p.scale);const b=new T.Box3().setFromObject(o,true),r=ROOMS.find(r=>r.id===p.room);
  if(b.min.x<r.bounds[0]||b.max.x>r.bounds[2]||b.min.z<r.bounds[1]||b.max.z>r.bounds[3])issues.push({room:r.id,kind:p.kind,problem:'Outside room'});
  if(walls.some(s=>segmentHitsRect(s,[b.min.x+.02,b.min.z+.02,b.max.x-.02,b.max.z-.02])))issues.push({room:r.id,kind:p.kind,problem:'Intersects reference wall'});
 }
 environment.root.traverse(o=>{if(o.isMesh&&!o.geometry.attributes.position.array.every(Number.isFinite))issues.push({floor,problem:'Non-finite geometry'});});
 floors.push({floor,rooms:environment.roomSummary,doorAssemblies:environment.doors.length,operableDoors:environment.doors.filter(d=>!d.definition.portal).length,openPortals:environment.doors.filter(d=>d.definition.portal).length,privacyStallDoors:environment.doors.filter(d=>d.definition.stall).length,windows:environment.windowDefinitions.length,luminairePositions:environment.lightPoints.length,detailObjects:placements.length,groundAdditions:placements.filter(p=>p.collidable).length,skipped:environment.skipped});
}
const report={version:'4.0.0',units:'illustrative scene units',floors,issues};if(process.argv.includes('--save'))await writeFile('docs/environment-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({floors:floors.map(f=>({floor:f.floor,rooms:f.rooms.length,doors:f.operableDoors,portals:f.openPortals,windows:f.windows,lights:f.luminairePositions,details:f.detailObjects,skipped:f.skipped})),issues},null,2));if(issues.length)process.exitCode=1;
