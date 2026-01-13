// =============================
// SPK TOPSIS (LOGIN + AUTO W + AUTO X + BACKEND API)
// =============================

// Template awal: kriteria sudah ada, bobot default 0/"" (boleh kamu ubah)
const TEMPLATE = {
  criteria: [
    { code: "C1", name: "Harga",                  weight: 5, type: "cost"    },
    { code: "C2", name: "Brand",                  weight: 2, type: "benefit" },
    { code: "C3", name: "Komposisi",              weight: 3, type: "benefit" },
    { code: "C4", name: "Tingkat Estetika Botol", weight: 1, type: "benefit" },
    { code: "C5", name: "Ketersediaan",           weight: 5, type: "benefit" }
  ],
  alternatives: [
    { code: "A1", name: "Wine Merah", values: ["","","","",""] },
    { code: "A2", name: "Vodka",      values: ["","","","",""] },
    { code: "A3", name: "Baileys",    values: ["","","","",""] },
    { code: "A4", name: "Tequila",    values: ["","","","",""] },
    { code: "A5", name: "Aperol",     values: ["","","","",""] }
  ]
};

let state = structuredClone(TEMPLATE);

// ---------- Helpers ----------
function $(id) { return document.getElementById(id); }

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(x, d = 3) {
  if (x === null || x === undefined || !Number.isFinite(Number(x))) return "-";
  return Number(x).toFixed(d);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- W (bobot normalisasi) ----------
function getNormalizedWeights() {
  const weights = state.criteria.map(c => safeNum(c.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return weights.map(() => null);
  return weights.map(w => w / total);
}

// ---------- AUTO-FILL X dari bobot angka ----------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function autofillXFromWeights({ overwriteEmptyOnly = true } = {}) {
  // bobot dipakai sebagai "baseline", lalu dibuat variasi antar alternatif
  const weights = state.criteria.map(c => safeNum(c.weight));

  state.alternatives.forEach((alt, i) => {
    alt.values = alt.values.map((val, j) => {
      const isEmpty = (val === "" || val === null || val === undefined);

      // variasi antar alternatif (A1..A5)
      // pola: -0.4, -0.2, 0, +0.2, +0.4
      const delta = (i - 2) * 0.2;

      // baseline dari bobot (dibuat skala 1..5)
      // kalau bobot user besar, baseline mendekati 5
      const maxW = Math.max(...weights, 1);
      const baseline = (weights[j] / maxW) * 5;

      const autoValue = clamp(baseline + delta, 1, 5);

      if (overwriteEmptyOnly) return isEmpty ? String(autoValue.toFixed(2)) : val;
      return String(autoValue.toFixed(2));
    });
  });
}



// ---------- Render Kriteria ----------
function renderCriteria() {
  const tbody = $("tbodyKriteria");
  if (!tbody) return;

  const W = getNormalizedWeights();
  tbody.innerHTML = "";

  state.criteria.forEach((c, idx) => {
    const wText = (W[idx] === null) ? "-" : fmt(W[idx], 3);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${c.code}</b></td>
      <td><input type="text" value="${escapeHtml(c.name)}" data-role="cname" data-idx="${idx}"></td>
      <td><input type="number" min="0" step="1" value="${c.weight}" data-role="cweight" data-idx="${idx}"></td>
      <td><b>${wText}</b></td>
      <td>
        <select data-role="ctype" data-idx="${idx}">
          <option value="benefit" ${c.type === "benefit" ? "selected" : ""}>Benefit</option>
          <option value="cost" ${c.type === "cost" ? "selected" : ""}>Cost</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Event update kriteria
  tbody.querySelectorAll("input,select").forEach(el => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      const role = e.target.dataset.role;

      if (role === "cname") state.criteria[idx].name = e.target.value;
      if (role === "cweight") state.criteria[idx].weight = safeNum(e.target.value);
      if (role === "ctype") state.criteria[idx].type = e.target.value;

      // auto isi matriks X berdasarkan bobot terbaru (hanya yang masih kosong)
      autofillXFromWeights({ overwriteEmptyOnly: true });

      renderCriteria(); // biar W berubah real-time
      renderMatrixX();  // refresh tabel X
    });
  });
}

// ---------- Render Matriks X ----------
function renderMatrixX() {
  const thead = $("theadX");
  const tbody = $("tbodyX");
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      <th style="width:90px;">Kode</th>
      <th style="min-width:220px;">Nama Alternatif</th>
      ${state.criteria.map(c => `
        <th>
          ${c.code}
          <div class="small-muted">${escapeHtml(c.name)}</div>
        </th>
      `).join("")}
    </tr>
  `;

  tbody.innerHTML = "";
  state.alternatives.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${a.code}</b></td>
      <td><input type="text" value="${escapeHtml(a.name)}" data-role="aname" data-i="${i}"></td>
      ${a.values.map((v, j) => `
        <td>
          <input type="number" step="0.0001" value="${escapeHtml(v)}" data-role="xval" data-i="${i}" data-j="${j}">
        </td>
      `).join("")}
    `;
    tbody.appendChild(tr);
  });

  // Event update X
  tbody.querySelectorAll("input").forEach(el => {
    el.addEventListener("input", (e) => {
      const role = e.target.dataset.role;
      const i = Number(e.target.dataset.i);

      if (role === "aname") state.alternatives[i].name = e.target.value;

      if (role === "xval") {
        const j = Number(e.target.dataset.j);
        state.alternatives[i].values[j] = e.target.value; // simpan string (biar user bisa kosongkan)
      }
    });
  });
}

// ---------- Output helpers ----------
function clearOutputs() {
  ["tbodyPembagi","tbodyW","tbodyR","tbodyY","tbodyIdeal","tbodyDV","tbodyRank"].forEach(id=>{
    if($(id)) $(id).innerHTML = "";
  });
  ["theadR","theadY"].forEach(id=>{
    if($(id)) $(id).innerHTML = "";
  });
}

// ---------- Build payload untuk backend ----------
function buildPayload() {
  const criteria = state.criteria.map(c => ({
    code: c.code,
    name: c.name,
    weight: safeNum(c.weight),
    type: c.type
  }));

  const alternatives = state.alternatives.map(a => ({
    code: a.code,
    name: a.name,
    values: a.values.map(v => safeNum(v))
  }));

  return { criteria, alternatives };
}

// ---------- Render output dari backend ----------
function renderOutput(result) {
  const { W, divisors, R, Y, idealPlus, idealMinus, dvList, ranking } = result;

  if ($("tbodyPembagi")) {
    $("tbodyPembagi").innerHTML = state.criteria.map((c,j)=>`
      <tr>
        <td>${c.code} - ${escapeHtml(c.name)}</td>
        <td><b>${fmt(divisors[j],4)}</b></td>
      </tr>
    `).join("");
  }

  if ($("tbodyW")) {
    $("tbodyW").innerHTML = state.criteria.map((c,j)=>`
      <tr>
        <td>${c.code} - ${escapeHtml(c.name)}</td>
        <td><b>${fmt(W[j],3)}</b></td>
      </tr>
    `).join("");
  }

  if ($("theadR") && $("tbodyR")) {
    $("theadR").innerHTML = `
      <tr>
        <th style="width:90px;">Kode</th>
        <th style="min-width:220px;">Alternatif</th>
        ${state.criteria.map(c=>`<th>${c.code}</th>`).join("")}
      </tr>
    `;
    $("tbodyR").innerHTML = state.alternatives.map((a,i)=>`
      <tr>
        <td><b>${a.code}</b></td>
        <td>${escapeHtml(a.name)}</td>
        ${R[i].map(v=>`<td>${fmt(v,4)}</td>`).join("")}
      </tr>
    `).join("");
  }

  if ($("theadY") && $("tbodyY")) {
    $("theadY").innerHTML = `
      <tr>
        <th style="width:90px;">Kode</th>
        <th style="min-width:220px;">Alternatif</th>
        ${state.criteria.map(c=>`<th>${c.code}</th>`).join("")}
      </tr>
    `;
    $("tbodyY").innerHTML = state.alternatives.map((a,i)=>`
      <tr>
        <td><b>${a.code}</b></td>
        <td>${escapeHtml(a.name)}</td>
        ${Y[i].map(v=>`<td><b>${fmt(v,3)}</b></td>`).join("")}
      </tr>
    `).join("");
  }

  if ($("tbodyIdeal")) {
    $("tbodyIdeal").innerHTML = state.criteria.map((c,j)=>`
      <tr>
        <td>
          ${c.code} - ${escapeHtml(c.name)}
          <div class="small-muted">${c.type.toUpperCase()}</div>
        </td>
        <td><b>${fmt(idealPlus[j],3)}</b></td>
        <td><b>${fmt(idealMinus[j],3)}</b></td>
      </tr>
    `).join("");
  }

  if ($("tbodyDV")) {
    $("tbodyDV").innerHTML = dvList.map(d=>`
      <tr>
        <td>${d.code} - ${escapeHtml(d.name)}</td>
        <td>${fmt(d.dPlus,3)}</td>
        <td>${fmt(d.dMinus,3)}</td>
        <td><b>${fmt(d.v,3)}</b></td>
      </tr>
    `).join("");
  }

  if ($("tbodyRank")) {
    $("tbodyRank").innerHTML = ranking.map((r,idx)=>`
      <tr>
        <td><b>${idx+1}</b></td>
        <td>${r.code}</td>
        <td>${escapeHtml(r.name)}</td>
        <td><b>${fmt(r.v,3)}</b></td>
        <td>${idx===0?"Paling direkomendasikan":"Alternatif"}</td>
      </tr>
    `).join("");
  }
}

// ---------- Auth (Session) ----------
async function checkLogin() {
  const res = await fetch("/api/me", { credentials: "include" });
  const json = await res.json();
  return json.loggedIn === true;
}

async function doLogin() {
  const u = $("loginUsername").value.trim();
  const p = $("loginPassword").value.trim();
  $("loginMsg").textContent = "";

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username: u, password: p })
  });

  const json = await res.json().catch(() => ({ ok: false, error: "Login gagal" }));
  if (!res.ok || !json.ok) {
    $("loginMsg").textContent = json.error || "Login gagal";
    return;
  }

  showApp();
}

async function doLogout() {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  showLogin();
}

// ---------- View Switch ----------
function showLogin() {
  $("appView").style.display = "none";
  $("loginView").style.display = "block";
}

function showApp() {
  $("loginView").style.display = "none";
  $("appView").style.display = "block";

  // Reset state saat masuk app
  state = structuredClone(TEMPLATE);

  // Auto isi X dari bobot awal (hanya yang kosong)
  autofillXFromWeights({ overwriteEmptyOnly: true });

  renderCriteria();
  renderMatrixX();
  clearOutputs();
}

// ---------- Process TOPSIS via backend ----------
async function processTopsis() {
  const total = state.criteria.reduce((acc, c) => acc + safeNum(c.weight), 0);
  if (total === 0) {
    alert("Isi bobot kriteria terlebih dahulu.");
    return;
  }

  const payload = buildPayload();

  // Validasi panjang values sesuai jumlah kriteria
  const n = payload.criteria.length;
  const invalid = payload.alternatives.some(a => a.values.length !== n);
  if (invalid) {
    alert("Jumlah nilai tiap alternatif harus sama dengan jumlah kriteria.");
    return;
  }

  const res = await fetch("/api/topsis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => ({ ok: false, error: "Response tidak valid" }));
  if (!res.ok || !json.ok) {
    if (res.status === 401) {
      alert("Session habis. Silakan login lagi.");
      showLogin();
      return;
    }
    alert(json.error || "Gagal menghitung TOPSIS");
    return;
  }

  renderOutput(json.result);

  // cek apakah setiap kriteria punya variasi antar alternatif
for (let j = 0; j < state.criteria.length; j++) {
  const col = state.alternatives.map(a => safeNum(a.values[j]));
  const min = Math.min(...col);
  const max = Math.max(...col);
  if (min === max) {
    alert(`Nilai untuk ${state.criteria[j].code} masih sama semua. Ubah sebagian nilai alternatif agar ranking bisa terbentuk.`);
    return;
  }
}

}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  // bind login
  if ($("btnLogin")) $("btnLogin").addEventListener("click", doLogin);

  // bind app actions
  if ($("btnProses")) $("btnProses").addEventListener("click", processTopsis);
  if ($("btnReset")) $("btnReset").addEventListener("click", () => {
    state = structuredClone(TEMPLATE);
    autofillXFromWeights({ overwriteEmptyOnly: true });
    renderCriteria();
    renderMatrixX();
    clearOutputs();
  });
  if ($("btnLogout")) $("btnLogout").addEventListener("click", doLogout);

  // check auth
  const loggedIn = await checkLogin();
  if (loggedIn) showApp();
  else showLogin();
});
