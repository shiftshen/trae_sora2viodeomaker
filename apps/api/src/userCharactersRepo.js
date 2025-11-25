import { getPool } from "./db.js";
import fs from "fs";
import path from "path";

function dataFile() {
  const dir = path.resolve(process.cwd(), "data");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, "user_characters.json");
}

async function getUserCharacters(user_id) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`SELECT user_id, characters_json FROM user_characters WHERE user_id=? LIMIT 1`, [user_id]);
    if (rows.length) {
      const json = rows[0].characters_json || "[]";
      return JSON.parse(json);
    }
  } catch {}
  try {
    const file = dataFile();
    const store = JSON.parse(fs.readFileSync(file, "utf8"));
    return store[String(user_id)] || [];
  } catch { return []; }
}

async function saveUserCharacters(user_id, characters) {
  const json = JSON.stringify(characters || []);
  try {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO user_characters (user_id, characters_json, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE characters_json=VALUES(characters_json), updated_at=NOW()`,
      [user_id, json]
    );
    return { success: true };
  } catch {}
  const file = dataFile();
  let store = {};
  try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = {}; }
  store[String(user_id)] = characters || [];
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
  return { success: true };
}

export { getUserCharacters, saveUserCharacters };
