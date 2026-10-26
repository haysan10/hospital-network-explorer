// Back-of-house geometry contract: render, collisions and door access share this plan.
export const SERVICE_ROOMS=new Set(['service-access','service-link','back-corridor','kitchen','calibration','medical-storage','ipsrs','linen-clean','laundry']);
export const SERVICE_FOOTPRINTS=[[5.89,7.96,7.41,11.75],[-9.34,11.75,13.29,19.1]];
export const SERVICE_REPLACEMENT={min:[5.40,-.2,3.43],max:[7.91,3.5,7.99]};
const door=(id,room,side,x,z,width,rooms=[room])=>({id:`door-${id}`,room,rooms,side,x,z,width,label:room==='kitchen'?'DAPUR · PETUGAS':room==='laundry'?'BINATU · PETUGAS':'BACK OFFICE · PETUGAS',name:'Akses servis',floor:1,rotation:['N','S'].includes(side)?0:Math.PI/2,portal:false,privacy:true,sliding:true,sign:1});
export const SERVICE_DOORWAYS=[
 door('service-access-n','service-access','N',6.65,3.55,1.2,['service-access','corridor-s']),
 door('service-access-s','service-access','S',6.65,7.75,1.2,['service-access','service-link']),
 door('service-link-s','back-corridor','N',6.65,11.86,1.2,['back-corridor','service-link']),
 door('back-egress','back-corridor','W',-9.13,12.65,1.2),
 door('ipsrs-staff','ipsrs','N',-7.35,13.55,1.1,['ipsrs','back-corridor']),
 door('calibration-staff','calibration','N',-3.65,13.55,1.1,['calibration','back-corridor']),
 door('ipsrs-receiving','ipsrs','W',-9.13,16.2,1.3),
 door('medical-storage','medical-storage','N',-.4,13.55,.95,['medical-storage','back-corridor']),
 door('kitchen-staff','kitchen','N',2.75,13.55,1.1,['kitchen','back-corridor']),
 door('laundry-staff','laundry','N',6.4,13.55,1.2,['laundry','back-corridor']),
 door('linen-staff','linen-clean','N',11.0,13.55,1.1,['linen-clean','back-corridor']),
 door('linen-dispatch','linen-clean','E',13.08,16.2,1.3),
 door('kitchen-delivery','kitchen','S',2.75,18.9,1.1),
 door('laundry-dirty','laundry','S',7.65,18.9,1.2)
];
const rect=([x,z,a,b])=>[[x,z,a,z],[a,z,a,b],[a,b,x,b],[x,b,x,z]];
const raw=[...rect([5.395,3.495,7.915,7.805]),[5.895,7.805,5.895,11.805],[7.405,7.805,7.405,11.805],...rect([-9.185,11.805,13.135,18.955]),[-9.185,13.495,13.135,13.495],...[-5.565,-1.945,1.105,4.405,8.965].map(x=>[x,13.495,x,18.955])];
function cut(s,d){const horizontal=Math.abs(s[1]-s[3])<.001,h=['N','S'].includes(d.side);if(horizontal!==h||Math.abs((h?s[1]:s[0])-(h?d.z:d.x))>.13)return [s];const axis=h?0:1,a=Math.min(s[axis],s[axis+2]),b=Math.max(s[axis],s[axis+2]),c=(h?d.x:d.z)-d.width/2,e=c+d.width;if(e<=a||c>=b)return [s];const out=[];if(c>a)out.push(h?[a,s[1],c,s[1]]:[s[0],a,s[0],c]);if(e<b)out.push(h?[e,s[1],b,s[1]]:[s[0],e,s[0],b]);return out;}
export const SERVICE_WALLS=SERVICE_DOORWAYS.reduce((segments,d)=>segments.flatMap(s=>cut(s,d)),raw);
export const isBackOffice=n=>n.floor===1&&n.z>11;
export function serviceBridge(a,b,y,offset=0){const trunk=12.65+offset,link=6.65+offset,main=2.72+offset;const aa=a[2]>11,bb=b[2]>11;if(!aa&&!bb)return null;if(aa&&bb)return [[a[0],y,trunk],[b[0],y,trunk]];return aa?[[a[0],y,trunk],[link,y,trunk],[link,y,main],[b[0],y,main]]:[[a[0],y,main],[link,y,main],[link,y,trunk],[b[0],y,trunk]];}

export const SERVICE_CLEAR_ZONES=[[2.30,13.55,3.20,15.2],[10.55,13.55,11.45,15.4]];
