# Review fungsional MediLink 4.5

Gedung utama lantai 1 kini memuat laboratorium di bekas poliklinik, depo di bekas lab, dan gudang farmasi di bekas farmasi. Depo dan gudang dihubungkan pintu geser internal. Poli umum, THT dan gigi menempati bekas lounge, kalibrasi dan gudang alat. Setiap poli memiliki PC serta AP. THT memakai kursi dan konsol pemeriksaan, gigi memakai kursi dental dan unit instrumen.

Back office memiliki enam ruang kerja terpisah di sepanjang koridor: IPSRS, kalibrasi, gudang alat, dapur, binatu dan linen bersih. IPSRS dan kalibrasi menempati dua bagian dapur lama. Bekas IPSRS dijadikan dapur karena berbatasan langsung dengan binatu baru. Dapur dan binatu memiliki dinding pemisah serta pintu penerimaan belakang masing-masing; tidak ada pintu langsung antara kedua proses. Linen bersih memakai ruang terpisah dan pintu penyerahan timur. Ini pemisahan visual/fungsional, tanpa klaim perhitungan ventilasi, tekanan atau sertifikasi klinis.

| Ruang | Peralatan utama | PC | AP |
| --- | --- | ---: | ---: |
| IPSRS | Workbench alat dan kabinet | 0 | 0 |
| Kalibrasi | Bench instrumen dan kabinet | 0 | 1 |
| Gudang alat medis | Rak, troli, terminal stok, distribusi jaringan dan panel | 1 | 1 |
| Dapur | Sink, meja stainless, range, hood, fridge, troli makanan | 0 | 0 |
| Binatu | Mesin komersial, meja stainless dan wadah linen | 0 | 0 |
| Linen bersih | Rak tekstil, meja lipat, troli tertutup | 0 | 0 |
| OK besar | Meja tindakan, monitor dan lampu operasi | 0 | 1 |
| OK 1 sampai 3 | Meja tindakan dan lampu operasi | 0 | 0 |

AP outdoor berada pada tiang taman pengunjung. Uplink LAN dan daya mengikuti tiang dan jalur bawah tanah dengan lane terpisah. Tablet luar memakai VLAN 30 dan terhubung ke AP tersebut. Jalur fisik dan kebijakan server diuji terpisah. Indikator radio bukan pengukuran RF.

Permukaan klinis memakai visual vinyl atau resin dan panel bersih. Meja dapur/binatu memakai stainless, area bengkel memakai beton, dan tekstil linen tetap terpisah dari area cuci. Semua aset tambahan memiliki base color, normal, roughness dan AO. Pintu, dinding, collision, reservasi akses dan jalur kamera mengambil geometri yang konsisten.

Denah SVG jaringan yang terbaru dihasilkan oleh `node tools/render-network-plans.mjs` dari ruang, perangkat dan lintasan kabel aplikasi. Dokumen DOCX menyimpan SVG asli dan PNG resolusi tinggi untuk kompatibilitas pembaca dokumen.
