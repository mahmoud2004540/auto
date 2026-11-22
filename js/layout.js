// Paper-space layouts: sheet + title block + one scaled viewport, and vector PDF plotting
'use strict';

const PAPERS = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594], A0: [1189, 841], Letter: [279.4, 215.9], Tabloid: [431.8, 279.4] };
const PLOT_SCALES = ['Fit', '1:1', '1:2', '1:5', '1:10', '1:20', '1:25', '1:50', '1:100', '1:200', '1:250', '1:500', '1:1000', '2:1', '5:1', '10:1'];
const UNITS_MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };

function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function defaultLayout(name) {
  return { name, paper: 'A3', orient: 'L', scale: 'Fit', units: 'mm', center: null, title: { title: 'DRAWING TITLE', project: '', drawnBy: '', date: todayStr(), sheet: '1/1' } };
}
function layouts() {
  if (!Array.isArray(App.doc.layouts) || !App.doc.layouts.length) App.doc.layouts = [defaultLayout('Layout1'), defaultLayout('Layout2')];
  return App.doc.layouts;
}
function curLayout() { return layouts().find(l => l.name === App.space) || null; }

function modelExtents() {
  let r = null;
  for (const e of App.doc.ents) {
    if (!visible(e) || (typeof INFINITE !== 'undefined' && INFINITE.has(e.type))) continue;
    const b = entBBox(e);
    if (!isFinite(b.x1)) continue;
    r = r ? { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) } : { ...b };
  }
  return r;
}

// sheet geometry in paper millimetres (origin bottom-left)
function vpGeom(v, L, ext) {
  const rect = { x1: Math.min(v.x1, v.x2), y1: Math.min(v.y1, v.y2), x2: Math.max(v.x1, v.x2), y2: Math.max(v.y1, v.y2) };
  const center = v.center || (ext ? { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 } : { x: 0, y: 0 });
  let k;
  if (v.scale === 'custom' && v.k > 0) k = v.k;
  else if (v.scale && /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(v.scale)) { const [a, b] = v.scale.split(':').map(Number); k = (a / b) * (UNITS_MM[L.units] || 1); }
  else { const ew = ext ? Math.max(ext.x2 - ext.x1, 1e-6) : 100, eh = ext ? Math.max(ext.y2 - ext.y1, 1e-6) : 100; k = Math.min((rect.x2 - rect.x1) / ew, (rect.y2 - rect.y1) / eh) * 0.92; }
  const real = k / (UNITS_MM[L.units] || 1);
  const label = v.scale && /:/.test(v.scale) ? v.scale : (real >= 1 ? `${fmt(real, 2)}:1` : `1:${fmt(1 / real, 1)}`) + (v.scale === 'custom' ? '' : ' (Fit)');
  const vc = { x: (rect.x1 + rect.x2) / 2, y: (rect.y1 + rect.y2) / 2 };
  return { rect, k, center, vc, label, toPaper: (p) => ({ x: vc.x + (p.x - center.x) * k, y: vc.y + (p.y - center.y) * k }) };
}
function layoutGeom(L) {
  const [pw, ph] = PAPERS[L.paper] || PAPERS.A3;
  const W = L.orient === 'P' ? Math.min(pw, ph) : Math.max(pw, ph), H = L.orient === 'P' ? Math.max(pw, ph) : Math.min(pw, ph);
  const border = { x1: 20, y1: 10, x2: W - 10, y2: H - 10 };
  const tbH = Math.min(35, (border.y2 - border.y1) * 0.18);
  const tb = { x1: border.x1, y1: border.y1, x2: border.x2, y2: border.y1 + tbH };
  const vp = { x1: border.x1 + 3, y1: tb.y2 + 3, x2: border.x2 - 3, y2: border.y2 - 3 };
  const ext = modelExtents();
  const center = L.center || (ext ? { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 } : { x: 0, y: 0 });
  let k, scaleLabel;
  if (L.scale === 'Fit' || !/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(L.scale)) {
    const ew = ext ? Math.max(ext.x2 - ext.x1, 1e-6) : 100, eh = ext ? Math.max(ext.y2 - ext.y1, 1e-6) : 100;
    k = Math.min((vp.x2 - vp.x1) / ew, (vp.y2 - vp.y1) / eh) * 0.92;
    const real = k / (UNITS_MM[L.units] || 1);
    scaleLabel = real >= 1 ? `${fmt(real, 2)}:1 (Fit)` : `1:${fmt(1 / real, 1)} (Fit)`;
  } else {
    const [a, b] = L.scale.split(':').map(Number);
    k = (a / b) * (UNITS_MM[L.units] || 1);
    scaleLabel = L.scale;
  }
  const vc = { x: (vp.x1 + vp.x2) / 2, y: (vp.y1 + vp.y2) / 2 };
  const toPaper = (p) => ({ x: vc.x + (p.x - center.x) * k, y: vc.y + (p.y - center.y) * k });
  const vps = (Array.isArray(L.vports) ? L.vports : [{ ...vp, scale: L.scale, center: L.center, auto: true }]).map(v => vpGeom(v, L, ext));
  // title block cells
  const t = L.title || {};
  const tw = tb.x2 - tb.x1;
  const cols = [['DRAWING TITLE', t.title, 0.38], ['PROJECT', t.project, 0.24], ['SCALE', scaleLabel.replace(' (Fit)', ''), 0.1], ['DATE', t.date, 0.1], ['DRAWN BY', t.drawnBy, 0.1], ['SHEET', t.sheet, 0.08]];
  const lines = [[{ x: border.x1, y: border.y1 }, { x: border.x2, y: border.y1 }], [{ x: border.x2, y: border.y1 }, { x: border.x2, y: border.y2 }],
    [{ x: border.x2, y: border.y2 }, { x: border.x1, y: border.y2 }], [{ x: border.x1, y: border.y2 }, { x: border.x1, y: border.y1 }],
    [{ x: tb.x1, y: tb.y2 }, { x: tb.x2, y: tb.y2 }]];
  const texts = [];
  let x = tb.x1;
  cols.forEach(([label, val, f], i) => {
    const cw = tw * f;
    if (i) lines.push([{ x, y: tb.y1 }, { x, y: tb.y2 }]);
    texts.push({ p: { x: x + 2, y: tb.y2 - 4.5 }, h: 2.2, s: label, label: true });
    const vh = i === 0 ? Math.min(6, tbH * 0.25) : Math.min(3.5, tbH * 0.16);
    let s = String(val || '');
    while (s.length > 1 && textWidth(s, vh) > cw - 4) s = s.slice(0, -1);
    texts.push({ p: { x: x + 2, y: tb.y1 + (tbH - vh) / 2 - 1 }, h: vh, s });
    x += cw;
  });
  return { W, H, border, tb, vp, k, center, toPaper, lines, texts, scaleLabel, vps };
}

// ---------- on-screen rendering of a layout ----------
function renderLayout() {
  const L = curLayout(); if (!L) return;
  const G = layoutGeom(L);
  const R = makeR();
  const modelView = App.view;
  if (App.vpActive != null && App.paperView) App.view = App.paperView;
  const PV = App.view;
  ctx.fillStyle = '#4a525e'; ctx.fillRect(0, 0, CW, CH);
  const a = w2s({ x: 0, y: G.H }), b = w2s({ x: G.W, y: 0 });
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(a.x + 5, a.y + 5, b.x - a.x, b.y - a.y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  const ordered = App.doc.ents.filter(e => e.type === 'hatch').concat(App.doc.ents.filter(e => e.type !== 'hatch'));
  G.vps.forEach((V0) => {
    const v1 = w2s({ x: V0.rect.x1, y: V0.rect.y2 }), v2 = w2s({ x: V0.rect.x2, y: V0.rect.y1 });
    ctx.save();
    ctx.beginPath(); ctx.rect(v1.x, v1.y, v2.x - v1.x, v2.y - v1.y); ctx.clip();
    App.view = { cx: V0.center.x - (V0.vc.x - PV.cx) / V0.k, cy: V0.center.y - (V0.vc.y - PV.cy) / V0.k, s: PV.s * V0.k };
    for (const e of ordered) {
      if (!visible(e)) continue;
      let c = entColor(e); if (c.toLowerCase() === '#ffffff') c = '#000000';
      ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1;
      applyEntStyle(ctx, e, App.view.s, App.modes.lwt ? (lw) => Math.max(1, lw * PV.s) : null);
      Types[e.type].draw(R, e);
      ctx.setLineDash([]);
    }
    App.view = PV;
    ctx.restore();
  });
  // sheet frame, title block, viewport frames
  ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = Math.max(1, 0.5 * PV.s);
  for (const [p, q] of G.lines) R.line(p, q);
  for (const t of G.texts) { ctx.fillStyle = t.label ? '#555' : '#000'; R.text(t.p, t.h, 0, t.s); }
  G.vps.forEach((V0, i) => {
    const r = V0.rect, act = App.vpActive === i, sel = App.vpSel === i;
    ctx.lineWidth = act ? 3 : sel ? 2 : 1; ctx.strokeStyle = act ? '#2f7bff' : sel ? '#2f7bff' : '#9aa5b3';
    if (sel && !act) ctx.setLineDash([6, 4]);
    R.poly([{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y1 }, { x: r.x2, y: r.y2 }, { x: r.x1, y: r.y2 }], true);
    ctx.setLineDash([]);
    if (sel && !act) for (const c of [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y1 }, { x: r.x2, y: r.y2 }, { x: r.x1, y: r.y2 }]) { const q = w2s(c); ctx.fillStyle = '#2f7bff'; ctx.fillRect(q.x - 4, q.y - 4, 8, 8); }
  });
  ctx.fillStyle = '#c9d2dd'; ctx.font = '11px sans-serif';
  ctx.fillText(`${L.paper} ${L.orient === 'P' ? 'Portrait' : 'Landscape'} — ${fmt(G.W)} × ${fmt(G.H)} mm`, a.x, b.y + 18);
  App.view = modelView;
}

// ---------- viewports: MSPACE / PSPACE ----------
function materializeVports(L) {
  if (!Array.isArray(L.vports)) { const G = layoutGeom(L); L.vports = [{ ...G.vp, scale: L.scale, center: L.center }]; }
  return L.vports;
}
function enterVp(i) {
  const L = curLayout(); if (!L) return;
  materializeVports(L);
  const G = layoutGeom(L), V0 = G.vps[i]; if (!V0) return;
  if (App.vpActive == null) App.paperView = { ...App.view };
  const PV = App.paperView;
  App.vpActive = i; App.vpSel = null; App.sel.clear();
  App.view = { cx: V0.center.x - (V0.vc.x - PV.cx) / V0.k, cy: V0.center.y - (V0.vc.y - PV.cy) / V0.k, s: PV.s * V0.k };
  App._vpSync = { s: App.view.s, cx: App.view.cx, cy: App.view.cy };
  App.dirty = true; UI.refreshLayoutTabs();
}
function exitVp() {
  if (App.vpActive == null) return;
  App.view = { ...App.paperView }; App.vpActive = null; App.paperView = null; App.sel.clear();
  App.dirty = true; UI.refreshLayoutTabs();
}
// keep the active viewport's scale and center in step with zoom / pan done inside it
function syncActiveVp() {
  if (App.vpActive == null || !App.paperView) return;
  const S = App._vpSync, v = App.view;
  if (S && Math.abs(S.s - v.s) < 1e-12 && Math.abs(S.cx - v.cx) < 1e-9 && Math.abs(S.cy - v.cy) < 1e-9) return;
  const L = curLayout(), vp = L && L.vports && L.vports[App.vpActive]; if (!vp) return;
  const PV = App.paperView, k = v.s / PV.s;
  const vc = { x: (Math.min(vp.x1, vp.x2) + Math.max(vp.x1, vp.x2)) / 2, y: (Math.min(vp.y1, vp.y2) + Math.max(vp.y1, vp.y2)) / 2 };
  vp.center = { x: v.cx + (vc.x - PV.cx) / k, y: v.cy + (vc.y - PV.cy) / k };
  if (Math.abs(k - (layoutGeom(L).vps[App.vpActive] || {}).k) > 1e-12 || vp.scale !== 'custom') { vp.scale = 'custom'; vp.k = k; }
  App._vpSync = { s: v.s, cx: v.cx, cy: v.cy };
  UI.refreshLayoutTabs();
}
function vpAt(p, onFrameTol) {
  const L = curLayout(); if (!L) return -1;
  const G = layoutGeom(L);
  for (let i = G.vps.length - 1; i >= 0; i--) {
    const r = G.vps[i].rect;
    if (onFrameTol !== undefined) {
      const inside = ptInRect(p, { x1: r.x1 - onFrameTol, y1: r.y1 - onFrameTol, x2: r.x2 + onFrameTol, y2: r.y2 + onFrameTol });
      const deep = ptInRect(p, { x1: r.x1 + onFrameTol, y1: r.y1 + onFrameTol, x2: r.x2 - onFrameTol, y2: r.y2 - onFrameTol });
      if (inside && !deep) return i;
    } else if (ptInRect(p, r)) return i;
  }
  return -1;
}
function setVpScale(i, scale) {
  const L = curLayout(); if (!L) return;
  materializeVports(L);
  UI.change(() => { const v = L.vports[i]; v.scale = scale; if (scale === 'Fit') v.center = null; });
  if (App.vpActive === i) { const pv = App.paperView; App.vpActive = null; App.view = pv; enterVp(i); }
  App.dirty = true; UI.refreshLayoutTabs();
}
function resizeVpCommand(i, corner) {
  runCommand(async () => {
    const L = curLayout(), v = materializeVports(L)[i];
    const r = { x1: Math.min(v.x1, v.x2), y1: Math.min(v.y1, v.y2), x2: Math.max(v.x1, v.x2), y2: Math.max(v.y1, v.y2) };
    const fixed = { x: corner.x === r.x1 ? r.x2 : r.x1, y: corner.y === r.y1 ? r.y2 : r.y1 };
    const p = await getPoint('Specify stretch point', { base: corner, noSnap: true, preview: (q) => [{ type: 'pline', pts: rectPts(fixed, q), closed: true, color: '#2f7bff', dash: true }] });
    if (!isPt(p)) return;
    Object.assign(v, { x1: Math.min(fixed.x, p.x), y1: Math.min(fixed.y, p.y), x2: Math.max(fixed.x, p.x), y2: Math.max(fixed.y, p.y) });
  });
}

function zoomPaper() {
  const L = curLayout(); if (!L) return;
  const G = layoutGeom(L);
  zoomRect({ x1: 0, y1: 0, x2: G.W, y2: G.H }, 0.05);
}

const PAPER_OK = new Set(['MVIEW', 'MSPACE', 'PSPACE', 'VPSCALE', 'ZOOM', 'PAN', 'PLOT', 'PAGESETUP', 'UNDO', 'REDO', 'HELP', 'SAVE', 'OPEN', 'NEW', 'DXFOUT', 'SVGOUT', 'PNGOUT', 'LAYER', 'PROPERTIES', 'LTSCALE', 'LWDISPLAY', 'LINETYPE', 'GRID', 'MODEL', 'LAYOUT']);

function switchSpace(name) {
  if (name === App.space) return;
  if (App.bedit) { UI.log('Close the Block Editor first.', 'err'); return; }
  if (App.req || App.cmd) cancelReq();
  if (App.vpActive != null) exitVp();
  App.vpSel = null;
  App.views = App.views || {};
  App.views[App.space] = { ...App.view };
  App.space = name;
  App.sel.clear(); App.hover = null; App.snap = null;
  if (App.views[name]) App.view = { ...App.views[name] };
  else if (name === 'Model') zoomExtents();
  else zoomPaper();
  App.dirty = true;
  UI.refreshLayoutTabs(); UI.refreshProps();
}

// ---------- minimal vector PDF writer ----------
function buildPDF(Wmm, Hmm, draw) {
  const K = 72 / 25.4;
  const n = (v) => (Math.abs(v) < 1e-6 ? '0' : (+v.toFixed(3)).toString());
  const ops = [];
  let curStroke = '', curFill = '', curW = -1, curDash = '';
  const rgb = (hex) => hexRGB(hex).map(c => n(c / 255)).join(' ');
  const P = {
    stroke(hex) { const s = rgb(hex); if (s !== curStroke) { ops.push(s + ' RG'); curStroke = s; } },
    fill(hex) { const s = rgb(hex); if (s !== curFill) { ops.push(s + ' rg'); curFill = s; } },
    width(mm) { if (mm !== curW) { ops.push(n(mm * K) + ' w'); curW = mm; } },
    dash(arrMm) { const s = arrMm && arrMm.length ? `[${arrMm.map(v => n(Math.max(v, 0.01) * K)).join(' ')}] 0 d` : '[] 0 d'; if (s !== curDash) { ops.push(s); curDash = s; } },
    poly(pts, closed) {
      if (pts.length < 2) return;
      ops.push(pts.map((p, i) => `${n(p.x * K)} ${n(p.y * K)} ${i ? 'l' : 'm'}`).join(' ') + (closed ? ' h S' : ' S'));
    },
    fillLoops(loops) { ops.push(loops.map(l => l.map((p, i) => `${n(p.x * K)} ${n(p.y * K)} ${i ? 'l' : 'm'}`).join(' ') + ' h').join(' ') + ' f*'); },
    text(p, h, rot, s) {
      const str = [...String(s)].map(ch => { const c = ch.charCodeAt(0); return c > 255 ? '?' : ch; }).join('').replace(/([\\()])/g, '\\$1');
      const c = Math.cos(rot), si = Math.sin(rot);
      ops.push(`BT /F1 ${n(h * K)} Tf ${n(c)} ${n(si)} ${n(-si)} ${n(c)} ${n(p.x * K)} ${n(p.y * K)} Tm (${str}) Tj ET`);
    },
    clip(r) { ops.push(`q ${n(r.x1 * K)} ${n(r.y1 * K)} ${n((r.x2 - r.x1) * K)} ${n((r.y2 - r.y1) * K)} re W n`); curStroke = curFill = curDash = ''; curW = -1; },
    unclip() { ops.push('Q'); curStroke = curFill = curDash = ''; curW = -1; },
  };
  draw(P);
  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(Wmm * K)} ${n(Hmm * K)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return new Blob([bytes], { type: 'application/pdf' });
}

// draw the model into a PDF page: toPaper maps model → paper mm, k = paper mm per model unit
function drawEntsPDF(P, toPaper, k, o = {}) {
  const flat = [];
  App.doc.ents.forEach(e => { if (visible(e) && layerOf(e).plot !== false && !(o.skipInfinite && INFINITE.has(e.type))) flattenEnt(e, flat); });
  const sorted = flat.filter(e => e.type === 'hatch').concat(flat.filter(e => e.type !== 'hatch'));
  for (const e of sorted) {
    let c = entColor(e); if (o.mono || c.toLowerCase() === '#ffffff') c = '#000000';
    P.stroke(c); P.fill(c);
    P.width(o.noLw ? 0.18 : Math.max(0.1, entLw(e) || 0.1));
    if (e.type === 'text') { P.text(toPaper(e.p), e.h * k, e.rot || 0, e.s); continue; }
    if (e.type === 'hatch') {
      const hp = HATCH_PATTERNS[e.pat] || HATCH_PATTERNS.ANSI31;
      P.dash(null);
      if (!hp.fam.length) P.fillLoops(e.loops.map(l => l.map(toPaper)));
      else { P.width(0.13); for (const [a, b] of hatchLines(e)) P.poly([toPaper(a), toPaper(b)], false); }
      continue;
    }
    const pat = (LTYPES[entLt(e)] || LTYPES.Continuous).pat;
    P.dash(pat.length ? pat.map(v => Math.abs(v) * (App.doc.ltscale || 1) * (e.lts || 1) * k) : null);
    for (const pl of entApprox(e)) P.poly(pl.map(toPaper), false);
  }
}

function plotLayoutPDF(L, o = {}) {
  const G = layoutGeom(L);
  const blob = buildPDF(G.W, G.H, (P) => {
    for (const V0 of G.vps) { P.clip(V0.rect); drawEntsPDF(P, V0.toPaper, V0.k, o); P.unclip(); }
    P.dash(null); P.stroke('#000000'); P.fill('#000000'); P.width(0.5);
    for (const [a, b] of G.lines) P.poly([a, b], false);
    P.width(0.18);
    for (const t of G.texts) { P.fill(t.label ? '#555555' : '#000000'); P.text(t.p, t.h, 0, t.s); }
  });
  const name = `${App.fileName}-${L.name}.pdf`;
  download(name, blob);
  UI.log(`Plotted ${L.name} to ${name} (${L.paper} ${L.orient === 'P' ? 'portrait' : 'landscape'}, scale ${G.scaleLabel}).`, 'info');
}

// ---------- commands ----------
def('PLOT', ['PRINT', 'EXPORTPDF'], 'Plot a layout to a true-scale vector PDF', async () => {
  let L = curLayout();
  if (!L) {
    const names = layouts().map(l => l.name);
    const k = await getKeyword(`Plot which layout? [${names.join('/')}] <${names[0]}>`, { keywords: names, def: names[0] });
    L = layouts().find(l => l.name === k); if (!L) return;
  }
  plotLayoutPDF(L);
}, { noUndo: true, noRepeat: true });
def('PAGESETUP', [], 'Page setup for the current layout', async () => { UI.pageSetup(); }, { noUndo: true, noRepeat: true });
def('MODEL', ['TILEMODE'], 'Switch to Model space', async () => { switchSpace('Model'); }, { noUndo: true, noRepeat: true });
def('LAYOUT', ['LO'], 'Create a new layout', async () => {
  let i = layouts().length + 1; while (layouts().some(l => l.name === 'Layout' + i)) i++;
  layouts().push(defaultLayout('Layout' + i));
  switchSpace('Layout' + i);
});

def('MVIEW', ['MV'], 'Create layout viewports', async () => {
  const L = curLayout(); if (!L) { UI.log('MVIEW works in a layout. Click a Layout tab first.', 'err'); return; }
  if (App.vpActive != null) exitVp();
  const G = layoutGeom(L), area = G.vp;
  const p = await getPoint('Specify corner of viewport or [Fit/2/3/4]', { keywords: ['Fit', '2', '3', '4'], noSnap: true, rubber: false });
  const wasAuto = !Array.isArray(L.vports);
  const add = (rects) => { materializeVports(L); if (wasAuto) L.vports.splice(0, 1); rects.forEach(r => L.vports.push({ ...r, scale: 'Fit', center: null })); };
  const W = area.x2 - area.x1, H = area.y2 - area.y1, g = 3;
  if (p === 'Fit') { add([area]); }
  else if (p === '2') {
    const k = await getKeyword('Enter viewport arrangement [Horizontal/Vertical] <Vertical>', { keywords: ['Horizontal', 'Vertical'], def: 'Vertical' });
    if (k === 'Horizontal') add([{ x1: area.x1, y1: area.y1 + H / 2 + g / 2, x2: area.x2, y2: area.y2 }, { x1: area.x1, y1: area.y1, x2: area.x2, y2: area.y1 + H / 2 - g / 2 }]);
    else add([{ x1: area.x1, y1: area.y1, x2: area.x1 + W / 2 - g / 2, y2: area.y2 }, { x1: area.x1 + W / 2 + g / 2, y1: area.y1, x2: area.x2, y2: area.y2 }]);
  } else if (p === '3') {
    add([{ x1: area.x1, y1: area.y1, x2: area.x1 + W * 0.6 - g / 2, y2: area.y2 }, { x1: area.x1 + W * 0.6 + g / 2, y1: area.y1 + H / 2 + g / 2, x2: area.x2, y2: area.y2 }, { x1: area.x1 + W * 0.6 + g / 2, y1: area.y1, x2: area.x2, y2: area.y1 + H / 2 - g / 2 }]);
  } else if (p === '4') {
    const mx = area.x1 + W / 2, my = area.y1 + H / 2;
    add([{ x1: area.x1, y1: my + g / 2, x2: mx - g / 2, y2: area.y2 }, { x1: mx + g / 2, y1: my + g / 2, x2: area.x2, y2: area.y2 }, { x1: area.x1, y1: area.y1, x2: mx - g / 2, y2: my - g / 2 }, { x1: mx + g / 2, y1: area.y1, x2: area.x2, y2: my - g / 2 }]);
  } else if (isPt(p)) {
    const q = await getPoint('Specify opposite corner', { noSnap: true, rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(p, q), closed: true, color: '#2f7bff', dash: true }] });
    if (!isPt(q)) return;
    materializeVports(L); L.vports.push({ ...rectNorm(p, q), scale: 'Fit', center: null });
  } else return;
  UI.log(`Layout ${L.name} now has ${L.vports.length} viewport(s). Double-click inside a viewport to work in it.`, 'info');
  UI.refreshLayoutTabs();
});
def('MSPACE', ['MS'], 'Activate a layout viewport (model space through the viewport)', async () => {
  const L = curLayout(); if (!L) return;
  const n = layoutGeom(L).vps.length; if (!n) { UI.log('No viewports in this layout. Use MVIEW.', 'err'); return; }
  enterVp(App.vpSel != null ? App.vpSel : 0);
}, { noUndo: true, noRepeat: true });
def('PSPACE', ['PS'], 'Return to paper space', async () => { exitVp(); }, { noUndo: true, noRepeat: true });
def('VPSCALE', ['VPS'], 'Set the scale of the active or selected viewport', async () => {
  const i = App.vpActive != null ? App.vpActive : App.vpSel;
  if (i == null) { UI.log('Select a viewport (click its frame) or double-click inside one first.', 'err'); return; }
  const v = (await getString('Viewport scale, e.g. 1:50, or Fit <Fit>')).trim() || 'Fit';
  if (v !== 'Fit' && !/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(v)) { UI.log('Enter a scale like 1:50.', 'err'); return; }
  setVpScale(i, v);
}, { noUndo: true });
