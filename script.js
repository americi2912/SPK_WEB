// =======================
// DATA AWAL (dari SPK FIX)
// =======================
// Kriteria: C1 Harga, C2 Brand, C3 Komposisi, C4 Estetika Botol, C5 Ketersediaan
// Bobot preferensi 1-5: [5,4,3,2,1] => total 15 => W = [0.333, 0.267, 0.200, 0.133, 0.067]
// Matriks keputusan X (A1..A5):
// A1 Wine Merah : [4,4,2,3,3]
// A2 Vodka      : [1,5,1,1,4]
// A3 Baileys    : [3,2,5,1,1]
// A4 Tequila    : [2,4,1,4,5]
// A5 Aperol     : [5,1,1,5,3]

const INITIAL = {
  criteria: [
    { code: "C1", name: "Harga",                 weight: 5, type: "cost"    },
    { code: "C2", name: "Brand",                 weight: 4, type: "benefit" },
    { code: "C3", name: "Komposisi",             weight: 3, type: "benefit" },
    { code: "C4", name: "Tingkat Estetika Botol",weight: 2, type: "benefit" },
    { code: "C5", name: "Ketersediaan",          weight: 1, type: "benefit" }
  ],
  alternatives: [
    { code: "A1", name: "Wine Merah", values: [4,4,2,3,3] },
    { code: "A2", name: "Vodka",      values: [1,5,1,1,4] },
    { code: "A3", name: "Baileys",    values: [3,2,5,1,1] },
    { code: "A4", name: "Tequila",    values: [2,4,1,4,5] },
    { code: "A5", name: "Aperol",     values: [5,1,1,5,3] }
  ]
};

let state = structuredClone(INITIAL);

// -----------------------
// Helpers
// -----------------------
function fmt(x, d = 4) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return "-";
  return Number(x).toFixed(d);
}

function sum(arr){ return arr.reduce((a,b)=>a+b,0); }

function transpose(matrix){
  return matrix[0].map((_, j) => matrix.map(row => row[j]));
}

// -----------------------
// Render UI
// -----------------------
function renderCriteria(){
  const tbody = document.getElementById("tbodyKriteria");
  tbody.innerHTML = "";

  state.criteria.forEach((c, idx) => {
    const tr = document.createElement("tr");

    const wNorm = getNormalizedWeights()[idx];

    tr.innerHTML = `
      <td>${c.code}</td>
      <td>
        <input type="text" value="${c.name}" data-role="cname" data-idx="${idx}">
      </td>
      <td>
        <input type="number" min="0" step="1" value="${c.weight}" data-role="cweight" data-idx="${idx}">
      </td>
      <td><b>${fmt(wNorm, 3)}</b></td>
      <td>
        <select data-role="ctype" data-idx="${idx}">
          <option value="benefit" ${c.type==="benefit"?"selected":""}>Benefit</option>
          <option value="cost" ${c.type==="cost"?"selected":""}>Cost</option>
        </select>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // listeners
  tbody.querySelectorAll("input,select").forEach(el => {
    el.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      const role = e.target.dataset.role;
      if(role === "cname") state.criteria[idx].name = e.target.value;
      if(role === "cweight") state.criteria[idx].weight = Number(e.target.value);
      if(role === "ctype") state.criteria[idx].type = e.target.value;

      // Re-render to refresh normalized W column
      renderCriteria();
      renderMatrixX(); // header depends on criteria names
    });
  });
}

function renderMatrixX(){
  const thead = document.getElementById("theadX");
  const tbody = document.getElementById("tbodyX");

  // header
  const h1 = `
    <tr>
      <th>Kode</th>
      <th>Nama Produk</th>
      ${state.criteria.map(c => `<th>${c.code}<br><span style="color:rgba(255,255,255,.65);font-weight:500">${c.name}</span></th>`).join("")}
    </tr>
  `;
  thead.innerHTML = h1;

  // body
  tbody.innerHTML = "";
  state.alternatives.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.code}</td>
      <td><input type="text" value="${a.name}" data-role="aname" data-i="${i}"></td>
      ${a.values.map((v, j) => `
        <td><input type="number" step="0.0001" value="${v}" data-role="xval" data-i="${i}" data-j="${j}"></td>
      `).join("")}
    `;
    tbody.appendChild(tr);
  });

  // listeners
  tbody.querySelectorAll("input").forEach(el => {
    el.addEventListener("input", (e) => {
      const role = e.target.dataset.role;
      const i = Number(e.target.dataset.i);
      if(role === "aname"){
        state.alternatives[i].name = e.target.value;
      }
      if(role === "xval"){
        const j = Number(e.target.dataset.j);
        state.alternatives[i].values[j] = Number(e.target.value);
      }
    });
  });
}

function renderTablesOutput({divisors, W, R, Y, idealPlus, idealMinus, dvList, ranking}){
  // pembagi
  const tbodyPembagi = document.getElementById("tbodyPembagi");
  tbodyPembagi.innerHTML = "";
  state.criteria.forEach((c, j) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.code} - ${c.name}</td><td><b>${fmt(divisors[j], 4)}</b></td>`;
    tbodyPembagi.appendChild(tr);
  });

  // W
  const tbodyW = document.getElementById("tbodyW");
  tbodyW.innerHTML = "";
  state.criteria.forEach((c, j) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.code} - ${c.name}</td><td><b>${fmt(W[j], 3)}</b></td>`;
    tbodyW.appendChild(tr);
  });

  // R header + body
  const theadR = document.getElementById("theadR");
  const tbodyR = document.getElementById("tbodyR");
  theadR.innerHTML = `
    <tr>
      <th>Kode</th><th>Alternatif</th>
      ${state.criteria.map(c => `<th>${c.code}</th>`).join("")}
    </tr>
  `;
  tbodyR.innerHTML = "";
  state.alternatives.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.code}</td><td>${a.name}</td>
      ${R[i].map(v => `<td>${fmt(v,4)}</td>`).join("")}
    `;
    tbodyR.appendChild(tr);
  });

  // Y header + body
  const theadY = document.getElementById("theadY");
  const tbodyY = document.getElementById("tbodyY");
  theadY.innerHTML = `
    <tr>
      <th>Kode</th><th>Alternatif</th>
      ${state.criteria.map(c => `<th>${c.code}</th>`).join("")}
    </tr>
  `;
  tbodyY.innerHTML = "";
  state.alternatives.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.code}</td><td>${a.name}</td>
      ${Y[i].map(v => `<td><b>${fmt(v,3)}</b></td>`).join("")}
    `;
    tbodyY.appendChild(tr);
  });

  // Ideal
  const tbodyIdeal = document.getElementById("tbodyIdeal");
  tbodyIdeal.innerHTML = "";
  state.criteria.forEach((c, j) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.code} - ${c.name}<br><small style="color:rgba(255,255,255,.65)">${c.type.toUpperCase()}</small></td>
      <td><b>${fmt(idealPlus[j],3)}</b></td>
      <td><b>${fmt(idealMinus[j],3)}</b></td>
    `;
    tbodyIdeal.appendChild(tr);
  });

  // DV
  const tbodyDV = document.getElementById("tbodyDV");
  tbodyDV.innerHTML = "";
  dvList.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.code} - ${item.name}</td>
      <td>${fmt(item.dPlus,3)}</td>
      <td>${fmt(item.dMinus,3)}</td>
      <td><b>${fmt(item.v,3)}</b></td>
    `;
    tbodyDV.appendChild(tr);
  });

  // Ranking
  const tbodyRank = document.getElementById("tbodyRank");
  tbodyRank.innerHTML = "";
  ranking.forEach((r, idx) => {
    const ket =
      idx === 0 ? "Paling direkomendasikan" :
      idx === 1 ? "Alternatif kedua" :
      idx === 2 ? "Alternatif ketiga" :
      "Kurang sesuai dibanding top 3";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${idx+1}</b></td>
      <td>${r.code}</td>
      <td>${r.name}</td>
      <td><b>${fmt(r.v,3)}</b></td>
      <td>${ket}</td>
    `;
    tbodyRank.appendChild(tr);
  });
}

// -----------------------
// TOPSIS Core
// -----------------------
function getNormalizedWeights(){
  const weights = state.criteria.map(c => Number(c.weight) || 0);
  const s = sum(weights);
  if (s === 0) return weights.map(_ => 0);
  return weights.map(w => w / s);
}

function calculateTOPSIS(){
  const X = state.alternatives.map(a => a.values.map(v => Number(v) || 0));
  const W = getNormalizedWeights();
  const types = state.criteria.map(c => c.type);

  // divisors: sqrt(sum x^2) per column
  const cols = transpose(X);
  const divisors = cols.map(col => Math.sqrt(col.reduce((acc,v)=>acc + (v*v), 0)));

  // R: normalized
  const R = X.map(row => row.map((v, j) => {
    const div = divisors[j] || 1;
    return v / div;
  }));

  // Y: weighted normalized
  const Y = R.map(row => row.map((v, j) => v * W[j]));

  // ideal (+) and (-) depending benefit/cost
  const Ycols = transpose(Y);
  const idealPlus = Ycols.map((col, j) => {
    return types[j] === "benefit" ? Math.max(...col) : Math.min(...col);
  });
  const idealMinus = Ycols.map((col, j) => {
    return types[j] === "benefit" ? Math.min(...col) : Math.max(...col);
  });

  // distances
  const dvList = state.alternatives.map((a, i) => {
    const dPlus = Math.sqrt(Y[i].reduce((acc, yj, j) => acc + Math.pow(yj - idealPlus[j], 2), 0));
    const dMinus = Math.sqrt(Y[i].reduce((acc, yj, j) => acc + Math.pow(yj - idealMinus[j], 2), 0));
    const v = (dPlus + dMinus) === 0 ? 0 : (dMinus / (dPlus + dMinus));
    return { code: a.code, name: a.name, dPlus, dMinus, v };
  });

  // ranking by V desc
  const ranking = [...dvList].sort((a,b)=> b.v - a.v);

  return {divisors, W, R, Y, idealPlus, idealMinus, dvList, ranking};
}

// -----------------------
// Wire up
// -----------------------
function init(){
  renderCriteria();
  renderMatrixX();

  document.getElementById("btnProses").addEventListener("click", () => {
    const out = calculateTOPSIS();
    renderTablesOutput(out);
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    state = structuredClone(INITIAL);
    renderCriteria();
    renderMatrixX();

    // clear outputs
    ["tbodyPembagi","tbodyW","tbodyR","tbodyY","tbodyIdeal","tbodyDV","tbodyRank"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerHTML = "";
    });
    ["theadR","theadY"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerHTML = "";
    });
  });
}

init();
