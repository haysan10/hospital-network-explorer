import {DISTRIBUTION_STEPS,INSTALL_STEPS,InstallationSession,PRESENTATION_SLIDES} from './experience.js';
import {NETWORK,DEVICE_MAP,FLOOR_HEIGHT} from './data.js';
import {EDGES,traceRoute} from './engine.js';
const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);
const INSTALL_STORAGE='medilink-installation-v2';
const descriptions={explore:'Ikuti distribusi jaringan, dari pusat ke setiap layanan.',game:'Enam misi untuk menguji diagnosis dan pemahaman Anda.',installation:'Bangun koneksi bertahap. Uji jalurnya setelah terpasang.',presentation:'Jelaskan jaringan rumah sakit melalui delapan adegan.'};
const names={explore:'Eksplorasi',game:'Game',installation:'Instalasi',presentation:'Presentasi'};
export class ExperienceController {
  constructor({world,state,toast,renderMissions,setTab,selectDevice,exportProgress}){
    Object.assign(this,{world,state,toast,renderMissions,setTab,selectDevice,exportProgress});
    let saved={};try{saved=JSON.parse(localStorage.getItem(INSTALL_STORAGE)||'{}')||{};}catch{}
    this.install=new InstallationSession(saved);this.current='explore';this.exploreIndex=-1;this.installIndex=this.install.index;this.slide=0;this.auto=false;this.welcomeMode='explore';
    this.bind();
  }
  setMode(mode){
    if(!names[mode]||this.world.transit)return;
    this.stopAuto();this.current=mode;this.exploreIndex=-1;this.installIndex=this.install.index;this.feedback=null;
    document.body.dataset.experience=mode;
    for(const b of $$('[data-mode]')){b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));}
    $('#experience-subtitle').textContent=descriptions[mode];$('#tab-missions').textContent={explore:'Distribusi',game:'Misi',installation:'Tahap',presentation:'Slide'}[mode];
    $('#panel-eyebrow').textContent={explore:'EKSPLORASI JARINGAN',game:'LEARNING PATH',installation:'BELAJAR INSTALASI',presentation:'PRESENTASI JARINGAN'}[mode];
    $('#chapter-tag').textContent={explore:'DISTRIBUSI AWAL',game:'6 MISI',installation:'8 TAHAP',presentation:'8 ADEGAN'}[mode];
    $('#presentation-controls').classList.toggle('hidden',mode!=='presentation');
    // Scenario faults belong to game play. Entering another experience returns
    // the shared educational model to an operable baseline, preserving XP.
    this.state.mains=true;this.state.ups=true;this.state.broken.clear();this.state.faultStarted=false;this.state.diagnosed=false;
    $('#power-status').textContent='Daya utama aktif';this.world.setInstallationLinks(mode==='installation'?this.install.links:null);
    $('#trace-banner').classList.add('hidden');this.setTab('missions');
    if(mode==='explore'){this.world.setRoof('auto');this.world.setFloor('all');}
    if(mode==='game'){this.world.setRoof('auto');this.world.setFloor(1);}
    if(mode==='installation')this.installScene();
    if(mode==='presentation'){this.slide=0;this.showSlide();}
    this.updateCaption();this.updateProgress();
  }
  updateProgress(){
    const mode=this.current,progress=mode==='installation'?this.install.index:mode==='presentation'?this.slide+1:this.state.visited.size,total=mode==='installation'?8:mode==='presentation'?8:NETWORK.length;
    if(mode==='game'){$('#progress-count').textContent=`${this.state.completed.length} / 6 misi`;$('#progress-bar').style.width=`${this.state.completed.length/6*100}%`;$('#xp').textContent=`${this.state.xp} XP`;return;}
    $('#progress-count').textContent=`${progress} / ${total} ${mode==='installation'?'tahap':mode==='presentation'?'slide':'perangkat'}`;$('#progress-bar').style.width=`${progress/total*100}%`;$('#xp').textContent=mode==='installation'?`${this.install.links.size} link terpasang`:mode==='presentation'?'Presentasi 3D':`${this.state.xp} XP di mode Game`;
  }
  availableEdges(){return EDGES.filter(e=>this.install.links.has(e.id));}
  render(){
    this.updateProgress();if(this.current==='game'){this.renderMissions();return;}
    if(this.current==='explore')this.renderExplore();
    if(this.current==='installation')this.renderInstallation();
    if(this.current==='presentation')this.renderPresentation();
  }
  updateCaption(){
    const el=$('#building-caption'),exterior=this.world.isExterior();
    el.classList.toggle('hidden',this.world.mode==='walk'||this.current==='presentation');
    el.innerHTML=`<span class="status-dot"></span> DUA LANTAI TERHUBUNG <span>${exterior?'Atap terpasang · pilih lantai untuk membuka potongan':'Potongan bangunan · atap dapat diatur melalui kontrol tampilan'}</span>`;
  }
  scene(config){
    this.world.clearTrace();$('#trace-banner').classList.add('hidden');
    this.world.setFloor(config.floor??1,false);this.world.setRoof(config.roof||'open');
    this.world.setLayer('copper',true);this.world.setLayer('fiber',true);this.world.setLayer('wifi',!!config.wifi);this.world.setLayer('power',!!config.power);
    for(const b of $$('[data-layer]'))b.classList.toggle('active',this.world.layers[b.dataset.layer]);
    if(config.target&&config.floor!=='all'){
      const n=DEVICE_MAP.get(config.target);this.world.selected=n.id;this.world.selectionRing.visible=true;this.world.selectionRing.position.set(n.x,(n.floor-1)*FLOOR_HEIGHT+.07,n.z);this.world.focusPoint(n.x,n.z,n.floor);
    }else this.world.home();
    if(config.route){const edges=this.current==='installation'?EDGES.filter(e=>this.install.links.has(e.id)):EDGES;
      const result=traceRoute(...config.route,this.state,{policy:false,edges});if(result.ok)this.world.showTrace(result);
    }
    this.updateCaption();
  }
  renderExplore(){
    const step=DISTRIBUTION_STEPS[this.exploreIndex];
    $('#panel-content').innerHTML=`<div class="mode-intro"><span class="eyebrow">PETA DISTRIBUSI</span><h2>Dari pusat,<br>ke setiap layanan.</h2><p>Topologi awal dipertahankan. Ikuti enam titik distribusi atau jelajahi ruangan secara bebas.</p></div><div class="distribution-map"><span>Server · L1</span><b>↓</b><span>Core switch</span><div><span>Switch L1</span><span>Penunjang L1</span><span>Distribusi L2</span></div><small>↓ LAN ke terminal & access point</small></div>${step?`<div class="guide-card"><span class="eyebrow">${step.tag}</span><h3>${step.title}</h3><p>${step.text}</p><div class="guide-tip">${step.tip}</div><div class="guide-nav"><button data-explore="${this.exploreIndex-1}" class="button subtle" ${this.exploreIndex===0?'disabled':''}>←</button><span>${this.exploreIndex+1} / ${DISTRIBUTION_STEPS.length}</span><button data-explore="${this.exploreIndex+1}" class="button primary">${this.exploreIndex===5?'Selesai':'Lanjut'} →</button></div><button data-inspect="${step.target}" class="button subtle full">Periksa perangkat <span>↗</span></button></div>`:`<button data-explore="0" class="button primary full">Ikuti distribusi awal <span>→</span></button>`}<div class="route-stops">${DISTRIBUTION_STEPS.map((s,i)=>`<button data-explore="${i}" class="${i===this.exploreIndex?'active':''}"><i>${String(i+1).padStart(2,'0')}</i><span>${s.title}</span><b>↗</b></button>`).join('')}</div><div class="connector-card"><span class="eyebrow">AKSES ANTARLANTAI</span><h3>Naik lewat tangga penghubung.</h3><p>Bordes menyambungkan posisi ruang tangga pada kedua denah. Dekati tangga, lalu tekan F atau tombol naik/turun.</p><button data-mode-action="stairs" class="button subtle full">Menuju tangga <span>↗</span></button></div>`;
  }
  explore(index){
    if(index>=DISTRIBUTION_STEPS.length){this.exploreIndex=-1;this.scene({floor:'all',roof:'auto'});this.renderExplore();this.toast('Distribusi selesai ditelusuri. Lanjutkan eksplorasi bebas atau pilih mode Instalasi.');return;}
    if(index<0)return;this.exploreIndex=index;this.setTab('missions');this.scene(DISTRIBUTION_STEPS[index]);this.renderExplore();$('#panel-content').scrollTop=0;
  }
  installScene(){
    const index=Math.min(this.installIndex,INSTALL_STEPS.length-1),step=INSTALL_STEPS[index];
    const config={...step,roof:'open',wifi:['wifi','policy'].includes(step.id),power:step.id==='core'};
    if(this.installIndex>=INSTALL_STEPS.length)config.route=['pc-icu','server'];
    else if(this.install.completed.includes(step.id)){
      if(step.id==='backbone')config.route=['core','sw-l2'];
      if(step.id==='endpoints')config.route=['sw-l2','pc-icu'];
      if(step.id==='branches')config.route=['core','sw-south'];
      if(step.id==='core')config.route=['server','core'];
      if(step.id==='wifi')config.route=['guest','ap-registration'];
    }
    this.scene(config);
  }
  renderInstallation(){
    this.updateProgress();
    if(this.installIndex>=INSTALL_STEPS.length){const test=this.install.verify();$('#panel-content').innerHTML=`<div class="mode-intro"><span class="eyebrow">INSTALASI SELESAI</span><h2>Jalur terpasang.<br>Koneksi teruji.</h2><p>Seluruh ${EDGES.length} link mengikuti graf distribusi awal. Tiga jalur layanan dari dua lantai dan kebijakan tamu telah diperiksa.</p></div><div class="verification-list">${test.results.map(r=>`<div><span>${DEVICE_MAP.get(r.id).name}</span><b>${r.ok?'✓ Terhubung':'Periksa'}</b></div>`).join('')}<div><span>Tablet tamu → server</span><b>✓ Ditolak kebijakan</b></div></div><button data-install-export class="button primary full">Ekspor hasil belajar <span>↗</span></button><button data-change-mode="game" class="button subtle full">Lanjut ke mode Game <span>→</span></button><button data-install-reset class="text-btn">Ulangi latihan instalasi</button><p class="quality-note">Latihan konseptual. Tidak menghitung panjang kabel terukur, kapasitas, atau konfigurasi perangkat produksi.</p>`;return;}
    const step=INSTALL_STEPS[this.installIndex],done=this.install.completed.includes(step.id);
    $('#panel-content').innerHTML=`<div class="mode-intro"><span class="eyebrow">TAHAP ${this.installIndex+1} DARI ${INSTALL_STEPS.length}</span><h2>${step.title}</h2><p>${step.description}</p></div><div class="installation-meter"><span>${this.install.index} / 8 tahap selesai</span><b>${this.install.links.size} / ${EDGES.length} link</b><i><em style="width:${this.install.index/8*100}%"></em></i></div><p class="choice-instruction">${done?'Pekerjaan tahap ini telah diverifikasi.':'Pilih pekerjaan yang sesuai untuk memasang tahap ini.'}</p><div class="installation-choices">${step.choices.map((c,i)=>`<button data-install-choice="${i}" ${done?'disabled':''} class="${done&&i===step.answer?'correct':''}"><i>${String.fromCharCode(65+i)}</i><span>${c}</span>${done&&i===step.answer?'<b>✓</b>':''}</button>`).join('')}</div><div class="installation-feedback ${this.feedback&&!this.feedback.ok?'wrong':''}" role="status">${this.feedback?.message|| (done?step.explanation:'Kabel akan muncul setelah pekerjaan disambungkan dengan benar.')}</div>${done?`<button data-install-next class="button primary full">${this.installIndex===7?'Lihat hasil uji':'Lanjut ke tahap berikutnya'} <span>→</span></button>`:''}<div class="install-step-list">${INSTALL_STEPS.map((s,i)=>`<button data-install-jump="${i}" ${i>this.install.index?'disabled':''} class="${i===this.installIndex?'active':''}"><i>${this.install.completed.includes(s.id)?'✓':i+1}</i><span>${s.title}</span></button>`).join('')}</div><button data-install-reset class="text-btn">Ulangi latihan instalasi</button><p class="quality-note">Gunakan urutan ini untuk memahami model jaringan. Pekerjaan listrik fisik tidak disimulasikan.</p>`;
  }
  saveInstallation(){try{localStorage.setItem(INSTALL_STORAGE,JSON.stringify(this.install.serialize()));}catch{this.toast('Progres instalasi tidak dapat disimpan di browser. Ekspor hasil untuk menyimpan catatan.');}}
  choose(choice){
    this.feedback=this.install.choose(this.installIndex,choice);
    if(this.feedback.ok){this.saveInstallation();this.world.setInstallationLinks(this.install.links);this.installScene();this.toast('Tahap terpasang. '+INSTALL_STEPS[this.installIndex].explanation);}
    this.renderInstallation();
  }
  showSlide(){const config=PRESENTATION_SLIDES[this.slide];this.scene(config);this.renderPresentation();$('#slide-count').textContent=`${String(this.slide+1).padStart(2,'0')} / 08`;$('#slide-prev').disabled=this.slide===0;$('#slide-next').disabled=this.slide===7;}
  renderPresentation(){
    this.updateProgress();
    const s=PRESENTATION_SLIDES[this.slide];
    $('#panel-content').innerHTML=`<div class="presentation-copy"><span class="eyebrow">${s.eyebrow}</span><h2>${s.title}</h2><p>${s.text}</p><div class="slide-points">${s.points.map((p,i)=>`<div><i>${i+1}</i><span>${p}</span></div>`).join('')}</div><div class="speaker-note"><b>CATATAN PEMBICARA</b><p>${s.note}</p></div><div class="slide-dots" aria-label="Pilih slide">${PRESENTATION_SLIDES.map((p,i)=>`<button data-slide="${i}" class="${i===this.slide?'active':''}" aria-label="Slide ${i+1}: ${p.title}" ${i===this.slide?'aria-current="step"':''}>${String(i+1).padStart(2,'0')}</button>`).join('')}</div><p class="quality-note">← → berganti slide · Spasi putar/jeda · Esc selesai. Tampilan 3D mengikuti setiap adegan.</p>${this.slide===7?'<button data-change-mode="explore" class="button primary full">Kembali ke eksplorasi <span>→</span></button>':''}</div>`;
  }
  nextSlide(delta){const next=Math.max(0,Math.min(7,this.slide+delta));if(next===this.slide){if(delta>0)this.stopAuto();return;}this.slide=next;this.setTab('missions');this.showSlide();if(this.slide===7)this.stopAuto();}
  stopAuto(){clearInterval(this.timer);this.auto=false;$('#slide-play').textContent='Putar otomatis';$('#slide-play').setAttribute('aria-label','Putar otomatis');}
  toggleAuto(){if(this.auto){this.stopAuto();return;}if(this.slide===7){this.slide=0;this.showSlide();}this.auto=true;$('#slide-play').textContent='Jeda otomatis';$('#slide-play').setAttribute('aria-label','Jeda otomatis');this.timer=setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))this.nextSlide(1);},10000);}
  exportData(){return {mode:this.current,installation:{...this.install.serialize(),installedLinks:[...this.install.links],verification:this.install.verify()},presentationSlide:this.slide+1};}
  bind(){
    for(const b of $$('[data-mode]'))b.addEventListener('click',()=>this.setMode(b.dataset.mode));
    for(const b of $$('[data-start-mode]'))b.addEventListener('click',()=>{this.welcomeMode=b.dataset.startMode;for(const c of $$('[data-start-mode]')){c.classList.toggle('active',b===c);c.setAttribute('aria-pressed',String(b===c));}$('#start').innerHTML=`Mulai ${names[this.welcomeMode].toLowerCase()} <span>→</span>`;});
    $('#stair-action').addEventListener('click',()=>this.world.travelStairs());
    $('#roof-toggle').addEventListener('click',()=>{const list=['auto','solid','open'];this.world.setRoof(list[(list.indexOf(this.world.roofMode)+1)%3]);this.updateCaption();});
    $('#panel-content').addEventListener('click',e=>{
      if(this.world.transit)return;
      const attr=name=>e.target.closest(`[${name}]`)?.getAttribute(name);
      const explore=attr('data-explore');if(explore!==undefined&&explore!==null)this.explore(Number(explore));
      const inspect=attr('data-inspect');if(inspect)this.selectDevice(inspect);
      if(attr('data-mode-action')==='stairs')this.world.goToStairs();
      const choice=attr('data-install-choice');if(choice!==undefined&&choice!==null)this.choose(Number(choice));
      if(e.target.closest('[data-install-next]')){this.installIndex=Math.min(this.installIndex+1,this.install.index);this.feedback=null;this.installScene();this.renderInstallation();$('#panel-content').scrollTop=0;}
      const jump=attr('data-install-jump');if(jump!==undefined&&jump!==null&&Number(jump)<=this.install.index){this.installIndex=Number(jump);this.feedback=null;this.installScene();this.renderInstallation();}
      if(e.target.closest('[data-install-reset]')){this.install=new InstallationSession();this.installIndex=0;this.feedback=null;this.saveInstallation();this.world.setInstallationLinks(this.install.links);this.installScene();this.renderInstallation();}
      if(e.target.closest('[data-install-export]'))this.exportProgress();
      const slide=attr('data-slide');if(slide!==undefined&&slide!==null){this.slide=Number(slide);this.stopAuto();this.showSlide();}
      const mode=attr('data-change-mode');if(mode)this.setMode(mode);
    });
    $('#slide-prev').addEventListener('click',()=>{this.stopAuto();this.nextSlide(-1);});$('#slide-next').addEventListener('click',()=>{this.stopAuto();this.nextSlide(1);});
    $('#slide-play').addEventListener('click',()=>this.toggleAuto());$('#slide-exit').addEventListener('click',()=>this.setMode('explore'));
    $('#slide-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{this.toast('Layar penuh tidak tersedia pada browser ini.');}});
    window.addEventListener('keydown',e=>{if(this.current!=='presentation'||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
      if(e.code==='ArrowRight'){e.preventDefault();this.stopAuto();this.nextSlide(1);}if(e.code==='ArrowLeft'){e.preventDefault();this.stopAuto();this.nextSlide(-1);}if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();this.toggleAuto();}if(e.code==='Escape')this.setMode('explore');
    });
  }
}
