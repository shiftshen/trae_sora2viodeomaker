const BASE_URL = "https://ai.yijiarj.cn";

async function sendYijiaChat({ model, messages, stream }) {
  const apiKey = process.env.YIJIA_API_KEY;
  if (!apiKey) throw new Error("missing YIJIA_API_KEY");
  const payload = { model, messages, stream: !!stream };
  const resp = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`yijia chat ${resp.status}`);
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/event-stream") || stream) {
    const reader = resp.body.getReader();
    let agg = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split(/\r?\n/);
      for (const l of lines) {
        const m = /^data:\s*(.*)$/.exec(l);
        if (m) {
          try {
            const obj = JSON.parse(m[1]);
            const delta = obj?.choices?.[0]?.delta?.content ?? obj?.content ?? "";
            if (delta) agg += delta;
          } catch {}
        }
      }
    }
    return { content: agg };
  }
  try { return await resp.json(); } catch { return { raw: await resp.text() }; }
}

export { sendYijiaChat };

