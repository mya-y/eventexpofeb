// ===== CARA PASANG (sekali saja) =====
// 1. Buat Google Sheets baru (kosong) > menu Extensions > Apps Script (WAJIB dari dalam Sheets). Tempel seluruh isi file ini.
//    Jika script dibuat langsung dari script.google.com, isi ID_SHEETS di bawah dengan ID spreadsheet.
// 2. Project Settings (ikon roda gigi) > Script properties > Add: ADMIN_PASS = sandi panitia (pakai yang panjang).
// 3. Pilih fungsi "setup" di menu atas, klik Run, lalu izinkan akses. Tab "Pendaftar" + judul kolom dibuat otomatis.
// 4. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone > Deploy. Salin URL /exec ke js/config.js (appsScriptUrl).
// Setiap kali file ini diubah: Deploy > Manage deployments > Edit (ikon pensil) > Version: New version > Deploy.

const ID_SHEETS = "ID";

const HEAD = ["ID", "Waktu", "Lomba", "Sekolah", "Nama peserta", "Kelas", "Anggota tim", "WhatsApp peserta", "Pembina", "WhatsApp pembina", "Dikonfirmasi"];
const KOL_KONFIRMASI = HEAD.length; // kolom terakhir
const VERSI = 6; // naik setiap kode berubah; dipakai untuk memastikan deploy sudah yang terbaru

// ===== HARUS SAMA DENGAN js/config.js =====
// Nama lomba dan jumlah anggota tim (termasuk ketua). null = lomba individu.
const LOMBA = {
  "Cerdas Cermat Ekonomi": { min: 3, max: 3 },
  "Business Plan Pelajar": { min: 2, max: 3 },
  "Konten Kreatif Promosi Produk": null,
  "Desain Poster Digital": null,
};
// Batas otomatis penutupan. Tombol Buka/Tutup di panel admin selalu mengalahkan batas ini.
const TUTUP_DAFTAR = "2027-01-05T23:59:00+08:00";
const MAKS_GAGAL = 5; // batas salah sandi
const KUNCI_DETIK = 600; // lama login dikunci setelah terlalu banyak salah (10 menit)

const out = (o) => ContentService.createTextOutput(JSON.stringify(Object.assign({ v: VERSI }, o))).setMimeType(ContentService.MimeType.JSON);

// ---------- Pembersih input ----------
const teks = (v) => String(v == null ? "" : v).trim().slice(0, 200);
// Teks yang diawali = + - @ akan dibaca Sheets sebagai rumus. Awalan ' membuatnya tetap teks biasa.
const aman = (v) => {
  const s = teks(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
};
const digit = (v) => String(v || "").replace(/\D/g, "");
const hpOk = (v) => digit(v).length >= 9 && digit(v).length <= 15;

// Hanya satu permintaan yang boleh menulis ke Sheets pada satu waktu.
function denganKunci(fn) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    return fn();
  } finally {
    kunci.releaseLock();
  }
}

// ---------- Token login (tanpa cache, ditandatangani sandi admin, berlaku 1 jam) ----------
function sandiAdmin() {
  return PropertiesService.getScriptProperties().getProperty("ADMIN_PASS");
}
function tanda(isi) {
  const kunci = "mx|" + sandiAdmin();
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(isi, kunci));
}
function buatToken() {
  const habis = String(Date.now() + 3600 * 1000);
  return habis + "." + tanda(habis);
}
function tokenSah(t) {
  if (!t || !sandiAdmin()) return false;
  const bagian = String(t).split(".");
  return Number(bagian[0]) > Date.now() && bagian[1] === tanda(bagian[0]);
}

// ---------- Sheets ----------
function buku() {
  const id = ID_SHEETS || PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Script belum terhubung ke Google Sheets. Buat script lewat Extensions > Apps Script di dalam Sheets, atau isi ID_SHEETS di bagian atas Code.gs.");
  return ss;
}
function sheet() {
  const ss = buku();
  let s = ss.getSheetByName("Pendaftar");
  if (!s) s = ss.insertSheet("Pendaftar");
  if (s.getLastRow() === 0) {
    s.appendRow(HEAD);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, HEAD.length).setFontWeight("bold").setBackground("#14165f").setFontColor("#ffffff");
    s.getRange("B2:B").setNumberFormat("dd/MM/yyyy HH:mm");
  }
  return s;
}
function setup() {
  sheet();
}

// Halaman uji: buka URL /exec di browser, harus muncul "Server pendaftaran aktif (versi 6)".
// Dengan ?status=1 mengembalikan status buka/tutup pendaftaran (dipakai website publik).
function doGet(e) {
  if (e && e.parameter && e.parameter.status) return out({ ok: true, buka: pendaftaranBuka() });
  return ContentService.createTextOutput("Server pendaftaran aktif (versi " + VERSI + ")");
}

// Semua error dikembalikan sebagai JSON agar terbaca di halaman (bukan "Failed to fetch").
function doPost(e) {
  try {
    return proses(e);
  } catch (err) {
    return out({ ok: false, error: String((err && err.message) || err) });
  }
}

// ---------- Status buka/tutup pendaftaran ----------
// Properti "DAFTAR": "buka" = dipaksa buka, "tutup" = dipaksa tutup, kosong = ikut batas TUTUP_DAFTAR.
function pendaftaranBuka() {
  const manual = PropertiesService.getScriptProperties().getProperty("DAFTAR");
  if (manual === "buka") return true;
  if (manual === "tutup") return false;
  return new Date() <= new Date(TUTUP_DAFTAR);
}

// ---------- Pendaftaran (halaman publik) ----------
function daftar(d) {
  // Honeypot: kolom tersembunyi yang hanya diisi bot. Pura-pura berhasil supaya bot tidak mencoba lagi.
  if (d.catatan) return out({ ok: true });

  if (!pendaftaranBuka()) return out({ ok: false, error: "Pendaftaran sudah ditutup." });
  if (!Object.prototype.hasOwnProperty.call(LOMBA, d.lomba)) return out({ ok: false, error: "Lomba tidak dikenal." });

  const nama = teks(d.nama), sekolah = teks(d.sekolah), pembina = teks(d.pembina);
  if (nama.length < 3 || !sekolah || !pembina) return out({ ok: false, error: "Nama, sekolah, dan pembina wajib diisi." });
  if (["X", "XI", "XII"].indexOf(teks(d.kelas)) < 0) return out({ ok: false, error: "Kelas harus X, XI, atau XII." });
  if (!hpOk(d.wa) || !hpOk(d.wapembina)) return out({ ok: false, error: "Nomor WhatsApp peserta dan pembina tidak valid." });

  const tim = LOMBA[d.lomba];
  let anggota = "-";
  if (tim) {
    const daftarAnggota = teks(d.anggota).split(",").map((x) => x.trim()).filter(Boolean);
    if (daftarAnggota.length < tim.min - 1 || daftarAnggota.length > tim.max - 1)
      return out({ ok: false, error: "Jumlah anggota tim tidak sesuai ketentuan lomba." });
    anggota = daftarAnggota.join(", ");
  }

  denganKunci(() => {
    sheet().appendRow([
      Utilities.getUuid().slice(0, 8), new Date(), d.lomba, aman(sekolah), aman(nama), teks(d.kelas),
      aman(anggota), "'" + teks(d.wa), aman(pembina), "'" + teks(d.wapembina), "Belum",
    ]);
  });
  return out({ ok: true });
}

// ---------- Login panitia dengan pembatasan percobaan ----------
function login(d) {
  const sandi = sandiAdmin();
  if (!sandi) return out({ ok: false, error: "ADMIN_PASS belum diatur di Script properties." });

  const cache = CacheService.getScriptCache();
  const gagal = Number(cache.get("gagal") || 0);
  if (gagal >= MAKS_GAGAL) return out({ ok: false, error: "Terlalu banyak percobaan salah. Coba lagi dalam 10 menit." });

  if (String(d.password || "").trim() !== String(sandi).trim()) {
    cache.put("gagal", String(gagal + 1), KUNCI_DETIK);
    return out({ ok: false });
  }
  cache.remove("gagal");
  return out({ ok: true, token: buatToken() });
}

function proses(e) {
  const d = JSON.parse(e.postData.contents);

  if (d.action === "daftar") return daftar(d);
  if (d.action === "login") return login(d);

  // Semua aksi di bawah ini butuh token hasil login
  if (!tokenSah(d.token)) return out({ ok: false, error: "Sesi tidak valid atau sudah habis. Silakan login ulang." });
  const s = sheet();

  if (d.action === "list") {
    return out({ ok: true, buka: pendaftaranBuka(), rows: s.getDataRange().getDisplayValues().slice(1).reverse() });
  }
  if (d.action === "atur") {
    PropertiesService.getScriptProperties().setProperty("DAFTAR", d.buka ? "buka" : "tutup");
    return out({ ok: true, buka: pendaftaranBuka() });
  }
  if (d.action === "konfirmasi" || d.action === "hapus") {
    return denganKunci(() => {
      const n = s.getLastRow() - 1;
      if (n < 1) return out({ ok: false });
      const i = s.getRange(2, 1, n, 1).getValues().flat().indexOf(d.id);
      if (i < 0) return out({ ok: false });
      if (d.action === "hapus") s.deleteRow(i + 2);
      else if (d.value === "Belum" || d.value === "Sudah") s.getRange(i + 2, KOL_KONFIRMASI).setValue(d.value);
      return out({ ok: true });
    });
  }
  return out({ ok: false, error: "Aksi tidak dikenal: " + d.action });
}