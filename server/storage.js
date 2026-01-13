const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "spk.json");

function readData() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeData(payload) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

module.exports = { readData, writeData };
