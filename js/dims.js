// Dimension kinds (linear/aligned, radius, diameter, angular) and leaders
'use strict';

function readableRot(a) { let r = normAng(a); if (r > Math.PI / 2 + 1e-6 && r <= Math.PI * 1.5 + 1e-6) r -= Math.PI; return r; }
function dimText(e, value, prefix = '', suffix = '') {
  const prec = e.prec ?? (e.kind === 'ang' ? 0 : 2);
  const v = prefix + fmt(value, prec) + suffix;
  return e.txt ? e.txt.replace('<>', v) : v;
}
function textAlong(mid, rot, s, h, above = true) {
  const w = textWidth(s, h);
  const ux = { x: Math.cos(rot), y: Math.sin(rot) }, uy = V.perp(ux);
  return { p: V.add(V.add(mid, V.mul(ux, -w / 2)), V.mul(uy, above ? h * 0.4 : -h * 0.5)), h, rot, s };
}

// unified geometry: { lines, arcs, arrows, text, value, arrowSize }
function dimGeom(e) {
  const h = e.h || 2.5;
  if (!e.kind || e.kind === 'lin') { const g = linDimGeom(e); g.arcs = []; return g; }
  if (e.kind === 'rad' || e.kind === 'dia') {
    const a = V.ang(e.c, e.p3);
    const P = V.polar(e.c, a, e.r), Q = V.polar(e.c, a + Math.PI, e.r);
    const out = V.dist(e.c, e.p3) > e.r;
    const tip = out ? e.p3 : P;
    const lines = [], arrows = [];
    if (e.kind === 'rad') { lines.push([out ? P : e.c, tip]); if (!out) lines[0] = [e.c, P]; arrows.push({ p: P, dir: out ? V.norm(V.sub(e.c, P)) : V.norm(V.sub(P, e.c)) }); }
    else { lines.push([Q, out ? tip : P]); arrows.push({ p: P, dir: V.norm(V.sub(P, e.c)) }, { p: Q, dir: V.norm(V.sub(Q, e.c)) }); }
    // center mark
    const cm = h * 0.5;
    lines.push([V.add(e.c, { x: -cm, y: 0 }), V.add(e.c, { x: cm, y: 0 })], [V.add(e.c, { x: 0, y: -cm }), V.add(e.c, { x: 0, y: cm })]);
    if (out && e.kind === 'rad') lines.push([e.c, P]);
    const value = e.kind === 'rad' ? e.r : e.r * 2;
    const s = dimText(e, value, e.kind === 'rad' ? 'R' : 'Ø');
    const rot = readableRot(a);
    const tmid = out ? V.polar(e.p3, a, textWidth(s, h) / 2 + h * 0.3) : V.mid(e.c, P);
    return { lines, arcs: [], arrows, text: textAlong(tmid, rot, s, h), value, arrowSize: h };
  }
  if (e.kind === 'ang') {
    const a1 = V.ang(e.c, e.p1), a2 = V.ang(e.c, e.p2), aL = V.ang(e.c, e.p3);
    let s1 = a1, s2 = a2;
    if (!angInArc(aL, a1, a2)) { s1 = a2; s2 = a1; }
    const span = normAng(s2 - s1);
    const rr = V.dist(e.c, e.p3);
    const lines = [];
    const ext = h * 0.5, gap = h * 0.25;
    for (const [pt, an] of [[s1 === a1 ? e.p1 : e.p2, s1], [s2 === a2 ? e.p2 : e.p1, s2]]) {
      const d = V.dist(e.c, pt);
      if (rr > d + gap) lines.push([V.polar(e.c, an, d + gap), V.polar(e.c, an, rr + ext)]);
      else if (rr < d - gap) lines.push([V.polar(e.c, an, d - gap), V.polar(e.c, an, Math.max(0, rr - ext))]);
    }
    const arrows = [
      { p: V.polar(e.c, s1, rr), dir: { x: Math.sin(s1), y: -Math.cos(s1) } },
      { p: V.polar(e.c, s2, rr), dir: { x: -Math.sin(s2), y: Math.cos(s2) } },
    ];
    const mid = s1 + span / 2;
    const s = dimText(e, deg(span), '', '°');
    const text = textAlong(V.polar(e.c, mid, rr), readableRot(mid - Math.PI / 2), s, h);
    return { lines, arcs: [{ c: e.c, r: rr, a1: s1, a2: s2 }], arrows, text, value: deg(span), arrowSize: h };
  }
  return { lines: [], arcs: [], arrows: [], text: { p: e.p3 || { x: 0, y: 0 }, h, rot: 0, s: '?' }, value: 0, arrowSize: h };
}

Types.dim = {
  label: 'Dimension',
  approx: (e) => { const g = dimGeom(e); return [...g.lines, ...g.arcs.map(a => arcPts(a.c, a.r, a.a1, a.a2)), textBox(g.text)]; },
  snaps: (e) => {
    if (!e.kind || e.kind === 'lin') { const g = dimGeom(e); return [{ p: e.p1, t: 'node' }, { p: e.p2, t: 'node' }, { p: g.q1, t: 'end' }, { p: g.q2, t: 'end' }]; }
    return [{ p: e.c, t: 'node' }, { p: e.p3, t: 'node' }];
  },
  grips: (e) => {
    if (!e.kind || e.kind === 'lin') {
      const g = dimGeom(e);
      return [{ p: e.p1, set: (x, p) => { x.p1 = p; } }, { p: e.p2, set: (x, p) => { x.p2 = p; } }, { p: V.mid(g.q1, g.q2), set: (x, p) => { x.p3 = p; } }];
    }
    const out = [{ p: e.p3, set: (x, p) => { x.p3 = p; } }];
    if (e.kind === 'ang') out.push({ p: e.p1, set: (x, p) => { x.p1 = p; } }, { p: e.p2, set: (x, p) => { x.p2 = p; } }, { p: e.c, set: (x, p) => { x.c = p; } });
    return out;
  },
  transform: (e, m) => {
    for (const k of ['p1', 'p2', 'p3', 'c']) if (e[k]) e[k] = M.apply(m, e[k]);
    const k = Math.sqrt(Math.abs(M.det(m)));
    if (e.r) e.r *= k;
    if (e.ang !== undefined) { const dv = M.vec(m, { x: Math.cos(e.ang), y: Math.sin(e.ang) }); e.ang = Math.atan2(dv.y, dv.x); }
    e.h *= k;
  },
  draw: (R, e) => {
    const g = dimGeom(e);
    for (const l of g.lines) R.line(l[0], l[1]);
    for (const a of g.arcs) R.arc(a.c, a.r, a.a1, a.a2);
    for (const a of g.arrows) R.fill(arrowPts(a, g.arrowSize));
    R.text(g.text.p, g.text.h, g.text.rot, g.text.s);
  },
  props: (e) => [
    { k: 'Type', v: { rad: 'Radius', dia: 'Diameter', ang: 'Angular' }[e.kind] || (e.ang !== undefined ? 'Linear / Aligned' : 'Linear') },
    { k: 'Measurement', v: dimGeom(e).value },
    { k: 'Text override', v: e.txt || '', str: true, set: (x, v) => { x.txt = v || undefined; } },
    { k: 'Text height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
    { k: 'Precision', v: e.prec ?? (e.kind === 'ang' ? 0 : 2), set: (x, v) => { const n = parseInt(v, 10); if (n >= 0 && n <= 8) x.prec = n; } },
  ],
  explode: (e) => {
    const g = dimGeom(e);
    const out = g.lines.map(l => ({ type: 'line', p1: l[0], p2: l[1] }));
    for (const a of g.arcs) out.push({ type: 'arc', c: a.c, r: a.r, a1: a.a1, a2: a.a2 });
    for (const a of g.arrows) out.push({ type: 'hatch', loops: [arrowPts(a, g.arrowSize)], pat: 'SOLID', scale: 1, ang: 0 });
    out.push({ type: 'text', p: g.text.p, h: g.text.h, rot: g.text.rot, s: g.text.s });
    return out;
  },
};

// ---------- leader ----------
function leaderGeom(e) {
  const pts = e.pts, n = pts.length, h = e.h || 2.5;
  const last = pts[n - 1], prev = pts[n - 2] || pts[0];
  const dirx = last.x >= prev.x ? 1 : -1;
  const land = { x: last.x + dirx * h, y: last.y };
  const lines = [];
  for (let i = 0; i < n - 1; i++) lines.push([pts[i], pts[i + 1]]);
  if (e.s) lines.push([last, land]);
  const w = textWidth(e.s || '', h);
  const tp = { x: dirx > 0 ? land.x + h * 0.4 : land.x - h * 0.4 - w, y: land.y - h * 0.4 };
  const arrows = n > 1 ? [{ p: pts[0], dir: V.norm(V.sub(pts[0], pts[1])) }] : [];
  return { lines, arrows, text: { p: tp, h, rot: 0, s: e.s || '' }, arrowSize: h };
}
Types.leader = {
  label: 'Leader',
  approx: (e) => { const g = leaderGeom(e); return [...g.lines, ...(e.s ? [textBox(g.text)] : [])]; },
  snaps: (e) => e.pts.map(p => ({ p, t: 'end' })),
  grips: (e) => e.pts.map((p, i) => ({ p, set: (x, q) => { x.pts[i] = q; } })),
  transform: (e, m) => { e.pts = e.pts.map(p => M.apply(m, p)); e.h *= Math.sqrt(Math.abs(M.det(m))); },
  draw: (R, e) => {
    const g = leaderGeom(e);
    for (const l of g.lines) R.line(l[0], l[1]);
    for (const a of g.arrows) R.fill(arrowPts(a, g.arrowSize));
    if (e.s) R.text(g.text.p, g.text.h, 0, e.s);
  },
  props: (e) => [
    { k: 'Contents', v: e.s || '', str: true, set: (x, v) => { x.s = v; } },
    { k: 'Text height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
    { k: 'Vertices', v: e.pts.length },
  ],
  explode: (e) => {
    const g = leaderGeom(e);
    const out = g.lines.map(l => ({ type: 'line', p1: l[0], p2: l[1] }));
    for (const a of g.arrows) out.push({ type: 'hatch', loops: [arrowPts(a, g.arrowSize)], pat: 'SOLID', scale: 1, ang: 0 });
    if (e.s) out.push({ type: 'text', p: g.text.p, h: g.text.h, rot: 0, s: e.s });
    return out;
  },
};
