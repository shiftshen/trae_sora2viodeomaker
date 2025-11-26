import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createVideo, getVideoStatus, createCharacter, listCharacters, getCharacterStatus } from "./sora2.js";
import { recordVideoCreation, updateVideoStatus } from "./videoRepo.js";
import { createAgent, listAgents, updateAgent, deleteAgent } from "./agentRepo.js";
import { createPromptTemplate, listPromptTemplates } from "./promptRepo.js";
import { recordCharacter } from "./characterRepo.js";
import { getPool } from "./db.js";
import { getOrCreateUserByApiKey } from "./userRepo.js";
import { sendYijiaChat } from "./yijiaChat.js";
import { sendChat } from "./llm.js";
import { getUserSettings, saveUserSettings } from "./userSettingsRepo.js";
import { getUserModels, saveUserModels, listUserModelVersions, listUserModelChanges, restoreUserModelsByVersion } from "./userModelsRepo.js";
import { getUserCharacters, saveUserCharacters } from "./userCharactersRepo.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.post("/api/videos", async (req, res) => {
  try {
    const { input_reference, prompt, model, size, is_story } = req.body || {};
    if (!prompt || !model) return res.status(400).json({ error: "missing_params" });
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    try { if (clientKey) userId = await getOrCreateUserByApiKey(clientKey); } catch {}
    try {
      console.log("createVideo request", { hasRef: !!input_reference, promptLen: (prompt||"").length, model, size, clientKeyLen: (clientKey||"").length });
      const raw = await createVideo({ input_reference, prompt, model, size, is_story, api_key: clientKey });
      const externalId = String(raw?.external_id || raw?.id || raw?.video_id || "");
      if (!externalId) {
        const detail = (() => {
          try {
            if (typeof raw === 'string') return raw;
            if (raw && (raw.error || raw.message)) return String(raw.error || raw.message);
            return JSON.stringify(raw).slice(0, 500);
          } catch { return ''; }
        })();
        return res.status(400).json({ error: "invalid_upstream_response", detail });
      }
      const result = { ...raw, id: externalId };
      await recordVideoCreation({ external_id: externalId, prompt, model, user_id: userId });
      return res.json(result);
    } catch (err) {
      console.error("createVideo failed", err);
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ error: "create_video_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/videos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    try {
      const status = await getVideoStatus(id, clientKey);
      await updateVideoStatus({ external_id: String(id), status: status?.status, progress: status?.progress, url: status?.url, quality: status?.quality, size: status?.size, model: status?.model, seconds: status?.seconds });
      return res.json(status);
    } catch (err) {
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ error: "get_video_status_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/videos", async (req, res) => {
  try {
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const limit = Number(req.query?.limit || 20);
    const offset = Number(req.query?.offset || 0);
    const { listVideosByUser } = await import("./videoRepo.js");
    const rows = await listVideosByUser({ user_id: userId, limit, offset });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: "list_videos_failed", detail: String(err?.message || err) });
  }
});

// 直链下载代理：以附件形式回传，前端可直接下载
app.get("/api/download", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || typeof url !== "string") {
      return res.status(400).send("missing url");
    }
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).send("invalid url");
    }
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).send(`fetch failed ${r.status} ${text}`);
    }
    const contentType = r.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300");
    try {
      if (r.body && typeof r.body.pipe === "function") {
        r.body.pipe(res);
        return;
      }
    } catch {}
    const ab = await r.arrayBuffer();
    res.send(Buffer.from(ab));
  } catch (e) {
    res.status(500).send(String(e?.message || e));
  }
});

app.post("/api/characters", async (req, res) => {
  try {
    const { instruction_value, timestamps, video_id, uuid } = req.body || {};
    if (!instruction_value || !timestamps || !video_id || !uuid) return res.status(400).json({ error: "missing_params" });
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    const created = await createCharacter({ instruction_value, timestamps, video_id, uuid, api_key: clientKey });
    try {
      const payload = created?.data ? created.data : null;
      await recordCharacter({ uuid: uuid, instruction_value, timestamps, video_id, api_key_hash: "", status: payload?.status ?? 0 });
    } catch {}
    return res.json(created);
  } catch (err) {
    return res.status(500).json({ error: "create_character_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/characters", async (req, res) => {
  try {
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    const list = await listCharacters(clientKey);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: "list_characters_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/characters/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    const status = await getCharacterStatus(uuid, clientKey);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: "get_character_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/line/test", async (req, res) => {
  try {
    const base = String(req.body?.base || "");
    if (!base) return res.status(400).json({ ok: false, error: "missing_base" });
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);
    try {
      const r = await fetch(base, { signal: controller.signal });
      clearTimeout(tid);
      // 只要能返回任何数据，就视为可用；状态码仅供参考
      return res.json({ ok: true, status: r.status || 0 });
    } catch (e) {
      clearTimeout(tid);
      return res.json({ ok: false, error: String(e?.message || e) });
    }
  } catch (err) {
    return res.json({ ok: false, error: String(err?.message || err) });
  }
});

app.post("/api/agents", async (req, res) => {
  try {
    const { name, provider, model, description, icon, knowledge, instructions, prompt_template, promptTemplate, system_prompt, parameters } = req.body || {};
    if (!name || !provider || !model) return res.status(400).json({ error: "missing_params" });
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    try { if (clientKey) userId = await getOrCreateUserByApiKey(clientKey); } catch {}
    const created = await createAgent({
      name,
      provider,
      model,
      description,
      icon,
      knowledge,
      instructions,
      prompt_template: prompt_template ?? promptTemplate,
      system_prompt,
      parameters,
      user_id: userId,
    });
    return res.json({ success: true, id: created.id });
  } catch (err) {
    return res.status(500).json({ error: "create_agent_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/agents", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    try { if (clientKey) userId = await getOrCreateUserByApiKey(clientKey); } catch {}
    const rows = await listAgents(userId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: "list_agents_failed", detail: String(err?.message || err) });
  }
});

app.put("/api/agents/:id", async (req, res) => {
  try {
    const idRaw = req.params?.id;
    const idIsNumeric = /^\d+$/.test(String(idRaw || ""));
    const { name, provider, model, description, icon, knowledge, instructions, prompt_template, promptTemplate, system_prompt, parameters, status = 1 } = req.body || {};
    if (!idRaw || !name || !provider || !model) return res.status(400).json({ error: "missing_params" });
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    try { if (clientKey) userId = await getOrCreateUserByApiKey(clientKey); } catch {}
    console.log("updateAgent req", { idRaw, idIsNumeric, name, provider, model, userId, clientKeyLen: (clientKey||"").length });
    if (!idIsNumeric) {
      // 无服务器ID，执行创建并返回新ID，前端可用此ID替换本地占位ID
      const created = await createAgent({
        name,
        provider,
        model,
        description,
        icon,
        knowledge,
        instructions,
        prompt_template: prompt_template ?? promptTemplate,
        system_prompt,
        parameters,
        status,
        user_id: userId,
      });
      console.log("updateAgent create fallback", created);
      return res.json({ success: true, id: created?.id });
    }
    const result = await updateAgent({
      id: idIsNumeric ? Number(idRaw) : String(idRaw),
      name,
      provider,
      model,
      description,
      icon,
      knowledge,
      instructions,
      prompt_template: prompt_template ?? promptTemplate,
      system_prompt,
      parameters,
      status,
      user_id: userId,
    });
    console.log("updateAgent result", result);
    if (!result?.success) return res.status(400).json({ error: "update_failed" });
    return res.json({ success: true });
  } catch (err) {
    console.error("update_agent_failed", err);
    return res.status(500).json({ error: "update_agent_failed", detail: String(err?.message || err) });
  }
});

app.delete("/api/agents/:id", async (req, res) => {
  try {
    const idRaw = req.params?.id;
    if (!idRaw) return res.status(400).json({ error: "missing_params" });
    const idIsNumeric = /^\d+$/.test(String(idRaw || ""));
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    try { if (clientKey) userId = await getOrCreateUserByApiKey(clientKey); } catch {}
    console.log("deleteAgent req", { idRaw, idIsNumeric, userId, clientKeyLen: (clientKey||"").length });
    if (!idIsNumeric) {
      // 无服务器ID，无需实际删除；视作前端本地占位删除成功
      return res.json({ success: true });
    }
    const result = await deleteAgent({ id: idIsNumeric ? Number(idRaw) : String(idRaw), user_id: userId });
    console.log("deleteAgent result", result);
    if (!result?.success) return res.status(400).json({ error: "delete_failed" });
    return res.json({ success: true });
  } catch (err) {
    console.error("delete_agent_failed", err);
    return res.status(500).json({ error: "delete_agent_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/prompt-templates", async (req, res) => {
  try {
    const { agent_id, name, template_text, variables, version, is_default } = req.body || {};
    if (!agent_id || !name || !template_text) return res.status(400).json({ error: "missing_params" });
    const created = await createPromptTemplate({ agent_id, name, template_text, variables, version, is_default });
    return res.json({ success: true, id: created.id });
  } catch (err) {
    return res.status(500).json({ error: "create_prompt_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/prompt-templates", async (req, res) => {
  try {
    const agent_id = req.query?.agent_id ? Number(req.query.agent_id) : undefined;
    const rows = await listPromptTemplates(agent_id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: "list_prompts_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/admin/db-status", async (_req, res) => {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/admin/config-status", async (_req, res) => {
  try {
    const checks = {
      YIJIA_API_KEY: !!process.env.YIJIA_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    };
    return res.json({ ok: true, checks });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get("/api/admin/echo-headers", (req, res) => {
  res.json({ headers: req.headers });
});

app.post("/api/admin/test-gemini", async (req, res) => {
  try {
    const apiKey = req.body?.apiKey || req.get("x-client-api-key");
    const model = req.body?.model || "gemini-3-pro-preview";
    if (!apiKey) return res.status(200).json({ ok: false, error: "missing apiKey" });
    const payload = {
      contents: [{ parts: [{ text: "ping" }] }],
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    return res.status(200).json({ ok: r.ok, status: r.status, body: text.slice(0, 500) });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
});

app.post("/api/admin/test-deepseek", async (req, res) => {
  try {
    const apiKey = req.body?.apiKey || req.get("x-client-api-key");
    const model = req.body?.model || "deepseek-chat";
    const endpoint = String(req.body?.endpoint || "https://api.deepseek.com/v1").replace(/\/$/, "");
    if (!apiKey) return res.status(200).json({ ok: false, error: "missing apiKey" });
    const payload = { model, messages: [{ role: "user", content: "ping" }] };
    const url = `${endpoint}/chat/completions`;
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    return res.status(200).json({ ok: r.ok, status: r.status, body: text.slice(0, 500) });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
});

// 测试 Yijia 用户 Key（使用 /v1/characters 作为健康检测）
app.post("/api/admin/test-yijia", async (req, res) => {
  try {
    const apiKey = req.get("x-client-api-key") || req.body?.apiKey;
    if (!apiKey) return res.status(200).json({ ok: false, error: "missing apiKey" });
    try {
      const r = await listCharacters(apiKey);
      return res.status(200).json({ ok: true, status: 200, body: JSON.stringify(r).slice(0, 500) });
    } catch (err) {
      const msg = String(err?.message || err);
      const softOk = /listCharacters\s+404/.test(msg) || /405/.test(msg);
      return res.status(200).json({ ok: softOk, status: softOk ? 200 : 400, error: msg });
    }
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
});

// 用户模型列表（按 API Key 映射用户）
app.get("/api/user/models", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const models = await getUserModels(userId);
    if (Array.isArray(models) && models.length > 0) {
      return res.json({ success: true, data: models });
    }
    const defaults = [
      { id: "deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek", apiEndpoint: "https://api.deepseek.com/v1", apiKey: "", customPrompt: "", enabled: true },
      { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", apiEndpoint: "https://generativelanguage.googleapis.com/v1beta", apiKey: "", customPrompt: "", enabled: false },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", apiEndpoint: "https://api.openai.com/v1", apiKey: "", customPrompt: "", enabled: false },
    ];
    try { await saveUserModels(userId, defaults); } catch {}
    return res.json({ success: true, data: defaults });
  } catch (err) {
    return res.status(500).json({ error: "get_user_models_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/user/models", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const models = req.body?.models || [];
    const prev = await getUserModels(userId).catch(() => []);
    const keyOf = (m) => String(m?.id || m?.name || "");
    const pMap = Object.fromEntries((prev || []).map((m) => [keyOf(m), m]));
    const nMap = Object.fromEntries((models || []).map((m) => [keyOf(m), m]));
    const added = Object.keys(nMap).filter((k) => !pMap[k]).length;
    const removed = Object.keys(pMap).filter((k) => !nMap[k]).length;
    const updated = Object.keys(nMap).filter((k) => pMap[k]).filter((k) => JSON.stringify(pMap[k]) !== JSON.stringify(nMap[k])).length;
    await saveUserModels(userId, models, "update");
    return res.json({ success: true, changes: { added, removed, updated } });
  } catch (err) {
    return res.status(500).json({ error: "save_user_models_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/user/models/history", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const list = await listUserModelChanges(userId, Number(req.query?.limit || 100));
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ error: "get_user_model_history_failed", detail: String(err?.message || err) });
  }
});

app.get("/api/user/models/versions", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const list = await listUserModelVersions(userId, Number(req.query?.limit || 50));
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ error: "get_user_model_versions_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/user/models/restore", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const versionId = req.body?.version_id;
    if (!versionId) return res.status(400).json({ error: "missing_version_id" });
    const r = await restoreUserModelsByVersion(userId, versionId);
    if (!r?.success) return res.status(404).json({ error: r?.error || "restore_failed" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "restore_user_models_failed", detail: String(err?.message || err) });
  }
});

// 用户角色：读取与保存（按 API Key 映射到 user_id）
app.get("/api/user/characters", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const list = await getUserCharacters(userId);
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ error: "get_user_characters_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/user/characters", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const characters = req.body?.characters || [];
    await saveUserCharacters(userId, characters);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "save_user_characters_failed", detail: String(err?.message || err) });
  }
});

// 用户设置：读取与保存（按 API Key 映射到 user_id）
app.get("/api/user/settings", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const s = await getUserSettings(userId);
    return res.json({ success: true, data: s || {} });
  } catch (err) {
    return res.status(500).json({ error: "get_user_settings_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/user/settings", async (req, res) => {
  try {
    const clientKey = req.get("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!clientKey) return res.status(400).json({ error: "missing_api_key" });
    const userId = await getOrCreateUserByApiKey(clientKey);
    const settings = req.body || {};
    await saveUserSettings(userId, settings);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "save_user_settings_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { model = "gpt-3.5-turbo", messages = [], stream = false } = req.body || {};
    const clientKey = req.header("x-client-api-key") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    try { if (clientKey) userId = await getOrCreateUserByApiKey(clientKey); } catch {}
    const result = await sendYijiaChat({ model, messages, stream });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: "chat_failed", detail: String(err?.message || err) });
  }
});

app.post("/api/chat/provider", async (req, res) => {
  try {
    const { provider, model, messages, stream, apiKey, endpoint } = req.body || {};
    if (!provider || !model || !messages) return res.status(400).json({ error: "missing_params" });
    const overrideKey = apiKey;
    try {
      console.log("chat_provider_req", {
        provider,
        model,
        endpoint: String(endpoint || "").slice(0, 60),
        apiKey_len: String(overrideKey || "").length,
      });
    } catch {}
    const result = await sendChat({ provider, model, messages, stream, apiKey: overrideKey, endpoint });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "chat_failed", detail: String(err?.message || err) });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`videogeneration api listening on http://localhost:${port}`);
});
// 站点(Yijia)用户Key检测：仅校验是否提供并可映射到用户
