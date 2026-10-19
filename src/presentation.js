import * as T from '../vendor/three.module.js';
import {TOUR_STEPS,TourClock} from './tour.js';
import {TOUR_PATHS} from './tour-paths.js';
import {DEVICE_MAP,FLOORS,elevation,devicePoint} from './data.js';
import {pointOnPath,safeSpot,traceRoute} from './engine.js';
import {CAMPUS_BOUNDS} from './campus.js';
import {TourNarrator} from './narration.js';
import {localizedTourStep,localizedDemo} from './tour-copy.js';
const smooth=t=>t*t*(3-2*t);
export function tourPose(step,progress,aspect=1.6){
 const path=TOUR_PATHS[step.id];
 if(step.view==='room'&&path){
  const t=smooth(progress),p=pointOnPath(path,t),ahead=pointOnPath(path,Math.min(1,t+.055)),device=DEVICE_MAP.get(step.device),point=device?devicePoint(device):[ahead[0],elevation(step.floor)+1.4,ahead[1]],blend=smooth(Math.max(0,(progress-.52)/.3));
  const eye=[p[0],elevation(step.floor)+1.62,p[1]],look=[ahead[0],elevation(step.floor)+1.55,ahead[1]].map((v,i)=>v+(point[i]-v)*blend);
  if(Math.hypot(look[0]-eye[0],look[2]-eye[2])<.02){look[0]=point[0];look[2]=point[2];}
  return {eye,look,fov:62};
 }
 const factor=aspect<1?Math.min(1.7,1/aspect):1,look=step.target,delta=step.camera.map((v,i)=>(v-look[i])*factor);
 const drift=smooth(progress)*.1;return {eye:look.map((v,i)=>v+delta[i]*(1-drift)),look,fov:45};
}
export class PresentationDirector{
 constructor(world){this.world=world;this.clock=new TourClock();this.snapshot=null;this.lastNotify=-1;this.panelHidden=false;this.installationOpen=false;this.envelopeOverride=null;this.layerOverrides={};this.narrator=new TourNarrator({onChange:()=>{if(this.active)this.world.callbacks.tour?.(this.status(),false);}});}
 get active(){return this.clock.active;}
 start(index=0){
  const w=this.world;if(!this.active)this.snapshot={state:w.state,floor:w.floor,mode:w.mode,layers:{...w.layers},shell:w.shellFull,ceiling:w.ceilingOverride,labelsVisible:w.labelsVisible,paused:w.paused,player:[...w.player],yaw:w.yaw,pitch:w.pitch,camera:w.camera.position.clone(),target:w.controls.target.clone(),fov:w.camera.fov,selected:w.selected,trace:w.traceResult,ringPosition:w.selectionRing.position.clone(),ringVisible:w.selectionRing.visible,exterior:w.exteriorFocused,framing:w.framing,maxDistance:w.controls.maxDistance,far:w.camera.far};
  this.panelHidden=false;this.installationOpen=false;this.envelopeOverride=null;this.layerOverrides={};this.clock.start(index,!w.reducedMotion);w.setMode('orbit');w.setLabels(false,{temporary:true});w.keys={};document.body.classList.add('presenting');this.applyStep();
 }
 applyStep(){
  const w=this.world,s=this.clock.step;this.demoActive=false;this.demoMessage='';w.clearTrace();w.state={...this.snapshot.state,mains:true,ups:true,broken:new Set()};
  w.setFloor(s.floor,false);w.mode='tour';w.controls.enabled=false;w.flight=null;w.keys={};w.shellFull=s.view==='room'||s.view==='campus';w.ceilingOverride=this.envelopeOverride??(s.view==='room'||s.view==='campus');
  w.layers={copper:false,fiber:false,wifi:false,power:false};for(const layer of s.layers)w.layers[layer]=true;Object.assign(w.layers,this.layerOverrides);w.presentationEdges=new Set(s.edges||[]);
  w.syncEnvelope();w.paused=!this.clock.playing;w.selected=s.device||null;w.selectionRing.visible=Boolean(s.device);if(s.device){const n=DEVICE_MAP.get(s.device);w.selectionRing.position.set(n.x,elevation(n.floor)+.04,n.z);}
  for(const label of w.labelItems||[])label.el.classList.toggle('selected',label.id===w.selected);
  if(s.trace){const result=traceRoute(s.trace,'server',w.state);if(!s.edges)w.presentationEdges=new Set(result.edges.map(e=>e.id));w.showTrace(result);}else w.updateState();
  this.updateCamera();this.narrator.sync(s,this.clock.playing);this.lastNotify=-1;w.callbacks.tour?.(this.status(),true);
 }
 status(){return {active:this.active,step:localizedTourStep(this.clock.step,this.narrator.language,this.narrator.style),index:this.clock.index,total:TOUR_STEPS.length,playing:this.clock.playing,progress:this.clock.progress,elapsed:this.clock.elapsed,completed:this.clock.completed,demoActive:this.demoActive,demoMessage:this.demoMessage?localizedDemo(this.clock.step,this.demoActive,this.narrator.language):'',panelHidden:this.panelHidden,labelsVisible:this.world.labelsVisible,installationOpen:this.installationOpen,ceilingVisible:Boolean(this.world.ceilingOverride??this.world.shellFull),layers:{...this.world.layers},narration:this.narrator.status()};}
 updateCamera(){const w=this.world,pose=tourPose(this.clock.step,this.clock.progress,w.camera.aspect);w.camera.fov=pose.fov;if(!this.panelHidden&&w.width&&w.width<700)w.camera.setViewOffset(w.width,w.height,0,w.height*.16,w.width,w.height);else w.camera.clearViewOffset();w.camera.updateProjectionMatrix();w.camera.position.set(...pose.eye);w.controls.target.set(...pose.look);w.camera.lookAt(...pose.look);if(this.clock.step.floor!=='all')w.player=[pose.eye[0],pose.eye[2]];}
 update(dt){if(!this.active)return;this.narrator.update(dt);const left=this.clock.step.duration-this.clock.elapsed,delta=this.narrator.enabled&&this.narrator.busy?Math.min(dt,Math.max(0,left-.001)):dt;if(this.clock.tick(delta))this.applyStep();if(this.clock.completed)this.narrator.sync(this.clock.step,false);this.world.paused=!this.clock.playing;this.updateCamera();const quarter=Math.floor(this.clock.elapsed*4);if(quarter!==this.lastNotify){this.lastNotify=quarter;this.world.callbacks.tour?.(this.status(),false);}}
 setPanelHidden(hidden){if(!this.active)return;this.panelHidden=Boolean(hidden);this.updateCamera();this.world.callbacks.tour?.(this.status(),false);}
 toggleInstallation(){const visible=Boolean(this.world.ceilingOverride??this.world.shellFull);this.envelopeOverride=!visible;this.installationOpen=visible;this.world.ceilingOverride=!visible;this.world.syncEnvelope();this.world.callbacks.tour?.(this.status(),false);}
 setLayer(name,value){if(!['copper','fiber','power','wifi'].includes(name))return;this.layerOverrides[name]=Boolean(value);this.world.layers[name]=Boolean(value);this.world.updateState();this.world.callbacks.tour?.(this.status(),false);}
 seek(index){this.clock.seek(index);this.applyStep();}
 next(){if(this.clock.index===TOUR_STEPS.length-1)this.stop();else this.seek(this.clock.index+1);}
 previous(){this.seek(this.clock.index-1);}
 toggle(){const wasComplete=this.clock.completed;this.clock.toggle();if(wasComplete){this.narrator.stop();this.applyStep();}else this.narrator.sync(this.clock.step,this.clock.playing);this.world.paused=!this.clock.playing;this.world.callbacks.tour?.(this.status(),false);}
 demo(){
  const w=this.world,s=this.clock.step;if(!s.demo)return;this.demoActive=!this.demoActive;
  if(s.demo==='fault'){w.state.broken=this.demoActive?new Set(['link-pc-icu']):new Set();const result=traceRoute('pc-icu','server',w.state);w.showTrace(result);this.demoMessage=result.ok?'Kabel pulih. Jalur ICU ke server aktif.':'Kabel endpoint ICU putus. Perangkat lain dan backbone tetap tersedia.';}
  if(s.demo==='power'){w.state.mains=!this.demoActive;w.state.ups=true;this.demoMessage=this.demoActive?'Suplai utama padam. Sirkuit UPS terpilih dan pencahayaan cadangan tetap aktif.':'Suplai utama aktif kembali. Semua sirkuit model mendapat daya.';}
  if(s.demo==='guest'){const result=traceRoute('guest','server',w.state);this.demoMessage=result.reason==='policy'?'Akses ditolak oleh kebijakan VLAN 30. Koneksi fisik tablet tetap tersedia.':result.message;this.demoActive=true;}
  w.updateState();w.callbacks.tour?.(this.status(),true);
 }
 stop({continueHere=false}={}){
  if(!this.active)return;const w=this.world,saved=this.snapshot,currentFloor=this.clock.step.floor,eye=w.camera.position.clone(),direction=new T.Vector3();w.camera.getWorldDirection(direction);this.clock.stop();this.narrator.stop();this.panelHidden=false;this.layerOverrides={};this.installationOpen=false;this.envelopeOverride=null;w.clearTrace();w.presentationEdges=null;w.state=saved.state;w.selected=saved.selected;w.layers={...saved.layers};w.shellFull=saved.shell;w.ceilingOverride=saved.ceiling;w.paused=saved.paused;
  document.body.classList.remove('presenting');w.camera.clearViewOffset();w.setFloor(continueHere?(currentFloor==='all'?1:currentFloor):saved.floor,false);w.setMode(continueHere?'walk':saved.mode==='tour'?'orbit':saved.mode);
  if(continueHere){const floor=w.floor,bounds=floor===1?CAMPUS_BOUNDS:FLOORS[floor].bounds;w.player=safeSpot([eye.x,eye.z],bounds,w.floors.get(floor).collisions,w.obstacles[floor])||[...FLOORS[floor].spawn];w.yaw=Math.atan2(-direction.x,-direction.z);w.pitch=Math.asin(T.MathUtils.clamp(direction.y,-1,1));w.updateWalkCamera();}
  else{w.shellFull=saved.shell;w.ceilingOverride=saved.ceiling;w.framing=saved.framing;w.controls.maxDistance=saved.maxDistance;w.camera.far=saved.far;w.player=saved.player;w.yaw=saved.yaw;w.pitch=saved.pitch;w.camera.position.copy(saved.camera);w.controls.target.copy(saved.target);w.camera.fov=saved.fov;w.camera.updateProjectionMatrix();if(saved.mode==='walk')w.updateWalkCamera();else w.controls.update();}
  w.selectionRing.position.copy(saved.ringPosition);w.selectionRing.visible=continueHere?false:saved.ringVisible;if(continueHere)w.selected=null;else{w.exteriorFocused=saved.exterior;document.querySelector('#exterior-view')?.classList.toggle('active',Boolean(saved.exterior));}
  for(const label of w.labelItems||[])label.el.classList.toggle('selected',label.id===w.selected);
  w.setLabels(saved.labelsVisible,{temporary:true});w.syncEnvelope();if(saved.trace)w.showTrace(saved.trace);else w.updateState();w.callbacks.tour?.(this.status(),true);this.snapshot=null;
 }
}
