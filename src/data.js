// Room bounds are registered to the two supplied GLBs, in their world coordinates.
// These are learning scenarios, not a surveyed electrical/network installation.
export const FLOOR_HEIGHT = 3.35;
export const FLOORS = {
  1: {name:'Lantai 1', subtitle:'Layanan & pusat jaringan', bounds:[-13.12,-7.85,13.29,7.96], spawn:[-8.5,-2.9], model:'assets/models/floor-1.glb'},
  2: {name:'Lantai 2', subtitle:'Perawatan & tindakan', bounds:[-11.32,-5.45,11.32,5.46], spawn:[8.8,-.2], model:'assets/models/floor-2.glb'}
};
const room = (id,floor,name,bounds,type='office',net=true) => ({id,floor,name,bounds,type,net,center:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]});
export const ROOMS = [
  room('security',1,'Pos keamanan',[-12.91,-7.64,-9.34,-4.77],'security'),
  room('front-toilet',1,'Toilet depan',[-9.13,-7.64,-7.46,-3.75],'toilet',false),
  room('igd',1,'IGD',[-7.35,-7.64,-3.46,-3.75],'clinical'),
  room('poly',1,'Poliklinik',[-3.35,-7.64,.76,-3.75],'clinical'),
  room('lab',1,'Laboratorium',[.87,-7.64,4.86,-3.75],'lab'),
  room('pharmacy',1,'Farmasi',[4.97,-7.64,8.86,-3.75],'pharmacy'),
  room('server-room',1,'Ruang server',[8.97,-7.64,13.08,-3.75],'server',false),
  room('registration',1,'Pendaftaran',[-9.13,-2.1,-3.46,1.9],'registration'),
  room('rehab',1,'Rehabilitasi medik',[-3.35,-2.1,.63,1.9],'clinical'),
  room('radiology',1,'Radiologi',[.87,-1.94,4.86,1.74],'radiology'),
  room('usg',1,'Ruang USG',[5.1,-2.1,9.82,1.9],'clinical'),
  room('stairs-1',1,'Tangga & lift',[9.93,-2.1,13.08,1.9],'stairs',false),
  room('kitchen',1,'Dapur',[-9.13,3.55,-4.47,7.75],'kitchen'),
  room('laundry',1,'Binatu',[-4.36,3.55,.85,7.75],'laundry'),
  room('storage',1,'Gudang alat medis',[.97,3.55,5.34,7.75],'storage'),
  room('ipsrs',1,'IPSRS',[5.45,3.55,7.86,5.59],'office'),
  room('calibration',1,'Ruang kalibrasi',[5.45,5.71,7.86,7.75],'lab',false),
  room('toilets-1',1,'Toilet pria & wanita',[7.97,3.55,13.08,7.75],'toilet',false),
  room('corridor-n',1,'Koridor utara',[-9.13,-3.64,13.08,-2.21],'corridor',false),
  room('corridor-s',1,'Koridor selatan',[-9.13,2.01,13.08,3.44],'corridor',false),
  room('ward-a',2,'Rawat inap A',[-11.11,-5.24,-7.42,-1.36],'ward'),
  room('ward-b',2,'Rawat inap B',[-7.31,-5.24,-3.64,-1.36],'ward'),
  room('ward-c',2,'Rawat inap C',[-3.53,-5.24,-.1,-1.36],'ward'),
  room('icu',2,'ICU',[.02,-5.24,6.32,-1.36],'icu'),
  room('toilets-2',2,'Toilet lantai 2',[6.44,-5.24,11.1,-1.36],'toilet',false),
  room('operation',2,'Ruang operasi (OK)',[-11.11,.85,-6.78,3.21],'operation'),
  room('changing',2,'Ruang ganti',[-6.67,.85,-3.84,1.98],'changing',false),
  room('ok-1',2,'Ruang OK 1',[-11.11,3.33,-9.01,5.25],'operation',false),
  room('ok-2',2,'Ruang OK 2',[-8.88,3.33,-6.43,5.25],'operation',false),
  room('ok-3',2,'Ruang OK 3',[-6.3,3.33,-3.84,5.25],'operation',false),
  room('management',2,'Manajemen',[-3.72,.85,-.11,5.25],'office'),
  room('doctors',2,'Ruang dokter',[.02,.85,3.72,5.25],'office'),
  room('nurse',2,'Nurse station',[3.84,.85,7.77,5.25],'nurse'),
  room('stairs-2',2,'Tangga & akses L1',[7.89,.85,11.1,5.25],'stairs',false),
  room('corridor-2',2,'Koridor lantai 2',[-11.11,-1.24,11.1,.74],'corridor',false)
];
export const COLORS = {copper:0x366bff, fiber:0x10bcae, wifi:0x9d71e8, power:0xe0a136};
export const NETWORK = [
  {id:'server',name:'Server layanan rumah sakit',kind:'server',floor:1,x:12.25,z:-6.8,y:0,room:'server-room',vlan:10,protected:true},
  {id:'core',name:'Core switch',kind:'switch',floor:1,x:10.9,z:-6.7,y:.9,room:'server-room',vlan:99,protected:true},
  {id:'firewall',name:'Router & firewall',kind:'router',floor:1,x:10,z:-6.7,y:.9,room:'server-room',vlan:99,protected:true},
  {id:'sw-north',name:'Switch akses lantai 1',kind:'switch',floor:1,x:10.9,z:-5.6,y:.9,room:'server-room',vlan:99,protected:true},
  {id:'sw-south',name:'Switch akses layanan penunjang',kind:'switch',floor:1,x:6.65,z:4.1,y:.9,room:'ipsrs',vlan:99,protected:false},
  {id:'sw-l2',name:'Switch distribusi lantai 2',kind:'rack',floor:2,x:7.02,z:4.5,y:0,room:'nurse',vlan:99,protected:true},
  {id:'ups-1',name:'UPS pusat jaringan',kind:'ups',floor:1,x:12.3,z:-4.5,y:0,room:'server-room',network:false,protected:true},
  {id:'ups-2',name:'UPS nurse station',kind:'ups',floor:2,x:7.05,z:3.35,y:0,room:'nurse',network:false,protected:true},
  {id:'panel-1',name:'Panel distribusi listrik L1',kind:'panel',floor:1,x:12.88,z:-5.3,y:1.1,room:'server-room',network:false},
  {id:'panel-2',name:'Panel distribusi listrik L2',kind:'panel',floor:2,x:7.46,z:2.05,y:1.1,room:'nurse',network:false}
];
const lower = new Set(['registration','rehab','radiology','usg','kitchen','laundry','storage','ipsrs']);
for (const r of ROOMS.filter(r=>r.net)) {
  let x = r.center[0]+.35, z = r.center[1]+.55;
  if(r.id==='ipsrs') {x=5.96;z=4.93;}
  if(r.id==='nurse') {x=4.8;z=3.3;}
  const clinical = ['ward','icu','clinical','lab','radiology','operation','nurse'].includes(r.type);
  const vlan = clinical ? 10 : 20;
  const sw = r.floor===2 ? 'sw-l2' : lower.has(r.id) ? 'sw-south' : 'sw-north';
  NETWORK.push({id:`pc-${r.id}`, name:`Terminal ${r.name}`, kind:'pc', floor:r.floor,x,z,y:0,room:r.id,vlan,sw,protected:r.id==='nurse'});
  NETWORK.push({id:`ap-${r.id}`, name:`Access point ${r.name}`, kind:'ap', floor:r.floor,x:r.center[0]-.55,z:r.center[1]-.45,y:2.35,room:r.id,vlan:10,sw,protected:r.id==='nurse'});
}
NETWORK.push({id:'guest',name:'Tablet pengunjung',kind:'tablet',floor:1,x:-7.6,z:1.05,y:.85,room:'registration',vlan:30,sw:'ap-registration',protected:false});
export const DEVICE_MAP = new Map(NETWORK.map(n=>[n.id,n]));
export const roomById = id=>ROOMS.find(r=>r.id===id);
export const elevation = floor=>(floor-1)*FLOOR_HEIGHT;
export const devicePoint = n=>[n.x,elevation(n.floor)+n.y+(n.kind==='pc'?.98:n.kind==='server'?1.3:n.kind==='rack'?1.4:.18),n.z];
export const LESSONS = {
  server:{title:'Pusat layanan digital',text:'Server menyediakan aplikasi dan penyimpanan yang diakses terminal. Dalam skenario ini, terminal klinis mengirim permintaan layanan melalui switch akses menuju server.',concept:'Layanan terpusat',detail:'Rak ini memuat server simulasi. Tidak ada data pasien, koneksi rumah sakit nyata, atau akses ke perangkat fisik.'},
  switch:{title:'Menghubungkan perangkat LAN',text:'Switch meneruskan frame Ethernet di jaringan lokal. Switch akses menghubungkan terminal dan access point; core mengagregasi jalur dari beberapa area.',concept:'Access & collapsed core',detail:'Port, kecepatan, dan VLAN pada pengalaman ini merupakan parameter pembelajaran yang disederhanakan.'},
  rack:{title:'Distribusi antarlantai',text:'Rak distribusi lantai 2 menerima uplink fiber dari pusat jaringan, lalu mendistribusikan koneksi melalui kabel tembaga ke terminal dan access point.',concept:'Backbone fiber',detail:'Jalur hijau menandai backbone. Posisi kabel mengikuti model pembelajaran, bukan hasil survei instalasi.'},
  router:{title:'Batas dan kebijakan jaringan',text:'Router menghubungkan jaringan yang berbeda. Firewall menerapkan aturan akses. Memisahkan VLAN perlu disertai aturan routing atau firewall agar pembatasan layanan berlaku.',concept:'Segmentasi & kontrol akses',detail:'VLAN 10 untuk klinis, 20 untuk administrasi, 30 untuk tamu, dan 99 untuk manajemen adalah contoh konfigurasi simulasi.'},
  pc:{title:'Dari terminal ke layanan',text:'Terminal terhubung ke switch akses melalui kabel tembaga. Paket menuju server melewati jalur fisik yang aktif dan kebijakan akses yang mengizinkan komunikasi.',concept:'Endpoint & jalur data',detail:'Pilih Telusuri paket untuk melihat jalur. Jika kabel terminal putus, paket tidak dapat mencapai switch meskipun perangkat lain tetap aktif.'},
  ap:{title:'Wi-Fi tetap membutuhkan uplink',text:'Access point menjembatani klien nirkabel ke jaringan kabel. Lingkaran ungu menunjukkan aktivitas radio secara konseptual, bukan hasil pengukuran cakupan sinyal.',concept:'Wireless LAN',detail:'Uplink access point menuju switch divisualisasikan sebagai kabel Ethernet. Sebagian perangkat nyata dapat memperoleh daya melalui PoE; mekanisme PoE tidak dihitung pada simulasi ini.'},
  tablet:{title:'Akses pengunjung',text:'Tablet ini berada pada VLAN tamu. Kebijakan simulasi menolak akses dari VLAN 30 ke server internal, sementara koneksi fisik ke access point tetap dapat aktif.',concept:'Koneksi fisik & izin akses',detail:'Penolakan akses yang benar tidak berarti kabel atau Wi-Fi rusak. Periksa kebijakan sebelum menyimpulkan gangguan fisik.'},
  ups:{title:'Daya cadangan terpilih',text:'UPS mempertahankan daya pada perangkat yang terhubung ke sirkuit cadangannya ketika suplai utama hilang. Dalam skenario ini, server, core, dan distribusi lantai 2 mendapat cadangan.',concept:'Kontinuitas daya',detail:'Baterai ditampilkan sebagai status siap atau tidak siap. Durasi cadangan, beban listrik, selektivitas proteksi, dan kapasitas tidak dimodelkan.'},
  panel:{title:'Pisahkan jalur daya dan data',text:'Panel mendistribusikan daya menuju beban. Jalur amber adalah skema edukasi, sedangkan biru dan hijau menandai komunikasi data. Kedua fungsi perlu dikenali saat memeriksa gangguan.',concept:'Infrastruktur pendukung',detail:'Model tidak menyediakan ukuran konduktor, metode proteksi, pembumian, atau petunjuk pekerjaan listrik. Detail tersebut memerlukan perancangan teknis tersendiri.'}
};
export const MISSIONS = [
  {id:'core',name:'Kenali pusat jaringan',zone:'Ruang server · Lantai 1',text:'Temukan rak server dan periksa core switch. Pelajari bagaimana pusat jaringan menghubungkan area layanan.',target:'core',action:'Temukan core switch',xp:100},
  {id:'trace',name:'Ikuti perjalanan paket',zone:'IGD · Lantai 1',text:'Buka terminal IGD, lalu telusuri paket ke server. Amati terminal, switch akses, dan core pada jalurnya.',target:'pc-igd',action:'Buka terminal IGD',xp:150},
  {id:'repair',name:'Pulihkan koneksi ICU',zone:'ICU · Lantai 2',text:'Aktifkan skenario kabel putus. Jalankan diagnosis terminal ICU, lalu sambungkan ulang kabel yang bermasalah.',target:'pc-icu',action:'Mulai skenario gangguan',xp:200},
  {id:'vlan',name:'Uji akses pengunjung',zone:'Pendaftaran · Lantai 1',text:'Uji tablet pengunjung menuju server. Hasil yang benar adalah akses ditolak oleh kebijakan VLAN tamu.',target:'guest',action:'Uji tablet pengunjung',xp:150},
  {id:'power',name:'Jaga layanan saat daya padam',zone:'Ruang server · Lantai 1',text:'Uji pemadaman suplai utama dengan UPS aktif. Perhatikan perangkat dengan daya cadangan dan beban yang padam.',target:'ups-1',action:'Buka uji daya',xp:200},
  {id:'quiz',name:'Tuntaskan evaluasi',zone:'Evaluasi pemahaman',text:'Jawab tiga pertanyaan tentang jalur data, segmentasi, dan kontinuitas daya. Anda dapat memperbaiki jawaban yang keliru.',target:null,action:'Mulai evaluasi',xp:200}
];
export const QUIZ = [
  {question:'Urutan mana yang sesuai untuk terminal IGD menuju server pada model ini?',choices:['Terminal, switch akses, core, server','Terminal, panel listrik, server','Terminal, UPS, access point, server'],answer:0,explanation:'Switch akses menghubungkan terminal ke core. Core meneruskan komunikasi menuju server pada jalur model ini.'},
  {question:'Tablet tamu tersambung ke Wi-Fi, tetapi ditolak mengakses server internal. Apa penjelasan yang sesuai?',choices:['Semua kabel pasti putus','Kebijakan akses memblokir VLAN tamu','UPS mengubah alamat IP perangkat'],answer:1,explanation:'Koneksi fisik aktif tidak otomatis memberikan izin layanan. Kebijakan ACL/firewall simulasi menolak VLAN tamu ke server internal.'},
  {question:'Apa yang terjadi saat suplai utama padam pada skenario dengan UPS siap?',choices:['Seluruh rumah sakit pasti tetap menyala','Semua perangkat memperoleh internet tanpa kabel','Perangkat di sirkuit UPS tetap mendapat daya cadangan'],answer:2,explanation:'UPS melindungi beban yang terhubung ke sirkuitnya. Model ini tidak menghitung kapasitas atau lama cadangan.'}
];
export const REFERENCES = [
  {name:'Three.js. Installation & local development',url:'https://threejs.org/manual/pages/installation.html'},
  {name:'Three.js. GLTFLoader',url:'https://threejs.org/docs/pages/GLTFLoader'},
  {name:'Cisco. Campus LAN and Wireless LAN Solution Design Guide',url:'https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html'},
  {name:'Cisco. Catalyst 3650 Switch Hardware Installation Guide',url:'https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3650/hardware/installation/guide/Cat3650hig_book/HIGINSTL.html'},
  {name:'Cisco. VLAN Access Control Lists',url:'https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960x/software/15_2_6_e/configuration_guide/b_1526e_consolidated_2960x_cg/m_sec_vlan_maps_cg_cauvery.html'},
  {name:'APC. UPS Buying Guide',url:'https://www.apc.com/us/en/support/product-support/ups-buying-guide-for-selecting-a-battery-backup-system.jsp'}
];
