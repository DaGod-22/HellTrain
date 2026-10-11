import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'node:fs';
export async function launch() {
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: 'shell', defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0,300)));
  page.on('console', m => { if (m.type()==='error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) console.log('[console]', m.text().slice(0,300)); });
  await page.evaluateOnNewDocument(() => {
    let vt = 0; let q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    performance.now = () => vt;
    window.__tick = (ms) => { vt += ms; const cur = q; q = []; for (const cb of cur) cb(vt); };
  });
  await page.goto('file:///home/user/HellTrain/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.__ENGINE__ && globalThis.__ENGINE__.current, { timeout: 60000, polling: 200 });
  return { browser, page };
}
export async function grab(page, file) {
  const d = await page.evaluate(() => __ENGINE__.canvas.toDataURL('image/png'));
  if (file) fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
  return d;
}
