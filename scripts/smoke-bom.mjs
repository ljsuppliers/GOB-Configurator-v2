// Deploy gate 2: actually RUN the materials engine on a fixed design so a runtime
// error (not just a syntax error) is caught before the site goes out.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const here = new URL('.', import.meta.url).pathname;
const C = here.replace(/scripts\/$/, '');
const app = fs.readFileSync(C + 'js/app.js', 'utf8');
const v = (f) => (app.match(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=(\\d+)')) || [])[1] || '';
const bom = await import(pathToFileURL(C + 'js/bom/premium-bom.js').href + '?v=' + v('premium-bom.js'));
const ord = await import(pathToFileURL(C + 'js/bom/orders.js').href + '?v=' + v('orders.js'));
const con = await import(pathToFileURL(C + 'js/construction.js').href + '?v=' + v('construction.js'));
const comps = JSON.parse(fs.readFileSync(C + 'data/components.json', 'utf8'));
const defs = { ...comps.doors, ...comps.windows };
const catalogue = JSON.parse(fs.readFileSync(C + 'data/catalogue.json', 'utf8'));
const st = JSON.parse(fs.readFileSync(C + 'data/defaults.json', 'utf8'));
Object.assign(st, { width: 3800, depth: 2800, height: 2500, tier: 'signature', hasCanopy: false, hasDecking: true, deckingDepth: 400, cornerLeft: 'open', cornerRight: 'open', foundationType: 'ground-screw', components: [{ id: 'c1', type: 'sliding-door-2500', elevation: 'front', positionX: 1550, customWidth: 2100 }, { id: 'c2', type: 'window-0.6m-opener', elevation: 'front', positionX: 600 }] });
const lines = ord.joinBom(bom.buildPremiumBom(st, defs), catalogue, {});
const orders = ord.buildOrders(lines, catalogue, { ref: 'SMOKE', siteAddress: 'x', supplierNotes: {} });
const sheets = con.buildConstructionDrawings(st, defs);
const bad = lines.filter((l) => !(l.qty > 0) || Number.isNaN(l.lineCost));
if (bad.length) { console.error('BAD LINES', bad.map((l) => l.name)); process.exit(1); }
console.log(`smoke ok: ${lines.length} lines, ${orders.length} orders, ${sheets.length} sheets`);
