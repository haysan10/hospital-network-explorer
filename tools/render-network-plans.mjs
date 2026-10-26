import {readFile,writeFile} from 'node:fs/promises';
import {ROOMS,NETWORK,FLOOR_OFFSETS,DEVICE_MAP} from '../src/data.js';
import {EDGES} from '../src/engine.js';
import {createPowerFeeds,RISER} from '../src/installation.js';
import {prepareWallSegments,PHARMACY_LINK} from '../src/circulation.js';
import {findDoors,planWindows} from '../src/architecture.js';
import {FURNITURE,placementObstacles} from '../src/layout.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const out=new URL('../assets/',import.meta.url);
for(const floor of [1,2]){
 const scale=floor===1?33:48,x0=floor===1?-17.5:-9.5,z0=floor===1?-8.1:-8.8,W=1600,H=floor===1?1200:950,X=x=>72+(x-x0)*scale,Y=z=>133+(z-z0)*scale;
 const [dx,dz]=FLOOR_OFFSETS[floor],walls=prepareWallSegments(floor,JSON.parse(await readFile(new URL(`../assets/collision-${floor}.json`,import.meta.url))).map(s=>s.map((v,i)=>v+(i%2?dz:dx)))),doors=findDoors(floor,walls);
 const rect=(b,fill,attrs='')=>`<rect x="${X(b[0])}" y="${Y(b[1])}" width="${(b[2]-b[0])*scale}" height="${(b[3]-b[1])*scale}" fill="${fill}" ${attrs}/>`;
 const line=(a,b,color,width,attrs='')=>`<path d="M ${X(a[0])} ${Y(a[1])} L ${X(b[0])} ${Y(b[1])}" fill="none" stroke="${color}" stroke-width="${width}" ${attrs}/>`;
 const text=(s,x,y,size=17,attrs='')=>`<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${esc(s)}</text>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 ${W} ${H}" data-version="4.5.0" data-floor="${floor}"><title id="title">Denah revisi lantai ${floor} MediLink</title><desc id="desc">Denah ruang dan jaringan dari data aplikasi yang sama. LAN biru, fiber hijau, daya amber, radio Wi-Fi ungu. Tanpa skala.</desc><defs><pattern id="grid" width="${scale/2}" height="${scale/2}" patternUnits="userSpaceOnUse"><path d="M ${scale/2} 0 H 0 V ${scale/2}" fill="none" stroke="#e7edf3" stroke-width=".65"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L9 5 L0 9" fill="none" stroke="#168c82" stroke-width="1.5"/></marker><g id="pc"><rect x="-8" y="-6" width="16" height="11" rx="1.5" fill="#e5edf3" stroke="#51677c" stroke-width="1.5"/><path d="M0 5v4m-6 0h12" stroke="#51677c" stroke-width="1.5"/></g><g id="ap"><circle r="8.5" fill="white" stroke="#8a62c3" stroke-width="1.8"/><circle r="2" fill="#8a62c3"/><path d="M-13 -5Q0 -20 13 -5M-10 -2Q0 -12 10 -2" fill="none" stroke="#8a62c3" stroke-width="1.4"/></g></defs><rect width="${W}" height="${H}" fill="white"/><g font-family="Arial,DejaVu Sans,sans-serif" fill="#344f69">`;
 svg+=text('MEDILINK',72,44,16,'letter-spacing="2.4" font-weight="bold"')+text(`Denah ruang dan jaringan lantai ${floor}`,72,82,32,'fill="#000000" font-weight="bold"')+text('Revisi fungsi ruang  •  20 Oktober 2026  •  v4.5.0',72,108,16);
 svg+=`<rect x="55" y="120" width="1120" height="${H-190}" fill="url(#grid)"/>`;
 for(const r of ROOMS.filter(r=>r.floor===floor))svg+=`<g data-room="${r.id}">${rect(r.bounds,r.type==='corridor'?'#edf6fa':r.type==='operation'?'#f0f7f5':r.type==='workshop'||r.type==='laundry'||r.type==='kitchen'?'#faf6ec':'#ffffff','fill-opacity=".78"')}</g>`;
 if(floor===1){svg+=rect([-16.9,3,-13.5,10.7],'#eff5e9','fill-opacity=".8"');svg+=text('TAMAN',X(-15.2),Y(4.2),14,'text-anchor="middle"');svg+=text('PENGUNJUNG',X(-15.2),Y(4.8),13,'text-anchor="middle"');}
 // Equipment footprints are subdued so door positions and room names remain legible.
 for(const p of FURNITURE.filter(p=>p.floor===floor))for(const b of placementObstacles(p))svg+=rect(b,'#e4eaf0','stroke="#adbbc6" stroke-width=".9" rx="2"');
 for(const s of walls){svg+=line(s.slice(0,2),s.slice(2),'#8d7967',4.8);svg+=line(s.slice(0,2),s.slice(2),'#fffcf6',1.4);}
 for(const w of planWindows(floor)){const h=['N','S'].includes(w.side);svg+=line([w.x-(h?w.width/2:0),w.z-(h?0:w.width/2)],[w.x+(h?w.width/2:0),w.z+(h?0:w.width/2)],'#80b1c6',3);}
 function paths(paths,color,width,attrs=''){
  const segments=new Map();for(const points of paths)for(let i=1;i<points.length;i++){const a=[points[i-1][0],points[i-1][2]],b=[points[i][0],points[i][2]];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.004)continue;const key=[a,b].map(p=>p.map(n=>n.toFixed(3)).join(',')).sort().join('/');segments.set(key,[a,b]);}
  for(const [a,b]of segments.values())svg+=line(a,b,color,width,attrs);
 }
 // Cross-floor fiber is projected only within the current floor's elevation range.
 const physical=EDGES.filter(e=>e.type!=='wifi'&&e.floors.includes(floor));
 const local=e=>e.points.map((p,i)=>({p,i})).filter(({p})=>floor===1?p[1]<3.4:p[1]>=3.28).map(({p})=>p);
 paths(createPowerFeeds().filter(f=>f.floor===floor).map(f=>f.points),'#c89236',1.1,'stroke-dasharray="5 3" opacity=".75"');
 paths(physical.filter(e=>e.type==='copper').map(local),'#4d83db',1.4,'opacity=".8"');
 paths(physical.filter(e=>e.type==='fiber').map(local),'#19aa98',3.0);
 for(const e of EDGES.filter(e=>e.type==='wifi'&&e.floors.includes(floor)))paths([e.points],'#9b6bcc',1.7,'stroke-dasharray="5 4"');
 for(const d of doors){const h=d.rotation===0,a=[d.x-(h?d.width/2:0),d.z-(h?0:d.width/2)],b=[d.x+(h?d.width/2:0),d.z+(h?0:d.width/2)];
  svg+=`<g data-door="${d.id}">`;svg+=line(a,b,'white',6);
  if(d.portal)svg+=line(a,b,'#8fb5c9',1.5,'stroke-dasharray="3 3"');
  else if(d.sliding){svg+=line(a,b,'#2774a7',2.2);svg+=line([a[0]+(h?.06:.09),a[1]+(h?.09:.06)],[b[0]-(h?.06:-.09),b[1]-(h?-.09:.06)],'#2774a7',1.1);}
  else{const hinge=[X(a[0]),Y(a[1])],length=d.width*scale;svg+=`<path d="M${hinge[0]} ${hinge[1]} ${h?`v${-length}`:`h${length}`} M${X(b[0])} ${Y(b[1])} A${length} ${length} 0 0 ${h?0:1} ${hinge[0]+(h?0:length)} ${hinge[1]-(h?length:0)}" fill="none" stroke="#2774a7" stroke-width="1.1"/>`;}
  svg+='</g>';
 }
 const names={'poli-general':['Poli umum'],'poli-ent':['Poli THT'],'poli-dental':['Poli gigi'],kitchen:['Dapur'],laundry:['Binatu'],'linen-clean':['Linen','bersih'],ipsrs:['IPSRS','Bengkel'],calibration:['Kalibrasi','alat medis'],'medical-storage':['Gudang','alat medis'],'pharmacy-depot':['Depo farmasi'],'pharmacy-store':['Gudang farmasi'],'service-access':['Akses','petugas'],'service-link':['Link','servis'],'back-corridor':['Koridor back office'],'server-room':['Ruang','server'],'circulation-west-2':['Koridor OK'],'stairs-2':['Tangga','ke L1'],'stairs-1':['Tangga','ke L2'],'front-toilet':['Toilet','depan']};
 for(const r of ROOMS.filter(r=>r.floor===floor)){
  const width=(r.bounds[2]-r.bounds[0])*scale,font=r.type==='corridor'?13:floor===2?15:16,limit=Math.max(7,Math.floor((width-10)/(font*.52))),lines=names[r.id]||[];
  if(!lines.length)for(const word of r.name.replace('Rehabilitasi medik','Rehabilitasi').replace('Toilet pria & wanita','Toilet P dan W').replace('Ruang operasi (OK)','OK besar').split(' ')){if(!lines.length||lines.at(-1).length+word.length+1>limit)lines.push(word);else lines[lines.length-1]+=' '+word;}
  const labelW=Math.max(...lines.map(t=>t.length))*font*.56,labelH=lines.length*(font+2),candidates=[[0,0],[0,.8],[0,-.8],[0,1.2],[0,1.45],[0,-1.45],[1.8,0],[-1.8,0],[3.6,0],[-3.6,0],[5.2,0],[-5.2,0]];
  const nodes=NETWORK.filter(n=>n.floor===floor&&n.room===r.id).map(n=>({x:X(n.x),y:Y(n.z),radius:n.kind==='ap'?18:12}));
  const positions=candidates.map(([a,b])=>[X(r.center[0]+a),Y(r.center[1]+b)]).filter(([a,b])=>a-labelW/2>X(r.bounds[0])+2&&a+labelW/2<X(r.bounds[2])-2&&b-labelH/2>Y(r.bounds[1])+2&&b+labelH/2<Y(r.bounds[3])-2);
  const score=([a,b])=>nodes.reduce((s,n)=>s+(Math.abs(a-n.x)<labelW/2+n.radius&&Math.abs(b-n.y)<labelH/2+n.radius?1:0),0);
  positions.sort((a,b)=>score(a)-score(b));const [labelX,labelY]=positions[0]||[X(r.center[0]),Y(r.center[1])];
  const y=labelY-(lines.length-1)*(font+2)/2+font*.3;
  svg+=`<text data-label="${r.id}" x="${labelX}" y="${y}" font-size="${font}" text-anchor="middle" font-weight="bold" stroke="white" stroke-width="4.5" paint-order="stroke">${lines.map((t,i)=>`<tspan x="${labelX}" dy="${i?font+2:0}">${esc(t)}</tspan>`).join('')}</text>`;
 }
 for(const n of NETWORK.filter(n=>n.floor===floor)){
  const x=X(n.x),y=Y(n.z);svg+=`<g data-device="${n.id}" transform="translate(${x} ${y})">`;
  if(n.kind==='pc')svg+='<use href="#pc"/>';
  else if(n.kind==='ap')svg+='<use href="#ap"/>';
  else if(n.kind==='tablet')svg+='<rect x="-5" y="-7" width="10" height="14" rx="2" fill="#f1eaf8" stroke="#8568a8" stroke-width="1.5"/>';
  else if(n.kind==='panel'||n.kind==='ups')svg+=`<rect x="-6" y="-7" width="12" height="14" rx="1" fill="#fff6e2" stroke="#b88b42" stroke-width="1.5"/><path d="M1 -5 -2 1 2 1 -1 6" fill="none" stroke="#b88b42"/>`;
  else svg+='<rect x="-9" y="-7" width="18" height="14" rx="1.5" fill="#e5edf3" stroke="#51677c" stroke-width="1.8"/><path d="M-6 -2h12M-6 2h12" stroke="#51677c"/>';
  svg+='</g>';
 }
 svg+=`<circle cx="${X(RISER.x)}" cy="${Y(RISER.z)}" r="6" fill="#19aa98" stroke="white" stroke-width="2"/>`;
 if(floor===1){svg+=line([-12.5,-.1],[-9.45,-.1],'#168c82',2.5,'marker-end="url(#arrow)"');svg+=text('MASUK UTAMA',X(-12.3),Y(-.55),12);}
 const lx=1210;svg+=text('LEGENDA',lx,155,18,'fill="#000000" font-weight="bold"');
 for(const [i,color,label,dash]of [[0,'#4d83db','Kabel LAN',false],[1,'#19aa98','Backbone fiber',false],[2,'#c89236','Jalur daya',true],[3,'#9b6bcc','Radio Wi-Fi',true]]){svg+=`<path d="M${lx} ${189+i*31}h38" stroke="${color}" stroke-width="${i===1?3:2}" ${dash?'stroke-dasharray="5 3"':''}/>`+text(label,lx+52,195+i*31,16);}
 svg+=`<use href="#pc" x="${lx+17}" y="333"/>`+text('Komputer',lx+52,339,16)+`<use href="#ap" x="${lx+17}" y="373"/>`+text('Access point',lx+52,379,16);
 const notes=floor===1?[
 ['REVISI GEDUNG UTAMA','Laboratorium menggantikan poli.','Depo dan gudang farmasi terhubung','melalui pintu internal.','Poli umum, THT dan gigi masing-','masing memiliki PC dan Wi-Fi.'],
 ['BACK OFFICE','IPSRS dan kalibrasi dipisah.','IPSRS tanpa PC dan AP.','Kalibrasi tanpa PC, satu AP.','Dapur berada di samping binatu.','Linen bersih berada di sisi timur.'],
 ['WI FI LUAR GEDUNG','AP outdoor pada tiang taman.','Uplink LAN dan daya mengikuti','tiang lalu jalur bawah tanah.','Klien tamu memakai VLAN 30.']
 ]:[
 ['AREA OPERASI','OK 1, 2 dan 3 tanpa PC dan AP.','Satu AP tetap di OK besar.','Tidak ada komputer kantor','di seluruh ruang operasi.'],
 ['FIBER LANTAI 2','Dari core L1 melalui riser internal','menuju distribusi nurse station.','Fiber berlanjut ke sayap barat.','Terminal dan AP memakai LAN.']
 ];
 let yy=430;for(const [heading,...body]of notes){svg+=text(heading,lx,yy,15,'fill="#000000" font-weight="bold"');yy+=27;for(const t of body){svg+=text(t,lx,yy,15);yy+=23;}yy+=27;}
 if(floor===2){svg+=text('DISTRIBUSI JARINGAN',80,755,18,'fill="#000000" font-weight="bold"');svg+=text('Core L1 → riser internal → rak nurse station → distribusi sayap barat → terminal dan AP',80,790,19);svg+=text('Radio adalah simbol hubungan konseptual. Lingkaran AP tidak menunjukkan hasil pengukuran cakupan.',80,827,16);}
 const count=NETWORK.filter(n=>n.floor===floor);svg+=text(`${ROOMS.filter(r=>r.floor===floor).length} ruang dan area  •  ${count.filter(n=>n.kind==='pc').length} PC  •  ${count.filter(n=>n.kind==='ap').length} AP${floor===1?' termasuk 1 outdoor':''}`,72,H-51,15);
 svg+=text('Denah ilustratif tanpa skala  •  Posisi ruang, pintu, perangkat dan kabel mengikuti data aplikasi',72,H-26,14)+text(`MediLink 4.5  /  ${floor===1?'01':'02'}`,W-65,H-26,14,'text-anchor="end"');
 svg+='</g></svg>';
 // Use two text passes rather than SVG paint-order, which older document renderers omit.
 svg=svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g,(full,attrs,body)=>attrs.includes('paint-order')?full+`<text ${attrs.replace(/(?:stroke|stroke-width|paint-order)="[^"]*"/g,'')}>${body}</text>`:full);
 await writeFile(new URL(`denah-lantai-${floor}.svg`,out),svg);
}
console.log('Reference-style network SVG plans generated from live rooms, doors, devices and cable paths.');
