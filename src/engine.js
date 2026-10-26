import {serviceBridge} from './service-layout.js';
import {NETWORK,DEVICE_MAP,devicePoint,elevation,terminalOutlet,MISSIONS,QUIZ,FLOOR_HEIGHT,FLOOR_OFFSETS} from './data.js';
import {RISER,corridorZ,installationHeight,installationTrunk,exteriorLead} from './installation.js';
export {RISER,corridorZ} from './installation.js';
const eq=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<.00001);
export const compact = points=>points.filter((p,i)=>!i||!eq(p,points[i-1]));
export function pathLength(points) {return points.slice(1).reduce((s,p,i)=>s+Math.hypot(...p.map((v,j)=>v-points[i][j])),0);}
export function pointOnPath(points,t) {
  const total=pathLength(points); let left=Math.max(0,Math.min(1,t))*total;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],d=Math.hypot(...b.map((v,j)=>v-a[j]));
    if(left<=d && d>0) return a.map((v,j)=>v+(b[j]-v)*left/d);
    left-=d;
  }
  return [...points[points.length-1]];
}
const ceiling=(n,type)=>installationHeight(n.floor,type);
export function deviceLead(n,type='copper'){
 const p=devicePoint(n),y=ceiling(n,type);if(n.exterior)return exteriorLead(n,type,p);if(n.kind!=='pc')return [p,[p[0],y,p[2]]];
 const o=terminalOutlet(n),base=elevation(n.floor),port=[o.x,base+o.y,o.z];
 if(o.mount==='floor')return [p,[p[0],base+.42,p[2]],port,[o.x,base-.055,o.z],[o.riser[0],base-.055,o.riser[1]],[o.riser[0],y,o.riser[1]]];
 return [p,[p[0],base+.42,p[2]],port,[o.x,y,o.z]];
}
function routed(a,b,type) {
  const leadA=deviceLead(a,type),leadB=deviceLead(b,type),pa=leadA.at(-1),pb=leadB.at(-1),ya=ceiling(a,type),yb=ceiling(b,type),ta=installationTrunk(a.floor,type),tb=installationTrunk(b.floor,type);
  if(a.floor!==b.floor) return compact([...leadA,[pa[0],ya,ta],[RISER.x,ya,ta],[RISER.x,ya,RISER.z],[RISER.x,yb,RISER.z],[RISER.x,yb,tb],[pb[0],yb,tb],...leadB.reverse()]);
  const bridge=a.floor===1?serviceBridge(pa,pb,ya,type==='fiber'?.13:-.08):null;
  if(bridge)return compact([...leadA,...bridge,...leadB.reverse()]);
  const trunk=installationTrunk(a.floor,type,a.floor===1&&a.z>2&&b.z>2);
  return compact([...leadA,[pa[0],ya,trunk],[pb[0],yb,trunk],...leadB.reverse()]);
}
// Clip physical paths at floor slabs. A cross-floor cable remains inspectable
// in a single-floor view; hidden floors never leak cables or packet particles.
export function clipPathToFloor(points,floor) {
  if(floor==='all')return [points];
  const lower=floor===1?-Infinity:FLOOR_HEIGHT-.12,upper=floor===1?FLOOR_HEIGHT-.12:Infinity,paths=[];let current=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dy=b[1]-a[1];let t0=0,t1=1;
    if(Math.abs(dy)<1e-10){if(a[1]<lower||a[1]>upper){if(current.length>1)paths.push(current);current=[];continue;}}
    else {const enter=(lower-a[1])/dy,leave=(upper-a[1])/dy;t0=Math.max(0,Math.min(enter,leave));t1=Math.min(1,Math.max(enter,leave));}
    if(t0>t1){if(current.length>1)paths.push(current);current=[];continue;}
    const at=t=>a.map((v,j)=>v+(b[j]-v)*t),p=at(t0),q=at(t1);
    if(eq(p,q))continue;
    if(current.length&&!eq(current.at(-1),p)){paths.push(current);current=[];}
    if(!current.length)current.push(p);current.push(q);
  }
  if(current.length>1)paths.push(current);return paths;
}
export const edgeVisible=(edge,floor)=>floor==='all'||edge.floors.includes(floor);
export function createEdges() {
  const definitions=[['server','core','copper'],['firewall','core','copper'],['core','sw-north','fiber'],['core','sw-south','fiber'],['core','sw-l2','fiber'],['sw-l2','sw-l2-west','fiber']];
  NETWORK.filter(n=>n.sw).forEach(n=>definitions.push([n.id,n.sw,n.kind==='tablet'?'wifi':'copper']));
  return definitions.map(([a,b,type])=>({id:a==='core'?`link-core-${b}`:a==='sw-l2'?`link-l2-west`:`link-${a}`,a,b,type,floors:[...new Set([DEVICE_MAP.get(a).floor,DEVICE_MAP.get(b).floor])],points:type==='wifi'?[devicePoint(DEVICE_MAP.get(a)),devicePoint(DEVICE_MAP.get(b))]:routed(DEVICE_MAP.get(a),DEVICE_MAP.get(b),type)}));
}
export const EDGES=createEdges();
export function powered(device,state) {
  return Boolean(state.mains || (state.ups && device.protected));
}
export function traceRoute(source,target,state,{policy=true}={}) {
  const start=DEVICE_MAP.get(source),end=DEVICE_MAP.get(target);
  if(!start||!end) return {ok:false,reason:'unknown',nodes:[],edges:[]};
  if(policy && start.vlan===30 && target==='server') return {ok:false,reason:'policy',nodes:[source,start.sw,'firewall'],edges:[],message:'Kebijakan simulasi menolak VLAN 30 menuju server internal.'};
  const broken=state.broken instanceof Set?state.broken:new Set(state.broken||[]);
  if(!powered(start,state)||!powered(end,state)) return {ok:false,reason:'power',nodes:[],edges:[],message:'Perangkat sumber atau tujuan tidak memperoleh daya.'};
  const queue=[[source]],visited=new Set([source]);
  while(queue.length) {
    const path=queue.shift(),last=path.at(-1);
    if(last===target) {
      const edges=path.slice(1).map((id,i)=>EDGES.find(e=>(e.a===id&&e.b===path[i])||(e.b===id&&e.a===path[i])));
      return {ok:true,reason:'connected',nodes:path,edges,length:edges.reduce((s,e)=>s+pathLength(e.points),0)};
    }
    for(const e of EDGES) {
      if(broken.has(e.id))continue;
      const next=e.a===last?e.b:e.b===last?e.a:null;
      if(!next||visited.has(next)||!powered(DEVICE_MAP.get(next),state))continue;
      visited.add(next);queue.push([...path,next]);
    }
  }
  return {ok:false,reason:'link',nodes:[source],edges:[],message:'Tidak ditemukan jalur aktif. Periksa kabel dan perangkat di sepanjang rute.'};
}
export class GameState {
  constructor(saved={}) {
    this.mains=true;this.ups=true;this.broken=new Set();this.faultStarted=false;this.diagnosed=false;
    this.evidence=new Set(Array.isArray(saved.evidence)?saved.evidence.filter(v=>['core','trace','repair','vlan','power','quiz'].includes(v)):[]);
    this.visited=new Set(Array.isArray(saved.visited)?saved.visited.filter(id=>DEVICE_MAP.has(id)):[]);
    this.quiz=[];
    if(Array.isArray(saved.quiz))for(let i=0;i<Math.min(QUIZ.length,saved.quiz.length);i++){if(saved.quiz[i]!==QUIZ[i].answer)break;this.quiz.push(saved.quiz[i]);}
    this.completed=[];this.recompute();
  }
  get mission() {return MISSIONS[this.completed.length]||null;}
  get xp() {return this.completed.reduce((s,id)=>s+MISSIONS.find(m=>m.id===id).xp,0);}
  recompute() {this.completed=[];for(const m of MISSIONS){if(!this.evidence.has(m.id))break;this.completed.push(m.id);}}
  record(id) {const before=this.completed.length;this.evidence.add(id);this.recompute();return this.completed.length>before;}
  inspect(id) {this.visited.add(id);if(id==='core'||id==='server')return this.record('core');return false;}
  startFault() {this.faultStarted=true;this.diagnosed=false;this.broken.add('link-pc-icu');}
  diagnose(id) {if(id==='pc-icu'&&this.faultStarted&&this.broken.has('link-pc-icu'))this.diagnosed=true;return traceRoute(id,'server',this);}
  repair(id) {
    if(id!=='pc-icu'||!this.diagnosed||!this.broken.has('link-pc-icu'))return false;
    this.broken.delete('link-pc-icu');this.record('repair');return true;
  }
  trace(id) {const r=traceRoute(id,'server',this);if(id==='pc-igd'&&r.ok)this.record('trace');if(id==='guest'&&r.reason==='policy')this.record('vlan');return r;}
  outage() {this.mains=false;if(this.ups&&powered(DEVICE_MAP.get('server'),this)&&powered(DEVICE_MAP.get('core'),this))this.record('power');}
  answer(index,value) {
    if(index!==this.quiz.length||!QUIZ[index]||value!==QUIZ[index].answer)return false;
    this.quiz.push(value);if(this.quiz.length===QUIZ.length)this.record('quiz');return true;
  }
  serialize() {return {version:1,evidence:[...this.evidence],visited:[...this.visited],quiz:[...this.quiz]};}
}
export function distanceToSegment(x,z,segment) {
  const [ax,az,bx,bz]=segment,dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-ax-t*dx,z-az-t*dz);
}
export function canStand(x,z,bounds,segments,radius=.18,obstacles=[]) {
  if(x<bounds[0]+radius||x>bounds[2]-radius||z<bounds[1]+radius||z>bounds[3]-radius)return false;
  if(segments.some(s=>distanceToSegment(x,z,s)<radius))return false;
  return !obstacles.some(([a,b,c,d])=>x>a-radius&&x<c+radius&&z>b-radius&&z<d+radius);
}
export function moveWithCollision(position,dx,dz,bounds,segments,obstacles=[],radius=.18) {
  const p=[...position], steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
  for(let i=0;i<steps;i++) {
    if(canStand(p[0]+dx/steps,p[1],bounds,segments,radius,obstacles))p[0]+=dx/steps;
    if(canStand(p[0],p[1]+dz/steps,bounds,segments,radius,obstacles))p[1]+=dz/steps;
  }
  return p;
}
export function safeSpot(point,bounds,segments,obstacles=[],radius=.2) {
  if(canStand(...point,bounds,segments,radius,obstacles))return point;
  for(let r=.2;r<3;r+=.15)for(let a=0;a<Math.PI*2;a+=.28){const p=[point[0]+Math.cos(a)*r,point[1]+Math.sin(a)*r];if(canStand(...p,bounds,segments,radius,obstacles))return p;}
  return null;
}
