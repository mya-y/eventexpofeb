// ===== PENGATURAN: ubah di sini saja =====
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxPeBz1Qds4I9U9M3tZGdp0CX2nmZ4wp3R_RpA0hEse_jfKrruQV1Mr-animySSqOc3/exec",          // isi dengan URL Web App Google Apps Script (lihat README). Kosong = mode demo.
  WA_PANITIA: "6285641826833" // nomor narahubung, format 62xxxxxxxxxx
};

// Data contoh untuk mode demo. Saat SCRIPT_URL terisi, data dibaca dari Google Sheets.
const SAMPLE = [
  {id:"E01",nama:"Seminar Bisnis Digital: Jualan Lewat Marketplace",tanggal:"2026-11-14",lokasi:"Aula FEB",deskripsi:"Strategi toko online untuk UMKM lokal bersama praktisi marketplace.",tingkat:"bem",peserta:"mahasiswa",kuota:150,terdaftar:62},
  {id:"E02",nama:"Pelatihan Excel untuk Laporan Keuangan",tanggal:"2026-11-18",lokasi:"Laboratorium Komputer 1",deskripsi:"Rumus, tabel pivot, dan jurnal sederhana. Bawa laptop.",tingkat:"himpunan",peserta:"mahasiswa",kuota:40,terdaftar:40},
  {id:"E03",nama:"Lomba Poster Ilmiah Mahasiswa FEB",tanggal:"2026-11-21",lokasi:"Daring dan Aula FEB",deskripsi:"Poster A3 bertema ekonomi kreatif dan bisnis berkelanjutan.",tingkat:"fakultas",peserta:"mahasiswa",kuota:60,terdaftar:18},
  {id:"E04",nama:"Festival Bulan Bahasa: Lomba Pidato dan Puisi",tanggal:"2026-12-05",lokasi:"Auditorium UMS Rappang",deskripsi:"Terbuka untuk siswa SD, SMP, dan SMA/SMK se-Sidrap. Satu sekolah boleh mengirim beberapa peserta.",tingkat:"sekolah",peserta:"pelajar",kuota:200,terdaftar:74},
  {id:"E05",nama:"Kompetisi Rencana Bisnis Siswa SMA/SMK",tanggal:"2026-12-12",lokasi:"Aula FEB",deskripsi:"Tim 2-3 siswa mempresentasikan ide usaha di depan juri dosen.",tingkat:"sekolah",peserta:"pelajar",kuota:30,terdaftar:9}
];
const TINGKAT = {semua:"Semua",fakultas:"Fakultas",bem:"BEM",himpunan:"Himpunan prodi",sekolah:"Undangan sekolah"};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (d, o) => new Intl.DateTimeFormat("id-ID", o).format(new Date(d + "T00:00:00"));
const state = {events: [], filter: "semua", current: null};

function status(e) {
  const deadline = new Date((e.batas || e.tanggal) + "T23:59:59");
  if (deadline < new Date()) return {open: false, text: "Pendaftaran ditutup"};
  if (e.terdaftar >= e.kuota) return {open: false, text: "Kuota penuh"};
  return {open: true, text: `Sisa ${e.kuota - e.terdaftar} dari ${e.kuota} kursi`};
}

function ticket(e, featured) {
  const s = status(e);
  return `<article class="ticket${featured ? " feat" : ""}" data-t="${esc(e.tingkat)}">
    <div class="stub"><b>${fmt(e.tanggal, {day: "numeric"})}</b><span>${fmt(e.tanggal, {month: "short", year: "numeric"})}</span></div>
    <div class="body"><span class="tag">${esc(TINGKAT[e.tingkat] || e.tingkat)} &middot; untuk ${e.peserta === "pelajar" ? "pelajar" : "mahasiswa"}</span>
      <h3>${esc(e.nama)}</h3><p>${esc(e.lokasi)}</p><p class="muted">${esc(e.deskripsi)}</p>
      ${featured ? `<div class="count" id="count" aria-label="Hitung mundur"></div>` : ""}</div>
    <div class="side"><span>${s.text}</span>
      <button class="btn" data-id="${esc(e.id)}" ${s.open ? "" : "disabled"}>Daftar</button></div></article>`;
}

function render() {
  const up = state.events.filter(e => new Date(e.tanggal + "T23:59:59") >= new Date()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  $("#featured").outerHTML = up.length
    ? ticket(up[0], true).replace("<article", '<aside id="featured"').replace("</article>", "</aside>")
    : '<aside id="featured" class="ticket feat"><div class="body"><h3>Belum ada kegiatan terjadwal</h3><p class="muted">Pantau halaman ini untuk agenda berikutnya.</p></div></aside>';
  const shown = state.events.filter(e => state.filter === "semua" || e.tingkat === state.filter).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  $("#list").innerHTML = shown.length ? shown.map(e => ticket(e)).join("")
    : '<p class="empty">Belum ada kegiatan di kategori ini. Coba pilih kategori lain.</p>';
  tick();
}

function tick() {
  const box = $("#count"); if (!box) return;
  const e = state.events.filter(x => new Date(x.tanggal + "T23:59:59") >= new Date()).sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0];
  const ms = Math.max(0, new Date(e.tanggal + "T00:00:00") - new Date());
  const v = [[Math.floor(ms / 864e5), "hari"], [Math.floor(ms % 864e5 / 36e5), "jam"], [Math.floor(ms % 36e5 / 6e4), "menit"]];
  box.innerHTML = v.map(([n, l]) => `<div>${n}<small>${l}</small></div>`).join("");
}

function tabs() {
  const t = $(".tabs");
  t.innerHTML = Object.entries(TINGKAT).map(([k, v]) => `<button role="tab" data-f="${k}" aria-selected="${k === state.filter}">${v}</button>`).join("");
  t.onclick = ev => { const b = ev.target.closest("button"); if (!b) return; state.filter = b.dataset.f; tabs(); render(); };
}

function openForm(id) {
  const e = state.events.find(x => x.id === id); if (!e) return;
  state.current = e;
  const f = $("#form"); f.reset(); f.hidden = false; $("#done").hidden = true; $("#err").hidden = true;
  $("#dTitle").textContent = e.nama;
  $("#dMeta").textContent = `${fmt(e.tanggal, {weekday: "long", day: "numeric", month: "long", year: "numeric"})} · ${e.lokasi}`;
  const only = e.peserta; // "mahasiswa" atau "pelajar": kegiatan tertentu hanya untuk satu kelompok
  f.jenis.forEach(r => { r.checked = r.value === only; r.disabled = false; });
  $("#who").hidden = true;
  switchJenis(only);
  $("#dlg").showModal();
}
function switchJenis(j) {
  document.querySelectorAll("[data-for]").forEach(d => d.hidden = d.dataset.for !== j);
}

function validate(d) {
  if (d.website) return "Pendaftaran tidak dapat diproses.";
  if (d.nama.length < 3) return "Isi nama lengkap, minimal 3 huruf.";
  if (d.jenis === "mahasiswa") {
    if (!/^\d{6,15}$/.test(d.nim)) return "NIM hanya angka, 6 sampai 15 digit.";
    if (!d.prodi) return "Isi program studi.";
  } else {
    if (!d.sekolah) return "Isi asal sekolah.";
    if (!d.jenjang) return "Pilih jenjang sekolah.";
    if (!d.pendamping) return "Isi nama guru pendamping.";
  }
  if (!/^(\+62|62|0)8\d{8,11}$/.test(d.hp.replace(/[\s-]/g, ""))) return "Nomor WhatsApp harus diawali 08 atau +62 dan terdiri dari 10 sampai 13 digit.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return "Format email belum benar. Contoh: nama@gmail.com";
  return "";
}

async function submit(ev) {
  ev.preventDefault();
  const f = $("#form"), btn = $("#send"), err = $("#err");
  const d = Object.fromEntries(new FormData(f).entries());
  d.jenis = state.current.peserta;
  Object.keys(d).forEach(k => d[k] = String(d[k]).trim());
  d.event_id = state.current.id; d.event_nama = state.current.nama;
  const msg = validate(d);
  if (msg) { err.textContent = msg; err.hidden = false; return; }
  err.hidden = true; btn.disabled = true; btn.textContent = "Mengirim…";
  try {
    const res = CONFIG.SCRIPT_URL ? await sendRemote(d) : sendDemo(d);
    if (!res.ok) throw new Error(res.pesan || "Pendaftaran gagal.");
    f.hidden = true; $("#done").hidden = false;
    $("#code").textContent = res.kode; $("#doneEv").textContent = state.current.nama;
    state.current.terdaftar++; render();
  } catch (x) {
    err.textContent = x.message === "Failed to fetch" ? "Tidak ada koneksi ke server. Periksa internet Anda lalu kirim lagi." : x.message;
    err.hidden = false;
  } finally { btn.disabled = false; btn.textContent = "Kirim pendaftaran"; }
}

async function sendRemote(d) {
  const r = await fetch(CONFIG.SCRIPT_URL, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(d)});
  return r.json();
}
function sendDemo(d) {
  const all = JSON.parse(localStorage.getItem("feb_reg") || "[]");
  if (all.some(x => x.event_id === d.event_id && x.email.toLowerCase() === d.email.toLowerCase()))
    return {ok: false, pesan: "Email ini sudah terdaftar di kegiatan tersebut."};
  const kode = d.event_id + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  all.push({...d, kode, waktu: new Date().toISOString()});
  localStorage.setItem("feb_reg", JSON.stringify(all));
  return {ok: true, kode};
}

async function init() {
  $("#waLink").href = "6285641826833" + CONFIG.WA_PANITIA;
  state.events = SAMPLE;
  if (CONFIG.SCRIPT_URL) {
    try { state.events = (await (await fetch(CONFIG.SCRIPT_URL)).json()).events; }
    catch { $("#list").innerHTML = '<p class="empty">Data kegiatan belum bisa dimuat. Muat ulang halaman atau hubungi panitia.</p>'; return; }
  } else $("#demoNote").hidden = false;
  tabs(); render(); setInterval(tick, 60000);
}

document.addEventListener("click", e => {
  const b = e.target.closest("button[data-id]"); if (b) openForm(b.dataset.id);
  if (e.target.id === "close" || e.target.id === "close2") $("#dlg").close();
});
$("#form").addEventListener("submit", submit);
init();
