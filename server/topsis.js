function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function transpose(matrix) {
  if (!matrix.length) return [];
  return matrix[0].map((_, j) => matrix.map(row => row[j]));
}

function normalizeWeights(criteria) {
  const weights = criteria.map(c => safeNum(c.weight));
  const s = sum(weights);
  if (s === 0) return weights.map(() => 0);
  return weights.map(w => w / s);
}

function topsis(criteria, alternatives) {
  const W = normalizeWeights(criteria);
  const types = criteria.map(c => (c.type || "benefit").toLowerCase());

  const X = alternatives.map(a => a.values.map(safeNum));
  const cols = transpose(X);

  const divisors = cols.map(col => Math.sqrt(col.reduce((acc, v) => acc + v * v, 0)));

  const R = X.map(row =>
    row.map((v, j) => {
      const div = divisors[j] || 1;
      return v / div;
    })
  );

  const Y = R.map(row => row.map((v, j) => v * W[j]));

  const Ycols = transpose(Y);
  const idealPlus = Ycols.map((col, j) =>
    types[j] === "benefit" ? Math.max(...col) : Math.min(...col)
  );
  const idealMinus = Ycols.map((col, j) =>
    types[j] === "benefit" ? Math.min(...col) : Math.max(...col)
  );

  const dvList = alternatives.map((a, i) => {
    const dPlus = Math.sqrt(
      Y[i].reduce((acc, yj, j) => acc + Math.pow(yj - idealPlus[j], 2), 0)
    );
    const dMinus = Math.sqrt(
      Y[i].reduce((acc, yj, j) => acc + Math.pow(yj - idealMinus[j], 2), 0)
    );
    const v = (dPlus + dMinus) === 0 ? 0 : dMinus / (dPlus + dMinus);
    return { code: a.code, name: a.name, dPlus, dMinus, v };
  });

  const ranking = [...dvList].sort((a, b) => b.v - a.v);

  return { W, divisors, R, Y, idealPlus, idealMinus, dvList, ranking };
}

module.exports = { topsis };
