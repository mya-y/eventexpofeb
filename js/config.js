// Semua isi acara diubah di sini. Tidak perlu menyentuh HTML.
const CONFIG = {
 
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxPeBz1Qds4I9U9M3tZGdp0CX2nmZ4wp3R_RpA0hEse_jfKrruQV1Mr-animySSqOc3/exec",
  demoPassword: "admin123",
  namaHima: "FEB UMS RAPPANG",
  tanggalAcara: "2027-01-12T08:00:00+08:00",
  tutupDaftar: "2027-01-05T23:59:00+08:00",
  // tim: null = lomba individu | { min, max } = lomba tim (jumlah anggota termasuk ketua)
  lomba: [
    {
      nama: "Cerdas Cermat Ekonomi",
      tim: { min: 3, max: 3 },
      info: "penyisihan tertulis dan final lisan",
      hadiah: "Juara 1–3 + sertifikat fisik",
    },
    {
      nama: "Business Plan Pelajar",
      tim: { min: 2, max: 3 },
      info: "presentasi ide usaha 7 menit",
      hadiah: "Juara 1–3 + sertifikat fisik",
    },
    {
      nama: "Konten Kreatif Promosi Produk",
      tim: null,
      info: "video pendek maks. 60 detik",
      hadiah: "Juara 1–3 + sertifikat fisik",
    },
    { nama: "Desain Poster Digital", tim: null, info: "tema kewirausahaan muda", hadiah: "Juara 1–3 + sertifikat fisik" },
  ],
  prodi: [
    { nama: "S1 Bisnis Digital", isi: "Mini toko online, coba buat landing page, dan demo analitik media sosial." },
    { nama: "S1 Kewirausahaan", isi: "Bazar mini produk lokal, kelas pitching 5 menit, dan konsultasi ide usaha." },
    { nama: "S1 Hukum Bisnis", isi: "Simulasi sengketa kontrak, tanya jawab legalitas usaha, dan info karier hukum." },
  ],
  rundown: [
    ["08.00", "Registrasi ulang dan pembukaan stan expo"],
    ["09.00", "Pembukaan dan sambutan milad"],
    ["09.30", "Babak penyisihan lomba"],
    ["12.00", "Ishoma dan kunjungan stan prodi"],
    ["13.30", "Final lomba dan talkshow alumni"],
    ["15.30", "Pengumuman juara dan penutupan"],
  ],
  faq: [
    [
      "Siapa yang boleh ikut?",
      "Siswa kelas X–XII SMA, SMK, dan MA di Kabupaten Sidenreng Rappang. Satu sekolah boleh mengirim lebih dari satu peserta atau tim.",
    ],
    ["Apakah ada biaya pendaftaran?", "Tidak ada. Seluruh lomba dan kunjungan expo gratis."],
    [
      "Boleh ikut lebih dari satu lomba?",
      "Boleh, selama jadwal babak penyisihannya tidak bentrok. Daftarkan tiap lomba secara terpisah.",
    ],
    [
      "Apa yang harus dibawa saat hari H?",
      "Kartu pelajar, surat tugas dari sekolah, dan perangkat sendiri untuk lomba konten dan poster.",
    ],
    [
      "Kapan sertifikat diterima?",
      "Juara 1–3 menerima sertifikat fisik saat penutupan acara. Peserta lain menerima sertifikat dalam bentuk PDF yang dikirim panitia lewat WhatsApp setelah acara selesai.",
    ],
  ],
  kontak: [
    { nama: "Andi Nurfadillah (Ketua Panitia)", wa: "6281234567801" },
    { nama: "Muh. Rizky (Sekretaris)", wa: "6281234567802" },
  ],
  kolom: ["ID", "Waktu", "Lomba", "Sekolah", "Nama peserta", "Kelas", "Anggota tim", "WhatsApp peserta", "Pembina", "WhatsApp pembina", "Dikonfirmasi"],
  sampel: [
    [
      "10/11/2026 08.14",
      "Cerdas Cermat Ekonomi",
      "SMAN 1 Sidrap",
      "Nurul Aisyah",
      "XI",
      "Dinda, Fajar",
      "081300000001",
      "Hj. Rahmawati, S.Pd.",
      "081300000011",
    ],
    [
      "10/11/2026 09.40",
      "Business Plan Pelajar",
      "SMKN 2 Sidrap",
      "Muh. Akbar",
      "XII",
      "Reski, Wawan",
      "081300000002",
      "Ir. Sudirman",
      "081300000012",
    ],
    [
      "11/11/2026 13.05",
      "Konten Kreatif Promosi Produk",
      "SMA Muhammadiyah Rappang",
      "Salsabila",
      "X",
      "-",
      "081300000003",
      "Nurhayati, S.Pd.",
      "081300000013",
    ],
    [
      "12/11/2026 10.22",
      "Desain Poster Digital",
      "MAN Sidrap",
      "Ahmad Fauzan",
      "XI",
      "-",
      "081300000004",
      "Ust. Hamzah",
      "081300000014",
    ],
    [
      "13/11/2026 16.51",
      "Cerdas Cermat Ekonomi",
      "SMKN 1 Pangkajene",
      "Andi Tenri",
      "XII",
      "Ayu, Basri",
      "081300000005",
      "Dra. Marwiyah",
      "081300000015",
    ],
    [
      "14/11/2026 07.30",
      "Business Plan Pelajar",
      "SMAN 2 Sidrap",
      "Cahya Pratiwi",
      "XI",
      "Lina",
      "081300000006",
      "Syamsul, S.Pd.",
      "081300000016",
    ],
  ].map((r, i) => ["s" + (i + 1), ...r, ["Sudah", "Sudah", "Belum", "Belum", "Sudah", "Belum"][i]])
};
CONFIG.demo = CONFIG.appsScriptUrl.startsWith("GANTI");
CONFIG.barisDari = (d) => [
  "d" + Date.now().toString(36),
  new Date().toLocaleString("id-ID"),
  d.lomba,
  d.sekolah,
  d.nama,
  d.kelas,
  (d.anggota || "").trim() || "-",
  d.wa,
  d.pembina,
  d.wapembina,
  "Belum",
];
CONFIG.demoDb = () => {
  const j = localStorage.getItem("demo_db2");
  return j ? JSON.parse(j) : CONFIG.sampel.map((r) => [...r]);
};
CONFIG.demoSave = (db) => localStorage.setItem("demo_db2", JSON.stringify(db));