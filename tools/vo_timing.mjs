#!/usr/bin/env node
/* Voice-over timing + Safari copies.
   usage: node tools/vo_timing.mjs            (every clip in assets/vo/)
   For each assets/vo/<id>.ogg:
   - writes assets/vo/<id>.caf — the same Opus packets in a Core Audio container,
     for Safari/iOS versions that cannot play Ogg (Opus in CAF plays since iOS 11);
   - measures where the narrator speaks: speech onset, end, and every pause
     (decoded by headless Chrome), saved to tools/vo_timing.json.
   The player uses the pauses to keep the words, cues and chunk breaks on the voice.
   vo_build.mjs calls the same functions for newly added clips. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, open } from './chrome.mjs';

const VO = join(ROOT, 'assets', 'vo');
export const TIMING = join(ROOT, 'tools', 'vo_timing.json');

/* ---------------------------------------------------------- ogg → caf */
function oggPackets(buf) {
  const packets = []; let part = [], gran = 0, p = 0;
  while (p + 27 <= buf.length && buf.toString('latin1', p, p + 4) === 'OggS') {
    const nseg = buf[p + 26], g = Number(buf.readBigInt64LE(p + 6));
    if (g > 0) gran = g;
    let q = p + 27 + nseg;
    for (let i = 0; i < nseg; i++) {
      const n = buf[p + 27 + i];
      part.push(buf.subarray(q, q + n)); q += n;
      if (n < 255) { packets.push(Buffer.concat(part)); part = []; }
    }
    p = q;
  }
  return { packets, gran };
}
/** frames in one Opus packet, from its TOC byte (RFC 6716 §3.1) */
function opusFrames(pk) {
  const toc = pk[0], cfg = toc >> 3;
  const size = cfg < 12 ? [480, 960, 1920, 2880][cfg & 3] : cfg < 16 ? [480, 960][cfg & 1] : [120, 240, 480, 960][cfg & 3];
  const c = toc & 3, count = c === 0 ? 1 : c === 3 ? (pk[1] & 63) : 2;
  return size * count;
}
const ber = n => { const out = [n & 127]; while ((n >>= 7)) out.unshift((n & 127) | 128); return out; };
export function toCaf(ogg) {
  const { packets, gran } = oggPackets(ogg);
  const head = packets[0], audio = packets.slice(2);
  const preskip = head.readUInt16LE(10), channels = head[9];
  const fpp = opusFrames(audio[0]);
  const total = audio.reduce((s, pk) => s + opusFrames(pk), 0);
  const valid = Math.max(0, Math.min(total - preskip, gran - preskip));
  const chunk = (type, body) => { const h = Buffer.alloc(12); h.write(type, 0, 'latin1'); h.writeBigInt64BE(BigInt(body.length), 4); return Buffer.concat([h, body]); };
  const desc = Buffer.alloc(32);
  desc.writeDoubleBE(48000, 0); desc.write('opus', 8, 'latin1');
  desc.writeUInt32BE(0, 12); desc.writeUInt32BE(0, 16);          // flags, bytes per packet (variable)
  desc.writeUInt32BE(fpp, 20); desc.writeUInt32BE(channels, 24); desc.writeUInt32BE(0, 28);
  const pk = Buffer.alloc(24);
  pk.writeBigInt64BE(BigInt(audio.length), 0); pk.writeBigInt64BE(BigInt(valid), 8);
  pk.writeInt32BE(preskip, 16); pk.writeInt32BE(total - preskip - valid, 20);
  const sizes = Buffer.from(audio.flatMap(a => ber(a.length)));
  const data = Buffer.concat([Buffer.alloc(4), ...audio]);         // edit count 0, then the packets
  const file = Buffer.from([0x63, 0x61, 0x66, 0x66, 0, 1, 0, 0]);   // 'caff', version 1
  return Buffer.concat([file, chunk('desc', desc), chunk('pakt', Buffer.concat([pk, sizes])), chunk('data', data)]);
}

/* ------------------------------------------------------- speech timing */
const ANALYSER = `
async function speech(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const buf = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(bytes.buffer);
  const d = buf.getChannelData(0), F = 160, db = [];                 // 10 ms frames
  for (let i = 0; i + F <= d.length; i += F) { let s = 0; for (let j = i; j < i + F; j++) s += d[j] * d[j]; db.push(10 * Math.log10(s / F + 1e-10)); }
  const sorted = [...db].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * .1)], peak = sorted[Math.floor(sorted.length * .97)];
  const thr = Math.max(floor + 10, peak - 32);
  const on = db.map(v => v > thr);
  // close tiny gaps inside words (< 60 ms) and ignore blips (< 40 ms)
  for (let i = 1; i < on.length; i++) if (!on[i] && on[i - 1]) { let j = i; while (j < on.length && !on[j]) j++; if (j < on.length && j - i < 6) for (let k = i; k < j; k++) on[k] = true; i = j; }
  for (let i = 0; i < on.length; i++) if (on[i]) { let j = i; while (j < on.length && on[j]) j++; if (j - i < 4) for (let k = i; k < j; k++) on[k] = false; i = j; }
  const first = on.indexOf(true), last = on.lastIndexOf(true);
  const gaps = [];
  for (let i = first; i <= last; i++) if (!on[i]) { let j = i; while (!on[j]) j++; if (j - i >= 9) gaps.push([i / 100, j / 100]); i = j; }
  return { on: first / 100, off: (last + 1) / 100, gaps };
}`;

export async function analyse(ids) {
  const timing = existsSync(TIMING) ? JSON.parse(readFileSync(TIMING, 'utf8')) : {};
  if (!ids.length) return timing;
  const c = await open(ANALYSER, 'vo_timing');
  try {
    for (const id of ids) {
      const ogg = readFileSync(join(VO, id + '.ogg'));
      writeFileSync(join(VO, id + '.caf'), toCaf(ogg));
      timing[id] = await c.ev(`speech(${JSON.stringify(ogg.toString('base64'))})`);
      console.log(`${id}  speech ${timing[id].on.toFixed(2)}–${timing[id].off.toFixed(2)} s  pauses ${timing[id].gaps.map(g => g.join('–')).join(' ') || '—'}`);
    }
  } finally { c.close(); }
  const sorted = Object.fromEntries(Object.keys(timing).sort().map(k => [k, timing[k]]));
  writeFileSync(TIMING, JSON.stringify(sorted, null, 1) + '\n');
  return sorted;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = readdirSync(VO).filter(f => f.endsWith('.ogg')).map(f => f.slice(0, -4)).sort();
  await analyse(ids);
  console.log(`\n${ids.length} clips timed; Safari copies in assets/vo/*.caf — now run: node tools/vo_build.mjs (rewrites js/vo_lines.js)`);
}
