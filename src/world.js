import {FRONT_OFFICE,circulationCutters,prepareWallSegments,arrivalBarriers} from './circulation.js';
import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/addons/controls/OrbitControls.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {ROOMS,FLOORS,FLOOR_OFFSETS,FLOOR_HEIGHT,NETWORK,DEVICE_MAP,COLORS,devicePoint,elevation,roomById} from './data.js';
import {EDGES,pointOnPath,pathLength,moveWithCollision,safeSpot,powered,clipPathToFloor,edgeVisible,corridorZ,RISER} from './engine.js';
import {makeAsset,box,mergeStatic,material,addPlanarUVs} from './assets.js';
import {floorMaterial,PALETTE} from './materials.js';
import {buildEnvironment} from './environment.js';
import {WALL_HEIGHT,windowCutters,subtractBoxes,planWindows,animateDoor,closedDoorSegments} from './architecture.js';
import {ROOM_LAYOUT,placementObstacles} from './layout.js';
import {FURNITURE,DEVICE_PLACEMENTS,placementBounds} from './layout.js';
import {buildCampus,CAMPUS_BOUNDS,CAMPUS_ROADS,createContactShadows} from './campus.js';
import {LIGHTING_PRESETS,lightSelection,lightPower} from './lighting.js';
import {PresentationDirector} from './presentation.js';
import {buildFloorSlab,viewBounds,fittedView} from './building-envelope.js';
import {INSTALLATION_LANES,createPowerFeeds} from './installation.js';

const $=q=>document.querySelector(q),vec=p=>new T.Vector3(...p);
export class HospitalWorld {
  constructor(callbacks,state) {
    this.callbacks=callbacks;this.state=state;this.floor=1;this.mode='orbit';this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.paused=this.reducedMotion;
    this.labelsVisible=true;this.lightingPreset='day';try{this.labelsVisible=localStorage.getItem('medilink-labels-visible')!=='false';const preset=localStorage.getItem('medilink-lighting-preset');if(LIGHTING_PRESETS[preset])this.lightingPreset=preset;}catch{}
    this.shellFull=false;this.ceilingOverride=null;this.lightPool=[];this.lightCandidates=[];this.doorItems=[];
    this.speed=1;this.simTime=0;this.layers={copper:true,fiber:true,wifi:false,power:false};
    this.floors=new Map();this.clickables=[];this.labelItems=[];this.cables=[];this.obstacles={1:[],2:[]};
    this.keys={};this.player=[...FLOORS[1].spawn];this.yaw=-Math.PI/2;this.pitch=0;this.selected=null;
    this.scene=new T.Scene();this.scene.background=new T.Color(0xedf0e9);
    this.renderer=new T.WebGLRenderer({canvas:$('#scene'),antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.localClippingEnabled=true;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.camera=new T.PerspectiveCamera(43,1,.05,200);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.075;
    this.controls.maxPolarAngle=Math.PI/2-.08;this.controls.minDistance=2;this.controls.maxDistance=95;this.controls.target.set(1,0,0);
    this.controls.addEventListener('start',()=>{this.framing=null;});
    this.hemi=new T.HemisphereLight(0xf5f9ff,0x8c9a8f,1.65);this.scene.add(this.hemi);
    this.sun=new T.DirectionalLight(0xfff3df,2.5);this.sun.position.set(10,25,14);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-34,right:34,top:30,bottom:-30,near:.5,far:100});
    this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.035;this.scene.add(this.sun);
    this.fill=new T.DirectionalLight(0xc7e1ff,1.25);this.fill.position.set(-12,12,-8);this.scene.add(this.fill);
    const studio=new T.Scene();studio.background=new T.Color(0xabb8c0);
    const panel=(x,y,z,w,h,intensity)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);studio.add(m);};
    panel(0,10,0,14,12,3);panel(-8,3,2,7,8,2);panel(6,4,-5,6,8,2.4);
    const pmrem=new T.PMREMGenerator(this.renderer);this.environmentTarget=pmrem.fromScene(studio,.04);this.scene.environment=this.environmentTarget.texture;pmrem.dispose();
    studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
    const ground=new T.Mesh(new T.PlaneGeometry(160,160),material(0xedf0e9));ground.rotation.x=-Math.PI/2;ground.position.y=-.28;ground.receiveShadow=true;this.scene.add(ground);
    const grid=new T.GridHelper(100,50,0xcbd7cc,0xe0e6db);grid.position.y=-.27;grid.material.transparent=true;grid.material.opacity=.25;this.scene.add(grid);
    this.selectionRing=new T.Mesh(new T.TorusGeometry(.72,.025,6,40),new T.MeshBasicMaterial({color:0xd59b45}));this.selectionRing.rotation.x=Math.PI/2;this.selectionRing.visible=false;this.scene.add(this.selectionRing);
    const marker=new T.Group();const disk=new T.Mesh(new T.CylinderGeometry(.17,.17,.07,18),material(0x277d69));marker.add(disk);
    const cone=new T.Mesh(new T.ConeGeometry(.12,.28,8),material(0x277d69));cone.position.y=.28;marker.add(cone);this.marker=marker;this.scene.add(marker);
    for(let i=0;i<8;i++){const light=new T.PointLight(0xfff2dd,0,5.8,2);this.scene.add(light);this.lightPool.push(light);}
    this.resize=new ResizeObserver(()=>this.onResize());this.resize.observe($('#world'));
    this.bindInputs();this.onResize();this.home(false);this.setLabels(this.labelsVisible,{temporary:true});this.setLighting(this.lightingPreset,{temporary:true});
  }
  async load() {
    const loader=new GLTFLoader();let done=0;
    this.campus=buildCampus();this.scene.add(this.campus.root);this.lightCandidates.push(...this.campus.lights);this.obstacles[1].push(...this.campus.obstacles);
    await Promise.all([1,2].map(async floor=>{
      const [gltf,res]=await Promise.all([loader.loadAsync(FLOORS[floor].model),fetch(`assets/collision-${floor}.json`)]);
      if(!res.ok)throw new Error(`Data navigasi tidak tersedia untuk lantai ${floor}`);
      const [dx,dz]=FLOOR_OFFSETS[floor];
      const collisions=prepareWallSegments(floor,(await res.json()).map(s=>s.map((v,i)=>v+(i%2?dz:dx))));
      const root=new T.Group();root.name=`Floor ${floor}`;root.position.y=elevation(floor);root.visible=floor===1;
      const architecture=gltf.scene;architecture.position.set(dx,0,dz);
      const cutters=[...windowCutters(planWindows(floor)),...circulationCutters(floor)].map(b=>({min:[b.min[0]-dx,b.min[1],b.min[2]-dz],max:[b.max[0]-dx,b.max[1],b.max[2]-dz]})),architectureMaterials=[];
      architecture.traverse(o=>{if(o.isMesh){
        o.geometry.applyMatrix4(new T.Matrix4().makeScale(1,WALL_HEIGHT/2.7,1));
        const old=o.geometry;o.geometry=subtractBoxes(old,cutters);old.dispose();addPlanarUVs(o.geometry);
        const base=material(o.name==='Skirting'?0x647e7c:PALETTE.wall,0,o.name==='Skirting'?'rubber':'plaster'),m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;m.side=T.DoubleSide;o.material=m;architectureMaterials.push(m);o.castShadow=true;o.receiveShadow=true;
      }});root.add(architecture);
      const fixed=new T.Group();
      fixed.add(buildFloorSlab(floor));
      for(const r of ROOMS.filter(r=>r.floor===floor))this.buildRoom(fixed,r);
      for(const n of NETWORK.filter(n=>n.floor===floor)) {
        const obj=makeAsset(n.asset||n.kind);obj.position.set(n.x,n.y,n.z);obj.rotation.y=n.rotation||0;if(n.kind==='ap')obj.rotation.x=Math.PI;fixed.add(obj);
        if(['switch','router'].includes(n.kind)){
          box(fixed,n.x,n.y-.04,n.z,.82,.04,.43,0xc9d8ce,'steel');
          if(n.y<1.2)for(const x of [-.34,.34])for(const z of [-.16,.16])box(fixed,n.x+x,n.y/2-.04,n.z+z,.025,n.y-.08,.025,0x8aa79c,'steel');
          else for(const x of [-.28,.28])box(fixed,n.x+x,n.y-.16,n.z+.14,.028,.27,.04,0x8aa79c,'steel');
        }
        const point=devicePoint(n),h=n.kind==='ap'?.5:n.asset==='reception-terminal'?1.65:1.4;
        const proxy=new T.Mesh(new T.BoxGeometry(n.kind==='ap'?.7:1.05,h,n.kind==='ap'?.7:.85),new T.MeshBasicMaterial({visible:false}));
        proxy.position.set(n.x,n.kind==='ap'?n.y:h/2+n.y,n.z);proxy.userData.device=n;root.add(proxy);this.clickables.push(proxy);
        if(['pc','server','rack','ups','switch','router','panel'].includes(n.kind))this.obstacles[floor].push(...placementObstacles({...n,kind:n.asset||n.kind}));
        if(['server','core','sw-l2','sw-l2-west'].includes(n.id))this.makeLabel(n.name,[n.x,point[1]+.4,n.z],floor,n.id,true);
      }
      // Trays match the actual corridor trunk, including the internal riser.
      const corridors=floor===1?[-2.9,2.72]:[corridorZ(2)];
      for(const z of corridors){const corridor=ROOMS.find(r=>r.floor===floor&&r.type==='corridor'&&z>=r.bounds[1]&&z<=r.bounds[3]);for(let x=corridor.bounds[0]+1;x<corridor.bounds[2]-.8;x+=2){for(const type of ['data','power']){const tray=makeAsset('cable-tray');tray.rotation.y=Math.PI/2;tray.scale.x=type==='data'?2:1;tray.scale.y=type==='data'?1.8:.65;tray.position.set(x,type==='data'?3.045:3.12,z+(type==='data'?.04:INSTALLATION_LANES.power.offset));fixed.add(tray);}}}
      box(fixed,RISER.x+.09,FLOOR_HEIGHT/2,RISER.z,.025,FLOOR_HEIGHT,.3,0xb6c8c4,'steel');
      root.add(mergeStatic(fixed));
      const environment=buildEnvironment(floor,collisions);root.add(environment.root);this.obstacles[floor].push(...environment.obstacles);if(floor===1)collisions.push(...arrivalBarriers,...this.campus.barriers);
      root.add(createContactShadows([...FURNITURE,...DEVICE_PLACEMENTS].filter(p=>p.floor===floor&&!['stairs','stair-landing','panel','switch','router'].includes(p.kind)).map(placementBounds).concat(environment.placements.filter(p=>p.collidable).map(p=>p.bounds))));
      this.doorItems.push(...environment.doors);for(const p of environment.lightPoints)this.lightCandidates.push({...p,y:p.y+elevation(floor)});
      this.scene.add(root);this.floors.set(floor,{root,architecture,architectureMaterials,environment,collisions});
      done++;this.callbacks.progress(done/2);
    }));
    this.buildNetwork();this.presentation=new PresentationDirector(this);this.syncEnvelope();this.updateState();this.setLighting(this.lightingPreset,{temporary:true});this.onResize();this.renderer.shadowMap.needsUpdate=true;
    this.setFloor(1,false);this.last=performance.now();this.fpsStart=this.last;this.frames=0;
    this.animate=this.animate.bind(this);this.animationId=requestAnimationFrame(this.animate);
  }
  buildRoom(g,r) {
    const [x0,z0,x1,z1]=r.bounds,[x,z]=r.center;
    const color={server:0xd9e3df,clinical:0xe6e9e1,ward:0xe4e6d9,icu:0xdbe5e1,operation:0xdce5e5,lab:0xe0e6e6,pharmacy:0xe5e8dc,radiology:0xe1e5e9,corridor:0xeeeadd,registration:0xebe3d4,stairs:0xdce1da,toilet:0xdce5e0}[r.type]||0xe7e5dc;
    if(!(r.type==='stairs'&&r.floor===2))box(g,x,.007,z,x1-x0,.025,z1-z0,floorMaterial(color));
    this.makeLabel(r.name,[x,elevation(r.floor)+.11,z],r.floor,r.id,false);
    for(const p of ROOM_LAYOUT.get(r.id)||[]){
      const o=makeAsset(p.kind);o.position.set(p.x,0,p.z);o.rotation.y=p.rotation;o.scale.setScalar(p.scale);g.add(o);
      this.obstacles[r.floor].push(...placementObstacles(p));
    }
    // Low skirting and door thresholds remain part of the supplied architecture.
    if(r.type==='security'){const cam=makeAsset('cctv');cam.position.set(x,2.45,z0+.2);g.add(cam);}
  }
  makeLabel(name,point,floor,id,device) {
    const el=document.createElement('button');el.className=device?'device-beacon':'room-label';el.textContent=device?(id==='server'?'DC':id==='core'?'SW':id==='sw-l2-west'?'ODF':'L2'):name;
    el.title=name;el.setAttribute('aria-label',device?`Periksa ${name}`:`Fokus ke ${name}`);
    el.addEventListener('click',()=>{if(device)this.callbacks.select(id);else this.focusRoom(id);});
    $('#labels').append(el);this.labelItems.push({el,point:vec(point),floor,id,device});
  }
  tube(points,radius,color) {
    const path=new T.CurvePath();for(let i=1;i<points.length;i++)if(!vec(points[i]).equals(vec(points[i-1])))path.add(new T.LineCurve3(vec(points[i-1]),vec(points[i])));
    const geo=new T.TubeGeometry(path,Math.max(12,points.length*6),radius,5,false);
    const base=material(color,0,'rubber'),m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;return new T.Mesh(geo,m);
  }
  buildNetwork() {
    for(const edge of EDGES) {
      const make=points=>edge.type==='wifi'?this.wirelessLink(points):this.tube(points,edge.type==='fiber'?.036:.017,COLORS[edge.type]);
      const mesh=make(edge.points);this.scene.add(mesh);
      const parts=new Map();
      for(const floor of edge.floors){const group=new T.Group();for(const points of clipPathToFloor(edge.points,floor))group.add(make(points));this.scene.add(group);parts.set(floor,group);}
      this.cables.push({edge,mesh,parts,paths:new Map(edge.floors.map(f=>[f,clipPathToFloor(edge.points,f)]))});
    }
    this.powerCables=[];
    for(const feed of createPowerFeeds()){
      const mesh=this.tube(feed.points,.012,COLORS.power);this.scene.add(mesh);this.powerCables.push({...feed,mesh});
    }
    this.powerParticles=new T.InstancedMesh(new T.SphereGeometry(.05,6,5),new T.MeshBasicMaterial({color:0xffdc8b}),this.powerCables.length);this.powerParticles.frustumCulled=false;this.powerParticles.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.powerParticles);
    this.particles=new T.InstancedMesh(new T.SphereGeometry(.055,6,5),new T.MeshBasicMaterial({color:0xbdfef6}),EDGES.length*3);this.particles.frustumCulled=false;this.particles.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.particles);
    this.wifiDevices=NETWORK.filter(n=>n.kind==='ap');this.radio=new T.InstancedMesh(new T.TorusGeometry(1,.012,4,30),new T.MeshBasicMaterial({color:COLORS.wifi,transparent:true,opacity:.3,depthWrite:false}),this.wifiDevices.length*2);this.radio.frustumCulled=false;this.radio.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.radio);
    this.leds=new T.InstancedMesh(new T.SphereGeometry(.065,7,5),new T.MeshBasicMaterial({color:0xffffff}),NETWORK.length);this.leds.frustumCulled=false;this.scene.add(this.leds);
    this.dummy=new T.Object3D();this.networkBuilt=true;
  }
  wirelessLink(points){const line=new T.Line(new T.BufferGeometry().setFromPoints(points.map(vec)),new T.LineDashedMaterial({color:COLORS.wifi,dashSize:.13,gapSize:.09}));line.computeLineDistances();return line;}
  visibleFloor(floor) {return this.floor==='all'||this.floor===floor;}
  updateState() {
    if(!this.networkBuilt)return;
    for(const {edge,mesh,parts} of this.cables){
      mesh.visible=this.layers[edge.type]&&this.floor==='all';
      for(const [floor,part]of parts)part.visible=this.layers[edge.type]&&this.floor===floor;
      const active=!this.state.broken.has(edge.id)&&powered(DEVICE_MAP.get(edge.a),this.state)&&powered(DEVICE_MAP.get(edge.b),this.state);
      const color=this.state.broken.has(edge.id)?0xc96856:active?COLORS[edge.type]:0x8a9693;
      const emphasized=!this.presentationEdges?.size||this.presentationEdges.has(edge.id),style=m=>{m.color.setHex(color);m.transparent=!emphasized;m.opacity=emphasized?1:.12;m.depthWrite=emphasized;};style(mesh.material);for(const part of parts.values())part.traverse(o=>{if(o.isMesh||o.isLine)style(o.material);});
    }
    for(const p of this.powerCables){p.mesh.visible=this.layers.power&&this.visibleFloor(p.floor);p.mesh.material.color.setHex(powered(p.device,this.state)&&powered(p.source,this.state)?COLORS.power:0x9a9b8f);}
    this.powerParticles.visible=this.layers.power;
    let i=0;
    for(const n of NETWORK){const p=devicePoint(n);this.dummy.position.set(p[0],p[1]+.15,p[2]);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(this.visibleFloor(n.floor)?1:0);this.dummy.updateMatrix();this.leds.setMatrixAt(i,this.dummy.matrix);this.leds.setColorAt(i,new T.Color(powered(n,this.state)?0x51c7a1:0xd98c6b));i++;}
    this.leds.instanceMatrix.needsUpdate=true;if(this.leds.instanceColor)this.leds.instanceColor.needsUpdate=true;
    this.radio.visible=this.layers.wifi;
    if(this.routeMesh){this.routeMesh.visible=false;this.scene.remove(this.routeMesh);this.routeMesh.geometry.dispose();this.routeMesh.material.dispose();this.routeMesh=null;}
    if(this.routeParts){for(const part of this.routeParts){this.scene.remove(part);part.geometry.dispose();part.material.dispose();}this.routeParts=clipPathToFloor(this.routePoints,this.floor).map(p=>this.tube(p,.043,0x9af4d4));this.routeParts.forEach(p=>this.scene.add(p));}
    for(const f of this.floors.values())for(const m of f.environment.luminaireMaterials)m.emissiveIntensity=this.state.mains?(this.lightingPreset==='night'?1.2:.85):this.state.ups?.08:0;
    this.campus?.setLighting(this.lightingPreset,this.state.mains);
    this.updateInteriorLights();this.renderer.shadowMap.needsUpdate=true;
  }
  setLayer(name,value) {this.layers[name]=value;this.updateState();}
  walkBounds(floor=this.floor){return floor===1?CAMPUS_BOUNDS:FLOORS[floor].bounds;}
  setLabels(visible,{temporary=false}={}){
    this.labelsVisible=Boolean(visible);document.body.classList.toggle('hide-labels',!this.labelsVisible);
    for(const id of ['toggle-labels','label-view','tour-labels']){const b=$('#'+id);if(b){b.textContent=this.labelsVisible?'Label: tampil':'Label: mati';b.setAttribute('aria-pressed',String(this.labelsVisible));b.title=this.labelsVisible?'Sembunyikan semua label · L':'Tampilkan semua label · L';}}
    if(!temporary){try{localStorage.setItem('medilink-labels-visible',String(this.labelsVisible));}catch{}if(this.presentation?.active)this.presentation.snapshot.labelsVisible=this.labelsVisible;}
    this.updateLabels();
  }
  setLighting(name,{temporary=false}={}){
    const preset=LIGHTING_PRESETS[name];if(!preset)return;this.lightingPreset=name;this.scene.background.setHex(preset.background);this.scene.fog=new T.Fog(preset.fog,52,125);this.scene.environmentIntensity=name==='day'?.85:name==='dusk'?.48:.18;
    this.hemi.color.setHex(preset.sky);this.hemi.groundColor.setHex(preset.ground);this.hemi.intensity=preset.hemisphere;this.sun.color.setHex(preset.sun);this.sun.intensity=preset.sunIntensity;this.sun.position.set(...preset.position);this.fill.intensity=preset.fill;this.renderer.toneMappingExposure=preset.exposure;
    this.campus?.setLighting(name);for(const id of ['lighting-preset','tour-lighting'])if($('#'+id))$('#'+id).value=name;
    if(!temporary)try{localStorage.setItem('medilink-lighting-preset',name);}catch{}
    this.updateState();this.updateInteriorLights();this.updateViewDistance();this.renderer.shadowMap.needsUpdate=true;
  }
  exteriorView(){this.setFloor('all',false);this.setMode('orbit');this.shellFull=true;this.ceilingOverride=null;this.exteriorFocused=true;this.syncEnvelope();this.frameView('campus');}
  setFloor(floor,home=true) {
    if(this.mode==='walk')this.setMode('orbit');this.floor=floor;this.shellFull=false;this.ceilingOverride=null;this.exteriorFocused=false;this.framing=null;this.syncEnvelope();
    if(floor!=='all')this.player=safeSpot(FLOORS[floor].spawn,FLOORS[floor].bounds,this.floors.get(floor).collisions,this.obstacles[floor])||[...FLOORS[floor].spawn];
    if(this.selected&&!this.visibleFloor(DEVICE_MAP.get(this.selected).floor))this.selectionRing.visible=false;
    this.updateState();if(home)this.home();this.callbacks.floor(floor);this.updateLabels();
  }
  home(animate=true) {
    this.shellFull=false;this.ceilingOverride=null;this.setMode('orbit');this.frameView('floor',animate);
  }
  frameView(kind,animate=true){
    const bounds=viewBounds(kind==='building'?'all':this.floor,kind==='campus'),direction=kind==='top'?[0,1,.001]:kind==='floor'?[16,25,29]:[-1,.72,.85],fit=fittedView(bounds,this.camera.aspect,direction,this.camera.fov);
    this.framing=kind;this.controls.maxDistance=Math.max(95,fit.distance*1.35);this.camera.far=Math.max(200,this.controls.maxDistance+bounds.getSize(new T.Vector3()).length()*2);this.camera.updateProjectionMatrix();
    if(animate)this.fly(fit.position,fit.target);else{this.flight=null;this.camera.position.copy(fit.position);this.controls.target.copy(fit.target);this.controls.update();}
    this.updateViewDistance();
  }
  fly(position,target) {this.flight={from:this.camera.position.clone(),fromTarget:this.controls.target.clone(),to:position,target,time:0};}
  focusRoom(id) {const r=roomById(id);if(!r)return;if(!this.visibleFloor(r.floor)||this.floor==='all')this.setFloor(r.floor,false);this.focusPoint(r.center[0],r.center[1],r.floor);}
  focusPoint(x,z,floor=this.floor==='all'?1:this.floor) {
    this.framing=null;
    if(this.mode==='walk'){
      const p=safeSpot([x,z],this.walkBounds(floor),this.floors.get(floor).collisions,this.obstacles[floor]);if(p)this.player=p;else this.callbacks.toast('Titik ini terhalang. Pilih titik lain di dalam ruangan.');
    } else {const y=elevation(floor);this.fly(this.mode==='top'?new T.Vector3(x,y+18,z+.03):new T.Vector3(x+5,y+7,z+8),new T.Vector3(x,y+.3,z));}
  }
  select(id) {
    const n=DEVICE_MAP.get(id);if(!n)return;
    if(!this.visibleFloor(n.floor)||this.floor==='all')this.setFloor(n.floor,false);
    this.selected=id;this.selectionRing.visible=true;this.selectionRing.position.set(n.x,elevation(n.floor)+.07,n.z);
    for(const l of this.labelItems)l.el.classList.toggle('selected',l.id===id);
    if(this.mode==='walk')this.focusPoint(n.x,n.z+1.1,n.floor);else this.focusPoint(n.x,n.z,n.floor);
  }
  showTrace(result) {
    this.clearTrace();this.traceResult=result;if(!result.ok)return;
    this.routePoints=[];
    result.edges.forEach((e,i)=>{const points=e.a===result.nodes[i]?e.points:[...e.points].reverse();this.routePoints.push(...points);});
    this.routeFloors=[...new Set(result.nodes.map(id=>DEVICE_MAP.get(id).floor))];
    this.routeParts=[];
    this.routeParticle=new T.Mesh(new T.SphereGeometry(.15,10,8),new T.MeshBasicMaterial({color:0xffffff}));this.scene.add(this.routeParticle);this.routeTime=0;
    this.updateState();
  }
  clearTrace() {for(const obj of [this.routeMesh,this.routeParticle,...(this.routeParts||[])])if(obj){this.scene.remove(obj);obj.geometry.dispose();obj.material.dispose();}this.routeMesh=null;this.routeParticle=null;this.routePoints=null;this.routeParts=null;this.traceResult=null;}
  setMode(mode) {
    if(mode==='walk'&&this.floor==='all')this.setFloor(1,false);
    if(mode==='walk'){this.shellFull=false;this.ceilingOverride=null;}
    this.mode=mode;this.flight=null;this.framing=null;this.keys={};this.controls.enabled=mode!=='walk'&&mode!=='tour';this.controls.enableRotate=mode==='orbit';this.exteriorFocused=false;$('#exterior-view')?.classList.remove('active');this.camera.fov=mode==='walk'?58:43;this.camera.updateProjectionMatrix();
    this.syncEnvelope();
    document.body.classList.toggle('walking',mode==='walk');$('#crosshair').classList.toggle('hidden',mode!=='walk');$('#walk-help').classList.toggle('hidden',mode!=='walk');
    $('#touch-pad').classList.toggle('hidden',mode!=='walk'||!matchMedia('(pointer:coarse)').matches);
    $('#orbit').classList.toggle('active',mode==='orbit');$('#walk').classList.toggle('active',mode==='walk');$('#top-view').classList.toggle('active',mode==='top');
    if(mode==='walk'){
      this.mode='walk';this.controls.enabled=false;this.pitch=0;this.yaw=this.floor===1?FRONT_OFFICE.yaw:-Math.PI/2;this.updateWalkCamera();
      this.callbacks.toast('WASD untuk bergerak. Seret layar untuk melihat. Tekan E di dekat perangkat.');
    }
    this.renderer.shadowMap.needsUpdate=true;
  }
  topView() {
    this.shellFull=false;this.ceilingOverride=null;this.setMode('top');this.frameView('top');
  }
  syncEnvelope(){
    const enclosed=this.mode==='walk'||this.shellFull,ceiling=this.ceilingOverride??enclosed,full=enclosed||ceiling,physical=this.mode==='walk'||this.mode==='tour'&&this.shellFull;
    for(const [floor,f] of this.floors){
      if(f.root)f.root.visible=physical||this.visibleFloor(floor);
      const plane=full?null:[new T.Plane(new T.Vector3(0,-1,0),elevation(floor)+1.13)];
      for(const m of [...f.architectureMaterials,...f.environment.shellMaterials]){m.clippingPlanes=plane;m.clipShadows=true;}
      f.environment.ceilings.visible=ceiling;f.environment.fixtures.visible=ceiling;f.environment.roof.visible=enclosed&&ceiling;
    }
    $('#shell-view')?.classList.toggle('active',this.shellFull);if($('#shell-view'))$('#shell-view').textContent=this.shellFull?'Buka denah':'Gedung utuh';
    $('#shell-view')?.setAttribute('aria-pressed',String(this.shellFull));$('#ceiling-view')?.classList.toggle('active',ceiling);$('#ceiling-view')?.setAttribute('aria-pressed',String(ceiling));if($('#ceiling-view'))$('#ceiling-view').textContent=ceiling?'Buka plafon':'Tutup plafon';
    $('#exterior-view')?.classList.toggle('active',Boolean(this.exteriorFocused));
    if(this.renderer)this.renderer.shadowMap.needsUpdate=true;
  }
  toggleShell(){if(this.presentation?.active)this.presentation.stop();if(this.shellFull)this.home();else{this.setFloor('all',false);this.setMode('orbit');this.shellFull=true;this.ceilingOverride=null;this.syncEnvelope();this.frameView('building');}this.updateLabels();}
  toggleCeiling(){if(this.presentation?.active)this.presentation.stop();const current=this.ceilingOverride??(this.mode==='walk'||this.shellFull);this.ceilingOverride=!current;this.syncEnvelope();this.updateLabels();}
  updateViewDistance(){
    if(!this.scene?.fog)return;const distance=this.mode==='walk'?0:this.camera.position.distanceTo(this.controls.target);
    this.scene.fog.near=Math.max(52,distance-35);this.scene.fog.far=Math.max(125,distance+85);
  }
  updateInteriorLights(){
    const count=$('#quality').value==='eco'?3:$('#quality').value==='high'?8:6;
    const preset=LIGHTING_PRESETS[this.lightingPreset]||LIGHTING_PRESETS.day,points=lightSelection(this.lightCandidates.filter(p=>p.floor!==0||preset.exterior>0),this.camera.position,this.floor,count,true);
    this.lightPool.forEach((light,i)=>{const p=points[i],power=p?lightPower(this.state,preset,p.floor===0):0;light.visible=Boolean(p&&power>0);light.intensity=power;if(p){light.position.set(p.x,p.y,p.z);light.color.setHex(p.color);}});
  }
  useDoor(){
    if(this.mode!=='walk')return false;const near=this.doorItems.filter(d=>d.definition.floor===this.floor&&!d.definition.portal).map(d=>({d,distance:Math.hypot(this.player[0]-d.definition.x,this.player[1]-d.definition.z)})).sort((a,b)=>a.distance-b.distance)[0];
    if(!near||near.distance>1.8)return false;near.d.manual=near.d.progress<.5;return true;
  }
  updateDoorPrompt(){
    const button=$('#door-action');if(!button)return;const near=this.mode==='walk'&&this.doorItems.find(d=>d.definition.floor===this.floor&&!d.definition.portal&&Math.hypot(this.player[0]-d.definition.x,this.player[1]-d.definition.z)<1.8);
    button.classList.toggle('hidden',!near);if(near)button.textContent=(near.progress<.5?'Buka pintu':'Tutup pintu')+' · F';
  }
  useStairs() {
    if(this.mode!=='walk')return false;
    const stair=ROOMS.find(r=>r.floor===this.floor&&r.type==='stairs');
    if(Math.hypot(this.player[0]-stair.center[0],this.player[1]-(stair.bounds[1]-.35))>2)return false;
    const next=this.floor===1?2:1,target=ROOMS.find(r=>r.floor===next&&r.type==='stairs');
    this.setFloor(next,false);this.player=safeSpot([target.center[0],target.bounds[1]-.35],FLOORS[next].bounds,this.floors.get(next).collisions,this.obstacles[next])||[...FLOORS[next].spawn];
    this.setMode('walk');this.callbacks.toast(`Anda tiba di ${FLOORS[next].name} melalui tangga interior.`);return true;
  }
  updateStairPrompt(){
    const button=$('#stairs-action');if(!button)return;const stair=ROOMS.find(r=>r.floor===this.floor&&r.type==='stairs');
    const near=this.mode==='walk'&&stair&&Math.hypot(this.player[0]-stair.center[0],this.player[1]-(stair.bounds[1]-.35))<=2;
    button.classList.toggle('hidden',!near);button.textContent=this.floor===1?'Naik ke lantai 2 · E':'Turun ke lantai 1 · E';
  }
  updateWalkCamera() {this.camera.position.set(this.player[0],elevation(this.floor===2?2:1)+1.62,this.player[1]);this.camera.rotation.order='YXZ';this.camera.rotation.set(this.pitch,this.yaw,0);}
  bindInputs() {
    const canvas=this.renderer.domElement;let drag=null;
    $('#door-action')?.addEventListener('click',()=>this.useDoor());
    $('#shell-view')?.addEventListener('click',()=>this.toggleShell());
    $('#ceiling-view')?.addEventListener('click',()=>this.toggleCeiling());
    $('#stairs-action')?.addEventListener('click',()=>this.useStairs());
    canvas.addEventListener('pointerdown',e=>{if(this.presentation?.active){if(this.presentation.clock.playing)this.presentation.toggle();return;}drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};if(this.mode==='walk')canvas.setPointerCapture(e.pointerId);this.flight=null;});
    canvas.addEventListener('pointermove',e=>{if(drag&&this.mode==='walk'){this.yaw-=(e.clientX-drag.lastX)*.004;this.pitch=T.MathUtils.clamp(this.pitch-(e.clientY-drag.lastY)*.003,-1.2,1.2);drag.lastX=e.clientX;drag.lastY=e.clientY;}});
    canvas.addEventListener('pointerup',e=>{
      if(this.presentation?.active){drag=null;return;}
      if(!drag)return;const click=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5;drag=null;if(!click)return;
      const r=canvas.getBoundingClientRect(),mouse=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      const ray=new T.Raycaster();ray.setFromCamera(mouse,this.camera);
      const doorHits=ray.intersectObjects(this.doorItems.filter(d=>this.visibleFloor(d.definition.floor)).flatMap(d=>d.leaves.map(p=>p.hinge)),true);
      if(doorHits.length){const door=this.doorItems.find(d=>d.leaves.some(p=>{let o=doorHits[0].object;while(o){if(o===p.hinge)return true;o=o.parent;}return false;}));if(door&&(this.mode!=='walk'||Math.hypot(this.player[0]-door.definition.x,this.player[1]-door.definition.z)<2)){door.manual=door.progress<.5;return;}}
      const hits=ray.intersectObjects(this.clickables.filter(m=>this.visibleFloor(m.userData.device.floor)),false);
      if(hits.length){const n=hits[0].object.userData.device;if(this.mode==='walk'&&Math.hypot(n.x-this.player[0],n.z-this.player[1])>3.6){this.callbacks.toast('Dekati perangkat, lalu periksa dengan klik atau tombol E.');return;}this.callbacks.select(n.id);}
    });
    canvas.addEventListener('pointercancel',()=>{drag=null;this.keys={};});
    window.addEventListener('keydown',e=>{
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&this.mode==='walk'){e.preventDefault();this.keys[e.code]=true;}
      if(e.code==='KeyF'&&!e.repeat&&this.mode==='walk'){e.preventDefault();this.useDoor();}
      if(e.code==='Escape'&&this.mode==='walk'){this.setMode('orbit');this.home();}
      if(e.code==='KeyE'&&this.mode==='walk'){
        if(this.useStairs())return;
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
    $('#minimap').addEventListener('click',e=>{if(this.floor==='all')this.setFloor(1);const map=this.mapTransform;if(!map)return;const rect=e.target.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*280,z=(e.clientY-rect.top)/rect.height*178;this.focusPoint((x-map.ox)/map.scale+map.bounds[0],(z-map.oz)/map.scale+map.bounds[1]);});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.callbacks.contextLost();});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
  }
  onResize() {
    const rect=$('#world').getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    this.width=rect.width;this.height=rect.height;this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width,rect.height,false);this.setQuality($('#quality').value,false);if(this.framing)this.frameView(this.framing,false);
  }
  setQuality(name,refresh=true) {
    const cap={eco:1,normal:1.35,high:2}[name]||1.35;this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,cap));
    this.renderer.shadowMap.enabled=name!=='eco';const shadowSize=name==='high'?4096:2048;if(this.sun&&this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.mapSize.set(shadowSize,shadowSize);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;}this.renderer.shadowMap.needsUpdate=true;if(refresh)this.callbacks.toast(`Grafis ${name==='eco'?'hemat':name==='high'?'detail':'standar'} diaktifkan.`);
  }
  updateLabels() {
    this.camera.updateMatrixWorld();
    for(const label of this.labelItems){
      const v=label.point.clone().project(this.camera),distance=this.camera.position.distanceTo(label.point);
      const closedShell=this.shellFull&&(this.ceilingOverride??true)&&this.mode!=='walk'&&this.mode!=='tour';
      const visible=this.labelsVisible!==false&&!closedShell&&this.visibleFloor(label.floor)&&v.z>-1&&v.z<1&&Math.abs(v.x)<.98&&Math.abs(v.y)<.98&&(this.mode!=='walk'||(distance<6&&label.device));
      label.el.style.display=visible?'':'none';if(!visible)continue;
      label.el.style.left=`${(v.x+1)*this.width/2}px`;label.el.style.top=`${(1-v.y)*this.height/2}px`;
    }
  }
  drawMap() {
    const floor=this.floor===2?2:1,c=$('#minimap'),ctx=c.getContext('2d'),b=FLOORS[floor].bounds,outdoor=floor===1&&(this.floor==='all'||this.player[0]<b[0]||this.player[0]>b[2]||this.player[1]<b[1]||this.player[1]>b[3]||this.player[0]<-9.2&&this.player[1]>-4.55),bounds=outdoor?CAMPUS_BOUNDS:b;
    ctx.clearRect(0,0,280,178);const scale=Math.min(264/(bounds[2]-bounds[0]),160/(bounds[3]-bounds[1])),ox=(280-(bounds[2]-bounds[0])*scale)/2,oz=(178-(bounds[3]-bounds[1])*scale)/2;
    this.mapTransform={scale,ox,oz,bounds};const X=x=>ox+(x-bounds[0])*scale,Z=z=>oz+(z-bounds[1])*scale;
    if(outdoor){ctx.fillStyle='#dce6d4';ctx.fillRect(ox,oz,(bounds[2]-bounds[0])*scale,(bounds[3]-bounds[1])*scale);ctx.fillStyle='#a5b0a5';for(const [x,z,a,b]of CAMPUS_ROADS)ctx.fillRect(X(x),Z(z),(a-x)*scale,(b-z)*scale);ctx.fillStyle='#edf1e3';ctx.fillRect(X(-24.5),Z(-1.65),11.9*scale,3.1*scale);}
    for(const r of ROOMS.filter(r=>r.floor===floor)){const [x,z,a,b]=r.bounds;ctx.fillStyle=r.id===DEVICE_MAP.get(this.selected)?.room?'#bfdccd':r.type==='corridor'?'#f8faf4':'#e4ebe0';ctx.fillRect(X(x),Z(z),(a-x)*scale,(b-z)*scale);}
    ctx.strokeStyle='#9bafa0';ctx.lineWidth=.8;ctx.beginPath();for(const [ax,az,bx,bz]of this.floors.get(floor).collisions){ctx.moveTo(X(ax),Z(az));ctx.lineTo(X(bx),Z(bz));}ctx.stroke();
    for(const n of NETWORK.filter(n=>n.floor===floor&&['server','rack','switch'].includes(n.kind))){ctx.fillStyle='#489d85';ctx.fillRect(X(n.x)-2,Z(n.z)-2,4,4);}
    ctx.fillStyle='#247a66';ctx.beginPath();ctx.arc(X(this.player[0]),Z(this.player[1]),3.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#247a66';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(X(this.player[0]),Z(this.player[1]));ctx.lineTo(X(this.player[0]-Math.sin(this.yaw)*.8),Z(this.player[1]-Math.cos(this.yaw)*.8));ctx.stroke();
    $('#map-title').textContent=outdoor?'KAWASAN RUMAH SAKIT':`DENAH LANTAI ${floor}`;
    const r=ROOMS.find(r=>r.floor===floor&&this.player[0]>r.bounds[0]&&this.player[0]<r.bounds[2]&&this.player[1]>r.bounds[1]&&this.player[1]<r.bounds[3]);
    $('#room-name').textContent=r?.name||(outdoor?'Area luar':'Area sirkulasi');
  }
  animate(now) {
    this.animationId=requestAnimationFrame(this.animate);const dt=Math.min((now-this.last)/1000,.05);this.last=now;if(document.hidden)return;
    const suspended=document.querySelector('dialog[open]');
    if(this.presentation?.active&&!suspended)this.presentation.update(dt);
    let doorsChanged=false;for(const door of this.doorItems)if(this.visibleFloor(door.definition.floor))doorsChanged=animateDoor(door,dt,['walk','tour'].includes(this.mode)&&door.definition.floor===this.floor?this.player:null)||doorsChanged;
    if(doorsChanged&&now-(this.lastDoorShadow||0)>80){this.renderer.shadowMap.needsUpdate=true;this.lastDoorShadow=now;}
    if(this.mode==='walk'){
      if(!suspended){const forward=Number(Boolean(this.keys.KeyW||this.keys.ArrowUp))-Number(Boolean(this.keys.KeyS||this.keys.ArrowDown)),right=Number(Boolean(this.keys.KeyD||this.keys.ArrowRight))-Number(Boolean(this.keys.KeyA||this.keys.ArrowLeft));
        const magnitude=Math.hypot(forward,right)||1,speed=2.7*dt/magnitude;
        this.player=moveWithCollision(this.player,(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*right)*speed,(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*right)*speed,this.walkBounds(),[...this.floors.get(this.floor).collisions,...closedDoorSegments(this.doorItems.filter(d=>d.definition.floor===this.floor))],this.obstacles[this.floor]);}
      this.updateWalkCamera();
    } else if(this.presentation?.active){
      // Presentation owns the camera; user movement remains disabled until exit.
    } else if(this.flight){
      const f=this.flight;f.time=Math.min(1,f.time+dt*1.5);const t=1-Math.pow(1-f.time,3);this.camera.position.lerpVectors(f.from,f.to,t);this.controls.target.lerpVectors(f.fromTarget,f.target,t);if(f.time===1)this.flight=null;this.controls.update();
    }else this.controls.update();
    if(!this.paused)this.simTime+=dt*this.speed;this.campus?.update(this.simTime);
    let index=0;
    for(const {edge,paths} of this.cables){
      const active=edgeVisible(edge,this.floor)&&this.layers[edge.type]&&(!this.presentationEdges?.size||this.presentationEdges.has(edge.id))&&!this.state.broken.has(edge.id)&&powered(DEVICE_MAP.get(edge.a),this.state)&&powered(DEVICE_MAP.get(edge.b),this.state);
      for(let i=0;i<3;i++){
        const visiblePaths=this.floor==='all'?[edge.points]:paths.get(this.floor)||[];
        const p=pointOnPath(visiblePaths[0]||edge.points,(this.simTime*.16+i/3)%1);this.dummy.position.set(...p);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(active?1:0);this.dummy.updateMatrix();this.particles.setMatrixAt(index++,this.dummy.matrix);
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
      const phase=(this.simTime*.28+i*.5)%1,scale=.25+phase*1.65,active=this.visibleFloor(n.floor)&&powered(n,this.state);
      this.dummy.position.set(n.x,elevation(n.floor)+n.y+.03,n.z);this.dummy.rotation.set(Math.PI/2,0,0);this.dummy.scale.setScalar(active?scale:0);this.dummy.updateMatrix();this.radio.setMatrixAt(index++,this.dummy.matrix);
    }
    this.radio.instanceMatrix.needsUpdate=true;
    if(this.routeParticle&&this.routePoints){this.routeTime+=this.paused?0:dt*this.speed;const p=pointOnPath(this.routePoints,(this.routeTime*.12)%1);this.routeParticle.position.set(...p);
      const f=p[1]>FLOOR_HEIGHT-.12?2:1;this.routeParticle.visible=this.visibleFloor(f);
    }
    this.marker.visible=this.mode!=='walk'&&this.mode!=='tour';this.marker.position.set(this.player[0],elevation(this.floor===2?2:1)+.1,this.player[1]);
    if(now-(this.lastLabels||0)>90){this.updateLabels();this.drawMap();this.updateStairPrompt();this.updateDoorPrompt();this.updateInteriorLights();this.updateViewDistance();this.lastLabels=now;}
    this.renderer.render(this.scene,this.camera);this.frames++;
    if(now-this.fpsStart>1000){$('#fps').textContent=`${Math.round(this.frames*1000/(now-this.fpsStart))} FPS`;this.frames=0;this.fpsStart=now;}
  }
}
