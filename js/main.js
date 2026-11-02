const $ = (s) => document.querySelector(s);
const toast = (t) => {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
};
const C = CONFIG;
const fmtTim = (t) => (t ? (t.min === t.max ? `Tim ${t.min} orang` : `Tim ${t.min}–${t.max} orang`) : "Individu");
const cariLomba = () => C.lomba.find((l) => l.nama === $("#selLomba").value);

$("#namaHima").textContent = C.namaHima;
$("#infoTgl").textContent = new Date(C.tanggalAcara).toLocaleDateString("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

$("#listLomba").innerHTML = C.lomba
  .map(
    (l) =>
      `<a href="#daftar" data-lomba="${l.nama}"><div><h3>${l.nama}</h3><p>${fmtTim(l.tim)} · ${l.info}</p></div><span class="chip">${l.hadiah} →</span></a>`,
  )
  .join("");
$("#listProdi").innerHTML = C.prodi.map((p) => `<article><h3>${p.nama}</h3><p>${p.isi}</p></article>`).join("");
$("#listRundown").innerHTML = C.rundown.map((r) => `<article><h3>${r[0]}</h3><p>${r[1]}</p></article>`).join("");
$("#listKontak").innerHTML = C.kontak
  .map(
    (k) =>
      `<li><strong>${k.nama}</strong><a class="btn btn-sm" href="https://wa.me/${k.wa}" target="_blank" rel="noopener">Chat WhatsApp</a></li>`,
  )
  .join("");
$("#listFaq").innerHTML = C.faq.map((f) => `<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join("");
$("#selLomba").innerHTML =
  '<option value="">Pilih lomba</option>' + C.lomba.map((l) => `<option>${l.nama}</option>`).join("");

// Form menyesuaikan jenis lomba: kolom anggota hanya untuk lomba tim
const gantiLomba = () => {
  const t = (cariLomba() || {}).tim;
  $("#boxTim").hidden = !t;
  $("[name=anggota]").required = !!t;
  $("#lblNama").textContent = t ? "Nama ketua tim" : "Nama lengkap peserta";
  $("#hintTim").textContent = t ? `${fmtTim(t)}. Tulis nama anggota selain ketua, pisahkan dengan koma.` : "";
};
$("#selLomba").addEventListener("change", gantiLomba);
$("#listLomba").addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  $("#selLomba").value = a.dataset.lomba;
  gantiLomba();
});
gantiLomba();

const tick = () => {
  const s = Math.max(0, new Date(C.tanggalAcara) - new Date());
  const p = (n) => String(n).padStart(2, "0");
  $("#cdH").textContent = p(Math.floor(s / 864e5));
  $("#cdJ").textContent = p(Math.floor(s / 36e5) % 24);
  $("#cdM").textContent = p(Math.floor(s / 6e4) % 60);
  $("#cdD").textContent = p(Math.floor(s / 1e3) % 60);
};
tick();
setInterval(tick, 1000);

const kunciForm = (tutup) => {
  $("#formWrap").classList.toggle("tertutup", tutup);
  $("#tutupBox").hidden = !tutup;
  $("#form").querySelectorAll("input,select,textarea,button").forEach((el) => (el.disabled = tutup));
  $("#stDaftar").textContent = tutup
    ? "Pendaftaran Belum Dibuka. Hubungi panitia jika ada kendala."
    : "Semua kolom wajib diisi. Konfirmasi dikirim lewat WhatsApp.";
};
if (C.demo) {
  if (new Date() > new Date(C.tutupDaftar)) kunciForm(true);
} else {
  fetch(C.appsScriptUrl + "?status=1")
    .then((r) => r.json())
    .then((j) => { if (j.ok && j.buka === false) kunciForm(true); })
    .catch(() => {});
}

const noHpOk = (v) => /^(\+62|62|0)8\d{8,11}$/.test(v.replace(/[\s-]/g, ""));
$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  if (!f.checkValidity()) {
    f.reportValidity();
    return;
  }
  if (!noHpOk(f.elements.wa.value) || !noHpOk(f.elements.wapembina.value)) {
    toast("Nomor WhatsApp peserta dan pembina harus benar.");
    return;
  }
  const t = (cariLomba() || {}).tim;
  if (t) {
    const n = f.elements.anggota.value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean).length;
    if (n < t.min - 1 || n > t.max - 1) {
      toast(`Isi ${t.min - 1}${t.max > t.min ? "–" + (t.max - 1) : ""} nama anggota, pisahkan dengan koma.`);
      return;
    }
  }
  const btn = $("#kirim");
  btn.disabled = true;
  btn.textContent = "Mengirim...";
  try {
    const data = Object.fromEntries(new FormData(f));
    data.action = "daftar";
    if (!t) data.anggota = "";
    if (C.demo) {
      const db = C.demoDb();
      db.unshift(C.barisDari(data));
      C.demoSave(db);
    } else {
      const r = await fetch(C.appsScriptUrl, { method: "POST", body: JSON.stringify(data) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
    }
    f.reset();
    gantiLomba();
    toast(
      C.demo
        ? "Terkirim (mode demo). Lihat di panel panitia."
        : "Pendaftaran terkirim. Tunggu konfirmasi lewat WhatsApp.",
    );
    } catch (err) {
    toast(err.message && err.message !== "Failed to fetch" ? err.message : "Gagal mengirim. Periksa koneksi lalu coba lagi.");
    }
  btn.disabled = false;
  btn.textContent = "Kirim pendaftaran";
});

// Menu hamburger (HP)
const menuBtn = $("#menuBtn");
const nav = $("#nav");
const tutupMenu = () => {
  nav.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");
};
menuBtn.addEventListener("click", () => {
  const buka = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(buka));
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") tutupMenu();
});