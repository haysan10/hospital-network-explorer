# Validasi MediLink 4.2.0

Tanggal: 20 Oktober 2026 (Asia/Jakarta).

89 pengujian otomatis lulus menggunakan Node.js dan Three.js lokal. Audit penataan dasar mencakup 108 furnitur/perangkat. Jarak bed–komputer terdekat tetap 1,013 unit scene. Seluruh 36 ruang/area memiliki akses dan pencahayaan sesuai pengecualian rongga tangga bawah. Tidak ada perlengkapan lantai yang gagal ditempatkan atau menembus dinding sumber.

## Narasi bilingual 4.2

Tujuh tes tambahan memeriksa cakupan 14 bab × dua bahasa × tiga gaya tanpa mengubah metadata scene, pemilihan voice dan aksen nyata, pembatalan audio bahasa lama, pelafalan istilah, fallback aksen yang diberitahukan, pemulihan voice terlambat tersedia, serta penolakan fallback ke bahasa yang berbeda.

Urutan per kalimat, jeda, subtitle, pause saat berada di sela kalimat, pilihan detail lengkap, profil gaya, rate/pitch/volume, dan pemulihan preferensi diperiksa dengan engine palsu. Pengujian integrasi memastikan perubahan bahasa memperbarui detail dan demo sambil mempertahankan kamera, waktu bab, panel tersembunyi, dan state misi. Pengujian UI memastikan opsi aksen mengikuti voice tersedia, kontrol berbahasa Inggris, dan subtitle opsional tetap dapat ditutup saat panel tersembunyi.

Preferensi tidak menyimpan enabled, sehingga reload tidak memulai suara otomatis. Kontrol ini memakai kemampuan SpeechSynthesis browser; pengujian tidak membuktikan naturalness, pengucapan, kualitas aksen, atau dukungan pitch pada engine nyata. Tidak ada rekaman audio atau audit pendengaran yang dilakukan.

## Instalasi, panel dan text-to-speech 4.1

Tiga belas tes tambahan memeriksa lane LAN/fiber/daya di dalam koridor dan di bawah deck, lubang riser fiber pada pelat L2, 61 feed panel/UPS, tablet baterai tanpa kabel daya, port AP dan radio putus-putus dengan uplink LAN. Graph tetap 54 LAN + 4 fiber + 1 Wi-Fi.

Tes lifecycle memeriksa panel tersembunyi tetap tersembunyi setelah pembaruan/bab baru, pemusatan kamera mobile, pembukaan panel kembali, empat lapisan dan plafon tanpa keluar tur, serta pemulihan kondisi sebelumnya. Struktur kontrol dan HTML/ID ikut diperiksa.

SpeechSynthesis diuji menggunakan engine palsu: opt-in, prioritas voice Indonesia lokal, voice terlambat tersedia, penolakan audio, timeout, pilihan suara/rate, pembatalan antrian, jeda/lanjut dan tab tersembunyi. Timer presentasi menunggu event akhir narasi sebelum melanjutkan otomatis. Ini menguji logika pengendali; kualitas suara, pengucapan, dan dukungan audio browser/perangkat belum didengar atau diuji langsung. Narasi memakai voice browser; model dan tur teks tetap dapat dipakai tanpa narasi. Referensi API: https://webaudio.github.io/web-speech-api/#tts-section.

## Regresi tampilan gedung lengkap

Sembilan pengujian tambahan memakai metode aplikasi sebenarnya untuk siklus Gedung utuh → lantai 1/2/Antarlantai, Eksterior → Atas/Reset, plafon dan atap, kedua lantai fisik dalam Jelajah, label di balik atap, serta pemulihan room tour ke eksterior.

Seluruh sudut bounding box bangunan dan kawasan diproyeksikan pada aspect ratio 0,3 / 0,5 / 0,75 / 1 / 1,7 / 3, termasuk kamera atas. Resize memanggil framing ulang. Fog dan far plane diperiksa ketika kamera portrait kawasan berjarak lebih dari 250 unit. Raycast menutup celah dinding–deck sepanjang semua tepi footprint; atap L1 tidak bertumpuk dengan footprint pelat L2, dan lubang tangga pelat L2 tetap terbuka.

## Cakupan scene

| Komponen | Lantai 1 | Lantai 2 |
| --- | ---: | ---: |
| Ruang dan area sirkulasi | 20 | 16 |
| Pintu operasional | 26 | 20 |
| Portal terbuka | 1 | 2 |
| Bilik toilet berpintu | 6 | 6 |
| Jendela dengan bukaan nyata | 13 | 13 |
| Posisi lampu interior/teras | 47 | 32 |
| Catatan detail interior | 210 | 171 |

Sebelas posisi lampu tambahan berada di kawasan. Kawasan memuat jalan, pedestrian, penyeberangan, parkir, tiga mobil, ambulans, pohon, bangku, lampu, pagar, drainase serta signage. Aset tambahan menjadi 71 GLB: 68 jenis aset dan tiga kabel. Dua model dinding dasar tetap disertakan. Seluruh aset memiliki data hingga, UV/tangent, base-color, normal, roughness dan AO; batas tiap aset tetap di bawah 60.000 triangle, maksimum 6.652.

## Akses dan kamera

- Seluruh 49 akses pintu/portal diuji dua arah melalui logika gerak dan pintu otomatis aplikasi.
- 63 rute masuk menuju area sirkulasi ruangan dan 152 rute menuju sisi peralatan diputar ulang dua arah, tanpa teleportasi.
- Delapan adegan kamera room tour dibentuk dari rute yang diuji pada posisi akhir furnitur. Sampling camera pose tetap pada lokasi yang dapat ditempati avatar. Tinggi mata mengikuti elevasi lantai ditambah 1,62 unit.
- Jalur pejalan kaki kawasan menuju pendaftaran diuji pada lebar bebas 1,2 unit serta dilalui memakai logika pintu otomatis.
- Mesh daun pintu dan pegangan diperiksa sepanjang 72 frame pembukaan. Footprint furnitur dan perlengkapan pada tinggi tubuh tidak menghalanginya.
- Partisi toilet tetap memisahkan dua jalur akses. Collision tangga mengikuti penerbangan, bordes dan handrail, bukan menganggap ruang kosong sebagai benda padat.
- Lima rute front office sebelumnya tetap lulus lebar 1,2 / 0,9 / 0,8 unit sesuai skenario.

## Presentasi dan pengaturan

- Empat belas bab merujuk ke perangkat dan link yang benar. Timer mendukung jeda, lanjut, pemilihan bab, akhir tur serta ulangi, dan membatasi lompatan waktu saat frame terlambat.
- Demo kabel ICU, penolakan VLAN tamu dan daya UPS berjalan pada state terpisah. State dan progres pembelajaran asli tidak berubah.
- Keluar presentasi memulihkan kamera, mode, lantai, lapisan, label, pilihan dan trace sebelumnya. Handoff ke Jelajah mempertahankan posisi ruang saat ini.
- Perubahan label manual ketika presentasi aktif dipertahankan saat keluar. Label ruang maupun beacon perangkat disembunyikan bersama, kontrol aria-pressed diselaraskan, dan preferensi disimpan.
- Preset siang/senja/malam memakai nilai pencahayaan hingga. Pemilihan lampu memfilter lantai dan membatasi pool. Suplai utama, UPS dan lampu luar memiliki kondisi daya eksplisit.
- Titik outlet data yang dirender dipakai pada jalur LAN terminal, termasuk floor box pendaftaran dan feed bawah lantai. Port outlet serta cabang ke distribusi bukan dekorasi yang terpisah dari path jaringan.
- Struktur HTML diperiksa untuk ID unik serta nesting seimbang. Kontrol presentasi menyediakan nama aksesibel, pemilih bab, dan pintasan keyboard. Pengujian ini tidak menggantikan uji pembaca layar atau perangkat sentuh nyata.

## Regresi jaringan dan geometri

Semua skenario koneksi, trace endpoint ke server, backbone dua lantai dan sayap barat, VLAN 30, fault ICU, UPS, enam misi, kuis dan penyimpanan progres tetap dijalankan. Geometri kabel, pemotongan 26 jendela pada GLB sebenarnya, tiga bukaan front office, roof/slab, langit-langit serta material PBR tetap diuji. Semua impor ES module merujuk ke berkas lokal.

Laporan mesin: layout-audit.json, environment-audit.json, circulation-audit.json, room-access-audit.json dan tour-audit.json. Rute room tour dihasilkan oleh tools/generate-tour-paths.mjs; denah kawasan dan penataan dihasilkan dari data scene.

## Batas pemeriksaan

Browser pengujian yang didukung tidak tersedia. Tidak dilakukan kompilasi shader pada GPU, screenshot render browser, benchmark FPS, uji fullscreen di perangkat nyata, pemutaran TTS pada engine nyata, atau verifikasi sentuhan/screen reader. Pemeriksaan yang selesai adalah unit, geometri, ray, struktur dokumen, simulasi collision dan lifecycle state presentasi.

Ukuran menggunakan unit scene dari referensi tanpa skala. Kamera terbang overview, portal otomatis, perpindahan bab/lantai, pencahayaan cadangan dan visual paket merupakan penyederhanaan edukasi. Model ini tidak memverifikasi standar bangunan, fasilitas medis, listrik, panjang kabel instalasi atau kapasitas UPS.
