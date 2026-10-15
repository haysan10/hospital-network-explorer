# MediLink. Hospital Network Explorer 2.0

Aplikasi edukasi 3D dengan empat mode untuk menjelajahi instalasi jaringan rumah sakit berdasarkan dua denah dan dua model GLB yang diberikan. Bahasa antarmuka: Indonesia. Seluruh kode, dependensi, aset, dan gambar referensi tersedia di paket ini. Tidak ada proses build, npm install, akun, API key, atau CDN yang diperlukan saat menjalankan.

## Mulai dalam tiga langkah

1. Ekstrak seluruh ZIP ke satu folder. Jangan menjalankan dari dalam jendela ZIP.
2. Buka folder `hospital-network-explorer`, lalu jalankan peluncur yang sesuai: `MULAI-MAC.command`, `MULAI-WINDOWS.bat`, atau `mulai-linux.sh`.
3. Browser membuka `http://127.0.0.1:8080/`. Jika port tersebut dipakai, peluncur memilih port berikutnya dan menampilkan alamat yang benar. Biarkan terminal tetap terbuka selama bermain.

Komputer perlu memiliki **Python 3.8 atau lebih baru, atau Node.js 18 atau lebih baru**. Cukup salah satunya. Server hanya menggunakan pustaka bawaan. Browser perlu mendukung WebGL 2 dan JavaScript modules. Gunakan browser desktop dengan akselerasi grafis aktif. Performa aktual bergantung pada GPU, browser, resolusi layar, dan pengaturan grafis.

Jika klik ganda peluncur tidak diizinkan, buka Terminal di folder proyek dan jalankan:

```sh
python3 server.py
```

Alternatif dengan Node.js:

```sh
node server.mjs
```

Pada Windows dengan Python Launcher:

```bat
py -3 server.py
```

Pada macOS, jika berkas `.command` tidak memiliki izin eksekusi, jalankan perintah berikut dari folder proyek:

```sh
chmod +x MULAI-MAC.command
./MULAI-MAC.command
```

Jangan membuka `index.html` langsung melalui `file://`. Module JavaScript dan pemuatan GLB memerlukan server HTTP lokal. Setelah semua berkas diekstrak, game dapat dimainkan tanpa internet. Referensi teknis hanya membutuhkan internet jika tautannya dibuka sendiri.

## Pembaruan versi 2.0

- **Atap nyata dan plafon:** atap pelana pada lantai atas, atap sayap lantai 1, penutup sayap tangga, lis, dan detail sambungan. Pada tampilan Gedung, atap terpasang otomatis. Pilih lantai untuk melihat potongan atau gunakan tombol Atap untuk mengganti otomatis, terpasang, dan terbuka. Saat berjalan pada pengaturan otomatis, plafon terlihat.
- **Lantai terhubung:** elevasi lantai diselaraskan menjadi 3,35 unit scene. Karena ruang tangga pada dua denah tidak segaris, sayap tangga tambahan di sisi timur menghubungkan kedua bordes. Pintu pada dinding model asli benar-benar dibuka, dan kamera mengikuti jalur kontinu saat naik/turun. Denah dan posisi perangkat awal dipertahankan.
- **Empat mode:** Eksplorasi mengikuti distribusi jaringan awal; Game mempertahankan enam misi; Instalasi menyambungkan 48 link melalui delapan tahap; Presentasi menyediakan delapan adegan, catatan pembicara, kontrol keyboard, putar otomatis, dan layar penuh jika browser mengizinkan.
- **Material dan detail:** tekstur prosedural PBR untuk kayu, kain, linen, logam, lantai, dan atap. UV dipertahankan saat batching. Ditambahkan bantalan membulat, jahitan kasur, sandaran tangan dan roda kursi, tombol keyboard, grafik monitor, port, ventilasi, kabel patch rak, kusen, dan fasia.
- **Perbaikan diagnosis:** penolakan kebijakan tamu baru ditampilkan setelah jalur fisik yang aktif ditemukan. Tablet tanpa uplink atau daya dilaporkan sebagai gangguan fisik/daya.

### Pilih mode dan ikuti alurnya

| Mode | Alur utama | Hasil |
| --- | --- | --- |
| Eksplorasi | Gedung utuh → pusat server → cabang akses L1 → penunjang L1 → riser fiber → distribusi L2 → AP/tamu | Memahami distribusi sesuai 53 perangkat dan 48 link awal |
| Game | Kenali core → telusuri IGD → pulihkan ICU → uji tamu → uji UPS → evaluasi | Maksimum 1000 XP, progres game tetap kompatibel dengan versi 1 |
| Instalasi | Survei → pusat jaringan → cabang L1 → fiber L2 → LAN endpoint → Wi-Fi → kebijakan → pengujian | Kabel tampil setelah pekerjaan yang benar; hasil uji IGD, radiologi, ICU, dan tamu |
| Presentasi | Gedung → server → distribusi L1 → backbone → distribusi L2 → kebijakan → daya → penutup | Adegan 3D dan materi penjelasan yang dapat dinavigasi |

Latihan instalasi dan progres game disimpan terpisah. Berganti mode mengembalikan kondisi daya dan gangguan ke baseline aktif tanpa menghapus XP atau tahap instalasi. Ekspor progres mencakup keduanya. Tampilan instalasi menggunakan subset graf yang sama, sehingga kabel yang belum dipasang tidak dihitung sebagai koneksi aktif.

### Menggunakan tangga penghubung

1. Dalam mode Eksplorasi, pilih **Menuju tangga**. Anda ditempatkan di bordes lantai yang sedang aktif dan masuk ke mode berjalan.
2. Tekan **F** atau tombol naik/turun yang muncul di layar. Kamera mengikuti jembatan bordes dan dua lintasan tangga sampai ke lantai tujuan.
3. Setelah tiba, lanjutkan berjalan dengan WASD atau tombol arah. Turun menggunakan F di bordes lantai 2.

Anda juga dapat berjalan sendiri ke ruang tangga. Dalam mode berjalan, memilih tombol lantai lain hanya memulai perjalanan jika Anda berada dekat tangga. Tampilan orbit tetap menyediakan pemilihan lantai langsung untuk inspeksi model. Perjalanan antarlantai merupakan navigasi terpandu, bukan simulasi fisika langkah per anak tangga.

### Kontrol presentasi

Gunakan tombol sebelumnya/selanjutnya atau tombol panah kiri/kanan. Spasi memulai atau menjeda pergantian otomatis tiap 10 detik. Esc mengakhiri presentasi. Tombol layar penuh memerlukan dukungan dan izin browser. Perpindahan otomatis berhenti saat tab tersembunyi atau dialog terbuka. Mode otomatis tidak dimulai tanpa tindakan pengguna.

## Apa yang tersedia

| Komponen | Implementasi |
| --- | --- |
| Dua lantai rumah sakit | Arsitektur GLB pengguna, atap/plafon, sayap tangga kontinu, label mengikuti denah |
| Eksplorasi 3D | Orbit, tampak atas, zoom, mode berjalan, peta mini, perpindahan lantai |
| Interaksi | Klik perangkat, inspeksi dengan E, daftar perangkat yang dapat dicari |
| Jalur LAN dan fiber | Kabel 3D, titik paket bergerak, penelusuran rute berdasarkan graf koneksi |
| Wi-Fi | Model access point dan lingkaran aktivitas radio konseptual |
| Listrik | Panel, UPS, jalur daya terpisah, status perangkat mengikuti skenario suplai |
| Furnitur | Tempat tidur, monitor medis, meja dan komputer, kursi, lemari, rak, binatu, tangga, tanaman, pemindai radiologi sederhana |
| Pembelajaran | Enam misi, delapan tahap instalasi, delapan adegan presentasi, tiga pertanyaan evaluasi |
| Penyimpanan | LocalStorage untuk progres, ekspor JSON untuk catatan pembelajaran |
| Aset reusable | 27 GLB tambahan, dua GLB arsitektur, dan sumber generator geometri |

Paket berisi 35 zona berlabel, 53 perangkat edukasi, dan 48 koneksi data. Sebagian zona merupakan koridor atau fasilitas pendukung. Perangkat yang diperiksa dicatat sebagai aktivitas eksplorasi.

## Kontrol

| Tindakan | Kontrol |
| --- | --- |
| Putar kamera orbit | Seret tombol kiri mouse |
| Geser kamera orbit | Seret tombol kanan mouse |
| Mendekat atau menjauh | Gulir mouse atau pinch dua jari |
| Berjalan | Tombol WASD atau tombol arah |
| Melihat saat berjalan | Seret layar |
| Memeriksa perangkat terdekat | E atau klik perangkat dalam jangkauan |
| Keluar dari mode berjalan | Esc atau tombol Orbit 3D |
| Pindah fokus atau posisi | Klik peta mini. Pada mode berjalan, titik diperiksa terhadap penghalang |
| Berganti lantai | Orbit: tombol 01/02. Berjalan: F atau tombol naik/turun di dekat bordes tangga |
| Mengatur atap | Tombol Atap: otomatis, terpasang, terbuka |
| Memilih pengalaman | Eksplorasi, Game, Instalasi, Presentasi di bagian atas |
| Lihat backbone antarlantai | Tombol Gedung |
| Tampilkan lapisan | LAN, Fiber, Wi-Fi, Daya |
| Jeda atau ubah kecepatan | Kontrol aliran data di kanan bawah |

Pada perangkat sentuh, tersedia tombol arah saat mode jelajah. Daftar perangkat juga dapat dioperasikan dengan keyboard tanpa memilih objek kecil pada kanvas. Jika preferensi perangkat meminta pengurangan animasi, aliran data dimulai dalam keadaan jeda dan dapat diaktifkan melalui tombol putar.

## Alur keenam misi

| Misi | Cara menyelesaikan | XP |
| --- | --- | --- |
| Kenali pusat jaringan | Periksa core switch atau rak server di lantai 1 | 100 |
| Ikuti perjalanan paket | Buka terminal IGD dan pilih Telusuri paket | 150 |
| Pulihkan koneksi ICU | Mulai skenario gangguan, diagnosis terminal ICU, sambungkan ulang kabel | 200 |
| Uji akses pengunjung | Uji tablet pengunjung menuju server. Hasil sesuai adalah akses ditolak kebijakan | 150 |
| Jaga layanan saat daya padam | Buka uji daya, biarkan UPS siap, simulasikan pemadaman suplai utama | 200 |
| Tuntaskan evaluasi | Jawab tiga pertanyaan dengan tepat. Jawaban keliru dapat diperbaiki | 200 |

Aktivitas tidak menggandakan XP jika diulang. Misi ditampilkan berurutan. Anda dapat memeriksa perangkat lain di luar misi aktif. Setelah uji pemadaman, pulihkan suplai utama melalui dialog uji daya untuk mengembalikan seluruh beban simulasi.

Progres tersimpan pada browser dan alamat lokal yang digunakan. Pergantian browser, profil, port, atau penghapusan data situs dapat menghasilkan progres yang berbeda. Ekspor progres menghasilkan berkas JSON. Fitur impor progres belum disediakan. Kondisi gangguan dan pemadaman direset ketika halaman dimuat ulang; pencapaian pembelajaran tetap tersimpan.

## Dasar model dan batas interpretasi

Topologi memisahkan fungsi terminal, access point, switch akses, core, dan server. Backbone fiber menghubungkan area layanan dan distribusi lantai 2. Penelusuran memakai pencarian jalur pada graf yang menghapus link putus dan perangkat tanpa daya dari rute yang dapat digunakan. Hasil ini merupakan simulasi konektivitas, bukan ping atau analisis jaringan nyata.

VLAN 10 untuk klinis, VLAN 20 untuk administrasi, VLAN 30 untuk tamu, dan VLAN 99 untuk manajemen dipakai sebagai contoh pembelajaran. Nomor VLAN tidak dengan sendirinya menegakkan keamanan. Fungsi kebijakan pada simulator menerapkan penolakan akses VLAN tamu menuju server internal. Router/firewall ditampilkan sebagai perangkat pembelajaran, sedangkan logika kebijakan dihitung pada engine aplikasi.

UPS mempertahankan daya pada perangkat yang ditandai `protected`. Terminal tanpa suplai tetap tidak dapat berkomunikasi meskipun server menyala. Simulasi ini tidak menghitung beban, kapasitas, masa cadangan, proteksi, pembumian, gelombang arus, propagasi RF, interferensi, latensi, atau throughput. Lingkaran Wi-Fi dan titik paket bersifat konseptual.

Gambar referensi mencantumkan tanpa skala. Panjang jalur ditampilkan dalam **unit scene**, bukan meter terverifikasi. Furnitur dan perangkat tambahan berupa model geometri ringan dengan material bertekstur untuk pembelajaran. Susunan perangkat, VLAN, jalur kabel, dan sirkuit daya adalah tambahan simulasi. Paket ini tidak mengandung data pasien atau konfigurasi produksi rumah sakit.

## Struktur kode

| Berkas atau folder | Peran |
| --- | --- |
| `index.html`, `style.css` | Struktur antarmuka dan tampilan responsif |
| `src/app.js` | Misi, panel informasi, kuis, penyimpanan, ekspor |
| `src/world.js` | Scene, kamera, kontrol, interaksi, furnitur, animasi |
| `src/data.js` | Zona ruang, perangkat, VLAN contoh, materi dan pertanyaan |
| `src/engine.js` | Graf koneksi, penelusuran, gangguan, daya, skor, collision |
| `src/experience.js`, `src/modes.js` | Alur empat mode, instalasi bertahap, presentasi, dan jalur tangga |
| `src/building.js` | Atap, plafon, detail fasad, jembatan dan tangga penghubung, bukaan pintu |
| `src/surfaces.js` | Tekstur PBR prosedural tanpa unduhan |
| `src/assets.js` | Generator seluruh geometri tambahan dan batching |
| `assets/models/` | GLB arsitektur dan 27 aset tambahan siap digunakan |
| `assets/collision-*.json` | Potongan geometri dinding untuk navigasi |
| `assets/reference/` | Dua gambar denah asli |
| `assets/floorplan-manifest.json` | Pemetaan sumber dan ukuran hasil optimasi |
| `vendor/` | Three.js 0.180.0, addons, lisensi MIT |
| `server.py`, `server.mjs` | Server lokal tanpa dependensi tambahan |
| `tests/` | Pengujian engine, geometri, GLB, dan kelengkapan module lokal |
| `tools/` | Ekspor aset dan konversi ulang model untuk pengembangan |
| `docs/` | Topologi dan catatan validasi |

Untuk menambah perangkat, ubah `NETWORK` pada `src/data.js`, tetapkan `sw` sebagai ID switch tujuan, lalu sesuaikan posisi dan VLAN. Perangkat dengan `sw` memperoleh link dari `createEdges()`. Jalur utama disediakan secara eksplisit. Simpan ID link tetap unik agar pemutusan satu uplink tidak memutus link lain.

Generator aset dipakai langsung saat runtime agar tidak perlu memuat puluhan model kecil. Versi GLB tersedia untuk diedit di Blender atau dipakai di proyek lain. Untuk membuat ulang GLB tambahan:

```sh
node tools/export-assets.mjs
```

Konversi ulang model asli merupakan langkah pengembangan opsional yang memerlukan Python dan NumPy. Game yang sudah jadi tidak memerlukan NumPy:

```sh
python3 tools/prepare_floorplans.py /folder/berisi/model/asli
```

Konverter mempertahankan dinding dan skirting dalam koordinat asli, menggabungkan geometri, menghapus komponen daun pintu, dan menghasilkan data collision pada tinggi badan. Model berfurnitur besar tidak disalin seluruhnya. Furnitur aslinya diganti oleh geometri pembelajaran yang ringan. Dua GLB arsitektur hasil konversi hanya berukuran sekitar 380 KB dan 294 KB.

## Validasi dan pemecahan masalah

Jalankan pengujian dengan Node.js tanpa npm install:

```sh
node --test tests/*.test.mjs
python3 server.py --check
node server.mjs --check
```

Pengujian mencakup konektivitas, segmentasi tamu, isolasi kabel putus, efek gangguan upstream, daya cadangan, urutan dan idempotensi XP, penyimpanan progres, collision, pemuatan GLB, instalasi bertahap, jalur tangga kontinu, geometri atap, UV material, kontrak kontrol empat mode, dan keberadaan module lokal. Catatan validasi menjelaskan cakupan pemeriksaan dan batas QA rendering.

Jika halaman gagal dimuat, periksa bahwa terminal server masih berjalan, seluruh ZIP sudah diekstrak, dan URL sesuai alamat yang dicetak. Untuk port khusus gunakan `python3 server.py --port 9000` atau `node server.mjs --port 9000`. Jika tampilan 3D gagal, pastikan WebGL 2 tersedia dan akselerasi grafis aktif. Pilih grafis Hemat untuk menonaktifkan bayangan dan menurunkan resolusi render. Tutup tab grafis berat lain jika diperlukan. Tidak ada klaim FPS tetap pada semua perangkat.

## Referensi dan lisensi

Materi konsep merujuk dokumentasi primer berikut. Tanggal pemeriksaan: 15 Oktober 2026.

- Three.js, Installation: https://threejs.org/manual/pages/installation.html
- Three.js, GLTFLoader: https://threejs.org/docs/pages/GLTFLoader
- Cisco, Campus LAN and Wireless LAN Solution Design Guide: https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html
- Cisco, VLAN Access Control Lists: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960x/software/15_2_6_e/configuration_guide/b_1526e_consolidated_2960x_cg/m_sec_vlan_maps_cg_cauvery.html
- APC, UPS Buying Guide: https://www.apc.com/us/en/support/product-support/ups-buying-guide-for-selecting-a-battery-backup-system.jsp

Kode aplikasi dan aset prosedural tambahan menggunakan lisensi MIT pada `LICENSE.txt`. Denah dan arsitektur turunan berasal dari unggahan pengguna; hak sumber tersebut tidak dialihkan oleh lisensi kode. Three.js dan addons menggunakan lisensi MIT tersendiri pada `vendor/THREE-LICENSE.txt`.
