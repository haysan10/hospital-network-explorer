import {NETWORK,DEVICE_MAP,devicePoint,elevation,MISSIONS,QUIZ} from './data.js';
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
const ceiling=n=>elevation(n.floor)+2.62;
function routed(a,b) {
  const pa=devicePoint(a),pb=devicePoint(b),ya=ceiling(a),yb=ceiling(b);
  if(a.floor!==b.floor) return compact([pa,[a.x,ya,a.z],[10.35,ya,a.z],[10.35,ya,1.4],[10.35,yb,1.4],[b.x,yb,1.4],[b.x,yb,b.z],pb]);
  let trunk;
  if(a.floor===2) trunk=-.35;
  else if(a.z<-3.7 && b.z<-3.7) trunk=-7.3;
  else if(a.z>3.4&&b.z>3.4) trunk=7.4;
  else trunk=2.72;
  return compact([pa,[a.x,ya,a.z],[a.x,ya,trunk],[b.x,yb,trunk],[b.x,yb,b.z],pb]);
}
export function createEdges() {
  const definitions=[['server','core','copper'],['firewall','core','copper'],['core','sw-north','fiber'],['core','sw-south','fiber'],['core','sw-l2','fiber']];
  NETWORK.filter(n=>n.sw).forEach(n=>definitions.push([n.id,n.sw,n.kind==='tablet'?'wifi':'copper']));
  return definitions.map(([a,b,type])=>({id:a==='core'?`link-core-${b}`:`link-${a}`,a,b,type,floors:[...new Set([DEVICE_MAP.get(a).floor,DEVICE_MAP.get(b).floor])],points:type==='wifi'?[devicePoint(DEVICE_MAP.get(a)),devicePoint(DEVICE_MAP.get(b))]:routed(DEVICE_MAP.get(a),DEVICE_MAP.get(b))}));
}
export const EDGES=createEdges();
export function powered(device,state) {
  return Boolean(state.mains || (state.ups && device.protected));
}
export function traceRoute(source,target,state,{policy=true,edges:graphEdges=EDGES}={}) {
  const start=DEVICE_MAP.get(source),end=DEVICE_MAP.get(target);
  if(!start||!end) return {ok:false,reason:'unknown',nodes:[],edges:[]};
  const broken=state.broken instanceof Set?state.broken:new Set(state.broken||[]);
  if(!powered(start,state)||!powered(end,state)) return {ok:false,reason:'power',nodes:[],edges:[],message:'Perangkat sumber atau tujuan tidak memperoleh daya.'};
  const queue=[[source]],visited=new Set([source]);
  while(queue.length) {
    const path=queue.shift(),last=path.at(-1);
    if(last===target) {
      if(policy && start.vlan===30 && target==='server') return {ok:false,reason:'policy',nodes:path,edges:[],message:'Kebijakan simulasi menolak VLAN 30 menuju server internal.'};
      const edges=path.slice(1).map((id,i)=>graphEdges.find(e=>(e.a===id&&e.b===path[i])||(e.b===id&&e.a===path[i])));
      return {ok:true,reason:'connected',nodes:path,edges,length:edges.reduce((s,e)=>s+pathLength(e.points),0)};
    }
    for(const e of graphEdges) {
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
export function moveWithCollision(position,dx,dz,bounds,segments,obstacles=[]) {
  const p=[...position], steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
  for(let i=0;i<steps;i++) {
    if(canStand(p[0]+dx/steps,p[1],bounds,segments,.18,obstacles))p[0]+=dx/steps;
    if(canStand(p[0],p[1]+dz/steps,bounds,segments,.18,obstacles))p[1]+=dz/steps;
  }
  return p;
}
export function safeSpot(point,bounds,segments,obstacles=[]) {
  if(canStand(...point,bounds,segments,.2,obstacles))return point;
  for(let r=.2;r<3;r+=.15)for(let a=0;a<Math.PI*2;a+=.28){const p=[point[0]+Math.cos(a)*r,point[1]+Math.sin(a)*r];if(canStand(...p,bounds,segments,.2,obstacles))return p;}
  return null;
}
