const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const { topsis } = require("./topsis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));

// Session (login)
app.use(session({
  secret: "spk-topsis-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 jam
  }
}));

// Serve frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// ===== Auth helpers =====
function requireLogin(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

// ===== Dummy user (bisa diganti database nanti) =====
const DEMO_USER = { username: "admin", password: "admin123", role: "user" };

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API berjalan" });
});

// Cek login status
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ ok: true, loggedIn: false });
  res.json({ ok: true, loggedIn: true, user: req.session.user });
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === DEMO_USER.username && password === DEMO_USER.password) {
    req.session.user = { username: DEMO_USER.username, role: DEMO_USER.role };
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "Username atau password salah" });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Hitung TOPSIS (Wajib login)
app.post("/api/topsis", requireLogin, (req, res) => {
  const { criteria, alternatives } = req.body || {};
  if (!Array.isArray(criteria) || !Array.isArray(alternatives)) {
    return res.status(400).json({ ok: false, error: "criteria/alternatives wajib array" });
  }

  // Validasi panjang values sesuai jumlah kriteria
  const n = criteria.length;
  const invalid = alternatives.some(a => !Array.isArray(a.values) || a.values.length !== n);
  if (invalid) {
    return res.status(400).json({ ok: false, error: "Panjang values harus sama dengan jumlah kriteria" });
  }

  const result = topsis(criteria, alternatives);
  return res.json({ ok: true, result });
});

// Fallback non-API ke index.html (hindari error wildcard)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
