import {writeFile,readFile} from 'node:fs/promises';
import {buildCampus,CAMPUS_BOUNDS,CAMPUS_ROADS,CAMPUS_WALK} from '../src/campus.js';
import {prepareWallSegments,FRONT_OFFICE} from '../src/circulation.js';
const campus=buildCampus(),[x0,z0,x1,z1]=CAMPUS_BOUNDS,W=1100,H=920,S=20,X=x=>50+(x-x0)*S,Z=z=>80+(z-z0)*S;
const rect=(b,fill,extra='')=>`<rect x="${X(b[0])}" y="${Z(b[1])}" width="${(b[2]-b[0])*S}" height="${(b[3]-b[1])*S}" fill="${fill}" ${extra}/>`;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f5f5eb"/><g font-family="Arial,sans-serif" fill="#2a4c4c"><text x="50" y="34" font-size="24" font-weight="bold">MediLink · Kawasan rumah sakit</text><text x="50" y="57" font-size="12">Akses pejalan kaki, drop-off, parkir, taman, dan penerangan kawasan</text>`;
svg+=rect(CAMPUS_BOUNDS,'#d3dfc7','rx="8"');for(const b of CAMPUS_ROADS)svg+=rect(b,'#899792');
for(const b of [[-16.7,-10.1,-13.35,10.2],[-13.35,-10.1,15.4,-8.9],[-13.35,8.6,15.4,10.2],[14.1,-8.9,15.4,8.6],[-24.5,-1.65,-12.6,1.45]])svg+=rect(b,'#e9e5d4');
svg+=rect([-9.34,-7.85,13.29,7.96],'#faf9f1');svg+=rect([-13.12,-7.85,-9.34,-4.55],'#faf9f1');svg+=rect(FRONT_OFFICE.arrivalBounds,'#e8e3d1');
const walls=prepareWallSegments(1,JSON.parse(await readFile(new URL('../assets/collision-1.json',import.meta.url))));for(const s of walls)svg+=`<path d="M${X(s[0])},${Z(s[1])} L${X(s[2])},${Z(s[3])}" stroke="#a1b1a3" stroke-width="1"/>`;
for(const p of campus.placements){if(p.kind==='garden-tree')svg+=`<circle cx="${X(p.x)}" cy="${Z(p.z)}" r="${S*p.scale*.85}" fill="#779779" stroke="#d8e5cf" stroke-width="2"/>`;else if(p.kind.includes('light'))svg+=`<circle cx="${X(p.x)}" cy="${Z(p.z)}" r="3" fill="#b8924e"/>`;else svg+=rect(p.bounds,p.kind==='ambulance'?'#bc8273':p.kind==='car'?'#6e8995':'#bba77d','rx="2"');}
const route=CAMPUS_WALK.concat(FRONT_OFFICE.routes[0].points.slice(1));svg+=`<polyline points="${route.map(p=>`${X(p[0])},${Z(p[1])}`).join(' ')}" fill="none" stroke="#2f8b78" stroke-width="4"/>`;
for(const [label,x,z]of [['Gerbang pejalan kaki',-20.5,2.1],['Parkir',-23.2,12.7],['Drop-off / ambulans',-15.7,-8.3],['Taman',-15.3,10.4],['Pendaftaran',-6.2,1.2],['Gedung layanan',1.8,-.1]])svg+=`<text x="${X(x)}" y="${Z(z)}" text-anchor="middle" font-size="12" font-weight="bold" stroke="#f5f7ec" stroke-width="4" paint-order="stroke">${label}</text>`;
svg+=`<text x="50" y="${H-30}" font-size="12">Hijau: jalur pejalan kaki menuju loket · Titik amber: penerangan kawasan</text><text x="${W-50}" y="${H-30}" text-anchor="end" font-size="10">Denah ilustratif · v4.0</text></g></svg>`;
await writeFile(new URL('../assets/campus-plan.svg',import.meta.url),svg);console.log('Campus plan generated from scene placement data.');
