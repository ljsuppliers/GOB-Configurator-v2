// Parse every ES module in js/ (and api/*.js as CommonJS) without running it.
// `node --check` misreads the ES modules here, so this is the real gate before a deploy.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js') || p.endsWith('.mjs')) files.push(p); } };
walk('js'); walk('api'); if (fs.existsSync('sw.js')) files.push('sw.js');
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  try {
    if (f.startsWith('api/') || f === 'sw.js') new vm.Script(src, { filename: f });
    else new vm.SourceTextModule(src, { identifier: f });
  } catch (e) { bad++; console.error(`SYNTAX ERROR ${f}: ${e.message}`); }
}
console.log(bad ? `${bad} file(s) failed` : `syntax ok (${files.length} files)`);
process.exit(bad ? 1 : 0);
