import puppeteer from "puppeteer";

const CLIENT_KEY = process.env.CLIENT_KEY || "sk-local-test";
const API_BASE = "http://localhost:5050";
const APP_URL = process.env.APP_URL || "http://localhost:3010/";

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const badResponses = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) badResponses.push({ url: res.url(), status });
  });

  await page.evaluateOnNewDocument((key, base) => {
    localStorage.setItem("clientApiKey", key);
    localStorage.setItem("clientApiServer", base);
    localStorage.setItem("defaultAiModel", "deepseek-chat");
  }, CLIENT_KEY, API_BASE);

  const t0 = Date.now();
  let resp;
  try {
    resp = await page.goto(APP_URL, { waitUntil: "networkidle2", timeout: 20000 });
  } catch (e) {
    const fileUrl = new URL("../build/index.html", import.meta.url).toString();
    resp = await page.goto(fileUrl, { waitUntil: "load", timeout: 20000 });
  }
  const tOpen = Date.now() - t0;

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return {
      domContentLoaded: n?.domContentLoadedEventEnd || 0,
      loadEventEnd: n?.loadEventEnd || 0,
    };
  });

  const modelsLen = await page.evaluate(async () => {
    const origin = location.origin || "";
    const base = origin.startsWith("file:") ? "http://127.0.0.1:5050" : "";
    const r = await fetch(`${base}/api/user/models`, { headers: { "X-Client-Api-Key": localStorage.getItem("clientApiKey") || "" } });
    const j = await r.json();
    return Array.isArray(j?.data) ? j.data.length : 0;
  });

  const hasNetErr = consoleErrors.some((t) => /net::ERR|TypeError|ReferenceError/i.test(t));
  const hasBad = badResponses.length > 0;
  const within2s = nav.domContentLoaded && nav.domContentLoaded <= 2000;
  const fromFile = !resp || (typeof resp.url === "function" && String(resp.url()).startsWith("file:"));

  const ok = fromFile
    ? modelsLen > 0 && within2s
    : within2s && !hasNetErr && !hasBad && modelsLen > 0 && resp?.status() === 200;
  // 追加：在设置 UI 中执行 站点(Yijia) Key 检测 + 保存；模型(DeepSeek) Key 检测
  let uiYijia = { ran: false, success: false };
  let uiDeepseek = { ran: false, success: false };
  let savedOk = false;
  if (ok && !fromFile) {
    uiYijia.ran = true;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // 打开设置
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find(b => (b.textContent || "").includes("设置"));
      target && target.click();
    });
    // API服务器地址 & 本站 API Key 填写
    await sleep(200);
    await page.evaluate((base, key) => {
      const allLabels = Array.from(document.querySelectorAll('label'));
      const urlLabel = allLabels.find(l => /API服务器地址|API Server URL/.test(l.textContent || ''));
      const urlInput = urlLabel ? urlLabel.parentElement?.querySelector('input') : null;
      if (urlInput) { urlInput.focus(); urlInput.value = base; urlInput.dispatchEvent(new Event('input', { bubbles: true })); }
      const keyLabel = allLabels.find(l => /API Key/i.test(l.textContent || ''));
      const keyInput = keyLabel ? keyLabel.parentElement?.querySelector('input[type="text"]') : null;
      if (keyInput) { keyInput.focus(); keyInput.value = key; keyInput.dispatchEvent(new Event('input', { bubbles: true })); }
    }, API_BASE, CLIENT_KEY);
    // 监听 Yijia 检测响应并点击“检测”
    let yijiaOk = false;
    const yijiaListener = async (res) => { if (res.url().includes('/api/admin/test-yijia')) { try { yijiaOk = res.status() === 200; } catch {} } };
    page.on('response', yijiaListener);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-detect-yijia"]');
      (btn && typeof btn.click === 'function') ? btn.click() : null;
    });
    await sleep(800);
    page.off('response', yijiaListener);
    const toastYijia = await page.evaluate(() => document.body.innerText.includes('Yijia 用户 Key 可用'));
    uiYijia.success = yijiaOk || toastYijia;
    // 点击设置窗口底部“保存”
    await page.evaluate(() => {
      const dialog = document.querySelector('div[data-slot="dialog-content"]');
      const btns = Array.from(dialog ? dialog.querySelectorAll('button') : document.querySelectorAll('button'));
      const saveBtn = btns.reverse().find(b => (b.textContent || '').includes('保存'));
      saveBtn && saveBtn.click();
    });
    await sleep(300);
    savedOk = true;

    // 切到模型设置，并对 DeepSeek 执行检测
    uiDeepseek.ran = true;
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find(b => (b.textContent || "").includes("模型设置"));
      target && target.click();
    });
    await sleep(200);
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("div"));
      const target = cards.find(d => (d.textContent || "").includes("DeepSeek Chat"));
      target && target.click();
    });
    await sleep(200);
    await page.evaluate((k) => {
      const dialog = document.querySelector('div[data-slot="dialog-content"]');
      const inputs = Array.from(dialog ? dialog.querySelectorAll('input[type="text"]') : []);
      const apiKeyInput = inputs[inputs.length - 1];
      if (apiKeyInput) { apiKeyInput.focus(); apiKeyInput.value = k; apiKeyInput.dispatchEvent(new Event('input', { bubbles: true })); }
    }, CLIENT_KEY);
    let deepseekOk = false;
    const deepListener = async (res) => { if (res.url().includes('/api/admin/test-deepseek')) { try { deepseekOk = res.status() === 200; } catch {} } };
    page.on('response', deepListener);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-detect-model"]');
      (btn && typeof btn.click === 'function') ? btn.click() : null;
    });
    await sleep(800);
    page.off('response', deepListener);
    const toastDeep = await page.evaluate(() => document.body.innerText.includes('deepseek') || document.body.innerText.includes('DeepSeek Key 可用'));
    uiDeepseek.success = deepseekOk || toastDeep;
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-save-model"]');
      (btn && typeof btn.click === 'function') ? btn.click() : null;
    });
    await sleep(300);
    let yijiaUi = { disabledUpload: false, invalidLinkBlocked: false };
    try {
      await page.evaluate((yijiaUrl) => {
        const allLabels = Array.from(document.querySelectorAll('label'));
        const urlLabel = allLabels.find(l => /API服务器地址|API Server URL/.test(l.textContent || ''));
        const urlInput = urlLabel ? urlLabel.parentElement?.querySelector('input') : null;
        if (urlInput) { urlInput.focus(); urlInput.value = yijiaUrl; urlInput.dispatchEvent(new Event('input', { bubbles: true })); }
        const selTriggers = Array.from(document.querySelectorAll('[data-slot="select-trigger"],div[role="combobox"],button'));
        const trigger = selTriggers.find(el => (el.textContent || '').includes('线路选择')) || selTriggers[0];
        if (trigger && typeof trigger.click === 'function') trigger.click();
        const items = Array.from(document.querySelectorAll('[data-slot="select-item"],div[role="option"],div'));
        const yItem = items.find(el => (el.textContent || '').includes('https://ai.yijiarj.cn'));
        if (yItem && typeof yItem.click === 'function') yItem.click();
        const btn = document.querySelector('[data-testid="btn-save-settings"]');
        (btn && typeof btn.click === 'function') ? btn.click() : null;
      }, 'https://ai.yijiarj.cn');
      await sleep(300);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => (b.textContent || '').includes('设置'));
        target && target.click();
      });
      await sleep(200);
      const currentUrlVal = await page.evaluate(() => {
        const allLabels = Array.from(document.querySelectorAll('label'));
        const urlLabel = allLabels.find(l => /API服务器地址|API Server URL/.test(l.textContent || ''));
        const urlInput = urlLabel ? urlLabel.parentElement?.querySelector('input') : null;
        return urlInput ? urlInput.value : '';
      });
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="btn-save-settings"]');
        (btn && typeof btn.click === 'function') ? btn.click() : null;
      });
      await sleep(200);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => (b.textContent || '').includes('图生视频'));
        target && target.click();
      });
      await sleep(200);
      const disabledUpload = await page.evaluate(() => {
        const input = document.querySelector('input[type="file"]');
        return !!(input && input.disabled);
      });
      yijiaUi.disabledUpload = disabledUpload;
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const textInput = inputs.find(i => !i.type || i.type === 'text');
        if (textInput) {
          textInput.focus();
          textInput.value = 'invalid';
          textInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => (b.textContent || '').includes('生成'));
        target && target.click();
      });
      await sleep(400);
      const blocked = await page.evaluate(() => {
        const t = document.body.innerText || '';
        return t.includes('当前线路只支持图片链接或资源引用') || t.includes('请填写有效的图片链接或资源引用');
      });
      yijiaUi.invalidLinkBlocked = blocked;
      yijiaUi.currentUrlVal = currentUrlVal;
    } catch {}
    uiDeepseek.yijiaUi = yijiaUi;
  }
  console.log(JSON.stringify({ ok, metrics: { tOpen, domContentLoaded: nav.domContentLoaded }, modelsLen, badResponses, consoleErrors, fromFile, uiYijia, savedOk, uiDeepseek }, null, 2));

  await browser.close();
  process.exit(ok ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
