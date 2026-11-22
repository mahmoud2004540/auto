// 3D solids: polygon meshes, CSG booleans (BSP), primitives, extrude / revolve, and the 3DSOLID entity
'use strict';

// ---------- small 3D vector helpers (arrays [x,y,z]) ----------
const V3d = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
function newellNormal(v) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); }
  return V3d.norm([x, y, z]);
}

// ---------- CSG via BSP trees ----------
const CSG = (() => {
  const EPS = 1e-6;
  class Plane {
    constructor(n, w) { this.n = n; this.w = w; }
    static from(v) { const n = newellNormal(v); let cx = 0, cy = 0, cz = 0; for (const p of v) { cx += p[0]; cy += p[1]; cz += p[2]; } return new Plane(n, V3d.dot(n, [cx / v.length, cy / v.length, cz / v.length])); }
    clone() { return new Plane(this.n.slice(), this.w); }
    flip() { this.n = V3d.mul(this.n, -1); this.w = -this.w; }
    split(poly, cf, cb, f, b) {
      let pt = 0; const ts = [];
      for (const v of poly.v) { const t = V3d.dot(this.n, v) - this.w; const ty = t < -EPS ? 2 : t > EPS ? 1 : 0; pt |= ty; ts.push(ty); }
      if (pt === 0) { (V3d.dot(this.n, poly.plane.n) > 0 ? cf : cb).push(poly); return; }
      if (pt === 1) { f.push(poly); return; }
      if (pt === 2) { b.push(poly); return; }
      const fv = [], bv = [];
      for (let i = 0; i < poly.v.length; i++) {
        const j = (i + 1) % poly.v.length, ti = ts[i], tj = ts[j], vi = poly.v[i], vj = poly.v[j];
        if (ti !== 2) fv.push(vi);
        if (ti !== 1) bv.push(ti !== 2 ? vi.slice() : vi);
        if ((ti | tj) === 3) { const t = (this.w - V3d.dot(this.n, vi)) / V3d.dot(this.n, V3d.sub(vj, vi)); const v = V3d.lerp(vi, vj, t); fv.push(v); bv.push(v.slice()); }
      }
      if (fv.length >= 3) f.push(new Poly(fv, poly.plane)); if (bv.length >= 3) b.push(new Poly(bv, poly.plane));
    }
  }
  class Poly {
    constructor(v, plane) { this.v = v; this.plane = plane ? plane.clone() : Plane.from(v); }
    clone() { return new Poly(this.v.map(p => p.slice()), this.plane); }
    flip() { this.v.reverse(); this.plane.flip(); }
  }
  class Node {
    constructor(polys) { this.plane = null; this.front = null; this.back = null; this.polys = []; if (polys) this.build(polys); }
    invert() {
      const st = [this];
      while (st.length) { const n = st.pop(); n.polys.forEach(p => p.flip()); if (n.plane) n.plane.flip(); const t = n.front; n.front = n.back; n.back = t; if (n.front) st.push(n.front); if (n.back) st.push(n.back); }
    }
    clipPolygons(polys) {
      if (!this.plane) return polys.slice();
      let f = [], b = [];
      for (const p of polys) this.plane.split(p, f, b, f, b);
      if (this.front) f = this.front.clipPolygons(f);
      b = this.back ? this.back.clipPolygons(b) : [];
      return f.concat(b);
    }
    clipTo(bsp) { const st = [this]; while (st.length) { const n = st.pop(); n.polys = bsp.clipPolygons(n.polys); if (n.front) st.push(n.front); if (n.back) st.push(n.back); } }
    allPolygons() { const out = [], st = [this]; while (st.length) { const n = st.pop(); out.push(...n.polys); if (n.front) st.push(n.front); if (n.back) st.push(n.back); } return out; }
    build(polys) {
      const st = [[this, polys]];
      while (st.length) {
        const [n, ps] = st.pop();
        if (!ps.length) continue;
        if (!n.plane) n.plane = ps[0].plane.clone();
        const f = [], b = [];
        for (const p of ps) n.plane.split(p, n.polys, n.polys, f, b);
        if (f.length) { if (!n.front) n.front = new Node(); st.push([n.front, f]); }
        if (b.length) { if (!n.back) n.back = new Node(); st.push([n.back, b]); }
      }
    }
  }
  const toPolys = (mesh) => mesh.filter(v => v.length >= 3).map(v => new Poly(v.map(p => p.slice())));
  const out = (ps) => ps.map(p => p.v);
  return {
    union(a, b) { const A = new Node(toPolys(a)), Bn = new Node(toPolys(b)); A.clipTo(Bn); Bn.clipTo(A); Bn.invert(); Bn.clipTo(A); Bn.invert(); A.build(Bn.allPolygons()); return out(A.allPolygons()); },
    subtract(a, b) { const A = new Node(toPolys(a)), Bn = new Node(toPolys(b)); A.invert(); A.clipTo(Bn); Bn.clipTo(A); Bn.invert(); Bn.clipTo(A); Bn.invert(); A.build(Bn.allPolygons()); A.invert(); return out(A.allPolygons()); },
    intersect(a, b) { const A = new Node(toPolys(a)), Bn = new Node(toPolys(b)); A.invert(); Bn.clipTo(A); Bn.invert(); A.clipTo(Bn); Bn.clipTo(A); A.build(Bn.allPolygons()); A.invert(); return out(A.allPolygons()); },
  };
})();

// ---------- mesh helpers ----------
// meshes are arrays of polygons; each polygon is an array of [x,y,z] in counter-clockwise order seen from outside
function polyArea2(l) { let a = 0; for (let i = 0; i < l.length; i++) a += V.cross(l[i], l[(i + 1) % l.length]); return a / 2; }
function isConvex(l) {
  let sign = 0;
  for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length], c = l[(i + 2) % l.length]; const cr = V.cross(V.sub(b, a), V.sub(c, b)); if (Math.abs(cr) < 1e-12) continue; if (!sign) sign = Math.sign(cr); else if (Math.sign(cr) !== sign) return false; }
  return true;
}
// ear clipping for simple polygons (CCW), returns triangles of 2D points
function earcut2(pts) {
  const idx = pts.map((_, i) => i), tris = [];
  const inside = (p, a, b, c) => V.cross(V.sub(b, a), V.sub(p, a)) >= -1e-12 && V.cross(V.sub(c, b), V.sub(p, b)) >= -1e-12 && V.cross(V.sub(a, c), V.sub(p, c)) >= -1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = pts[ia], b = pts[ib], c = pts[ic];
      if (V.cross(V.sub(b, a), V.sub(c, b)) <= 1e-12) continue;
      if (idx.some(j => j !== ia && j !== ib && j !== ic && inside(pts[j], a, b, c))) continue;
      tris.push([a, b, c]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push(idx.map(i => pts[i]));
  return tris;
}
function capFaces(loop, z, up) {
  const pieces = isConvex(loop) ? [loop] : earcut2(loop);
  return pieces.map(t => { const f = t.map(p => [p.x, p.y, z]); return up ? f : f.reverse(); });
}
function cleanLoop(pts) {
  const out = [];
  for (const p of pts) if (!out.length || V.dist(out[out.length - 1], p) > 1e-9) out.push(p);
  if (out.length > 2 && V.dist(out[0], out[out.length - 1]) < 1e-9) out.pop();
  return out;
}
function meshPrism(loop, z0, h) {
  let l = cleanLoop(loop);
  if (l.length < 3) return [];
  if (polyArea2(l) < 0) l = l.slice().reverse();
  if (h < 0) { z0 += h; h = -h; }
  const z1 = z0 + h, m = [...capFaces(l, z0, false), ...capFaces(l, z1, true)];
  for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; m.push([[a.x, a.y, z0], [b.x, b.y, z0], [b.x, b.y, z1], [a.x, a.y, z1]]); }
  return m;
}
function meshFrustum(c, r1, r2, z0, h, n = 48) {
  if (h < 0) { z0 += h; h = -h; [r1, r2] = [r2, r1]; }
  const z1 = z0 + h, m = [], ring = (r, z) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos(i * TAU / n), c.y + r * Math.sin(i * TAU / n), z]);
  const A = ring(r1, z0), Bt = ring(r2, z1);
  if (r1 > 1e-12) m.push(A.slice().reverse());
  if (r2 > 1e-12) m.push(Bt);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (r2 <= 1e-12) m.push([A[i], A[j], [c.x, c.y, z1]]);
    else if (r1 <= 1e-12) m.push([[c.x, c.y, z0], Bt[j], Bt[i]]);
    else m.push([A[i], A[j], Bt[j], Bt[i]]);
  }
  return m;
}
function meshSphere(c, z, r, slices = 36, stacks = 18) {
  const m = [], P = (i, j) => { const th = i * TAU / slices, ph = Math.PI * j / stacks - Math.PI / 2; return [c.x + r * Math.cos(ph) * Math.cos(th), c.y + r * Math.cos(ph) * Math.sin(th), z + r * Math.sin(ph)]; };
  for (let j = 0; j < stacks; j++) for (let i = 0; i < slices; i++) {
    const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1);
    if (j === 0) m.push([a, cc, d]); else if (j === stacks - 1) m.push([a, b, d]); else m.push([a, b, cc, d]);
  }
  return m;
}
function meshTorus(c, z, R, r, nu = 40, nv = 20) {
  const m = [], P = (i, j) => { const u = i * TAU / nu, v = j * TAU / nv; return [c.x + (R + r * Math.cos(v)) * Math.cos(u), c.y + (R + r * Math.cos(v)) * Math.sin(u), z + r * Math.sin(v)]; };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1); m.push([a, b, cc], [a, cc, d]); }
  return m;
}
function meshPyramid(c, r, sides, a0, z0, h, rTop = 0) {
  const base = Array.from({ length: sides }, (_, i) => V.polar(c, a0 + i * TAU / sides, r));
  if (h < 0) { z0 += h; h = -h; }
  const m = [base.map(p => [p.x, p.y, z0]).reverse()];
  if (rTop > 1e-12) {
    const top = Array.from({ length: sides }, (_, i) => V.polar(c, a0 + i * TAU / sides, rTop));
    m.push(top.map(p => [p.x, p.y, z0 + h]));
    for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; m.push([[base[i].x, base[i].y, z0], [base[j].x, base[j].y, z0], [top[j].x, top[j].y, z0 + h], [top[i].x, top[i].y, z0 + h]]); }
  } else for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; m.push([[base[i].x, base[i].y, z0], [base[j].x, base[j].y, z0], [c.x, c.y, z0 + h]]); }
  return m;
}
function meshWedge(a, b, z0, h) {
  const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
  if (h < 0) { z0 += h; h = -h; }
  const z1 = z0 + h;
  // slope rises from x2 (low) to x1 (high), like AutoCAD's WEDGE
  return [
    [[x1, y1, z0], [x1, y2, z0], [x2, y2, z0], [x2, y1, z0]],
    [[x1, y1, z0], [x2, y1, z0], [x1, y1, z1]],
    [[x1, y2, z0], [x1, y2, z1], [x2, y2, z0]],
    [[x1, y1, z0], [x1, y1, z1], [x1, y2, z1], [x1, y2, z0]],
    [[x2, y1, z0], [x2, y2, z0], [x1, y2, z1], [x1, y1, z1]],
  ];
}
function meshRevolve(loop, axA, axB, ang, steps) {
  let l = cleanLoop(loop);
  const u = V.norm(V.sub(axB, axA)), nrm = V.perp(u);
  const rs = l.map(p => V.dot(V.sub(p, axA), nrm));
  if (rs.some(r => r > 1e-9) && rs.some(r => r < -1e-9)) throw new Error('The profile crosses the axis of revolution.');
  const sgn = rs.some(r => r < -1e-9) ? -1 : 1;
  const full = Math.abs(Math.abs(ang) - TAU) < 1e-9;
  const n = steps || Math.max(8, Math.ceil(Math.abs(ang) / TAU * 48));
  const P = (p, th) => { const t = V.dot(V.sub(p, axA), u), r = V.dot(V.sub(p, axA), nrm) * sgn; const base = V.add(axA, V.mul(u, t)); const q = V.add(base, V.mul(nrm, sgn * r * Math.cos(th))); return [q.x, q.y, r * Math.sin(th)]; };
  const m = [];
  for (let k = 0; k < n; k++) {
    const t0 = ang * k / n, t1 = ang * (k + 1) / n;
    for (let i = 0; i < l.length; i++) {
      const a = l[i], b = l[(i + 1) % l.length];
      const quad = [P(a, t0), P(b, t0), P(b, t1), P(a, t1)];
      const uniq = quad.filter((q, j) => quad.findIndex(w => V3d.len(V3d.sub(w, q)) < 1e-9) === j);
      if (uniq.length >= 3) m.push(uniq);
    }
  }
  if (!full) {
    const cap0 = capFaces(polyArea2(l) < 0 ? l.slice().reverse() : l, 0, true).map(f => f.map(p => P({ x: p[0], y: p[1] }, 0)));
    const cap1 = capFaces(polyArea2(l) < 0 ? l.slice().reverse() : l, 0, true).map(f => f.map(p => P({ x: p[0], y: p[1] }, ang)));
    m.push(...cap0, ...cap1.map(f => f.reverse()));
  }
  return meshVolume(m) < 0 ? m.map(f => f.slice().reverse()) : m;
}
function meshVolume(m) {
  let v = 0;
  for (const f of m) for (let i = 1; i < f.length - 1; i++) v += V3d.dot(f[0], V3d.cross(f[i], f[i + 1])) / 6;
  return v;
}
// edges where faces meet at a visible angle (or open edges), for display and plan view
function meshEdges(m, angDeg = 25) {
  const map = new Map(), r = (x) => Math.round(x * 1e5) / 1e5, key = (p) => `${r(p[0])},${r(p[1])},${r(p[2])}`;
  for (const f of m) {
    const n = newellNormal(f);
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length], ka = key(a), kb = key(b);
      if (ka === kb) continue;
      const k = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      let e = map.get(k); if (!e) { e = { a, b, ns: [] }; map.set(k, e); }
      e.ns.push(n);
    }
  }
  const cosT = Math.cos(rad(angDeg)), out = [];
  const singles = [];
  for (const e of map.values()) {
    if (e.ns.length === 1) { singles.push(e); continue; }
    let sharp = false;
    for (let i = 0; i < e.ns.length && !sharp; i++) for (let j = i + 1; j < e.ns.length; j++) if (V3d.dot(e.ns[i], e.ns[j]) < cosT) { sharp = true; break; }
    if (sharp) out.push([e.a, e.b]);
  }
  // T-junction seams: an open edge overlapped by a collinear open edge of a coplanar face is not a real edge
  let ext = 1; for (const e of singles) for (const p of [e.a, e.b]) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
  const tol = ext * 1e-7, hidden = new Set();
  const info = singles.map(e => { const d = V3d.sub(e.b, e.a), L = V3d.len(d); return { e, u: V3d.mul(d, 1 / (L || 1)), L, lo: [Math.min(e.a[0], e.b[0]) - tol, Math.min(e.a[1], e.b[1]) - tol, Math.min(e.a[2], e.b[2]) - tol], hi: [Math.max(e.a[0], e.b[0]) + tol, Math.max(e.a[1], e.b[1]) + tol, Math.max(e.a[2], e.b[2]) + tol] }; });
  const offLine = (s, p) => V3d.len(V3d.cross(V3d.sub(p, s.e.a), s.u));
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
    const s = info[i], t = info[j];
    if (s.hi[0] < t.lo[0] || t.hi[0] < s.lo[0] || s.hi[1] < t.lo[1] || t.hi[1] < s.lo[1] || s.hi[2] < t.lo[2] || t.hi[2] < s.lo[2]) continue;
    if (V3d.dot(s.e.ns[0], t.e.ns[0]) < 0.9999 || Math.abs(V3d.dot(s.u, t.u)) < 0.9999) continue;
    if (offLine(s, t.e.a) > tol * 10 || offLine(s, t.e.b) > tol * 10) continue;
    const ta = V3d.dot(V3d.sub(t.e.a, s.e.a), s.u), tb = V3d.dot(V3d.sub(t.e.b, s.e.a), s.u);
    if (Math.min(Math.max(ta, tb), s.L) - Math.max(Math.min(ta, tb), 0) > tol * 10) { hidden.add(i); hidden.add(j); }
  }
  singles.forEach((e, i) => { if (!hidden.has(i)) out.push([e.a, e.b]); });
  return out;
}
const _meshEdgeCache = new WeakMap();
function solidEdges(e) { let x = _meshEdgeCache.get(e); if (!x) { x = meshEdges(e.polys); _meshEdgeCache.set(e, x); } return x; }
function solidZRange(e) { let z1 = Infinity, z2 = -Infinity; for (const f of e.polys) for (const p of f) { z1 = Math.min(z1, p[2]); z2 = Math.max(z2, p[2]); } return [z1, z2]; }

Types.solid3d = {
  label: '3D Solid',
  approx: (e) => { const ed = solidEdges(e); return ed.length ? ed.map(([a, b]) => [{ x: a[0], y: a[1] }, { x: b[0], y: b[1] }]) : [[{ x: 0, y: 0 }]]; },
  snaps: (e) => { const seen = new Set(), out = []; for (const [a, b] of solidEdges(e)) for (const p of [a, b]) { const k = Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4); if (!seen.has(k)) { seen.add(k); out.push({ p: { x: p[0], y: p[1] }, t: 'end' }); if (out.length > 200) return out; } } return out; },
  grips: (e) => { const b = entBBox(e); const c = { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 }; return [{ p: c, set: (x, p) => { const d = V.sub(p, c); x.polys = x.polys.map(f => f.map(q => [q[0] + d.x, q[1] + d.y, q[2]])); } }]; },
  transform: (e, m) => {
    const k = Math.sqrt(Math.abs(M.det(m))), flip = M.det(m) < 0;
    e.polys = e.polys.map(f => { const g = f.map(p => { const q = M.apply(m, { x: p[0], y: p[1] }); return [q.x, q.y, p[2] * k]; }); return flip ? g.reverse() : g; });
    _meshEdgeCache.delete(e);
  },
  draw: (R, e) => { for (const [a, b] of solidEdges(e)) R.line({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }); },
  props: (e) => {
    const [z1, z2] = solidZRange(e);
    return [
      { k: 'Solid type', v: e.kind || 'Solid' },
      { k: 'Volume', v: Math.abs(meshVolume(e.polys)) },
      { k: 'Elevation (min Z)', v: z1, set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) { const d = n - solidZRange(x)[0]; x.polys = x.polys.map(f => f.map(p => [p[0], p[1], p[2] + d])); _meshEdgeCache.delete(x); } } },
      { k: 'Height', v: z2 - z1 },
      { k: 'Faces', v: e.polys.length },
    ];
  },
  explode: () => null,
};
// extend invalidate() to clear solid caches
{
  const inv0 = invalidate;
  invalidate = function (e) { inv0(e); _meshEdgeCache.delete(e); }; // eslint-disable-line no-global-assign
}
function transformSolid3(e, fn) { e.polys = e.polys.map(f => f.map(fn)); invalidate(e); }
function rot3(p, axis, o, a) {
  const c = Math.cos(a), s = Math.sin(a), x = p[0] - o[0], y = p[1] - o[1], z = p[2] - o[2];
  if (axis === 'X') return [x + o[0], y * c - z * s + o[1], y * s + z * c + o[2]];
  if (axis === 'Y') return [x * c + z * s + o[0], y + o[1], -x * s + z * c + o[2]];
  return [x * c - y * s + o[0], x * s + y * c + o[1], z + o[2]];
}
