import {localizedTourStep,NARRATION_STYLES} from './tour-copy.js';
const KEY='medilink-narration-v2',clamp=(n,a,b,f)=>Number.isFinite(Number(n))?Math.max(a,Math.min(b,Number(n))):f;
const lang=v=>String(v||'').replace(/_/g,'-').toLowerCase(),family=v=>lang(v).split('-')[0];
const sentences=text=>(String(text).match(/[^.!?]+(?:[.!?]+|$)/g)||[]).map(s=>s.trim()).filter(Boolean);
export function narrationSegments(step,language='id',style='guide',detail='summary'){
 const s=localizedTourStep(step,language,style);return [s.title,...sentences(s.text),...(detail==='full'?s.details.flatMap(sentences):[])];
}
export function pronounce(text,language='id'){
 const replacements=language==='en'?{UPS:'U P S',LAN:'local area network',ICU:'I C U',PC:'computer',L1:'floor one',L2:'floor two',VLAN:'vee lan'}:{UPS:'catu daya cadangan',LAN:'jaringan lokal',ICU:'ruang perawatan intensif',PC:'komputer',L1:'lantai satu',L2:'lantai dua',VLAN:'vi lan'};
 return text.replace(/\b(?:UPS|LAN|ICU|PC|L1|L2|VLAN)\b/g,s=>replacements[s]).replace(/Wi-Fi/g,language==='en'?'Wi-Fi':'wai fai');
}
export function spokenExplanation(step,language='id',style='guide',detail='summary'){return narrationSegments(step,language,style,detail).map(s=>pronounce(s,language)).join('. ');}
export class TourNarrator{
 constructor({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onChange=()=>{},storage}={}){
  this.synth=synth;this.Utterance=Utterance;this.supported=Boolean(synth&&Utterance);this.onChange=onChange;this.enabled=false;this.playing=false;this.suspended=false;this.busy=false;this.step=null;this.language='id';this.accent='auto';this.style='guide';this.voiceURI='';this.rate=1;this.pitch=1;this.volume=1;this.detail='summary';this.subtitles=false;this.generation=0;this.error='';this.age=0;this.gap=0;this.segments=[];this.segmentIndex=0;this.caption='';this.profiles={id:{voiceURI:'',accent:'auto'},en:{voiceURI:'',accent:'auto'}};
  try{this.storage=storage===undefined?globalThis.localStorage:storage;const p=JSON.parse(this.storage?.getItem?.(KEY)||'null');if(p){this.language=p.language==='en'?'en':'id';this.style=Object.hasOwn(NARRATION_STYLES,p.style)?p.style:'guide';this.rate=clamp(p.rate,.75,1.25,1);this.pitch=clamp(p.pitch,.85,1.15,1);this.volume=clamp(p.volume,0,1,1);this.detail=p.detail==='full'?'full':'summary';this.subtitles=p.subtitles===true;for(const l of ['id','en']){const q=p.profiles?.[l];if(q)this.profiles[l]={voiceURI:typeof q.voiceURI==='string'?q.voiceURI:'',accent:q.accent==='auto'||family(q.accent)===l?q.accent:'auto'};}Object.assign(this,this.profiles[this.language]);}}catch{}
  this.voicesChanged=()=>{if(this.waitingForVoice&&this.enabled&&this.playing&&this.voice)this.read();else this.onChange();};this.synth?.addEventListener?.('voiceschanged',this.voicesChanged);
 }
 get voices(){try{return this.supported?this.synth.getVoices():[];}catch{return [];}}
 get matchingVoices(){return this.voices.filter(v=>family(v.lang)===this.language);}
 get voice(){const voices=this.matchingVoices,explicit=voices.find(v=>v.voiceURI===this.voiceURI);if(explicit)return explicit;const accent=voices.filter(v=>lang(v.lang)===lang(this.accent)),pool=accent.length?accent:voices;return pool.find(v=>v.localService)||pool.find(v=>v.default)||pool[0]||null;}
 get warning(){
  const en=this.language==='en',v=this.voice;if(this.voices.length&&!v)return en?'No English voice is installed. Add an English voice in your device settings; the text tour remains available.':'Suara Indonesia belum tersedia. Tambahkan voice Indonesia pada perangkat; tur teks tetap dapat digunakan.';
  if(v&&this.accent!=='auto'&&lang(v.lang)!==lang(this.accent))return en?`Requested accent unavailable. Using ${v.name} (${v.lang}).`:`Aksen pilihan belum tersedia. Menggunakan ${v.name} (${v.lang}).`;
  return '';
 }
 status(){const voices=this.matchingVoices;return {supported:this.supported,enabled:this.enabled,busy:this.busy,error:this.error,warning:this.warning,language:this.language,accent:this.accent,style:this.style,rate:this.rate,pitch:this.pitch,volume:this.volume,detail:this.detail,subtitles:this.subtitles,caption:this.caption,sentenceIndex:this.segmentIndex+1,sentenceCount:this.segments.length,voiceURI:this.voiceURI,voiceName:this.voice?.name||(this.language==='en'?'Automatic English voice':'Suara Indonesia otomatis'),voices:voices.map(v=>({id:v.voiceURI,name:v.name,lang:v.lang,local:v.localService})),accents:[...new Set(voices.map(v=>v.lang))]};}
 persist(){try{this.profiles[this.language]={voiceURI:this.voiceURI,accent:this.accent};this.storage?.setItem?.(KEY,JSON.stringify({language:this.language,style:this.style,rate:this.rate,pitch:this.pitch,volume:this.volume,detail:this.detail,subtitles:this.subtitles,profiles:this.profiles}));}catch{}}
 cancel(){this.generation++;this.busy=false;this.utterance=null;this.age=0;this.gap=0;this.pendingNext=false;this.caption='';this.waitingForVoice=false;if(this.supported){this.synth.cancel();if(this.synth.paused)this.synth.resume();}}
 sync(step,playing){
  const changed=step.id!==this.step?.id;if(changed){this.cancel();this.step=step;this.readForStep=false;this.error='';}
  this.playing=playing;if(!this.enabled)return;
  if(!playing||this.suspended){if(this.busy)this.synth.pause();}
  else if(this.busy){if(this.synth.paused)this.synth.resume();}else if(!this.readForStep)this.read();
 }
 read(){
  if(!this.supported||!this.enabled||!this.step)return;this.cancel();this.error='';this.readForStep=true;this.segments=narrationSegments(this.step,this.language,this.style,this.detail);this.segmentIndex=0;
  if(!this.playing||this.suspended){this.readForStep=false;this.onChange();return;}
  if(this.voices.length&&!this.voice){this.waitingForVoice=true;this.error=this.warning;this.onChange();return;}
  this.busy=true;this.speakSegment();
 }
 speakSegment(){
  const token=this.generation,index=this.segmentIndex,raw=this.segments[index],u=new this.Utterance(pronounce(raw,this.language)),voice=this.voice,delivery=NARRATION_STYLES[this.style];this.age=0;this.caption=raw;
  u.lang=voice?.lang||(this.accent==='auto'?(this.language==='en'?'en-US':'id-ID'):this.accent);if(voice)u.voice=voice;u.rate=clamp(this.rate*delivery.rate,.7,1.3,1);u.pitch=clamp(this.pitch*delivery.pitch,.8,1.2,1);u.volume=this.volume;this.utterance=u;
  u.onend=()=>{if(token!==this.generation||index!==this.segmentIndex)return;this.utterance=null;if(index+1<this.segments.length){this.pendingNext=true;this.gap=delivery.gap+(index===0?.2:0);this.age=0;}else this.busy=false;this.onChange();};
  u.onerror=e=>{if(token!==this.generation||index!==this.segmentIndex)return;this.busy=false;this.utterance=null;const en=this.language==='en';this.error=e.error==='not-allowed'?(en?'Audio was blocked. Click Replay narration to try again.':'Audio diblokir browser. Klik Ulangi narasi untuk mencoba lagi.'):(en?'The voice could not play. Choose another matching voice or turn Narration off.':'Suara belum dapat diputar. Pilih suara lain atau matikan Narasi.');this.onChange();};
  try{this.synth.speak(u);}catch{u.onerror({error:'unavailable'});}this.onChange();
 }
 setEnabled(enabled){this.enabled=Boolean(enabled)&&this.supported;this.readForStep=false;this.error='';if(this.enabled)this.read();else this.cancel();this.onChange();}
 configure(options={}){
  const oldLanguage=this.language,audioChanged=Object.keys(options).some(k=>k!=='subtitles');
  if(['id','en'].includes(options.language)&&options.language!==this.language){this.profiles[oldLanguage]={voiceURI:this.voiceURI,accent:this.accent};this.language=options.language;Object.assign(this,this.profiles[this.language]);}
  if(options.accent!==undefined){this.accent=options.accent==='auto'||family(options.accent)===this.language?options.accent:'auto';this.voiceURI='';}
  if(options.voiceURI!==undefined){const v=this.matchingVoices.find(v=>v.voiceURI===options.voiceURI);this.voiceURI=v?.voiceURI||'';if(v)this.accent=v.lang;}
  if(Object.hasOwn(NARRATION_STYLES,options.style))this.style=options.style;
  if(options.rate!==undefined)this.rate=clamp(options.rate,.75,1.25,1);if(options.pitch!==undefined)this.pitch=clamp(options.pitch,.85,1.15,1);if(options.volume!==undefined)this.volume=clamp(options.volume,0,1,1);if(options.detail!==undefined)this.detail=options.detail==='full'?'full':'summary';if(options.subtitles!==undefined)this.subtitles=Boolean(options.subtitles);
  this.persist();if(this.enabled&&audioChanged)this.read();else this.onChange();
 }
 setSuspended(hidden){this.suspended=hidden;if(!this.enabled)return;if(hidden&&this.busy)this.synth.pause();else if(this.playing){if(this.busy)this.synth.resume();else if(!this.readForStep)this.read();}}
 update(dt){
  if(!this.busy||!this.playing||this.suspended)return;
  if(this.pendingNext){this.gap-=dt;if(this.gap<=0){this.pendingNext=false;this.segmentIndex++;this.speakSegment();}return;}
  this.age+=dt;if(this.age>45){this.cancel();this.error=this.language==='en'?'Narration timed out. The tour can continue; replay to try again.':'Narasi melewati batas waktu. Tur dilanjutkan; gunakan Ulangi narasi untuk mencoba lagi.';this.onChange();}
 }
 stop(){this.cancel();this.step=null;this.playing=false;this.suspended=false;this.readForStep=false;this.segments=[];this.segmentIndex=0;}
}
