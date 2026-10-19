import * as T from '../vendor/three.module.js';
import {material} from './materials.js';
import {FLOOR_HEIGHT} from './data.js';
export {material} from './materials.js';
const WHITE=0xf1eee5,TEAL=0x3e8185,DARK=0x233f50,METAL=0x9baeb3,WOOD=0xbd9666;
const geometries=new Map(),assetCache=new Map();
// Rounded super-ellipsoid projection, crown loft, six separate UV islands.
export function cushionGeometry(w,h,d,r=.04,segments=4,crown=0,slot=0) {
  const key=[w,h,d,r,segments,crown,slot].join(':');if(geometries.has(key))return geometries.get(key);
  r=Math.min(r,w*.45,h*.45,d*.45);const g=new T.BoxGeometry(w,h,d,segments,segments,segments),p=g.attributes.position,v=new T.Vector3(),inner=new T.Vector3(),dir=new T.Vector3();
  const hx=w/2,hy=h/2,hz=d/2;
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);inner.set(T.MathUtils.clamp(v.x,-hx+r,hx-r),T.MathUtils.clamp(v.y,-hy+r,hy-r),T.MathUtils.clamp(v.z,-hz+r,hz-r));
    dir.copy(v).sub(inner).normalize();v.copy(inner).addScaledVector(dir,r);
    if(v.y>0)v.y+=crown*Math.max(0,(1-(v.x/hx)**2*.85)*(1-(v.z/hz)**2*.85));
    p.setXYZ(i,v.x,v.y,v.z);
  }
  const uv=g.attributes.uv;
  for(let face=0;face<6;face++)for(let i=face*(segments+1)**2;i<(face+1)*(segments+1)**2;i++){
    // Component occupies one atlas quadrant; each face has a padded island.
    const u=(face%3+(uv.getX(i)*.94+.03))/3,v=(Math.floor(face/3)+(uv.getY(i)*.94+.03))/2;
    uv.setXY(i,u,v);
  }
  g.computeVertexNormals();g.computeTangents();g.computeBoundingBox();g.userData={rounded:true,atlasSlot:slot};geometries.set(key,g);return g;
}
export function box(g,x,y,z,w,h,d,color=WHITE,profile='paint',radius=.012,segments=2,crown=0,slot=0) {
  const mesh=new T.Mesh(cushionGeometry(w,h,d,radius,segments,crown,slot),typeof color==='object'?color:material(color,0,profile));
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
export function cylinder(g,x,y,z,r,h,color=METAL,profile='steel',rTop=r) {
  const key=`cyl:${r}:${rTop}:${h}`,geo=geometries.get(key)||new T.CylinderGeometry(rTop,r,h,20,1);geometries.set(key,geo);
  if(!geo.attributes.tangent)geo.computeTangents();const m=new T.Mesh(geo,typeof color==='object'?color:material(color,0,profile));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
}
function pipe(g,a,b,r=.015,color=METAL,profile='steel') {
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),m=cylinder(g,0,0,0,r,delta.length(),color,profile);
  m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function curve(g,points,r=.004,color=TEAL,profile='vinyl') {
  const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,5,false);geo.computeTangents();const m=new T.Mesh(geo,material(color,0,profile));g.add(m);return m;
}
function seam(g,w,d,y,z=0,color=0x9db5ad) {
  const r=.06,pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;pts.push([Math.sign(Math.cos(a))*(w/2-r)+Math.cos(a)*r,y,z+Math.sign(Math.sin(a))*(d/2-r)+Math.sin(a)*r]);}
  return curve(g,pts,.0035,color);
}
function led(g,x,y,z,color=0x63e5b8) {return box(g,x,y,z,.018,.012,.009,material(color,color), 'paint',.004);}
function screen(g,x,y,z,w=.54,h=.32,medical=false) {
  box(g,x,y,z,w,h,.046,DARK,'paint',.018,4);box(g,x,y,z+.026,w-.045,h-.045,.008,material(0x152f40,0x152f40),'paint',.006);
  if(medical){const p=[];for(let i=0;i<34;i++){const k=i%11;p.push([x-w*.4+i/33*w*.8,y+(k===5?.065:k===6?-.045:k===7?.018:0),z+.033]);}curve(g,p,.0035,0x68e8ba,'paint');}
  else{box(g,x-w*.25,y+.06,z+.033,w*.25,.013,.002,material(0x59baa8,0x59baa8));for(let i=0;i<3;i++)box(g,x+.045,y+.045-i*.043,z+.033,w*.33,.009,.002,0x7299a2);}
  led(g,x+w*.4,y-h*.41,z+.028);
}
function wheels(g,x,z,w,d,y=.09) {
  for(const a of [-1,1])for(const b of [-1,1]){cylinder(g,x+a*w/2,y+.06,z+b*d/2,.023,.13);const c=cylinder(g,x+a*w/2,y,z+b*d/2,.057,.045,DARK,'vinyl');c.rotation.z=Math.PI/2;}
}
function cushion(g,x,y,z,w,h,d,color=TEAL,slot=0) {return box(g,x,y,z,w,h,d,color,'vinyl',Math.min(h*.42,.07),6,.013,slot);}
function rack(g,w=.72,h=1.95) {
  box(g,0,h/2,0,w,h,.76,DARK,'steel',.025,3);box(g,0,h/2,.397,w-.075,h-.08,.033,0x3b505b,'steel');
  for(let i=0;i<9;i++){
    const y=.18+i*.183;box(g,0,y,.428,w-.14,.142,.045,0x657780,'steel');
    for(let j=0;j<8;j++)box(g,-w*.33+j*.038,y,.455,.018,.075,.006,DARK);
    led(g,w*.29,y,.457,i%3===0?0x59b9df:0x63e5b8);
    for(const x of [-w*.31,w*.31])cylinder(g,x,y,.456,.009,.008).rotation.x=Math.PI/2;
  }
  for(const x of [-w*.47,w*.47])box(g,x,h/2,.449,.018,h-.1,.025,METAL,'steel');wheels(g,0,0,w*.8,.6,.06);
}
export function makeAsset(kind) {
  if(assetCache.has(kind))return assetCache.get(kind).clone(true);
  const g=new T.Group();g.name=kind;g.userData.asset=kind;
  switch(kind){
    case 'server': case 'rack': rack(g,kind==='server'?.76:.66,kind==='server'?2:1.85);break;
    case 'switch':{
      box(g,0,.07,0,.72,.14,.35,0x475d69,'steel',.012,3);
      for(let i=0;i<12;i++){box(g,-.3+i*.051,.067,.181,.038,.045,.012,DARK);box(g,-.3+i*.051,.065,.189,.025,.025,.004,0x8f9c9e,'steel');led(g,-.3+i*.051,.111,.185);}
      for(let i=0;i<7;i++)box(g,-.2+i*.06,.144,-.04,.031,.004,.16,DARK);break;
    }
    case 'router':{
      box(g,0,.065,0,.46,.13,.3,WHITE,'paint',.023,4);for(const x of [-.18,0,.18]){const p=cylinder(g,x,.23,-.1,.012,.34,DARK,'paint');p.rotation.z=x*.3;}
      for(let i=0;i<4;i++)led(g,-.12+i*.065,.067,.157);break;
    }
    case 'ap':{cylinder(g,0,0,0,.22,.045,WHITE,'paint');cylinder(g,0,.026,0,.195,.018,0xe2e8e4,'paint');cylinder(g,0,.041,0,.027,.004,material(0x49bda6,0x49bda6));break;}
    case 'pc':{
      box(g,0,.755,0,1.08,.045,.56,WOOD,'wood',.017,3);for(const x of [-.46,.46])for(const z of [-.21,.21])box(g,x,.37,z,.035,.73,.035,WHITE,'steel');
      box(g,0,.792,-.1,.23,.018,.15,DARK);pipe(g,[0,.8,-.13],[0,.99,-.15],.022);screen(g,0,1.08,-.15);
      box(g,-.055,.792,.13,.38,.019,.12,0xc8d0d0);for(let i=0;i<9;i++)for(let j=0;j<3;j++)box(g,-.21+i*.037,.804,.09+j*.032,.027,.004,.022,0x65727a);
      box(g,.27,.797,.12,.06,.025,.095,DARK,'paint',.02,4);box(g,.36,.36,-.04,.17,.42,.33,DARK);led(g,.36,.52,.13);
      const c=makeAsset('chair');c.position.z=.63;g.add(c);
      curve(g,[[0,.98,-.175],[.03,.8,-.25],[.22,.5,-.24],[.36,.47,-.19]],.008,DARK);break;
    }
    case 'chair':{
      cushion(g,0,.46,0,.46,.085,.43,TEAL,0);const back=cushion(g,0,.71,.19,.44,.4,.065,TEAL,1);back.rotation.x=-.08;
      cylinder(g,0,.25,0,.028,.36);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;pipe(g,[0,.11,0],[Math.sin(a)*.25,.08,Math.cos(a)*.25],.018);const c=cylinder(g,Math.sin(a)*.25,.055,Math.cos(a)*.25,.038,.035,DARK,'vinyl');c.rotation.z=Math.PI/2;}
      for(const x of [-.255,.255]){pipe(g,[x,.45,.1],[x,.65,.07]);box(g,x,.66,0,.035,.035,.27,DARK,'vinyl');}break;
    }
    case 'waiting-bench':{
      const TEAL=0x829b86;
      for(const x of [-.66,0,.66]){cushion(g,x,.48,0,.59,.085,.42,TEAL,0);const b=cushion(g,x,.72,-.19,.59,.42,.065,TEAL,1);b.rotation.x=.07;seam(g,.54,.37,.522).position.x=x;}
      box(g,0,.37,0,1.98,.06,.055,METAL,'steel');for(const x of [-.79,.79]){pipe(g,[x,.08,-.15],[x,.4,0],.025);pipe(g,[x,.08,.18],[x,.4,0],.025);for(const z of [-.15,.18])cylinder(g,x,.055,z,.04,.03,DARK,'vinyl');}
      for(const x of [-1.005,1.005]){pipe(g,[x,.39,0],[x,.69,0],.018);box(g,x,.69,0,.055,.032,.36,WOOD,'wood');}break;
    }
    case 'bed':{
      box(g,0,.37,0,.8,.13,1.78,0x8eaaa9,'steel',.03,3);cylinder(g,0,.24,0,.095,.24);box(g,0,.16,0,.67,.07,1.55,WHITE);
      cushion(g,0,.54,0,.9,.19,1.9,0xf0eee3,0);const blanket=box(g,0,.665,.28,.91,.065,1.22,0x6b969c,'fabric',.027,6,.018,2);
      for(let i=0;i<5;i++)box(g,-.34+i*.17,.705,.77,.006,.006,.18,0x8cb5b8,'fabric');
      box(g,0,.695,-.64,.61,.14,.37,WHITE,'fabric',.06,8,.018,1);seam(g,.87,1.86,.58);
      for(const z of [-1.0,1.0]){box(g,0,.67,z,.97,.58,.055,WHITE,'paint',.027,4);box(g,0,.91,z,.85,.065,.07,TEAL,'vinyl',.025,3);}
      for(const x of [-.505,.505]){for(const z of [-.5,.5])pipe(g,[x,.42,z],[x,.87,z],.017);pipe(g,[x,.87,-.54],[x,.87,.54],.022);pipe(g,[x,.7,-.54],[x,.7,.54],.013);}
      wheels(g,0,0,.76,1.63);break;
    }
    case 'medical-monitor':{
      box(g,0,.13,0,.38,.055,.38,WHITE);wheels(g,0,0,.3,.3,.05);cylinder(g,0,.66,0,.023,1.08);screen(g,0,1.24,0,.38,.29,true);
      box(g,0,.94,0,.28,.025,.22,WHITE);curve(g,[[.16,1.13,0],[.24,.9,.03],[.23,.45,.04],[.08,.23,0]],.006,DARK);break;
    }
    case 'ups':{box(g,0,.4,0,.38,.8,.58,DARK,'paint',.025,4);screen(g,0,.61,.296,.21,.115);for(let i=0;i<8;i++)box(g,0,.14+i*.035,.296,.26,.012,.006,0x667e85,'steel');wheels(g,0,0,.27,.42,.035);break;}
    case 'panel':{box(g,0,0,0,.4,.64,.15,0xc4ceca,'steel');box(g,0,0,.085,.35,.58,.025,WHITE);for(let i=0;i<3;i++){box(g,-.1+i*.1,.04,.11,.06,.23,.04,DARK);box(g,-.1+i*.1,.1,.14,.045,.045,.02,0xd7a04c);}break;}
    case 'tablet':{box(g,0,.024,0,.26,.028,.35,DARK,'paint',.018,4);box(g,0,.041,0,.23,.006,.3,material(0x2a6178,0x2a6178));break;}
    case 'cabinet':{box(g,0,.9,0,1.04,1.8,.4,WHITE,'paint',.02,3);for(const x of [-.26,.26]){box(g,x,.94,.217,.49,1.58,.024,0xc4d9d5);pipe(g,[x-Math.sign(x)*.16,.83,.25],[x-Math.sign(x)*.16,1.02,.25],.009);}for(const x of [-.42,.42])for(const z of [-.13,.13])cylinder(g,x,.05,z,.025,.1);break;}
    case 'shelf':{for(const x of [-.53,.53])for(const z of [-.2,.2])box(g,x,.85,z,.027,1.7,.027,METAL,'steel');for(let i=0;i<4;i++){box(g,0,.12+i*.45,0,1.1,.03,.45,WHITE);for(let j=0;j<4;j++){box(g,-.4+j*.27,.25+i*.45,0,.18,.22,.28,[0x9aafa3,0xc5b495,0x9aaebb][j%3]);box(g,-.4+j*.27,.27+i*.45,.143,.11,.05,.003,WHITE);}}break;}
    case 'washer':{box(g,0,.44,0,.68,.88,.62,WHITE,'paint',.035,4);const c=cylinder(g,0,.4,.32,.235,.05,DARK,'paint');c.rotation.x=Math.PI/2;const d=cylinder(g,0,.4,.355,.18,.015,0x6b96a2);d.rotation.x=Math.PI/2;box(g,-.12,.76,.32,.3,.065,.02,DARK);cylinder(g,.22,.76,.34,.027,.022).rotation.x=Math.PI/2;break;}
    case 'plant':{cylinder(g,0,.17,0,.17,.32,0xd0c2ac,'paint',.21);cylinder(g,0,.335,0,.18,.013,0x4b483b,'paint');for(let i=0;i<8;i++){const a=i*2.4,h=.4+i%3*.13;pipe(g,[0,.3,0],[Math.cos(a)*.13,h,Math.sin(a)*.13],.007,0x587b58,'paint');const leaf=new T.Mesh(new T.SphereGeometry(1,10,6),material(i%2?0x718d62:0x537958));leaf.position.set(Math.cos(a)*.16,h,Math.sin(a)*.16);leaf.scale.set(.075,.18,.025);leaf.rotation.set(.3,a,.4);leaf.castShadow=true;g.add(leaf);}break;}
    case 'ct-scanner':{box(g,0,.4,.45,.62,.13,2.0,WHITE,'paint',.045,4);box(g,0,.23,.7,.44,.39,.45,0x99b6b8);box(g,0,.5,.53,.53,.055,1.8,0x9ebec1,'vinyl',.025,4);
      const ring=new T.Mesh(new T.TorusGeometry(.61,.2,16,48),material(WHITE));ring.position.set(0,.98,-.43);g.add(ring);const inner=new T.Mesh(new T.TorusGeometry(.452,.018,8,48),material(TEAL));inner.position.set(0,.98,-.217);g.add(inner);box(g,0,.32,-.44,1.5,.6,.62,WHITE,'paint',.06,4);break;}
    case 'wall-terminal':{
      box(g,0,.92,0,.62,.045,.24,WOOD,'wood');pipe(g,[0,.72,-.06],[0,.92,-.06],.023);screen(g,0,1.17,-.015,.46,.28);box(g,0,.953,.04,.33,.012,.1,DARK);break;
    }
    case 'operating-table':{
      box(g,0,.2,0,.52,.12,.9,WHITE);cylinder(g,0,.44,0,.09,.43);box(g,0,.69,0,.6,.1,1.6,METAL,'steel',.035,4);
      for(let i=0;i<3;i++)cushion(g,0,.78,-.53+i*.53,.57,.09,.5,0x548e95,i);wheels(g,0,0,.43,.76);break;
    }
    case 'stairs':{
      // U-shaped internal staircase; 20 risers at 0.17 scene units.
      const half=FLOOR_HEIGHT/2,rise=FLOOR_HEIGHT/20,tread=.29;
      for(let i=0;i<10;i++){
        box(g,-.65,(i+.5)*rise,1.3-i*tread,1.12,rise,.295,0xcbd2ce,'paint',.006);
        box(g,.65,half+(i+.5)*rise,-1.31+i*tread,1.12,rise,.295,0xcbd2ce,'paint',.006);
        box(g,-.65,(i+1)*rise+.005,1.43-i*tread,1.1,.012,.025,0x597c7c,'vinyl');
        box(g,.65,half+(i+1)*rise+.005,-1.44+i*tread,1.1,.012,.025,0x597c7c,'vinyl');
      }
      box(g,0,half-.06,-1.69,2.5,.12,.65,0xcbd2ce);box(g,.65,FLOOR_HEIGHT-.06,1.72,1.12,.12,.43,0xcbd2ce);
      for(const x of [-1.08,-.22])pipe(g,[x,.02,1.43],[x,half-.12,-1.44],.065);
      for(const x of [.22,1.08])pipe(g,[x,half-.12,-1.44],[x,FLOOR_HEIGHT-.12,1.43],.065);
      for(const x of [-1.23,-.07]){
        for(let i=0;i<5;i++)pipe(g,[x,rise+i*(half-rise)/4,1.3-i*.6525],[x,1.12+i*(half-rise)/4,1.3-i*.6525],.014);
        pipe(g,[x,1.12,1.3],[x,half+.95,-1.31],.022);
      }
      for(const x of [.07,1.23]){
        for(let i=0;i<5;i++)pipe(g,[x,half+rise+i*(half-rise)/4,-1.31+i*.6525],[x,half+1.12+i*(half-rise)/4,-1.31+i*.6525],.014);
        pipe(g,[x,half+1.12,-1.31],[x,FLOOR_HEIGHT+.95,1.3],.022);
      }break;
    }
    case 'stair-landing':{for(const x of [-1.23,-.07]){for(const z of [-1.75,0,1.5])pipe(g,[x,0,z],[x,1.0,z],.015);pipe(g,[x,1,-1.75],[x,1,1.5],.023);}break;}
    case 'cable-tray':{for(const x of [-.15,.15])box(g,x,0,0,.018,.08,2,METAL,'steel');for(let i=0;i<10;i++)box(g,0,-.038,-.9+i*.2,.3,.018,.02,METAL,'steel');break;}
    case 'cctv':{cylinder(g,0,0,0,.115,.035,WHITE,'paint');const dome=new T.Mesh(new T.SphereGeometry(.09,20,12,0,Math.PI*2,0,Math.PI/2),material(0x243d49));dome.rotation.x=Math.PI;dome.position.y=-.01;g.add(dome);cylinder(g,0,-.052,.06,.025,.022,DARK).rotation.x=Math.PI/2;break;}
    case 'socket':{box(g,0,0,0,.13,.13,.024,WHITE);for(const x of [-.025,.025])cylinder(g,x,0,.017,.009,.012,DARK,'paint').rotation.x=Math.PI/2;break;}
    case 'toilet':{box(g,0,.25,0,.36,.42,.52,WHITE,'ceramic',.12,6);box(g,0,.43,.04,.4,.065,.55,0xe8eeeb,'ceramic',.13,6);box(g,0,.61,-.23,.38,.43,.15,WHITE,'paint',.03,4);break;}
    case 'sink':{box(g,0,.76,0,.68,.08,.43,WHITE,'paint',.04,4);box(g,0,.8,.02,.4,.025,.25,0xaac0c0,'paint',.07,4);pipe(g,[0,.8,-.14],[0,1.03,-.14],.017);pipe(g,[0,1.03,-.14],[0,1.03,.01],.017);break;}
    case 'worktop':{box(g,0,.89,0,1.1,.055,.5,0xe8ebe3,'paint',.018,3);box(g,0,.44,0,1.03,.85,.44,0xc2d5d0);for(const x of [-.25,.25])box(g,x,.48,.231,.017,.15,.025,METAL,'steel');break;}
    case 'reception-desk':{box(g,0,.49,0,2.05,.98,.6,0xc1d1c8,'paint',.035,3);box(g,0,1.0,0,2.12,.065,.68,WOOD,'wood',.025,3);box(g,0,.57,.31,1.85,.42,.02,TEAL);break;}
    case 'registration-counter':{
      // Open staff side, knee recess and side storage; no solid wall behind entry.
      box(g,0,1.0,0,1.9,.07,.7,WOOD,'wood',.025,4);
      box(g,0,.5,.29,1.83,.92,.06,TEAL,'paint',.018,3);
      for(const x of [-.68,.68]){box(g,x,.47,-.04,.32,.9,.48,WHITE);box(g,x,.48,-.29,.27,.75,.02,0xc3d1c8);pipe(g,[x-.05,.57,-.312],[x+.05,.57,-.312],.008);}
      box(g,0,.12,.324,1.8,.14,.012,0x9baeb3,'steel');break;
    }
    case 'reception-terminal':{
      box(g,0,1.048,-.1,.23,.018,.15,DARK);pipe(g,[0,1.05,-.13],[0,1.25,-.15],.022);screen(g,0,1.34,-.15,.54,.32);
      box(g,-.04,1.048,.13,.37,.019,.12,0xc8d0d0);for(let i=0;i<9;i++)for(let j=0;j<3;j++)box(g,-.2+i*.037,1.06,.09+j*.032,.027,.004,.022,0x65727a);
      box(g,.25,1.052,.12,.06,.025,.095,DARK,'paint',.02,4);box(g,.3,.36,-.04,.17,.42,.3,DARK);led(g,.3,.52,.12);
      const chair=makeAsset('chair');chair.position.z=.63;g.add(chair);curve(g,[[0,1.25,-.18],[.06,1.04,-.21],[.2,.5,-.2],[.3,.47,-.19]],.007,DARK);break;
    }
    case 'entrance-leaf':{
      for(const x of [-.39,.39])box(g,x,1.05,0,.04,2.1,.052,METAL,'steel');
      for(const y of [.04,2.06])box(g,0,y,0,.82,.08,.052,METAL,'steel');
      box(g,0,1.05,0,.74,1.98,.016,0xaac9cf,'glass');box(g,0,1.05,.022,.74,.075,.012,0x759d9b,'vinyl');
      for(const z of [-.045,.045])pipe(g,[0,.85,z],[0,1.25,z],.013);box(g,0,.12,0,.74,.13,.035,METAL,'steel');break;
    }
    case 'door-leaf':{
      box(g,0,.62,0,.82,1.24,.045,0xb69773,'wood',.012,3);box(g,0,1.92,0,.82,.36,.045,0xb69773,'wood',.012,3);for(const x of [-.315,.315])box(g,x,1.49,0,.19,.5,.045,0xb69773,'wood');box(g,0,1.49,0,.4,.43,.016,0x89b4bb,'glass');
      for(const x of [-.225,.225])box(g,x,1.49,.036,.018,.47,.015,METAL,'steel');for(const y of [1.255,1.725])box(g,0,y,.036,.46,.018,.015,METAL,'steel');
      box(g,0,.18,.027,.77,.24,.012,METAL,'steel');pipe(g,[.27,1,.055],[.27,1.19,.055],.014);box(g,.28,1.08,-.035,.09,.13,.012,METAL,'steel');break;
    }
    case 'ceiling-light':{box(g,0,0,0,.64,.045,.34,0xc9d1cf,'steel');box(g,0,-.025,0,.59,.012,.29,material(0xfff5dc,0xffedc8));break;}
    case 'air-vent':{box(g,0,0,0,.44,.025,.31,WHITE);for(let i=0;i<7;i++)box(g,0,-.019,-.12+i*.04,.37,.009,.012,0x8e9d9d,'steel');break;}
    case 'smoke-detector':{cylinder(g,0,0,0,.065,.035,WHITE,'paint');cylinder(g,0,-.023,0,.048,.012,0xc7cfca,'paint');break;}
    case 'sprinkler':{cylinder(g,0,0,0,.035,.017,WHITE,'paint');cylinder(g,0,-.027,0,.013,.045,METAL);cylinder(g,0,-.053,0,.026,.006,0xbd8270,'steel');break;}
    case 'bedside-table':{box(g,0,.4,0,.42,.75,.4,0xd2d9cf);box(g,0,.8,0,.46,.045,.43,WOOD,'wood');box(g,0,.6,.206,.34,.19,.015,WHITE);pipe(g,[-.07,.63,.225],[.07,.63,.225],.009);box(g,0,.3,.21,.34,.33,.015,0x90a9a4);wheels(g,0,0,.31,.29,.03);break;}
    case 'iv-pole':{for(let i=0;i<4;i++){const a=i*Math.PI/2;pipe(g,[0,.1,0],[Math.cos(a)*.19,.04,Math.sin(a)*.19],.013);}cylinder(g,0,.97,0,.013,1.8);pipe(g,[-.18,1.84,0],[.18,1.84,0],.012);box(g,-.13,1.6,0,.13,.25,.045,0xb6d6cf,'glass',.025,4);curve(g,[[-.13,1.48,0],[-.14,1.1,.02],[-.04,.88,.02]],.0035,0xaac9c9);break;}
    case 'bed-head-unit':{box(g,0,0,0,.85,.19,.065,WHITE);for(const x of [-.28,-.1,.1,.28]){cylinder(g,x,0,.045,.025,.018,x<0?0x6e9caa:0xb8a76e,'paint').rotation.x=Math.PI/2;}box(g,0,.045,.049,.21,.028,.012,material(0xffeccb,0xffeccb));break;}
    case 'privacy-curtain':{pipe(g,[-.72,2.46,-.9],[-.72,2.46,1.03],.013);pipe(g,[-.72,2.46,1.03],[.72,2.46,1.03],.013);for(const x of [-.68,.68])pipe(g,[x,2.46,1.03],[x,2.87,1.03],.01);for(let i=0;i<8;i++)box(g,-.64+i*.045,1.53,1.03+(i%2)*.025,.055,1.76,.035,0xa4b9b2,'fabric',.012,3);break;}
    case 'medicine-trolley':{box(g,0,.43,0,.5,.65,.4,WHITE);box(g,0,.8,0,.56,.05,.44,0x6c9b9c);for(let i=0;i<3;i++){box(g,0,.25+i*.19,.206,.45,.16,.018,0xc0d3cb);pipe(g,[-.07,.25+i*.19,.23],[.07,.25+i*.19,.23],.008);}wheels(g,0,0,.4,.3,.045);break;}
    case 'microscope':{box(g,0,.025,0,.22,.045,.28,WHITE);const p=box(g,0,.17,-.06,.07,.27,.07,DARK);p.rotation.x=-.2;box(g,0,.18,.02,.18,.025,.17,DARK);const t=cylinder(g,0,.35,.01,.035,.18,0xc5d3cf,'paint');t.rotation.x=.4;box(g,0,.3,-.09,.17,.06,.13,WHITE);break;}
    case 'test-tube-rack':{box(g,0,.025,0,.32,.035,.16,0x8aabb0);for(let i=0;i<6;i++){cylinder(g,-.13+i*.052,.12,0,.014,.18,0xc2e1de,'glass');cylinder(g,-.13+i*.052,.215,0,.017,.018,[0xb78269,0x719da3,0x8b9f73][i%3],'paint');}break;}
    case 'ultrasound':{box(g,0,.51,0,.47,.82,.42,WHITE);wheels(g,0,0,.35,.3,.06);box(g,0,.94,.04,.52,.055,.47,0xc4d4d1);screen(g,0,1.23,-.1,.4,.29,true);curve(g,[[.22,.95,.1],[.3,.6,.13],[.3,.35,.1],[.17,.86,.12]],.008,DARK);break;}
    case 'fridge':{box(g,0,.86,0,.64,1.7,.59,WHITE,'paint',.025,4);box(g,0,1.38,.305,.59,.57,.018,0xdfebe5);box(g,0,.55,.305,.59,1.05,.018,0xdfebe5);for(const y of [.8,1.48])pipe(g,[.22,y-.12,.34],[.22,y+.12,.34],.013);break;}
    case 'hamper':{box(g,0,.38,0,.44,.66,.43,0xb3b7a0,'fabric',.05,4);box(g,0,.73,0,.46,.045,.45,WHITE);wheels(g,0,0,.32,.31,.04);break;}
    case 'waste-bin':{cylinder(g,0,.22,0,.15,.41,0x8eaaa2,'paint',.16);cylinder(g,0,.44,0,.164,.045,DARK,'paint');box(g,0,.018,.13,.11,.035,.06,METAL,'steel');break;}
    case 'water-dispenser':{box(g,0,.48,0,.34,.94,.32,WHITE);cylinder(g,0,1.08,0,.13,.28,0x92bac5,'glass');box(g,0,.78,.17,.24,.2,.035,DARK);for(const x of [-.06,.06])box(g,x,.83,.2,.04,.045,.045,x<0?0x699bb5:0xb37463);break;}
    case 'fire-extinguisher':{cylinder(g,0,.29,0,.075,.48,0xb65243,'paint');cylinder(g,0,.55,0,.023,.07,DARK,'paint');box(g,0,.59,0,.15,.025,.055,DARK);curve(g,[[.03,.57,0],[.12,.52,0],[.12,.22,.04]],.008,DARK);box(g,0,.3,.077,.09,.14,.006,WHITE);break;}
    case 'soap-dispenser':{box(g,0,0,0,.12,.2,.08,WHITE,'paint',.02,4);box(g,0,-.065,.047,.08,.04,.02,0x9eafaf);break;}
    case 'wall-clock':{const c=cylinder(g,0,0,0,.17,.035,DARK,'paint');c.rotation.x=Math.PI/2;const face=cylinder(g,0,0,.022,.153,.008,WHITE,'ceramic');face.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,Math.sin(a)*.13,Math.cos(a)*.13,.029,.009,.014,.004,DARK);}box(g,.024,.035,.035,.012,.09,.007,DARK).rotation.z=.6;box(g,-.035,.01,.04,.09,.01,.007,DARK);break;}
    case 'mirror':{box(g,0,0,0,.55,.65,.025,WHITE);box(g,0,0,.017,.51,.61,.008,0xc8d9de,'glass');break;}
    case 'meeting-table':{box(g,0,.74,0,1.05,.055,.73,WOOD,'wood',.045,4);for(const x of [-.4,.4])for(const z of [-.25,.25])box(g,x,.36,z,.035,.72,.035,DARK,'steel');break;}
    case 'sofa':{for(const x of [-.4,.4])cushion(g,x,.43,0,.76,.16,.67,0x7a8fa0);box(g,0,.7,-.31,1.6,.58,.16,0x7a8fa0,'fabric',.065,6);for(const x of [-.85,.85])box(g,x,.57,0,.15,.38,.73,0x7a8fa0,'fabric',.06,6);for(const x of [-.7,.7])for(const z of [-.22,.22])cylinder(g,x,.12,z,.027,.2,METAL);break;}
    case 'parallel-bars':{for(const x of [-.4,.4]){pipe(g,[x,1,-.75],[x,1,.75],.025);for(const z of [-.65,.65]){pipe(g,[x,.1,z],[x,1,z],.022);box(g,x,.07,z,.22,.04,.25,DARK,'rubber');}}break;}
    case 'surgical-light':{cylinder(g,0,2.9,0,.09,.04,WHITE,'paint');pipe(g,[0,2.9,0],[0,2.6,0],.035);pipe(g,[0,2.6,0],[.4,2.35,0],.035);pipe(g,[.4,2.35,0],[0,2.1,.12],.028);const c=cylinder(g,0,2.03,.12,.25,.075,WHITE,'paint');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;cylinder(g,Math.cos(a)*.13,1.986,.12+Math.sin(a)*.13,.047,.012,material(0xfff1d5,0xfff1d5));}break;}
    case 'rooftop-hvac':{box(g,0,.35,0,1.2,.7,.8,0xa8b8b6,'steel');for(const x of [-.3,.3]){cylinder(g,x,.72,0,.22,.04,DARK,'steel');for(let i=0;i<4;i++){const a=i*Math.PI/2,p=box(g,x,.748,0,.31,.012,.05,METAL,'steel');p.rotation.y=a;}}for(let i=0;i<9;i++)box(g,0,.16+i*.055,.411,1.05,.017,.012,DARK);break;}
    case 'garden-tree':{
      cylinder(g,0,1.16,0,.16,2.32,0x877360,'wood',.09);
      for(let i=0;i<9;i++){const a=i*2.399,r=.28+(i%3)*.22,y=2.0+(i%4)*.36;pipe(g,[0,1.5,0],[Math.cos(a)*r,y,Math.sin(a)*r],.035,0x877360,'wood');
       const geo=new T.SphereGeometry(1,14,10);geo.computeTangents();const leaf=new T.Mesh(geo,material([0x64896b,0x739b75,0x557e62][i%3],0,'leaf'));leaf.position.set(Math.cos(a)*r,y+.28,Math.sin(a)*r);leaf.scale.set(.75+(i%2)*.15,.72,.68);leaf.rotation.y=a;g.add(leaf);}
      break;
    }
    case 'garden-bench':{
      for(const x of [-.68,.68]){box(g,x,.25,0,.075,.5,.5,DARK,'steel');pipe(g,[x,.39,-.22],[x,.91,-.31],.028,DARK,'steel');}
      for(let i=0;i<5;i++)box(g,0,.47,-.24+i*.12,1.9,.05,.1,WOOD,'wood',.012);
      for(let i=0;i<3;i++)box(g,0,.64+i*.12,-.3,1.9,.095,.045,WOOD,'wood',.012);break;
    }
    case 'bollard-light':{cylinder(g,0,.34,0,.075,.68,DARK,'steel');cylinder(g,0,.61,0,.079,.12,material(0xffebc5,0xffdb9b),'glass');cylinder(g,0,.7,0,.085,.05,DARK,'steel');break;}
    case 'street-light':{cylinder(g,0,1.95,0,.055,3.9,DARK,'steel');pipe(g,[0,3.83,0],[.65,3.9,0],.045,DARK,'steel');box(g,.65,3.87,0,.7,.065,.3,DARK,'steel',.03);box(g,.65,3.83,0,.62,.012,.24,material(0xffe6b8,0xffdeaa));break;}
    case 'car':case 'ambulance':{
      const ambulance=kind==='ambulance',w=ambulance?1.73:1.6,d=ambulance?3.6:3.35,paint=ambulance?WHITE:0x6b8791;
      box(g,0,.57,0,w,.56,d,paint,'paint',.18,6);box(g,0,.38,0,w*.92,.16,d*.88,DARK,'rubber',.06,4);
      if(ambulance){box(g,0,1.22,-.47,w*.99,1.12,2.5,WHITE,'paint',.075,5);box(g,0,1.0,1.03,w*.92,.65,1.12,WHITE,'paint',.1,5);}
      else box(g,0,.97,-.16,w*.84,.63,1.95,paint,'paint',.18,6);
      box(g,0,ambulance?1.15:1.02,ambulance?1.57:.78,w*.77,.38,.025,0x7595a0,'glass',.05,4);
      for(const x of [-1,1]){box(g,x*w*.485,1.02,ambulance?1.0:-.02,.018,.36,ambulance?.65:1.48,0x7a9aa4,'glass',.035,4);box(g,x*(w/2+.08),.96,1.0,.16,.1,.15,paint,'paint',.03,3);
       for(const z of [-d*.32,d*.31]){const tire=cylinder(g,x*(w/2-.02),.31,z,.31,.17,DARK,'rubber');tire.rotation.z=Math.PI/2;const rim=cylinder(g,x*(w/2+.071),.31,z,.17,.017,METAL,'steel');rim.rotation.z=Math.PI/2;}
       box(g,x*w*.34,.61,d/2+.015,.28,.12,.025,material(0xffecc1,0xffe3af),'paint',.025,3);box(g,x*w*.34,.61,-d/2-.015,.25,.11,.025,0xb6534a,'paint',.02,3);
       if(ambulance){box(g,x*(w/2+.014),1.18,-.55,.025,.55,.16,0xb75a50);box(g,x*(w/2+.016),1.18,-.55,.025,.16,.55,0xb75a50);box(g,x*(w/2+.015),.72,-.32,.025,.12,2.8,0xb75a50);}
      }
      if(ambulance){box(g,0,1.87,.15,1.04,.13,.26,DARK,'paint',.03,4);for(const x of [-.38,.38])box(g,x,1.89,.15,.25,.12,.24,material(x<0?0xb85d58:0x699bbd,x<0?0xa13f3b:0x397fa9),'paint',.03,4);}
      break;
    }
    case 'data-outlet':{box(g,0,0,0,.16,.12,.018,WHITE);for(const x of [-.037,.037]){box(g,x,0,.015,.047,.042,.008,DARK);box(g,x,.037,.016,.047,.008,.006,TEAL);}break;}
    case 'fiber-panel':{box(g,0,0,0,.6,.12,.18,DARK,'steel');for(let i=0;i<8;i++){box(g,-.245+i*.07,0,.1,.045,.05,.025,0x3b9e97,'paint');cylinder(g,-.245+i*.07,0,.123,.009,.018,METAL,'steel').rotation.x=Math.PI/2;}break;}
    case 'exit-sign':{box(g,0,0,0,.38,.15,.035,material(0x3f8370,0x286c57));box(g,-.08,0,.026,.065,.1,.006,WHITE);box(g,.065,0,.026,.1,.016,.006,WHITE);box(g,.11,.025,.026,.015,.06,.006,WHITE).rotation.z=.65;box(g,.11,-.025,.026,.015,.06,.006,WHITE).rotation.z=-.65;break;}
    case 'wall-art':{box(g,0,0,0,.66,.45,.035,WOOD,'wood');box(g,0,0,.025,.6,.39,.008,0xe4e5d7,'fabric');for(let i=0;i<5;i++)box(g,-.24+i*.12,-.08+Math.sin(i)*.045,.032,.09,.12+i*.025,.004,[0x91b3a5,0x638c86,0xb0bd9b][i%3],'paint');break;}
    default:throw new Error(`Unknown asset: ${kind}`);
  }
  // A padded atlas cell per component, with six islands on every bevel box.
  const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push(o);});const grid=Math.ceil(Math.sqrt(meshes.length));
  meshes.forEach((mesh,index)=>{
    mesh.geometry=mesh.geometry.clone();const uv=mesh.geometry.attributes.uv;
    if(uv){for(let i=0;i<uv.count;i++)uv.setXY(i,((index%grid)+.025+uv.getX(i)*.95)/grid,(Math.floor(index/grid)+.025+uv.getY(i)*.95)/grid);if(mesh.geometry.index)mesh.geometry.computeTangents();}
    mesh.geometry.userData.atlasCell=index;mesh.geometry.userData.atlasGrid=grid;
  });g.userData.atlasCells=meshes.length;assetCache.set(kind,g);return g.clone(true);
}
export const ASSET_NAMES=['server','rack','switch','router','ap','pc','chair','waiting-bench','bed','medical-monitor','ups','panel','tablet','cabinet','shelf','washer','plant','ct-scanner','stairs','stair-landing','cable-tray','cctv','socket','toilet','sink','worktop','reception-desk','wall-terminal','operating-table','door-leaf','ceiling-light','air-vent','smoke-detector','sprinkler','bedside-table','iv-pole','bed-head-unit','privacy-curtain','medicine-trolley','microscope','test-tube-rack','ultrasound','fridge','hamper','waste-bin','water-dispenser','fire-extinguisher','soap-dispenser','wall-clock','mirror','meeting-table','sofa','parallel-bars','surgical-light','rooftop-hvac','registration-counter','reception-terminal','entrance-leaf','garden-tree','garden-bench','bollard-light','street-light','car','ambulance','data-outlet','fiber-panel','exit-sign','wall-art'];
export function mergeStatic(root) {
  root.updateMatrixWorld(true);const groups=new Map();
  root.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const key=o.material.uuid;
    if(!groups.has(key))groups.set(key,{mat:o.material,attributes:{}});const b=groups.get(key);
    for(const name of ['position','normal','uv','tangent']){
      let attr=geo.getAttribute(name);if(!attr){const count=geo.attributes.position.count,itemSize=name==='uv'?2:4,arr=new Float32Array(count*itemSize);if(name==='tangent')for(let i=0;i<count;i++)arr.set([1,0,0,1],i*4);attr=new T.BufferAttribute(arr,itemSize);}
      (b.attributes[name]??=[]).push(attr.array);
    }geo.dispose();
  });
  const result=new T.Group(),sizes={position:3,normal:3,uv:2,tangent:4};
  for(const b of groups.values()){
    const geo=new T.BufferGeometry();for(const [name,arrays]of Object.entries(b.attributes)){const out=new Float32Array(arrays.reduce((s,a)=>s+a.length,0));let offset=0;for(const a of arrays){out.set(a,offset);offset+=a.length;}geo.setAttribute(name,new T.BufferAttribute(out,sizes[name]));}
    geo.computeBoundingSphere();const mesh=new T.Mesh(geo,b.mat);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);
  }return result;
}

// Original wall GLBs have no UVs. Generate a stable planar map before PBR use.
export function addPlanarUVs(geometry){
  if(geometry.attributes.uv)return geometry;
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    const u=ny>nx&&ny>nz?p.getX(i):nx>nz?p.getZ(i):p.getX(i),v=ny>nx&&ny>nz?p.getZ(i):p.getY(i);
    uv[i*2]=u*.08;uv[i*2+1]=v*.08;
  }
  geometry.setAttribute('uv',new T.BufferAttribute(uv,2));if(geometry.index)geometry.computeTangents();return geometry;
}
