import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getPool } from "./db.js";

function hashKey(key) {
  return crypto.createHash("sha256").update(String(key || "")).digest("hex");
}

async function getOrCreateUserByApiKey(key) {
  const h = hashKey(key);
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT id FROM users WHERE api_key_hash=?`, [h]);
    if (rows.length > 0) return rows[0].id;
    const [res] = await pool.execute(`INSERT INTO users (api_key_hash, name, created_at) VALUES (?, ?, NOW())`, [h, "",]);
    return res.insertId;
  } catch {
    const dataDir = path.resolve(process.cwd(), "data");
    const file = path.join(dataDir, "users.json");
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    let store = {};
    try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = {}; }
    const existing = store[h];
    if (existing) return existing;
    const newId = Date.now();
    store[h] = newId;
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
    return newId;
  }
}

export { getOrCreateUserByApiKey };
