// AutoCAD-style interfaces: contextual ribbon tabs, Blocks palette, Plot dialog, Start page
'use strict';

// ---------- SVG thumbnail of any set of entities ----------
function entsSVG(ents, opts = {}) {
  const flat = [];
  ents.forEach(e => flattenEnt(e, flat));
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const paths = [], fills = [], texts = [];
  const grow = (p) => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); };
  for (const e of flat) {
    if (INFINITE.has(e.type)) continue;
    if (e.type === 'hatch' && (HATCH_PATTERNS[e.pat] || {}).fam && !HATCH_PATTERNS[e.pat].fam.length) { e.loops.forEach(l => { fills.push(l); l.forEach(grow); }); continue; }
    if (e.type === 'hatch') { const ls = hatchLines(e, 400); ls.forEach(([a, b]) => { paths.push([a, b]); grow(a); grow(b); }); continue; }
    for (const pl of entApprox(e)) { if (pl.length > 1) { paths.push(pl); pl.forEach(grow); } }
  }
  if (!isFinite(x1)) return '<svg viewBox="0 0 10 10"></svg>';
  const w = Math.max(x2 - x1, 1e-6), h = Math.max(y2 - y1, 1e-6), pad = Math.max(w, h) * 0.06;
  const T = (p) => `${fmt(p.x - x1 + pad, 2)},${fmt(y2 - p.y + pad, 2)}`;
  const sw = fmt(Math.max(w, h) / (opts.thin || 60), 3);
  void texts;
  return `<svg viewBox="0 0 ${fmt(w + 2 * pad, 2)} ${fmt(h + 2 * pad, 2)}" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths.map(pl => `<polyline points="${pl.map(T).join(' ')}"/>`).join('')}${fills.map(l => `<polygon points="${l.map(T).join(' ')}" fill="currentColor" stroke="none"/>`).join('')}</g></svg>`;
}
function patternSVG(name) {
  const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const fam = (HATCH_PATTERNS[name] || {}).fam || [];
  if (!fam.length) return '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="currentColor"/></svg>';
  const sc = 10 / (7 * Math.max(...fam.map(f => f.s)));
  const ls = hatchLines({ type: 'hatch', loops: [sq], pat: name, scale: sc, ang: 0 });
  return `<svg viewBox="0 0 10 10"><g stroke="currentColor" stroke-width=".35">${ls.map(([a, b]) => `<line x1="${fmt(a.x, 2)}" y1="${fmt(10 - a.y, 2)}" x2="${fmt(b.x, 2)}" y2="${fmt(10 - b.y, 2)}"/>`).join('')}</g><rect width="10" height="10" fill="none" stroke="currentColor" stroke-width=".4"/></svg>`;
}

// ---------- contextual ribbon tabs ----------
const CONTEXT_TABS = {
  hatch: {
    label: 'Hatch Creation',
    html: () => {
      const hs = App.hatch || (App.hatch = { pat: 'ANSI31', scale: 1, ang: 0 });
      return `<div class="rgroup"><div class="items"><button class="rbtn" data-ctx="pick">${icon('id')}<span>Pick Points</span></button><div class="smallcol"><button class="rbtn small" data-ctx="select">${icon('selall')}<span>Select</span></button></div></div><div class="glabel">Boundaries</div></div>
        <div class="rgroup"><div class="items"><div class="patgal">${Object.keys(HATCH_PATTERNS).map(n => `<button class="pat${n === hs.pat ? ' on' : ''}" data-pat="${n}" title="${esc(n + ' — ' + HATCH_PATTERNS[n].desc)}">${patternSVG(n)}<span>${n}</span></button>`).join('')}</div></div><div class="glabel">Pattern</div></div>
        <div class="rgroup"><div class="items"><div class="layerctl">
          <label class="ctxfield">Hatch Scale <input id="hc_scale" value="${fmt(hs.scale)}"></label>
          <label class="ctxfield">Angle <input id="hc_ang" value="${fmt(deg(hs.ang))}"></label>
          <label class="ctxfield">Layer <select id="hc_layer">${App.doc.layers.map(l => `<option ${l.name === App.doc.cur ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
        </div></div><div class="glabel">Properties</div></div>
        <div class="rgroup"><div class="items"><button class="rbtn" data-ctx="close">${icon('erase')}<span>Close Hatch Creation</span></button></div><div class="glabel">Close</div></div>`;
    },
    bind: (root) => {
      const hs = App.hatch;
      const applyLast = () => { const h = App.lastHatch; if (h && App.doc.ents.includes(h)) { h.pat = hs.pat; h.scale = hs.scale; h.ang = hs.ang; invalidate(h); App.dirty = true; } };
      root.querySelectorAll('[data-pat]').forEach(b => b.onclick = () => { hs.pat = b.dataset.pat; root.querySelectorAll('.pat').forEach(x => x.classList.toggle('on', x === b)); applyLast(); });
      root.querySelector('#hc_scale').onchange = (ev) => { const n = parseFloat(ev.target.value); if (n > 0) { hs.scale = n; applyLast(); } };
      root.querySelector('#hc_ang').onchange = (ev) => { const n = parseFloat(ev.target.value); if (isFinite(n)) { hs.ang = rad(n); applyLast(); } };
      root.querySelector('#hc_layer').onchange = (ev) => { App.doc.cur = ev.target.value; const h = App.lastHatch; if (h) { h.layer = ev.target.value; App.dirty = true; } UI.refreshLayers(); };
      root.querySelector('[data-ctx=select]').onclick = () => submitInput('S');
      root.querySelector('[data-ctx=pick]').onclick = () => UI.log('Click inside closed areas to hatch them.');
      root.querySelector('[data-ctx=close]').onclick = () => submitInput('');
    },
  },
};
const _buildRibbon = UI.buildRibbon;
UI.buildRibbon = function () {
  _buildRibbon.call(this);
  if (!this.ctx || !CONTEXT_TABS[this.ctx]) return;
  const C = CONTEXT_TABS[this.ctx];
  const tabs = document.getElementById('ribbonTabs');
  tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  tabs.insertAdjacentHTML('beforeend', `<button class="ctxtab active">${C.label}</button>`);
  const panels = document.getElementById('ribbonPanels');
  panels.innerHTML = C.html();
  C.bind(panels);
};
UI.setContext = function (name) { this.ctx = name; this.buildRibbon(); };
{
  const orig = Commands.HATCH.fn;
  Commands.HATCH.fn = async () => { App.lastHatch = null; UI.setContext('hatch'); try { await orig(); } finally { UI.setContext(null); App.lastHatch = null; } };
}

// ---------- Blocks palette (INSERT) ----------
Commands['-INSERT'] = Object.assign({}, Commands.INSERT, { alias: [] });
async function placeBlock(name, o) {
  for (;;) {
    const p = await getPoint(`Specify insertion point for ${name}`, { rubber: false, preview: (q) => [{ type: 'insert', name, p: q, sx: o.sc, sy: o.sc, rot: o.rot, layer: App.doc.cur }] });
    if (!isPt(p)) return;
    const attrs = await askAttributes(name);
    const ins = { type: 'insert', name, p, sx: o.sc, sy: o.sc, rot: o.rot, attrs };
    if (o.explode) Types.insert.explode({ ...ins, layer: App.doc.cur }).forEach(x => { x._keepColor = true; addEnt(x); });
    else addEnt(ins);
    if (!o.repeat) return;
  }
}
Commands.INSERT = { alias: ['I', 'DDINSERT', 'CLASSICINSERT', 'BLOCKSPALETTE'], desc: 'Blocks palette: insert blocks with previews', noUndo: true, noRepeat: true, fn: async () => { UI.blocksPalette(); } };
UI.blocksPalette = function () {
  let p = document.getElementById('blockpal');
  if (!p) {
    p = document.createElement('div'); p.id = 'blockpal'; p.className = 'floatpal';
    document.getElementById('viewport').appendChild(p);
    p.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    p.addEventListener('click', (ev) => {
      if (ev.target.closest('.tpclose')) { p.hidden = true; return; }
      if (ev.target.closest('#bpLoad')) { runCommand('OPEN'); return; }
      const t = ev.target.closest('[data-block]');
      if (t) {
        const o = { sc: parseFloat(document.getElementById('bpScale').value) || 1, rot: rad(parseFloat(document.getElementById('bpRot').value) || 0), repeat: document.getElementById('bpRepeat').checked, explode: document.getElementById('bpExplode').checked };
        runCommand(() => placeBlock(t.dataset.block, o));
      }
    });
  }
  const names = Object.keys(App.doc.blocks || {}).filter(n => !n.startsWith('*')).sort();
  p.innerHTML = `<div class="tphead"><b>Blocks</b><button class="tpclose" title="Close">✕</button></div>
    <div class="tptabs"><button class="on">Current Drawing</button></div>
    <div class="tpgrid">${names.length ? names.map(n => `<button class="tptile" data-block="${esc(n)}" title="${esc(n)}">${entsSVG(App.doc.blocks[n].ents)}<span>${esc(n)}</span></button>`).join('') : '<div class="muted" style="grid-column:1/-1;padding:10px">No blocks in this drawing yet. Create one with BLOCK (B), use the Tool Palettes (Ctrl+3), or open a DWG/DXF that contains blocks.</div>'}</div>
    <div class="bpopts">
      <label>Scale <input id="bpScale" value="1"></label><label>Rotation <input id="bpRot" value="0"></label>
      <label><input type="checkbox" id="bpRepeat"> Repeat Placement</label><label><input type="checkbox" id="bpExplode"> Explode</label>
    </div>`;
  p.hidden = false;
};

// ---------- Plot dialog ----------
App.plotCfg = { dev: 'pdf', paper: 'A3', orient: 'L', area: 'Extents', fit: true, scale: '1:100', units: 'mm', center: true, ox: 0, oy: 0, ctb: 'monochrome.ctb', lw: true, win: null };
function plotRegion(c) {
  if (c.area === 'Window' && c.win) return rectNorm(c.win[0], c.win[1]);
  if (c.area === 'Display') { const a = s2w({ x: 0, y: CH }), b = s2w({ x: CW, y: 0 }); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; }
  return modelExtents() || { x1: 0, y1: 0, x2: 100, y2: 100 };
}
function plotGeom(c) {
  const [pw, ph] = PAPERS[c.paper] || PAPERS.A3;
  const W = c.orient === 'P' ? Math.min(pw, ph) : Math.max(pw, ph), H = c.orient === 'P' ? Math.max(pw, ph) : Math.min(pw, ph);
  const m = 5, avail = { x1: m, y1: m, x2: W - m, y2: H - m };
  const r = plotRegion(c), rw = Math.max(r.x2 - r.x1, 1e-9), rh = Math.max(r.y2 - r.y1, 1e-9);
  let k;
  if (c.fit) k = Math.min((avail.x2 - avail.x1) / rw, (avail.y2 - avail.y1) / rh);
  else { const [a, b] = c.scale.split(':').map(Number); k = (a / b) * (UNITS_MM[c.units] || 1); }
  const ox = c.center ? (W - rw * k) / 2 : m + (+c.ox || 0), oy = c.center ? (H - rh * k) / 2 : m + (+c.oy || 0);
  const toPaper = (p) => ({ x: ox + (p.x - r.x1) * k, y: oy + (p.y - r.y1) * k });
  const real = k / (UNITS_MM[c.units] || 1);
  return { W, H, avail, k, toPaper, region: r, label: c.fit ? (real >= 1 ? `${fmt(real, 3)}:1` : `1:${fmt(1 / real, 2)}`) : c.scale };
}
function plotModelPDF(c) {
  const G = plotGeom(c);
  return { blob: buildPDF(G.W, G.H, (P) => { P.clip(G.avail); drawEntsPDF(P, G.toPaper, G.k, { mono: c.ctb === 'monochrome.ctb', noLw: !c.lw }); P.unclip(); }), G };
}
// raster rendering of the plot (preview and PNG device)
function plotCanvas(c, pxPerMm) {
  const L = App.space !== 'Model' ? curLayout() : null;
  const G = L ? null : plotGeom(c);
  const LG = L ? layoutGeom(L) : null;
  const W = L ? LG.W : G.W, H = L ? LG.H : G.H;
  const cv = document.createElement('canvas'); cv.width = Math.round(W * pxPerMm); cv.height = Math.round(H * pxPerMm);
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  const saved = { view: { ...App.view }, CW, CH };
  try {
    CW = cv.width; CH = cv.height;
    const k = L ? LG.k : G.k, r = L ? null : G.region;
    const mapRect = L ? LG.vp : G.avail;
    // view so that model maps onto paper pixels
    const ctrPaper = L ? { x: (LG.vp.x1 + LG.vp.x2) / 2, y: (LG.vp.y1 + LG.vp.y2) / 2 } : G.toPaper({ x: (r.x1 + r.x2) / 2, y: (r.y1 + r.y2) / 2 });
    const ctrModel = L ? LG.center : { x: (r.x1 + r.x2) / 2, y: (r.y1 + r.y2) / 2 };
    App.view = { s: k * pxPerMm, cx: ctrModel.x - (ctrPaper.x - W / 2) / k, cy: ctrModel.y - (ctrPaper.y - H / 2) / k };
    g.save(); g.beginPath(); g.rect(mapRect.x1 * pxPerMm, (H - mapRect.y2) * pxPerMm, (mapRect.x2 - mapRect.x1) * pxPerMm, (mapRect.y2 - mapRect.y1) * pxPerMm); g.clip();
    const R = makeR(g), mono = c.ctb === 'monochrome.ctb';
    const ents = App.doc.ents.filter(e => visible(e) && layerOf(e).plot !== false);
    for (const e of ents.filter(x => x.type === 'hatch').concat(ents.filter(x => x.type !== 'hatch'))) {
      let col = entColor(e); if (mono || col.toLowerCase() === '#ffffff') col = '#000000';
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
      applyEntStyle(g, e, App.view.s, c.lw ? (lw) => Math.max(1, lw * pxPerMm) : null);
      Types[e.type].draw(R, e); g.setLineDash([]);
    }
    g.restore();
    if (L) {
      App.view = { s: pxPerMm, cx: W / 2, cy: H / 2 };
      g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineWidth = Math.max(1, 0.5 * pxPerMm);
      for (const [a, b] of LG.lines) R.line(a, b);
      for (const t of LG.texts) { g.fillStyle = t.label ? '#555' : '#000'; R.text(t.p, t.h, 0, t.s); }
    }
  } finally { App.view = saved.view; CW = saved.CW; CH = saved.CH; App.dirty = true; }
  return cv;
}
UI.plotDialog = function () {
  const c = App.plotCfg, L = App.space !== 'Model' ? curLayout() : null;
  if (L && c.area !== 'Window') c.area = 'Layout';
  if (!L && c.area === 'Layout') c.area = 'Extents';
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  UI.dialog(`Plot - ${L ? L.name : 'Model'}`, `
    <div class="psgrid plotgrid">
      <fieldset><legend>Printer/plotter</legend>
        <label>Name <select id="pl_dev"><option value="pdf" ${c.dev === 'pdf' ? 'selected' : ''}>DWG To PDF.pc3</option><option value="png" ${c.dev === 'png' ? 'selected' : ''}>PublishToWeb PNG.pc3</option></select></label>
        <label>Paper size <select id="pl_paper" ${L ? 'disabled' : ''}>${opt(Object.keys(PAPERS), L ? L.paper : c.paper)}</select></label>
        <label>Number of copies <input value="1" disabled></label>
      </fieldset>
      <fieldset><legend>Plot area</legend>
        <label>What to plot <select id="pl_area">${opt(L ? ['Layout'] : ['Extents', 'Display', 'Window'], c.area)}</select></label>
        <button class="btn" id="pl_win" ${L ? 'disabled' : ''}>Window &lt;</button>
        <div class="muted" id="pl_wininfo">${c.win ? `Window: ${fmt(c.win[0].x, 1)},${fmt(c.win[0].y, 1)} — ${fmt(c.win[1].x, 1)},${fmt(c.win[1].y, 1)}` : ''}</div>
      </fieldset>
      <fieldset><legend>Plot offset (origin set to printable area)</legend>
        <label><span>Center the plot</span><input type="checkbox" id="pl_center" ${c.center ? 'checked' : ''} style="width:auto"></label>
        <label>X (mm) <input id="pl_ox" value="${fmt(c.ox)}"></label><label>Y (mm) <input id="pl_oy" value="${fmt(c.oy)}"></label>
      </fieldset>
      <fieldset><legend>Plot scale</legend>
        <label><span>Fit to paper</span><input type="checkbox" id="pl_fit" ${c.fit ? 'checked' : ''} ${L ? 'disabled' : ''} style="width:auto"></label>
        <label>Scale <select id="pl_scale" ${L ? 'disabled' : ''}>${opt(PLOT_SCALES.filter(x => x !== 'Fit'), c.scale)}</select></label>
        <label>1 drawing unit = <select id="pl_units" ${L ? 'disabled' : ''}>${Object.keys(UNITS_MM).map(u => `<option ${u === c.units ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label><span>Plot lineweights</span><input type="checkbox" id="pl_lw" ${c.lw ? 'checked' : ''} style="width:auto"></label>
      </fieldset>
      <fieldset><legend>Plot style table (pen assignments)</legend>
        <label>Table <select id="pl_ctb">${opt(['monochrome.ctb', 'acad.ctb'], c.ctb)}</select></label>
      </fieldset>
      <fieldset><legend>Drawing orientation</legend>
        <label><span>Portrait</span><input type="radio" name="pl_or" value="P" ${c.orient === 'P' ? 'checked' : ''} ${L ? 'disabled' : ''} style="width:auto"></label>
        <label><span>Landscape</span><input type="radio" name="pl_or" value="L" ${c.orient !== 'P' ? 'checked' : ''} ${L ? 'disabled' : ''} style="width:auto"></label>
      </fieldset>
    </div>`, () => { read(); doPlot(); }, 'OK');
  const $q = (id) => document.getElementById(id);
  const read = () => {
    c.dev = $q('pl_dev').value; c.area = $q('pl_area').value; c.center = $q('pl_center').checked; c.ox = parseFloat($q('pl_ox').value) || 0; c.oy = parseFloat($q('pl_oy').value) || 0;
    c.ctb = $q('pl_ctb').value; c.lw = $q('pl_lw').checked;
    if (!L) { c.paper = $q('pl_paper').value; c.fit = $q('pl_fit').checked; c.scale = $q('pl_scale').value; c.units = $q('pl_units').value; c.orient = document.querySelector('input[name=pl_or]:checked').value; }
  };
  const doPlot = () => {
    const base = `${App.fileName}-${L ? L.name : 'Model'}`;
    if (c.dev === 'png') { plotCanvas(c, 150 / 25.4).toBlob(b => download(base + '.png', b)); return; }
    if (L) { plotLayoutPDF(L, { mono: c.ctb === 'monochrome.ctb', noLw: !c.lw }); return; }
    const { blob, G } = plotModelPDF(c);
    download(base + '.pdf', blob);
    UI.log(`Plotted Model to ${base}.pdf (${c.paper} ${c.orient === 'P' ? 'portrait' : 'landscape'}, scale ${G.label}).`, 'info');
  };
  const foot = document.querySelector('#dlgBody .btnrow');
  foot.insertAdjacentHTML('afterbegin', '<button class="btn" id="pl_prev" style="margin-right:auto">Preview...</button>');
  $q('pl_prev').onclick = () => { read(); UI.plotPreview(c); };
  $q('pl_win').onclick = () => {
    read(); document.getElementById('dlgModal').hidden = true;
    runCommand(async () => {
      const a = await getPoint('Specify first corner', { noSnap: true }); if (!isPt(a)) return UI.plotDialog();
      const b = await getPoint('Specify opposite corner', { noSnap: true, rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, color: '#4a8cff', dash: true }] });
      if (isPt(b)) { c.win = [a, b]; c.area = 'Window'; }
      setTimeout(() => UI.plotDialog(), 0);
    });
  };
};
UI.plotPreview = function (c) {
  let m = document.getElementById('pvModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'pvModal'; m.className = 'modal';
    m.innerHTML = '<div class="dialog pv"><div class="dhead"><b>Plot Preview</b><button id="pvClose">✕</button></div><div class="pvbody" id="pvBody"></div></div>';
    document.body.appendChild(m);
    m.querySelector('#pvClose').onclick = () => { m.hidden = true; };
    m.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') m.hidden = true; });
  }
  const L = App.space !== 'Model' ? curLayout() : null, W = L ? layoutGeom(L).W : plotGeom(c).W, H = L ? layoutGeom(L).H : plotGeom(c).H;
  const ppm = Math.min((window.innerWidth * 0.85) / W, (window.innerHeight * 0.75) / H) * (window.devicePixelRatio || 1);
  const cv = plotCanvas(c, ppm);
  cv.style.width = (cv.width / (window.devicePixelRatio || 1)) + 'px';
  const body = m.querySelector('#pvBody'); body.innerHTML = ''; body.appendChild(cv);
  m.hidden = false;
};
Commands.PLOT.fn = async () => { UI.plotDialog(); };
Commands.PLOT.desc = 'Plot dialog: PDF or PNG, paper size, plot area, scale, plot style';

// ---------- Start page ----------
function recentList() { try { return JSON.parse(localStorage.getItem('opendraft-recent') || '[]'); } catch (_) { return []; } }
function rememberRecent() {
  try {
    const snap = snapshot();
    if (snap.length > 1500000) return;
    const list = recentList().filter(r => r.name !== App.fileName);
    list.unshift({ name: App.fileName, when: Date.now(), doc: snap });
    localStorage.setItem('opendraft-recent', JSON.stringify(list.slice(0, 6)));
  } catch (_) { /* storage full or blocked */ }
}
{
  const o1 = IO.openDoc, o2 = IO.save;
  IO.openDoc = function (...a) { const r = o1.apply(this, a); rememberRecent(); return r; };
  IO.save = function (...a) { const r = o2.apply(this, a); rememberRecent(); return r; };
}
function sampleFloorPlan() {
  const ents = [], L = (a, b, l) => ents.push({ type: 'line', p1: { x: a[0], y: a[1] }, p2: { x: b[0], y: b[1] }, layer: l });
  const wall = (pts, closed) => { const c = { type: 'pline', pts: pts.map(([x, y]) => ({ x, y })), closed }; for (const sgn of [1, -1]) { const a = c.pts[0], b = c.pts[1], n = V.perp(V.norm(V.sub(b, a))); const o = offsetEnt(c, 100, V.add(V.mid(a, b), V.mul(n, 200 * sgn))); if (o) ents.push({ ...o, layer: 'A-WALL' }); } };
  wall([[0, 0], [9000, 0], [9000, 6000], [0, 6000]], true);
  wall([[5000, 0], [5000, 6000]], false); wall([[5000, 3000], [9000, 3000]], false);
  const blk = {};
  const place = (id, p, rot = 0, P) => { const t = TOOLS.find(x => x.id === id); const name = 'SAMPLE_' + id.toUpperCase(); blk[name] = { base: { x: 0, y: 0 }, ents: t.gen(P || Object.fromEntries((t.params || []).map(q => [q.k, q.def]))) }; ents.push({ type: 'insert', name, p: { x: p[0], y: p[1] }, sx: 1, sy: 1, rot: rad(rot), layer: t.layer }); };
  place('door', [5100, 1000], 0); place('door', [6000, 3100], 0); place('door', [2000, 100], 0);
  place('bed2', [6200, 3700]); place('sofa', [500, 4400]); place('dining', [1500, 1200]);
  place('wc', [8300, 300], 0); place('basin', [7300, 150]); place('shower', [8000, 2000]);
  place('window', [2600, -100], 0, { w: 1500, t: 200 }); place('window', [6500, 5900], 0, { w: 1200, t: 200 });
  ents.push({ type: 'dim', p1: { x: -100, y: -100 }, p2: { x: 9100, y: -100 }, p3: { x: 4500, y: -900 }, ang: 0, h: 250, layer: 'Dimensions' });
  ents.push({ type: 'dim', p1: { x: -100, y: -100 }, p2: { x: -100, y: 6100 }, p3: { x: -900, y: 3000 }, ang: Math.PI / 2, h: 250, layer: 'Dimensions' });
  ents.push({ type: 'text', p: { x: 1200, y: 3600 }, h: 250, rot: 0, s: 'LIVING ROOM', layer: '0' }, { type: 'text', p: { x: 6300, y: 5300 }, h: 250, rot: 0, s: 'BEDROOM', layer: '0' }, { type: 'text', p: { x: 5500, y: 2500 }, h: 250, rot: 0, s: 'BATH', layer: '0' });
  void L;
  const doc = newDoc();
  for (const t of [['A-WALL', '#c0c0c0'], ['A-DOOR', '#00ff00'], ['A-GLAZ', '#00ffff'], ['A-FURN', '#ff7f00'], ['A-PLUM', '#ff00ff']]) doc.layers.push({ name: t[0], color: t[1], on: true, locked: false, lt: 'Continuous', lw: t[0] === 'A-WALL' ? 0.5 : 0.25 });
  doc.blocks = blk; doc.dimH = 250; doc.textH = 250; doc.insUnits = 'mm';
  doc.ents = ents.map((e, i) => ({ ...e, id: i + 1 })); doc.nextId = ents.length + 1;
  doc.layouts = [Object.assign(defaultLayout('Layout1'), { scale: '1:50', title: { title: 'GROUND FLOOR PLAN', project: 'Sample House', drawnBy: 'OpenDraft', date: todayStr(), sheet: '1/1' } }), defaultLayout('Layout2')];
  return doc;
}
UI.showStart = function (show) {
  let s = document.getElementById('startpage');
  if (!s) { s = document.createElement('div'); s.id = 'startpage'; document.getElementById('main').appendChild(s); }
  document.querySelectorAll('#filetabs .ftab').forEach((t, i) => t.classList.toggle('active', show ? i === 0 : i === 1));
  if (!show) { s.hidden = true; return; }
  const rec = recentList();
  s.innerHTML = `<div class="spleft"><h2>OpenDraft CAD</h2>
      <button class="spbtn pri" data-sp="new">${icon('new')} New</button>
      <button class="spbtn" data-sp="open">${icon('open')} Open...</button>
      <button class="spbtn" data-sp="sample">${icon('layers')} Explore Sample Drawings</button>
      <div class="sphelp muted">Open DWG, DXF or JSON files. Drag a file onto the drawing area to open it.</div></div>
    <div class="spmain"><h3>Recent</h3>
      <div class="sprecent">${rec.length ? rec.map((r, i) => { let th = ''; try { const d = JSON.parse(r.doc); const keep = App.doc; App.doc = Object.assign(newDoc(), d); th = entsSVG(App.doc.ents.filter(visible)); App.doc = keep; } catch (_) { th = ''; } return `<button class="sptile" data-rec="${i}">${th}<b>${esc(r.name)}</b><small>${new Date(r.when).toLocaleString()}</small></button>`; }).join('') : '<div class="muted">No recent documents yet. Drawings you open or save appear here.</div>'}</div></div>`;
  s.onclick = (ev) => {
    const b = ev.target.closest('[data-sp]'), t = ev.target.closest('[data-rec]');
    if (b && b.dataset.sp === 'new') { UI.showStart(false); IO.newDrawing(); }
    if (b && b.dataset.sp === 'open') { UI.showStart(false); IO.open(); }
    if (b && b.dataset.sp === 'sample') { UI.showStart(false); IO.openDoc(sampleFloorPlan(), 'Sample House.json'); }
    if (t) { const r = rec[+t.dataset.rec]; try { UI.showStart(false); IO.openDoc(JSON.parse(r.doc), r.name); } catch (err) { UI.log('Could not open the recent drawing.', 'err'); } }
  };
  s.hidden = false;
};
document.addEventListener('click', (ev) => {
  const ft = ev.target.closest('#filetabs .ftab');
  if (!ft) return;
  const idx = [...document.querySelectorAll('#filetabs .ftab')].indexOf(ft);
  if (idx === 0) { ev.stopPropagation(); UI.showStart(true); } else if (!ev.target.closest('button')) UI.showStart(false);
}, true);
