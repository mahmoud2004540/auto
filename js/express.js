// Express Tools, workspaces, status bar tools (isolate, transparency, selection cycling, quick properties, clean screen)
'use strict';

// ---------- Express Tools ----------
const textEnts = (s) => s.filter(e => e.type === 'text' || e.type === 'mtext');
def('TXT2MTXT', ['T2M'], 'Combine single-line texts into one multiline text', async () => {
  const s = (await getSelection('Select text objects')).filter(e => e.type === 'text');
  if (!s.length) { UI.log('Select single-line text objects.', 'err'); return; }
  s.sort((a, b) => b.p.y - a.p.y || a.p.x - b.p.x);
  const h = s[0].h, x = Math.min(...s.map(e => e.p.x));
  const w = Math.max(...s.map(e => e.p.x - x + textWidth(e.s, e.h)));
  const m = inheritStyle(s[0], { type: 'mtext', p: { x, y: s[0].p.y + h }, h, w: w * 1.05, rot: s[0].rot || 0, s: s.map(e => e.s).join('\n') });
  removeEnts(s); addEnt(m);
  UI.log(`${s.length} text object(s) combined into one MText.`);
});
def('TCOUNT', [], 'Add sequential numbers to text objects', async () => {
  const s = textEnts(await getSelection('Select text objects')); if (!s.length) return;
  const k = await getKeyword('Sort selected objects by [X/Y/Select-order] <Y>', { keywords: ['X', 'Y', 'Select-order'], def: 'Y' });
  if (k === 'X') s.sort((a, b) => a.p.x - b.p.x); else if (k === 'Y') s.sort((a, b) => b.p.y - a.p.y);
  const se = (await getString('Specify starting number and increment (Start,increment) <1,1>')).trim() || '1,1';
  const [st, inc] = se.split(',').map(Number);
  const mode = await getKeyword('Placement of numbers in text [Overwrite/Prefix/Suffix/Find&replace] <Prefix>', { keywords: ['Overwrite', 'Prefix', 'Suffix'], def: 'Prefix' });
  s.forEach((e, i) => { const n = String((isFinite(st) ? st : 1) + i * (isFinite(inc) ? inc : 1)); e.s = mode === 'Overwrite' ? n : mode === 'Suffix' ? `${e.s} ${n}` : `${n} ${e.s}`; invalidate(e); });
  UI.log(`${s.length} text object(s) numbered.`);
});
def('TCASE', [], 'Change the case of text', async () => {
  const s = textEnts(await getSelection('Select text objects')); if (!s.length) return;
  const k = await getKeyword('Select case [Sentence/lower/UPPER/Title/tOGGLE] <UPPER>', { keywords: ['Sentence', 'lower', 'UPPER', 'Title', 'tOGGLE'], def: 'UPPER' });
  const f = {
    Sentence: (t) => t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase()),
    lower: (t) => t.toLowerCase(), UPPER: (t) => t.toUpperCase(),
    Title: (t) => t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    tOGGLE: (t) => [...t].map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
  }[k] || ((t) => t.toUpperCase());
  s.forEach(e => { e.s = f(e.s); invalidate(e); });
});
def('BURST', [], 'Explode blocks and turn attribute values into text', async () => {
  const s = (await getSelection('Select objects')).filter(e => e.type === 'insert');
  for (const e of s) { const parts = Types.insert.explode(e); removeEnts([e]); parts.forEach(p => { p._keepColor = true; addEnt(p); }); }
  UI.log(`${s.length} block(s) burst.`);
});
def('BREAKLINE', ['BRKLINE'], 'Draw a break line symbol', async () => {
  const size = App.brkSize || App.doc.textH * 2;
  let a = await getPoint(`Specify first point for breakline or [Size] (size = ${fmt(size)})`, { keywords: ['Size'] });
  if (a === 'Size') { const v = await getDist(`Breakline symbol size <${fmt(size)}>`, { def: size }); if (typeof v === 'number' && v > 0) App.brkSize = v; a = await getPoint('Specify first point for breakline'); }
  if (!isPt(a)) return;
  const sz = App.brkSize || size;
  const mk = (b) => {
    const d = V.norm(V.sub(b, a)), n = V.perp(d), L = V.dist(a, b), m = V.mid(a, b);
    if (L < sz * 1.2) return { type: 'pline', pts: [a, b], closed: false };
    const P = (t, o) => V.add(V.add(m, V.mul(d, t * sz)), V.mul(n, o * sz));
    return { type: 'pline', pts: [a, P(-0.5, 0), P(-0.17, 0.6), P(0.17, -0.6), P(0.5, 0), b], closed: false };
  };
  const b = await getPoint('Specify second point for breakline', { base: a, preview: (q) => [{ ...mk(q), layer: App.doc.cur }] });
  if (!isPt(b)) return;
  addEnt(mk(b));
});
def('FLATTEN', [], 'Convert 3D objects to flat 2D geometry', async () => {
  const s = await getSelection('Select objects to convert to 2d'); let n = 0;
  for (const e of s) {
    if (e.type === 'solid3d') { const lines = []; flattenEnt(e, lines); removeEnts([e]); lines.forEach(l => { delete l.color; addEnt(inheritStyle(e, l)); }); n++; }
    else if (e.thick) { delete e.thick; invalidate(e); n++; }
  }
  UI.log(`${n} object(s) flattened.`);
});
async function pickLayer(prompt) { const p = await getEntity(prompt); return p && typeof p === 'object' ? p.e.layer : null; }
def('LAYMRG', [], 'Merge layers into a target layer', async () => {
  const src = new Set();
  for (;;) { const l = await pickLayer(`Select object on layer to merge${src.size ? ' or <done>' : ''}`); if (!l) break; src.add(l); UI.log(`Selected layers: ${[...src].join(', ')}`); }
  if (!src.size) return;
  const tgt = await pickLayer('Select object on target layer'); if (!tgt) return;
  src.delete(tgt); if (!src.size) return;
  const k = await getKeyword(`Merge ${src.size} layer(s) into "${tgt}"? [Yes/No] <No>`, { keywords: ['Yes', 'No'], def: 'No' });
  if (k !== 'Yes') return;
  App.doc.ents.forEach(e => { if (src.has(e.layer)) e.layer = tgt; });
  Object.values(App.doc.blocks || {}).forEach(b => b.ents.forEach(e => { if (src.has(e.layer)) e.layer = tgt; }));
  App.doc.layers = App.doc.layers.filter(l => !src.has(l.name) || l.name === '0');
  if (src.has(App.doc.cur)) App.doc.cur = tgt;
  UI.log(`Merged into layer "${tgt}".`);
});
def('LAYDEL', [], 'Delete a layer and every object on it', async () => {
  const l = await pickLayer('Select object on layer to delete'); if (!l) return;
  if (l === '0' || l === App.doc.cur) { UI.log('Cannot delete layer 0 or the current layer.', 'err'); return; }
  const n = App.doc.ents.filter(e => e.layer === l).length;
  const k = await getKeyword(`Layer "${l}" has ${n} object(s). Delete the layer and its objects? [Yes/No] <No>`, { keywords: ['Yes', 'No'], def: 'No' });
  if (k !== 'Yes') return;
  removeEnts(App.doc.ents.filter(e => e.layer === l));
  App.doc.layers = App.doc.layers.filter(x => x.name !== l);
  UI.log(`Deleted layer "${l}" and ${n} object(s).`);
});

// ---------- object isolation ----------
App.hidden = new Set();
def('ISOLATEOBJECTS', ['ISOLATE'], 'Show only the selected objects', async () => {
  const s = await getSelection('Select objects to isolate'); if (!s.length) return;
  const keep = new Set(s.map(e => e.id)); App.hidden = new Set(App.doc.ents.filter(e => !keep.has(e.id)).map(e => e.id)); App.dirty = true; UI.refreshStatusExtra();
}, { noUndo: true });
def('HIDEOBJECTS', ['HIDEOBJ'], 'Temporarily hide the selected objects', async () => {
  const s = await getSelection('Select objects to hide'); s.forEach(e => App.hidden.add(e.id)); App.dirty = true; UI.refreshStatusExtra();
}, { noUndo: true });
def('UNISOLATEOBJECTS', ['UNISOLATE', 'UNHIDE'], 'End object isolation', async () => { App.hidden.clear(); App.dirty = true; UI.refreshStatusExtra(); UI.log('Object isolation ended.'); }, { noUndo: true, noRepeat: true });

// ---------- clean screen ----------
def('CLEANSCREENON', ['CLEANSCREEN'], 'Toggle Clean Screen (Ctrl+0)', async () => { document.getElementById('app').classList.toggle('clean'); resize(); }, { noUndo: true, noRepeat: true });

// ---------- workspaces & tab order (as in AutoCAD) ----------
RIBBON['Express Tools'] = [
  { label: 'Blocks', items: [['BURST', 'Burst', 'explode']] },
  { label: 'Text', items: [['TXT2MTXT', 'Convert to MText', 'text'], { col: [['TCOUNT', 'Auto Number', 'list'], ['TCASE', 'Change Case', 'text']] }] },
  { label: 'Modify', items: [['FLATTEN', 'Flatten', 'box3'], ['OVERKILL', 'Delete Duplicate Objects', 'join']] },
  { label: 'Layers', items: [{ col: [['LAYMRG', 'Merge', 'layers'], ['LAYDEL', 'Delete', 'layoff']] }] },
  { label: 'Draw', items: [['BREAKLINE', 'Break-line Symbol', 'break']] },
];
const RIBBON_ALL = Object.assign({}, RIBBON);
const WORKSPACES = {
  'Drafting & Annotation': ['Home', 'Insert', 'Annotate', 'Parametric', 'View', 'Manage', 'Output', 'Express Tools', 'Architecture', 'Mechanical', 'Electrical'],
  '3D Modeling': ['Solid', 'Home', 'Insert', 'Annotate', 'View', 'Manage', 'Output', 'Express Tools'],
};
function applyWorkspace(name) {
  const order = WORKSPACES[name] || WORKSPACES['Drafting & Annotation'];
  for (const k of Object.keys(RIBBON)) delete RIBBON[k];
  for (const k of order) if (RIBBON_ALL[k]) RIBBON[k] = RIBBON_ALL[k];
  UI.workspace = name;
  if (!RIBBON[UI.tab]) UI.tab = order[0];
  if (name === '3D Modeling') UI.tab = 'Solid';
  try { localStorage.setItem('opendraft-ws', name); } catch (_) { /* ignore */ }
  UI.buildRibbon();
}

// ---------- status bar additions ----------
const ST_ICONS = {
  st_iso: '<path class="y" d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z"/><path d="M9.5 20h5"/>',
  st_tr: '<rect x="3" y="3" width="12" height="12"/><rect class="b" x="9" y="9" width="12" height="12" opacity=".6"/>',
  st_cyc: '<rect x="3" y="7" width="10" height="10"/><rect x="8" y="3" width="10" height="10" stroke-dasharray="2 2"/><path class="b" d="M18 17l3 3-3 3"/>',
  st_qp: '<rect x="3" y="4" width="18" height="16"/><path d="M6 8h5M6 12h5M6 16h5M13 8h5M13 12h5M13 16h5"/>',
  st_ws: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  st_clean: '<rect x="3" y="5" width="18" height="14"/><path d="M3 9h18" stroke-dasharray="2 2"/><path class="b" d="M8 13l4 3 4-3"/>',
  st_anno: '<path d="M4 18h16M7 18V9l5-4 5 4v9"/>',
};
Object.assign(ICONS, ST_ICONS);
App.modes.transp = false; App.modes.selcyc = false; App.modes.qp = false;
{
  const t = document.querySelector('#status .toggles');
  t.insertAdjacentHTML('beforeend', `
    <span class="stsep"></span>
    <button data-mode="transp" title="Show/Hide Transparency">${icon('st_tr')}</button>
    <button data-mode="selcyc" title="Selection Cycling">${icon('st_cyc')}</button>
    <button id="stAnno" title="Annotation Scale of the current view" class="sttext">${icon('st_anno')}<span>1:1</span></button>
    <button id="stWs" title="Workspace Switching">${icon('st_ws')}</button>
    <button data-mode="qp" title="Quick Properties">${icon('st_qp')}</button>
    <button id="stIso" title="Isolate Objects">${icon('st_iso')}</button>
    <button id="stClean" title="Clean Screen (Ctrl+0)">${icon('st_clean')}</button>`);
  document.getElementById('stWs').onclick = (ev) => { ev.stopPropagation(); UI.popup(ev.currentTarget, Object.keys(WORKSPACES).map(w => ({ label: (w === UI.workspace ? '✔ ' : ' ') + w, fn: () => applyWorkspace(w) }))); };
  document.getElementById('stIso').onclick = (ev) => { ev.stopPropagation(); UI.popup(ev.currentTarget, [{ label: 'Isolate Objects', cmd: 'ISOLATEOBJECTS' }, { label: 'Hide Objects', cmd: 'HIDEOBJECTS' }, { label: 'End Object Isolation', cmd: 'UNISOLATEOBJECTS' }]); };
  document.getElementById('stClean').onclick = () => runCommand('CLEANSCREENON');
  document.getElementById('stAnno').onclick = (ev) => { ev.stopPropagation(); UI.popup(ev.currentTarget, ['1:1', '1:2', '1:5', '1:10', '1:20', '1:50', '1:100'].map(sc => ({ label: sc, fn: () => { App.annoScale = sc; document.querySelector('#stAnno span').textContent = sc; } }))); };
}
UI.refreshStatusExtra = function () { const b = document.getElementById('stIso'); if (b) b.classList.toggle('on', App.hidden.size > 0); };
{
  const tm = UI.toggleMode;
  UI.toggleMode = function (m) { tm.call(this, m); if (m === 'transp' || m === 'qp') App.dirty = true; if (m === 'qp' && !App.modes.qp) hideQP(); };
}

// ---------- Quick Properties palette ----------
function hideQP() { const q = document.getElementById('qpPal'); if (q) q.hidden = true; }
function showQP() {
  const s = selEnts();
  if (!App.modes.qp || !s.length || App.cmd) { hideQP(); return; }
  let q = document.getElementById('qpPal');
  if (!q) { q = document.createElement('div'); q.id = 'qpPal'; document.getElementById('viewport').appendChild(q); q.addEventListener('pointerdown', ev => ev.stopPropagation()); }
  const types = [...new Set(s.map(e => e.type))];
  const one = types.length === 1 ? s : null;
  const lv = [...new Set(s.map(e => e.layer))], cv = [...new Set(s.map(e => e.color || ''))], ltv = [...new Set(s.map(e => e.lt || ''))];
  let geo = '';
  if (one) {
    const pr = Types[types[0]].props(s[0]).filter(p => typeof p.v === 'number' || p.str).slice(0, 3);
    geo = pr.map(p => `<tr><td>${esc(p.k)}</td><td>${s.length === 1 ? esc(typeof p.v === 'number' ? fmt(p.v) : p.v) : '*VARIES*'}</td></tr>`).join('');
  }
  q.innerHTML = `<div class="qphead">${one ? Types[types[0]].label : 'All'} (${s.length})</div><table>
    <tr><td>Color</td><td><select id="qpC">${cv.length > 1 ? '<option>*VARIES*</option>' : ''}${COLORS.map(([n, c]) => `<option value="${c}" ${cv.length === 1 && cv[0] === c ? 'selected' : ''}>${n}</option>`).join('')}</select></td></tr>
    <tr><td>Layer</td><td><select id="qpL">${lv.length > 1 ? '<option>*VARIES*</option>' : ''}${App.doc.layers.map(l => `<option ${lv.length === 1 && lv[0] === l.name ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></td></tr>
    <tr><td>Linetype</td><td><select id="qpT">${ltv.length > 1 ? '<option>*VARIES*</option>' : ''}${ltOptions(ltv.length === 1 ? (ltv[0] || undefined) : null, true)}</select></td></tr>${geo}</table>`;
  const set = (fn) => UI.change(() => s.forEach(e => { fn(e); invalidate(e); }));
  q.querySelector('#qpC').onchange = (ev) => set(e => { if (ev.target.value) e.color = ev.target.value; else delete e.color; });
  q.querySelector('#qpL').onchange = (ev) => set(e => { e.layer = ev.target.value; });
  q.querySelector('#qpT').onchange = (ev) => set(e => { if (ev.target.value) e.lt = ev.target.value; else delete e.lt; });
  q.style.left = Math.min(App.scr.x + 24, CW - 240) + 'px'; q.style.top = Math.min(App.scr.y + 24, CH - 170) + 'px';
  q.hidden = false;
}
{
  const rp = UI.refreshProps;
  UI.refreshProps = function () { rp.call(this); if (App.modes.qp) { if (selEnts().length) showQP(); else hideQP(); } };
}

// ---------- selection cycling list ----------
{
  const hp = handlePress;
  handlePress = function (shift, ctrl) { // eslint-disable-line no-global-assign
    const r = App.req;
    if (App.modes.selcyc && !ctrl && !App.win && (!r || r.kind === 'select') && inModel() && !App.v3d) {
      const tol = px((App.opts && App.opts.pick) || 6);
      const cands = App.doc.ents.filter(x => editable(x) && entDist(x, App.raw) < tol);
      if (cands.length > 1 && !(!r && App.sel.size && selEnts().some(e => Types[e.type].grips(e).some(g => V.dist(g.p, App.raw) < tol)))) {
        const anchor = { getBoundingClientRect: () => { const c = canvas.getBoundingClientRect(); return { left: c.left + App.scr.x + 12, right: c.left + App.scr.x + 12, top: c.top + App.scr.y + 12, bottom: c.top + App.scr.y + 12 }; } };
        UI.popup(anchor, cands.map(e => ({ label: `${Types[e.type].label} — ${e.layer}`, fn: () => { if (shift) App.sel.delete(e.id); else App.sel.add(e.id); App.dirty = true; UI.refreshProps(); } })));
        return;
      }
    }
    return hp(shift, ctrl);
  };
}

// keyboard: Ctrl+0 clean screen
document.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === '0') { ev.preventDefault(); runCommand('CLEANSCREENON'); }
});
{ let ws = 'Drafting & Annotation'; try { ws = localStorage.getItem('opendraft-ws') || ws; } catch (_) { /* ignore */ } applyWorkspace(ws); }
UI.refreshStatus();
