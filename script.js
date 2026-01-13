const INITIAL = {
  criteria: [
    { code: "C1", name: "Harga",                  weight: 5, type: "cost"    },
    { code: "C2", name: "Brand",                  weight: 4, type: "benefit" },
    { code: "C3", name: "Komposisi",              weight: 3, type: "benefit" },
    { code: "C4", name: "Tingkat Estetika Botol", weight: 2, type: "benefit" },
    { code: "C5", name: "Ketersediaan",           weight: 1, type: "benefit" } // default benefit
  ],
  alternatives: [
    { code: "A1", name: "Alternatif 1", values: [4,4,2,3,3] },
    { code: "A2", name: "Alternatif 2", values: [1,5,1,1,4] },
    { code: "A3", name: "Alternatif 3", values: [3,2,5,1,1] },
    { code: "A4", name: "Alternatif 4", values: [2,4,1,4,5] },
    { code: "A5", name: "Alternatif 5", values: [5,1,1,5,3] }
  ]
};

let state = structuredClone(INITIAL);

// =======================
// Helpers
// =======================
function fmt(x, d = 4) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return "-";
  return Number(x).toFixed(d);
}
function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
function transpose(matrix){
  if (!matrix.length) return [];
  return matrix[0].map((_, j) => matrix.map(row => row[j]));
}
function safeNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// =======================
// Weights
// =======================
function getNormalizedWeights(){
  const weights = state.criteria.map(c => safeNum(c.weight));
  const s = sum(weights);
  if (s === 0) return weights.map(_ => 0);
  return weights.map(w => w / s);
}

// =======================
// Render: Criteria
// =======================
function renderCriteria(){
  const tbody = document.getElementById("tbodyKriteria");
  tbody.innerHTML = "";

  const W = getNormalizedWeights();

  state.criteria.forEach((c, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${c.code}</b></td>
      <td>
        <input type="text" value="${escapeHtml(c.name)}" data-role="cname" data-idx="${idx}">
      </td>
      <td>
        <input type="number" min="0" step="1" value="${c.weight}" data-role="cweight" data-idx="${idx}">
      </td>
      <td><b>${fmt(W[idx], 3)}</b></td>
      <td>
        <select data-role="ctype" data-idx="${idx}">
          <option value="benefit" ${c.type==="benefit"?"selected":""}>Benefit</option>
          <option value="cost" ${c.type==="cost"?"selected":""}>Cost</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input,select").forEach(el => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      const role = e.target.dataset.role;

      if(role === "cname")   state.criteria[idx].name = e.target.value;
      if(role === "cweight") state.criteria[idx].weight = safeNum(e.target.value);
      if(role === "ctype")   state.criteria[idx].type = e.target.value;

      // refresh W + headers
      renderCriteria();
      renderMatrixX();
    });
  });
}

// =======================
// Render: Matrix X
// =======================
function renderMatrixX(){
  const thead = document.getElementById("theadX");
  const tbody = document.getElementById("tbodyX");

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
        <td><input type="number" step="0.0001" value="${v}" data-role="xval" data-i="${i}" data-j="${j}"></td>
      `).join("")}
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input").forEach(el => {
    el.addEventListener("input", (e) => {
      const role = e.target.dataset.role;
      const i = Number(e.target.dataset.i);

      if(role === "aname"){
        state.alternatives[i].name = e.target.value;
      }
      if(role === "xval"){
        const j = Number(e.target.dataset.j);
        state.alternatives[i].values[j] = safeNum(e.target.value);
      }
    });
  });
}

// =======================
// TOPSIS Core
// =======================
function calculateTOPSIS(){
  const X = state.alternatives.map(a => a.values.map(safeNum));
  const W = getNormalizedWeights();
  const types = state.criteria.map(c => c.type);

  // divisors
  const cols = transpose(X);
  const divisors = cols.map(col => Math.sqrt(col.reduce((acc,v)=>acc + (v*v), 0)));

  // R
  const R = X.map(row => row.map((v, j) => {
    const div = divisors[j] || 1;
    return v / div;
  }));

  // Y
  const Y = R.map(row => row.map((v, j) => v * W[j]));

  // ideal (+) and (-)
  const Ycols = transpose(Y);
  const idealPlus = Ycols.map((col, j) => {
    return types[j] === "benefit" ? Math.max(...col) : Math.min(...col);
  });
  const idealMinus = Ycols.map((col, j) => {
    return types[j] === "benefit" ? Math.min(...col) : Math.max(...col);
  });

  // distances + V
  const dvList = state.alternatives.map((a, i) => {
    const dPlus = Math.sqrt(Y[i].reduce((acc, yj, j) => acc + Math.pow(yj - idealPlus[j], 2), 0));
    const dMinus = Math.sqrt(Y[i].reduce((acc, yj, j) => acc + Math.pow(yj - idealMinus[j], 2), 0));
    const v = (dPlus + dMinus) === 0 ? 0 : (dMinus / (dPlus + dMinus));
    return { code: a.code, name: a.name, dPlus, dMinus, v };
  });

  const ranking = [...dvList].sort((a,b)=> b.v - a.v);

  return { divisors, W, R, Y, idealPlus, idealMinus, dvList, ranking };
}

// =======================
// Render Output Tables
// =======================
function renderTablesOutput(out){
  const { divisors, W, R, Y, idealPlus, idealMinus, dvList, ranking } = out;

  // 1) pembagi
  const tbodyPembagi = document.getElementById("tbodyPembagi");
  tbodyPembagi.innerHTML = "";
  state.criteria.forEach((c, j) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.code} - ${escapeHtml(c.name)}</td><td><b>${fmt(divisors[j], 4)}</b></td>`;
    tbodyPembagi.appendChild(tr);
  });

  // 2) W
  const tbodyW = document.getElementById("tbodyW");
  tbodyW.innerHTML = "";
  state.criteria.forEach((c, j) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.code} - ${escapeHtml(c.name)}</td><td><b>${fmt(W[j], 3)}</b></td>`;
    tbodyW.appendChild(tr);
  });

  // 3) R
  document.getElementById("theadR").innerHTML = `
    <tr>
      <th style="width:90px;">Kode</th>
      <th style="min-width:220px;">Alternatif</th>
      ${state.criteria.map(c => `<th>${c.code}</th>`).join("")}
    </tr>
  `;
  const tbodyR = document.getElementById("tbodyR");
  tbodyR.innerHTML = "";
  state.alternatives.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${a.code}</b></td>
      <td>${escapeHtml(a.name)}</td>
      ${R[i].map(v => `<td>${fmt(v,4)}</td>`).join("")}
    `;
    tbodyR.appendChild(tr);
  });

  // 4) Y
  document.getElementById("theadY").innerHTML = `
    <tr>
      <th style="width:90px;">Kode</th>
      <th style="min-width:220px;">Alternatif</th>
      ${state.criteria.map(c => `<th>${c.code}</th>`).join("")}
    </tr>
  `;
  const tbodyY = document.getElementById("tbodyY");
  tbodyY.innerHTML = "";
  state.alternatives.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${a.code}</b></td>
      <td>${escapeHtml(a.name)}</td>
      ${Y[i].map(v => `<td><b>${fmt(v,3)}</b></td>`).join("")}
    `;
    tbodyY.appendChild(tr);
  });

  // 5) Ideal
  const tbodyIdeal = document.getElementById("tbodyIdeal");
  tbodyIdeal.innerHTML = "";
  state.criteria.forEach((c, j) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${c.code} - ${escapeHtml(c.name)}
        <div class="small-muted">${c.type.toUpperCase()}</div>
      </td>
      <td><b>${fmt(idealPlus[j],3)}</b></td>
      <td><b>${fmt(idealMinus[j],3)}</b></td>
    `;
    tbodyIdeal.appendChild(tr);
  });

  // 6) DV
  const tbodyDV = document.getElementById("tbodyDV");
  tbodyDV.innerHTML = "";
  dvList.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.code} - ${escapeHtml(item.name)}</td>
      <td>${fmt(item.dPlus,3)}</td>
      <td>${fmt(item.dMinus,3)}</td>
      <td><b>${fmt(item.v,3)}</b></td>
    `;
    tbodyDV.appendChild(tr);
  });

  // 7) Ranking
  const tbodyRank = document.getElementById("tbodyRank");
  tbodyRank.innerHTML = "";
  ranking.forEach((r, idx) => {
    const ket =
      idx === 0 ? "Paling direkomendasikan" :
      idx === 1 ? "Rekomendasi kedua" :
      idx === 2 ? "Rekomendasi ketiga" :
      "Prioritas lebih rendah";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${idx+1}</b></td>
      <td>${r.code}</td>
      <td>${escapeHtml(r.name)}</td>
      <td><b>${fmt(r.v,3)}</b></td>
      <td>${ket}</td>
    `;
    tbodyRank.appendChild(tr);
  });
}

// =======================
// Reset Output
// =======================
function clearOutputs(){
  const ids = ["tbodyPembagi","tbodyW","tbodyR","tbodyY","tbodyIdeal","tbodyDV","tbodyRank"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = "";
  });
  const heads = ["theadR","theadY"];
  heads.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = "";
  });
}

// =======================
// Escape HTML (safety)
// =======================
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// =======================
// Init
// =======================
function init(){
  renderCriteria();
  renderMatrixX();
  clearOutputs();

  document.getElementById("btnProses").addEventListener("click", () => {
    const out = calculateTOPSIS();
    renderTablesOutput(out);
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    state = structuredClone(INITIAL);
    renderCriteria();
    renderMatrixX();
    clearOutputs();
  });
}

init();
