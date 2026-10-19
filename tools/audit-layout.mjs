import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import {ROOMS,FLOOR_OFFSETS} from '../src/data.js';
import {makeAsset} from '../src/assets.js';
import {FURNITURE,DEVICE_PLACEMENTS} from '../src/layout.js';
import {prepareWallSegments} from '../src/circulation.js';
import {distanceToSegment} from '../src/engine.js';
const collisions={};for(const f of [1,2]){const [dx,dz]=FLOOR_OFFSETS[f];collisions[f]=prepareWallSegments(f,JSON.parse(await readFile(`assets/collision-${f}.json`,'utf8')).map(s=>s.map((v,i)=>v+(i%2?dz:dx))));}
const objects=[...FURNITURE,...DEVICE_PLACEMENTS],bounds=new Map(),issues=[],clearances=[];
for(const p of objects){
 const g=makeAsset(p.kind);g.position.set(p.x,p.y||0,p.z);g.rotation.y=p.rotation||0;g.scale.setScalar(p.scale||1);
 const b=new T.Box3().setFromObject(g,true);bounds.set(p.id,b);const r=ROOMS.find(r=>r.id===p.room),[x0,z0,x1,z1]=r.bounds;
 if(b.min.x<x0-.025||b.max.x>x1+.025||b.min.z<z0-.025||b.max.z>z1+.025)issues.push({id:p.id,problem:'outside room',bounds:[b.min.x,b.min.z,b.max.x,b.max.z],room:r.bounds});
 if(p.kind==='stair-landing')continue;
 // Test dense footprint samples against the retained reference wall segments.
 const margin=.06;
 for(const s of collisions[p.floor]){
  const inside=(x,z)=>x>b.min.x+margin&&x<b.max.x-margin&&z>b.min.z+margin&&z<b.max.z-margin;
  if(inside(s[0],s[1])||inside(s[2],s[3])||inside((s[0]+s[2])/2,(s[1]+s[3])/2)){issues.push({id:p.id,problem:'wall intersects footprint',segment:s});break;}
 }
}
for(const r of ROOMS){
 const items=objects.filter(p=>p.room===r.id);
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j],aa=bounds.get(a.id),bb=bounds.get(b.id);
  const overlapX=Math.min(aa.max.x,bb.max.x)-Math.max(aa.min.x,bb.min.x),overlapZ=Math.min(aa.max.z,bb.max.z)-Math.max(aa.min.z,bb.min.z);
  if(!(a.assembly&&a.assembly===b.assembly)&&overlapX>.025&&overlapZ>.025&&Math.min(aa.max.y,bb.max.y)-Math.max(aa.min.y,bb.min.y)>.025)issues.push({id:`${a.id} / ${b.id}`,problem:'overlapping furniture',overlap:[overlapX,overlapZ]});
  if(a.kind==='bed'&&b.kind==='pc'||b.kind==='bed'&&a.kind==='pc'){
   const gap=Math.hypot(Math.max(0,-overlapX),Math.max(0,-overlapZ));clearances.push({room:r.id,gap:Number(gap.toFixed(3))});if(gap<.8)issues.push({id:r.id,problem:'bed/PC gap under 0.8',gap});
  }
 }
}
const report={units:'illustrative scene units, not surveyed metres',objects:objects.length,clearances,issues};
if(process.argv.includes('--save'))await writeFile('docs/layout-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(issues.length)process.exitCode=1;
