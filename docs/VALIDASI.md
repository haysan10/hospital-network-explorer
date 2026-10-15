# Validasi MediLink 2.0

## Pemeriksaan yang dijalankan

- `node --test tests/*.test.mjs`: 29 pengujian otomatis lulus.
- `python3 server.py --check` dan `node server.mjs --check`: seluruh berkas awal tersedia.
- Seluruh module JavaScript baru diperiksa dengan `node --check`.
- Ekspor ulang 27 GLB tambahan berhasil, termasuk material bertekstur, dua kelompok atap, dan tangga penghubung. Dua GLB arsitektur asli tetap dipertahankan.
- Pemeriksaan arsip memastikan semua GLB tertanam tanpa resource jarak jauh dan seluruh import module mengacu berkas lokal.

## Cakupan fungsional

1. Distribusi awal tetap 53 perangkat, 48 link data, dan tiga cabang core yang sama. Tidak ada perubahan penugasan endpoint ke switch area.
2. Uji rute dari L1 dan L2 menuju server, kegagalan link lokal/upstream, serta pengaruh daya utama dan sirkuit UPS.
3. Kebijakan tamu diperiksa setelah jalur fisik dan daya tersedia. Gangguan kabel tidak disembunyikan sebagai penolakan kebijakan.
4. Instalasi menolak langkah di luar urutan dan pilihan keliru. Progres serialisasi dibangun ulang secara berurutan. Instalasi selesai menghasilkan tepat graf awal dan pengujian tiga terminal serta tamu.
5. Kedua bordes tangga berada di ruang tangga pada denah asli dan bebas collision. Jalur kamera kontinu, naik/turun berakhir pada elevasi benar, serta mode berjalan dipertahankan. Raycast terhadap dinding GLB memastikan bukaan pintu benar-benar tersedia setelah pemotongan.
6. Geometri atap menutupi footprint lantai, plafon tersedia saat berjalan, dan aturan tampilan eksterior/potongan berfungsi. Semua geometri dan UV material menghasilkan nilai finite.
7. Kontroler empat mode dijalankan melalui DOM contract harness tanpa browser. Perpindahan mode, delapan tahap instalasi, delapan adegan presentasi, penyimpanan progres, dan seluruh ID UI diperiksa.
8. Misi game tetap menghasilkan maksimum 1000 XP dengan penyimpanan kompatibel.

## Batas verifikasi

Browser QA dan rendering WebGL interaktif tidak dijalankan pada lingkungan pengerjaan ini karena sarana kontrol browser yang disyaratkan tidak tersedia. DOM contract harness tidak memverifikasi layout CSS, kualitas visual di GPU, aksesibilitas pembaca layar, performa frame, sentuhan, atau dialog fullscreen pada browser nyata. Keberhasilan pengujian engine dan geometri tidak menjadi bukti bahwa seluruh aspek rendering telah diuji.

Sayap tangga dan atap adalah tambahan visual edukasi untuk menyatukan dua denah. Dimensi, tinggi lantai 3,35 unit scene, panjang kabel, Wi-Fi, dan kelistrikan tidak menjadi data survei atau gambar kerja konstruksi.
