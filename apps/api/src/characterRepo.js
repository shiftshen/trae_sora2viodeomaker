import { getPool } from "./db.js";

async function recordCharacter({ uuid, instruction_value, timestamps, video_id, api_key_hash, status }) {
  const pool = getPool();
  const sql = `INSERT INTO characters (uuid, instruction_value, timestamps, video_id, api_key_hash, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE instruction_value=VALUES(instruction_value), timestamps=VALUES(timestamps), video_id=VALUES(video_id), api_key_hash=VALUES(api_key_hash), status=VALUES(status)`;
  await pool.execute(sql, [uuid, instruction_value ?? "", timestamps ?? "", String(video_id ?? ""), api_key_hash ?? "", Number(status ?? 0)]);
}

export { recordCharacter };