import { getPool } from "./db.js";
import fs from "fs";
import path from "path";

function dataFile() {
  const dir = path.resolve(process.cwd(), "data");
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, "agents.json");
}

function normalizeAgentRow(row) {
  const params = (() => {
    try { return typeof row.parameters === "string" ? JSON.parse(row.parameters || "{}") : (row.parameters || {}); } catch { return {}; }
  })();
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    model: row.model,
    description: row.description ?? params.description ?? "",
    icon: row.icon ?? params.icon ?? "",
    knowledge: row.knowledge ?? params.knowledge ?? "",
    instructions: row.instructions ?? row.system_prompt ?? params.instructions ?? "",
    prompt_template: row.prompt_template ?? params.prompt_template ?? params.promptTemplate ?? "",
    parameters: params,
    status: row.status,
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createAgent({ name, provider, model, description, icon, knowledge, instructions, prompt_template, system_prompt, parameters, status = 1, user_id = null }) {
  const desc = description ?? parameters?.description ?? "";
  const ico = icon ?? parameters?.icon ?? "";
  const know = knowledge ?? parameters?.knowledge ?? "";
  const inst = instructions ?? system_prompt ?? parameters?.instructions ?? "";
  const prompt = prompt_template ?? parameters?.prompt_template ?? parameters?.promptTemplate ?? "";
  try {
    const pool = getPool();
    const sql = `INSERT INTO agents (name, provider, model, description, icon, knowledge, instructions, prompt_template, system_prompt, parameters, status, user_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    const [res] = await pool.execute(sql, [name, provider, model, desc, ico, know, inst, prompt, inst, JSON.stringify(parameters ?? {}), status, user_id]);
    return { id: res.insertId };
  } catch {}
  // fallback
  const file = dataFile();
  let store = [];
  try { store = JSON.parse(fs.readFileSync(file, "utf8")); } catch { store = []; }
  const id = Date.now();
  store.unshift({
    id,
    name,
    provider,
    model,
    description: desc,
    icon: ico,
    knowledge: know,
    instructions: inst,
    prompt_template: prompt,
    system_prompt: inst,
    parameters: parameters ?? {},
    status,
    user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
  return { id };
}

async function updateAgent({ id, name, provider, model, description, icon, knowledge, instructions, prompt_template, system_prompt, parameters, status = 1, user_id = null }) {
  const desc = description ?? parameters?.description ?? "";
  const ico = icon ?? parameters?.icon ?? "";
  const know = knowledge ?? parameters?.knowledge ?? "";
  const inst = instructions ?? system_prompt ?? parameters?.instructions ?? "";
  const prompt = prompt_template ?? parameters?.prompt_template ?? parameters?.promptTemplate ?? "";
  const isNumeric = typeof id === "number" || (/^\d+$/.test(String(id)));
  try {
    if (!isNumeric) throw new Error("non_numeric_id_fallback");
    const pool = getPool();
    const sql = `UPDATE agents
                 SET name=?, provider=?, model=?, description=?, icon=?, knowledge=?, instructions=?, prompt_template=?, system_prompt=?, parameters=?, status=?, updated_at=NOW()
                 WHERE id=? ${user_id ? "AND (user_id=? OR user_id IS NULL)" : ""}`;
    const paramsArr = [name, provider, model, desc, ico, know, inst, prompt, inst, JSON.stringify(parameters ?? {}), status, id];
    if (user_id) paramsArr.push(user_id);
    const [res] = await pool.execute(sql, paramsArr);
    return { success: res.affectedRows > 0 };
  } catch {}
  const file = dataFile();
  try {
    const store = JSON.parse(fs.readFileSync(file, "utf8"));
    const next = store.map((r) => {
      if (String(r.id) !== String(id)) return r;
      if (user_id && r.user_id && r.user_id !== user_id) return r;
      return {
        ...r,
        name,
        provider,
        model,
        description: desc,
        icon: ico,
        knowledge: know,
        instructions: inst,
        prompt_template: prompt,
        system_prompt: inst,
        parameters: parameters ?? {},
        status,
        updated_at: new Date().toISOString(),
      };
    });
    fs.writeFileSync(file, JSON.stringify(next, null, 2));
    return { success: true };
  } catch { return { success: false }; }
}

async function deleteAgent({ id, user_id }) {
  const isNumeric = typeof id === "number" || (/^\d+$/.test(String(id)));
  try {
    if (!isNumeric) throw new Error("non_numeric_id_fallback");
    const pool = getPool();
    const sql = `DELETE FROM agents WHERE id=? ${user_id ? "AND (user_id=? OR user_id IS NULL)" : ""}`;
    const paramsArr = [id];
    if (user_id) paramsArr.push(user_id);
    const [res] = await pool.execute(sql, paramsArr);
    return { success: res.affectedRows > 0 };
  } catch {}
  const file = dataFile();
  try {
    const store = JSON.parse(fs.readFileSync(file, "utf8"));
    const next = store.filter((r) => {
      if (String(r.id) !== String(id)) return true;
      if (user_id && r.user_id && r.user_id !== user_id) return true;
      return false;
    });
    fs.writeFileSync(file, JSON.stringify(next, null, 2));
    return { success: true };
  } catch { return { success: false }; }
}

async function listAgents(user_id) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, provider, model, description, icon, knowledge, instructions, prompt_template, system_prompt, parameters, status, user_id, created_at, updated_at
       FROM agents
       WHERE (user_id IS NULL OR user_id=?)
       ORDER BY id DESC`,
      [user_id ?? null]
    );
    return rows.map(normalizeAgentRow);
  } catch {}
  const file = dataFile();
  try {
    const rows = JSON.parse(fs.readFileSync(file, "utf8"));
    return rows
      .filter(r => !user_id || r.user_id === user_id)
      .map(normalizeAgentRow);
  } catch { return []; }
}

export { createAgent, updateAgent, deleteAgent, listAgents };
