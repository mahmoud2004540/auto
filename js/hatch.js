// Linetypes, lineweights, hatch patterns and the HATCH entity
'use strict';

// Linetype patterns in drawing units (dash > 0, gap < 0, 0 = dot)
const LTYPES = {
  Continuous: { desc: 'Solid line', pat: [] },
  Dashed: { desc: 'Dashed __ __ __', pat: [12.7, -6.35] },
  Hidden: { desc: 'Hidden _ _ _ _', pat: [6.35, -3.175] },
  Center: { desc: 'Center ____ _ ____', pat: [31.75, -6.35, 6.35, -6.35] },
  Phantom: { desc: 'Phantom ____ _ _ ____', pat: [31.75, -6.35, 6.35, -6.35, 6.35, -6.35] },
  DashDot: { desc: 'Dash dot __ . __ .', pat: [12.7, -6.35, 0, -6.35] },
  Dot: { desc: 'Dot . . . .', pat: [0, -6.35] },
  Border: { desc: 'Border __ __ . __', pat: [12.7, -6.35, 12.7, -6.35, 0, -6.35] },
};
const LWEIGHTS = [0, 0.05, 0.09, 0.13, 0.15, 0.18, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.53, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.58, 2, 2.11];

function ltName(s) {
  if (!s) return null;
  const u = String(s).toUpperCase();
  if (u === 'BYLAYER' || u === 'BYBLOCK') return null;
  for (const k in LTYPES) if (k.toUpperCase() === u) return k;
  if (u.includes('HIDDEN')) return 'Hidden';
  if (u.includes('PHANTOM')) return 'Phantom';
  if (u.includes('CENTER')) return 'Center';
  if (u.includes('BORDER')) return 'Border';
  if (u.includes('DASHDOT')) return 'DashDot';
  if (u.includes('DASH')) return 'Dashed';
  if (u.includes('DOT')) return 'Dot';
  return 'Continuous';
}
function entLt(e) { return e.lt || layerOf(e).lt || 'Continuous'; }
function entLw(e) { const v = e.lw !== undefined ? e.lw : layerOf(e).lw; return v === undefined ? 0.25 : v; }

// apply linetype dashes + lineweight to a 2D context. pxPerUnit = screen px per drawing unit
function applyEntStyle(g, e, pxPerUnit, lwPx) {
  if (lwPx) g.lineWidth = lwPx(entLw(e));
  if (e.type === 'text' || e.type === 'dim' || e.type === 'hatch') { g.setLineDash([]); return; }
  const pat = (LTYPES[entLt(e)] || LTYPES.Continuous).pat;
  if (!pat.length) { g.setLineDash([]); return; }
  const k = (App.doc.ltscale || 1) * (e.lts || 1) * pxPerUnit;
  const arr = pat.map(v => Math.abs(v) * k);
  const total = arr.reduce((a, b) => a + b, 0);
  if (total < 4) { g.setLineDash([]); return; }   // too dense to see: draw continuous
  g.setLineDash(arr.map(v => (v < 0.01 ? 0.01 : v)));
}
function lwScreenPx(lw) { return Math.max(1, lw * 4); }

// ---------- hatch patterns (line families, drawing units at scale 1) ----------
const HATCH_PATTERNS = {
  SOLID: { desc: 'Solid fill', fam: [] },
  ANSI31: { desc: 'Iron, brick, stone (45°)', fam: [{ a: 45, s: 3.175 }] },
  ANSI32: { desc: 'Steel', fam: [{ a: 45, s: 9.525 }, { a: 45, s: 9.525, o: 4.7625 }] },
  ANSI37: { desc: 'Lead, zinc (cross 45°)', fam: [{ a: 45, s: 3.175 }, { a: 135, s: 3.175 }] },
  LINE: { desc: 'Parallel horizontal lines', fam: [{ a: 0, s: 3.175 }] },
  NET: { desc: 'Horizontal / vertical grid', fam: [{ a: 0, s: 3.175 }, { a: 90, s: 3.175 }] },
  NET3: { desc: '0 / 60 / 120 degree grid', fam: [{ a: 0, s: 3.175 }, { a: 60, s: 3.175 }, { a: 120, s: 3.175 }] },
  EARTH: { desc: 'Earth / ground', fam: [{ a: 0, s: 6.35 }, { a: 90, s: 6.35, o: 3.175 }] },
};

function polyArea(pts) { let A = 0; for (let i = 0; i < pts.length; i++) A += V.cross(pts[i], pts[(i + 1) % pts.length]); return A / 2; }
function ptInPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function ptInLoops(p, loops) { let n = 0; for (const l of loops) if (ptInPoly(p, l)) n++; return n % 2 === 1; }

// world-space hatch line segments clipped to loops (even-odd)
function hatchLines(e, maxLines = 20000) {
  const pat = HATCH_PATTERNS[e.pat] || HATCH_PATTERNS.ANSI31;
  const out = [];
  if (!pat.fam.length) return out;
  const b = entBBox(e);
  const corners = [{ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y1 }, { x: b.x2, y: b.y2 }, { x: b.x1, y: b.y2 }];
  const edges = [];
  for (const l of e.loops) for (let i = 0; i < l.length; i++) edges.push([l[i], l[(i + 1) % l.length]]);
  for (const f of pat.fam) {
    const th = rad(f.a) + (e.ang || 0);
    const d = { x: Math.cos(th), y: Math.sin(th) }, n = V.perp(d);
    const sp = f.s * (e.scale || 1);
    const off = (f.o || 0) * (e.scale || 1);
    const pn = corners.map(c => V.dot(c, n)), pd = corners.map(c => V.dot(c, d));
    const k0 = Math.floor((Math.min(...pn) - off) / sp), k1 = Math.ceil((Math.max(...pn) - off) / sp);
    if (k1 - k0 > maxLines) continue;
    const t0 = Math.min(...pd) - 1, t1 = Math.max(...pd) + 1;
    for (let k = k0; k <= k1; k++) {
      const o = V.mul(n, k * sp + off);
      const A = V.add(o, V.mul(d, t0)), B = V.add(o, V.mul(d, t1));
      const ts = [];
      for (const [p, q] of edges) { const r = segSeg(A, B, p, q); if (r) ts.push(r.t); }
      ts.sort((x, y) => x - y);
      for (let i = 0; i + 1 < ts.length; i += 2) if (ts[i + 1] - ts[i] > 1e-9) out.push([V.lerp(A, B, ts[i]), V.lerp(A, B, ts[i + 1])]);
    }
  }
  return out;
}

Types.hatch = {
  label: 'Hatch',
  approx: (e) => e.loops.map(l => [...l, l[0]]),
  snaps: () => [],
  grips: (e) => {
    const b = entBBox(e);
    const c = { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 };
    return [{ p: c, set: (x, p) => { const d = V.sub(p, c); x.loops = x.loops.map(l => l.map(q => V.add(q, d))); } }];
  },
  transform: (e, m) => {
    e.loops = e.loops.map(l => l.map(p => M.apply(m, p)));
    const dv = M.vec(m, { x: Math.cos(e.ang || 0), y: Math.sin(e.ang || 0) });
    e.ang = Math.atan2(dv.y, dv.x); e.scale = (e.scale || 1) * Math.sqrt(Math.abs(M.det(m)));
  },
  draw: (R, e) => R.hatch(e),
  props: (e) => [
    { k: 'Pattern', v: e.pat, set: (x, v) => { const u = v.trim().toUpperCase(); if (HATCH_PATTERNS[u]) x.pat = u; } },
    { k: 'Scale', v: e.scale || 1, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.scale = n; } },
    { k: 'Angle', v: deg(normAng(e.ang || 0)), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.ang = rad(n); } },
    { k: 'Area', v: hatchArea(e) },
    { k: 'Loops', v: e.loops.length },
  ],
  explode: (e) => e.loops.map(l => ({ type: 'pline', pts: l.map(V.clone), closed: true })),
};
function hatchArea(e) {
  // even-odd: loops nested at odd depth subtract
  let A = 0;
  e.loops.forEach((l, i) => {
    let depth = 0; e.loops.forEach((o, j) => { if (i !== j && ptInPoly(l[0], o)) depth++; });
    A += (depth % 2 ? -1 : 1) * Math.abs(polyArea(l));
  });
  return Math.abs(A);
}

// ---------- boundary detection from an internal point ----------
function findBoundary(P) {
  const ents = App.doc.ents.filter(e => visible(e) && !['text', 'dim', 'hatch'].includes(e.type));
  const segs = [];
  for (const e of ents) for (const pl of entApprox(e)) for (let i = 0; i < pl.length - 1; i++) {
    const a = pl[i], b = pl[i + 1];
    if (V.dist(a, b) > 1e-9) segs.push({ a, b, ts: [0, 1], x1: Math.min(a.x, b.x), x2: Math.max(a.x, b.x), y1: Math.min(a.y, b.y), y2: Math.max(a.y, b.y) });
  }
  if (!segs.length) return null;
  // sweep for intersections
  const order = segs.map((s, i) => i).sort((i, j) => segs[i].x1 - segs[j].x1);
  for (let ii = 0; ii < order.length; ii++) {
    const s = segs[order[ii]];
    for (let jj = ii + 1; jj < order.length; jj++) {
      const t = segs[order[jj]];
      if (t.x1 > s.x2 + 1e-9) break;
      if (t.y1 > s.y2 + 1e-9 || t.y2 < s.y1 - 1e-9) continue;
      const r = segSeg(s.a, s.b, t.a, t.b);
      if (r) { s.ts.push(Math.min(1, Math.max(0, r.t))); t.ts.push(Math.min(1, Math.max(0, r.u))); }
    }
  }
  // nodes
  let ext = 0; for (const s of segs) ext = Math.max(ext, Math.abs(s.x1), Math.abs(s.x2), Math.abs(s.y1), Math.abs(s.y2));
  const tol = Math.max(1e-7, ext * 1e-8);
  const nodes = [], keyMap = new Map();
  const nodeOf = (p) => {
    const k = Math.round(p.x / tol) + ',' + Math.round(p.y / tol);
    let id = keyMap.get(k);
    if (id === undefined) { id = nodes.length; nodes.push({ p, adj: new Map() }); keyMap.set(k, id); }
    return id;
  };
  for (const s of segs) {
    const ts = [...new Set(s.ts)].sort((a, b) => a - b);
    let prev = nodeOf(s.a);
    for (let i = 1; i < ts.length; i++) {
      const id = nodeOf(i === ts.length - 1 ? s.b : V.lerp(s.a, s.b, ts[i]));
      if (id !== prev) { nodes[prev].adj.set(id, true); nodes[id].adj.set(prev, true); }
      prev = id;
    }
  }
  // prune dangling ends
  let changed = true;
  while (changed) {
    changed = false;
    nodes.forEach((n, i) => { if (n.adj.size === 1) { const [o] = n.adj.keys(); nodes[o].adj.delete(i); n.adj.clear(); changed = true; } });
  }
  // nearest edge hit by a ray towards +x
  let best = null, bx = Infinity;
  nodes.forEach((n, u) => {
    for (const v of n.adj.keys()) {
      if (v < u) continue;
      const a = n.p, b = nodes[v].p;
      if ((a.y > P.y) !== (b.y > P.y)) {
        const x = a.x + (P.y - a.y) * (b.x - a.x) / (b.y - a.y);
        if (x > P.x && x < bx) { bx = x; best = [u, v]; }
      }
    }
  });
  if (!best) return null;
  let [u, v] = best;
  if (V.cross(V.sub(nodes[v].p, nodes[u].p), V.sub(P, nodes[u].p)) < 0) [u, v] = [v, u];
  const sorted = new Map();
  const nbrs = (i) => {
    if (!sorted.has(i)) sorted.set(i, [...nodes[i].adj.keys()].map(j => ({ j, a: V.ang(nodes[i].p, nodes[j].p) })).sort((x, y) => x.a - y.a));
    return sorted.get(i);
  };
  const loop = [], start = [u, v];
  let guard = 0;
  do {
    loop.push(nodes[u].p);
    const list = nbrs(v);
    const back = list.findIndex(x => x.j === u);
    const next = list[(back - 1 + list.length) % list.length].j;
    u = v; v = next;
    if (++guard > 200000) return null;
  } while (!(u === start[0] && v === start[1]));
  if (loop.length < 3 || polyArea(loop) <= 0 || !ptInPoly(P, loop)) return null;
  // islands: closed objects fully inside the boundary
  const loops = [loop];
  const onLoop = new Set(loop.map(p => Math.round(p.x / tol) + ',' + Math.round(p.y / tol)));
  for (const e of ents) {
    const closed = e.type === 'circle' || (e.type === 'pline' && e.closed);
    if (!closed) continue;
    const pts = entApprox(e)[0].slice(0, -1);
    if (pts.some(p => onLoop.has(Math.round(p.x / tol) + ',' + Math.round(p.y / tol)))) continue;
    if (pts.every(p => ptInPoly(p, loop)) && !ptInPoly(P, pts)) loops.push(pts.map(V.clone));
  }
  return loops;
}
