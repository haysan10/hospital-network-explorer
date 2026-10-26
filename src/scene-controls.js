import {isDirectCamera} from './camera-rig.js';
// Shared entry point for desktop buttons and the always-visible camera selector.
export function bindSceneControls({world,leaveTour,responsive,doc=document}){
 const $=q=>doc.querySelector(q);
 function run(action){
  leaveTour();responsive?.closePanel({focus:false});responsive?.closePopover();world.clearInput?.();
  action();world.callbacks?.viewport?.();
  if(isDirectCamera(world.mode))$('#scene').focus({preventScroll:true});
 }
 const actions={
  orbit:()=>world.home(),walk:()=>world.setMode('walk'),'top-view':()=>world.topView(),
  'third-view':()=>world.setMode('third'),'drone-view':()=>world.setMode('drone'),
  'home-view':()=>world.home(),'exterior-view':()=>world.exteriorView(),
  'shell-view':()=>world.toggleShell(),'ceiling-view':()=>world.toggleCeiling(),
  start:()=>{$('#welcome')?.close();world.setMode('walk');}
 };
 for(const [id,action]of Object.entries(actions))$('#'+id).addEventListener('click',()=>run(action));
 $('#camera-mode').addEventListener('change',e=>{
  const id={orbit:'orbit',walk:'walk',third:'third-view',drone:'drone-view',top:'top-view'}[e.target.value];if(id)run(actions[id]);
 });
}
