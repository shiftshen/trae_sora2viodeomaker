const jobs = new Map();

function startMockJob(prompt) {
  const id = String(Date.now());
  jobs.set(id, { start: Date.now(), prompt });
  return { id, object: "video", model: "sora-2", status: "queued", progress: 0, created_at: Math.floor(Date.now() / 1000), size: "720x720" };
}

function getMockStatus(id) {
  const job = jobs.get(String(id));
  if (!job) return { id: String(id), object: "video", model: "sora-2", status: "error", progress: 0, created_at: Math.floor(Date.now() / 1000), size: "720x720", url: "" };
  const elapsed = (Date.now() - job.start) / 1000;
  const p = Math.min(100, Math.floor((elapsed / 15) * 100));
  const completed = p >= 100;
  return {
    id: String(id),
    url: completed ? `https://example.com/mock/${id}.mp4` : "",
    size: "720x720",
    model: "sora-2",
    object: "video",
    status: completed ? "completed" : "processing",
    quality: completed ? "standard" : "",
    seconds: "10",
    progress: p,
    created_at: Math.floor(job.start / 1000),
  };
}

export { startMockJob, getMockStatus };