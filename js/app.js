// Core: document, view, rendering, input engine
'use strict';

class Cancel extends Error { constructor() { super('Cancel'); } }

const App = {
  doc: null,
  view: { cx: 100, cy: 70, s: 4 },
  sel: new Set(),
  hover: null,
  raw: { x: 0, y: 0 },       // raw cursor world point
  eff: { x: 0, y: 0 },       // effective (snapped/constrained) point
  scr: { x: -100, y: -100 }, // cursor screen point
  over: false,
  snap: null,                // current osnap {p,t}
  track: null,               // polar track {base, ang}
  modes: { grid: true, snap: false, ortho: false, polar: true, osnap: true, otrack: true, dyn: true, lwt: false, cons: true },
  acq: [],
  osnaps: { end: true, mid: true, cen: true, quad: true, int: true, perp: true, ins: true, node: true, near: false },
  gridSize: 10, snapSize: 10, polarInc: 45,
  temp: [],
  undo: [], redo: [],
  req: null, cmd: null, lastCmd: null,
  win: null, hotGrip: null,
  pan: null, dirty: true,
  fileName: 'Drawing1',
  space: 'Model',
  modified: false,
};

function newDoc() {
  return {
    ents: [],
    layers: [
      { name: '0', color: '#ffffff', on: true, locked: false, lt: 'Continuous', lw: 0.25 },
      { name: 'Dimensions', color: '#00ffff', on: true, locked: false, lt: 'Continuous', lw: 0.18 },
      { name: 'Hidden', color: '#ffff00', on: true, locked: false, lt: 'Hidden', lw: 0.25 },
      { name: 'Center', color: '#ff0000', on: true, locked: false, lt: 'Center', lw: 0.18 },
      { name: 'Hatch', color: '#808080', on: true, locked: false, lt: 'Continuous', lw: 0.13 },
    ],
    cur: '0', nextId: 1, textH: 2.5, dimH: 2.5, ltscale: 1, blocks: {},
  };
}
App.doc = newDoc();

// ---------- document helpers ----------
function layerOf(e) { return App.doc.layers.find(l => l.name === e.layer) || App.doc.layers[0]; }
function entColor(e) { return e.color || layerOf(e).color; }
function visible(e) { return layerOf(e).on; }
function editable(e) { const l = layerOf(e); return l.on && !l.locked; }
function addEnt(e) {
  if (!e.layer) e.layer = App.doc.cur;
  if (e.type === 'dim' && e.prec === undefined && App.doc.dimPrec !== undefined && e.kind !== 'ang') e.prec = App.doc.dimPrec;
  if (e.id === undefined && !e._keepColor) {
    if (!e.color && App.doc.curColor) e.color = App.doc.curColor;
    if (!e.lt && App.doc.curLt && e.type !== 'hatch') e.lt = App.doc.curLt;
    if (e.lw === undefined && App.doc.curLw !== undefined) e.lw = App.doc.curLw;
  }
  delete e._keepColor;
  e.id = App.doc.nextId++;
  App.doc.ents.push(e);
  App.dirty = true;
  return e;
}
function removeEnts(list) {
  const ids = new Set(list.map(e => e.id));
  App.doc.ents = App.doc.ents.filter(e => !ids.has(e.id));
  for (const id of ids) App.sel.delete(id);
  App.dirty = true;
}
function selEnts() { return App.doc.ents.filter(e => App.sel.has(e.id)); }
function snapshot() { return JSON.stringify(App.doc); }
function restore(s) {
  App.doc = JSON.parse(s);
  App.sel.clear(); App.hover = null; App.dirty = true;
  UI.refreshAll();
}
function pushUndo(before) {
  App.undo.push(before);
  if (App.undo.length > 200) App.undo.shift();
  App.redo = [];
  App.modified = true;
  UI.refreshTitle();
  try { localStorage.setItem('opendraft-autosave', snapshot()); } catch (_) { /* ignore */ }
}

// ---------- view ----------
const canvas = document.getElementById('cad');
const ctx = canvas.getContext('2d');
let CW = 0, CH = 0, DPR = 1;

function w2s(p) { return { x: (p.x - App.view.cx) * App.view.s + CW / 2, y: CH / 2 - (p.y - App.view.cy) * App.view.s }; }
function s2w(p) { return { x: (p.x - CW / 2) / App.view.s + App.view.cx, y: (CH / 2 - p.y) / App.view.s + App.view.cy }; }
function px(n) { return n / App.view.s; } // screen px -> world units

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  DPR = window.devicePixelRatio || 1;
  CW = r.width; CH = r.height;
  canvas.width = Math.round(CW * DPR); canvas.height = Math.round(CH * DPR);
  canvas.style.width = CW + 'px'; canvas.style.height = CH + 'px';
  App.dirty = true;
}
window.addEventListener('resize', resize);

function zoomAt(sp, f) {
  const before = s2w(sp);
  App.view.s = Math.max(1e-6, Math.min(1e6, App.view.s * f));
  const after = s2w(sp);
  App.view.cx += before.x - after.x; App.view.cy += before.y - after.y;
  App.dirty = true;
}
function zoomRect(r, margin = 0.08) {
  const w = r.x2 - r.x1, h = r.y2 - r.y1;
  if (!isFinite(w) || !isFinite(h)) return;
  const pad = margin > 0 ? Math.min(100, CH * 0.25) : 0; // keep clear of the floating command line
  const s = Math.min(CW / Math.max(w, 1e-6), (CH - pad) / Math.max(h, 1e-6)) * (1 - margin * 2);
  App.view.s = (w < 1e-9 && h < 1e-9) ? App.view.s : s;
  App.view.cx = (r.x1 + r.x2) / 2; App.view.cy = (r.y1 + r.y2) / 2 - pad / 2 / App.view.s;
  App.dirty = true;
}
function zoomExtents() {
  if (App.space !== 'Model') { zoomPaper(); return; }
  const ents = App.doc.ents.filter(e => visible(e) && !(typeof INFINITE !== 'undefined' && INFINITE.has(e.type)));
  if (!ents.length) { App.view = { cx: 100, cy: 70, s: Math.min(CW / 300, CH / 200) || 4 }; App.dirty = true; return; }
  let r = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const e of ents) {
    const b = entBBox(e);
    r = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) };
  }
  zoomRect(r);
}

// ---------- rendering ----------
function makeR(g = ctx) {
  return {
    g,
    line(a, b) { const p = w2s(a), q = w2s(b); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); },
    poly(pts, closed) {
      if (!pts.length) return;
      g.beginPath();
      pts.forEach((pt, i) => { const p = w2s(pt); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); });
      if (closed) g.closePath();
      g.stroke();
    },
    fill(pts) {
      g.beginPath();
      pts.forEach((pt, i) => { const p = w2s(pt); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); });
      g.closePath(); g.fill();
    },
    circle(c, r) { const p = w2s(c); g.beginPath(); g.arc(p.x, p.y, Math.max(0, r * App.view.s), 0, TAU); g.stroke(); },
    arc(c, r, a1, a2) {
      const p = w2s(c); g.beginPath();
      let span = normAng(a2 - a1); if (span < 1e-9) span = TAU;
      g.arc(p.x, p.y, Math.max(0, r * App.view.s), -a1, -(a1 + span), true); g.stroke();
    },
    hatch(e) {
      g.beginPath();
      for (const l of e.loops) { l.forEach((pt, i) => { const p = w2s(pt); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); g.closePath(); }
      const pat = HATCH_PATTERNS[e.pat] || HATCH_PATTERNS.ANSI31;
      if (!pat.fam.length) { g.fill('evenodd'); return; }
      g.save(); g.clip('evenodd'); g.setLineDash([]);
      const b = entBBox(e);
      const corners = [{ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y1 }, { x: b.x2, y: b.y2 }, { x: b.x1, y: b.y2 }];
      let dense = false;
      g.beginPath();
      for (const f of pat.fam) {
        const th = rad(f.a) + (e.ang || 0);
        const d = { x: Math.cos(th), y: Math.sin(th) }, n = V.perp(d);
        const sp = f.s * (e.scale || 1), off = (f.o || 0) * (e.scale || 1);
        if (sp * App.view.s < 2.5) { dense = true; continue; }
        const pn = corners.map(c => V.dot(c, n)), pd = corners.map(c => V.dot(c, d));
        const k0 = Math.floor((Math.min(...pn) - off) / sp), k1 = Math.ceil((Math.max(...pn) - off) / sp);
        if (k1 - k0 > 6000) { dense = true; continue; }
        const t0 = Math.min(...pd), t1 = Math.max(...pd);
        for (let k = k0; k <= k1; k++) {
          const o = V.mul(n, k * sp + off);
          const A = w2s(V.add(o, V.mul(d, t0))), B = w2s(V.add(o, V.mul(d, t1)));
          g.moveTo(A.x, A.y); g.lineTo(B.x, B.y);
        }
      }
      g.stroke();
      if (dense) { g.globalAlpha = 0.35; const p1 = w2s({ x: b.x1, y: b.y2 }), p2 = w2s({ x: b.x2, y: b.y1 }); g.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y); }
      g.restore();
    },
    text(p, h, rot, s) {
      const sz = h * App.view.s;
      if (sz < 0.8) { const b = textBox({ p, h, rot, s }); this.poly(b, false); return; }
      const q = w2s(p);
      g.save(); g.translate(q.x, q.y); g.rotate(-rot);
      g.font = `${sz}px ${TEXT_FONT}`; g.textBaseline = 'alphabetic';
      g.fillText(s, 0, 0); g.restore();
    },
  };
}

function drawGrid() {
  const s = App.view.s;
  let g = App.gridSize;
  while (g * s < 12) g *= 5;
  while (g * s > 120) g /= 5;
  const tl = s2w({ x: 0, y: 0 }), br = s2w({ x: CW, y: CH });
  const x0 = Math.floor(tl.x / g) * g, y0 = Math.floor(br.y / g) * g;
  const major = g * 5;
  ctx.lineWidth = 1;
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#36404d' : '#2a323c';
    ctx.beginPath();
    for (let x = x0; x <= br.x; x += g) {
      const isMaj = Math.abs(x / major - Math.round(x / major)) < 1e-6;
      if (isMaj !== !!pass) continue;
      const sx = Math.round(w2s({ x, y: 0 }).x) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, CH);
    }
    for (let y = y0; y <= tl.y; y += g) {
      const isMaj = Math.abs(y / major - Math.round(y / major)) < 1e-6;
      if (isMaj !== !!pass) continue;
      const sy = Math.round(w2s({ x: 0, y }).y) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(CW, sy);
    }
    ctx.stroke();
  }
  const o = w2s({ x: 0, y: 0 });
  ctx.strokeStyle = 'rgba(200,70,70,0.55)'; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(CW, o.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,190,90,0.55)'; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x, 0); ctx.stroke();
}

function drawUCS() {
  const x = 28, y = CH - 28;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e05555'; ctx.fillStyle = '#e05555';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.stroke();
  ctx.font = '11px sans-serif'; ctx.fillText('X', x + 44, y + 4);
  ctx.strokeStyle = '#4cc560'; ctx.fillStyle = '#4cc560';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
  ctx.fillText('Y', x - 4, y - 46);
  ctx.fillStyle = '#ddd'; ctx.fillRect(x - 3, y - 3, 6, 6);
}

function drawSnapMarker(sn) {
  const p = w2s(sn.p), r = 6;
  ctx.strokeStyle = '#ffd200'; ctx.lineWidth = 2;
  ctx.beginPath();
  switch (sn.t) {
    case 'end': ctx.rect(p.x - r, p.y - r, r * 2, r * 2); break;
    case 'mid': ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y + r * 0.8); ctx.lineTo(p.x - r, p.y + r * 0.8); ctx.closePath(); break;
    case 'cen': ctx.arc(p.x, p.y, r, 0, TAU); break;
    case 'quad': ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y); ctx.closePath(); break;
    case 'int': ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y + r); ctx.moveTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r); break;
    case 'perp': ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x - r, p.y + r); ctx.lineTo(p.x + r, p.y + r); ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x, p.y + r); break;
    case 'ins': ctx.rect(p.x - r, p.y - r, r, r); ctx.rect(p.x, p.y, r, r); break;
    case 'node': ctx.arc(p.x, p.y, r, 0, TAU); ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y + r); ctx.moveTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r); break;
    case 'near': ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r); ctx.lineTo(p.x + r, p.y + r); ctx.closePath(); break;
    default: ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.stroke();
  const names = { end: 'Endpoint', mid: 'Midpoint', cen: 'Center', quad: 'Quadrant', int: 'Intersection', perp: 'Perpendicular', ins: 'Insertion', node: 'Node', near: 'Nearest' };
  ctx.font = '11px sans-serif';
  const label = names[sn.t] || sn.t, w = ctx.measureText(label).width + 8;
  ctx.fillStyle = 'rgba(30,30,30,0.85)'; ctx.fillRect(p.x + 10, p.y + 10, w, 16);
  ctx.fillStyle = '#ffd200'; ctx.fillText(label, p.x + 14, p.y + 22);
}

function render() {
  if (!App.dirty) return;
  App.dirty = false;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (App.v3d) { render3D(); return; }
  ctx.fillStyle = '#212830'; ctx.fillRect(0, 0, CW, CH);
  const paper = App.space !== 'Model';
  if (paper) renderLayout();
  else if (App.modes.grid) drawGrid();
  const R = makeR();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const inSelectMode = !App.req || App.req.kind === 'select' || App.req.kind === 'entity';
  const lwPx = App.modes.lwt ? lwScreenPx : null;
  const ordered = App.doc.ents.filter(e => e.type === 'hatch').concat(App.doc.ents.filter(e => e.type !== 'hatch'));
  for (const e of (paper ? [] : ordered)) {
    if (!visible(e)) continue;
    const c = entColor(e);
    const selected = App.sel.has(e.id);
    const hovered = inSelectMode && App.hover === e.id;
    ctx.strokeStyle = c; ctx.fillStyle = c;
    ctx.lineWidth = 1;
    applyEntStyle(ctx, e, App.view.s, lwPx);
    if (hovered) ctx.lineWidth = Math.max(ctx.lineWidth, 2.5);
    if (selected) {
      ctx.save(); ctx.setLineDash([]); ctx.lineWidth = ctx.lineWidth + 3; ctx.strokeStyle = 'rgba(70,150,255,0.35)'; ctx.fillStyle = 'rgba(70,150,255,0.35)';
      Types[e.type].draw(R, e); ctx.restore();
      ctx.setLineDash([6, 4]);
    }
    Types[e.type].draw(R, e);
    ctx.setLineDash([]);
  }

  if (!paper) drawConstraints(ctx);

  // temp / preview entities
  for (const t of App.temp) {
    const c = t.color || (t.layer ? entColor(t) : '#ffffff');
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1;
    if (t.layer) applyEntStyle(ctx, t, App.view.s, App.modes.lwt ? lwScreenPx : null);
    if (t.dash) ctx.setLineDash([5, 4]);
    Types[t.type].draw(R, t);
    ctx.setLineDash([]);
  }

  // rubber band
  const r = App.req;
  if (r && r.base && r.rubber !== false && (r.kind === 'point' || r.kind === 'dist' || r.kind === 'angle')) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    R.line(r.base, App.eff); ctx.setLineDash([]);
  }
  if (r && r.tmpBase) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([4, 4]); R.line(r.tmpBase, App.eff); ctx.setLineDash([]);
  }

  // polar tracking ray
  if (App.track) {
    const a = App.track.base, b = V.polar(a, App.track.ang, px(Math.hypot(CW, CH) * 2));
    ctx.strokeStyle = 'rgba(60,200,120,0.7)'; ctx.setLineDash([2, 5]); ctx.lineWidth = 1; R.line(a, b); ctx.setLineDash([]);
  }

  // grips
  if (!App.req && !paper) {
    const ents = selEnts();
    if (ents.length <= 200) for (const e of ents) for (const g of Types[e.type].grips(e)) {
      const p = w2s(g.p);
      const hot = App.hotGrip && V.eq(App.hotGrip.p, g.p) && App.hotGrip.id === e.id;
      ctx.fillStyle = hot ? '#ff3b3b' : '#2f7bff'; ctx.strokeStyle = '#0a1a33'; ctx.lineWidth = 1;
      ctx.fillRect(p.x - 4, p.y - 4, 8, 8); ctx.strokeRect(p.x - 4.5, p.y - 4.5, 9, 9);
    }
  }

  // selection window
  if (App.win) {
    const a = w2s(App.win.p1), b = App.scr;
    const crossing = b.x < a.x;
    ctx.fillStyle = crossing ? 'rgba(60,200,90,0.15)' : 'rgba(60,120,255,0.15)';
    ctx.strokeStyle = crossing ? '#4cd964' : '#4a8cff';
    ctx.lineWidth = 1; if (crossing) ctx.setLineDash([5, 4]);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.setLineDash([]);
  }

  if (App.otrack) {
    ctx.strokeStyle = 'rgba(60,200,120,0.85)'; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    for (const t of App.otrack) R.line(t.a, App.eff);
    ctx.setLineDash([]);
    const q = w2s(App.eff); ctx.strokeStyle = '#4cd964'; ctx.beginPath(); ctx.moveTo(q.x - 5, q.y - 5); ctx.lineTo(q.x + 5, q.y + 5); ctx.moveTo(q.x + 5, q.y - 5); ctx.lineTo(q.x - 5, q.y + 5); ctx.stroke();
    ctx.font = '11px sans-serif'; const lab = App.otrack.length > 1 ? 'Intersection' : `Polar: ${fmt(deg(normAng(App.otrack[0].an)), 0)}°`;
    ctx.fillStyle = 'rgba(30,30,30,0.85)'; ctx.fillRect(q.x + 10, q.y + 10, ctx.measureText(lab).width + 8, 16); ctx.fillStyle = '#4cd964'; ctx.fillText(lab, q.x + 14, q.y + 22);
  }
  if (App.req && App.modes.otrack) for (const a of App.acq) { const q = w2s(a); ctx.strokeStyle = '#4cd964'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x - 4, q.y); ctx.lineTo(q.x + 4, q.y); ctx.moveTo(q.x, q.y - 4); ctx.lineTo(q.x, q.y + 4); ctx.stroke(); }
  if (App.snap) drawSnapMarker(App.snap);
  drawUCS();

  // crosshair
  if (App.over && !App.pan) {
    const c = App.req && App.req.kind !== 'select' && App.req.kind !== 'entity' ? w2s(App.eff) : App.scr;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
    const showCross = !App.req || ['point', 'dist', 'angle'].includes(App.req.kind);
    ctx.beginPath();
    if (showCross) {
      const L = 40;
      ctx.moveTo(c.x - L, Math.round(c.y) + 0.5); ctx.lineTo(c.x + L, Math.round(c.y) + 0.5);
      ctx.moveTo(Math.round(c.x) + 0.5, c.y - L); ctx.lineTo(Math.round(c.x) + 0.5, c.y + L);
    }
    ctx.stroke();
    if (!App.req || App.req.kind === 'select' || App.req.kind === 'entity') {
      ctx.strokeRect(Math.round(c.x) - 4.5, Math.round(c.y) - 4.5, 9, 9);
    }
  }
}
function loop() { render(); requestAnimationFrame(loop); }

// ---------- snapping ----------
const APERTURE = 12;
function findOsnap(raw, base) {
  const tol = px(APERTURE);
  const near = [];
  for (const e of App.doc.ents) {
    if (!visible(e)) continue;
    const b = entBBox(e);
    if (raw.x < b.x1 - tol || raw.x > b.x2 + tol || raw.y < b.y1 - tol || raw.y > b.y2 + tol) {
      if (!((e.type === 'circle' || e.type === 'arc') && App.osnaps.cen)) continue;
    }
    near.push(e);
    if (near.length > 400) break;
  }
  let best = null, bd = Infinity;
  const consider = (p, t, d) => { if (d < bd) { bd = d; best = { p, t }; } };
  const hovered = [];
  for (const e of near) {
    const d = entDist(e, raw);
    if (d < tol) hovered.push(e);
    for (const s of Types[e.type].snaps(e)) {
      if (!App.osnaps[s.t]) continue;
      const ds = V.dist(s.p, raw);
      if (ds < tol) consider(s.p, s.t, ds);
    }
    if ((e.type === 'circle' || e.type === 'arc') && App.osnaps.cen && d < tol) consider(e.c, 'cen', tol * 0.95);
  }
  if (App.osnaps.int && hovered.length > 1) {
    for (let i = 0; i < hovered.length && i < 12; i++) for (let j = i + 1; j < hovered.length && j < 12; j++) {
      for (const p of entIntersections(hovered[i], hovered[j])) {
        const d = V.dist(p, raw); if (d < tol) consider(p, 'int', d * 0.9);
      }
    }
  }
  if (best) return best;
  if (App.osnaps.perp && base) {
    for (const e of hovered) {
      if (e.type === 'line' || e.type === 'pline') {
        for (const pl of entApprox(e)) for (let i = 0; i < pl.length - 1; i++) {
          if (ptSegDist(raw, pl[i], pl[i + 1]) > tol) continue;
          const c = closestOnSeg(base, pl[i], pl[i + 1]);
          if (c.t > 1e-6 && c.t < 1 - 1e-6 && V.dist(c.p, base) > tol) return { p: c.p, t: 'perp' };
        }
      } else if (e.type === 'circle' || e.type === 'arc') {
        const p = V.polar(e.c, V.ang(e.c, base), e.r);
        if (V.dist(p, raw) < tol * 3) return { p, t: 'perp' };
      }
    }
  }
  if (App.osnaps.near && hovered.length) return { p: entNearest(hovered[0], raw), t: 'near' };
  return null;
}

function updateEffective() {
  const raw = App.raw;
  const r = App.req;
  App.snap = null; App.track = null;
  let p = V.clone(raw);
  const picking = r && ['point', 'dist', 'angle'].includes(r.kind);
  if (!picking) { App.eff = p; return; }
  const base = r.base || r.tmpBase;
  if (App.modes.snap) p = { x: Math.round(p.x / App.snapSize) * App.snapSize, y: Math.round(p.y / App.snapSize) * App.snapSize };
  if (base) {
    if (App.modes.ortho) {
      const d = V.sub(p, base);
      p = Math.abs(d.x) >= Math.abs(d.y) ? { x: p.x, y: base.y } : { x: base.x, y: p.y };
    } else if (App.modes.polar) {
      const a = V.ang(base, p), inc = rad(App.polarInc);
      const k = Math.round(a / inc), sa = k * inc;
      if (Math.abs(a - sa) < rad(3) && V.dist(base, p) > px(5)) {
        const d = V.dot(V.sub(p, base), { x: Math.cos(sa), y: Math.sin(sa) });
        p = V.polar(base, sa, d);
        App.track = { base, ang: sa };
      }
    }
  }
  App.otrack = null;
  if (App.modes.osnap && !r.noSnap && App.space === 'Model') {
    const sn = findOsnap(raw, base);
    if (sn) {
      App.snap = sn; p = sn.p; App.track = null;
      // object snap tracking: acquire points the cursor rests on
      if (App.modes.otrack && sn.t !== 'near' && sn.t !== 'perp') {
        const now = performance.now();
        if (!App.acqHover || !V.eq(App.acqHover.p, sn.p)) App.acqHover = { p: sn.p, t: now };
        else if (now - App.acqHover.t > 250 && !App.acq.some(a => V.eq(a, sn.p))) { App.acq.push(V.clone(sn.p)); if (App.acq.length > 5) App.acq.shift(); }
      }
    } else if (App.modes.otrack && App.acq.length) {
      const tol = px(8);
      const angs = App.modes.polar ? Array.from({ length: Math.round(360 / App.polarInc) }, (_, i) => rad(i * App.polarInc)) : [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      const hits = [];
      for (const a of App.acq) for (const an of angs) {
        const d = { x: Math.cos(an), y: Math.sin(an) };
        const t = V.dot(V.sub(raw, a), d); if (t <= 0) continue;
        const q = V.add(a, V.mul(d, t));
        if (V.dist(q, raw) < tol) hits.push({ a, d, q, an });
      }
      if (hits.length) {
        hits.sort((x, y) => V.dist(x.q, raw) - V.dist(y.q, raw));
        let best = hits[0], q = best.q, lines = [best];
        const other = hits.find(h => !V.eq(h.a, best.a) || Math.abs(Math.sin(h.an - best.an)) > 1e-6);
        if (other && Math.abs(V.cross(best.d, other.d)) > 1e-6) {
          const x = segSeg(best.a, V.add(best.a, best.d), other.a, V.add(other.a, other.d), true);
          if (x && V.dist(x.p, raw) < tol * 1.5) { q = x.p; lines = [best, other]; }
        }
        p = q; App.track = null; App.otrack = lines.map(l => ({ a: l.a, an: l.an }));
      }
    }
  }
  if (App.dynLock && base) p = V.polar(base, V.dist(base, p) > 1e-9 ? V.ang(base, p) : 0, App.dynLock.len);
  App.eff = p;
}

function pickEnt(p, filter) {
  const tol = px(6);
  let best = null, bd = Infinity;
  for (let i = App.doc.ents.length - 1; i >= 0; i--) {
    const e = App.doc.ents[i];
    if (!editable(e) || (filter && !filter(e))) continue;
    const b = entBBox(e);
    if (p.x < b.x1 - tol || p.x > b.x2 + tol || p.y < b.y1 - tol || p.y > b.y2 + tol) continue;
    const d = entDist(e, p);
    if (d < tol && d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------- input requests ----------
function ask(kind, prompt, opts = {}) {
  return new Promise((res, rej) => {
    App.req = Object.assign({ kind, prompt }, opts, { res, rej });
    UI.setPrompt(prompt, opts.keywords);
    updateEffective(); updatePreview();
    App.dirty = true;
    if (App.queue && App.queue.length) { const v = App.queue.shift(); setTimeout(() => { if (App.req && App.req.res === res) submitInput(v); }, 0); }
  });
}
const getPoint = (prompt, o) => ask('point', prompt, o);
const getDist = (prompt, o) => ask('dist', prompt, o);
const getAngle = (prompt, o) => ask('angle', prompt, o);
const getString = (prompt, o) => ask('string', prompt, o);
const getEntity = (prompt, o) => ask('entity', prompt, o);
const getKeyword = (prompt, o) => ask('kw', prompt, o);
async function getSelection(prompt = 'Select objects', o = {}) {
  const pre = selEnts().filter(editable);
  App.usedSel = true;
  if (pre.length && !o.noPickfirst) { UI.log(`${pre.length} found`); return pre; }
  App.sel.clear();
  const list = await ask('select', prompt, o);
  return list;
}

function finish(r, v, echo) {
  if (App.req !== r) return;
  App.req = null; App.dynLock = null; App.temp = []; App.snap = null; App.track = null;
  if (echo !== undefined) UI.echo(r.prompt, echo, r.keywords);
  App.dirty = true;
  r.res(v);
}
function cancelReq() {
  const r = App.req;
  App.dynLock = null;
  if (r) { App.req = null; App.temp = []; App.snap = null; App.track = null; App.win = null; if (r.cleanup) r.cleanup(); r.rej(new Cancel()); }
  App.dirty = true;
}

function updatePreview() {
  const r = App.req;
  if (r && r.preview) {
    try { App.temp = r.preview(App.eff) || []; } catch (err) { App.temp = []; }
  }
}

function matchKw(t, kws) {
  if (!kws) return null;
  const T = t.toUpperCase();
  const exact = kws.find(k => k.toUpperCase() === T);
  if (exact) return exact;
  // shortcut = uppercase letters in the keyword
  const byShort = kws.find(k => (k.match(/[A-Z0-9]/g) || []).join('') === T || k.replace(/[a-z]/g, '') === T);
  if (byShort) return byShort;
  const pre = kws.filter(k => k.toUpperCase().startsWith(T));
  return pre.length === 1 ? pre[0] : null;
}

function parseCoord(s, base) {
  s = s.replace(/\s+/g, '');
  let rel = false;
  if (s.startsWith('@')) { rel = true; s = s.slice(1); if (s === '') return base ? V.clone(base) : { x: 0, y: 0 }; }
  const org = rel ? (base || { x: 0, y: 0 }) : { x: 0, y: 0 };
  let m = s.match(/^(-?[\d.]+(?:e-?\d+)?)<(-?[\d.]+(?:e-?\d+)?)$/i);
  if (m) return V.polar(org, rad(parseFloat(m[2])), parseFloat(m[1]));
  m = s.match(/^(-?[\d.]+(?:e-?\d+)?),(-?[\d.]+(?:e-?\d+)?)$/i);
  if (m) return { x: org.x + parseFloat(m[1]), y: org.y + parseFloat(m[2]) };
  return null;
}
function parseNum(s) {
  s = s.trim();
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) {
    // allow simple arithmetic like 100/3 or 2*25
    if (/^[\d.+\-*/() ]+$/.test(s)) { try { const v = Function(`"use strict";return (${s})`)(); return isFinite(v) ? v : null; } catch (_) { return null; } }
    return null;
  }
  return parseFloat(s);
}

// Enter from the command line (text may be '')
function submitInput(text) {
  const r = App.req;
  const t = text.trim();
  if (!r) {
    if (App.cmd) return; // command busy between prompts
    if (t === '') { if (App.lastCmd) runCommand(App.lastCmd); return; }
    runCommand(t);
    return;
  }
  if (r.kind === 'string') { finish(r, text, text); return; }
  if (t === '') {
    if (r.kind === 'select') { finish(r, selEnts().filter(editable), ''); return; }
    if (r.def !== undefined) { finish(r, r.def, ''); return; }
    finish(r, null, ''); return;
  }
  const kw = matchKw(t, r.keywords);
  if (kw) { finish(r, kw, kw); return; }
  // transparent zoom/pan commands
  if (/^'?(z|zoom)$/i.test(t)) { zoomExtents(); return; }

  if (r.kind === 'point') {
    if (App.dynLock && r.base) {
      const an = parseNum(t);
      if (an !== null) { const p = V.polar(r.base, rad(an), App.dynLock.len); App.dynLock = null; App.lastPoint = p; finish(r, p, t); return; }
    }
    let tt = t;
    if (tt.startsWith('#')) tt = tt.slice(1);
    else if (App.modes.dyn && r.base && !tt.startsWith('@') && /[,<]/.test(tt)) tt = '@' + tt; // dynamic input: relative by default
    const c = parseCoord(tt, r.base || App.lastPoint);
    if (c) { App.lastPoint = c; finish(r, c, t); return; }
    const n = parseNum(t);
    if (n !== null && r.base) {
      const dir = V.dist(r.base, App.eff) > 1e-9 ? V.ang(r.base, App.eff) : 0;
      const p = V.polar(r.base, dir, n); App.lastPoint = p; finish(r, p, t); return;
    }
    if (n !== null && r.allowNumber) { finish(r, n, t); return; }
    UI.log('Point or option keyword required.', 'err'); return;
  }
  if (r.kind === 'dist') {
    const n = parseNum(t);
    if (n !== null) { finish(r, n, t); return; }
    UI.log('Requires numeric distance or two points.', 'err'); return;
  }
  if (r.kind === 'angle') {
    const n = parseNum(t);
    if (n !== null) { finish(r, rad(n), t); return; }
    UI.log('Requires a valid angle in degrees.', 'err'); return;
  }
  if (r.kind === 'select') {
    if (/^all$/i.test(t)) { App.doc.ents.filter(editable).forEach(e => App.sel.add(e.id)); UI.log(`${App.sel.size} found`); App.dirty = true; UI.refreshProps(); return; }
    if (/^l(ast)?$/i.test(t)) { const e = [...App.doc.ents].reverse().find(editable); if (e) App.sel.add(e.id); App.dirty = true; return; }
    UI.log('Invalid selection. Use mouse, ALL, or LAST.', 'err'); return;
  }
  UI.log('Invalid input.', 'err');
}

// click inside canvas while a point/dist/angle request is pending
function pickForRequest(p) {
  const r = App.req;
  if (r.kind === 'point') { App.lastPoint = p; finish(r, V.clone(p), `${fmt(p.x)},${fmt(p.y)}`); return; }
  if (r.kind === 'dist' || r.kind === 'angle') {
    const base = r.base || r.tmpBase;
    if (!base) { r.tmpBase = V.clone(p); UI.setPrompt('Specify second point', null); App.dirty = true; return; }
    if (r.kind === 'dist') { const d = V.dist(base, p); finish(r, d, fmt(d)); }
    else { const a = V.ang(base, p); finish(r, a, fmt(deg(normAng(a)))); }
  }
}

// ---------- command runner ----------
async function runCommand(input, queue) {
  const name = typeof input === 'string' ? resolveCmd(input) : null;
  const fn = typeof input === 'function' ? input : (name && Commands[name] ? Commands[name].fn : null);
  if (!fn) { UI.log(`Unknown command "${String(input).toUpperCase()}". Press F1 or type HELP.`, 'err'); return; }
  if (App.cmd) { cancelReq(); await new Promise(r => setTimeout(r, 0)); }
  if (name && App.v3d && !V3_OK.has(name)) { UI.log(`${name} works in the 2D view. Press Esc or click TOP to return to plan view.`, 'err'); return; }
  if (name && App.space !== 'Model' && !PAPER_OK.has(name)) { UI.log(`${name} works in Model space. Click the Model tab to draw and edit.`, 'err'); return; }
  const transparent = name && Commands[name].noUndo;
  App.queue = queue || [];
  App.cmd = name || 'GRIP';
  if (name && !Commands[name].noRepeat) { UI.recent = UI.recent.filter(c => c !== name); UI.recent.push(name); }
  App.hotGrip = null;
  if (name) { UI.log(`Command: ${name}`, 'cmd'); if (!Commands[name].noRepeat) App.lastCmd = name; }
  UI.setPrompt(name || '', null);
  const before = transparent ? null : snapshot();
  try {
    await fn();
  } catch (err) {
    if (err instanceof Cancel) UI.log('*Cancel*');
    else { console.error(err); UI.log('Error: ' + err.message, 'err'); }
  } finally {
    App.cmd = null; App.req = null; App.temp = []; App.queue = []; App.acq = []; App.otrack = null; App.snap = null; App.track = null; App.win = null;
    if (App.usedSel) { App.sel.clear(); App.usedSel = false; }
    if (App.doc.cons && App.doc.cons.length) { try { solveConstraints(App.pinned || new Set()); } catch (err) { console.error(err); } }
    App.pinned = null;
    if (before !== null && snapshot() !== before) pushUndo(before);
    UI.setPrompt('', null);
    UI.refreshProps(); UI.refreshLayers();
    App.dirty = true;
  }
}

function resolveCmd(t) {
  const u = t.trim().replace(/^[_.']+/, '').toUpperCase();
  if (Commands[u]) return u;
  for (const k in Commands) if ((Commands[k].alias || []).includes(u)) return k;
  return null;
}

// ---------- pointer handling ----------
const pointers = new Map();
let pinch = null, downInfo = null, spaceDown = false;

function setCursorFromEvent(ev) {
  const r = canvas.getBoundingClientRect();
  App.scr = { x: ev.clientX - r.left, y: ev.clientY - r.top };
  App.raw = s2w(App.scr);
}

canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  setCursorFromEvent(ev);
  if (pointers.size === 2) { // start pinch
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    App.win = null; downInfo = null; return;
  }
  if (ev.button === 1 || (ev.button === 0 && spaceDown)) {
    ev.preventDefault();
    App.pan = { sx: App.scr.x, sy: App.scr.y, cx: App.view.cx, cy: App.view.cy };
    return;
  }
  if (ev.button === 2) {
    if (!App.cmd && !App.req && !App.v3d && App.space === 'Model') { UI.contextMenu(ev.clientX, ev.clientY); return; }
    submitInput(''); return;
  }
  if (ev.button !== 0) return;
  if (App.v3d) { App.orbit = { x: App.scr.x, y: App.scr.y, yaw: V3.yaw, pitch: V3.pitch }; return; }
  downInfo = { x: App.scr.x, y: App.scr.y, shift: ev.shiftKey, touch: ev.pointerType === 'touch' };
  if (ev.pointerType !== 'touch') handlePress(ev.shiftKey);
});

function handlePress(shift) {
  updateEffective();
  const r = App.req;
  if (App.win) { finishWindow(App.raw, shift); return; }
  if (r && ['point', 'dist', 'angle'].includes(r.kind)) { pickForRequest(App.eff); return; }
  if (r && r.kind === 'entity') {
    const e = pickEnt(App.raw, r.filter);
    if (e) finish(r, { e, p: V.clone(App.raw) }, '');
    else UI.log('No object found.');
    return;
  }
  if (r && (r.kind === 'kw' || r.kind === 'mtext')) return;
  if (!r && App.space !== 'Model') return;
  if (App.cmd && !r) return;
  // selection (idle or select request)
  if (!r && App.sel.size) {
    const tol = px(6);
    for (const e of selEnts()) for (const g of Types[e.type].grips(e)) {
      if (V.dist(g.p, App.raw) < tol) { startGrip(e, g); return; }
    }
  }
  const e = pickEnt(App.raw);
  if (e) {
    const grp = typeof groupOf === 'function' ? groupOf(e.id) : null;
    for (const id of grp ? grp.ids : [e.id]) { if (shift) App.sel.delete(id); else App.sel.add(id); }
    App.dirty = true; UI.refreshProps();
    return;
  }
  App.win = { p1: V.clone(App.raw), s1: { ...App.scr } };
  App.dirty = true;
}

function finishWindow(p2, shift) {
  const w = App.win; App.win = null;
  const r = rectNorm(w.p1, p2);
  const crossing = p2.x < w.p1.x;
  let n = 0;
  for (const e of App.doc.ents) {
    if (!editable(e)) continue;
    if (crossing ? entCrossing(e, r) : entInWindow(e, r)) { shift ? App.sel.delete(e.id) : App.sel.add(e.id); n++; }
  }
  if (App.req && App.req.kind === 'select') UI.log(`${n} found, ${App.sel.size} total`);
  App.dirty = true; UI.refreshProps();
}

canvas.addEventListener('pointermove', (ev) => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const r = canvas.getBoundingClientRect();
    App.view.cx -= (m.x - pinch.m.x) / App.view.s; App.view.cy += (m.y - pinch.m.y) / App.view.s;
    zoomAt({ x: m.x - r.left, y: m.y - r.top }, d / (pinch.d || d));
    pinch = { d, m }; return;
  }
  setCursorFromEvent(ev);
  App.over = true;
  if (App.orbit) {
    V3.yaw = App.orbit.yaw + (App.scr.x - App.orbit.x) * 0.008;
    V3.pitch = Math.max(0, Math.min(Math.PI / 2 - 1e-3, App.orbit.pitch - (App.scr.y - App.orbit.y) * 0.008));
    App.dirty = true; return;
  }
  if (App.pan) {
    App.view.cx = App.pan.cx - (App.scr.x - App.pan.sx) / App.view.s;
    App.view.cy = App.pan.cy + (App.scr.y - App.pan.sy) / App.view.s;
    App.dirty = true; return;
  }
  onCursorMove();
});

function onCursorMove() {
  updateEffective();
  updatePreview();
  const r = App.req;
  if (App.space === 'Model' && (!r || r.kind === 'select' || r.kind === 'entity')) {
    const h = App.win ? null : pickEnt(App.raw, r && r.filter);
    App.hover = h ? h.id : null;
  } else App.hover = null;
  UI.updateCoords();
  UI.updateDyn();
  App.dirty = true;
}

canvas.addEventListener('pointerup', (ev) => {
  pointers.delete(ev.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; return; }
  if (App.orbit) { App.orbit = null; return; }
  if (App.pan) { App.pan = null; App.dirty = true; return; }
  setCursorFromEvent(ev);
  if (ev.button !== 0 || !downInfo) return;
  const moved = Math.hypot(App.scr.x - downInfo.x, App.scr.y - downInfo.y);
  if (downInfo.touch) {
    if (moved < 10) { onCursorMove(); handlePress(downInfo.shift); }
    else if (App.win) finishWindow(App.raw, downInfo.shift);
  } else if (App.win && moved > 5) finishWindow(App.raw, downInfo.shift);
  downInfo = null;
});
canvas.addEventListener('pointerleave', () => { App.over = false; App.dirty = true; UI.updateDyn(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  setCursorFromEvent(ev);
  zoomAt(App.scr, ev.deltaY < 0 ? 1.2 : 1 / 1.2);
  onCursorMove();
}, { passive: false });
canvas.addEventListener('auxclick', (ev) => { if (ev.button === 1 && ev.detail === 2) zoomExtents(); });
canvas.addEventListener('dblclick', (ev) => {
  if (App.req || App.v3d || App.space !== 'Model') return;
  setCursorFromEvent(ev);
  const e = pickEnt(App.raw);
  if (e && ['text', 'mtext', 'table'].includes(e.type)) { const at = V.clone(App.raw); App.sel.clear(); runCommand(() => editEntityText(e, at)); }
});

// ---------- grip editing ----------
function startGrip(e, g) {
  App.hotGrip = { id: e.id, p: g.p };
  App.dirty = true;
  runCommand(async () => {
    App.hotGrip = { id: e.id, p: g.p };
    const modes = ['STRETCH', 'MOVE', 'ROTATE', 'SCALE', 'MIRROR'];
    let mi = 0, copy = false;
    const base = g.p;
    const sel = selEnts().filter(editable);
    const mfor = (mode, q) => {
      if (mode === 'MOVE') return M.translate(q.x - base.x, q.y - base.y);
      if (mode === 'ROTATE') return M.rotate(base, V.ang(base, q));
      if (mode === 'SCALE') { const k = V.dist(base, q); return k > 1e-9 ? M.scale(base, k) : null; }
      if (mode === 'MIRROR') return V.dist(base, q) > 1e-9 ? M.mirror(base, q) : null;
      return null;
    };
    for (;;) {
      const mode = modes[mi];
      UI.log(`** ${mode}${copy ? ' (multiple)' : ''} **`);
      const prompt = { STRETCH: 'Specify stretch point', MOVE: 'Specify move point', ROTATE: 'Specify rotation angle', SCALE: 'Specify scale factor', MIRROR: 'Specify second point' }[mode];
      const p = await getPoint(`${prompt} or [Copy/eXit]`, {
        base, keywords: ['Copy', 'eXit'],
        preview: (q) => {
          if (mode === 'STRETCH') { const c = entClone(e); const gg = Types[c.type].grips(c).find(x => V.eq(x.p, g.p)); if (gg) gg.set(c, q); c.dash = true; return [c]; }
          const m = mfor(mode, q); return m ? sel.map(x => entTransform(entClone(x), m)) : [];
        },
      });
      if (p === null) { mi = (mi + 1) % modes.length; continue; }   // Enter / Space cycles grip modes
      if (p === 'Copy') { copy = true; continue; }
      if (p === 'eXit') break;
      if (!isPt(p)) break;
      if (mode === 'STRETCH') {
        if (e.type === 'line') { const gs = Types.line.grips(e); const i = gs.findIndex(x => V.eq(x.p, g.p)); App.pinned = new Set(i === 0 ? [e.id + ':p1'] : i === 1 ? [e.id + ':p2'] : [e.id + ':p1', e.id + ':p2']); }
        if (copy) { const c = entClone(e); delete c.id; const gg = Types[c.type].grips(c).find(x => V.eq(x.p, g.p)); if (gg) gg.set(c, p); addEnt(c); continue; }
        g.set(e, p); invalidate(e);
      } else {
        const m = mfor(mode, p); if (!m) continue;
        if (copy) { sel.forEach(x => { const c = entClone(x); delete c.id; c._keepColor = true; addEnt(entTransform(c, m)); }); continue; }
        sel.forEach(x => entTransform(x, m));
      }
      break;
    }
    App.hotGrip = null;
  });
}
