import test from 'node:test';
import assert from 'node:assert/strict';
import {TourNarrator,spokenExplanation,narrationSegments,pronounce} from '../src/narration.js';
import {TOUR_STEPS} from '../src/tour.js';
import {localizedTourStep,NARRATION_STYLES} from '../src/tour-copy.js';
function finish(n){let attempts=0;while(n.busy&&attempts++<100){if(n.utterance)n.utterance.onend();n.update(1);}assert.ok(attempts<100);}
function fake(){
 class Utterance{constructor(text){this.text=text;}}
 const synth={paused:false,queue:[],cancels:0,events:{},voices:[{voiceURI:'en',name:'English',lang:'en-US',default:true},{voiceURI:'id-cloud',name:'Indonesia cloud',lang:'id-ID'},{voiceURI:'id-local',name:'Indonesia local',lang:'id-ID',localService:true}],getVoices(){return this.voices;},speak(u){this.queue.push(u);},cancel(){this.cancels++;this.queue=[];},pause(){this.paused=true;},resume(){this.paused=false;},addEventListener(k,fn){this.events[k]=fn;}};return {synth,Utterance};
}
test('Narration starts only after opt-in, prioritizes local Indonesian voice and reads each chapter explanation',()=>{
 const f=fake(),n=new TourNarrator(f);n.sync(TOUR_STEPS[1],true);assert.equal(f.synth.queue.length,0);n.setEnabled(true);assert.equal(f.synth.queue.length,1);assert.equal(n.utterance.voice.voiceURI,'id-local');assert.match(n.utterance.text,/Pendaftaran/);assert.equal(n.utterance.lang,'id-ID');assert.ok(n.busy);assert.match(spokenExplanation(TOUR_STEPS[12]),/catu daya cadangan/);
});
test('Pause/resume, hidden-tab suspension and chapter changes cancel stale speech without replaying completed narration',()=>{
 const f=fake(),n=new TourNarrator(f);n.sync(TOUR_STEPS[1],true);n.setEnabled(true);const old=n.utterance;n.sync(TOUR_STEPS[1],false);assert.ok(f.synth.paused);n.sync(TOUR_STEPS[1],true);assert.equal(f.synth.paused,false);assert.equal(n.utterance,old);
 n.setSuspended(true);assert.ok(f.synth.paused);n.setSuspended(false);assert.equal(f.synth.paused,false);n.sync(TOUR_STEPS[2],true);const current=n.utterance;assert.notEqual(old,current);old.onend();assert.equal(n.busy,true);current.onend();finish(n);assert.equal(n.busy,false);n.sync(TOUR_STEPS[2],true);assert.equal(n.utterance,null);
});
test('Voice/rate changes restart the current explanation; stop and disable clear all queued audio',()=>{
 const f=fake(),n=new TourNarrator(f);n.sync(TOUR_STEPS[10],true);n.setEnabled(true);n.configure({voiceURI:'id-cloud',rate:.85});assert.equal(n.utterance.voice.voiceURI,'id-cloud');assert.equal(n.utterance.rate,.85*NARRATION_STYLES.guide.rate);n.setEnabled(false);assert.equal(f.synth.queue.length,0);assert.equal(n.busy,false);n.setEnabled(true);n.stop();assert.equal(n.step,null);assert.equal(f.synth.queue.length,0);assert.equal(n.busy,false);
});
test('Unsupported browsers, delayed voices, audio rejection and a stalled engine leave the text tour usable',()=>{
 const unsupported=new TourNarrator({synth:null,Utterance:null});unsupported.sync(TOUR_STEPS[0],true);unsupported.setEnabled(true);assert.equal(unsupported.enabled,false);assert.equal(unsupported.status().supported,false);
 const f=fake();let updates=0;const n=new TourNarrator({...f,onChange:()=>updates++});f.synth.voices=[];assert.deepEqual(n.voices,[]);f.synth.voices=[{voiceURI:'id',name:'Indonesia',lang:'id-ID'}];f.synth.events.voiceschanged();assert.ok(updates);n.sync(TOUR_STEPS[0],true);n.setEnabled(true);n.utterance.onerror({error:'not-allowed'});assert.match(n.error,/diblokir/);assert.equal(n.busy,false);n.read();n.update(91);assert.equal(n.busy,false);assert.match(n.error,/batas waktu/);
});
test('All fourteen chapters have full English content and conversational Indonesian scripts without changing the scene route',()=>{
 for(const step of TOUR_STEPS)for(const language of ['id','en'])for(const style of ['guide','presenter','calm']){
  const s=localizedTourStep(step,language,style);assert.ok(s.title&&s.place&&s.phase&&s.text.length>50,step.id);assert.equal(s.details.length,step.details.length);assert.equal(s.flow.length,step.flow.length);for(const key of ['id','floor','view','device','room','trace','duration'])assert.equal(s[key],step[key]);assert.deepEqual(s.edges,step.edges);
  assert.ok(narrationSegments(step,language,style,'full').length>narrationSegments(step,language,style,'summary').length);
 }
 assert.match(localizedTourStep(TOUR_STEPS[0],'en').text,/Let's/);assert.match(localizedTourStep(TOUR_STEPS[0],'id').text,/Kita/);assert.notEqual(localizedTourStep(TOUR_STEPS[0],'en','guide').text,localizedTourStep(TOUR_STEPS[0],'en','presenter').text);
});
test('Language and accent changes select a matching real voice, cancel stale audio and use language-specific pronunciation',()=>{
 const f=fake();f.synth.voices.push({voiceURI:'uk',name:'British',lang:'en-GB'},{voiceURI:'au',name:'Australian',lang:'en-AU',localService:true});const n=new TourNarrator(f);n.sync(TOUR_STEPS[12],true);n.setEnabled(true);const old=n.utterance;
 n.configure({language:'en',accent:'en-GB'});assert.equal(n.utterance.lang,'en-GB');assert.equal(n.utterance.voice.voiceURI,'uk');assert.match(n.utterance.text,/Backup power/);assert.equal(n.status().warning,'');assert.ok(n.status().voices.every(v=>v.lang.startsWith('en')));old.onend();assert.equal(n.pendingNext,false);
 n.configure({accent:'en-AU'});assert.equal(n.utterance.voice.voiceURI,'au');assert.match(pronounce('UPS LAN L2','en'),/U P S local area network floor two/);assert.match(pronounce('UPS LAN L2','id'),/catu daya cadangan jaringan lokal lantai dua/);n.configure({language:'id'});assert.equal(n.utterance.lang,'id-ID');assert.equal(n.voice.voiceURI,'id-local');
});
test('An unavailable accent is explained honestly and a missing language never silently uses a foreign voice',()=>{
 const f=fake(),n=new TourNarrator(f);n.sync(TOUR_STEPS[1],true);n.configure({language:'en',accent:'en-GB'});n.setEnabled(true);assert.equal(n.utterance.lang,'en-US');assert.match(n.warning,/Requested accent unavailable/);
 n.configure({language:'id'});f.synth.voices=f.synth.voices.filter(v=>v.lang.startsWith('en'));n.read();assert.equal(n.busy,false);assert.equal(n.utterance,null);assert.match(n.error,/Suara Indonesia belum tersedia/);f.synth.voices.push({voiceURI:'id-new',lang:'id-ID',name:'Indonesian'});f.synth.events.voiceschanged();assert.equal(n.utterance.lang,'id-ID');assert.equal(n.error,'');
});
test('Sentence pauses and captions follow playback, stay paused between sentences, and support the detailed script',()=>{
 const f=fake(),n=new TourNarrator(f);n.sync(TOUR_STEPS[11],true);n.configure({detail:'full',subtitles:true});n.setEnabled(true);const first=n.utterance;assert.equal(n.status().caption,localizedTourStep(TOUR_STEPS[11]).title);n.configure({subtitles:false});assert.equal(n.utterance,first);n.configure({subtitles:true});first.onend();assert.equal(n.utterance,null);const gap=n.gap;n.sync(TOUR_STEPS[11],false);n.update(2);assert.equal(n.gap,gap);n.sync(TOUR_STEPS[11],true);n.update(gap/2);assert.equal(n.utterance,null);n.update(gap);assert.ok(n.utterance);assert.equal(n.segmentIndex,1);assert.ok(n.status().caption.length>15);finish(n);assert.equal(n.busy,false);assert.equal(n.segmentIndex,n.segments.length-1);
});
test('Delivery controls affect real utterances and persist language profiles without enabling autoplay on reload',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},f=fake(),n=new TourNarrator({...f,storage});n.sync(TOUR_STEPS[3],true);n.setEnabled(true);n.configure({style:'calm',rate:1,pitch:.95,volume:.4,detail:'full',subtitles:true});const calm=n.utterance;assert.equal(calm.rate,.9);assert.equal(calm.volume,.4);assert.ok(calm.pitch<1);n.configure({style:'presenter'});assert.ok(n.utterance.rate>calm.rate);n.configure({voiceURI:'id-cloud'});n.configure({language:'en',accent:'en-US'});
 const restored=new TourNarrator({...f,storage});assert.equal(restored.language,'en');assert.equal(restored.style,'presenter');assert.equal(restored.volume,.4);assert.equal(restored.detail,'full');assert.equal(restored.subtitles,true);assert.equal(restored.enabled,false);restored.configure({language:'id'});assert.equal(restored.voiceURI,'id-cloud');
 const invalid=new TourNarrator({...f,storage:{getItem:()=>'{"style":"constructor","language":"xx","rate":999,"volume":-5}'}});assert.equal(invalid.style,'guide');assert.equal(invalid.language,'id');assert.equal(invalid.rate,1.25);assert.equal(invalid.volume,0);
});
