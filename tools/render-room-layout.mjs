import {readFile,writeFile} from 'node:fs/promises';
import {ROOMS,FLOORS,FLOOR_OFFSETS} from '../src/data.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds,placementObstacles} from '../src/layout.js';
import {buildEnvironment} from '../src/environment.js';
import {prepareWallSegments} from '../src/circulation.js';
import {doorApproach} from '../src/door-access.js';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const floor of [1,2]){
 const [dx,dz]=FLOOR_OFFSETS[floor],walls=prepareWallSegments(floor,JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx)))),e=buildEnvironment(floor,walls),b=FLOORS[floor].bounds,scale=40,W=(b[2]-b[0])*scale+80,H=(b[3]-b[1])*scale+140,X=x=>40+(x-b[0])*scale,Z=z=>80+(z-b[1])*scale;
 const rect=(b,color,attrs='')=>`<rect x="${X(b[0])}" y="${Z(b[1])}" width="${(b[2]-b[0])*scale}" height="${(b[3]-b[1])*scale}" fill="${color}" ${attrs}/>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f7f6ef"/><g font-family="Arial,sans-serif" fill="#29484c"><text x="40" y="32" font-size="23" font-weight="bold">Penataan ruang · Lantai ${floor}</text><text x="40" y="54" font-size="12">Area pintu dan jalur menuju peralatan tetap bebas</text>`;
 for(const r of ROOMS.filter(r=>r.floor===floor))svg+=rect(r.bounds,r.type==='corridor'?'#ece5d5':'#fffef9');
 for(const {definition:d}of e.doors)svg+=rect(doorApproach(d),'#d5e9df','opacity=".8"');
 for(const {path}of e.accessRoutes)svg+=`<polyline points="${path.map(p=>`${X(p[0])},${Z(p[1])}`).join(' ')}" fill="none" stroke="#95bda9" stroke-width="2.4" opacity=".6"/>`;
 for(const p of [...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===floor))for(const bounds of placementObstacles(p))svg+=rect(bounds,p.kind==='waiting-bench'?'#a6b697':p.kind==='bed'?'#a8bec3':'#819ca8','stroke="#f7f6ef" stroke-width=".8" rx="1.8"');
 for(const p of e.placements.filter(p=>p.collidable))svg+=rect(p.bounds,'#c3aa84','stroke="#faf7f0" stroke-width=".5" rx="1"');
 for(const s of walls)svg+=`<path d="M${X(s[0])},${Z(s[1])} L${X(s[2])},${Z(s[3])}" stroke="#526468" stroke-width="1.6"/>`;
 for(const {definition:d}of e.doors){const h=d.rotation===0,x=h?d.width/2:0,z=h?0:d.width/2;svg+=`<path d="M${X(d.x-x)},${Z(d.z-z)} L${X(d.x+x)},${Z(d.z+z)}" stroke="#288e78" stroke-width="2.7"/>`;}
 for(const r of ROOMS.filter(r=>r.floor===floor)){const name=r.name.replace('Toilet pria & wanita','Toilet P / W').replace('Rehabilitasi medik','Rehabilitasi').replace('Gudang alat medis','Gudang').replace('Tangga & akses L1','Tangga').replace('Koridor operasi barat','Koridor OK'),font=r.bounds[2]-r.bounds[0]<2.5?7.5:9;const max=Math.floor(((r.bounds[2]-r.bounds[0])*scale-8)/(font*.54)),lines=[];for(const word of name.split(" ")){if(!lines.length||lines.at(-1).length+word.length+1>max)lines.push(word);else lines[lines.length-1]+=" "+word;}svg+=`<text x="${X(r.center[0])}" y="${Z(r.bounds[1]+.22)}" text-anchor="middle" font-size="${font}" font-weight="bold" stroke="#fffdf6" stroke-width="3" paint-order="stroke">${lines.map((line,i)=>`<tspan x="${X(r.center[0])}" dy="${i?font*1.13:0}">${escape(line)}</tspan>`).join("")}</text>`;}
 svg+=`<rect x="40" y="${H-35}" width="12" height="9" fill="#d5e9df"/><text x="58" y="${H-27}" font-size="11">Area bebas pintu</text><rect x="195" y="${H-35}" width="12" height="9" fill="#819ca8"/><text x="213" y="${H-27}" font-size="11">Furnitur / perangkat</text><rect x="370" y="${H-35}" width="12" height="9" fill="#c3aa84"/><text x="388" y="${H-27}" font-size="11">Perlengkapan ruang</text><text x="${W-40}" y="${H-27}" text-anchor="end" font-size="10">Denah ilustratif · v4.5</text></g></svg>`;
 await writeFile(new URL(`../assets/room-layout-${floor}.svg`,import.meta.url),svg);
}console.log('Both room-layout plans generated from the live placement schedule.');
