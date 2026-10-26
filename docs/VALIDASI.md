# Validasi MediLink 4.6.0

123 pengujian otomatis lulus dengan Node.js dan Three.js lokal. Lima pengujian fungsional baru mencakup pemindahan layanan penunjang, penghapusan komputer OK, lintasan servis, bukaan geometri, finishing klinis dan routing menuju blok belakang. Enam tes revisi tambahan mengunci fungsi ruang, bukaan farmasi, pemisahan back office, aturan perangkat OK, uplink outdoor dan konsistensi inventaris SVG.

## Kamera tambahan versi 4.6

Delapan tes baru mencakup pemilihan Orang ketiga dan Drone lewat `init` aplikasi, avatar berartikulasi dengan material PBR, gerak sebenarnya melalui loop animasi, benturan avatar, pembatas kamera mengikuti, batas tinggi dan kawasan Drone, kesetaraan gerak pada 30 dan 60 FPS, sumbu vertikal keyboard/sentuh, lifecycle pointer terpisah, serta pemulihan kedua mode sesudah presentasi. Pengujian ini memakai geometri dan DOM sintetis, bukan rendering GPU.

Pengunjung menggunakan avatar 1,75 unit scene. Tubuh Orang ketiga memakai radius benturan 0,34; kamera memakai boom yang memendek di depan penghalang pada lantai aktif. Model tidak menambahkan simulasi gravitasi atau berjalan fisik di anak tangga. Drone secara sengaja berfungsi sebagai kamera inspeksi yang dapat melintasi geometri.

## Perbaikan kontrol 4.5.1

Empat tes integrasi baru memulai `init` aplikasi dengan DOM dari HTML sebenarnya dan metode scene Three.js yang dipakai produksi, tanpa renderer GPU. Tes mengklik Gedung utuh dan plafon, memeriksa atap dan clipping kedua lantai, mengganti pilihan kamera, menjaga Jelajah antarlantai tunggal, mengalihkan fokus keyboard ke canvas, menutup panel mobile, menampilkan joystick, serta keluar dari presentasi sebelum mengganti scene. Tes sebelumnya hanya memanggil metode bangunan; sambungan tombol yang hilang kini ikut tercakup.

Dokumen dan denah lantai mempertahankan baseline fungsi ruang versi 4.5; tidak ada perubahan program ruang atau aset pada perbaikan kontrol ini.

## Responsif dan penerangan 4.4

Tujuh tes kontrol mobile memeriksa tap/pinch/drag, joystick analog, dua pointer untuk bergerak dan melihat bersamaan, pointer capture/cancel, kehilangan fokus/visibility, inspeksi perangkat nyata, panel dan fokus, keyboard viewport, pemulihan desktop, label tanpa tabrakan dan anggaran render pada ukuran 320×568, 390×844, 568×320, 768×1024, 1024×768, 1366×768, 1920×1080 dan 3840×2160. Ukuran tersebut menguji fungsi anggaran render, bukan hasil screenshot browser. Status panel dan event sentuh diputar ulang dengan DOM sintetis.

Empat tes lighting menguji sebaran cahaya pada sembilan titik di setiap ruang, data atlas dua lantai, area luar yang tidak mendapat fill, mask UPS, tiga preset, serta injeksi pada shader fisik dan lantai Three.js yang sebenarnya. Shader mempertahankan transformasi instancing/batching dan memasukkan irradiance sebelum AO. Cahaya dasar tidak memakai pemilihan pool lampu kamera; pool yang dibatasi sampai delapan hanya untuk detail lokal. Pengujian struktur shader bukan kompilasi atau render GPU.

CSS memakai breakpoint kompak untuk lebar sampai 1024 px, layar rendah, serta tablet sentuh sampai 1366 px. Canvas memakai pointer events, sedangkan panel dan menu memakai scroll native. Viewport-fit, safe area, tinggi visual viewport dan reset input disertakan. Tidak ada browser QA langsung karena control-browser tidak tersedia pada lingkungan ini.

## Cakupan scene

| Area | Ruang | Pintu | Portal | Jendela | Posisi lampu | Detail interior |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Lantai 1 | 27 | 39 | 1 | 18 | 67 | 288 |
| Lantai 2 | 16 | 20 | 2 | 13 | 32 | 175 |

Ada 116 penempatan furnitur/perangkat dasar, 62 perangkat, 50 LAN, 4 fiber, 2 hubungan radio dan 58 feed daya. Aset reusable terdiri dari 84 jenis ditambah tiga kabel: 87 GLB dengan PBR tertanam, di luar dua GLB dinding sumber. Maksimum per aset 6.652 triangle, di bawah batas 60.000. Pool lampu dinamis tetap dibatasi hingga delapan; sebelas posisi lampu kawasan tetap tersedia.

## Akses dan alur

62 lintasan pintu/portal, 84 rute masuk dan 163 rute sisi peralatan lulus dua arah melalui gerak dan pintu otomatis aplikasi. Mesh daun pintu dan pegangan diperiksa selama pembukaan. Audit tidak menemukan furnitur yang keluar ruang atau saling bertabrakan. Jarak bed–komputer terkecil 1,013 unit scene. Tidak ada detail wajib yang gagal ditempatkan.

Lima jalur front office tetap lulus. Delapan jalur servis diuji pada lebar 0,8 unit: akses dapur, IPSRS, kalibrasi dan linen bersih, penerimaan alat dari barat, bahan makanan dan linen kotor melalui dua pintu belakang terpisah, serta penyerahan linen bersih di timur. Semua lintasan diputar ulang dua arah. Bukaan pintu, lintel dan jendela builder dinding belakang diuji dengan raycaster Three.js. Partisi antara IPSRS dan kalibrasi juga diperiksa sebagai geometri nyata.

## Instalasi, presentasi dan narasi

Jalur data/daya back office melewati penghubung tertutup. AP outdoor memakai rute tiang dan jalur bawah tanah terpisah. Klien tamu outdoor diuji: jalur fisik tersedia, kebijakan VLAN menolak server, dan putus uplink benar-benar memutus akses. Panel back office menerima feed panel L1 dan melayani beban lokal. Fiber antarlantai tetap memakai penetrasi slab riser internal. Seluruh komputer kantor OK beserta koneksi dan outletnya dihapus. AP di OK 1, 2 dan 3 juga dihapus; satu AP tetap di OK besar. Distribusi barat berada di koridor OK.

Delapan lintasan kamera ruang dibentuk dan diputar ulang pada layout final. Presentasi mempunyai 15 bab, 339 detik tanpa menunggu suara. Semua bab mencakup dua bahasa dan tiga gaya narasi; pengujian meliputi pemilihan voice/aksen, pronunciation, jeda kalimat, subtitle, penggantian bahasa, pembatalan audio lama dan fallback bahasa. Panel dapat disembunyikan, label dapat dimatikan, dan demo tidak mengubah progres misi. Seluruh uji misi, VLAN, fault ICU, UPS, penyimpanan progres, framing bangunan, clipping dan impor lokal tetap lulus.

## Batas verifikasi

Pemeriksaan dilakukan secara programatis dengan geometri, raycaster, replay gerak, shader string dan data aplikasi. Denah SVG diperiksa secara visual. Render WebGL/GPU, kualitas suara speaker, kinerja perangkat pengguna, kontrol sentuh dan pembaca layar belum diuji langsung. Proyek tetap simulasi edukasi; ukuran memakai unit scene, tanpa perhitungan ventilasi/tekanan, proteksi kebakaran, struktur atau kapasitas instalasi. Dokumen ini tidak menyatakan sertifikasi rumah sakit nyata.

## Reproduksi

```sh
node --test tests/*.test.mjs
node tools/audit-layout.mjs --save
node tools/audit-environment.mjs --save
node tools/audit-room-access.mjs --save
node tools/audit-service-flow.mjs --save
node tools/audit-circulation.mjs --save
node tools/generate-tour-paths.mjs
node tools/build-static.mjs
```
