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
    if (!visible(e)) continue;
    const b = entBBox(e);
    if (!isFinite(b.x1)) continue;
    r = r ? { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) } : { ...b };
  }
  return r;
}

// sheet geometry in paper millimetres (origin bottom-left)
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
  return { W, H, border, tb, vp, k, center, toPaper, lines, texts, scaleLabel };
}

// ---------- on-screen rendering of a layout ----------
function renderLayout() {
  const L = curLayout(); if (!L) return;
  const G = layoutGeom(L);
  const R = makeR();
  ctx.fillStyle = '#4a525e'; ctx.fillRect(0, 0, CW, CH);
  const a = w2s({ x: 0, y: G.H }), b = w2s({ x: G.W, y: 0 });
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(a.x + 5, a.y + 5, b.x - a.x, b.y - a.y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  // model inside the viewport
  const v1 = w2s({ x: G.vp.x1, y: G.vp.y2 }), v2 = w2s({ x: G.vp.x2, y: G.vp.y1 });
  ctx.save();
  ctx.beginPath(); ctx.rect(v1.x, v1.y, v2.x - v1.x, v2.y - v1.y); ctx.clip();
  const saved = App.view;
  const vc = { x: (G.vp.x1 + G.vp.x2) / 2, y: (G.vp.y1 + G.vp.y2) / 2 };
  App.view = { cx: G.center.x - (vc.x - saved.cx) / G.k, cy: G.center.y - (vc.y - saved.cy) / G.k, s: saved.s * G.k };
  const ordered = App.doc.ents.filter(e => e.type === 'hatch').concat(App.doc.ents.filter(e => e.type !== 'hatch'));
  const paperPerMm = saved.s; // screen px per paper mm
  for (const e of ordered) {
    if (!visible(e)) continue;
    let c = entColor(e); if (c.toLowerCase() === '#ffffff') c = '#000000';
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1;
    applyEntStyle(ctx, e, App.view.s, App.modes.lwt ? (lw) => Math.max(1, lw * paperPerMm) : null);
    Types[e.type].draw(R, e);
    ctx.setLineDash([]);
  }
  App.view = saved;
  ctx.restore();
  // sheet frame, viewport frame, title block
  ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = Math.max(1, 0.5 * App.view.s);
  for (const [p, q] of G.lines) R.line(p, q);
  ctx.lineWidth = 1; ctx.strokeStyle = '#9aa5b3';
  R.poly([{ x: G.vp.x1, y: G.vp.y1 }, { x: G.vp.x2, y: G.vp.y1 }, { x: G.vp.x2, y: G.vp.y2 }, { x: G.vp.x1, y: G.vp.y2 }], true);
  for (const t of G.texts) { ctx.fillStyle = t.label ? '#555' : '#000'; R.text(t.p, t.h, 0, t.s); }
  // paper size caption
  ctx.fillStyle = '#c9d2dd'; ctx.font = '11px sans-serif';
  ctx.fillText(`${L.paper} ${L.orient === 'P' ? 'Portrait' : 'Landscape'} — ${fmt(G.W)} × ${fmt(G.H)} mm`, a.x, b.y + 18);
}

function zoomPaper() {
  const L = curLayout(); if (!L) return;
  const G = layoutGeom(L);
  zoomRect({ x1: 0, y1: 0, x2: G.W, y2: G.H }, 0.05);
}

const PAPER_OK = new Set(['ZOOM', 'PAN', 'PLOT', 'PAGESETUP', 'UNDO', 'REDO', 'HELP', 'SAVE', 'OPEN', 'NEW', 'DXFOUT', 'SVGOUT', 'PNGOUT', 'LAYER', 'PROPERTIES', 'LTSCALE', 'LWDISPLAY', 'LINETYPE', 'GRID', 'MODEL', 'LAYOUT']);

function switchSpace(name) {
  if (name === App.space) return;
  if (App.req || App.cmd) cancelReq();
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

function plotLayoutPDF(L) {
  const G = layoutGeom(L);
  const blob = buildPDF(G.W, G.H, (P) => {
    // model geometry clipped to viewport
    P.clip(G.vp);
    const flat = [];
    App.doc.ents.forEach(e => { if (visible(e)) flattenEnt(e, flat); });
    const sorted = flat.filter(e => e.type === 'hatch').concat(flat.filter(e => e.type !== 'hatch'));
    for (const e of sorted) {
      let c = entColor(e); if (c.toLowerCase() === '#ffffff') c = '#000000';
      P.stroke(c); P.fill(c);
      P.width(Math.max(0.1, entLw(e) || 0.1));
      if (e.type === 'text') { P.text(G.toPaper(e.p), e.h * G.k, e.rot || 0, e.s); continue; }
      if (e.type === 'hatch') {
        const hp = HATCH_PATTERNS[e.pat] || HATCH_PATTERNS.ANSI31;
        P.dash(null);
        if (!hp.fam.length) P.fillLoops(e.loops.map(l => l.map(G.toPaper)));
        else { P.width(0.13); for (const [a, b] of hatchLines(e)) P.poly([G.toPaper(a), G.toPaper(b)], false); }
        continue;
      }
      const pat = (LTYPES[entLt(e)] || LTYPES.Continuous).pat;
      P.dash(pat.length ? pat.map(v => Math.abs(v) * (App.doc.ltscale || 1) * (e.lts || 1) * G.k) : null);
      for (const pl of entApprox(e)) P.poly(pl.map(G.toPaper), false);
    }
    P.unclip();
    // sheet
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
def('PAGESETUP', ['PS'], 'Page setup for the current layout', async () => { UI.pageSetup(); }, { noUndo: true, noRepeat: true });
def('MODEL', ['MS', 'TILEMODE'], 'Switch to Model space', async () => { switchSpace('Model'); }, { noUndo: true, noRepeat: true });
def('LAYOUT', ['LO'], 'Create a new layout', async () => {
  let i = layouts().length + 1; while (layouts().some(l => l.name === 'Layout' + i)) i++;
  layouts().push(defaultLayout('Layout' + i));
  switchSpace('Layout' + i);
});
