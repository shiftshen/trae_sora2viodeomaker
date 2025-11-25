import { getPool } from "./db.js";
import fs from "fs";
import path from "path";

function dataFile() {
  const dir = path.resolve(process.cwd(), "data");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, "user_settings.json");
}

async function getUserSettings(user_id) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT user_id, default_ai_model, client_api_key, api_server_url, api_routes, language, theme, video_line_base, preferred_standard_model, preferred_hd_model
       FROM user_settings WHERE user_id=? LIMIT 1`,
      [user_id]
    );
    console.log("getUserSettings db", { user_id, rows_len: rows.length });
    if (rows.length) {
      const r = rows[0];
      return {
        user_id,
        default_ai_model: r.default_ai_model || "",
        client_api_key: r.client_api_key || "",
        api_server_url: r.api_server_url || "",
        api_routes: (() => {
          try {
            if (!r.api_routes) return [];
            return typeof r.api_routes === "string" ? JSON.parse(r.api_routes) : (r.api_routes || []);
          } catch { return []; }
        })(),
        language: r.language || "",
        theme: r.theme || "",
        video_line_base: r.video_line_base || "",
        preferred_standard_model: r.preferred_standard_model || "",
        preferred_hd_model: r.preferred_hd_model || "",
      };
    }
  } catch {}
  // fallback
  try {
    const file = dataFile();
    const store = JSON.parse(fs.readFileSync(file, "utf8"));
    return store[String(user_id)] || {};
  } catch { return {}; }
}

async function saveUserSettings(user_id, settings) {
  const prev = await getUserSettings(user_id).catch(() => ({}));
  const payload = {
    default_ai_model: settings.default_ai_model ?? prev?.default_ai_model ?? "",
    client_api_key: settings.client_api_key ?? prev?.client_api_key ?? "",
    api_server_url: settings.api_server_url ?? prev?.api_server_url ?? "",
    api_routes: JSON.stringify(settings.api_routes ?? prev?.api_routes ?? []),
    language: settings.language ?? prev?.language ?? "",
    theme: settings.theme ?? prev?.theme ?? "",
    video_line_base: settings.video_line_base ?? prev?.video_line_base ?? "",
    preferred_standard_model: settings.preferred_standard_model ?? prev?.preferred_standard_model ?? "",
    preferred_hd_model: settings.preferred_hd_model ?? prev?.preferred_hd_model ?? "",
  };
  try {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO user_settings (user_id, default_ai_model, client_api_key, api_server_url, api_routes, language, theme, video_line_base, preferred_standard_model, preferred_hd_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE default_ai_model=VALUES(default_ai_model), client_api_key=VALUES(client_api_key), api_server_url=VALUES(api_server_url), api_routes=VALUES(api_routes), language=VALUES(language), theme=VALUES(theme), video_line_base=VALUES(video_line_base), preferred_standard_model=VALUES(preferred_standard_model), preferred_hd_model=VALUES(preferred_hd_model)`,
      [user_id, payload.default_ai_model, payload.client_api_key, payload.api_server_url, payload.api_routes, payload.language, payload.theme, payload.video_line_base, payload.preferred_standard_model, payload.preferred_hd_model]
    );
    console.log("saveUserSettings db ok", { user_id });
    return { success: true };
  } catch {}
  // fallback
  const file = dataFile();
  let store = {};
  try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = {}; }
  store[String(user_id)] = {
    default_ai_model: settings.default_ai_model || "",
    client_api_key: settings.client_api_key || "",
    api_server_url: settings.api_server_url || "",
    api_routes: settings.api_routes || [],
    language: settings.language || "",
    theme: settings.theme || "",
    video_line_base: settings.video_line_base || "",
    preferred_standard_model: settings.preferred_standard_model || "",
    preferred_hd_model: settings.preferred_hd_model || "",
  };
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
  console.log("saveUserSettings file ok", { user_id });
  return { success: true };
}

export { getUserSettings, saveUserSettings };
