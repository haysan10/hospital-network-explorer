import {TOUR_UI} from './tour-copy.js';
export function renderTourControls(status,doc=document){
 const $=id=>doc.querySelector('#'+id),{active,panelHidden,playing,completed,layers,narration:n,ceilingVisible}=status,clean=active&&panelHidden,language=n.language||'id',en=language==='en',ui=TOUR_UI[language];
 const text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;},value=(id,v)=>{if(doc.activeElement!==$(id))$(id).value=String(v);};
 function options(id,items,selected){const el=$(id),signature=JSON.stringify(items);if(el.dataset.options!==signature){el.dataset.options=signature;el.replaceChildren(...items.map(v=>{const o=doc.createElement('option');o.value=v.id;o.textContent=v.name;o.disabled=Boolean(v.disabled);return o;}));}value(id,selected);}
 doc.body.classList.toggle('tour-clean',clean);
 for(const id of ['tour-panel','tour-toolbar'])$(id).classList.toggle('hidden',!active||clean);
 $('tour-panel').setAttribute('aria-hidden',String(!active||clean));$('tour-clean-controls').classList.toggle('hidden',!clean);
 $('tour-panel').setAttribute('lang',language);$('tour-subtitle').setAttribute('lang',language);
 for(const id of ['tour-hide-panel','tour-panel-hide','tour-show-panel'])$(id).setAttribute('aria-expanded',String(!clean));
 $('tour-clean-play').textContent=completed?'↻':playing?'Ⅱ':'▶';$('tour-clean-play').setAttribute('aria-label',completed?ui.replay:playing?ui.pause:ui.play);
 for(const id of ['tour-narration','tour-clean-narration']){const b=$(id);b.disabled=!n.supported;b.setAttribute('aria-pressed',String(n.enabled));b.title=n.supported?(en?'Toggle narration · N':'Aktifkan atau matikan narasi · N'):ui.unsupported;}
 text('tour-narration',n.enabled?ui.on:ui.off);$('tour-clean-narration').textContent=n.enabled?'🔊':'🔇';
 const speechStatus=!n.supported?ui.unsupported:n.error||n.warning||(!n.enabled?ui.ready:n.busy?(playing?ui.speaking:ui.paused)+` · ${n.voiceName} · ${n.sentenceIndex||1}/${n.sentenceCount||1}`:playing?ui.finished:ui.resume);text('tour-narration-status',speechStatus);
 for(const [id,key]of Object.entries({'tour-exit':'exit','tour-clean-exit':'exitShort','tour-hide-panel':'hide','tour-show-panel':'show','tour-explore':'explore','tour-speech-summary':'settings','tour-language-label':'language','tour-accent-label':'accent','tour-style-label':'style','tour-voice-label':'voice','tour-rate-label':'rate','tour-pitch-label':'pitch','tour-volume-label':'volume','tour-length-label':'length','tour-captions-label':'captions','tour-narration-replay':'repeat','tour-voice-note':'voiceNote','tour-layers-label':'layers','tour-detail-summary':'detail','tour-chapter-label':'chapter','tour-demo-note':'demoNote','tour-shortcuts':'shortcuts'}))text(id,ui[key]);
 text('tour-fullscreen',doc.fullscreenElement?ui.exitFullscreen:ui.fullscreen);text('tour-clean-language',language.toUpperCase());$('tour-clean-language').setAttribute('aria-label',en?'Switch to Indonesian':'Ganti ke bahasa Inggris');text('tour-power-label',en?'Power':'Daya');text('tour-labels',status.labelsVisible?(en?'Labels: on':'Label: tampil'):(en?'Labels: off':'Label: mati'));
 for(const id of ['tour-language','tour-speech-language'])value(id,language);
 options('tour-speech-style',['guide','presenter','calm'].map(id=>({id,name:ui[id]})),n.style||'guide');options('tour-speech-detail',[{id:'summary',name:ui.summary},{id:'full',name:ui.full}],n.detail||'summary');
 const available=n.accents||[],known=en?['en-US','en-GB','en-AU']:['id-ID'],names={'en-US':'English · US','en-GB':'English · UK','en-AU':'English · Australia','id-ID':'Indonesia'},accents=[...new Set([...known,...available])];
 options('tour-accent',[{id:'auto',name:ui.automatic},...accents.map(id=>({id,name:(names[id]||id)+(available.includes(id)?'':` · ${ui.unavailable}`),disabled:!available.includes(id)}))],n.accent||'auto');
 options('tour-voice',[{id:'',name:ui.automatic},...(n.voices||[]).map(v=>({id:v.id,name:`${v.name} · ${v.lang} · ${v.local?ui.local:ui.online}`}))],n.voiceURI||'');
 for(const [id,v,out,suffix]of [['tour-voice-rate',n.rate,'tour-rate-value','×'],['tour-voice-pitch',n.pitch??1,'tour-pitch-value',''],['tour-voice-volume',n.volume??1,'tour-volume-value','%']]){if(doc.activeElement!==$(id)){value(id,v);text(out,suffix==='%'?`${Math.round(v*100)}%`:`${Number(v).toFixed(2)}${suffix}`);}$(id).disabled=!n.supported;}
 $('tour-captions').checked=Boolean(n.subtitles);$('tour-voice').disabled=!n.supported;$('tour-accent').disabled=!n.supported;$('tour-narration-replay').disabled=!n.supported||!n.enabled;
 const captionVisible=active&&n.subtitles&&n.enabled&&n.busy&&Boolean(n.caption);$('tour-subtitle').classList.toggle('hidden',!captionVisible);text('tour-caption-text',n.caption||'');text('tour-caption-counter',`${language.toUpperCase()} · ${n.sentenceIndex||1}/${n.sentenceCount||1}`);$('tour-caption-close').setAttribute('aria-label',en?'Hide subtitles':'Sembunyikan subtitle');
 for(const [i,o]of Array.from($('tour-lighting').options||[]).entries())o.textContent=(en?['Day','Dusk','Night']:['Siang','Senja','Malam'])[i];
 for(const b of doc.querySelectorAll('[data-tour-layer]')){const on=Boolean(layers[b.dataset.tourLayer]);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}
 $('tour-installation-view').textContent=ceilingVisible?ui.openRoof:ui.closeRoof;$('tour-installation-view').setAttribute('aria-pressed',String(!ceilingVisible));
}
