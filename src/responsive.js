import {isDirectCamera} from './camera-rig.js';
export const COMPACT_QUERY='(max-width: 1024px), (max-height: 600px), (pointer: coarse) and (max-width: 1366px)';
export function initResponsive({world,doc=document,win=window}){
 const $=q=>doc.querySelector(q),compact=win.matchMedia(COMPACT_QUERY),coarse=win.matchMedia('(any-pointer: coarse)'),panel=$('#panel'),backdrop=$('#panel-backdrop');let opened=false,popover=null,returnFocus=null;
 function sync(){
  const mobile=compact.matches;doc.body.classList.toggle('compact-ui',mobile);doc.body.classList.toggle('touch-device',coarse.matches||win.navigator.maxTouchPoints>0);doc.body.classList.toggle('mobile-panel-open',mobile&&opened);
  panel.inert=mobile&&!opened;panel.setAttribute('aria-hidden',String(mobile&&!opened));if(mobile){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');}else{panel.removeAttribute('role');panel.removeAttribute('aria-modal');}
  backdrop.hidden=!mobile||!opened;$('#panel-close').hidden=!mobile;for(const id of ['nav-missions','nav-devices'])$('#'+id).setAttribute('aria-expanded',String(!mobile||opened));
  const vv=win.visualViewport,editing=['INPUT','TEXTAREA'].includes(doc.activeElement?.tagName);doc.body.classList.toggle('keyboard-open',mobile&&opened&&(vv?.height<win.innerHeight-100||editing&&(vv?.height||win.innerHeight)<480));doc.documentElement.style.setProperty('--app-height',`${Math.round(vv?.height||win.innerHeight)}px`);doc.documentElement.style.setProperty('--viewport-top',`${Math.round(vv?.offsetTop||0)}px`);
  if(!world.presentation?.active&&world.camera){const width=world.width,height=world.height;if(mobile&&opened&&!isDirectCamera(world.mode)&&width&&height){const r=panel.getBoundingClientRect(),side=r.width<width*.85;world.camera.setViewOffset(width,height,side?r.width/2:0,side?0:r.height/2,width,height);}else world.camera.clearViewOffset();world.camera.updateProjectionMatrix();}
  if(!mobile)closePopover();
 }
 function closePopover(){popover=null;doc.body.removeAttribute('data-scene-popover');for(const b of doc.querySelectorAll('[data-scene-panel]'))b.setAttribute('aria-expanded','false');}
 function close({focus=true}={}){opened=false;sync();if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
 function open(){if(opened||!compact.matches)return;world.clearInput?.();closePopover();returnFocus=doc.activeElement;opened=true;sync();$('#panel-close').focus({preventScroll:true});}
 doc.addEventListener('focusin',sync);doc.addEventListener('focusout',()=>win.requestAnimationFrame?.(sync));
 $('#panel-close').addEventListener('click',()=>close());backdrop.addEventListener('click',()=>close());
 for(const b of doc.querySelectorAll('[data-scene-panel]'))b.addEventListener('click',()=>{world.clearInput?.();const next=popover===b.dataset.scenePanel?null:b.dataset.scenePanel;closePopover();if(next){popover=next;doc.body.dataset.scenePopover=next;b.setAttribute('aria-expanded','true');}});
 for(const b of doc.querySelectorAll('#view-tools button,[data-floor]'))b.addEventListener('click',closePopover);
 $('#scene').addEventListener('pointerdown',()=>closePopover());
 doc.addEventListener('keydown',e=>{if(e.code==='Escape'&&compact.matches&&(opened||popover)){e.preventDefault();e.stopImmediatePropagation();if(opened)close();else closePopover();return;}if(e.code==='Tab'&&opened&&compact.matches){const list=Array.from(panel.querySelectorAll('button,input,select,summary,a[href],[tabindex="0"]')).filter(el=>!el.disabled&&el.getClientRects().length),first=list[0],last=list.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first?.focus();}}},true);
 const resize=()=>{world.clearInput?.();sync();};compact.addEventListener('change',resize);coarse.addEventListener('change',resize);win.addEventListener('resize',resize);win.addEventListener('orientationchange',resize);win.visualViewport?.addEventListener('resize',sync);win.visualViewport?.addEventListener('scroll',sync);
 $('#mobile-quality').value=$('#quality').value;$('#mobile-quality').addEventListener('change',e=>{$('#quality').value=e.target.value;world.setQuality(e.target.value);});$('#quality').addEventListener('change',e=>{$('#mobile-quality').value=e.target.value;});
 sync();return {openPanel:open,closePanel:close,closePopover,syncViewport:sync,compact:()=>compact.matches};
}
