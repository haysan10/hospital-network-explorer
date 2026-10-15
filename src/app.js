import {HospitalWorld} from './world.js';
import {ExperienceController} from './modes.js';
import {NETWORK,DEVICE_MAP,ROOMS,FLOORS,MISSIONS,LESSONS,QUIZ,REFERENCES,roomById} from './data.js';
import {GameState,powered,traceRoute} from './engine.js';
const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);
const STORAGE='medilink-explorer-v1';
let state,world,modes,activeTab='missions',selected=null,lastResult=null,toastTimer,storageWarned=false;
const kindName={pc:'Terminal',ap:'Access point',server:'Server',rack:'Rak distribusi',switch:'Switch',router:'Router / firewall',ups:'UPS',panel:'Panel daya',tablet:'Klien tamu'};
const iconName={pc:'PC',ap:'AP',server:'DC',rack:'L2',switch:'SW',router:'FW',ups:'UPS',panel:'AC',tablet:'TAB'};
function toast(text) {$('#toast').textContent=text;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),4500);}
function save() {try{localStorage.setItem(STORAGE,JSON.stringify(state.serialize()));}catch{if(!storageWarned){toast('Browser tidak mengizinkan penyimpanan progres. Anda tetap dapat bermain dan mengekspor hasil.');storageWarned=true;}}updateProgress();}
function change(action) {
  const before=state.completed.length;action();save();world.updateState();
  if(state.completed.length>before){const m=MISSIONS[state.completed.length-1];toast(`Misi selesai: ${m.name}. Total ${state.xp} XP.`);}
  $('#power-status').textContent=state.mains?'Daya utama aktif':state.ups?'Daya utama padam · UPS siap':'Daya utama padam · UPS tidak siap';
  if(!state.mains||state.broken.size){world.clearTrace();$('#trace-banner').classList.add('hidden');}
}
function updateProgress() {
  if(modes&&modes.current!=='game'){modes.updateProgress();return;}
  $('#progress-count').textContent=`${state.completed.length} / ${MISSIONS.length} misi`;
  $('#progress-bar').style.width=`${state.completed.length/MISSIONS.length*100}%`;$('#xp').textContent=`${state.xp} XP`;
}
function setTab(tab) {
  activeTab=tab;selected=null;
  for(const id of ['tab-missions','nav-missions'])$('#'+id).classList.toggle('active',tab==='missions');
  for(const id of ['tab-devices','nav-devices'])$('#'+id).classList.toggle('active',tab==='devices');
  if(tab==='missions'){if(modes)modes.render();else renderMissions();}else renderDevices();
}
function renderMissions() {
  if(state.completed.length===MISSIONS.length){
    $('#panel-content').innerHTML=`<div class="complete-card"><span class="eyebrow">EKSPLORASI TUNTAS</span><h2>Setiap koneksi<br>punya peran.</h2><div class="complete-score">${state.xp}<small style="font-size:16px;letter-spacing:0"> XP</small></div><p>Anda menyelesaikan enam misi dan memeriksa ${state.visited.size} perangkat. Lanjutkan eksplorasi bebas atau simpan catatan pembelajaran Anda.</p><button data-action="export" class="button primary full">Ekspor hasil belajar <span>→</span></button><button data-action="devices" class="button subtle full">Eksplorasi perangkat</button><button data-action="reset" class="text-btn">Mulai progres baru</button><p class="quality-note">Skor berasal dari penyelesaian aktivitas simulasi, bukan sertifikasi kompetensi instalasi.</p></div>`;return;
  }
  $('#panel-content').innerHTML=`<div class="mission-intro"><h2>Belajar dari dalam.</h2><p>Enam misi untuk memahami bagaimana jaringan menghubungkan layanan rumah sakit.</p></div>`+MISSIONS.map((m,i)=>{
    const done=state.completed.includes(m.id),current=state.mission?.id===m.id;
    return `<article class="mission ${done?'done':current?'current':'locked'}"><div class="mission-index">${done?'✓':String(i+1).padStart(2,'0')}</div><div class="mission-body"><h3>${m.name}</h3><div class="zone">${m.zone}</div>${current?`<p>${m.text}</p><button data-mission="${m.id}" class="button primary full">${m.action}<span>→</span></button><div class="xp-pill">+${m.xp} XP setelah selesai</div>`:''}</div></article>`;
  }).join('');
}
function renderDevices() {
  $('#panel-content').innerHTML=`<div class="mission-intro"><h2>Di balik setiap koneksi.</h2><p>Pilih perangkat untuk melihat fungsi, jalur, dan status simulasinya.</p></div><input class="device-filter" id="device-filter" type="search" placeholder="Cari perangkat atau ruangan..." aria-label="Cari perangkat"><div id="device-results"></div>`;
  renderDeviceList('');$('#device-filter').addEventListener('input',e=>renderDeviceList(e.target.value));
}
function renderDeviceList(query) {
  const q=query.toLocaleLowerCase('id');
  const devices=NETWORK.filter(n=>(n.name+' '+roomById(n.room)?.name+' '+kindName[n.kind]).toLocaleLowerCase('id').includes(q));
  $('#device-results').innerHTML=devices.map(n=>`<button class="device-list-item" data-device="${n.id}"><span class="device-list-icon">${iconName[n.kind]}</span><span><strong>${n.name}</strong><small>LANTAI ${n.floor} · ${kindName[n.kind]}</small></span><span>›</span></button>`).join('')||'<p class="quality-note">Tidak ada perangkat yang sesuai.</p>';
}
function selectDevice(id) {
  const n=DEVICE_MAP.get(id);if(!n||world.transit)return;
  selected=id;lastResult=null;activeTab='devices';
  world.clearTrace();$('#trace-banner').classList.add('hidden');
  $('#tab-missions').classList.remove('active');$('#tab-devices').classList.add('active');$('#nav-missions').classList.remove('active');$('#nav-devices').classList.add('active');
  world.select(id);change(()=>{if(modes?.current==='game')state.inspect(id);else state.visited.add(id);});renderDevice();$('#panel-content').scrollTop=0;
}
function deviceStatus(n) {
  if(modes?.current==='installation'&&n.network!==false&&n.id!=='server'&&!traceRoute(n.id,'server',state,{policy:false,edges:modes.availableEdges()}).ok)return 'Belum terpasang';
  if(!powered(n,state))return 'Tanpa daya';
  if(state.broken.has(`link-${n.id}`))return 'Link terputus';
  return n.network===false?'Siap':'Aktif';
}
function renderDevice() {
  const n=DEVICE_MAP.get(selected);if(!n){renderDevices();return;}
  const lesson=LESSONS[n.kind],status=deviceStatus(n),network=n.network!==false;
  const canTrace=network&&n.id!=='server';
  const gameMode=modes?.current==='game';
  $('#panel-content').innerHTML=`<div class="device-card"><button class="back-button" data-action="back">← Kembali ke daftar perangkat</button><div style="height:20px"></div><span class="device-type">${kindName[n.kind]} · Lantai ${n.floor}</span><h2>${n.name}</h2><div class="device-status"><span class="pill ${['Tanpa daya','Link terputus','Belum terpasang'].includes(status)?'offline':''}">${status}</span>${n.vlan?`<span class="pill">VLAN ${n.vlan}</span>`:''}</div><div class="device-meta"><div><span>Lokasi</span><b>${roomById(n.room)?.name||'Area layanan'}</b></div><div><span>Suplai daya model</span><b>${n.protected?'Sirkuit UPS':'Suplai utama'}</b></div></div><h3 style="font-size:12px;font-weight:600">${lesson.title}</h3><p>${lesson.text}</p><div class="concept-card"><strong>${lesson.concept}</strong><p>${lesson.detail}</p></div><div class="device-actions">${canTrace?`<button data-action="trace" class="button primary full">${n.id==='guest'?'Uji akses ke server':'Telusuri paket'} <span>→</span></button>`:''}${network&&n.kind==='pc'?'<button data-action="diagnose" class="button subtle full">Diagnosis koneksi</button>':''}${gameMode&&n.id==='pc-icu'&&state.broken.has('link-pc-icu')?`<button data-action="repair" class="button ${state.diagnosed?'primary':'subtle'} full">Sambungkan ulang kabel ICU</button>`:''}${gameMode&&n.id==='pc-icu'&&!state.broken.has('link-pc-icu')?'<button data-action="fault" class="text-btn">Aktifkan skenario kabel ICU putus</button>':''}${gameMode&&(n.kind==='ups'||n.kind==='panel')?'<button data-action="power" class="button primary full">Buka uji daya <span>→</span></button>':''}<button data-action="missions" class="text-btn">Kembali ke alur ${modes?.current==='game'?'misi':'mode ini'}</button></div><div id="result"></div></div>`;
  if(lastResult)renderResult(lastResult);
}
function renderResult(result) {
  const el=$('#result');if(!el)return;
  let html;
  if(result.ok)html=`<strong>Jalur aktif ditemukan</strong><p style="margin:7px 0">Paket dapat mencapai server pada kondisi simulasi ini. Panjang lintasan visual ${result.length.toFixed(1)} unit scene.</p>${result.nodes.map(id=>`<div class="route-step">${DEVICE_MAP.get(id).name}</div>`).join('')}${result.nodes.some(id=>DEVICE_MAP.get(id).floor!==DEVICE_MAP.get(result.nodes[0]).floor)?'<p style="margin:9px 0 0">Tampilan Gedung membuka jalur antarlantai secara otomatis.</p>':''}`;
  else if(result.reason==='policy')html='<strong>Akses ditolak sesuai kebijakan</strong><p style="margin:7px 0">Tablet berada pada VLAN 30 (tamu). Aturan simulasi menolak akses ke server internal. Kondisi ini merupakan pembatasan layanan, bukan kerusakan kabel.</p>';
  else html=`<strong>${result.reason==='power'?'Perangkat tidak mendapat daya':'Jalur terputus'}</strong><p style="margin:7px 0">${result.message}</p>${selected==='pc-icu'&&state.diagnosed?'<p style="margin:7px 0 0">Diagnosis: kabel terminal ICU ke switch lantai 2 terputus. Perangkat lain di switch tetap terhubung. Pilih Sambungkan ulang kabel ICU.</p>':''}`;
  el.className=`route-result ${result.ok?'':'fail'}`;el.innerHTML=html;
}
function traceSelected(diagnose=false) {
  if(!selected)return;change(()=>{if(modes?.current==='game')lastResult=diagnose?state.diagnose(selected):state.trace(selected);else lastResult=traceRoute(selected,'server',state,{edges:modes?.current==='installation'?modes.availableEdges():undefined});});
  world.showTrace(lastResult);renderDevice();
  const banner=$('#trace-banner');banner.classList.remove('hidden');banner.innerHTML=lastResult.ok?`<b>PAKET MENUJU SERVER</b><br>${lastResult.nodes.map(id=>DEVICE_MAP.get(id).kind==='pc'?'Terminal':kindName[DEVICE_MAP.get(id).kind]).join(' → ')}`:lastResult.reason==='policy'?'<b>KEBIJAKAN AKSES BEKERJA</b><br>VLAN tamu ditolak menuju server internal.':'<b>GANGGUAN TERDETEKSI</b><br>'+lastResult.message;
}
function missionAction(id) {
  const m=MISSIONS.find(m=>m.id===id);if(!m)return;
  if(id==='quiz'){showQuiz();return;}
  if(id==='repair'){change(()=>state.startFault());toast('Skenario aktif: kabel terminal ICU putus. Jalankan diagnosis terlebih dahulu.');}
  selectDevice(m.target);
  if(id==='power')showPower();
}
function showDialog(title,html) {
  $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;
  if(!$('#info-dialog').open)$('#info-dialog').showModal();
}
function showPower() {
  const on=NETWORK.filter(n=>powered(n,state)).length,protectedDevices=NETWORK.filter(n=>n.protected);
  showDialog('Laboratorium daya cadangan',`<p>Uji perbedaan antara suplai utama dan sirkuit UPS pada model ini. Status yang berubah di bawah juga mengubah aliran data di dunia 3D.</p><div class="toggle-row"><span>UPS siap memasok daya cadangan</span><input id="ups-ready" type="checkbox" aria-label="UPS siap" ${state.ups?'checked':''}></div><div class="toggle-row"><span>Suplai utama</span><strong>${state.mains?'Aktif':'Padam'}</strong></div><div class="toggle-row"><span>Perangkat yang memperoleh daya</span><strong>${on} / ${NETWORK.length}</strong></div><p><b>Sirkuit cadangan:</b> ${protectedDevices.map(n=>n.name).join(', ')}.</p><button id="toggle-mains" class="button primary">${state.mains?'Simulasikan pemadaman':'Pulihkan suplai utama'} <span>→</span></button><p class="quality-note">Kapasitas, waktu baterai, dan sistem listrik rumah sakit tidak dihitung. Pulsa visual hanya menandai jalur, bukan gelombang arus listrik.</p>`);
  $('#ups-ready').addEventListener('change',e=>{change(()=>{state.ups=e.target.checked;});showPower();if(selected)renderDevice();});
  $('#toggle-mains').addEventListener('click',()=>{change(()=>{if(state.mains)state.outage();else state.mains=true;});showPower();if(selected)renderDevice();toast(state.mains?'Suplai utama kembali aktif.':`Suplai utama padam. ${state.ups?'Perangkat pada sirkuit UPS tetap memperoleh daya.':'UPS tidak siap, sehingga beban ikut padam.'}`);});
}
function showQuiz() {
  const i=state.quiz.length;
  if(i>=QUIZ.length){showDialog('Evaluasi selesai',`<div class="complete-card"><span class="eyebrow">PEMAHAMAN TERKONFIRMASI</span><h2>Tiga konsep.<br>Satu jaringan yang utuh.</h2><p>Anda telah menjawab ketiga pertanyaan. ${state.completed.length===6?'Seluruh misi selesai.':'Selesaikan misi sebelumnya untuk menuntaskan learning path.'}</p><p>Skor aktivitas saat ini: <b>${state.xp} XP</b>.</p><button data-dialog-action="finish" class="button primary">Kembali ke eksplorasi <span>→</span></button></div>`);return;}
  const q=QUIZ[i];
  showDialog(`Evaluasi pemahaman · ${i+1} / ${QUIZ.length}`,`<div class="quiz-card"><span class="eyebrow">JALUR DATA, KEBIJAKAN, DAN DAYA</span><h3 style="font-size:19px;line-height:1.6;font-weight:500">${q.question}</h3><div class="quiz-options">${q.choices.map((text,j)=>`<button data-answer="${j}" data-question="${i}">${String.fromCharCode(65+j)}. ${text}</button>`).join('')}</div><div class="quiz-feedback" id="quiz-feedback" role="status"></div></div>`);
}
function showPlans() {
  showDialog('Denah Anda sebagai acuan',`<p>Arsitektur 3D diolah dari kedua GLB yang Anda berikan. Furnitur diganti dengan aset ringan. Titik perangkat, pembagian VLAN, jalur daya, dan kondisi gangguan ditambahkan untuk pembelajaran.</p><h3>Lantai 1. Layanan dan ruang server</h3><img src="assets/reference/floor-1.png" alt="Denah lantai satu yang diberikan pengguna"><h3>Lantai 2. Perawatan dan ruang operasi</h3><img src="assets/reference/floor-2.png" alt="Denah lantai dua yang diberikan pengguna"><p>Gambar referensi bertuliskan tanpa skala. Panjang di aplikasi adalah unit scene yang bersifat ilustratif dan tidak menjadi dasar perhitungan kabel instalasi nyata.</p>`);
}
function showHelp() {
  showDialog('Panduan eksplorasi',`<p>MediLink adalah simulasi edukasi jaringan dengan dua lantai berdasarkan denah dan model yang Anda berikan. Semua perangkat berjalan di browser tanpa mengakses jaringan rumah sakit.</p><table><thead><tr><th>Kontrol</th><th>Fungsi</th></tr></thead><tbody><tr><td>Orbit 3D</td><td>Seret kiri untuk memutar, seret kanan untuk menggeser, gulir untuk zoom. Pada layar sentuh, satu jari memutar dan dua jari menggeser atau zoom.</td></tr><tr><td>Jelajah</td><td>WASD atau tombol arah untuk bergerak. Seret layar untuk melihat. E memeriksa perangkat terdekat. Esc kembali ke orbit.</td></tr><tr><td>Label dan peta mini</td><td>Klik nama ruangan untuk memusatkan kamera. Klik peta untuk berpindah fokus. Dalam mode jelajah, klik peta memindahkan posisi ke titik bebas terdekat.</td></tr><tr><td>Lantai 1, 2, Gedung</td><td>Berganti lantai atau menampilkan keduanya beserta hubungan fiber antarlantai. Pada mode berjalan, dekati tangga penghubung lalu tekan F untuk naik atau turun melalui bordes yang menyambungkan kedua lantai.</td></tr><tr><td>Lapisan instalasi</td><td>Biru: kabel LAN. Hijau: backbone fiber. Ungu: aktivitas Wi-Fi. Amber: skema daya.</td></tr><tr><td>Misi</td><td>Enam aktivitas berurutan. Progres tersimpan di browser ini. Ekspor progres menghasilkan JSON.</td></tr></tbody></table><h3>Empat mode pengalaman</h3><p><b>Eksplorasi:</b> ikuti distribusi awal dari pusat ke cabang lantai 1 dan lantai 2. <b>Game:</b> selesaikan enam misi dan kumpulkan XP. <b>Instalasi:</b> sambungkan jaringan melalui delapan tahap, lalu uji rute L1/L2. <b>Presentasi:</b> delapan adegan dengan kamera, lapisan jaringan, catatan pembicara, dan kontrol otomatis.</p><p><b>Atap:</b> otomatis terpasang pada tampilan Gedung dan terbuka pada potongan lantai. Gunakan tombol Atap untuk memasang atau membukanya secara manual. Saat berjalan, plafon tetap terlihat pada pengaturan otomatis. <b>Tangga:</b> sayap penghubung di sisi timur menyatukan posisi ruang tangga yang berbeda pada kedua denah. Tekan F di dekat bordes, atau tombol naik/turun pada layar.</p><h3>Model pembelajaran</h3><p>Topologi menggabungkan switch akses dengan core terpusat. VLAN 10, 20, 30, dan 99 adalah contoh. Penolakan VLAN tamu diterapkan oleh kebijakan simulasi, bukan oleh nomor VLAN itu sendiri. Pergerakan titik cahaya menandai paket konseptual. Kecepatan animasi tidak mengukur kecepatan jaringan.</p><p>Router, switch, server, terminal, access point, UPS, panel, tempat tidur, monitor medis, lemari, rak, mesin binatu, dan furnitur dibuat lokal. Lingkaran Wi-Fi tidak menghitung propagasi RF. Durasi UPS dan parameter klinis tidak dimodelkan.</p><h3>Menjalankan dan performa</h3><p>Ekstrak seluruh ZIP. Jalankan peluncur yang sesuai, atau ketik <code>python3 server.py</code>. Alternatif: <code>node server.mjs</code>. Aset dan Three.js sudah disertakan sehingga tidak membutuhkan CDN, npm install, atau internet saat bermain. Jika gerakan terasa berat, pilih grafis Hemat.</p><h3>Referensi teknis</h3>${REFERENCES.map(r=>`<p><a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.name}</a></p>`).join('')}<p class="quality-note">GLB dan gambar dasar berasal dari unggahan pengguna. Aset tambahan memiliki sumber geometri di src/assets.js. Three.js r180 menggunakan lisensi MIT yang disertakan.</p><button data-dialog-action="reset" class="button subtle">Mulai progres baru</button>`);
}
function exportProgress() {
  const result={application:'MediLink Hospital Network Explorer',version:'2.0.0',exportedAt:new Date().toISOString(),scenario:'Educational, simulated network. No patient data.',completedMissions:state.completed.map(id=>MISSIONS.find(m=>m.id===id).name),xp:state.xp,maxXp:1000,visitedDevices:[...state.visited].map(id=>({id,name:DEVICE_MAP.get(id).name})),quizCorrect:state.quiz.length,scenarioState:{mains:state.mains,ups:state.ups,brokenLinks:[...state.broken]},progress:state.serialize(),experience:modes?.exportData()};
  const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='medilink-hasil-eksplorasi.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Catatan eksplorasi diekspor sebagai JSON.');
}
function resetGame() {state=new GameState();world.state=state;if(modes)modes.state=state;world.clearTrace();selected=null;lastResult=null;$('#trace-banner').classList.add('hidden');change(()=>{});setTab('missions');world.setFloor(1);toast('Progres baru dimulai. Enam misi siap dijelajahi kembali.');}
function bindUI() {
  for(const tab of ['missions','devices'])for(const prefix of ['tab-','nav-'])$('#'+prefix+tab).addEventListener('click',()=>setTab(tab));
  $('#nav-plan').addEventListener('click',showPlans);$('#nav-help').addEventListener('click',showHelp);$('#report').addEventListener('click',exportProgress);
  $('#start').addEventListener('click',()=>{$('#welcome').close();modes.setMode(modes.welcomeMode);toast(modes.current==='game'?'Mulai dari misi Kenali pusat jaringan.':'Pilih titik distribusi, tahap instalasi, atau adegan pada panel.');});
  $('#close-info').addEventListener('click',()=>$('#info-dialog').close());
  for(const b of $$('[data-floor]'))b.addEventListener('click',()=>{const floor=b.dataset.floor==='all'?'all':Number(b.dataset.floor);if(world.mode==='walk'&&floor!=='all'&&floor!==world.floor){world.travelStairs();return;}world.setFloor(floor);modes?.updateCaption();});
  $('#orbit').addEventListener('click',()=>{world.home();modes?.updateCaption();});$('#walk').addEventListener('click',()=>{world.setMode('walk');modes?.updateCaption();});$('#top-view').addEventListener('click',()=>{world.topView();modes?.updateCaption();});$('#home-view').addEventListener('click',()=>world.home());
  for(const b of $$('[data-layer]'))b.addEventListener('click',()=>{const key=b.dataset.layer;world.setLayer(key,!world.layers[key]);b.classList.toggle('active',world.layers[key]);});
  $('#speed').addEventListener('change',e=>world.speed=Number(e.target.value));
  $('#pause').addEventListener('click',()=>{world.paused=!world.paused;updatePlayback();});
  $('#toggle-labels').addEventListener('click',()=>document.body.classList.toggle('hide-labels'));$('#quality').addEventListener('change',e=>world.setQuality(e.target.value));
  $('#panel-content').addEventListener('click',e=>{
    const device=e.target.closest('[data-device]');if(device){selectDevice(device.dataset.device);return;}
    const mission=e.target.closest('[data-mission]');if(mission){missionAction(mission.dataset.mission);return;}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='back')setTab('devices');if(action==='missions')setTab('missions');if(action==='devices')setTab('devices');if(action==='trace')traceSelected();if(action==='diagnose')traceSelected(true);
    if(action==='fault'){change(()=>state.startFault());lastResult=null;renderDevice();toast('Kabel terminal ICU diputus pada model. Jalankan diagnosis.');}
    if(action==='repair'){
      let repaired=false;change(()=>{repaired=state.repair(selected);});
      if(repaired){lastResult=traceRoute(selected,'server',state);world.showTrace(lastResult);renderDevice();$('#trace-banner').classList.add('hidden');toast('Kabel ICU tersambung kembali. Jalur ke server aktif.');}
      else toast('Jalankan diagnosis koneksi ICU terlebih dahulu untuk mengenali kabel yang terputus.');
    }
    if(action==='power')showPower();if(action==='export')exportProgress();if(action==='reset')resetGame();
  });
  $('#dialog-body').addEventListener('click',e=>{
    const answer=e.target.closest('[data-answer]');
    if(answer){
      const i=Number(answer.dataset.question),value=Number(answer.dataset.answer);let valid=false;change(()=>{valid=state.answer(i,value);});
      const feedback=$('#quiz-feedback');feedback.classList.toggle('wrong',!valid);
      if(valid){for(const b of $$('.quiz-options button'))b.disabled=true;feedback.innerHTML=`<b>Jawaban sesuai.</b> ${QUIZ[i].explanation}<p><button data-dialog-action="next" class="button primary">${i===QUIZ.length-1?'Lihat hasil':'Pertanyaan selanjutnya'} <span>→</span></button></p>`;}
      else feedback.textContent='Jawaban belum sesuai. Periksa kembali fungsi perangkat dan jalur pada pertanyaan ini, lalu coba lagi.';
    }
    const action=e.target.closest('[data-dialog-action]')?.dataset.dialogAction;
    if(action==='next')showQuiz();if(action==='finish'){$('#info-dialog').close();setTab('missions');}
    if(action==='reset'){$('#info-dialog').close();resetGame();}
  });
}
function updatePlayback() {$('#pause').textContent=world.paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',world.paused?'Lanjutkan animasi':'Jeda animasi');$('#pause').title=world.paused?'Lanjutkan animasi':'Jeda animasi';}
export async function init() {
  let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch{}
  state=new GameState(saved);
  world=new HospitalWorld({
    select:selectDevice,toast,
    roof:mode=>{const label={auto:'otomatis',solid:'terpasang',open:'terbuka'}[mode];$('#roof-toggle').textContent='Atap: '+label;$('#roof-toggle').setAttribute('aria-label','Atap '+label);modes?.updateCaption();},
    floor:floor=>{for(const b of $$('[data-floor]'))b.classList.toggle('active',b.dataset.floor===String(floor));$('#scene-status').textContent=floor==='all'?'Dua lantai · hubungan backbone fiber':`${FLOORS[floor].name} · ${FLOORS[floor].subtitle}`;modes?.updateCaption();},
    progress:value=>{$('#load-bar').style.width=`${20+value*75}%`;$('#load-text').textContent=value<1?'Denah pertama siap. Memuat lantai berikutnya.':'Merakit perangkat, furnitur, dan jalur instalasi.';},
    contextLost:()=>{$('#loading').classList.remove('hidden');$('.loading-card h2').textContent='Konteks grafis terhenti';$('#load-text').textContent='Muat ulang halaman. Jika masalah berulang, gunakan pengaturan grafis Hemat atau aktifkan akselerasi grafis pada browser.';}
  },state);
  bindUI();renderMissions();updateProgress();$('#device-total').textContent=NETWORK.length;await world.load();
  modes=new ExperienceController({world,state,toast,renderMissions,setTab,selectDevice,exportProgress});modes.setMode('explore');
  $('#load-bar').style.width='100%';$('#loading').classList.add('hidden');updatePlayback();
  if(!state.visited.size)$('#welcome').showModal();
  // Deliberately no polling, analytics, internet request, or backend connection.
}
