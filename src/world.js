import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/addons/controls/OrbitControls.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {ROOMS,FLOORS,NETWORK,DEVICE_MAP,COLORS,devicePoint,elevation,roomById,FLOOR_HEIGHT} from './data.js';
import {EDGES,pointOnPath,pathLength,moveWithCollision,safeSpot,powered} from './engine.js';
import {makeAsset,box,mergeStatic,material} from './assets.js';
import {surface,setSurfaceQuality} from './surfaces.js';
import {makeRoof,makeCeiling,makeEnvelopeDetails,makeConnector,cutStairDoorway} from './building.js';
import {STAIR_LANDINGS,stairPosition,nearStairs} from './experience.js';

const $=q=>document.querySelector(q),vec=p=>new T.Vector3(...p);
export class HospitalWorld {
  constructor(callbacks,state) {
    this.callbacks=callbacks;this.state=state;this.floor=1;this.mode='orbit';this.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.roofMode='auto';this.installationLinks=null;this.transit=null;this.quality='normal';
    this.speed=1;this.simTime=0;this.layers={copper:true,fiber:true,wifi:false,power:false};
    this.floors=new Map();this.clickables=[];this.labelItems=[];this.cables=[];this.obstacles={1:[],2:[]};
    this.keys={};this.player=[...FLOORS[1].spawn];this.yaw=-Math.PI/2;this.pitch=0;this.selected=null;
    this.scene=new T.Scene();this.scene.background=new T.Color(0xedf0e9);
    this.renderer=new T.WebGLRenderer({canvas:$('#scene'),antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.06;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.camera=new T.PerspectiveCamera(43,1,.05,200);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.075;
    this.controls.maxPolarAngle=Math.PI/2-.08;this.controls.minDistance=2;this.controls.maxDistance=95;this.controls.target.set(1,0,0);
    this.scene.add(new T.HemisphereLight(0xf6fff7,0x6f8e7f,2.3));
    this.sun=new T.DirectionalLight(0xfff4df,3);this.sun.position.set(10,25,14);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-22,right:22,top:19,bottom:-19,near:.5,far:70});
    this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.035;this.scene.add(this.sun);
    const ground=new T.Mesh(new T.PlaneGeometry(160,160),material(0xedf0e9));ground.rotation.x=-Math.PI/2;ground.position.y=-.28;ground.receiveShadow=true;this.scene.add(ground);
    const grid=new T.GridHelper(100,50,0xcbd7cc,0xe0e6db);grid.position.y=-.27;grid.material.transparent=true;grid.material.opacity=.25;this.scene.add(grid);
    this.selectionRing=new T.Mesh(new T.TorusGeometry(.72,.025,6,40),new T.MeshBasicMaterial({color:0xd59b45}));this.selectionRing.rotation.x=Math.PI/2;this.selectionRing.visible=false;this.scene.add(this.selectionRing);
    const marker=new T.Group();const disk=new T.Mesh(new T.CylinderGeometry(.17,.17,.07,18),material(0x277d69));marker.add(disk);
    const cone=new T.Mesh(new T.ConeGeometry(.12,.28,8),material(0x277d69));cone.position.y=.28;marker.add(cone);this.marker=marker;this.scene.add(marker);
    this.resize=new ResizeObserver(()=>this.onResize());this.resize.observe($('#world'));
    this.bindInputs();this.onResize();this.home(false);
  }
  async load() {
    const loader=new GLTFLoader();let done=0;
    await Promise.all([1,2].map(async floor=>{
      const [gltf,res]=await Promise.all([loader.loadAsync(FLOORS[floor].model),fetch(`assets/collision-${floor}.json`)]);
      if(!res.ok)throw new Error(`Data navigasi tidak tersedia untuk lantai ${floor}`);
      const collisions=await res.json();
      const root=new T.Group();root.name=`Floor ${floor}`;root.position.y=elevation(floor);root.visible=floor===1;
      const architecture=gltf.scene;cutStairDoorway(architecture,floor);architecture.scale.y=.35;
      architecture.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.add(architecture);
      const fixed=new T.Group();
      const b=FLOORS[floor].bounds;
      if(floor===1) {
        box(fixed,1.975,-.12,.055,22.62,.24,15.8,0xe7ede3);
        box(fixed,-11.23,-.12,-6.2,3.78,.24,3.3,0xe7ede3);
      } else box(fixed,0,-.12,0,22.63,.24,10.9,0xe7ede3);
      for(const r of ROOMS.filter(r=>r.floor===floor))this.buildRoom(fixed,r);
      for(const n of NETWORK.filter(n=>n.floor===floor)) {
        const obj=makeAsset(n.kind);obj.position.set(n.x,n.y,n.z);fixed.add(obj);
        if(['switch','router'].includes(n.kind)){box(fixed,n.x,n.y-.05,n.z,.84,.05,.46,0xc9d8ce);box(fixed,n.x,n.y/2-.04,n.z,.035,n.y-.08,.035,0x8aa79c);}
        const point=devicePoint(n),h=n.kind==='ap'?.5:1.4;
        const proxy=new T.Mesh(new T.BoxGeometry(n.kind==='ap'?.7:1.05,h,n.kind==='ap'?.7:.85),new T.MeshBasicMaterial({visible:false}));
        proxy.position.set(n.x,n.kind==='ap'?n.y:.7+n.y,n.z);proxy.userData.device=n;root.add(proxy);this.clickables.push(proxy);
        if(['pc','server','rack','ups'].includes(n.kind))this.obstacles[floor].push(n.kind==='pc'?[n.x-.6,n.z-.34,n.x+.6,n.z+1.0]:[n.x-.42,n.z-.34,n.x+.42,n.z+.37]);
        if(['server','core','sw-l2'].includes(n.id))this.makeLabel(n.name,[n.x,point[1]+.4,n.z],floor,n.id,true);
      }
      // Separated raised cable trays through the corridors.
      const corridors=floor===1?[-2.9,2.7]:[-.35];
      for(const z of corridors)for(let x=floor===1?-8:-10;x<(floor===1?12:10);x+=2){const tray=makeAsset('cable-tray');tray.rotation.y=Math.PI/2;tray.position.set(x,2.47,z);fixed.add(tray);}
      const roof=makeRoof(floor),ceiling=makeCeiling(floor),details=makeEnvelopeDetails(floor);root.add(roof,ceiling,details,mergeStatic(fixed));
      this.scene.add(root);this.floors.set(floor,{root,architecture,collisions,roof,ceiling,details});
      done++;this.callbacks.progress(done/2);
    }));
    this.connector=makeConnector();this.scene.add(this.connector);this.buildNetwork();this.updateState();this.onResize();this.renderer.shadowMap.needsUpdate=true;
    this.setFloor(1,false);this.last=performance.now();this.fpsStart=this.last;this.frames=0;
    this.animate=this.animate.bind(this);this.animationId=requestAnimationFrame(this.animate);
  }
  buildRoom(g,r) {
    const [x0,z0,x1,z1]=r.bounds,[x,z]=r.center;
    const color={server:0xd2e5e2,clinical:0xdce8e3,ward:0xdbe8e0,icu:0xd1e4de,operation:0xdbe4e5,lab:0xdde7e5,pharmacy:0xe2e8dc,radiology:0xe0e4eb,corridor:0xf5f5ed,registration:0xece9df,stairs:0xd7e0d8,toilet:0xe3e8e0}[r.type]||0xe8ece2;
    box(g,x,.007,z,x1-x0,.025,z1-z0,surface(color,'tile'));
    if(r.type!=='corridor'){for(const px of [x0+.025,x1-.025])box(g,px,.06,z,.035,.1,z1-z0,0x9eafa6);}
    this.makeLabel(r.name,[x,elevation(r.floor)+.11,z],r.floor,r.id,false);
    const add=(kind,px,pz,rot=0,scale=1)=>{const o=makeAsset(kind);o.position.set(px,0,pz);o.rotation.y=rot;o.scale.setScalar(scale);g.add(o);return o;};
    const obstacle=(px,pz,w,d)=>this.obstacles[r.floor].push([px-w/2,pz-d/2,px+w/2,pz+d/2]);
    if(['ward','icu'].includes(r.type)){
      const count=r.type==='icu'?3:2;
      for(let i=0;i<count;i++){const bx=x0+.78+i*(x1-x0-1.56)/(count-1);add('bed',bx,z0+1.35);obstacle(bx,z0+1.35,.98,1.95);if(r.type==='icu')add('medical-monitor',bx+.55,z0+1.2,0,.8);}
    } else if(['clinical','operation'].includes(r.type)) {
      const s=x1-x0<2.6?.62:.8;const bx=x0+(x1-x0)*.27,bz=z0+(z1-z0)*.45;
      add('bed',bx,bz,Math.PI/2,s);obstacle(bx,bz,1.95*s,.98*s);if(x1-x0>2.8)add('medical-monitor',bx,bz-.75,0,.8);
    } else if(r.type==='radiology'){add('ct-scanner',x-.65,z-.6,Math.PI/2);obstacle(x-.65,z-.6,2.1,1.5);}
    else if(r.type==='laundry'){for(let i=0;i<3;i++)add('washer',x0+.6+i*.85,z0+.55);}
    else if(['storage','pharmacy','lab','kitchen'].includes(r.type)){
      for(let i=0;i<Math.min(3,Math.floor((x1-x0)/1.3));i++)add(r.type==='storage'?'shelf':'cabinet',x0+.75+i*1.2,z0+.45);
    } else if(r.type==='stairs'){const landing=STAIR_LANDINGS[r.floor];for(let i=0;i<5;i++)box(g,landing[0]-.4+i*.2,.03,landing[1],.1,.025,.45,0xc3a85e);}
    else if(r.type==='changing')add('cabinet',x,z+.35,Math.PI,.8);
    else if(r.type==='toilet') {
      for(let i=0;i<Math.min(3,Math.floor((x1-x0)/1.2));i++){box(g,x0+.55+i*1.2,.36,z0+.55,.4,.55,.55,0xf5f7f3);}
    }
    if(!['corridor','toilet','stairs','server','changing'].includes(r.type)&&x1-x0>2.8)add('plant',x1-.4,z1-.4,0,.8);
    if(r.type==='registration'){for(let i=0;i<4;i++)add('chair',x0+.6+i*.6,z1-.55,Math.PI);}
    if(r.type==='security'){const cam=makeAsset('cctv');cam.position.set(x,2.45,z0+.2);g.add(cam);}
  }
  makeLabel(name,point,floor,id,device) {
    const el=document.createElement('button');el.className=device?'device-beacon':'room-label';el.textContent=device?(id==='server'?'DC':id==='core'?'SW':'L2'):name;
    el.title=name;el.setAttribute('aria-label',device?`Periksa ${name}`:`Fokus ke ${name}`);
    el.addEventListener('click',()=>{if(device)this.callbacks.select(id);else this.focusRoom(id);});
    $('#labels').append(el);this.labelItems.push({el,point:vec(point),floor,id,device});
  }
  tube(points,radius,color) {
    const path=new T.CurvePath();for(let i=1;i<points.length;i++)if(!vec(points[i]).equals(vec(points[i-1])))path.add(new T.LineCurve3(vec(points[i-1]),vec(points[i])));
    const geo=new T.TubeGeometry(path,Math.max(12,points.length*6),radius,5,false);
    return new T.Mesh(geo,new T.MeshBasicMaterial({color}));
  }
  buildNetwork() {
    for(const edge of EDGES) {
      const mesh=this.tube(edge.points,edge.type==='fiber'?.029:.017,COLORS[edge.type]);this.scene.add(mesh);this.cables.push({edge,mesh});
    }
    this.powerCables=[];
    for(const n of NETWORK.filter(n=>n.network!==false||n.kind==='ups')){
      const source=DEVICE_MAP.get(n.kind==='ups'?`panel-${n.floor}`:n.protected?`ups-${n.floor}`:`panel-${n.floor}`),p=devicePoint(n),a=devicePoint(source),y=elevation(n.floor)+2.83;
      const points=[a,[a[0],y,a[2]],[a[0],y,n.floor===1?2.94:.05],[p[0],y,n.floor===1?2.94:.05],[p[0],y,p[2]],p];
      const mesh=this.tube(points,.012,COLORS.power);this.scene.add(mesh);this.powerCables.push({mesh,floor:n.floor,device:n,source,points});
    }
    this.powerParticles=new T.InstancedMesh(new T.SphereGeometry(.05,6,5),new T.MeshBasicMaterial({color:0xffdc8b}),this.powerCables.length);this.powerParticles.frustumCulled=false;this.powerParticles.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.powerParticles);
    this.particles=new T.InstancedMesh(new T.SphereGeometry(.055,6,5),new T.MeshBasicMaterial({color:0xbdfef6}),EDGES.length*3);this.particles.frustumCulled=false;this.particles.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.particles);
    this.wifiDevices=NETWORK.filter(n=>n.kind==='ap');this.radio=new T.InstancedMesh(new T.TorusGeometry(1,.012,4,30),new T.MeshBasicMaterial({color:COLORS.wifi,transparent:true,opacity:.3,depthWrite:false}),this.wifiDevices.length*2);this.radio.frustumCulled=false;this.radio.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.radio);
    this.leds=new T.InstancedMesh(new T.SphereGeometry(.065,7,5),new T.MeshBasicMaterial({color:0xffffff}),NETWORK.length);this.leds.frustumCulled=false;this.scene.add(this.leds);
    this.dummy=new T.Object3D();this.networkBuilt=true;
  }
  visibleFloor(floor) {return !!this.transit||this.floor==='all'||this.floor===floor;}
  linkVisible(edge){return this.layers[edge.type]&&edge.floors.every(f=>this.visibleFloor(f))&&(!this.installationLinks||this.installationLinks.has(edge.id));}
  setInstallationLinks(links){this.installationLinks=links;this.clearTrace();this.updateState();}
  isExterior(){return !this.transit&&this.mode!=='walk'&&this.mode!=='top'&&(this.roofMode==='solid'||this.roofMode==='auto'&&this.floor==='all');}
  setRoof(mode){this.roofMode=mode;this.updateEnvelope();this.updateLabels();this.callbacks.roof?.(mode);}
  updateEnvelope(){
    const closed=this.isExterior(),interior=this.mode==='walk'&&!this.transit;
    for(const [floor,f]of this.floors){f.root.visible=this.visibleFloor(floor);f.architecture.scale.y=closed||interior||this.transit?1:.35;f.details.visible=closed||interior;f.roof.visible=closed||interior&&this.roofMode!=='open';f.ceiling.visible=closed||interior&&this.roofMode!=='open';}
    if(this.connector){this.connector.visible=this.floor==='all'||this.mode==='walk'||!!this.transit;this.connector.userData.roof.visible=closed||interior&&this.roofMode!=='open';}
    if(this.renderer)this.renderer.shadowMap.needsUpdate=true;
  }
  travelStairs(){
    if(this.transit)return;
    if(this.mode!=='walk'){this.setFloor(this.floor===2?2:1,false);this.player=[...STAIR_LANDINGS[this.floor]];this.setMode('walk');}
    if(!nearStairs(this.floor,this.player)){this.callbacks.toast('Dekati ruang tangga atau pilih Menuju tangga pada panel eksplorasi.');return;}
    const from=this.floor;this.transit={from,to:from===1?2:1,time:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?1:9};this.keys={};
    this.player=[...STAIR_LANDINGS[from]];this.controls.enabled=false;this.flight=null;this.clearTrace();this.updateState();
    this.callbacks.toast(`Menyusuri tangga penghubung ke lantai ${this.transit.to}.`);
  }
  goToStairs(){
    if(this.transit)return;const floor=this.floor===2?2:1;if(this.floor==='all')this.setFloor(floor,false);
    this.player=[...STAIR_LANDINGS[floor]];this.setMode('walk');this.yaw=-Math.PI/2;this.updateWalkCamera();
  }
  updateTransit(dt){
    const t=this.transit;if(!t)return;t.time=Math.min(1,t.time+dt/t.duration);
    const p=stairPosition(t.from,t.time),ahead=stairPosition(t.from,Math.min(1,t.time+.013));this.camera.position.set(p[0],p[1]+1.62,p[2]);
    if(Math.hypot(ahead[0]-p[0],ahead[2]-p[2])>.001){this.yaw=Math.atan2(-(ahead[0]-p[0]),-(ahead[2]-p[2]));this.camera.rotation.order='YXZ';this.camera.rotation.set(0,this.yaw,0);}
    if(t.time===1){this.transit=null;this.floor=t.to;this.player=[...STAIR_LANDINGS[t.to]];this.yaw=t.to===2?Math.PI/2:-Math.PI/2;this.pitch=0;this.callbacks.floor(this.floor);this.updateState();this.updateWalkCamera();this.callbacks.toast(`Tiba di lantai ${this.floor}. Lanjutkan dengan WASD atau periksa perangkat.`);}
  }
  updateState() {
    if(!this.networkBuilt)return;
    for(const {edge,mesh} of this.cables){
      mesh.visible=this.linkVisible(edge);
      const active=!this.state.broken.has(edge.id)&&powered(DEVICE_MAP.get(edge.a),this.state)&&powered(DEVICE_MAP.get(edge.b),this.state);
      mesh.material.color.setHex(this.state.broken.has(edge.id)?0xc96856:active?COLORS[edge.type]:0x8a9693);
    }
    for(const p of this.powerCables){p.mesh.visible=this.layers.power&&this.visibleFloor(p.floor);p.mesh.material.color.setHex(powered(p.device,this.state)&&powered(p.source,this.state)?COLORS.power:0x9a9b8f);}
    this.powerParticles.visible=this.layers.power;
    let i=0;
    for(const n of NETWORK){const p=devicePoint(n);this.dummy.position.set(p[0],p[1]+.15,p[2]);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(this.visibleFloor(n.floor)?1:0);this.dummy.updateMatrix();this.leds.setMatrixAt(i,this.dummy.matrix);this.leds.setColorAt(i,new T.Color(powered(n,this.state)?0x51c7a1:0xd98c6b));i++;}
    this.leds.instanceMatrix.needsUpdate=true;if(this.leds.instanceColor)this.leds.instanceColor.needsUpdate=true;
    this.radio.visible=this.layers.wifi;
    if(this.routeMesh)this.routeMesh.visible=this.routeFloors?.every(f=>this.visibleFloor(f));
    this.updateEnvelope();this.renderer.shadowMap.needsUpdate=true;
  }
  setLayer(name,value) {this.layers[name]=value;this.updateState();}
  setFloor(floor,home=true) {
    if(this.transit)return;if(this.mode==='walk')this.setMode('orbit');this.floor=floor;
    for(const [n,f] of this.floors)f.root.visible=this.visibleFloor(n);
    if(floor!=='all')this.player=safeSpot(FLOORS[floor].spawn,FLOORS[floor].bounds,this.floors.get(floor).collisions,this.obstacles[floor])||[...FLOORS[floor].spawn];
    if(this.selected&&!this.visibleFloor(DEVICE_MAP.get(this.selected).floor))this.selectionRing.visible=false;
    this.updateState();if(home)this.home();this.callbacks.floor(floor);this.updateLabels();
  }
  home(animate=true) {
    if(this.transit)return;
    this.controls.enableRotate=true;this.setMode('orbit');
    const y=this.floor===2?elevation(2):this.floor==='all'?2.4:0;
    const a=this.camera.aspect,scale=a<1.1?1.15/Math.max(.5,a):1;
    const target=new T.Vector3(this.floor==='all'?2:.5,y,0),position=new T.Vector3((this.floor==='all'?24:16)*scale,y+(this.floor==='all'?29:25)*scale,31*scale);
    if(animate)this.fly(position,target);else{this.camera.position.copy(position);this.controls.target.copy(target);this.controls.update();}
  }
  fly(position,target) {this.flight={from:this.camera.position.clone(),fromTarget:this.controls.target.clone(),to:position,target,time:0};}
  focusRoom(id) {if(this.transit)return;const r=roomById(id);if(!r)return;if(!this.visibleFloor(r.floor)||this.floor==='all')this.setFloor(r.floor,false);this.focusPoint(r.center[0],r.center[1],r.floor);}
  focusPoint(x,z,floor=this.floor==='all'?1:this.floor) {
    if(this.transit)return;
    if(this.mode==='walk'){
      const p=safeSpot([x,z],FLOORS[floor].bounds,this.floors.get(floor).collisions,this.obstacles[floor]);if(p)this.player=p;else this.callbacks.toast('Titik ini terhalang. Pilih titik lain di dalam ruangan.');
    } else {const y=elevation(floor);this.fly(this.mode==='top'?new T.Vector3(x,y+18,z+.03):new T.Vector3(x+5,y+7,z+8),new T.Vector3(x,y+.3,z));}
  }
  select(id,{focus=true}={}) {
    if(this.transit)return;
    const n=DEVICE_MAP.get(id);if(!n)return;
    if(!this.visibleFloor(n.floor)||this.floor==='all')this.setFloor(n.floor,false);
    this.selected=id;this.selectionRing.visible=true;this.selectionRing.position.set(n.x,elevation(n.floor)+.07,n.z);
    for(const l of this.labelItems)l.el.classList.toggle('selected',l.id===id);
    if(focus&&this.mode!=='walk')this.focusPoint(n.x,n.z,n.floor);
  }
  showTrace(result) {
    this.clearTrace();if(!result.ok)return;
    this.routePoints=[];
    result.edges.forEach((e,i)=>{const points=e.a===result.nodes[i]?e.points:[...e.points].reverse();this.routePoints.push(...points);});
    this.routeFloors=[...new Set(result.nodes.map(id=>DEVICE_MAP.get(id).floor))];
    this.routeMesh=this.tube(this.routePoints,.045,0x9af4d4);this.routeMesh.material.depthTest=false;this.routeMesh.renderOrder=3;this.scene.add(this.routeMesh);
    this.routeParticle=new T.Mesh(new T.SphereGeometry(.15,10,8),new T.MeshBasicMaterial({color:0xffffff}));this.scene.add(this.routeParticle);this.routeTime=0;
    if(this.routeFloors.length>1){if(this.floor!=='all')this.setFloor('all');this.setRoof('open');}this.updateState();
  }
  clearTrace() {for(const obj of [this.routeMesh,this.routeParticle])if(obj){this.scene.remove(obj);obj.geometry.dispose();obj.material.dispose();}this.routeMesh=null;this.routeParticle=null;this.routePoints=null;}
  setMode(mode) {
    if(this.transit)return;
    if(mode==='walk'&&this.floor==='all')this.setFloor(1,false);
    this.mode=mode;this.flight=null;this.keys={};this.controls.enabled=mode!=='walk';this.controls.enableRotate=mode==='orbit';
    this.updateEnvelope();
    document.body.classList.toggle('walking',mode==='walk');$('#crosshair').classList.toggle('hidden',mode!=='walk');$('#walk-help').classList.toggle('hidden',mode!=='walk');
    $('#touch-pad').classList.toggle('hidden',mode!=='walk'||!matchMedia('(pointer:coarse)').matches);
    $('#orbit').classList.toggle('active',mode==='orbit');$('#walk').classList.toggle('active',mode==='walk');$('#top-view').classList.toggle('active',mode==='top');
    if(mode==='walk'){
      this.mode='walk';this.controls.enabled=false;this.pitch=0;this.yaw=-Math.PI/2;this.updateWalkCamera();
      this.callbacks.toast('WASD bergerak · Seret melihat · E periksa · F naik/turun di tangga.');
    }
    this.renderer.shadowMap.needsUpdate=true;
  }
  topView() {
    if(this.transit)return;
    this.setMode('top');this.controls.enableRotate=false;const y=this.floor===2?elevation(2):this.floor==='all'?FLOOR_HEIGHT/2:0;
    const scale=this.camera.aspect<1?1/this.camera.aspect:1;this.fly(new T.Vector3(.5,y+36*scale,.05),new T.Vector3(.5,y,0));
  }
  updateWalkCamera() {this.camera.position.set(this.player[0],elevation(this.floor===2?2:1)+1.62,this.player[1]);this.camera.rotation.order='YXZ';this.camera.rotation.set(this.pitch,this.yaw,0);}
  bindInputs() {
    const canvas=this.renderer.domElement;let drag=null;
    canvas.addEventListener('pointerdown',e=>{if(this.transit)return;drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};if(this.mode==='walk')canvas.setPointerCapture(e.pointerId);this.flight=null;});
    canvas.addEventListener('pointermove',e=>{if(drag&&this.mode==='walk'&&!this.transit){this.yaw-=(e.clientX-drag.lastX)*.004;this.pitch=T.MathUtils.clamp(this.pitch-(e.clientY-drag.lastY)*.003,-1.2,1.2);drag.lastX=e.clientX;drag.lastY=e.clientY;}});
    canvas.addEventListener('pointerup',e=>{
      if(!drag)return;const click=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5;drag=null;if(!click)return;
      const r=canvas.getBoundingClientRect(),mouse=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      const ray=new T.Raycaster();ray.setFromCamera(mouse,this.camera);const hits=ray.intersectObjects(this.clickables.filter(m=>this.visibleFloor(m.userData.device.floor)),false);
      if(hits.length){const n=hits[0].object.userData.device;if(this.mode==='walk'&&Math.hypot(n.x-this.player[0],n.z-this.player[1])>3.6){this.callbacks.toast('Dekati perangkat, lalu periksa dengan klik atau tombol E.');return;}this.callbacks.select(n.id);}
    });
    canvas.addEventListener('pointercancel',()=>{drag=null;this.keys={};});
    window.addEventListener('keydown',e=>{
      if(this.transit)return;
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&this.mode==='walk'){e.preventDefault();this.keys[e.code]=true;}
      if(e.code==='Escape'&&this.mode==='walk'){this.setMode('orbit');this.home();}
      if(e.code==='KeyF'&&this.mode==='walk'){e.preventDefault();this.travelStairs();}
      if(e.code==='KeyE'&&this.mode==='walk'){
        const near=NETWORK.filter(n=>n.floor===this.floor).map(n=>({n,d:Math.hypot(n.x-this.player[0],n.z-this.player[1])})).sort((a,b)=>a.d-b.d)[0];
        if(near&&near.d<3.2)this.callbacks.select(near.n.id);else this.callbacks.toast('Belum ada perangkat dalam jangkauan.');
      }
    });
    window.addEventListener('keyup',e=>{this.keys[e.code]=false;});window.addEventListener('blur',()=>{this.keys={};drag=null;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.keys={};this.last=performance.now();});
    for(const b of document.querySelectorAll('[data-key]')) {
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.keys[b.dataset.key]=true;});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{this.keys[b.dataset.key]=false;});
    }
    $('#minimap').addEventListener('click',e=>{if(this.transit)return;if(this.floor==='all')this.setFloor(1);const map=this.mapTransform;if(!map)return;const rect=e.target.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*280,z=(e.clientY-rect.top)/rect.height*178;this.focusPoint((x-map.ox)/map.scale+map.bounds[0],(z-map.oz)/map.scale+map.bounds[1]);});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.callbacks.contextLost();});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
  }
  onResize() {
    const rect=$('#world').getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    this.width=rect.width;this.height=rect.height;this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width,rect.height,false);this.setQuality($('#quality').value,false);
  }
  setQuality(name,refresh=true) {
    this.quality=name;setSurfaceQuality(name);this.sun.shadow.mapSize.setScalar(name==='high'?2048:1024);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;
    const cap={eco:1,normal:1.35,high:2}[name]||1.35;this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,cap));
    this.renderer.shadowMap.enabled=name!=='eco';this.renderer.shadowMap.needsUpdate=true;if(refresh)this.callbacks.toast(`Grafis ${name==='eco'?'hemat':name==='high'?'detail':'standar'} diaktifkan.`);
  }
  updateLabels() {
    this.camera.updateMatrixWorld();
    for(const label of this.labelItems){
      const v=label.point.clone().project(this.camera),distance=this.camera.position.distanceTo(label.point);
      const visible=!this.isExterior()&&this.visibleFloor(label.floor)&&v.z>-1&&v.z<1&&Math.abs(v.x)<.98&&Math.abs(v.y)<.98&&(this.mode!=='walk'||(distance<6&&label.device));
      label.el.style.display=visible?'':'none';if(!visible)continue;
      label.el.style.left=`${(v.x+1)*this.width/2}px`;label.el.style.top=`${(1-v.y)*this.height/2}px`;
    }
  }
  drawMap() {
    const floor=this.floor===2?2:1,c=$('#minimap'),ctx=c.getContext('2d'),bounds=FLOORS[floor].bounds;
    ctx.clearRect(0,0,280,178);const scale=Math.min(264/(bounds[2]-bounds[0]),160/(bounds[3]-bounds[1])),ox=(280-(bounds[2]-bounds[0])*scale)/2,oz=(178-(bounds[3]-bounds[1])*scale)/2;
    this.mapTransform={scale,ox,oz,bounds};const X=x=>ox+(x-bounds[0])*scale,Z=z=>oz+(z-bounds[1])*scale;
    for(const r of ROOMS.filter(r=>r.floor===floor)){const [x,z,a,b]=r.bounds;ctx.fillStyle=r.id===DEVICE_MAP.get(this.selected)?.room?'#bfdccd':r.type==='corridor'?'#f8faf4':'#e4ebe0';ctx.fillRect(X(x),Z(z),(a-x)*scale,(b-z)*scale);}
    ctx.strokeStyle='#9bafa0';ctx.lineWidth=.8;ctx.beginPath();for(const [ax,az,bx,bz]of this.floors.get(floor).collisions){ctx.moveTo(X(ax),Z(az));ctx.lineTo(X(bx),Z(bz));}ctx.stroke();
    for(const n of NETWORK.filter(n=>n.floor===floor&&['server','rack','switch'].includes(n.kind))){ctx.fillStyle='#489d85';ctx.fillRect(X(n.x)-2,Z(n.z)-2,4,4);}
    ctx.fillStyle='#247a66';ctx.beginPath();ctx.arc(X(this.player[0]),Z(this.player[1]),3.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#247a66';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(X(this.player[0]),Z(this.player[1]));ctx.lineTo(X(this.player[0]-Math.sin(this.yaw)*.8),Z(this.player[1]-Math.cos(this.yaw)*.8));ctx.stroke();
    const landing=STAIR_LANDINGS[floor];ctx.fillStyle='#c08c36';ctx.fillRect(X(landing[0])-3,Z(landing[1])-3,6,6);
    $('#map-title').textContent=this.floor==='all'?'DENAH L1 · MODE GEDUNG':`DENAH LANTAI ${floor}`;
    const r=ROOMS.find(r=>r.floor===floor&&this.player[0]>r.bounds[0]&&this.player[0]<r.bounds[2]&&this.player[1]>r.bounds[1]&&this.player[1]<r.bounds[3]);
    $('#room-name').textContent=r?.name||'Area sirkulasi';
  }
  animate(now) {
    this.animationId=requestAnimationFrame(this.animate);const dt=Math.min((now-this.last)/1000,.05);this.last=now;if(document.hidden)return;
    const suspended=document.querySelector('dialog[open]');
    if(this.transit){if(!suspended)this.updateTransit(dt);}
    else if(this.mode==='walk'){
      if(!suspended){const forward=Number(Boolean(this.keys.KeyW||this.keys.ArrowUp))-Number(Boolean(this.keys.KeyS||this.keys.ArrowDown)),right=Number(Boolean(this.keys.KeyD||this.keys.ArrowRight))-Number(Boolean(this.keys.KeyA||this.keys.ArrowLeft));
        const magnitude=Math.hypot(forward,right)||1,speed=2.7*dt/magnitude;
        this.player=moveWithCollision(this.player,(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*right)*speed,(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*right)*speed,FLOORS[this.floor].bounds,this.floors.get(this.floor).collisions,this.obstacles[this.floor]);}
      this.updateWalkCamera();
    } else if(this.flight){
      const f=this.flight;f.time=Math.min(1,f.time+dt*1.5);const t=1-Math.pow(1-f.time,3);this.camera.position.lerpVectors(f.from,f.to,t);this.controls.target.lerpVectors(f.fromTarget,f.target,t);if(f.time===1)this.flight=null;this.controls.update();
    }else this.controls.update();
    if(!this.paused)this.simTime+=dt*this.speed;
    let index=0;
    for(const {edge} of this.cables){
      const active=this.linkVisible(edge)&&!this.state.broken.has(edge.id)&&powered(DEVICE_MAP.get(edge.a),this.state)&&powered(DEVICE_MAP.get(edge.b),this.state);
      for(let i=0;i<3;i++){
        const p=pointOnPath(edge.points,(this.simTime*.16+i/3)%1);this.dummy.position.set(...p);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(active?1:0);this.dummy.updateMatrix();this.particles.setMatrixAt(index++,this.dummy.matrix);
      }
    }
    this.particles.instanceMatrix.needsUpdate=true;index=0;
    if(this.layers.power){
      for(const p of this.powerCables){
        const active=this.visibleFloor(p.floor)&&powered(p.device,this.state)&&powered(p.source,this.state),point=pointOnPath(p.points,(this.simTime*.14)%1);
        this.dummy.position.set(...point);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(active?1:0);this.dummy.updateMatrix();this.powerParticles.setMatrixAt(index++,this.dummy.matrix);
      }
      this.powerParticles.instanceMatrix.needsUpdate=true;
    }
    index=0;
    for(const n of this.wifiDevices)for(let i=0;i<2;i++){
      const phase=(this.simTime*.28+i*.5)%1,scale=.25+phase*1.65,active=this.visibleFloor(n.floor)&&powered(n,this.state)&&(!this.installationLinks||this.installationLinks.has(`link-${n.id}`));
      this.dummy.position.set(n.x,elevation(n.floor)+n.y+.03,n.z);this.dummy.rotation.set(Math.PI/2,0,0);this.dummy.scale.setScalar(active?scale:0);this.dummy.updateMatrix();this.radio.setMatrixAt(index++,this.dummy.matrix);
    }
    this.radio.instanceMatrix.needsUpdate=true;
    if(this.routeParticle&&this.routePoints){this.routeTime+=this.paused?0:dt*this.speed;const p=pointOnPath(this.routePoints,(this.routeTime*.12)%1);this.routeParticle.position.set(...p);
      this.routeParticle.visible=!!this.routeMesh?.visible;
    }
    const stairButton=$('#stair-action');if(stairButton){const available=this.mode==='walk'&&nearStairs(this.floor,this.player)&&!this.transit;stairButton.classList.toggle('hidden',!available);stairButton.textContent=this.floor===1?'F · Naik ke lantai 2 ↗':'F · Turun ke lantai 1 ↙';}
    this.marker.visible=this.mode!=='walk';this.marker.position.set(this.player[0],elevation(this.floor===2?2:1)+.1,this.player[1]);
    if(now-(this.lastLabels||0)>90){this.updateLabels();this.drawMap();this.lastLabels=now;}
    this.renderer.render(this.scene,this.camera);this.frames++;
    if(now-this.fpsStart>1000){$('#fps').textContent=`${Math.round(this.frames*1000/(now-this.fpsStart))} FPS`;this.frames=0;this.fpsStart=now;}
  }
}
