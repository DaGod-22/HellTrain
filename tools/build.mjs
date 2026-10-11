// ============================================================
// HELL TRAIN — Node build (Vercel-friendly twin of tools/build.py)
//
// Packs src/ modules into the single-file index.html payload and
// mirrors the result into public/index.html for static hosting.
// Kept byte-identical with build.py: same payload order, same
// JSON encoding (compact, "</" escaped as "<\/").
//
// Usage: node tools/build.mjs   (or: npm run build)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'index.html');
const SRC = path.join(ROOT, 'src');
const PUB = path.join(ROOT, 'public');

const PAYLOAD_RE = /(<script id="hell-train-payload" type="application\/json">\n)([\s\S]*?)(\n<\/script>)/;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function loadPayload(html) {
  const m = PAYLOAD_RE.exec(html);
  if (!m) die('payload not found in index.html');
  return JSON.parse(m[2]);
}

function walk(dir, base = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const rel = base ? base + '/' + ent.name : ent.name;
    if (ent.isDirectory()) out.push(...walk(path.join(dir, ent.name), rel));
    else if (ent.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

function main() {
  const html = fs.readFileSync(HTML, 'utf8');
  const payload = loadPayload(html);

  // Module order: keep the existing order, drop removed files, append
  // anything new (sorted for stability) — same rule as build.py.
  const existing = payload.order.filter((f) => fs.existsSync(path.join(SRC, f)));
  const known = new Set(existing);
  const fresh = walk(SRC).filter((f) => !known.has(f));
  const order = existing.concat(fresh);
  payload.order = order;
  const sources = {};
  for (const f of order) {
    const p = path.join(SRC, f);
    if (!fs.existsSync(p)) die('missing module source: ' + f);
    sources[f] = fs.readFileSync(p, 'utf8');
  }
  payload.sources = sources;
  payload.icons = JSON.parse(fs.readFileSync(path.join(SRC, 'icons.json'), 'utf8'));

  // Same encoder as python json.dumps(ensure_ascii=False, separators=(",", ":"))
  let newPayload = JSON.stringify(payload);
  newPayload = newPayload.replace(/<\//g, '<\\/');   // "</" → "<\/" (safe inside <script>)
  const out = html.replace(PAYLOAD_RE, (_m, head, _body, tail) => head + newPayload + tail);
  fs.writeFileSync(HTML, out);

  // Static hosts (Vercel) serve public/ — mirror the standalone file there.
  fs.mkdirSync(PUB, { recursive: true });
  fs.writeFileSync(path.join(PUB, 'index.html'), out);

  const total = Object.values(sources).reduce((n, s) => n + s.length, 0);
  console.log(`packed ${Object.keys(sources).length} modules (${total} chars) into index.html (${Buffer.byteLength(out)} bytes)`);
  console.log('mirrored public/index.html for static deploy');
}

main();
