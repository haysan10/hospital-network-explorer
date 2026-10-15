import {FLOOR_HEIGHT,DEVICE_MAP} from './data.js';
import {EDGES,traceRoute,pointOnPath,pathLength} from './engine.js';

// Both landings remain inside the supplied stair rooms. The added east stair
// wing joins their different positions without shifting either original plan.
export const STAIR_LANDINGS={1:[11.7,.6],2:[9.5,2.3]};
export const STAIR_PATH=[
  [11.7,0,.6],[14.3,0,.6],[14.3,0,-.4],
  [14.3,FLOOR_HEIGHT/2,4.2],[16,FLOOR_HEIGHT/2,4.2],
  [16,FLOOR_HEIGHT,-.4],[16,FLOOR_HEIGHT,2.3],[9.5,FLOOR_HEIGHT,2.3]
];
export function stairPosition(from,t){return pointOnPath(from===1?STAIR_PATH:[...STAIR_PATH].reverse(),t);}
export const STAIR_DISTANCE=pathLength(STAIR_PATH);
export function nearStairs(floor,point){const p=STAIR_LANDINGS[floor];return !!p&&Math.hypot(point[0]-p[0],point[1]-p[1])<1.65;}

export const DISTRIBUTION_STEPS=[
  {id:'origin',title:'Mulai dari pusat layanan',tag:'SUMBER LAYANAN · LANTAI 1',target:'server',floor:1,text:'Server berada di ruang server lantai 1. Core switch mengumpulkan jalur jaringan dan menghubungkan perangkat ke layanan ini.',tip:'Perhatikan server, core switch, router/firewall, dan UPS sebagai perangkat dengan fungsi berbeda.',route:['server','core']},
  {id:'access-1',title:'Distribusi layanan lantai 1',tag:'CORE → SWITCH AKSES',target:'sw-north',floor:1,text:'Dari core, backbone fiber menuju switch akses lantai 1. Kabel LAN kemudian melayani IGD, poliklinik, laboratorium, farmasi, dan pos keamanan.',tip:'Klik terminal IGD untuk mengikuti perjalanan paket kembali ke server.',route:['server','pc-igd']},
  {id:'support',title:'Cabang layanan penunjang',tag:'CORE → SWITCH PENUNJANG',target:'sw-south',floor:1,text:'Cabang fiber kedua menuju switch layanan penunjang di IPSRS. Dari sini LAN didistribusikan ke pendaftaran, rehabilitasi, radiologi, USG, dapur, binatu, dan gudang.',tip:'Cabang ini berbagi core yang sama, tetapi memiliki switch akses sendiri.',route:['server','pc-radiology']},
  {id:'riser',title:'Backbone naik ke lantai 2',tag:'FIBER VERTIKAL · RISER',target:'sw-l2',floor:'all',text:'Fiber dari core lantai 1 naik melalui riser di sisi timur, lalu mencapai rak distribusi lantai 2 di nurse station. Jalurnya mengikuti graf koneksi awal.',tip:'Jalur hijau menghubungkan lantai secara fisik; tangga penghubung menjadi akses orang antarlantai.',route:['core','sw-l2']},
  {id:'access-2',title:'Sebarkan ke area perawatan',tag:'DISTRIBUSI L2 → TERMINAL',target:'pc-icu',floor:2,text:'Rak lantai 2 mendistribusikan LAN ke rawat inap A, B, C, ICU, ruang operasi, manajemen, ruang dokter, dan nurse station.',tip:'Paket ICU menuju server harus melewati switch lantai 2 dan backbone fiber ke core lantai 1.',route:['sw-l2','pc-icu']},
  {id:'wireless',title:'Access point dan klien tamu',tag:'LAN → AP → WI-FI',target:'ap-registration',floor:1,text:'Access point menggunakan uplink LAN. Tablet tamu tersambung melalui Wi-Fi ke AP pendaftaran. Kebijakan VLAN 30 menolak aksesnya ke server internal.',tip:'Jalur fisik yang tersambung dan izin mengakses layanan merupakan dua pemeriksaan yang berbeda.',route:['guest','ap-registration'],wifi:true}
];

export const INSTALL_STEPS=[
  {id:'survey',title:'Survei jalur & lokasi',target:'server',floor:1,description:'Mulai dari ruang server. Tetapkan lokasi pusat jaringan dan jalur backbone sebelum menyambungkan perangkat.',choices:['Gunakan ruang server L1 dan riser menuju nurse station L2','Hubungkan semua terminal langsung melalui Wi-Fi tamu','Tempatkan core di setiap tempat tidur'],answer:0,explanation:'Ruang server menjadi pusat. Cabang akses dan backbone antarlantai mengikuti distribusi jaringan yang sudah ada.',links:[]},
  {id:'core',title:'Siapkan pusat jaringan',target:'core',floor:1,description:'Sambungkan server dan router/firewall ke core switch. Panel daya dan UPS ditampilkan sebagai pendukung layanan.',choices:['Hubungkan server ke panel sebagai jalur data','Hubungkan server dan router/firewall ke core','Hubungkan server langsung ke tablet tamu'],answer:1,explanation:'Server dan router/firewall terhubung ke core. Daya UPS tidak menggantikan koneksi Ethernet.',links:['link-server','link-firewall']},
  {id:'branches',title:'Pasang cabang lantai 1',target:'sw-south',floor:1,description:'Hubungkan core ke switch akses lantai 1 dan switch layanan penunjang menggunakan backbone fiber pada model.',choices:['Sambungkan switch akses satu sama lain tanpa core','Gunakan kabel daya sebagai uplink','Tarik dua cabang fiber dari core ke kedua switch akses'],answer:2,explanation:'Kedua switch mempunyai uplink sendiri menuju core, sehingga distribusi tetap sesuai graf awal.',links:['link-core-sw-north','link-core-sw-south']},
  {id:'backbone',title:'Sambungkan backbone L1–L2',target:'sw-l2',floor:'all',description:'Tarik fiber dari core lantai 1 melalui riser ke rak distribusi nurse station lantai 2.',choices:['Core L1 → riser fiber → distribusi L2','Panel L1 → Wi-Fi tamu → distribusi L2','Terminal ICU → UPS → server'],answer:0,explanation:'Backbone antarlantai merupakan satu link fiber. Tangga dan jalur data memiliki fungsi berbeda.',links:['link-core-sw-l2']},
  {id:'endpoints',title:'Distribusikan kabel LAN',target:'pc-icu',floor:2,description:'Sambungkan terminal dan access point ke switch area masing-masing. Setiap endpoint mengikuti penugasan switch awal.',choices:['Sambungkan seluruh endpoint ke AP tamu','Terminal dan AP → switch area → core','Terminal → panel listrik → server'],answer:1,explanation:'Endpoint di L2 menuju sw-l2; endpoint L1 menuju sw-north atau sw-south sesuai area.',links:EDGES.filter(e=>e.type==='copper'&&DEVICE_MAP.get(e.a).sw).map(e=>e.id)},
  {id:'wifi',title:'Aktifkan akses nirkabel',target:'ap-registration',floor:1,description:'Tambahkan link Wi-Fi tablet pengunjung ke AP pendaftaran yang sudah memiliki uplink LAN.',choices:['Wi-Fi tidak memerlukan access point','Tablet langsung tersambung ke fiber antarlantai','Tablet → AP pendaftaran → switch penunjang'],answer:2,explanation:'Klien nirkabel tetap memakai jaringan kabel di sisi uplink AP.',links:['link-guest']},
  {id:'policy',title:'Periksa pemisahan akses',target:'firewall',floor:1,description:'Terapkan contoh kebijakan layanan: VLAN klinis 10, administrasi 20, tamu 30, dan manajemen 99.',choices:['Tolak VLAN tamu menuju server internal melalui kebijakan','Nomor VLAN otomatis menjamin seluruh keamanan','Izinkan semua pengunjung mengakses server internal'],answer:0,explanation:'Nomor VLAN saja tidak menegakkan izin. Simulator menggunakan kebijakan akses untuk memblokir tamu ke server internal.',links:[]},
  {id:'verify',title:'Uji koneksi dua lantai',target:'pc-icu',floor:'all',description:'Uji terminal IGD, radiologi, dan ICU menuju server; lalu pastikan tablet tamu ditolak oleh kebijakan.',choices:['Cukup lihat lampu AP menyala','Uji rute layanan L1/L2 dan penolakan tamu','Matikan core agar semua endpoint mandiri'],answer:1,explanation:'Uji akhir memeriksa jalur aktif dari kedua lantai serta hasil kebijakan tamu.',links:[]}
];
export class InstallationSession {
  constructor(saved={}){
    this.completed=[];
    if(Array.isArray(saved.completed))for(let i=0;i<INSTALL_STEPS.length;i++){if(saved.completed[i]!==INSTALL_STEPS[i].id)break;this.completed.push(INSTALL_STEPS[i].id);}
  }
  get index(){return this.completed.length;}
  get done(){return this.index===INSTALL_STEPS.length;}
  get links(){return new Set(INSTALL_STEPS.slice(0,this.index).flatMap(s=>s.links));}
  choose(index,choice){
    if(index!==this.index||!INSTALL_STEPS[index])return {ok:false,message:'Selesaikan tahap sebelumnya terlebih dahulu.'};
    const step=INSTALL_STEPS[index];
    if(choice!==step.answer)return {ok:false,message:'Belum sesuai. Periksa fungsi perangkat dan jalur yang diminta, lalu coba lagi.'};
    if(step.id==='verify'&&!this.verify().ok)return {ok:false,message:'Instalasi belum membentuk jalur lengkap. Periksa tahap penyambungan.'};
    this.completed.push(step.id);return {ok:true,message:step.explanation};
  }
  verify(){
    const state={mains:true,ups:true,broken:new Set()},edges=EDGES.filter(e=>this.links.has(e.id));
    const results=['pc-igd','pc-radiology','pc-icu'].map(id=>({id,...traceRoute(id,'server',state,{edges})}));
    const guest=traceRoute('guest','server',state,{edges});
    return {ok:results.every(r=>r.ok)&&guest.reason==='policy',results,guest};
  }
  serialize(){return {version:1,completed:[...this.completed]};}
}
export const PRESENTATION_SLIDES=[
  {title:'Satu gedung. Satu jaringan.',eyebrow:'01 / GAMBARAN UTUH',floor:'all',roof:'solid',text:'Dua lantai rumah sakit terhubung oleh akses tangga dan backbone jaringan. Atap melindungi bangunan; mode potongan membuka detail di dalamnya.',points:['Lantai 1: layanan dan pusat jaringan','Lantai 2: perawatan dan tindakan','Sayap tangga menghubungkan kedua denah'],note:'Mulai dari konteks gedung, lalu buka lapisan jaringan secara bertahap.'},
  {title:'Semua berawal dari pusat layanan.',eyebrow:'02 / RUANG SERVER',floor:1,roof:'open',target:'core',text:'Server menyediakan layanan. Core mengagregasi jaringan. Router/firewall menerapkan batas dan kebijakan akses.',points:['Server → core switch','Dua cabang akses di lantai 1','Satu backbone ke lantai 2'],route:['server','core'],note:'Bedakan fungsi perangkat, kemudian tunjukkan tiga cabang dari core.'},
  {title:'Jaringan mengikuti area layanan.',eyebrow:'03 / DISTRIBUSI LANTAI 1',floor:1,roof:'open',target:'sw-south',text:'Switch akses menghubungkan terminal dan AP pada area masing-masing. Cabang layanan utama dan penunjang kembali ke core.',points:['IGD, poliklinik, laboratorium, farmasi','Pendaftaran, radiologi, dan layanan penunjang','Kabel LAN biru; backbone fiber hijau'],route:['server','pc-radiology'],note:'Ikuti satu rute lengkap sebelum beralih ke cabang lain.'},
  {title:'Fiber menghubungkan dua lantai.',eyebrow:'04 / BACKBONE ANTARLANTAI',floor:'all',roof:'open',text:'Uplink core menuju sw-l2 melewati riser vertikal. Rak nurse station mendistribusikan kembali koneksi di lantai 2.',points:['Core L1 → riser → distribusi L2','Jalur kabel kontinu pada elevasi bangunan','Tangga menyediakan akses orang antarlantai'],route:['core','sw-l2'],note:'Tunjukkan segmen vertikal hijau dan posisi tangga di sisi timur.'},
  {title:'Layanan perawatan tetap terhubung.',eyebrow:'05 / DISTRIBUSI LANTAI 2',floor:2,roof:'open',target:'pc-icu',text:'Terminal ICU dan area perawatan menggunakan switch lantai 2 sebelum melewati backbone ke server lantai 1.',points:['Rawat inap A, B, C dan ICU','Ruang operasi, dokter, manajemen, nurse station','Uji koneksi mencakup seluruh jalur upstream'],route:['sw-l2','pc-icu'],note:'Perlihatkan urutan endpoint, distribusi L2, core L1, dan server.'},
  {title:'Tersambung belum berarti diizinkan.',eyebrow:'06 / WI-FI DAN KEBIJAKAN',floor:1,roof:'open',target:'guest',wifi:true,text:'Tablet tamu tersambung ke AP pendaftaran. Kebijakan menolak akses VLAN 30 ke server internal.',points:['Wi-Fi tetap memerlukan uplink LAN','Klinis 10 · Administrasi 20 · Tamu 30 · Manajemen 99','Pisahkan diagnosis fisik dari izin layanan'],route:['guest','ap-registration'],note:'Penolakan tamu adalah hasil yang diharapkan pada model ini.'},
  {title:'Data membutuhkan daya.',eyebrow:'07 / KONTINUITAS LAYANAN',floor:1,roof:'open',target:'ups-1',power:true,text:'UPS memasok perangkat yang terhubung ke sirkuit cadangan. Endpoint tanpa suplai tetap tidak dapat berkomunikasi.',points:['Panel dan UPS mempunyai peran berbeda','Jalur amber menunjukkan skema daya','Kapasitas dan durasi baterai tidak dihitung'],note:'Gunakan mode game untuk mendemonstrasikan pemadaman dan pemulihan.'},
  {title:'Jelajahi. Pasang. Uji.',eyebrow:'08 / LANJUTKAN EKSPLORASI',floor:'all',roof:'open',text:'Pahami jalur awal dari pusat ke distribusi, lanjutkan latihan instalasi, kemudian uji koneksi dan skenario gangguan.',points:['Eksplorasi: ikuti distribusi awal','Instalasi: delapan tahap penyambungan','Game: enam misi dan diagnosis'],route:['server','pc-icu'],note:'Akhiri presentasi dan pilih mode sesuai tujuan belajar berikutnya.'}
];
