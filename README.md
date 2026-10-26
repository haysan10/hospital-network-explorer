# MediLink Hospital Network Explorer · 4.6.0

Simulasi edukasi jaringan rumah sakit dua lantai berdasarkan denah dan model pengguna. Kawasan luar, interior PBR, pencahayaan, presentasi room tour dan misi jaringan tersedia lokal tanpa CDN atau layanan jaringan rumah sakit.


## Kamera tambahan versi 4.6

Pilihan Kamera menyediakan Orbit 3D, Jelajah dari mata, Orang ketiga, Drone bebas, dan Tampak atas. Semua mode mempunyai pilihan langsung dan dukungan layar sentuh.

Orang ketiga mengikuti avatar pengunjung PBR dengan animasi langkah. WASD atau joystick menggerakkan avatar, seret layar mengubah arah kamera, E memeriksa perangkat, dan F membuka pintu. Kamera memendek ketika terhalang dinding atau furnitur; avatar disembunyikan ketika jarak kamera terlalu dekat. Radius tubuh 0,34 unit scene berlaku pada gerak dan pencarian posisi bebas. Kontrol Jelajah dari mata mempertahankan radius sebelumnya. Pergantian dua mode darat mempertahankan arah; mode Orang ketiga tetap aktif saat mengganti lantai.

Drone memakai gerak independen pada tiga sumbu. WASD atau joystick menggerakkan kamera mendatar, E atau Spasi menaikkan, Q menurunkan, dan Shift mempercepat. Tombol Naik/Turun pada layar sentuh bisa ditahan bersamaan dengan joystick. Ketinggian dibatasi 0,4–36 unit scene dan area gerak mengikuti batas kawasan. Drone adalah kamera inspeksi bebas yang dapat melintasi geometri. Posisi peta mengikuti kamera Drone. Mode kamera, posisi, arah dan pilihan lantai dipulihkan setelah roomtour.

## Perbaikan kontrol 4.5.1

Tombol Gedung utuh dan Buka atau Tutup plafon kini menjalankan kontrol bangunan yang sama dengan scene. Pilihan Kamera selalu terlihat: Orbit 3D, Jelajah dalam gedung, atau Tampak atas. Pada ponsel pilihan ini berada tepat di bawah menu Tampilan, Instalasi dan Peta. Mode Jelajah tetap aktif saat memilih Lantai 1 atau Lantai 2; Antarlantai memakai orbit. Memilih Jelajah menutup panel dan memindahkan fokus ke canvas agar WASD langsung bekerja; perangkat sentuh menampilkan joystick. Roomtour tetap menyediakan kamera terpandu.


## Responsif, sentuh dan cahaya menyeluruh · 4.4

Pada ponsel dan tablet, navigasi berada di bawah, panel misi/perangkat dapat ditutup, dan menu Tampilan/Instalasi/Peta dibuka saat diperlukan. Layout menyesuaikan portrait, landscape, tinggi viewport dinamis, safe area dan keyboard pencarian. Panel berubah menjadi panel samping pada layar rendah; kamera orbit menggeser komposisi ke area model yang masih terlihat. Label pada layar kecil dibatasi dan diatur agar tidak menumpuk. Semua ruang tetap dapat dicari melalui peta dan daftar perangkat. Roomtour tetap dapat disembunyikan dan dipakai pada layar penuh.

Jelajah sentuh memakai joystick analog di kiri, geser layar untuk melihat dan tombol Periksa di kanan. Gerak lambat dan diagonal mempunyai kecepatan yang konsisten. Pinch atau drag tidak dianggap sebagai pemilihan perangkat. Gerak dihentikan saat pointer dibatalkan, capture lepas, aplikasi kehilangan fokus, viewport berubah, panel dibuka, atau tab disembunyikan. Orbit memakai satu jari untuk rotasi, dua jari untuk zoom/geser. Mouse dan WASD tetap tersedia. Resolusi render menyesuaikan anggaran piksel perangkat.

Penerangan dasar seluruh 43 ruang/area memakai atlas irradiance dua lantai yang menambahkan cahaya pantul diffuse pada shader PBR. Penerangan ini mengikuti posisi ruang, bukan posisi kamera, dan tetap ada dalam grafis Hemat. Material, normal, roughness, AO dan bayangan kontak dipertahankan. Lampu real-time terdekat hanya memberi detail tambahan dengan intensitas lebih rendah dan jangkauan lebih luas. Area luar tetap mengikuti preset siang/senja/malam; fill interior dibatasi ke footprint dan elevasi ruang. Pada pemadaman, fill darurat hanya diterapkan pada kelompok ruang yang ditandai dan membutuhkan UPS. Ini aproksimasi visual, bukan ray-traced GI atau penghitungan lux.

123 tes otomatis mencakup regresi lama dan 11 tes baru untuk gestur, joystick, panel, viewport keyboard, label, anggaran render, atlas pencahayaan dan integrasi GLSL. Browser, GPU serta layar sentuh fisik belum diuji langsung.

## Revisi fungsi ruang versi 4.5

Poliklinik menjadi laboratorium. Laboratorium lama menjadi depo farmasi, dan farmasi lama menjadi gudang farmasi; keduanya terhubung oleh pintu geser internal pada dinding bersama. Bekas istirahat staf, kalibrasi dan gudang alat masing-masing menjadi poli umum, THT dan gigi. Setiap poli memiliki komputer dan AP, dengan bed atau kursi pemeriksaan serta konsol sesuai fungsi.

Dapur lama dibagi menjadi IPSRS dan kalibrasi yang berdinding dan berpintu terpisah. Keduanya tanpa komputer; IPSRS juga tanpa AP. Administrasi servis menjadi gudang alat medis yang tetap memuat switch, terminasi fiber dan panel. Bekas linen bersih menjadi binatu, bekas binatu menjadi linen bersih, dan bekas IPSRS menjadi dapur baru tepat di samping binatu. Dapur dan binatu mempunyai pintu penerimaan belakang yang terpisah; linen bersih memiliki penyerahan di timur.

Satu AP outdoor di tiang taman melayani tablet pengunjung VLAN 30. LAN dan daya mengikuti tiang lalu jalur bawah tanah yang terpisah. OK 1, 2 dan 3 tanpa PC maupun AP; hanya satu AP berada di OK besar, tanpa komputer kantor. Fiber L2 ke nurse station dan distribusi barat tetap tersedia.

Jadwal fungsi dan finishing tersedia pada src/materials.js dan docs/room-function-schedule.json. Aset baru meliputi AP outdoor, kursi THT, konsol THT, kursi dental dan unit dental. Seluruhnya memakai material PBR prosedural dengan UV dan tangent. LAN, fiber dan daya back office mengikuti penghubung tertutup. Delapan jalur servis diperiksa dua arah pada lebar 0,8 unit scene.

Denah jaringan mengikuti gaya grid, simbol komputer/AP dan warna kabel pada referensi: [Lantai 1 SVG](assets/denah-lantai-1.svg), [Lantai 2 SVG](assets/denah-lantai-2.svg). Keduanya juga tertanam sebagai SVG dengan fallback PNG pada [dokumen revisi](docs/MediLink-Revisi-Denah-Lantai-1-dan-2.docx). Denah furnitur dan kawasan tetap tersedia di menu Denah.

## Mulai menggunakan

Ekstrak seluruh ZIP dan jalankan peluncur Windows, Mac, atau Linux. Alternatif tanpa instalasi paket:

```sh
python3 server.py
# atau
node server.mjs
```

Buka alamat localhost yang dicetak terminal. Jangan membuka index.html dengan protokol file. Browser memerlukan WebGL 2 dan akselerasi grafis. Opsi --port dan --check tetap tersedia pada server.

Pilih **Room tour** untuk presentasi, **Jelajah** untuk berjalan, atau **Eksterior** untuk melihat seluruh kawasan. Tombol **Label: tampil / mati** dan tombol L mengatur seluruh nama ruang serta penanda perangkat. Pilihan label dan pencahayaan disimpan pada browser ini.

## Narasi dua bahasa 4.2

Pilih **Indonesia / English** di toolbar presentasi, di pengaturan narasi, atau lewat tombol ID/EN pada kontrol ringkas. Kelima belas bab memiliki judul, lokasi, paragraf, detail instalasi, urutan alur, fase, pemilih bab, dan pesan demo yang mengikuti bahasa. Navigasi gedung dan progres misi tetap sama. Pilihan bahasa mengubah teks meskipun suara sedang mati atau belum tersedia.

Naskah **Pemandu ramah** memakai kalimat percakapan untuk mengajak pengunjung melihat objek dan mengikuti jalur. **Presentasi jelas** memakai penjelasan lebih padat. **Tenang** memakai naskah pemandu dengan tempo lebih pelan dan jeda lebih panjang. Naskah Indonesia serta Inggris ditulis per bab. Singkatan jaringan memiliki pelafalan khusus sesuai bahasa, termasuk LAN, UPS, ICU, VLAN, dan nomor lantai.

Pengaturan **Narasi & bahasa** menambahkan aksen, voice, kecepatan 0,75–1,25×, nada 0,85–1,15, volume, serta pilihan tur utama atau tur dengan detail instalasi. Aksen menggunakan voice nyata: misalnya English US, UK, atau Australia jika tersedia, dan Indonesia untuk voice Indonesia. Pilihan yang belum tersedia ditandai; perpindahan perangkat dapat menghasilkan pemberitahuan bahwa aksen lama diganti voice lain dalam bahasa yang sama. Bahasa yang tidak memiliki voice tidak dibacakan dengan voice bahasa lain. Suara yang terdaftar terlambat dapat dipakai setelah tersedia.

Narasi dibagi per kalimat, dengan jeda antarbagian. Subtitle opsional menampilkan kalimat yang sedang diproses; subtitle dapat ditutup terpisah dan tetap tersedia saat panel tersembunyi. Subtitle mengikuti event kalimat, bukan pengukuran audio atau penyelarasan kata. Penjelasan lengkap menambahkan detail instalasi setelah narasi utama. Tur menunggu seluruh rangkaian selesai sebelum berpindah otomatis. Ganti bahasa/gaya saat tur aktif membatalkan antrian lama dan memulai penjelasan bab yang sama; posisi kamera serta waktu bab tetap dipertahankan.

Profil bahasa, aksen/voice per bahasa, gaya, kecepatan, nada, volume, isi, dan subtitle disimpan di browser. Status aktif suara tidak disimpan agar reload tidak memulai audio sendiri. Suara lokal diprioritaskan di dalam aksen yang dipilih; pengguna bisa memilih voice nonlokal yang tersedia. Karakter suara dan dukungan nada mengikuti engine browser/perangkat. Tidak ada engine neural baru atau layanan suara premium yang ditambahkan, dan kualitas pengucapan belum didengar langsung. Suara nonlokal mungkin memerlukan koneksi. Referensi API: https://webaudio.github.io/web-speech-api/#tts-section.

## Roomtour tanpa panel dan narasi 4.1

Tekan **Sembunyikan panel** atau **H** untuk menampilkan scene hingga seluruh area aplikasi. Panel, toolbar besar, sidebar, header, dan footer disembunyikan; kontrol ringkas tetap menyediakan Tampilkan panel, Jeda/Lanjutkan, Narasi, dan Keluar. H mengembalikan panel. Kamera layar kecil kembali ke tengah saat panel tersembunyi. Layar penuh browser tetap tersedia melalui tombol Layar penuh sebelum menyembunyikan panel.

Aktifkan **Narasi** atau **N** untuk membacakan judul serta paragraf penjelasan bab sesuai bahasa pilihan dengan text-to-speech. Pengaturan narasi suara menyediakan pilihan voice, kecepatan yang dapat diatur, dan Ulangi narasi. Suara Indonesia diprioritaskan, termasuk suara lokal jika tersedia. Voice mengikuti daftar browser/perangkat; sebagian suara nonlokal dapat membutuhkan koneksi. Narasi awalnya mati. Tidak ada API key yang diperlukan. Jika API atau voice gagal, penjelasan teks dan tur tetap dapat dipakai.

Suara mengikuti jeda/lanjut, berhenti saat keluar atau pindah bab, serta dijeda ketika tab tersembunyi. Pergantian otomatis menunggu narasi bab selesai; kegagalan engine dibatasi agar tur tidak terkunci. Menyembunyikan panel tidak menghentikan narasi. Empat tombol lapisan serta Buka plafon & atap tersedia di panel tanpa keluar presentasi; perubahan manual dipertahankan antarbab dan kondisi sebelum tur dipulihkan saat keluar.

## Pemeriksaan instalasi 4.1

50 koneksi LAN, empat backbone fiber, dan dua radio tablet–AP memakai graph yang sama dengan simulasi. LAN dan fiber memiliki lane berbeda pada tray data; 58 feed daya memakai tray di sisi lain koridor. Titik LAN AP disambungkan pada elevasi aset terpasang. Fiber antarlantai melewati lubang service nyata pada pelat L2 di riser internal. Daya mengikuti panel → UPS → beban terlindungi atau panel → beban biasa; tablet baterai tidak diberi kabel daya. Radio Wi-Fi memakai garis ungu putus-putus dan gelombang AP; uplink AP tetap LAN. Jalur dan pemisahan bersifat ilustrasi scene, bukan dimensi atau spesifikasi instalasi nyata.

## Perbaikan tampilan gedung 4.0.1

Gedung utuh menampilkan kedua lantai dengan atap dan fascia yang tersambung ke puncak dinding. Atap bawah hanya menutup area di luar footprint lantai 2 sehingga tidak berlapis dengan pelat lantai atas. Bukaan tangga tetap nyata. Kedua lantai juga tetap hadir secara fisik dalam Jelajah dan room tour interior.

Buka plafon membuka atap sekaligus plafon. Pilihan lantai, Orbit 3D, Atas, dan Reset tampilan kembali ke denah terbuka tanpa meninggalkan atap penutup. Antarlantai memperlihatkan kedua lantai serta backbone fiber dalam mode denah. Label interior tidak menembus atap tertutup; preferensi label tetap tersimpan. Kamera, far plane dan kabut mengikuti framing portrait/landscape serta perubahan ukuran layar.

## Lingkungan dan pencahayaan

Kawasan memuat jalan melingkar, jalur pejalan kaki menuju pintu utama, penyeberangan, parkir, mobil, ambulans, taman, pohon dengan gerak daun GLSL, bangku, pagar, drainase, totem dan signage rumah sakit. Mode Jelajah dapat berjalan dari kawasan menuju loket; peta mini menyesuaikan ketika berada di luar gedung. Penataan bagian dalam tetap melindungi seluruh pintu dan jalur menuju peralatan.

Interior 43 ruang/area dilengkapi furnitur sesuai fungsi, pintu, jendela, plafon, roof/slab, lampu, utilitas plafon dan detail dinding. Versi ini menambah outlet data, raceway vertikal, panel terminasi fiber, exit sign, dan wall art. Rak nurse station menghadap koridor sehingga muka rak bisa diamati. Outlet yang terlihat memakai titik yang sama dengan jalur kabel endpoint; pendaftaran memakai floor box dan feed bawah lantai menuju riser dinding.

Preset **Siang, Senja, Malam** mengatur warna dan arah matahari, hemisphere/fill light, environment intensity, fog jauh, exposure serta lampu kawasan. Warna lampu ruang membedakan area publik, klinis dan perawatan. Contact grounding memakai instanced alpha planes; shadow matahari memakai PCF. Terdapat 79 posisi lampu interior/teras dan 11 posisi lampu kawasan. Pool PointLight terdekat dibatasi 3 pada Hemat, 6 pada Standar, dan 8 pada Detail; seluruh posisi tidak menjadi lampu dinamis secara bersamaan.

Seluruh aset prosedural memakai base-color, normal, roughness dan AO. Profil meliputi vinyl, kain, kayu, logam, keramik, kaca, karet, plaster, leaf dan terrazzo. Geometry bantalan memakai bevel/crown, UV atlas dan tangent dipertahankan setelah batching. Terdapat 87 GLB tambahan, terdiri atas 84 jenis aset dan tiga kabel, serta dua GLB dinding sumber. Masing-masing aset berada di bawah 60.000 triangle; maksimum saat ini 6.652.

## Presentasi room tour

15 bab otomatis berlangsung sekitar 5 menit 39 detik tanpa narasi; durasi dapat memanjang ketika menunggu narasi selesai. Kamera memasuki delapan adegan ruang melalui rute yang diuji dengan collision aplikasi. Pergantian ruang/lantai memakai transisi bab; kamera tidak diberi lintasan menembus dinding. Tampilan overview membuka selubung untuk menjelaskan instalasi di atas plafon.

| Bab | Fokus |
| --- | --- |
| 01 | Kawasan, kedatangan dan pemetaan layanan |
| 02 | Pendaftaran, terminal administrasi dan titik data |
| 03 | Server, core, router, panel fiber dan UPS pusat |
| 04 | Agregasi akses dan segmentasi layanan |
| 05 | Jalur terminal IGD ke server |
| 06 | Cabang kabel dan tray koridor |
| 07 | Backbone fiber dan riser internal antarlantai |
| 08 | Tangga dan sirkulasi internal ke lantai 2 |
| 09 | Rak distribusi serta terminasi di nurse station |
| 10 | Terminal dan penataan ruang rawat inap |
| 11 | ICU serta demo kabel endpoint putus/pulih |
| 12 | Wi-Fi dan demo penolakan VLAN tamu |
| 13 | UPS serta demo suplai utama padam/pulih |
| 14 | Ringkasan alur dan dokumentasi |

Setiap bab memiliki penjelasan, urutan alur, fase instalasi, dan detail yang dapat dibuka. Gunakan Jeda/Lanjutkan, panah, pemilih bab, Layar penuh, dan Jelajah dari sini. Pada layar kecil isi penjelasan dapat digulir sementara kontrol bab tetap terlihat. Preferensi reduced motion membuat tur dimulai dalam keadaan jeda.

Demo presentasi memakai state terpisah dari GameState pembelajaran. Skenario kabel, VLAN dan UPS tidak menambah XP, mengubah progres misi, atau menimpa kondisi sebelumnya. Keluar presentasi memulihkan lantai, kamera, mode, lapisan, label, pilihan perangkat, trace dan kondisi daya sebelumnya. Perubahan label yang dilakukan sendiri saat tur tetap dipertahankan. Pencahayaan merupakan preferensi pengguna yang tetap bisa diubah saat tur.

## Kontrol

| Aksi | Kontrol |
| --- | --- |
| Orbit / zoom | Seret / gulir; satu dan dua jari pada layar sentuh |
| Berjalan / melihat | WASD atau tombol arah / seret |
| Periksa perangkat / tangga | E atau tombol interaksi |
| Buka/tutup pintu | F atau tombol pintu |
| Label ruang dan perangkat | Tombol Label atau L |
| Sembunyikan/tampilkan panel roomtour | H atau tombol panel |
| Narasi text-to-speech | N atau tombol Narasi |
| Bab presentasi | Panah kiri/kanan atau pemilih bab |
| Jeda/lanjutkan presentasi | Spasi atau tombol Jeda |
| Keluar presentasi/jelajah | Esc |
| Pencahayaan | Siang / Senja / Malam |
| Instalasi | Lapisan LAN, fiber, Wi-Fi dan daya |

Enam misi, diagnosis ICU, trace paket, kebijakan VLAN, UPS, kuis, penyimpanan progres dan ekspor JSON tetap tersedia. Daftar perangkat menyediakan alternatif navigasi ketika label dimatikan.

## Validasi dan sumber

123 pengujian otomatis lulus. Pengujian meliputi 62 lintasan pintu/portal dua arah, 84 rute masuk ruang, 163 rute ke peralatan, delapan lintasan kamera room tour, akses kawasan–loket, lifecycle presentasi, isolasi demo, preferensi label, pemilihan lampu, geometri/GLB/PBR, serta seluruh misi dan jaringan sebelumnya. Hasil rinci tersedia pada docs/VALIDASI.md dan JSON audit.

```sh
node --test tests/*.test.mjs
node tools/audit-layout.mjs --save
node tools/audit-environment.mjs --save
node tools/audit-circulation.mjs --save
node tools/audit-room-access.mjs --save
node tools/generate-tour-paths.mjs
node tools/export-assets.mjs
node tools/build-static.mjs
```

Browser dan GPU belum diuji. Pengujian ini tidak mengompilasi GLSL pada GPU, mengukur FPS, atau memverifikasi tampilan interaktif browser. Model memakai unit scene ilustratif dari referensi tanpa skala dan tidak merupakan gambar kerja bangunan, desain medis, atau rancangan instalasi listrik/jaringan nyata.

Kode utama: src/tour-copy.js, installation.js, narration.js, tour-ui.js, world.js, environment.js, campus.js, assets.js, materials.js, lighting.js, presentation.js, tour.js, data.js dan engine.js. Rute room tour disimpan pada src/tour-paths.js dan dihasilkan kembali dari audit posisi akhir. Menu Denah memuat denah kawasan, penataan kedua lantai serta gambar referensi asli. Lisensi Three.js dan aset sumber dijelaskan pada LICENSE.txt.
