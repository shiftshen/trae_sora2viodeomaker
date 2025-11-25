const VIDEO_BASE_URL = "https://ai.yijiarj.cn";
const CHARACTER_BASE_URL = "https://video.yijiarj.cn";

async function createVideo({ input_reference, prompt, model, size, is_story, api_key }) {
  const apiKey = api_key || process.env.YIJIA_API_KEY;
  if (!apiKey) throw new Error("missing YIJIA_API_KEY");
  const rawModel = String(model || "");
  const lower = rawModel.toLowerCase();
  let remoteModel = lower === "sora-2" ? "sora-2-yijia" : rawModel;
  if (!/^sora/i.test(rawModel)) remoteModel = "sora-2-yijia";
  const ref = String(input_reference || "");
  const isData = ref.startsWith("data:");
  const sizeVal = size || apiKey;
  let resp;
  if (isData) {
    const form = new FormData();
    const [meta, data] = ref.split(",");
    const contentType = /data:(.*?);/.exec(meta)?.[1] || "application/octet-stream";
    const b = Buffer.from(data, "base64");
    const blob = new Blob([b], { type: contentType });
    form.append("input_reference", blob, "upload");
    form.append("prompt", prompt);
    form.append("model", remoteModel);
    form.append("size", sizeVal);
    if (is_story === "1") form.append("is_story", "1");
    resp = await fetch(`${VIDEO_BASE_URL}/v1/videos`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  } else {
    const payload = { prompt, model: remoteModel, size: sizeVal };
    if (ref) payload.input_reference = ref;
    if (is_story === "1") payload.is_story = "1";
    let r = await fetch(`${VIDEO_BASE_URL}/v1/videos`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok && (r.status === 429 || r.status === 503)) {
      await new Promise((res) => setTimeout(res, 700));
      r = await fetch(`${VIDEO_BASE_URL}/v1/videos`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    resp = r;
  }
  if (resp.ok) {
    return await resp.json();
  }
  try {
    const txt = await resp.text();
    if (/model_not_found/i.test(txt)) {
      throw new Error(`createVideo ${resp.status} model_not_found`);
    }
  } catch {}
  // Fallback: if remote rejects URL string, try uploading the referenced image as a Blob
  try {
    const ref = String(input_reference || "");
    if (/^https?:\/\//i.test(ref)) {
      const dl = await fetch(ref);
      if (!dl.ok) throw new Error(`download ${dl.status}`);
      const ab = await dl.arrayBuffer();
      const ct = dl.headers.get("content-type") || "application/octet-stream";
      const blob = new Blob([ab], { type: ct });
      const form2 = new FormData();
      form2.append("input_reference", blob, "upload");
      form2.append("prompt", prompt);
      form2.append("model", remoteModel);
      form2.append("size", size || sizeVal);
      if (is_story === "1") form2.append("is_story", "1");
      const r2 = await fetch(`${VIDEO_BASE_URL}/v1/videos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form2,
      });
      if (r2.ok) return await r2.json();
      let d2 = ""; try { d2 = await r2.text(); } catch {}
      throw new Error(`createVideo ${r2.status} ${d2}`);
    }
  } catch (e) {
    let detail = ""; try { detail = await resp.text(); } catch {}
    throw new Error(`createVideo ${resp.status} ${detail}`);
  }
  let finalDetail = ""; try { finalDetail = await resp.text(); } catch {}
  throw new Error(`createVideo ${resp.status} ${finalDetail}`);
}

async function getVideoStatus(id, api_key) {
  const apiKey = api_key || process.env.YIJIA_API_KEY;
  if (!apiKey) throw new Error("missing YIJIA_API_KEY");
  const rPrimary = await fetch(`${VIDEO_BASE_URL}/v1/videos/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (rPrimary.ok) return await rPrimary.json();
  const rFallback = await fetch(`${VIDEO_BASE_URL}/v1/videos/video_id`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "text/plain" },
    body: String(id),
  });
  if (!rFallback.ok) throw new Error(`getVideoStatus ${rFallback.status}`);
  return await rFallback.json();
}

async function createCharacter({ instruction_value, timestamps, video_id, uuid, api_key }) {
  const apiKey = api_key || process.env.YIJIA_API_KEY;
  if (!apiKey) throw new Error("missing YIJIA_API_KEY");
  const payload = { instruction_value, timestamps, video_id, uuid };
  const resp = await fetch(`${CHARACTER_BASE_URL}/v1/characters`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    let detail = "";
    try { detail = await resp.text(); } catch {}
    throw new Error(`createCharacter ${resp.status} ${detail}`);
  }
  return await resp.json();
}

async function listCharacters(api_key) {
  const apiKey = api_key || process.env.YIJIA_API_KEY;
  if (!apiKey) throw new Error("missing YIJIA_API_KEY");
  const resp = await fetch(`${CHARACTER_BASE_URL}/v1/characters`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`listCharacters ${resp.status}`);
  return await resp.json();
}

async function getCharacterStatus(uuid, api_key) {
  const apiKey = api_key || process.env.YIJIA_API_KEY;
  if (!apiKey) throw new Error("missing YIJIA_API_KEY");
  const r1 = await fetch(`${CHARACTER_BASE_URL}/v1/characters/${encodeURIComponent(uuid)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (r1.ok) return await r1.json();
  const r2 = await fetch(`${CHARACTER_BASE_URL}/v1/characters/uuid`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "text/plain" },
    body: String(uuid),
  });
  if (!r2.ok) throw new Error(`getCharacterStatus ${r2.status}`);
  return await r2.json();
}

export { createVideo, getVideoStatus, createCharacter, listCharacters, getCharacterStatus };
