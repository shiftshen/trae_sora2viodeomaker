import { getPool } from "./db.js";

async function createPromptTemplate({ agent_id, name, template_text, variables, version = "1.0.0", is_default = 0 }) {
  const pool = getPool();
  const sql = `INSERT INTO prompt_templates (agent_id, name, template_text, variables, version, is_default, created_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW())`;
  const [res] = await pool.execute(sql, [agent_id, name, template_text, JSON.stringify(variables ?? {}), version, is_default ? 1 : 0]);
  return { id: res.insertId };
}

async function listPromptTemplates(agent_id) {
  const pool = getPool();
  const [rows] = await pool.query(
    agent_id
      ? `SELECT id, agent_id, name, template_text, variables, version, is_default, created_at FROM prompt_templates WHERE agent_id=? ORDER BY id DESC`
      : `SELECT id, agent_id, name, template_text, variables, version, is_default, created_at FROM prompt_templates ORDER BY id DESC`,
    agent_id ? [agent_id] : []
  );
  return rows;
}

export { createPromptTemplate, listPromptTemplates };