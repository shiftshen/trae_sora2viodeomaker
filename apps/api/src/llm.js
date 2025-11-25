async function sendChat({ provider, model, messages, apiKey, endpoint }) {
  const payload = buildPayload(provider, model, messages);
  const { url, headers } = buildRequest(provider, model, apiKey, endpoint);
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    let text = "";
    try { text = await resp.text(); } catch {}
    throw new Error(`${provider} chat ${resp.status} ${String(text || "").slice(0, 300)}`);
  }
  try {
    const json = await resp.json();
    return normalize(provider, json);
  } catch {
    const text = await resp.text();
    return { raw: text };
  }
}

function buildPayload(provider, model, messages) {
  if (provider === "openai") {
    return { model, messages };
  }
  if (provider === "deepseek") {
    return { model, messages };
  }
  if (provider === "gemini") {
    return {
      contents: messages.map((m) => ({ role: m.role || "user", parts: [{ text: m.content }] })),
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    };
  }
  throw new Error("unsupported provider");
}

function buildRequest(provider, model, apiKeyOverride, endpoint) {
  if (provider === "openai") {
    const key = apiKeyOverride || process.env.OPENAI_API_KEY;
    if (!key) throw new Error("missing OPENAI_API_KEY");
    const base = (endpoint || "https://api.openai.com/v1").replace(/\/$/, "");
    return {
      url: `${base}/chat/completions`,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    };
  }
  if (provider === "deepseek") {
    const key = apiKeyOverride || process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("missing DEEPSEEK_API_KEY");
    const base = (endpoint || "https://api.deepseek.com/v1").replace(/\/$/, "");
    return {
      url: `${base}/chat/completions`,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    };
  }
  if (provider === "gemini") {
    const key = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("missing GEMINI_API_KEY");
    const base = (endpoint || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    return {
      url: `${base}/models/${encodeURIComponent(model)}:generateContent`,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    };
  }
  throw new Error("unsupported provider");
}

function normalize(provider, json) {
  if (provider === "openai" || provider === "deepseek") {
    const content = json?.choices?.[0]?.message?.content ?? "";
    return { content, raw: json };
  }
  if (provider === "gemini") {
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { content, raw: json };
  }
  return { raw: json };
}

export { sendChat };
