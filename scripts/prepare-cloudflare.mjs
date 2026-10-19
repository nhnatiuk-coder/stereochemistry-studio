import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';

// Keep the hosted Indigo worker separate so every asset fits Cloudflare's limit.
const dir = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(dir).filter(name => name.endsWith('.js'));
let extracted = false;
for (const name of files) {
  const path = new URL(name, dir);
  let js = readFileSync(path, 'utf8');
  let marker = 'createBase64WorkerFactory("';
  let start = js.indexOf(marker);
  if (start < 0) { marker = "createBase64WorkerFactory('"; start = js.indexOf(marker); }
  if (start < 0) continue;
  const valueStart = start + marker.length;
  const valueEnd = js.indexOf(marker.at(-1), valueStart);
  const callEnd = js.indexOf(')', valueEnd) + 1;
  const payload = js.slice(valueStart, valueEnd);
  if (payload.length < 100000) throw Error('Unexpected Indigo worker payload.');
  writeFileSync(new URL('indigo.worker.js', dir), Buffer.from(payload, 'base64'));
  js = js.slice(0, start) + "function(options) { return new Worker(new URL('./indigo.worker.js', import.meta.url), options); }" + js.slice(callEnd);
  writeFileSync(path, js);
  extracted = true;
}
if (!extracted && !readdirSync(dir).includes('indigo.worker.js')) throw Error('Indigo worker not found.');
for (const name of readdirSync(dir)) {
  if (statSync(new URL(name, dir)).size > 25 * 1024 * 1024) throw Error(`Cloudflare asset too large: ${name}`);
}
console.log('Cloudflare assets prepared.');
