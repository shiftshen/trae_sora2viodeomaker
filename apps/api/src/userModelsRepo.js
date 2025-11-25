import { getPool } from "./db.js";
import fs from "fs";
import path from "path";

function dataFile() {
  const dir = path.resolve(process.cwd(), "data");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, "user_models.json");
}

async function getUserModels(user_id) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT user_id, models_json FROM user_models WHERE user_id=? LIMIT 1`, [user_id]);
    console.log("getUserModels db", { user_id, rows_len: rows.length });
    if (rows.length) {
      const raw = rows[0].models_json;
      const jsonStr = (() => {
        try { return typeof raw === "string" ? raw : JSON.stringify(raw ?? []); } catch { return "[]"; }
      })();
      return JSON.parse(jsonStr || "[]");
    }
  } catch {}
  try {
    const file = dataFile();
    const store = JSON.parse(fs.readFileSync(file, "utf8"));
    return store[String(user_id)] || [];
  } catch { return []; }
}

function diffModels(prev = [], next = []) {
  const keyOf = (m) => String(m?.id || m?.name || "");
  const pMap = Object.fromEntries((prev || []).map((m) => [keyOf(m), m]));
  const nMap = Object.fromEntries((next || []).map((m) => [keyOf(m), m]));
  const added = Object.keys(nMap).filter((k) => !pMap[k]).map((k) => nMap[k]);
  const removed = Object.keys(pMap).filter((k) => !nMap[k]).map((k) => pMap[k]);
  const updated = Object.keys(nMap).filter((k) => pMap[k]).filter((k) => JSON.stringify(pMap[k]) !== JSON.stringify(nMap[k])).map((k) => ({ before: pMap[k], after: nMap[k] }));
  return { added, removed, updated };
}

async function saveUserModels(user_id, models, op = "update") {
  const json = JSON.stringify(models || []);
  const prev = await getUserModels(user_id).catch(() => []);
  const diff = diffModels(prev, models || []);
  try {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO user_models (user_id, models_json, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE models_json=VALUES(models_json), updated_at=NOW()`,
      [user_id, json]
    );
    console.log("saveUserModels db ok", { user_id, count: (models || []).length });
    try {
      await pool.execute(
        `INSERT INTO user_model_versions (user_id, models_json, created_at) VALUES (?, ?, NOW())`,
        [user_id, json]
      );
    } catch {}
    try {
      await pool.execute(
        `INSERT INTO user_model_changes (user_id, operation, diff_json, created_at) VALUES (?, ?, ?, NOW())`,
        [user_id, String(op || "update"), JSON.stringify(diff)]
      );
    } catch {}
    return { success: true };
  } catch {}
  const file = dataFile();
  let store = {};
  try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = {}; }
  store[String(user_id)] = models || [];
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
  console.log("saveUserModels file ok", { user_id, count: (models || []).length });
  try {
    const dir = path.resolve(process.cwd(), "data", "backups", "user_models");
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const snapshot = path.join(dir, `${String(user_id)}-${ts}.json`);
    fs.writeFileSync(snapshot, json);
  } catch {}
  try {
    const changesFile = path.join(path.resolve(process.cwd(), "data"), "user_model_changes.json");
    let changesStore = {};
    try { changesStore = JSON.parse(fs.readFileSync(changesFile, "utf8")); } catch { changesStore = {}; }
    const list = Array.isArray(changesStore[String(user_id)]) ? changesStore[String(user_id)] : [];
    list.unshift({ operation: String(op || "update"), diff, ts: Date.now() });
    changesStore[String(user_id)] = list.slice(0, 200);
    fs.writeFileSync(changesFile, JSON.stringify(changesStore, null, 2));
  } catch {}
  return { success: true };
}

async function listUserModelVersions(user_id, limit = 50) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT id, user_id, models_json, created_at FROM user_model_versions WHERE user_id=? ORDER BY id DESC LIMIT ?`, [user_id, Number(limit)]);
    return rows.map((r) => ({ id: r.id, models: (() => { try { return typeof r.models_json === "string" ? JSON.parse(r.models_json || "[]") : (r.models_json || []); } catch { return []; } })(), created_at: r.created_at }));
  } catch {}
  try {
    const dir = path.resolve(process.cwd(), "data", "backups", "user_models");
    const files = fs.readdirSync(dir).filter((f) => f.startsWith(String(user_id) + "-"));
    return files.slice(0, Number(limit)).map((f) => ({ id: f.replace(/\.json$/i, ""), models: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), created_at: null }));
  } catch { return []; }
}

async function listUserModelChanges(user_id, limit = 100) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT id, user_id, operation, diff_json, created_at FROM user_model_changes WHERE user_id=? ORDER BY id DESC LIMIT ?`, [user_id, Number(limit)]);
    return rows.map((r) => ({ id: r.id, operation: r.operation, diff: (() => { try { return typeof r.diff_json === "string" ? JSON.parse(r.diff_json || "{}") : (r.diff_json || {}); } catch { return {}; } })(), created_at: r.created_at }));
  } catch {}
  try {
    const changesFile = path.join(path.resolve(process.cwd(), "data"), "user_model_changes.json");
    const store = JSON.parse(fs.readFileSync(changesFile, "utf8"));
    const list = store[String(user_id)] || [];
    return list.slice(0, Number(limit));
  } catch { return []; }
}

async function restoreUserModelsByVersion(user_id, version_id) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT id, models_json FROM user_model_versions WHERE id=? AND user_id=? LIMIT 1`, [version_id, user_id]);
    if (!rows.length) return { success: false, error: "version_not_found" };
    const raw = rows[0].models_json;
    const jsonStr = (() => { try { return typeof raw === "string" ? raw : JSON.stringify(raw ?? []); } catch { return "[]"; } })();
    const models = JSON.parse(jsonStr || "[]");
    await saveUserModels(user_id, models, "restore");
    return { success: true };
  } catch {
    try {
      const dir = path.resolve(process.cwd(), "data", "backups", "user_models");
      const file = fs.readdirSync(dir).find((f) => f.startsWith(String(user_id) + "-") && f.replace(/\.json$/i, "") === String(version_id));
      if (!file) return { success: false, error: "version_not_found" };
      const models = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      await saveUserModels(user_id, models, "restore");
      return { success: true };
    } catch { return { success: false, error: "version_not_found" }; }
  }
}

export { getUserModels, saveUserModels, listUserModelVersions, listUserModelChanges, restoreUserModelsByVersion };
