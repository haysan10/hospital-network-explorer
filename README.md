# MediLink Hospital Network Explorer · 4.2.0

Simulasi edukasi jaringan rumah sakit dua lantai berdasarkan denah dan model pengguna. Kawasan luar, interior PBR, pencahayaan, presentasi room tour dan misi jaringan tersedia lokal tanpa CDN atau layanan jaringan rumah sakit.

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

Pilih **Indonesia / English** di toolbar presentasi, di pengaturan narasi, atau lewat tombol ID/EN pada kontrol ringkas. Keempat belas bab memiliki judul, lokasi, paragraf, detail instalasi, urutan alur, fase, pemilih bab, dan pesan demo yang mengikuti bahasa. Navigasi gedung dan progres misi tetap sama. Pilihan bahasa mengubah teks meskipun suara sedang mati atau belum tersedia.

Naskah **Pemandu ramah** memakai kalimat percakapan untuk mengajak pengunjung melihat objek dan mengikuti jalur. **Presentasi jelas** memakai penjelasan lebih padat. **Tenang** memakai naskah pemandu dengan tempo lebih pelan dan jeda lebih panjang. Naskah Indonesia serta Inggris ditulis per bab. Singkatan jaringan memiliki pelafalan khusus sesuai bahasa, termasuk LAN, UPS, ICU, VLAN, dan nomor lantai.

Pengaturan **Narasi & bahasa** menambahkan aksen, voice, kecepatan 0,75–1,25×, nada 0,85–1,15, volume, serta pilihan tur utama atau tur dengan detail instalasi. Aksen menggunakan voice nyata: misalnya English US, UK, atau Australia jika tersedia, dan Indonesia untuk voice Indonesia. Pilihan yang belum tersedia ditandai; perpindahan perangkat dapat menghasilkan pemberitahuan bahwa aksen lama diganti voice lain dalam bahasa yang sama. Bahasa yang tidak memiliki voice tidak dibacakan dengan voice bahasa lain. Suara yang terdaftar terlambat dapat dipakai setelah tersedia.

Narasi dibagi per kalimat, dengan jeda antarbagian. Subtitle opsional menampilkan kalimat yang sedang diproses; subtitle dapat ditutup terpisah dan tetap tersedia saat panel tersembunyi. Subtitle mengikuti event kalimat, bukan pengukuran audio atau penyelarasan kata. Penjelasan lengkap menambahkan detail instalasi setelah narasi utama. Tur menunggu seluruh rangkaian selesai sebelum berpindah otomatis. Ganti bahasa/gaya saat tur aktif membatalkan antrian lama dan memulai penjelasan bab yang sama; posisi kamera serta waktu bab tetap dipertahankan.

Profil bahasa, aksen/voice per bahasa, gaya, kecepatan, nada, volume, isi, dan subtitle disimpan di browser. Status aktif suara tidak disimpan agar reload tidak memulai audio sendiri. Suara lokal diprioritaskan di dalam aksen yang dipilih; pengguna bisa memilih voice nonlokal yang tersedia. Karakter suara dan dukungan nada mengikuti engine browser/perangkat. Tidak ada engine neural baru atau layanan suara premium yang ditambahkan, dan kualitas pengucapan belum didengar langsung. Suara nonlokal mungkin memerlukan koneksi. Referensi API: https://webaudio.github.io/web-speech-api/#tts-section.

## Roomtour tanpa panel dan narasi 4.1

Tekan **Sembunyikan panel** atau **H** untuk menampilkan scene hingga seluruh area aplikasi. Panel, toolbar besar, sidebar, header, dan footer disembunyikan; kontrol ringkas tetap menyediakan Tampilkan panel, Jeda/Lanjutkan, Narasi, dan Keluar. H mengembalikan panel. Kamera layar kecil kembali ke tengah saat panel tersembunyi. Layar penuh browser tetap tersedia melalui tombol Layar penuh sebelum menyembunyikan panel.

Aktifkan **Narasi** atau **N** untuk membacakan judul serta paragraf penjelasan bab sesuai bahasa pilihan dengan text-to-speech. Pengaturan narasi suara menyediakan pilihan voice, kecepatan yang dapat diatur, dan Ulangi narasi. Suara Indonesia diprioritaskan, termasuk suara lokal jika tersedia. Voice mengikuti daftar browser/perangkat; sebagian suara nonlokal dapat membutuhkan koneksi. Narasi awalnya mati. Tidak ada API key yang diperlukan. Jika API atau voice gagal, penjelasan teks dan tur tetap dapat dipakai.

Suara mengikuti jeda/lanjut, berhenti saat keluar atau pindah bab, serta dijeda ketika tab tersembunyi. Pergantian otomatis menunggu narasi bab selesai; kegagalan engine dibatasi agar tur tidak terkunci. Menyembunyikan panel tidak menghentikan narasi. Empat tombol lapisan serta Buka plafon & atap tersedia di panel tanpa keluar presentasi; perubahan manual dipertahankan antarbab dan kondisi sebelum tur dipulihkan saat keluar.

## Pemeriksaan instalasi 4.1

54 koneksi LAN, empat backbone fiber, dan satu radio tablet–AP memakai graph yang sama dengan simulasi. LAN dan fiber memiliki lane berbeda pada tray data; 61 feed daya memakai tray di sisi lain koridor. Titik LAN AP disambungkan pada elevasi aset terpasang. Fiber antarlantai melewati lubang service nyata pada pelat L2 di riser internal. Daya mengikuti panel → UPS → beban terlindungi atau panel → beban biasa; tablet baterai tidak diberi kabel daya. Radio Wi-Fi memakai garis ungu putus-putus dan gelombang AP; uplink AP tetap LAN. Jalur dan pemisahan bersifat ilustrasi scene, bukan dimensi atau spesifikasi instalasi nyata.

## Perbaikan tampilan gedung 4.0.1

Gedung utuh menampilkan kedua lantai dengan atap dan fascia yang tersambung ke puncak dinding. Atap bawah hanya menutup area di luar footprint lantai 2 sehingga tidak berlapis dengan pelat lantai atas. Bukaan tangga tetap nyata. Kedua lantai juga tetap hadir secara fisik dalam Jelajah dan room tour interior.

Buka plafon membuka atap sekaligus plafon. Pilihan lantai, Orbit 3D, Atas, dan Reset tampilan kembali ke denah terbuka tanpa meninggalkan atap penutup. Antarlantai memperlihatkan kedua lantai serta backbone fiber dalam mode denah. Label interior tidak menembus atap tertutup; preferensi label tetap tersimpan. Kamera, far plane dan kabut mengikuti framing portrait/landscape serta perubahan ukuran layar.

## Lingkungan dan pencahayaan

Kawasan memuat jalan melingkar, jalur pejalan kaki menuju pintu utama, penyeberangan, parkir, mobil, ambulans, taman, pohon dengan gerak daun GLSL, bangku, pagar, drainase, totem dan signage rumah sakit. Mode Jelajah dapat berjalan dari kawasan menuju loket; peta mini menyesuaikan ketika berada di luar gedung. Penataan bagian dalam tetap melindungi seluruh pintu dan jalur menuju peralatan.

Interior 36 ruang/area dilengkapi furnitur sesuai fungsi, pintu, jendela, plafon, roof/slab, lampu, utilitas plafon dan detail dinding. Versi ini menambah outlet data, raceway vertikal, panel terminasi fiber, exit sign, dan wall art. Rak nurse station menghadap koridor sehingga muka rak bisa diamati. Outlet yang terlihat memakai titik yang sama dengan jalur kabel endpoint; pendaftaran memakai floor box dan feed bawah lantai menuju riser dinding.

Preset **Siang, Senja, Malam** mengatur warna dan arah matahari, hemisphere/fill light, environment intensity, fog jauh, exposure serta lampu kawasan. Warna lampu ruang membedakan area publik, klinis dan perawatan. Contact grounding memakai instanced alpha planes; shadow matahari memakai PCF. Terdapat 79 posisi lampu interior/teras dan 11 posisi lampu kawasan. Pool PointLight terdekat dibatasi 3 pada Hemat, 6 pada Standar, dan 8 pada Detail; seluruh posisi tidak menjadi lampu dinamis secara bersamaan.

Seluruh aset prosedural memakai base-color, normal, roughness dan AO. Profil meliputi vinyl, kain, kayu, logam, keramik, kaca, karet, plaster, leaf dan terrazzo. Geometry bantalan memakai bevel/crown, UV atlas dan tangent dipertahankan setelah batching. Terdapat 71 GLB tambahan, terdiri atas 68 jenis aset dan tiga kabel, serta dua GLB dinding sumber. Masing-masing aset berada di bawah 60.000 triangle; maksimum saat ini 6.652.

## Presentasi room tour

14 bab otomatis berlangsung sekitar 5 menit 15 detik tanpa narasi; durasi dapat memanjang ketika menunggu narasi selesai. Kamera memasuki delapan adegan ruang melalui rute yang diuji dengan collision aplikasi. Pergantian ruang/lantai memakai transisi bab; kamera tidak diberi lintasan menembus dinding. Tampilan overview membuka selubung untuk menjelaskan instalasi di atas plafon.

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

89 pengujian otomatis lulus. Pengujian meliputi 49 lintasan pintu/portal dua arah, 63 rute masuk ruang, 152 rute ke peralatan, delapan lintasan kamera room tour, akses kawasan–loket, lifecycle presentasi, isolasi demo, preferensi label, pemilihan lampu, geometri/GLB/PBR, serta seluruh misi dan jaringan sebelumnya. Hasil rinci tersedia pada docs/VALIDASI.md dan JSON audit.

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
