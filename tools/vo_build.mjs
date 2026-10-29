#!/usr/bin/env node
/* Voice-over build tool.
   usage: node tools/vo_build.mjs <voiceovers_batch.zip> [more.zip ...]
   - extracts voiceovers/<id>.mp3 from the studio zip(s) (later zips win),
   - converts each to Ogg Opus, 32 kbps mono (decoded + encoded by headless Chrome:
     Web Audio for the MP3 decode/resample, WebCodecs AudioEncoder for Opus; this file
     writes the Ogg pages itself, RFC 7845),
   - times the speech and writes the Safari copy (tools/vo_timing.mjs),
   - regenerates js/vo_lines.js from tools/vo_script.json and lists lines with no clip,
   - removes clips that no line uses.
   Safe to run again: clips already in assets/vo/ are kept with their measured length.
   Needs Node 22+ and Google Chrome (override the path with CHROME=...). */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { join } from 'node:path';
import { ROOT, open } from './chrome.mjs';
import { analyse } from './vo_timing.mjs';

const SCRIPT = join(ROOT, 'tools', 'vo_script.json');
const OUT = join(ROOT, 'assets', 'vo');
const MAP = join(ROOT, 'js', 'vo_lines.js');
const BITRATE = 32000;

/* ---------------------------------------------------------------- zip */
function readZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const ds = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const raw = buf.subarray(ds, ds + csize);
    files[name] = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

/* ---------------------------------------------------------------- ogg */
const OGG_CRC = new Uint32Array(256).map((_, n) => { let c = n << 24; for (let k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1; return c >>> 0; });
function oggCrc(b) { let c = 0; for (const x of b) c = ((c << 8) ^ OGG_CRC[((c >>> 24) ^ x) & 255]) >>> 0; return c; }
function oggPage(type, granule, serial, seq, packets) {
  const lace = [];
  for (const p of packets) { let n = p.length; while (n >= 255) { lace.push(255); n -= 255; } lace.push(n); }
  const h = Buffer.alloc(27 + lace.length);
  h.write('OggS', 0); h[4] = 0; h[5] = type;
  h.writeBigInt64LE(BigInt(granule), 6); h.writeUInt32LE(serial, 14); h.writeUInt32LE(seq, 18);
  h[26] = lace.length; lace.forEach((v, i) => { h[27 + i] = v; });
  const page = Buffer.concat([h, ...packets]);
  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}
/** Ogg Opus file. Granules count 48 kHz samples incl. pre-skip; the last one marks the real end. */
function oggOpus({ packets, samples, preskip, inputRate }) {
  const serial = (Math.random() * 0xffffffff) >>> 0;
  const head = Buffer.alloc(19);
  head.write('OpusHead', 0); head[8] = 1; head[9] = 1;
  head.writeUInt16LE(preskip, 10); head.writeUInt32LE(inputRate, 12); head.writeInt16LE(0, 16); head[18] = 0;
  const vendor = Buffer.from('angles-lab vo_build');
  const tags = Buffer.alloc(8 + 4 + vendor.length + 4);
  tags.write('OpusTags', 0); tags.writeUInt32LE(vendor.length, 8); vendor.copy(tags, 12); tags.writeUInt32LE(0, 12 + vendor.length);
  const pages = [oggPage(2, 0, serial, 0, [head]), oggPage(0, 0, serial, 1, [tags])];
  const end = preskip + samples;
  let seq = 2, gran = 0;
  for (let i = 0; i < packets.length; i += 50) {           // ~1 s of 20 ms packets per page
    const group = packets.slice(i, i + 50);
    gran += group.reduce((s, p) => s + p.s, 0);
    const last = i + 50 >= packets.length;
    pages.push(oggPage(last ? 4 : 0, last ? end : Math.min(gran, end), serial, seq++, group.map(p => p.d)));
  }
  return Buffer.concat(pages);
}

const ENCODER = `
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function encodeClip(src) {
  const bytes = Uint8Array.from(atob(src), c => c.charCodeAt(0));
  const probe = new OfflineAudioContext(1, 1, 48000);
  const buf = await probe.decodeAudioData(bytes.buffer);        // resampled to 48 kHz
  const n = buf.length, mono = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels; }
  const packets = []; let desc = null, err = null;
  const enc = new AudioEncoder({
    output: (chunk, meta) => { const a = new Uint8Array(chunk.byteLength); chunk.copyTo(a); packets.push({ d: b64(a), s: Math.round(chunk.duration * 48000 / 1e6) }); if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description); },
    error: e => { err = e; },
  });
  enc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: ${BITRATE} });
  const F = 4800;
  for (let i = 0; i < n; i += F) {
    const len = Math.min(F, n - i);
    enc.encode(new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: len, numberOfChannels: 1, timestamp: Math.round(i / 48000 * 1e6), data: mono.slice(i, i + len) }));
  }
  await enc.flush(); enc.close();
  if (err) throw err;
  let preskip = 312;   // libopus default look-ahead at 48 kHz
  if (desc && desc.length >= 12 && String.fromCharCode(...desc.slice(0, 8)) === 'OpusHead') preskip = desc[10] | (desc[11] << 8);
  return { samples: n, seconds: n / 48000, srcRate: Math.round(buf.sampleRate), preskip, packets };
}`;

/* --------------------------------------------------------------- main */
const zips = process.argv.slice(2);
const script = JSON.parse(readFileSync(SCRIPT, 'utf8'));
const ids = new Set(script.map(s => s.id));
mkdirSync(OUT, { recursive: true });

// durations already known from the current map (so reruns keep existing clips)
const known = {};
if (existsSync(MAP)) {
  const m = readFileSync(MAP, 'utf8').match(/const VO_LINES = (\{[\s\S]*\});/);
  if (m) for (const [, v] of Object.entries(JSON.parse(m[1]))) known[v[0]] = v[1];
}

const mp3 = {};
for (const z of zips) {
  const files = readZip(readFileSync(z));
  for (const [name, data] of Object.entries(files)) {
    const m = name.match(/([^/\\]+)\.mp3$/i);
    if (m && ids.has(m[1])) mp3[m[1]] = data;
  }
}
const todo = Object.keys(mp3).sort();
console.log(`${todo.length} new MP3s from ${zips.length} zip(s)`);
if (todo.length) {
  const c = await open(ENCODER, 'vo_build');
  try {
    for (const id of todo) {
      const r = await c.ev(`encodeClip(${JSON.stringify(mp3[id].toString('base64'))})`);
      const ogg = oggOpus({ packets: r.packets.map(p => ({ d: Buffer.from(p.d, 'base64'), s: p.s })), samples: r.samples, preskip: r.preskip, inputRate: r.srcRate });
      writeFileSync(join(OUT, id + '.ogg'), ogg);
      known[id] = Math.round(r.seconds * 100) / 100;
      console.log(`${id}  ${known[id].toFixed(2)} s  ${(ogg.length / 1024).toFixed(1)} KB  (mp3 ${(mp3[id].length / 1024).toFixed(0)} KB, preskip ${r.preskip})`);
    }
  } finally { c.close(); }
}

// speech timing (onset, end, pauses) for new clips and any clip not timed yet
let timing = await analyse([]);
const untimed = readdirSync(OUT).filter(f => f.endsWith('.ogg')).map(f => f.slice(0, -4)).filter(id => ids.has(id) && (todo.includes(id) || !timing[id] || !existsSync(join(OUT, id + '.caf'))));
if (untimed.length) timing = await analyse(untimed);

// map: exact line as shown → [clip id, seconds, speech onset, speech end, pauses [[from, to], ...]]
const map = {}, missing = [];
for (const s of script) {
  const t = timing[s.id];
  if (existsSync(join(OUT, s.id + '.ogg')) && known[s.id]) map[s.line] = t ? [s.id, known[s.id], t.on, t.off, t.gaps] : [s.id, known[s.id]];
  else missing.push(s);
}
writeFileSync(MAP, `/* GENERATED by tools/vo_build.mjs from tools/vo_script.json — do not edit by hand.
   Exact line as shown in the narration bar → [clip id in assets/vo/, seconds, speech onset, speech end, pauses]. */
const VO_LINES = ${JSON.stringify(map, null, 1)};
`);
// remove clips no line uses
for (const f of readdirSync(OUT)) if (!ids.has(f.replace(/\.(ogg|caf)$/, '')) || !/\.(ogg|caf)$/.test(f)) { unlinkSync(join(OUT, f)); console.log('removed', f); }
const total = Object.values(map).reduce((s, v) => s + v[1], 0);
const size = readdirSync(OUT).reduce((s, f) => s + readFileSync(join(OUT, f)).length, 0);
console.log(`\nvoiced ${Object.keys(map).length}/${script.length} lines · ${(total / 60).toFixed(1)} min · assets/vo ${(size / 1024).toFixed(0)} KB`);
if (missing.length) console.log(`no clip yet (${missing.length}): ${missing.map(s => s.id).join(' ')}`);
