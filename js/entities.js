// Entity type definitions
'use strict';

const measureCtx = document.createElement('canvas').getContext('2d');
const TEXT_FONT = 'Arial, Helvetica, sans-serif';
function textWidth(s, h) {
  measureCtx.font = `100px ${TEXT_FONT}`;
  return measureCtx.measureText(s || ' ').width / 100 * h;
}

function arcPts(c, r, a1, a2, n) {
  const span = a2 === undefined ? TAU : normAng(a2 - a1) || TAU;
  const seg = n || Math.max(8, Math.ceil(span / TAU * 128));
  const out = [];
  for (let i = 0; i <= seg; i++) out.push(V.polar(c, a1 + span * i / seg, r));
  return out;
}

function textBox(e) {
  const w = textWidth(e.s, e.h);
  const rot = e.rot || 0;
  const o = e.p;
  const ux = { x: Math.cos(rot), y: Math.sin(rot) }, uy = { x: -Math.sin(rot), y: Math.cos(rot) };
  const d = -e.h * 0.2;
  const pt = (a, b) => V.add(o, V.add(V.mul(ux, a), V.mul(uy, b)));
  return [pt(0, d), pt(w, d), pt(w, e.h), pt(0, e.h), pt(0, d)];
}

// Dimension geometry (aligned or linear with given angle)
function dimGeom(e) {
  const ang = e.ang;
  const d = { x: Math.cos(ang), y: Math.sin(ang) };
  const n = V.perp(d);
  const q1 = V.add(e.p1, V.mul(n, V.dot(V.sub(e.p3, e.p1), n)));
  const q2 = V.add(e.p2, V.mul(n, V.dot(V.sub(e.p3, e.p2), n)));
  const value = Math.abs(V.dot(V.sub(e.p2, e.p1), d));
  const h = e.h || 2.5;
  const ext = h * 0.5, gap = h * 0.25;
  const lines = [];
  const ext1 = V.sub(q1, e.p1), ext2 = V.sub(q2, e.p2);
  const e1 = V.len(ext1) > EPS ? V.norm(ext1) : n;
  const e2 = V.len(ext2) > EPS ? V.norm(ext2) : n;
  if (V.len(ext1) > gap) lines.push([V.add(e.p1, V.mul(e1, gap)), V.add(q1, V.mul(e1, ext))]);
  if (V.len(ext2) > gap) lines.push([V.add(e.p2, V.mul(e2, gap)), V.add(q2, V.mul(e2, ext))]);
  lines.push([q1, q2]);
  const dir = V.norm(V.sub(q2, q1));
  const arrows = value > EPS ? [{ p: q1, dir: V.mul(dir, -1) }, { p: q2, dir }] : [];
  let trot = Math.atan2(dir.y, dir.x);
  if (value < EPS) trot = ang;
  // keep text readable
  let tr = normAng(trot);
  if (tr > Math.PI / 2 + 1e-6 && tr <= Math.PI * 1.5 + 1e-6) tr -= Math.PI;
  const s = e.txt ? e.txt.replace('<>', fmt(value, e.prec ?? 2)) : fmt(value, e.prec ?? 2);
  const w = textWidth(s, h);
  const ux = { x: Math.cos(tr), y: Math.sin(tr) }, uy = V.perp(ux);
  const m = V.mid(q1, q2);
  const tp = V.add(V.add(m, V.mul(ux, -w / 2)), V.mul(uy, h * 0.4));
  return { lines, arrows, text: { p: tp, h, rot: tr, s }, value, arrowSize: h, q1, q2 };
}

function arrowPts(a, size) {
  const back = V.sub(a.p, V.mul(a.dir, size));
  const n = V.mul(V.perp(a.dir), size / 6);
  return [a.p, V.add(back, n), V.sub(back, n)];
}

const numSet = (obj, key) => (e, v) => { const n = parseFloat(v); if (isFinite(n)) obj(e)[key] = n; };

const Types = {
  line: {
    label: 'Line',
    approx: (e) => [[e.p1, e.p2]],
    snaps: (e) => [{ p: e.p1, t: 'end' }, { p: e.p2, t: 'end' }, { p: V.mid(e.p1, e.p2), t: 'mid' }],
    grips: (e) => [
      { p: e.p1, set: (x, p) => { x.p1 = p; } },
      { p: e.p2, set: (x, p) => { x.p2 = p; } },
      { p: V.mid(e.p1, e.p2), set: (x, p) => { const d = V.sub(p, V.mid(x.p1, x.p2)); x.p1 = V.add(x.p1, d); x.p2 = V.add(x.p2, d); } },
    ],
    transform: (e, m) => { e.p1 = M.apply(m, e.p1); e.p2 = M.apply(m, e.p2); },
    draw: (R, e) => R.line(e.p1, e.p2),
    props: (e) => [
      { k: 'Start X', v: e.p1.x, set: numSet(x => x.p1, 'x') }, { k: 'Start Y', v: e.p1.y, set: numSet(x => x.p1, 'y') },
      { k: 'End X', v: e.p2.x, set: numSet(x => x.p2, 'x') }, { k: 'End Y', v: e.p2.y, set: numSet(x => x.p2, 'y') },
      { k: 'Length', v: V.dist(e.p1, e.p2) }, { k: 'Angle', v: deg(normAng(V.ang(e.p1, e.p2))) },
    ],
    explode: () => null,
  },

  circle: {
    label: 'Circle',
    approx: (e) => [arcPts(e.c, e.r, 0)],
    snaps: (e) => [{ p: e.c, t: 'cen' }, ...[0, 1, 2, 3].map(i => ({ p: V.polar(e.c, i * Math.PI / 2, e.r), t: 'quad' }))],
    grips: (e) => [
      { p: e.c, set: (x, p) => { x.c = p; } },
      ...[0, 1, 2, 3].map(i => ({ p: V.polar(e.c, i * Math.PI / 2, e.r), set: (x, p) => { x.r = Math.max(1e-6, V.dist(x.c, p)); } })),
    ],
    transform: (e, m) => { e.c = M.apply(m, e.c); e.r *= Math.sqrt(Math.abs(M.det(m))); },
    draw: (R, e) => R.circle(e.c, e.r),
    props: (e) => [
      { k: 'Center X', v: e.c.x, set: numSet(x => x.c, 'x') }, { k: 'Center Y', v: e.c.y, set: numSet(x => x.c, 'y') },
      { k: 'Radius', v: e.r, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.r = n; } },
      { k: 'Diameter', v: e.r * 2, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.r = n / 2; } },
      { k: 'Circumference', v: TAU * e.r }, { k: 'Area', v: Math.PI * e.r * e.r },
    ],
    nearest: (e, p) => V.polar(e.c, V.ang(e.c, p), e.r),
    explode: () => null,
  },

  arc: {
    label: 'Arc',
    approx: (e) => [arcPts(e.c, e.r, e.a1, e.a2)],
    snaps: (e) => {
      const out = [{ p: V.polar(e.c, e.a1, e.r), t: 'end' }, { p: V.polar(e.c, e.a2, e.r), t: 'end' },
        { p: V.polar(e.c, e.a1 + normAng(e.a2 - e.a1) / 2, e.r), t: 'mid' }, { p: e.c, t: 'cen' }];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; if (angInArc(a, e.a1, e.a2)) out.push({ p: V.polar(e.c, a, e.r), t: 'quad' }); }
      return out;
    },
    grips: (e) => [
      { p: e.c, set: (x, p) => { x.c = p; } },
      { p: V.polar(e.c, e.a1, e.r), set: (x, p) => { x.a1 = V.ang(x.c, p); } },
      { p: V.polar(e.c, e.a2, e.r), set: (x, p) => { x.a2 = V.ang(x.c, p); } },
      { p: V.polar(e.c, e.a1 + normAng(e.a2 - e.a1) / 2, e.r), set: (x, p) => { x.r = Math.max(1e-6, V.dist(x.c, p)); } },
    ],
    transform: (e, m) => {
      const s = M.apply(m, V.polar(e.c, e.a1, e.r)), t = M.apply(m, V.polar(e.c, e.a2, e.r));
      e.c = M.apply(m, e.c); e.r *= Math.sqrt(Math.abs(M.det(m)));
      let a1 = V.ang(e.c, s), a2 = V.ang(e.c, t);
      if (M.det(m) < 0) [a1, a2] = [a2, a1];
      e.a1 = a1; e.a2 = a2;
    },
    draw: (R, e) => R.arc(e.c, e.r, e.a1, e.a2),
    props: (e) => [
      { k: 'Center X', v: e.c.x, set: numSet(x => x.c, 'x') }, { k: 'Center Y', v: e.c.y, set: numSet(x => x.c, 'y') },
      { k: 'Radius', v: e.r, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.r = n; } },
      { k: 'Start angle', v: deg(normAng(e.a1)), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.a1 = rad(n); } },
      { k: 'End angle', v: deg(normAng(e.a2)), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.a2 = rad(n); } },
      { k: 'Arc length', v: e.r * normAng(e.a2 - e.a1) },
    ],
    nearest: (e, p) => {
      const a = V.ang(e.c, p);
      if (angInArc(a, e.a1, e.a2)) return V.polar(e.c, a, e.r);
      const s = V.polar(e.c, e.a1, e.r), t = V.polar(e.c, e.a2, e.r);
      return V.dist(s, p) < V.dist(t, p) ? s : t;
    },
    explode: () => null,
  },

  pline: {
    label: 'Polyline',
    approx: (e) => [e.closed ? [...e.pts, e.pts[0]] : e.pts],
    snaps: (e) => {
      const out = e.pts.map(p => ({ p, t: 'end' }));
      const n = e.pts.length, m = e.closed ? n : n - 1;
      for (let i = 0; i < m; i++) out.push({ p: V.mid(e.pts[i], e.pts[(i + 1) % n]), t: 'mid' });
      return out;
    },
    grips: (e) => e.pts.map((p, i) => ({ p, set: (x, np) => { x.pts[i] = np; } })),
    transform: (e, m) => { e.pts = e.pts.map(p => M.apply(m, p)); },
    draw: (R, e) => R.poly(e.pts, e.closed),
    props: (e) => {
      let L = 0; const n = e.pts.length;
      for (let i = 0; i < (e.closed ? n : n - 1); i++) L += V.dist(e.pts[i], e.pts[(i + 1) % n]);
      const out = [{ k: 'Vertices', v: n }, { k: 'Closed', v: e.closed ? 'Yes' : 'No', set: (x, v) => { x.closed = /^(y|yes|1|true)$/i.test(v.trim()); } }, { k: 'Length', v: L }];
      if (e.closed) { let A = 0; for (let i = 0; i < n; i++) A += V.cross(e.pts[i], e.pts[(i + 1) % n]); out.push({ k: 'Area', v: Math.abs(A / 2) }); }
      return out;
    },
    explode: (e) => {
      const out = [], n = e.pts.length;
      for (let i = 0; i < (e.closed ? n : n - 1); i++) out.push({ type: 'line', p1: V.clone(e.pts[i]), p2: V.clone(e.pts[(i + 1) % n]) });
      return out;
    },
  },

  text: {
    label: 'Text',
    approx: (e) => [textBox(e)],
    snaps: (e) => [{ p: e.p, t: 'ins' }],
    grips: (e) => [{ p: e.p, set: (x, p) => { x.p = p; } }],
    transform: (e, m) => {
      const dv = M.vec(m, { x: Math.cos(e.rot || 0), y: Math.sin(e.rot || 0) });
      e.p = M.apply(m, e.p); e.rot = Math.atan2(dv.y, dv.x); e.h *= Math.sqrt(Math.abs(M.det(m)));
    },
    draw: (R, e) => R.text(e.p, e.h, e.rot || 0, e.s),
    props: (e) => [
      { k: 'Contents', v: e.s, str: true, set: (x, v) => { x.s = v; } },
      { k: 'Height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
      { k: 'Rotation', v: deg(normAng(e.rot || 0)), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.rot = rad(n); } },
      { k: 'Position X', v: e.p.x, set: numSet(x => x.p, 'x') }, { k: 'Position Y', v: e.p.y, set: numSet(x => x.p, 'y') },
    ],
    explode: () => null,
  },

  dim: {
    label: 'Dimension',
    approx: (e) => { const g = dimGeom(e); return [...g.lines, textBox(g.text)]; },
    snaps: (e) => { const g = dimGeom(e); return [{ p: e.p1, t: 'node' }, { p: e.p2, t: 'node' }, { p: g.q1, t: 'end' }, { p: g.q2, t: 'end' }]; },
    grips: (e) => [
      { p: e.p1, set: (x, p) => { x.p1 = p; } },
      { p: e.p2, set: (x, p) => { x.p2 = p; } },
      { p: V.mid(dimGeom(e).q1, dimGeom(e).q2), set: (x, p) => { x.p3 = p; } },
    ],
    transform: (e, m) => {
      const dv = M.vec(m, { x: Math.cos(e.ang), y: Math.sin(e.ang) });
      e.p1 = M.apply(m, e.p1); e.p2 = M.apply(m, e.p2); e.p3 = M.apply(m, e.p3);
      e.ang = Math.atan2(dv.y, dv.x); e.h *= Math.sqrt(Math.abs(M.det(m)));
    },
    draw: (R, e) => {
      const g = dimGeom(e);
      for (const l of g.lines) R.line(l[0], l[1]);
      for (const a of g.arrows) R.fill(arrowPts(a, g.arrowSize));
      R.text(g.text.p, g.text.h, g.text.rot, g.text.s);
    },
    props: (e) => [
      { k: 'Measurement', v: dimGeom(e).value },
      { k: 'Text override', v: e.txt || '', str: true, set: (x, v) => { x.txt = v || undefined; } },
      { k: 'Text height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
      { k: 'Precision', v: e.prec ?? 2, set: (x, v) => { const n = parseInt(v, 10); if (n >= 0 && n <= 8) x.prec = n; } },
    ],
    explode: (e) => {
      const g = dimGeom(e);
      const out = g.lines.map(l => ({ type: 'line', p1: l[0], p2: l[1] }));
      for (const a of g.arrows) out.push({ type: 'pline', pts: arrowPts(a, g.arrowSize), closed: true });
      out.push({ type: 'text', p: g.text.p, h: g.text.h, rot: g.text.rot, s: g.text.s });
      return out;
    },
  },
};

const _approxCache = new WeakMap();
function entApprox(e) {
  let a = _approxCache.get(e);
  if (!a) { a = Types[e.type].approx(e); _approxCache.set(e, a); }
  return a;
}
function invalidate(e) { _approxCache.delete(e); _bboxCache.delete(e); if (typeof _insCache !== 'undefined') _insCache.delete(e); }
const _bboxCache = new WeakMap();
function entBBox(e) {
  const c = _bboxCache.get(e); if (c) return c;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const pl of entApprox(e)) for (const p of pl) {
    if (p.x < x1) x1 = p.x; if (p.y < y1) y1 = p.y; if (p.x > x2) x2 = p.x; if (p.y > y2) y2 = p.y;
  }
  const b = { x1, y1, x2, y2 }; _bboxCache.set(e, b); return b;
}
function entDist(e, p) {
  let best = Infinity;
  for (const pl of entApprox(e)) {
    if (pl.length === 1) best = Math.min(best, V.dist(p, pl[0]));
    for (let i = 0; i < pl.length - 1; i++) best = Math.min(best, ptSegDist(p, pl[i], pl[i + 1]));
  }
  if (e.type === 'text') { // inside text box counts
    const b = entBBox(e); if (ptInRect(p, b)) best = 0;
  }
  if (e.type === 'hatch' && ptInLoops(p, e.loops)) best = Math.min(best, px(5)); // inside a hatch: pickable, lines on top win
  return best;
}
function entNearest(e, p) {
  const T = Types[e.type];
  if (T.nearest) return T.nearest(e, p);
  let best = null, bd = Infinity;
  for (const pl of entApprox(e)) for (let i = 0; i < pl.length - 1; i++) {
    const c = closestOnSeg(p, pl[i], pl[i + 1]).p; const d = V.dist(c, p);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function entInWindow(e, r) {
  for (const pl of entApprox(e)) for (const p of pl) if (!ptInRect(p, r)) return false;
  return true;
}
function entCrossing(e, r) {
  for (const pl of entApprox(e)) {
    if (pl.length === 1 && ptInRect(pl[0], r)) return true;
    for (let i = 0; i < pl.length - 1; i++) if (segRect(pl[i], pl[i + 1], r)) return true;
  }
  const b = entBBox(e);
  return e.type === 'text' && ptInRect({ x: r.x1, y: r.y1 }, b);
}
function entClone(e) { return JSON.parse(JSON.stringify(e)); }
function entTransform(e, m) { Types[e.type].transform(e, m); invalidate(e); return e; }

// Intersections between two entities (approximate for curves)
function entIntersections(a, b) {
  const out = [];
  const A = entApprox(a), B = entApprox(b);
  for (const pa of A) for (let i = 0; i < pa.length - 1; i++)
    for (const pb of B) for (let j = 0; j < pb.length - 1; j++) {
      const r = segSeg(pa[i], pa[i + 1], pb[j], pb[j + 1]);
      if (r) out.push(r.p);
    }
  return out;
}
