/* Headless Chrome over the DevTools protocol, for the voice-over tools.
   open(script) loads a throw-away file:// page (a secure context, which WebCodecs
   needs) holding `script`, and returns ev(expr) to run code in it. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function open(script, name = 'vo_tool') {
  const port = 9470 + Math.floor(Math.random() * 20);
  const prof = join(ROOT, '.tmp', name + '_chrome');   // throw-away browser profile, kept off the system drive
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 80 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { } if (!page) await sleep(200); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  const html = join(ROOT, '.tmp', name + '.html');
  writeFileSync(html, `<!doctype html><script>${script}</script>`);
  await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await sleep(800);
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed');
    return r.result.result.value;
  };
  return { ev, close() { try { ws.close(); } catch { } proc.kill(); } };
}
