import { getPool } from "./db.js";
import fs from "fs";
import path from "path";

async function recordVideoCreation({ external_id, prompt, model, user_id }) {
  try {
    const pool = getPool();
    const sql = `INSERT INTO videos (external_id, status, progress, prompt, model, created_at, updated_at)
                 VALUES (?, 'queued', 0, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE status='queued', progress=0, prompt=VALUES(prompt), model=VALUES(model), updated_at=NOW()`;
    await pool.execute(sql, [external_id, prompt, model]);
    await pool.execute(`UPDATE videos SET user_id=? WHERE external_id=?`, [user_id ?? null, external_id]);
  } catch {
    const dataDir = path.resolve(process.cwd(), "data");
    const file = path.join(dataDir, "videos.json");
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    let store = {};
    try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = {}; }
    const list = Array.isArray(store[user_id]) ? store[user_id] : [];
    const idx = list.findIndex((v) => String(v.external_id) === String(external_id));
    const row = { external_id, status: "queued", progress: 0, prompt, model, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), url: "", quality: "", size: "", seconds: "" };
    if (idx >= 0) list[idx] = { ...list[idx], ...row }; else list.unshift(row);
    store[user_id] = list;
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
  }
}

async function updateVideoStatus({ external_id, status, progress, url, quality, size, model, seconds }) {
  try {
    const pool = getPool();
    const sql = `UPDATE videos SET status=?, progress=?, url=?, quality=?, size=?, model=?, seconds=?, updated_at=NOW() WHERE external_id=?`;
    await pool.execute(sql, [status, Number(progress ?? 0), url ?? "", quality ?? "", size ?? "", model ?? "", String(seconds ?? ""), external_id]);
  } catch {
    const dataDir = path.resolve(process.cwd(), "data");
    const file = path.join(dataDir, "videos.json");
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    let store = {};
    try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = {}; }
    for (const uid of Object.keys(store)) {
      const list = store[uid];
      const idx = Array.isArray(list) ? list.findIndex((v) => String(v.external_id) === String(external_id)) : -1;
      if (idx >= 0) {
        list[idx] = { ...list[idx], status, progress: Number(progress ?? 0), url: url ?? list[idx].url, quality: quality ?? list[idx].quality, size: size ?? list[idx].size, model: model ?? list[idx].model, seconds: String(seconds ?? list[idx].seconds), updated_at: new Date().toISOString() };
        store[uid] = list;
        break;
      }
    }
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
  }
}

async function listVideosByUser({ user_id, limit = 20, offset = 0 }) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT external_id, status, progress, url, quality, size, model, seconds, prompt, created_at, updated_at FROM videos WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [user_id, Number(limit), Number(offset)]);
    return rows;
  } catch {
    const file = path.join(path.resolve(process.cwd(), "data"), "videos.json");
    try {
      const store = JSON.parse(fs.readFileSync(file, "utf8"));
      const list = Array.isArray(store[user_id]) ? store[user_id] : [];
      return list.slice(Number(offset), Number(offset) + Number(limit));
    } catch { return []; }
  }
}

export { recordVideoCreation, updateVideoStatus, listVideosByUser };
