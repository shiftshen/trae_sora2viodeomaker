function getClientKey() {
  try {
    const v = localStorage.getItem("clientApiKey") || "";
    if (v) return v;
    if (typeof location !== "undefined") {
      const p = new URLSearchParams(location.search);
      const fromUrl = p.get("key") || "";
      if (fromUrl) {
        try { localStorage.setItem("clientApiKey", fromUrl); } catch {}
        return fromUrl;
      }
    }
    return "";
  } catch { return ""; }
}
function apiBase() {
  try {
    const s = localStorage.getItem("clientApiServer") || "";
    const v = typeof s === "string" ? s.trim() : "";
    const ok = /^https?:\/\//i.test(v) && !/api\.example\.com/i.test(v);
    if (ok) return v;
    if (typeof location !== "undefined") {
      const p = new URLSearchParams(location.search);
      const base = p.get("api") || p.get("base") || "";
      if (/^https?:\/\//i.test(base)) {
        try { localStorage.setItem("clientApiServer", base); } catch {}
        return base;
      }
    }
    if (typeof location !== "undefined") {
      const h = String(location.hostname || "").toLowerCase();
      if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") return "http://localhost:5050";
    }
    return "";
  } catch { return ""; }
}
function api(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/api${p}`;
}

function isYijiaBase(url: string) {
  return /(^https?:\/\/)?([\w.-]*\.)?yijiarj\.cn(\/|$)/i.test(url || "");
}

function apiUpstream(path: string) {
  const base = apiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base && isYijiaBase(base)) return `${base.replace(/\/$/, "")}/v1${p}`;
  return api(path);
}

async function safeJson(resp: Response) {
  const text = await resp.text();
  if (!text) return {} as any;
  try { return JSON.parse(text); } catch { throw new Error(`invalid_json ${resp.status} ${text.slice(0,300)}`); }
}

export async function createVideo(payload: { input_reference?: string; prompt: string; model: string; is_story?: string }) {
  const key = getClientKey();
  const body = { ...payload };
  const resp = await fetch(api(`/videos`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`createVideo ${resp.status} ${text}`);
  }
  return await safeJson(resp);
}

export async function getVideoStatus(id: string) {
  const key = getClientKey();
  const resp = await fetch(api(`/videos/${encodeURIComponent(id)}`), { headers: { "X-Client-Api-Key": key, Authorization: `Bearer ${key}` } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`getVideoStatus ${resp.status} ${text}`);
  }
  return await safeJson(resp);
}

export async function listVideos(limit = 20, offset = 0) {
  const resp = await fetch(api(`/videos?limit=${limit}&offset=${offset}`), { headers: { "X-Client-Api-Key": getClientKey(), Authorization: `Bearer ${getClientKey()}` } });
  try {
    if (!resp.ok) return { items: [], total: 0 } as any;
    return await safeJson(resp);
  } catch {
    return { items: [], total: 0 } as any;
  }
}

export async function yijiaChat(payload: { model: string; messages: { role: string; content: string }[]; stream?: boolean }) {
  const resp = await fetch(api(`/chat`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`chat ${resp.status} ${text}`);
  }
  return await safeJson(resp);
}

export async function getUserSettings() {
  const key = getClientKey();
  const resp = await fetch(api(`/user/settings`), { headers: { "X-Client-Api-Key": key, Authorization: `Bearer ${key}` } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}

export async function saveUserSettings(payload: { default_ai_model?: string; client_api_key?: string; api_server_url?: string; api_routes?: string[]; language?: string; theme?: string }, overrideKey?: string) {
  const key = overrideKey || getClientKey();
  const resp = await fetch(api(`/user/settings`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function getUserModels() {
  const resp = await fetch(api(`/user/models`), { headers: { "X-Client-Api-Key": getClientKey() } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}

export async function saveUserModels(models: any[]) {
  const resp = await fetch(api(`/user/models`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify({ models }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function getUserModelHistory(limit = 100) {
  const resp = await fetch(api(`/user/models/history?limit=${Number(limit)}`), { headers: { "X-Client-Api-Key": getClientKey() } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function getUserModelVersions(limit = 50) {
  const resp = await fetch(api(`/user/models/versions?limit=${Number(limit)}`), { headers: { "X-Client-Api-Key": getClientKey() } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function restoreUserModels(version_id: string | number) {
  const resp = await fetch(api(`/user/models/restore`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify({ version_id }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function chatProvider(payload: { provider: string; model: string; messages: { role: string; content: string }[]; stream?: boolean; apiKey?: string; endpoint?: string }) {
  const body = { ...payload };
  const doRequest = async () => {
    const resp = await fetch(api(`/chat/provider`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`chatProvider ${resp.status} ${text}`);
    }
    return await safeJson(resp);
  };
  try {
    return await doRequest();
  } catch (e: any) {
    if (String(e?.message || e).includes("429")) {
      await new Promise(r => setTimeout(r, 800));
      return await doRequest();
    }
    throw e;
  }
}

export async function testGeminiKey(model = "gemini-3-pro-preview", apiKey?: string) {
  const resp = await fetch(api(`/admin/test-gemini`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify({ model, apiKey }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { ok: false, body: text }; }
}

export async function testDeepseekKey(model = "deepseek-chat", apiKey?: string, endpoint?: string) {
  const resp = await fetch(api(`/admin/test-deepseek`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify({ model, apiKey, endpoint }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { ok: false, body: text }; }
}

export async function testYijiaKey() {
  const resp = await fetch(api(`/admin/test-yijia`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify({}),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { ok: false, body: text }; }
}

export async function listAgents() {
  const resp = await fetch(api(`/agents`), { headers: { "X-Client-Api-Key": getClientKey() } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function createAgentApi(payload: any) {
  const resp = await fetch(api(`/agents`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function updateAgentApi(id: string | number, payload: any) {
  const resp = await fetch(api(`/agents/${encodeURIComponent(String(id))}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function deleteAgentApi(id: string | number) {
  const resp = await fetch(api(`/agents/${encodeURIComponent(String(id))}`), {
    method: "DELETE",
    headers: { "X-Client-Api-Key": getClientKey() },
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function getUserCharacters() {
  const resp = await fetch(api(`/user/characters`), { headers: { "X-Client-Api-Key": getClientKey() } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}

export async function saveUserCharacters(characters: any[]) {
  const resp = await fetch(api(`/user/characters`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey() },
    body: JSON.stringify({ characters }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function createCharacterApi(payload: { instruction_value: string; timestamps: string; video_id: string; uuid: string }) {
  const resp = await fetch(api(`/characters`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey(), Authorization: `Bearer ${getClientKey()}` },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function listCharactersApi() {
  const resp = await fetch(api(`/characters`), { headers: { "X-Client-Api-Key": getClientKey(), Authorization: `Bearer ${getClientKey()}` } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function getCharacterStatusApi(uuid: string) {
  const resp = await fetch(api(`/characters/${encodeURIComponent(uuid)}`), { headers: { "X-Client-Api-Key": getClientKey(), Authorization: `Bearer ${getClientKey()}` } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, body: text }; }
}

export async function testLineBase(base: string) {
  const resp = await fetch(api(`/line/test`), { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Api-Key": getClientKey(), Authorization: `Bearer ${getClientKey()}` }, body: JSON.stringify({ base }) });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { ok: false, body: text }; }
}
