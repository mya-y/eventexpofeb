const $ = (s) => document.querySelector(s);
const toast = (t) => {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
};
const esc = (c) => String(c).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);

// Kolom: 0 ID,1 Waktu,2 Lomba,3 Sekolah,4 Nama,5 Kelas,6 Anggota,7 WA peserta,8 Pembina,9 WA pembina,10 Dikonfirmasi (Belum | Sudah)
const HALAMAN = 20;
let rows = [];
let batas = HALAMAN;
const terbuka = new Set();

let bukaDaftar = true;
const tampilStatus = () => {
  $("#stBuka").innerHTML = `<b>Status pendaftaran:</b> ${bukaDaftar ? "DIBUKA" : "DITUTUP"}`;
  $("#toggleDaftar").textContent = bukaDaftar ? "Tutup pendaftaran" : "Buka pendaftaran";
};

const galat = (t) => {
  const g = $("#galat");
  g.textContent = t || "";
  g.hidden = !t;
};

/* ---------- Data: mode demo (browser) atau Apps Script ---------- */
function demoApi(b) {
  if (b.action === "login") return b.password === CONFIG.demoPassword ? { ok: true, token: "demo" } : { ok: false };
  if (b.token !== "demo") return { ok: false };
  let db = CONFIG.demoDb();
  if (b.action === "konfirmasi")
    db = db.map((r) => {
      if (r[0] !== b.id) return r;
      r = [...r];
      r[10] = b.value;
      return r;
    });
  if (b.action === "hapus") db = db.filter((r) => r[0] !== b.id);
  if (b.action !== "list") CONFIG.demoSave(db);
  return { ok: true, rows: db };
}
const api = async (b) => {
  b.token = b.token || sessionStorage.getItem("tk");
  if (CONFIG.demo) return demoApi(b);
  return (await fetch(CONFIG.appsScriptUrl, { method: "POST", body: JSON.stringify(b) })).json();
};

/* ---------- Pembantu ---------- */
const hitung = (idx) => rows.reduce((o, r) => ((o[r[idx]] = (o[r[idx]] || 0) + 1), o), {});
const bars = (o, n = 99) => {
  const e = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const m = Math.max(1, ...e.map((x) => x[1]));
  return (
    e.map(([k, v]) => `<div class="bb"><span>${esc(k)}</span><i style="--w:${(v / m) * 100}%"></i><b>${v}</b></div>`).join("") ||
    "<p class='hint'>Belum ada data.</p>"
  );
};
const wa = (n) => {
  n = String(n).replace(/\D/g, "");
  return n.startsWith("0") ? "62" + n.slice(1) : n;
};
const tersaring = () => {
  const q = $("#cari").value.toLowerCase();
  const l = $("#fLomba").value;
  const k = $("#fKonf").value;
  return rows.filter(
    (r) => (!l || r[2] === l) && (!k || r[10] === k) && (!q || [r[3], r[4], r[8]].join(" ").toLowerCase().includes(q)),
  );
};

/* ---------- Tampilan ---------- */
function barisHtml(r) {
  const sudah = r[10] === "Sudah";
  return `<tr data-id="${esc(r[0])}"${terbuka.has(r[0]) ? ' class="buka"' : ""}>
<td class="rgk"><b>${esc(r[4])}</b><span>${esc(r[3])} · ${esc(r[2])}</span><i class="pil${sudah ? " ok" : ""}">${sudah ? "Sudah dikonfirmasi" : "Belum dikonfirmasi"}</i></td>
<td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td>
<td>${esc(r[4])}<small>Kelas ${esc(r[5])}${r[6] !== "-" ? " · Tim: " + esc(r[6]) : ""}</small><small>Pembina: ${esc(r[8])}</small></td>
<td><button class="btn btn-sm${sudah ? "" : " btn-out"}" data-konf>${sudah ? "✓ Sudah dikonfirmasi" : "Tandai dikonfirmasi"}</button></td>
<td class="aks"><a class="btn btn-sm btn-out" href="https://wa.me/${wa(r[7])}" target="_blank" rel="noopener">WA peserta</a><a class="btn btn-sm btn-out" href="https://wa.me/${wa(r[9])}" target="_blank" rel="noopener">WA pembina</a><button class="btn btn-sm btn-out" data-hapus>Hapus</button></td></tr>`;
}

function render() {
  const sudah = rows.filter((r) => r[10] === "Sudah").length;
  const sekolah = new Set(rows.map((r) => String(r[3]).toLowerCase())).size;
  $("#stats").innerHTML = [
    ["Total pendaftar", rows.length],
    ["Sudah dikonfirmasi", sudah],
    ["Belum dikonfirmasi", rows.length - sudah],
    ["Sekolah", sekolah],
  ].map((x) => `<div class="stat"><b>${x[1]}</b>${x[0]}</div>`).join("");
  $("#barLomba").innerHTML = bars(hitung(2));
  $("#barSekolah").innerHTML = bars(hitung(3), 5);

  const semua = tersaring();
  const tampil = semua.slice(0, batas);
  $("#info").textContent = `Menampilkan ${tampil.length} dari ${semua.length} pendaftar`;
  $("#more").hidden = tampil.length >= semua.length;
  $("#more").textContent = `Tampilkan ${Math.min(HALAMAN, semua.length - tampil.length)} lagi`;
  $("#tbody").innerHTML = tampil.map(barisHtml).join("") || `<tr class="buka"><td colspan="6">Tidak ada data yang cocok.</td></tr>`;
}

async function muat() {
  try {
    const j = await api({ action: "list" });
    if (!j.ok) throw new Error((j.error || "Server menolak permintaan.") + (j.v ? ` [versi server ${j.v}]` : " [server belum memakai Code.gs terbaru: deploy ulang sebagai Versi baru]"));
    if (!Array.isArray(j.rows)) throw new Error("Format data dari server tidak sesuai. Tempel ulang Code.gs terbaru lalu deploy versi baru.");
    // Pastikan tiap baris punya 11 kolom agar tidak error pada data lama
    rows = j.rows.map((r) => (r.length >= 11 ? r : [...r, ...Array(11 - r.length).fill("")]));
    bukaDaftar = j.buka !== false;
    tampilStatus();
    $("#login").hidden = true;
    $("#dash").hidden = false;
    render();
  } catch (err) {
    console.error(err);
    sessionStorage.removeItem("tk");
    $("#dash").hidden = true;
    $("#login").hidden = false;
    galat("Gagal memuat data: " + err.message);
  }
}

/* ---------- Event ---------- */
$("#fLomba").innerHTML = '<option value="">Semua lomba</option>' + CONFIG.lomba.map((l) => `<option>${l.nama}</option>`).join("");
if (CONFIG.demo) {
  $("#noteLogin").hidden = false;
  $("#noteDemo").hidden = false;
}

$("#fLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  galat("");
  try {
    const j = await api({ action: "login", password: $("#pw").value, token: "-" });
    if (!j.ok) return galat(j.error || "Kata sandi salah.");
    sessionStorage.setItem("tk", j.token);
    $("#pw").value = "";
    await muat();
  } catch (x) {
    console.error(x);
    galat("Tidak bisa terhubung ke server. Cek appsScriptUrl di config.js dan pengaturan deploy (Who has access: Anyone).");
  }
});
["#cari", "#fLomba", "#fKonf"].forEach((s) =>
  $(s).addEventListener("input", () => {
    batas = HALAMAN;
    render();
  }),
);
$("#more").addEventListener("click", () => {
  batas += HALAMAN;
  render();
});

$("#toggleDaftar").addEventListener("click", async () => {
  try {
    const j = await api({ action: "atur", buka: !bukaDaftar });
    if (!j.ok) return toast("Gagal mengubah status.");
    bukaDaftar = typeof j.buka === "boolean" ? j.buka : !bukaDaftar;
    tampilStatus();
    toast(bukaDaftar ? "Pendaftaran dibuka." : "Pendaftaran ditutup.");
  } catch (x) {
    toast("Gagal terhubung ke server.");
  }
});
$("#muat").addEventListener("click", muat);
$("#keluar").addEventListener("click", () => {
  sessionStorage.removeItem("tk");
  location.reload();
});

const cariBaris = (el) => rows.find((x) => x[0] === el.closest("tr").dataset.id);
$("#tbody").addEventListener("click", async (e) => {
  // Di HP: ketuk ringkasan untuk membuka/menutup detail
  const ringkas = e.target.closest(".rgk");
  if (ringkas) {
    const tr = ringkas.closest("tr");
    tr.classList.toggle("buka");
    if (tr.classList.contains("buka")) terbuka.add(tr.dataset.id);
    else terbuka.delete(tr.dataset.id);
    return;
  }
  const d = e.target.dataset;
  if (!d || !e.target.closest("tr") || !e.target.closest("tr").dataset.id) return;
  const r = cariBaris(e.target);
  if ("konf" in d) {
    r[10] = r[10] === "Sudah" ? "Belum" : "Sudah";
    render();
    const j = await api({ action: "konfirmasi", id: r[0], value: r[10] });
    if (!j.ok) toast("Gagal menyimpan perubahan.");
  }
  if ("hapus" in d) {
    if (!confirm(`Hapus pendaftaran ${r[4]}?`)) return;
    const j = await api({ action: "hapus", id: r[0] });
    if (j.ok) {
      rows = rows.filter((x) => x[0] !== r[0]);
      render();
      toast("Data dihapus.");
    } else toast("Gagal menghapus.");
  }
});
$("#csv").addEventListener("click", () => {
  const q = (c) => `"${String(c).replace(/"/g, '""')}"`;
  const txt = [CONFIG.kolom, ...tersaring()].map((r) => r.slice(1).map(q).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + txt], { type: "text/csv" }));
  a.download = "pendaftar.csv";
  a.click();
});
if (sessionStorage.getItem("tk")) muat();
window.adminSiap = true;