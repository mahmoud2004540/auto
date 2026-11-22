// Drawing & editing commands
'use strict';

const isPt = (v) => v && typeof v === 'object' && 'x' in v;
const tmpLine = (a, b) => ({ type: 'line', p1: a, p2: b, layer: App.doc.cur });
const curLayer = () => App.doc.cur;

const Commands = {};
function def(name, alias, desc, fn, extra = {}) { Commands[name] = Object.assign({ alias, desc, fn }, extra); }

// ---------------- DRAW ----------------
def('LINE', ['L'], 'Draw straight line segments', async () => {
  let first = await getPoint('Specify first point');
  if (!isPt(first)) return;
  const start = first; const made = [];
  for (;;) {
    const kws = made.length >= 2 ? ['Close', 'Undo'] : ['Undo'];
    const p = await getPoint('Specify next point', { base: first, keywords: kws, preview: (q) => [tmpLine(first, q)] });
    if (p === null) return;
    if (p === 'Undo') { const e = made.pop(); if (e) { removeEnts([e]); first = e.p1; } continue; }
    if (p === 'Close') { addEnt({ type: 'line', p1: first, p2: start }); return; }
    made.push(addEnt({ type: 'line', p1: first, p2: p })); first = p;
  }
});

def('PLINE', ['PL'], 'Draw a polyline', async () => {
  const p0 = await getPoint('Specify start point');
  if (!isPt(p0)) return;
  const pts = [p0];
  for (;;) {
    const kws = pts.length >= 3 ? ['Close', 'Undo'] : ['Undo'];
    const last = pts[pts.length - 1];
    const p = await getPoint('Specify next point', { base: last, keywords: kws, preview: (q) => [{ type: 'pline', pts: [...pts, q], closed: false, layer: curLayer() }] });
    if (p === null) break;
    if (p === 'Undo') { if (pts.length > 1) pts.pop(); continue; }
    if (p === 'Close') { addEnt({ type: 'pline', pts, closed: true }); return; }
    pts.push(p);
  }
  if (pts.length > 1) addEnt({ type: 'pline', pts, closed: false });
});

def('CIRCLE', ['C'], 'Draw a circle', async () => {
  let c = await getPoint('Specify center point for circle', { keywords: ['3P', '2P'] });
  if (c === '2P') {
    const a = await getPoint('Specify first end point of diameter'); if (!isPt(a)) return;
    const b = await getPoint('Specify second end point of diameter', { base: a, preview: (q) => [{ type: 'circle', c: V.mid(a, q), r: V.dist(a, q) / 2, layer: curLayer() }] });
    if (!isPt(b)) return;
    addEnt({ type: 'circle', c: V.mid(a, b), r: V.dist(a, b) / 2 }); return;
  }
  if (c === '3P') {
    const a = await getPoint('Specify first point on circle'); if (!isPt(a)) return;
    const b = await getPoint('Specify second point on circle', { base: a }); if (!isPt(b)) return;
    const d = await getPoint('Specify third point on circle', { base: b, preview: (q) => { const k = circle3(a, b, q); return k ? [{ type: 'circle', ...k, layer: curLayer() }] : []; } });
    if (!isPt(d)) return;
    const k = circle3(a, b, d); if (!k) { UI.log('Points are collinear.', 'err'); return; }
    addEnt({ type: 'circle', c: k.c, r: k.r }); return;
  }
  if (!isPt(c)) return;
  const def0 = App.lastRadius || 10;
  let r = await getDist(`Specify radius of circle <${fmt(def0)}>`, { base: c, def: def0, keywords: ['Diameter'], preview: (q) => [{ type: 'circle', c, r: V.dist(c, q), layer: curLayer() }] });
  if (r === 'Diameter') {
    const d = await getDist(`Specify diameter of circle <${fmt(def0 * 2)}>`, { base: c, def: def0 * 2, preview: (q) => [{ type: 'circle', c, r: V.dist(c, q) / 2, layer: curLayer() }] });
    if (typeof d !== 'number') return; r = d / 2;
  }
  if (typeof r !== 'number' || r <= 0) return;
  App.lastRadius = r;
  addEnt({ type: 'circle', c, r });
});

function arcFrom3(a, b, c) {
  const k = circle3(a, b, c); if (!k) return null;
  let a1 = V.ang(k.c, a), a2 = V.ang(k.c, c);
  if (V.cross(V.sub(b, a), V.sub(c, b)) < 0) [a1, a2] = [a2, a1];
  return { type: 'arc', c: k.c, r: k.r, a1, a2 };
}
def('ARC', ['A'], 'Draw an arc (3 points or center/start/end)', async () => {
  const p1 = await getPoint('Specify start point of arc', { keywords: ['Center'] });
  if (p1 === 'Center') {
    const c = await getPoint('Specify center point of arc'); if (!isPt(c)) return;
    const s = await getPoint('Specify start point of arc', { base: c }); if (!isPt(s)) return;
    const r = V.dist(c, s), a1 = V.ang(c, s);
    const e = await getPoint('Specify end point of arc (counter-clockwise)', { base: c, preview: (q) => [{ type: 'arc', c, r, a1, a2: V.ang(c, q), layer: curLayer() }] });
    if (!isPt(e)) return;
    addEnt({ type: 'arc', c, r, a1, a2: V.ang(c, e) }); return;
  }
  if (!isPt(p1)) return;
  const p2 = await getPoint('Specify second point of arc', { base: p1 }); if (!isPt(p2)) return;
  const p3 = await getPoint('Specify end point of arc', { base: p2, preview: (q) => { const a = arcFrom3(p1, p2, q); return a ? [{ ...a, layer: curLayer() }] : []; } });
  if (!isPt(p3)) return;
  const a = arcFrom3(p1, p2, p3); if (!a) { UI.log('Points are collinear.', 'err'); return; }
  addEnt(a);
});

function rectPts(a, b) { return [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]; }
def('RECTANG', ['REC', 'RECTANGLE'], 'Draw a rectangle', async () => {
  const a = await getPoint('Specify first corner point'); if (!isPt(a)) return;
  let b = await getPoint('Specify other corner point', { base: a, rubber: false, keywords: ['Dimensions'], preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, layer: curLayer() }] });
  if (b === 'Dimensions') {
    const w = await getDist('Specify length for rectangles', { base: a }); if (typeof w !== 'number') return;
    const h = await getDist('Specify width for rectangles', { base: a }); if (typeof h !== 'number') return;
    const q = await getPoint('Specify other corner point (side)', { base: a, rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(a, { x: a.x + Math.sign(q.x - a.x || 1) * w, y: a.y + Math.sign(q.y - a.y || 1) * h }), closed: true, layer: curLayer() }] });
    if (!isPt(q)) return;
    b = { x: a.x + Math.sign(q.x - a.x || 1) * w, y: a.y + Math.sign(q.y - a.y || 1) * h };
  }
  if (!isPt(b)) return;
  addEnt({ type: 'pline', pts: rectPts(a, b), closed: true });
});

def('POLYGON', ['POL'], 'Draw a regular polygon', async () => {
  const n0 = App.lastSides || 6;
  let n = await getDist(`Enter number of sides <${n0}>`, { def: n0 });
  if (typeof n !== 'number') return; n = Math.round(n);
  if (n < 3 || n > 1024) { UI.log('Requires an integer between 3 and 1024.', 'err'); return; }
  App.lastSides = n;
  const c = await getPoint('Specify center of polygon'); if (!isPt(c)) return;
  const kw = await getKeyword('Enter an option [Inscribed in circle/Circumscribed about circle] <I>', { keywords: ['Inscribed', 'Circumscribed'], def: 'Inscribed' });
  const ins = kw !== 'Circumscribed';
  const mk = (q) => {
    const r0 = V.dist(c, q), a0 = V.ang(c, q);
    const R = ins ? r0 : r0 / Math.cos(Math.PI / n), off = ins ? 0 : Math.PI / n;
    const pts = []; for (let i = 0; i < n; i++) pts.push(V.polar(c, a0 + off + i * TAU / n, R));
    return { type: 'pline', pts, closed: true };
  };
  const q = await getPoint('Specify radius of circle', { base: c, preview: (q) => [{ ...mk(q), layer: curLayer() }] });
  if (typeof q === 'number') { addEnt(mk(V.polar(c, Math.PI / 2, q))); return; }
  if (!isPt(q)) return;
  addEnt(mk(q));
});

def('ELLIPSE', ['EL'], 'Draw an ellipse (as polyline)', async () => {
  const c = await getPoint('Specify center of ellipse'); if (!isPt(c)) return;
  const a = await getPoint('Specify endpoint of axis', { base: c }); if (!isPt(a)) return;
  const ra = V.dist(c, a), ang = V.ang(c, a);
  const mk = (rb) => {
    const pts = []; const n = 96;
    for (let i = 0; i < n; i++) { const t = i * TAU / n; const x = Math.cos(t) * ra, y = Math.sin(t) * rb; pts.push({ x: c.x + x * Math.cos(ang) - y * Math.sin(ang), y: c.y + x * Math.sin(ang) + y * Math.cos(ang) }); }
    return { type: 'pline', pts, closed: true };
  };
  const rb = await getDist('Specify distance to other axis', { base: c, preview: (q) => [{ ...mk(V.dist(c, q)), layer: curLayer() }] });
  if (typeof rb !== 'number') return;
  addEnt(mk(rb));
});

def('TEXT', ['T', 'DT', 'DTEXT', 'MTEXT', 'MT'], 'Create single-line text', async () => {
  const p = await getPoint('Specify start point of text'); if (!isPt(p)) return;
  const h0 = App.doc.textH;
  const h = await getDist(`Specify height <${fmt(h0)}>`, { base: p, def: h0 }); if (typeof h !== 'number') return;
  App.doc.textH = h;
  const r = await getAngle('Specify rotation angle of text <0>', { base: p, def: 0 }); if (typeof r !== 'number') return;
  let at = p;
  for (;;) {
    const s = await getString('Enter text (empty line to finish)');
    if (!s) return;
    addEnt({ type: 'text', p: at, h, rot: r, s });
    at = V.polar(at, r - Math.PI / 2, h * 1.6);
  }
});

async function dimCommand(aligned) {
  const p1 = await getPoint('Specify first extension line origin'); if (!isPt(p1)) return;
  const p2 = await getPoint('Specify second extension line origin', { base: p1 }); if (!isPt(p2)) return;
  const h = App.doc.dimH;
  const layer = App.doc.layers.find(l => l.name === 'Dimensions') ? 'Dimensions' : App.doc.cur;
  const mk = (q) => {
    let ang;
    if (aligned) ang = V.ang(p1, p2);
    else {
      const mx = Math.min(p1.x, p2.x), Mx = Math.max(p1.x, p2.x), my = Math.min(p1.y, p2.y), My = Math.max(p1.y, p2.y);
      const outX = q.x < mx || q.x > Mx, outY = q.y < my || q.y > My;
      ang = (outX && !outY) ? Math.PI / 2 : 0;
      if (outX && outY) ang = Math.abs(q.x - (mx + Mx) / 2) - (Mx - mx) / 2 > Math.abs(q.y - (my + My) / 2) - (My - my) / 2 ? Math.PI / 2 : 0;
    }
    return { type: 'dim', p1, p2, p3: q, ang, h, layer };
  };
  const q = await getPoint('Specify dimension line location', { rubber: false, preview: (q) => [mk(q)] });
  if (!isPt(q)) return;
  const d = addEnt(mk(q));
  UI.log(`Dimension text = ${fmt(dimGeom(d).value, 4)}`);
}
def('DIMLINEAR', ['DLI', 'DIM'], 'Horizontal/vertical dimension', () => dimCommand(false));
def('DIMALIGNED', ['DAL'], 'Aligned dimension', () => dimCommand(true));

// ---------------- MODIFY ----------------
def('ERASE', ['E', 'DELETE'], 'Erase objects', async () => {
  const s = await getSelection(); if (!s || !s.length) return;
  removeEnts(s); UI.log(`${s.length} object(s) erased.`);
});

function previewTransformed(ents, mfn) {
  return (q) => { const m = mfn(q); if (!m) return []; return ents.map(e => { const c = entTransform(entClone(e), m); c.dash = false; return c; }); };
}

async function baseSecond(verb) {
  const b = await getPoint('Specify base point', { keywords: ['Displacement'] });
  if (b === 'Displacement') {
    const d = await getPoint('Specify displacement <0,0>', { def: { x: 0, y: 0 } });
    return isPt(d) ? { base: { x: 0, y: 0 }, disp: d } : null;
  }
  return isPt(b) ? { base: b } : null;
}

def('MOVE', ['M'], 'Move objects', async () => {
  const s = await getSelection(); if (!s.length) return;
  const bs = await baseSecond(); if (!bs) return;
  let to = bs.disp;
  if (!to) { to = await getPoint('Specify second point', { base: bs.base, preview: previewTransformed(s, q => M.translate(q.x - bs.base.x, q.y - bs.base.y)) }); if (!isPt(to)) return; }
  const m = M.translate(to.x - bs.base.x, to.y - bs.base.y);
  s.forEach(e => entTransform(e, m));
});

def('COPY', ['CO', 'CP'], 'Copy objects', async () => {
  const s = await getSelection(); if (!s.length) return;
  const bs = await baseSecond(); if (!bs) return;
  if (bs.disp) { const m = M.translate(bs.disp.x, bs.disp.y); s.forEach(e => addEnt(entTransform(entClone(e), m))); return; }
  for (;;) {
    const to = await getPoint('Specify second point or <exit>', { base: bs.base, keywords: ['Array'], preview: previewTransformed(s, q => M.translate(q.x - bs.base.x, q.y - bs.base.y)) });
    if (to === 'Array') {
      let n = await getDist('Enter number of items to array <3>', { def: 3 }); if (typeof n !== 'number') return; n = Math.max(2, Math.round(n));
      const q = await getPoint('Specify second point', { base: bs.base }); if (!isPt(q)) return;
      for (let i = 1; i < n; i++) { const m = M.translate((q.x - bs.base.x) * i, (q.y - bs.base.y) * i); s.forEach(e => addEnt(entTransform(entClone(e), m))); }
      return;
    }
    if (!isPt(to)) return;
    const m = M.translate(to.x - bs.base.x, to.y - bs.base.y);
    s.forEach(e => { const c = entClone(e); delete c.id; addEnt(entTransform(c, m)); });
  }
});

def('ROTATE', ['RO'], 'Rotate objects', async () => {
  const s = await getSelection(); if (!s.length) return;
  const b = await getPoint('Specify base point'); if (!isPt(b)) return;
  const a = await getAngle('Specify rotation angle', { base: b, keywords: ['Copy', 'Reference'], preview: previewTransformed(s, q => M.rotate(b, V.ang(b, q))) });
  let ang = a, copy = false;
  if (a === 'Copy') { copy = true; ang = await getAngle('Specify rotation angle', { base: b, preview: previewTransformed(s, q => M.rotate(b, V.ang(b, q))) }); }
  if (ang === 'Reference') {
    const r1 = await getAngle('Specify the reference angle <0>', { def: 0 }); if (typeof r1 !== 'number') return;
    const r2 = await getAngle('Specify the new angle', { base: b }); if (typeof r2 !== 'number') return;
    ang = r2 - r1;
  }
  if (typeof ang !== 'number') return;
  const m = M.rotate(b, ang);
  s.forEach(e => copy ? addEnt(entTransform(entClone(e), m)) : entTransform(e, m));
});

def('SCALE', ['SC'], 'Scale objects', async () => {
  const s = await getSelection(); if (!s.length) return;
  const b = await getPoint('Specify base point'); if (!isPt(b)) return;
  let k = await getDist('Specify scale factor', { base: b, keywords: ['Copy', 'Reference'], preview: previewTransformed(s, q => { const d = V.dist(b, q); return d > 1e-9 ? M.scale(b, d) : null; }) });
  let copy = false;
  if (k === 'Copy') { copy = true; k = await getDist('Specify scale factor', { base: b }); }
  if (k === 'Reference') {
    const r1 = await getDist('Specify reference length <1>', { def: 1 }); if (typeof r1 !== 'number') return;
    const r2 = await getDist('Specify new length', { base: b }); if (typeof r2 !== 'number') return;
    k = r2 / r1;
  }
  if (typeof k !== 'number' || k <= 0) return;
  const m = M.scale(b, k);
  s.forEach(e => copy ? addEnt(entTransform(entClone(e), m)) : entTransform(e, m));
});

def('MIRROR', ['MI'], 'Mirror objects', async () => {
  const s = await getSelection(); if (!s.length) return;
  const a = await getPoint('Specify first point of mirror line'); if (!isPt(a)) return;
  const b = await getPoint('Specify second point of mirror line', { base: a, preview: previewTransformed(s, q => V.dist(a, q) > 1e-9 ? M.mirror(a, q) : null) });
  if (!isPt(b) || V.dist(a, b) < 1e-9) return;
  const kw = await getKeyword('Erase source objects? [Yes/No] <No>', { keywords: ['Yes', 'No'], def: 'No' });
  const m = M.mirror(a, b);
  s.forEach(e => kw === 'Yes' ? entTransform(e, m) : addEnt(entTransform(entClone(e), m)));
});

def('ARRAYRECT', ['AR', 'ARRAY'], 'Rectangular array', async () => {
  const s = await getSelection(); if (!s.length) return;
  let rows = await getDist('Enter number of rows <3>', { def: 3 }); if (typeof rows !== 'number') return;
  let cols = await getDist('Enter number of columns <4>', { def: 4 }); if (typeof cols !== 'number') return;
  rows = Math.max(1, Math.round(rows)); cols = Math.max(1, Math.round(cols));
  const dy = rows > 1 ? await getDist('Specify the distance between rows <20>', { def: 20 }) : 0; if (typeof dy !== 'number') return;
  const dx = cols > 1 ? await getDist('Specify the distance between columns <20>', { def: 20 }) : 0; if (typeof dx !== 'number') return;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!r && !c) continue;
    const m = M.translate(c * dx, r * dy);
    s.forEach(e => addEnt(entTransform(entClone(e), m)));
  }
});

def('ARRAYPOLAR', ['ARP'], 'Polar array', async () => {
  const s = await getSelection(); if (!s.length) return;
  const c = await getPoint('Specify center point of array'); if (!isPt(c)) return;
  let n = await getDist('Enter number of items <6>', { def: 6 }); if (typeof n !== 'number') return; n = Math.max(2, Math.round(n));
  const fill = await getDist('Specify the angle to fill <360>', { def: 360 }); if (typeof fill !== 'number') return;
  const step = Math.abs(fill - 360) < 1e-9 ? TAU / n : rad(fill) / (n - 1);
  for (let i = 1; i < n; i++) { const m = M.rotate(c, step * i); s.forEach(e => addEnt(entTransform(entClone(e), m))); }
});

def('EXPLODE', ['X'], 'Explode polylines and dimensions', async () => {
  const s = await getSelection(); if (!s.length) return;
  let n = 0;
  for (const e of s) {
    const parts = Types[e.type].explode(e);
    if (!parts) continue;
    removeEnts([e]); parts.forEach(p => { if (!p.layer) p.layer = e.layer; if (e.color && !p.color && e.type !== 'insert') p.color = e.color; p._keepColor = true; addEnt(p); }); n++;
  }
  UI.log(n ? `${n} object(s) exploded.` : 'Nothing to explode.');
});

// offset
function offsetEnt(e, d, side) {
  if (e.type === 'line') {
    const n = V.perp(V.norm(V.sub(e.p2, e.p1)));
    const sgn = V.dot(V.sub(side, e.p1), n) >= 0 ? 1 : -1;
    const o = V.mul(n, d * sgn);
    return { type: 'line', p1: V.add(e.p1, o), p2: V.add(e.p2, o) };
  }
  if (e.type === 'circle' || e.type === 'arc') {
    const out = V.dist(side, e.c) > e.r;
    const r = e.r + (out ? d : -d); if (r <= 1e-9) return null;
    return { ...entClone(e), r, id: undefined };
  }
  if (e.type === 'pline') {
    const pts = e.pts, n = pts.length; if (n < 2) return null;
    // side: find nearest segment & sign
    let bi = 0, bd = Infinity; const segs = e.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) { const dd = ptSegDist(side, pts[i], pts[(i + 1) % n]); if (dd < bd) { bd = dd; bi = i; } }
    const nn = V.perp(V.norm(V.sub(pts[(bi + 1) % n], pts[bi])));
    const sgn = V.dot(V.sub(side, pts[bi]), nn) >= 0 ? 1 : -1;
    const lines = [];
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const o = V.mul(V.perp(V.norm(V.sub(b, a))), d * sgn);
      lines.push([V.add(a, o), V.add(b, o)]);
    }
    const res = [];
    for (let i = 0; i < n; i++) {
      const prev = e.closed ? lines[(i - 1 + segs) % segs] : lines[i - 1];
      const next = lines[i] || null;
      if (prev && next) { const x = segSeg(prev[0], prev[1], next[0], next[1], true); res.push(x ? x.p : next[0]); }
      else if (next) res.push(next[0]);
      else res.push(prev[1]);
    }
    return { type: 'pline', pts: res, closed: e.closed };
  }
  return null;
}
def('OFFSET', ['O'], 'Offset lines, circles, arcs, polylines', async () => {
  const d0 = App.lastOffset || 10;
  const d = await getDist(`Specify offset distance <${fmt(d0)}>`, { def: d0 });
  if (typeof d !== 'number' || d <= 0) return;
  App.lastOffset = d;
  for (;;) {
    App.sel.clear();
    const pick = await getEntity('Select object to offset or <exit>', { filter: e => ['line', 'circle', 'arc', 'pline'].includes(e.type) });
    if (!pick) return;
    App.sel.add(pick.e.id); App.dirty = true;
    const side = await getPoint('Specify point on side to offset', { noSnap: true, preview: (q) => { const o = offsetEnt(pick.e, d, q); return o ? [{ ...o, layer: pick.e.layer }] : []; } });
    App.sel.clear();
    if (!isPt(side)) return;
    const o = offsetEnt(pick.e, d, side);
    if (o) { inheritStyle(pick.e, o); delete o.id; addEnt(o); }
  }
});

// trim / extend helpers
function cutParamsLine(e, others) {
  const ts = [];
  for (const o of others) for (const pl of entApprox(o)) for (let i = 0; i < pl.length - 1; i++) {
    const r = segSeg(e.p1, e.p2, pl[i], pl[i + 1]); if (r && r.t > 1e-7 && r.t < 1 - 1e-7) ts.push(r.t);
  }
  return ts.sort((a, b) => a - b);
}
function cutAnglesCircle(c, r, others) {
  const as = [];
  for (const o of others) for (const pl of entApprox(o)) for (let i = 0; i < pl.length - 1; i++)
    for (const x of segCircle(pl[i], pl[i + 1], c, r)) as.push(normAng(V.ang(c, x.p)));
  return as;
}
function trimEnt(e, pick, others) {
  if (e.type === 'line') {
    const ts = cutParamsLine(e, others); if (!ts.length) return null;
    const t0 = closestOnSeg(pick, e.p1, e.p2).t;
    const lo = ts.filter(t => t < t0).pop(), hi = ts.find(t => t > t0);
    const out = [];
    if (lo !== undefined) out.push({ type: 'line', p1: e.p1, p2: V.lerp(e.p1, e.p2, lo) });
    if (hi !== undefined) out.push({ type: 'line', p1: V.lerp(e.p1, e.p2, hi), p2: e.p2 });
    return out;
  }
  if (e.type === 'circle') {
    const as = cutAnglesCircle(e.c, e.r, others); if (as.length < 2) return null;
    const a0 = normAng(V.ang(e.c, pick));
    const rel = as.map(a => normAng(a - a0)).sort((x, y) => x - y);
    // remove from previous cut (before a0) to next cut (after a0); keep the rest
    const next = a0 + rel[0], prev = a0 + rel[rel.length - 1];
    return [{ type: 'arc', c: e.c, r: e.r, a1: next, a2: prev }];
  }
  if (e.type === 'arc') {
    const span = normAng(e.a2 - e.a1) || TAU;
    const us = cutAnglesCircle(e.c, e.r, others).map(a => normAng(a - e.a1)).filter(u => u > 1e-7 && u < span - 1e-7).sort((a, b) => a - b);
    if (!us.length) return null;
    const u0 = normAng(V.ang(e.c, pick) - e.a1);
    const lo = us.filter(u => u < u0).pop(), hi = us.find(u => u > u0);
    const out = [];
    if (lo !== undefined) out.push({ type: 'arc', c: e.c, r: e.r, a1: e.a1, a2: e.a1 + lo });
    if (hi !== undefined) out.push({ type: 'arc', c: e.c, r: e.r, a1: e.a1 + hi, a2: e.a2 });
    return out;
  }
  if (e.type === 'pline') {
    // explode, trim the picked segment, keep others as lines
    const parts = Types.pline.explode(e);
    let bi = 0, bd = Infinity;
    parts.forEach((p, i) => { const d = ptSegDist(pick, p.p1, p.p2); if (d < bd) { bd = d; bi = i; } });
    const t = trimEnt(parts[bi], pick, [...others, ...parts.filter((_, i) => i !== bi)]);
    if (!t) return null;
    parts.splice(bi, 1, ...t);
    return parts;
  }
  return null;
}
def('TRIM', ['TR'], 'Trim objects at intersections', async () => {
  UI.log('Current settings: Edges = all objects (quick trim)');
  for (;;) {
    App.sel.clear();
    const pick = await getEntity('Select object to trim or <exit>', { filter: e => ['line', 'circle', 'arc', 'pline'].includes(e.type) });
    if (!pick) return;
    const others = App.doc.ents.filter(o => o !== pick.e && visible(o) && o.type !== 'hatch');
    const res = trimEnt(pick.e, pick.p, others);
    if (!res) {
      // nothing intersects: delete like quick-trim does
      removeEnts([pick.e]); continue;
    }
    const src = pick.e;
    removeEnts([src]);
    res.forEach(r => addEnt(inheritStyle(src, r)));
  }
});

def('EXTEND', ['EX'], 'Extend lines to the nearest boundary', async () => {
  for (;;) {
    const pick = await getEntity('Select line to extend (pick near the end) or <exit>', { filter: e => e.type === 'line' });
    if (!pick) return;
    const e = pick.e;
    const nearStart = V.dist(pick.p, e.p1) < V.dist(pick.p, e.p2);
    const from = nearStart ? e.p2 : e.p1, to = nearStart ? e.p1 : e.p2;
    let best = null, bt = Infinity;
    for (const o of App.doc.ents) {
      if (o === e || !visible(o) || o.type === 'hatch') continue;
      for (const pl of entApprox(o)) for (let i = 0; i < pl.length - 1; i++) {
        const r = segSeg(from, to, pl[i], pl[i + 1], true);
        if (r && r.t > 1 + 1e-7 && r.u >= -1e-9 && r.u <= 1 + 1e-9 && r.t < bt) { bt = r.t; best = r.p; }
      }
    }
    if (!best) { UI.log('Object does not intersect an edge.'); continue; }
    if (nearStart) e.p1 = best; else e.p2 = best;
    invalidate(e); App.dirty = true;
  }
});

def('FILLET', ['F'], 'Fillet two lines (radius 0 = corner)', async () => {
  const r0 = App.filletR || 0;
  let pick1 = await getEntity(`Select first line or [Radius] (radius = ${fmt(r0)})`, { filter: e => e.type === 'line', keywords: ['Radius'] });
  if (pick1 === 'Radius') {
    const r = await getDist(`Specify fillet radius <${fmt(r0)}>`, { def: r0 }); if (typeof r !== 'number') return;
    App.filletR = r;
    pick1 = await getEntity('Select first line', { filter: e => e.type === 'line' });
  }
  if (!pick1 || typeof pick1 !== 'object') return;
  App.sel.add(pick1.e.id); App.dirty = true;
  const pick2 = await getEntity('Select second line', { filter: e => e.type === 'line' && e !== pick1.e });
  App.sel.clear();
  if (!pick2) return;
  const a = pick1.e, b = pick2.e, R = App.filletR || 0;
  const x = segSeg(a.p1, a.p2, b.p1, b.p2, true);
  if (!x) { UI.log('Lines are parallel.', 'err'); return; }
  const P = x.p;
  // keep the side of each line where the user picked
  const keepFar = (ln, pk) => {
    const d1 = V.dot(V.sub(ln.p1, P), V.sub(pk, P)), d2 = V.dot(V.sub(ln.p2, P), V.sub(pk, P));
    return d1 >= d2 ? 'p1' : 'p2';
  };
  const ka = keepFar(a, pick1.p), kb = keepFar(b, pick2.p);
  const ua = V.norm(V.sub(a[ka], P)), ub = V.norm(V.sub(b[kb], P));
  if (R <= 1e-9) {
    a[ka === 'p1' ? 'p2' : 'p1'] = P; b[kb === 'p1' ? 'p2' : 'p1'] = P;
  } else {
    const theta = Math.acos(Math.max(-1, Math.min(1, V.dot(ua, ub))));
    const t = R / Math.tan(theta / 2);
    const ta = V.add(P, V.mul(ua, t)), tb = V.add(P, V.mul(ub, t));
    const bis = V.norm(V.add(ua, ub));
    const c = V.add(P, V.mul(bis, R / Math.sin(theta / 2)));
    a[ka === 'p1' ? 'p2' : 'p1'] = ta; b[kb === 'p1' ? 'p2' : 'p1'] = tb;
    let a1 = V.ang(c, ta), a2 = V.ang(c, tb);
    if (normAng(a2 - a1) > Math.PI) [a1, a2] = [a2, a1];
    addEnt({ type: 'arc', c, r: R, a1, a2, layer: a.layer });
  }
  invalidate(a); invalidate(b); App.dirty = true;
});

// ---------------- INQUIRY ----------------
def('DIST', ['DI'], 'Measure distance between two points', async () => {
  const a = await getPoint('Specify first point'); if (!isPt(a)) return;
  const b = await getPoint('Specify second point', { base: a }); if (!isPt(b)) return;
  const d = V.sub(b, a);
  UI.log(`Distance = ${fmt(V.len(d))},  Angle in XY Plane = ${fmt(deg(normAng(V.ang(a, b))), 2)}°,  Delta X = ${fmt(d.x)},  Delta Y = ${fmt(d.y)}`, 'info');
}, { noUndo: true });

def('AREA', ['AA', 'MEASUREAREA'], 'Measure area by points', async () => {
  const pts = [];
  for (;;) {
    const p = await getPoint(pts.length ? 'Specify next point or <total>' : 'Specify first corner point', { base: pts[pts.length - 1], preview: (q) => pts.length ? [{ type: 'pline', pts: [...pts, q], closed: true, layer: curLayer(), color: '#4cd964' }] : [] });
    if (!isPt(p)) break; pts.push(p);
  }
  if (pts.length < 3) return;
  let A = 0, L = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += V.cross(a, b); L += V.dist(a, b); }
  UI.log(`Area = ${fmt(Math.abs(A / 2))},  Perimeter = ${fmt(L)}`, 'info');
}, { noUndo: true });

def('ID', [], 'Show coordinates of a point', async () => {
  const p = await getPoint('Specify point'); if (!isPt(p)) return;
  UI.log(`X = ${fmt(p.x)}   Y = ${fmt(p.y)}`, 'info');
}, { noUndo: true });

def('LIST', ['LI'], 'List object properties', async () => {
  const s = await getSelection(); if (!s.length) return;
  for (const e of s) {
    UI.log(`${Types[e.type].label.toUpperCase()}  Layer: "${e.layer}"`, 'info');
    for (const p of Types[e.type].props(e)) UI.log(`    ${p.k}: ${typeof p.v === 'number' ? fmt(p.v) : p.v}`, 'info');
  }
  UI.showHistory(true);
}, { noUndo: true });

// ---------------- VIEW / UTIL ----------------
def('ZOOM', ['Z'], 'Zoom (Extents / Window / In / Out)', async () => {
  const k = await getPoint('Specify corner of window, or [Extents/In/Out/Window] <Extents>', { keywords: ['Extents', 'In', 'Out', 'Window', 'All'], rubber: false, noSnap: true });
  if (k === null || k === 'Extents' || k === 'All') { zoomExtents(); return; }
  if (k === 'In') { zoomAt({ x: CW / 2, y: CH / 2 }, 2); return; }
  if (k === 'Out') { zoomAt({ x: CW / 2, y: CH / 2 }, 0.5); return; }
  const a = k === 'Window' ? await getPoint('Specify first corner', { noSnap: true }) : k;
  if (!isPt(a)) return;
  const b = await getPoint('Specify opposite corner', { noSnap: true, rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, color: '#4a8cff' }] });
  if (!isPt(b)) return;
  zoomRect(rectNorm(a, b), 0);
}, { noUndo: true, noRepeat: true });

def('PAN', ['P'], 'Pan the view', async () => {
  const a = await getPoint('Specify base point', { noSnap: true }); if (!isPt(a)) return;
  const b = await getPoint('Specify second point', { base: a, noSnap: true }); if (!isPt(b)) return;
  App.view.cx -= b.x - a.x; App.view.cy -= b.y - a.y; App.dirty = true;
}, { noUndo: true });

def('UNDO', ['U'], 'Undo last action', async () => {
  if (!App.undo.length) { UI.log('Nothing to undo.'); return; }
  App.redo.push(snapshot()); restore(App.undo.pop()); UI.log('Undo.');
}, { noUndo: true, noRepeat: true });
def('REDO', ['MREDO'], 'Redo', async () => {
  if (!App.redo.length) { UI.log('Nothing to redo.'); return; }
  App.undo.push(snapshot()); restore(App.redo.pop()); UI.log('Redo.');
}, { noUndo: true, noRepeat: true });

def('SELECTALL', ['ALL'], 'Select all objects', async () => {
  App.doc.ents.filter(editable).forEach(e => App.sel.add(e.id)); App.dirty = true; UI.log(`${App.sel.size} selected.`);
}, { noUndo: true, noRepeat: true });

def('LAYER', ['LA'], 'Open the layer manager', async () => { UI.openPanel('layers'); }, { noUndo: true, noRepeat: true });
def('PROPERTIES', ['PR', 'PROPS', 'CH'], 'Open properties palette', async () => { UI.openPanel('props'); }, { noUndo: true, noRepeat: true });
def('MATCHPROP', ['MA'], 'Match properties (layer & color)', async () => {
  const src = await getEntity('Select source object'); if (!src) return;
  for (;;) {
    const t = await getEntity('Select destination object(s) or <exit>'); if (!t) return;
    t.e.layer = src.e.layer; if (src.e.color) t.e.color = src.e.color; else delete t.e.color;
    if (src.e.h && t.e.h) t.e.h = src.e.h;
    invalidate(t.e); App.dirty = true;
  }
});

const toggleCmd = (key, label) => async () => {
  const k = await getKeyword(`Enter mode [ON/OFF] <${App.modes[key] ? 'OFF' : 'ON'}>`, { keywords: ['ON', 'OFF'], def: App.modes[key] ? 'OFF' : 'ON' });
  App.modes[key] = k === 'ON'; UI.refreshStatus(); UI.log(`<${label} ${App.modes[key] ? 'on' : 'off'}>`);
};
def('GRID', [], 'Toggle grid display', async () => {
  const v = await getDist(`Specify grid spacing or [ON/OFF] <${fmt(App.gridSize)}>`, { keywords: ['ON', 'OFF'], def: App.gridSize });
  if (v === 'ON' || v === 'OFF') App.modes.grid = v === 'ON'; else if (typeof v === 'number' && v > 0) { App.gridSize = v; App.modes.grid = true; }
  UI.refreshStatus(); App.dirty = true;
}, { noUndo: true });
def('SNAP', ['SN'], 'Set snap spacing', async () => {
  const v = await getDist(`Specify snap spacing or [ON/OFF] <${fmt(App.snapSize)}>`, { keywords: ['ON', 'OFF'], def: App.snapSize });
  if (v === 'ON' || v === 'OFF') App.modes.snap = v === 'ON'; else if (typeof v === 'number' && v > 0) { App.snapSize = v; App.modes.snap = true; }
  UI.refreshStatus();
}, { noUndo: true });
def('ORTHO', [], 'Toggle ortho mode', toggleCmd('ortho', 'Ortho'), { noUndo: true });
def('OSNAP', ['OS'], 'Object snap settings', async () => { UI.toggleOsnapMenu(true); }, { noUndo: true, noRepeat: true });

def('NEW', ['QNEW'], 'New drawing', async () => {
  if (App.modified && App.doc.ents.length) {
    const k = await getKeyword('Discard unsaved changes? [Yes/No] <No>', { keywords: ['Yes', 'No'], def: 'No' });
    if (k !== 'Yes') return;
  }
  IO.newDrawing();
}, { noUndo: true, noRepeat: true });
def('OPEN', [], 'Open drawing (.json / .dxf)', async () => { IO.open(); }, { noUndo: true, noRepeat: true });
def('SAVE', ['QSAVE', 'SAVEAS'], 'Save drawing (.json)', async () => { IO.save(); }, { noUndo: true, noRepeat: true });
def('DXFOUT', ['EXPORT', 'DXF'], 'Export DXF', async () => { IO.exportDXF(); }, { noUndo: true, noRepeat: true });
def('SVGOUT', ['SVG'], 'Export SVG', async () => { IO.exportSVG(); }, { noUndo: true, noRepeat: true });
def('PNGOUT', ['PNG', 'PLOT', 'PRINT'], 'Export PNG image', async () => { IO.exportPNG(); }, { noUndo: true, noRepeat: true });
def('HELP', ['?', 'F1'], 'Show command list', async () => { UI.showHelp(); }, { noUndo: true, noRepeat: true });

// ---------------- CLIPBOARD ----------------
function clipStore(s) {
  let r = { x1: Infinity, y1: Infinity };
  s.forEach(e => { const b = entBBox(e); r = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1) }; });
  App.clip = { base: { x: r.x1, y: r.y1 }, ents: s.map(e => { const c = entClone(e); delete c.id; return c; }) };
}
def('COPYCLIP', [], 'Copy objects to clipboard (Ctrl+C)', async () => {
  const s = await getSelection(); if (!s.length) return;
  clipStore(s); UI.log(`${s.length} object(s) copied to clipboard.`);
}, { noUndo: true, noRepeat: true });
def('CUTCLIP', [], 'Cut objects to clipboard (Ctrl+X)', async () => {
  const s = await getSelection(); if (!s.length) return;
  clipStore(s); removeEnts(s); UI.log(`${s.length} object(s) cut to clipboard.`);
});
def('PASTECLIP', [], 'Paste from clipboard (Ctrl+V)', async () => {
  const c = App.clip; if (!c || !c.ents.length) { UI.log('Clipboard is empty.'); return; }
  const mk = (q) => c.ents.map(e => entTransform(entClone(e), M.translate(q.x - c.base.x, q.y - c.base.y)));
  const p = await getPoint('Specify insertion point', { preview: mk }); if (!isPt(p)) return;
  App.sel.clear();
  mk(p).forEach(e => { e._keepColor = true; addEnt(e); });
});

// ---------------- HATCH ----------------
def('HATCH', ['H', 'BH', 'BHATCH'], 'Fill an enclosed area with a hatch pattern', async () => {
  const hs = App.hatch || (App.hatch = { pat: 'ANSI31', scale: 1, ang: 0 });
  const hatchLayer = () => App.doc.cur;
  let made = 0;
  for (;;) {
    const r = await getPoint(`Pick internal point or [Select objects/Pattern/sCale/Angle] (pattern=${hs.pat}, scale=${fmt(hs.scale)}, angle=${fmt(deg(hs.ang))})`,
      { keywords: ['Select', 'Pattern', 'sCale', 'Angle'], noSnap: true, rubber: false });
    if (r === null) break;
    if (r === 'Pattern') {
      const names = Object.keys(HATCH_PATTERNS);
      UI.log('Patterns: ' + names.map(n => `${n} (${HATCH_PATTERNS[n].desc})`).join(', '), 'info');
      const k = await getKeyword(`Enter pattern name <${hs.pat}>`, { keywords: names, def: hs.pat });
      if (k) hs.pat = k;
      continue;
    }
    if (r === 'sCale') { const v = await getDist(`Specify hatch scale <${fmt(hs.scale)}>`, { def: hs.scale }); if (typeof v === 'number' && v > 0) hs.scale = v; continue; }
    if (r === 'Angle') { const v = await getAngle(`Specify hatch angle <${fmt(deg(hs.ang))}>`, { def: hs.ang }); if (typeof v === 'number') hs.ang = v; continue; }
    let loops = null;
    if (r === 'Select') {
      const s = await getSelection('Select closed objects', { noPickfirst: true });
      loops = s.filter(e => e.type === 'circle' || (e.type === 'pline' && e.closed && e.pts.length > 2)).map(e => entApprox(e)[0].slice(0, -1).map(V.clone));
      App.sel.clear();
      if (!loops.length) { UI.log('No closed polylines or circles selected.', 'err'); continue; }
    } else if (isPt(r)) {
      UI.log('Analyzing the selected data...');
      loops = findBoundary(r);
      if (!loops) { UI.log('Valid hatch boundary not found. Make sure the area is fully closed.', 'err'); continue; }
    }
    addEnt({ type: 'hatch', loops, pat: hs.pat, scale: hs.scale, ang: hs.ang, layer: hatchLayer() });
    made++;
  }
  if (made) UI.log(`${made} hatch object(s) created.`);
});

def('LTSCALE', ['LTS'], 'Set global linetype scale', async () => {
  const v = await getDist(`Enter new linetype scale factor <${fmt(App.doc.ltscale || 1)}>`, { def: App.doc.ltscale || 1 });
  if (typeof v === 'number' && v > 0) { App.doc.ltscale = v; App.dirty = true; UI.log('Regenerating model.'); }
});
def('LWDISPLAY', ['LWT'], 'Toggle lineweight display', async () => { UI.toggleMode('lwt'); }, { noUndo: true, noRepeat: true });
def('LINETYPE', ['LT'], 'Show available linetypes', async () => {
  for (const k in LTYPES) UI.log(`${k.padEnd(12)} ${LTYPES[k].desc}`, 'info');
  UI.log('Set linetype per layer in the Layers palette, or per object in Properties.', 'info');
  UI.showHistory(true);
}, { noUndo: true, noRepeat: true });

// ---------------- STRETCH / BREAK / JOIN / CHAMFER ----------------
function inheritStyle(src, dst) {
  for (const k of ['layer', 'color', 'lt', 'lw', 'lts']) if (src[k] !== undefined) dst[k] = src[k];
  dst._keepColor = true;
  return dst;
}

function stretchEnt(e, r, d) {
  const inR = (p) => ptInRect(p, r);
  const mv = (p) => (inR(p) ? V.add(p, d) : p);
  const whole = () => entTransform(e, M.translate(d.x, d.y));
  switch (e.type) {
    case 'line': e.p1 = mv(e.p1); e.p2 = mv(e.p2); break;
    case 'pline': e.pts = e.pts.map(mv); break;
    case 'circle': if (inR(e.c)) whole(); break;
    case 'arc': {
      const s = V.polar(e.c, e.a1, e.r), t = V.polar(e.c, e.a2, e.r), m = V.polar(e.c, e.a1 + normAng(e.a2 - e.a1) / 2, e.r);
      if (inR(s) && inR(t)) { whole(); break; }
      const a = arcFrom3(mv(s), inR(s) || inR(t) ? m : mv(m), mv(t));
      if (a) { e.c = a.c; e.r = a.r; e.a1 = a.a1; e.a2 = a.a2; }
      break;
    }
    case 'text': case 'insert': if (inR(e.p)) whole(); break;
    case 'dim': e.p1 = mv(e.p1); e.p2 = mv(e.p2); e.p3 = mv(e.p3); break;
    case 'hatch': e.loops = e.loops.map(l => l.map(mv)); break;
    default: break;
  }
  invalidate(e);
  return e;
}
def('STRETCH', ['S'], 'Stretch objects crossed by a window', async () => {
  UI.log('Select objects to stretch by crossing-window or crossing-polygon...');
  const a = await getPoint('Specify first corner', { noSnap: true }); if (!isPt(a)) return;
  const b = await getPoint('Specify opposite corner', { noSnap: true, rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, color: '#4cd964', dash: true }] });
  if (!isPt(b)) return;
  const r = rectNorm(a, b);
  const s = App.doc.ents.filter(e => editable(e) && entCrossing(e, r));
  UI.log(`${s.length} found`);
  if (!s.length) return;
  s.forEach(e => App.sel.add(e.id)); App.usedSel = true; App.dirty = true;
  const bs = await baseSecond(); if (!bs) return;
  let to = bs.disp;
  if (!to) {
    to = await getPoint('Specify second point', { base: bs.base, preview: (q) => s.map(e => stretchEnt(entClone(e), r, V.sub(q, bs.base))) });
    if (!isPt(to)) return;
  }
  const d = bs.disp ? to : V.sub(to, bs.base);
  s.forEach(e => stretchEnt(e, r, d));
});

function plParam(e, p) { // segment index + t of nearest point on a polyline
  const n = e.pts.length, segs = e.closed ? n : n - 1;
  let best = { i: 0, t: 0, d: Infinity };
  for (let i = 0; i < segs; i++) { const c = closestOnSeg(p, e.pts[i], e.pts[(i + 1) % n]); const d = V.dist(c.p, p); if (d < best.d) best = { i, t: c.t, d, p: c.p }; }
  return best;
}
function breakEnt(e, p1, p2) {
  const same = V.dist(p1, p2) < 1e-9;
  if (e.type === 'line') {
    let t1 = closestOnSeg(p1, e.p1, e.p2).t, t2 = closestOnSeg(p2, e.p1, e.p2).t;
    if (t1 > t2) [t1, t2] = [t2, t1];
    const out = [];
    if (t1 > 1e-9) out.push({ type: 'line', p1: e.p1, p2: V.lerp(e.p1, e.p2, t1) });
    if (t2 < 1 - 1e-9) out.push({ type: 'line', p1: V.lerp(e.p1, e.p2, t2), p2: e.p2 });
    return out;
  }
  if (e.type === 'circle') {
    if (same) { UI.log('Arc cannot be full 360 degrees.', 'err'); return null; }
    return [{ type: 'arc', c: e.c, r: e.r, a1: V.ang(e.c, p2), a2: V.ang(e.c, p1) }];
  }
  if (e.type === 'arc') {
    const span = normAng(e.a2 - e.a1) || TAU;
    let u1 = Math.min(span, normAng(V.ang(e.c, p1) - e.a1)), u2 = Math.min(span, normAng(V.ang(e.c, p2) - e.a1));
    if (u1 > u2) [u1, u2] = [u2, u1];
    const out = [];
    if (u1 > 1e-9) out.push({ type: 'arc', c: e.c, r: e.r, a1: e.a1, a2: e.a1 + u1 });
    if (u2 < span - 1e-9) out.push({ type: 'arc', c: e.c, r: e.r, a1: e.a1 + u2, a2: e.a2 });
    return out;
  }
  if (e.type === 'pline') {
    let A = plParam(e, p1), B = plParam(e, p2);
    if (A.i + A.t > B.i + B.t) [A, B] = [B, A];
    const n = e.pts.length;
    if (!e.closed) {
      const out = [];
      const first = [...e.pts.slice(0, A.i + 1), A.p];
      const second = [B.p, ...e.pts.slice(B.i + 1)];
      if (first.length > 1 && V.dist(first[0], A.p) > 1e-9) out.push({ type: 'pline', pts: first, closed: false });
      if (second.length > 1 && V.dist(B.p, e.pts[n - 1]) > 1e-9) out.push({ type: 'pline', pts: second, closed: false });
      return out;
    }
    if (same) return [{ type: 'pline', pts: [A.p, ...e.pts.slice(A.i + 1), ...e.pts.slice(0, A.i + 1), A.p], closed: false }];
    const pts = [B.p, ...e.pts.slice(B.i + 1), ...e.pts.slice(0, A.i + 1), A.p];
    return [{ type: 'pline', pts, closed: false }];
  }
  return null;
}
def('BREAK', ['BR'], 'Break an object between two points', async () => {
  const pick = await getEntity('Select object', { filter: e => ['line', 'circle', 'arc', 'pline'].includes(e.type) });
  if (!pick || typeof pick !== 'object') return;
  const e = pick.e;
  App.sel.add(e.id); App.usedSel = true; App.dirty = true;
  let p1 = entNearest(e, pick.p);
  let p2 = await getPoint('Specify second break point or [First point]', { keywords: ['First'], base: p1, rubber: false });
  if (p2 === 'First') {
    const f = await getPoint('Specify first break point'); if (!isPt(f)) return;
    p1 = entNearest(e, f);
    p2 = await getPoint('Specify second break point', { base: p1, rubber: false });
  }
  if (!isPt(p2)) return;
  p2 = entNearest(e, p2);
  const res = breakEnt(e, p1, p2);
  if (!res) return;
  removeEnts([e]);
  res.forEach(r => addEnt(inheritStyle(e, r)));
});
def('BREAKATPOINT', ['BRP'], 'Break an object into two at a point', async () => {
  const pick = await getEntity('Select object', { filter: e => ['line', 'arc', 'pline'].includes(e.type) });
  if (!pick || typeof pick !== 'object') return;
  const p = await getPoint('Specify break point'); if (!isPt(p)) return;
  const q = entNearest(pick.e, p);
  const res = breakEnt(pick.e, q, q); if (!res) return;
  removeEnts([pick.e]); res.forEach(r => addEnt(inheritStyle(pick.e, r)));
});

def('JOIN', ['J'], 'Join lines, arcs and polylines end to end', async () => {
  const s = (await getSelection('Select objects to join')).filter(e => ['line', 'pline', 'arc'].includes(e.type) && !(e.type === 'pline' && e.closed));
  if (s.length < 2) { UI.log('Select at least two lines, arcs or open polylines.'); return; }
  let ext = 1; s.forEach(e => { const b = entBBox(e); ext = Math.max(ext, Math.abs(b.x1), Math.abs(b.x2), Math.abs(b.y1), Math.abs(b.y2)); });
  const tol = ext * 1e-7;
  // 1) merge collinear lines (even with gaps)
  let lines = s.filter(e => e.type === 'line').map(e => ({ p1: e.p1, p2: e.p2, src: [e] }));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i], b = lines[j];
      const d = V.norm(V.sub(a.p2, a.p1));
      const off = (p) => Math.abs(V.cross(d, V.sub(p, a.p1)));
      if (off(b.p1) > tol * 10 || off(b.p2) > tol * 10) continue;
      const ts = [a.p1, a.p2, b.p1, b.p2].map(p => V.dot(V.sub(p, a.p1), d));
      const ia = [Math.min(ts[0], ts[1]), Math.max(ts[0], ts[1])], ib = [Math.min(ts[2], ts[3]), Math.max(ts[2], ts[3])];
      if (ib[0] > ia[1] + tol * 10 && ia[0] > ib[1] + tol * 10) continue;
      const lo = Math.min(...ts), hi = Math.max(...ts);
      lines[i] = { p1: V.add(a.p1, V.mul(d, lo)), p2: V.add(a.p1, V.mul(d, hi)), src: [...a.src, ...b.src] };
      lines.splice(j, 1); merged = true; break outer;
    }
  }
  // 2) chain everything end to end
  let chains = [...lines.map(l => ({ pts: [l.p1, l.p2], src: l.src, line: true })),
    ...s.filter(e => e.type !== 'line').map(e => ({ pts: e.type === 'pline' ? e.pts.slice() : entApprox(e)[0].slice(), src: [e], line: false }))];
  const eq = (a, b) => V.dist(a, b) <= tol * 10;
  merged = true;
  while (merged) {
    merged = false;
    outer2: for (let i = 0; i < chains.length; i++) for (let j = 0; j < chains.length; j++) {
      if (i === j) continue;
      const a = chains[i], b = chains[j];
      let pts = null;
      if (eq(a.pts[a.pts.length - 1], b.pts[0])) pts = [...a.pts, ...b.pts.slice(1)];
      else if (eq(a.pts[a.pts.length - 1], b.pts[b.pts.length - 1])) pts = [...a.pts, ...b.pts.slice(0, -1).reverse()];
      else if (eq(a.pts[0], b.pts[0])) pts = [...a.pts.slice().reverse(), ...b.pts.slice(1)];
      else continue;
      chains[i] = { pts, src: [...a.src, ...b.src], line: false };
      chains.splice(j, 1); merged = true; break outer2;
    }
  }
  let joined = 0;
  for (const c of chains) {
    if (c.src.length < 2) continue;
    const first = c.src[0];
    removeEnts(c.src);
    if (c.line) addEnt(inheritStyle(first, { type: 'line', p1: c.pts[0], p2: c.pts[1] }));
    else {
      const closed = c.pts.length > 3 && eq(c.pts[0], c.pts[c.pts.length - 1]);
      const pts = closed ? c.pts.slice(0, -1) : c.pts;
      addEnt(inheritStyle(first, { type: 'pline', pts: pts.filter((p, k) => k === 0 || !eq(p, pts[k - 1])), closed }));
    }
    joined += c.src.length;
  }
  UI.log(joined ? `${joined} objects joined.` : 'Objects are not connected end to end.');
});

def('CHAMFER', ['CHA'], 'Chamfer two lines', async () => {
  App.chamD = App.chamD || [0, 0];
  let pick1 = await getEntity(`Select first line or [Distance] (Dist1 = ${fmt(App.chamD[0])}, Dist2 = ${fmt(App.chamD[1])})`, { filter: e => e.type === 'line', keywords: ['Distance'] });
  if (pick1 === 'Distance') {
    const d1 = await getDist(`Specify first chamfer distance <${fmt(App.chamD[0])}>`, { def: App.chamD[0] }); if (typeof d1 !== 'number') return;
    const d2 = await getDist(`Specify second chamfer distance <${fmt(d1)}>`, { def: d1 }); if (typeof d2 !== 'number') return;
    App.chamD = [d1, d2];
    pick1 = await getEntity('Select first line', { filter: e => e.type === 'line' });
  }
  if (!pick1 || typeof pick1 !== 'object') return;
  App.sel.add(pick1.e.id); App.dirty = true;
  const pick2 = await getEntity('Select second line', { filter: e => e.type === 'line' && e !== pick1.e });
  App.sel.clear();
  if (!pick2) return;
  const a = pick1.e, b = pick2.e;
  const x = segSeg(a.p1, a.p2, b.p1, b.p2, true);
  if (!x) { UI.log('Lines are parallel.', 'err'); return; }
  const P = x.p;
  const keep = (ln, pk) => (V.dot(V.sub(ln.p1, P), V.sub(pk, P)) >= V.dot(V.sub(ln.p2, P), V.sub(pk, P)) ? 'p1' : 'p2');
  const ka = keep(a, pick1.p), kb = keep(b, pick2.p);
  const ua = V.norm(V.sub(a[ka], P)), ub = V.norm(V.sub(b[kb], P));
  const ta = V.add(P, V.mul(ua, App.chamD[0])), tb = V.add(P, V.mul(ub, App.chamD[1]));
  a[ka === 'p1' ? 'p2' : 'p1'] = ta; b[kb === 'p1' ? 'p2' : 'p1'] = tb;
  invalidate(a); invalidate(b);
  if (V.dist(ta, tb) > 1e-9) addEnt(inheritStyle(a, { type: 'line', p1: ta, p2: tb }));
  App.dirty = true;
});

// ---------------- LAYER TOOLS ----------------
async function pickLayerObj(prompt) {
  const pre = selEnts();
  if (pre.length) return pre[0];
  const p = await getEntity(prompt);
  return p && typeof p === 'object' ? p.e : null;
}
def('LAYMCUR', [], "Make the selected object's layer current", async () => {
  const e = await pickLayerObj('Select object whose layer will become current'); if (!e) return;
  App.doc.cur = e.layer; UI.log(`${e.layer} is now the current layer.`);
});
def('LAYOFF', [], "Turn off the selected object's layer", async () => {
  for (;;) {
    const p = await getEntity('Select an object on the layer to be turned off or <exit>'); if (!p || typeof p !== 'object') return;
    const L = layerOf(p.e);
    if (L.name === App.doc.cur) { UI.log('Cannot turn off the current layer.', 'err'); continue; }
    L.on = false; App.dirty = true; UI.log(`Layer "${L.name}" has been turned off.`); UI.refreshLayers();
  }
});
def('LAYON', [], 'Turn all layers on', async () => { App.doc.layers.forEach(l => { l.on = true; }); App.dirty = true; UI.log('All layers have been turned on.'); });
def('LAYISO', [], "Isolate the selected objects' layers", async () => {
  const s = await getSelection('Select objects on the layer(s) to be isolated'); if (!s.length) return;
  const keep = new Set(s.map(e => e.layer));
  App.doc.layers.forEach(l => { l.on = keep.has(l.name); });
  if (!keep.has(App.doc.cur)) App.doc.cur = [...keep][0];
  App.dirty = true; UI.log(`${[...keep].join(', ')} isolated. Use LAYON to restore.`);
});
def('LAYLCK', [], "Lock the selected object's layer", async () => {
  const e = await pickLayerObj('Select an object on the layer to be locked'); if (!e) return;
  layerOf(e).locked = true; App.sel.clear(); App.dirty = true; UI.log(`Layer "${e.layer}" has been locked.`);
});
def('LAYULK', [], 'Unlock a layer by picking an object on it', async () => {
  const p = await getPoint('Select an object on the layer to be unlocked', { noSnap: true }); if (!isPt(p)) return;
  const tol = px(6);
  const e = [...App.doc.ents].reverse().find(x => visible(x) && entDist(x, p) < tol);
  if (!e) { UI.log('No object found.'); return; }
  layerOf(e).locked = false; App.dirty = true; UI.log(`Layer "${e.layer}" has been unlocked.`);
});

// ---------------- MORE DIMENSIONS / LEADER ----------------
function dimLayer() { return App.doc.layers.find(l => l.name === 'Dimensions') ? 'Dimensions' : App.doc.cur; }
async function dimRadial(kind) {
  const pick = await getEntity(`Select arc or circle`, { filter: e => e.type === 'circle' || e.type === 'arc' });
  if (!pick || typeof pick !== 'object') return;
  const { c, r } = pick.e;
  const mk = (q) => ({ type: 'dim', kind, c: V.clone(c), r, p3: q, h: App.doc.dimH, layer: dimLayer() });
  const q = await getPoint('Specify dimension line location', { rubber: false, noSnap: true, preview: (q) => [mk(q)] });
  if (!isPt(q)) return;
  const d = addEnt(mk(q));
  UI.log(`Dimension text = ${dimGeom(d).text.s}`);
}
def('DIMRADIUS', ['DRA', 'DIMRAD'], 'Radius dimension', () => dimRadial('rad'));
def('DIMDIAMETER', ['DDI', 'DIMDIA'], 'Diameter dimension', () => dimRadial('dia'));

def('DIMANGULAR', ['DAN', 'DIMANG'], 'Angular dimension', async () => {
  const pick = await getEntity('Select arc, circle, line, or <specify vertex>', { filter: e => ['line', 'arc', 'circle'].includes(e.type) });
  let c, p1, p2;
  if (pick === null) {
    c = await getPoint('Specify angle vertex'); if (!isPt(c)) return;
    p1 = await getPoint('Specify first angle endpoint', { base: c }); if (!isPt(p1)) return;
    p2 = await getPoint('Specify second angle endpoint', { base: c }); if (!isPt(p2)) return;
  } else if (typeof pick === 'object') {
    const e = pick.e;
    if (e.type === 'arc') { c = e.c; p1 = V.polar(e.c, e.a1, e.r); p2 = V.polar(e.c, e.a2, e.r); }
    else if (e.type === 'circle') {
      c = e.c; p1 = entNearest(e, pick.p);
      const q = await getPoint('Specify second angle endpoint', { base: c }); if (!isPt(q)) return; p2 = q;
    } else {
      App.sel.add(e.id); App.usedSel = true; App.dirty = true;
      const pick2 = await getEntity('Select second line', { filter: x => x.type === 'line' && x !== e });
      if (!pick2 || typeof pick2 !== 'object') return;
      const x = segSeg(e.p1, e.p2, pick2.e.p1, pick2.e.p2, true);
      if (!x) { UI.log('Lines are parallel.', 'err'); return; }
      c = x.p;
      const far = (ln, pk) => (V.dot(V.sub(ln.p1, c), V.sub(pk, c)) >= V.dot(V.sub(ln.p2, c), V.sub(pk, c)) ? ln.p1 : ln.p2);
      p1 = far(e, pick.p); p2 = far(pick2.e, pick2.p);
      if (V.dist(p1, c) < 1e-9) p1 = V.polar(c, V.ang(c, pick.p), 1);
      if (V.dist(p2, c) < 1e-9) p2 = V.polar(c, V.ang(c, pick2.p), 1);
    }
  } else return;
  const mk = (q) => ({ type: 'dim', kind: 'ang', c: V.clone(c), p1: V.clone(p1), p2: V.clone(p2), p3: q, h: App.doc.dimH, layer: dimLayer() });
  const q = await getPoint('Specify dimension arc line location', { rubber: false, noSnap: true, preview: (q) => [mk(q)] });
  if (!isPt(q)) return;
  const d = addEnt(mk(q));
  UI.log(`Dimension text = ${dimGeom(d).text.s}`);
});

def('LEADER', ['LE', 'QLEADER', 'MLEADER', 'MLD', 'LEAD'], 'Leader with note', async () => {
  const p0 = await getPoint('Specify leader arrowhead location'); if (!isPt(p0)) return;
  const pts = [p0];
  for (;;) {
    const p = await getPoint(pts.length < 2 ? 'Specify leader landing location' : 'Specify next point or <enter text>', {
      base: pts[pts.length - 1], preview: (q) => [{ type: 'leader', pts: [...pts, q], s: '', h: App.doc.dimH, layer: dimLayer() }] });
    if (!isPt(p)) break;
    pts.push(p);
    if (pts.length >= 3) break;
  }
  if (pts.length < 2) return;
  const s = await getString('Enter the text');
  addEnt({ type: 'leader', pts, s: s || '', h: App.doc.dimH, layer: dimLayer() });
});
