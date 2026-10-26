import {isBackOffice,serviceBridge} from './service-layout.js';
import {NETWORK,DEVICE_MAP,FLOOR_OFFSETS,elevation,devicePoint,terminalOutlet} from './data.js';

// Visual routing lanes in scene units, not construction clearances.
export const INSTALLATION_LANES={copper:{height:3.035,offset:-.08},fiber:{height:3.08,offset:.13},power:{height:3.125,offset:-.45}};
export const RISER={x:12.94,z:-1.8};
export const SERVICE_OPENING=[RISER.x-.14,RISER.z-.16,RISER.x+.14,RISER.z+.16];
export const corridorZ=floor=>floor===2?-.35+FLOOR_OFFSETS[2][1]:-2.9;
export const installationHeight=(floor,type)=>elevation(floor)+INSTALLATION_LANES[type].height;
export function installationTrunk(floor,type,south=false){return (floor===1&&south?2.72:corridorZ(floor))+INSTALLATION_LANES[type].offset;}
export const cleanPath=points=>points.filter((p,i)=>!i||p.some((v,k)=>Math.abs(v-points[i-1][k])>1e-6));
// Outdoor drops follow the pole and a buried, separated route to the north service entry.
export function exteriorLead(n,type,port=devicePoint(n)){const power=type==='power',x=-16.4+(power?-.1:.05),z=-2.9+INSTALLATION_LANES[type].offset,y=installationHeight(1,type);return [port,[x,port[1],n.z],[x,.05,n.z],[x,power?-.24:-.18,n.z],[x,power?-.24:-.18,z],[-9.03,power?-.24:-.18,z],[-9.03,y,z]];}
export function powerLead(n){
 const base=elevation(n.floor),p=devicePoint(n),a=n.rotation||0,port=[p[0]+Math.cos(a)*.12,p[1],p[2]-Math.sin(a)*.12],y=installationHeight(n.floor,'power');
 if(n.exterior)return exteriorLead(n,'power',port);
 if(n.kind!=='pc')return [port,[port[0],y,port[2]]];
 const outlet=terminalOutlet(n),x=outlet.x+(['N','S','floor'].includes(outlet.side)?.14:0),z=outlet.z+(['E','W'].includes(outlet.side)?.14:0);
 if(outlet.mount==='floor'){const rx=outlet.riser[0],rz=outlet.riser[1]+.14;return [port,[port[0],base+.42,port[2]],[x,base+outlet.y,z],[x,base-.08,z],[rx,base-.08,z],[rx,base-.08,rz],[rx,y,rz]];}
 return [port,[port[0],base+.42,port[2]],[x,base+outlet.y,z],[x,y,z]];
}
export function createPowerFeeds(){
 return NETWORK.filter(n=>n.kind!=='tablet'&&(n.network!==false||n.kind==='ups'||n.id==='panel-boh')).map(device=>{
  const source=DEVICE_MAP.get(device.id==='panel-boh'?'panel-1':device.kind==='ups'?`panel-${device.floor}`:device.protected?`ups-${device.floor}`:isBackOffice(device)?'panel-boh':`panel-${device.floor}`),a=powerLead(source),b=powerLead(device),p=a.at(-1),q=b.at(-1),trunk=installationTrunk(device.floor,'power',device.floor===1&&device.z>2),y=installationHeight(device.floor,'power');
  return {floor:device.floor,source,device,points:cleanPath([...a,...(device.floor===1?serviceBridge(p,q,y,INSTALLATION_LANES.power.offset):null)||[[p[0],y,trunk],[q[0],y,trunk]],...b.reverse()])};
 });
}
