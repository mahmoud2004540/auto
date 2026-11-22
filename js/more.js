// More AutoCAD-style objects and commands
'use strict';

// ---------- POINT ----------
Types.point = {
  label: 'Point',
  approx: (e) => [[e.p]],
  snaps: (e) => [{ p: e.p, t: 'node' }],
  grips: (e) => [{ p: e.p, set: (x, p) => { x.p = p; } }],
  transform: (e, m) => { e.p = M.apply(m, e.p); },
  draw: (R, e) => {
    const g = R.g, q = w2s(e.p), m = App.doc.pdmode || 0, r = 5;
    g.beginPath();
    if (m === 0 || m === 32 || m === 33) { g.fillRect(q.x - 1, q.y - 1, 2, 2); }
    if (m === 2 || m === 34) { g.moveTo(q.x - r, q.y); g.lineTo(q.x + r, q.y); g.moveTo(q.x, q.y - r); g.lineTo(q.x, q.y + r); }
    if (m === 3 || m === 35) { g.moveTo(q.x - r, q.y - r); g.lineTo(q.x + r, q.y + r); g.moveTo(q.x + r, q.y - r); g.lineTo(q.x - r, q.y + r); }
    if (m >= 32) { g.moveTo(q.x + r, q.y); g.arc(q.x, q.y, r, 0, TAU); }
    g.stroke();
  },
  props: (e) => [{ k: 'Position X', v: e.p.x, set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.p.x = n; } }, { k: 'Position Y', v: e.p.y, set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.p.y = n; } }],
  explode: () => null,
};

// ---------- XLINE / RAY (construction lines) ----------
const XL_LEN = 1e6;
function xlEnds(e) { return [e.type === 'ray' ? e.p : V.sub(e.p, V.mul(e.d, XL_LEN)), V.add(e.p, V.mul(e.d, XL_LEN))]; }
for (const T of ['xline', 'ray']) {
  Types[T] = {
    label: T === 'ray' ? 'Ray' : 'Construction Line',
    approx: (e) => [xlEnds(e)],
    snaps: (e) => [{ p: e.p, t: T === 'ray' ? 'end' : 'mid' }],
    grips: (e) => [{ p: e.p, set: (x, p) => { x.p = p; } }, { p: V.add(e.p, V.mul(e.d, 20 / App.view.s * 3)), set: (x, p) => { x.d = V.norm(V.sub(p, x.p)); } }],
    transform: (e, m) => { e.p = M.apply(m, e.p); e.d = V.norm(M.vec(m, e.d)); },
    draw: (R, e) => {
      const L = (Math.hypot(CW, CH) / App.view.s) * 2 + V.dist(e.p, { x: App.view.cx, y: App.view.cy });
      R.line(e.type === 'ray' ? e.p : V.sub(e.p, V.mul(e.d, L)), V.add(e.p, V.mul(e.d, L)));
    },
    props: (e) => [{ k: 'Base X', v: e.p.x }, { k: 'Base Y', v: e.p.y }, { k: 'Angle', v: deg(normAng(Math.atan2(e.d.y, e.d.x))), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.d = { x: Math.cos(rad(n)), y: Math.sin(rad(n)) }; } }],
    explode: () => null,
  };
}
const INFINITE = new Set(['xline', 'ray']);

def('XLINE', ['XL'], 'Construction line (infinite)', async () => {
  let p = await getPoint('Specify a point or [Hor/Ver/Ang]', { keywords: ['Hor', 'Ver', 'Ang'] });
  let fixedDir = null;
  if (p === 'Hor') fixedDir = { x: 1, y: 0 };
  else if (p === 'Ver') fixedDir = { x: 0, y: 1 };
  else if (p === 'Ang') { const a = await getAngle('Enter angle of xline (0)', { def: 0 }); if (typeof a !== 'number') return; fixedDir = { x: Math.cos(a), y: Math.sin(a) }; }
  if (fixedDir) {
    for (;;) {
      const q = await getPoint('Specify through point', { rubber: false, preview: (q) => [{ type: 'xline', p: q, d: fixedDir, layer: App.doc.cur }] });
      if (!isPt(q)) return; addEnt({ type: 'xline', p: q, d: fixedDir });
    }
  }
  if (!isPt(p)) return;
  for (;;) {
    const q = await getPoint('Specify through point', { base: p, preview: (q) => V.dist(p, q) > 1e-9 ? [{ type: 'xline', p, d: V.norm(V.sub(q, p)), layer: App.doc.cur }] : [] });
    if (!isPt(q)) return; if (V.dist(p, q) > 1e-9) addEnt({ type: 'xline', p, d: V.norm(V.sub(q, p)) });
  }
});
def('RAY', [], 'Ray (semi-infinite line)', async () => {
  const p = await getPoint('Specify start point'); if (!isPt(p)) return;
  for (;;) {
    const q = await getPoint('Specify through point', { base: p, preview: (q) => V.dist(p, q) > 1e-9 ? [{ type: 'ray', p, d: V.norm(V.sub(q, p)), layer: App.doc.cur }] : [] });
    if (!isPt(q)) return; if (V.dist(p, q) > 1e-9) addEnt({ type: 'ray', p, d: V.norm(V.sub(q, p)) });
  }
});

def('POINT', ['PO'], 'Create point objects', async () => {
  UI.log(`Current point modes: PDMODE=${App.doc.pdmode || 0}`);
  for (;;) { const p = await getPoint('Specify a point'); if (!isPt(p)) return; addEnt({ type: 'point', p }); }
});
def('DDPTYPE', ['PTYPE', 'PDMODE'], 'Point style', async () => {
  const k = await getKeyword('Point style [Dot/Plus/X/Circle/CPlus/CX] <Dot>', { keywords: ['Dot', 'Plus', 'X', 'Circle', 'CPlus', 'CX'], def: 'Dot' });
  App.doc.pdmode = { Dot: 0, Plus: 2, X: 3, Circle: 32, CPlus: 34, CX: 35 }[k] ?? 0; App.dirty = true;
});

// path helpers for DIVIDE / MEASURE
function pathOf(e) { const pl = entApprox(e)[0]; const cum = [0]; for (let i = 1; i < pl.length; i++) cum.push(cum[i - 1] + V.dist(pl[i - 1], pl[i])); return { pl, cum, L: cum[cum.length - 1] }; }
function pointAt(path, s) {
  const { pl, cum } = path; let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
  const t = (s - cum[i - 1]) / Math.max(1e-12, cum[i] - cum[i - 1]); return V.lerp(pl[i - 1], pl[i], Math.max(0, Math.min(1, t)));
}
const pathable = (e) => ['line', 'pline', 'arc', 'circle', 'spline'].includes(e.type);
def('DIVIDE', ['DIV'], 'Place points at equal segments along an object', async () => {
  const pick = await getEntity('Select object to divide', { filter: pathable }); if (!pick || typeof pick !== 'object') return;
  let n = await getDist('Enter the number of segments', {}); if (typeof n !== 'number') return; n = Math.round(n);
  if (n < 2 || n > 32767) { UI.log('Requires an integer between 2 and 32767.', 'err'); return; }
  const path = pathOf(pick.e); const closed = pick.e.type === 'circle' || pick.e.closed;
  for (let i = 1; i < (closed ? n + 0 : n); i++) addEnt({ type: 'point', p: pointAt(path, path.L * i / n) });
  if (!(App.doc.pdmode)) UI.log('Tip: use DDPTYPE to make points easier to see.', 'info');
});
def('MEASURE', ['ME'], 'Place points at a set distance along an object', async () => {
  const pick = await getEntity('Select object to measure', { filter: pathable }); if (!pick || typeof pick !== 'object') return;
  const d = await getDist('Specify length of segment'); if (typeof d !== 'number' || d <= 0) return;
  const path = pathOf(pick.e);
  let n = 0; for (let s = d; s < path.L - 1e-9 && n < 32767; s += d, n++) addEnt({ type: 'point', p: pointAt(path, s) });
  UI.log(`${n} point(s) placed.`);
});

def('LENGTHEN', ['LEN'], 'Change the length of lines and arcs', async () => {
  let mode = App.lenMode || 'DElta', val = App.lenVal || 10;
  for (;;) {
    const r = await getEntity(`Select an object to change [DElta/Percent/Total] (${mode} = ${fmt(val)})`, { filter: e => e.type === 'line' || e.type === 'arc', keywords: ['DElta', 'Percent', 'Total'] });
    if (r === null) return;
    if (typeof r === 'string') {
      mode = App.lenMode = r;
      const v = await getDist(`Enter ${r === 'DElta' ? 'delta length' : r === 'Percent' ? 'percentage length' : 'total length'} <${fmt(val)}>`, { def: val });
      if (typeof v === 'number') val = App.lenVal = v; continue;
    }
    const e = r.e;
    if (e.type === 'line') {
      const nearStart = V.dist(r.p, e.p1) < V.dist(r.p, e.p2);
      const L = V.dist(e.p1, e.p2), nl = mode === 'DElta' ? L + val : mode === 'Percent' ? L * val / 100 : val;
      if (nl <= 1e-9) { UI.log('Resulting length must be positive.', 'err'); continue; }
      if (nearStart) e.p1 = V.polar(e.p2, V.ang(e.p2, e.p1), nl); else e.p2 = V.polar(e.p1, V.ang(e.p1, e.p2), nl);
    } else {
      const span = normAng(e.a2 - e.a1), L = e.r * span;
      const nl = mode === 'DElta' ? L + val : mode === 'Percent' ? L * val / 100 : val;
      const ns = Math.min(TAU - 1e-6, nl / e.r); if (ns <= 1e-9) continue;
      const nearStart = V.dist(r.p, V.polar(e.c, e.a1, e.r)) < V.dist(r.p, V.polar(e.c, e.a2, e.r));
      if (nearStart) e.a1 = e.a2 - ns; else e.a2 = e.a1 + ns;
    }
    invalidate(e); App.dirty = true;
  }
});

def('PEDIT', ['PE'], 'Edit polylines: close, open, join, reverse, spline fit', async () => {
  const pick = await getEntity('Select polyline', { filter: e => ['pline', 'line', 'arc'].includes(e.type) });
  if (!pick || typeof pick !== 'object') return;
  let e = pick.e;
  if (e.type !== 'pline') {
    const k = await getKeyword('Object selected is not a polyline. Do you want to turn it into one? [Yes/No] <Y>', { keywords: ['Yes', 'No'], def: 'Yes' });
    if (k !== 'Yes') return;
    const n = inheritStyle(e, { type: 'pline', pts: e.type === 'line' ? [e.p1, e.p2] : entApprox(e)[0].map(V.clone), closed: false });
    removeEnts([e]); e = addEnt(n);
  }
  for (;;) {
    App.sel.clear(); App.sel.add(e.id); App.dirty = true;
    const k = await getKeyword(`Enter an option [${e.closed ? 'Open' : 'Close'}/Join/Reverse/Spline/Decurve] <exit>`, { keywords: [e.closed ? 'Open' : 'Close', 'Join', 'Reverse', 'Spline', 'Decurve'], def: 'exit' });
    if (k === 'exit' || !k) { App.sel.clear(); return; }
    if (k === 'Close') e.closed = true;
    if (k === 'Open') e.closed = false;
    if (k === 'Reverse') e.pts.reverse();
    if (k === 'Spline') { e.pts = splinePts(e.pts, e.closed, 8); if (e.closed) e.pts.pop(); }
    if (k === 'Decurve') { e.pts = e.pts.filter((p, i, a) => i === 0 || i === a.length - 1 || Math.abs(V.cross(V.sub(p, a[i - 1]), V.sub(a[i + 1], p))) > 1e-6 * Math.max(1, V.dist(a[i - 1], a[i + 1]) ** 2)); }
    if (k === 'Join') {
      App.sel.clear();
      const s = (await getSelection('Select objects to join', { noPickfirst: true })).filter(x => x !== e && ['line', 'pline', 'arc'].includes(x.type));
      const eq = (a, b) => V.dist(a, b) < 1e-6 * Math.max(1, Math.abs(a.x) + Math.abs(a.y));
      let added = 0, changed = true;
      while (changed) {
        changed = false;
        for (const o of s) {
          if (o._used) continue;
          const pts = o.type === 'line' ? [o.p1, o.p2] : o.type === 'pline' ? o.pts : entApprox(o)[0];
          const A = e.pts[0], B = e.pts[e.pts.length - 1];
          if (eq(B, pts[0])) e.pts.push(...pts.slice(1)); else if (eq(B, pts[pts.length - 1])) e.pts.push(...pts.slice(0, -1).reverse());
          else if (eq(A, pts[pts.length - 1])) e.pts.unshift(...pts.slice(0, -1)); else if (eq(A, pts[0])) e.pts.unshift(...pts.slice(1).reverse());
          else continue;
          o._used = true; changed = true; added++;
        }
      }
      removeEnts(s.filter(o => o._used));
      UI.log(`${added} segment(s) added to polyline.`);
    }
    invalidate(e); App.dirty = true;
  }
});

// ---------- DIMCONTINUE / DIMBASELINE ----------
function lastLinearDim() { return [...App.doc.ents].reverse().find(e => e.type === 'dim' && (!e.kind || e.kind === 'lin')); }
async function dimChain(baseline) {
  let last = lastLinearDim();
  if (!last) { UI.log('No linear dimension to continue from. Create one with DIMLINEAR first.', 'err'); return; }
  const step = (last.h || 2.5) * 3.75;
  for (;;) {
    const q = await getPoint('Specify a second extension line origin or <exit>', { preview: (q) => [mk(q)] });
    if (!isPt(q)) return;
    const d = addEnt(mk(q));
    last = d;
    function mk(q) {
      const n = V.perp({ x: Math.cos(last.ang), y: Math.sin(last.ang) });
      const p3 = baseline ? V.add(last.p3, V.mul(n, step * Math.sign(V.dot(V.sub(last.p3, last.p1), n) || 1))) : last.p3;
      return { type: 'dim', p1: baseline ? last.p1 : last.p2, p2: q, p3, ang: last.ang, h: last.h, prec: last.prec, layer: last.layer };
    }
  }
}
def('DIMCONTINUE', ['DCO', 'DIMCONT'], 'Continue a linear dimension', () => dimChain(false));
def('DIMBASELINE', ['DBA', 'DIMBASE'], 'Baseline linear dimensions', () => dimChain(true));

def('DIMSTYLE', ['D', 'DST', 'DDIM'], 'Dimension style settings', async () => {
  const h = await getDist(`Dimension text height <${fmt(App.doc.dimH)}>`, { def: App.doc.dimH }); if (typeof h !== 'number' || h <= 0) return;
  const p = await getDist(`Decimal places <${App.doc.dimPrec ?? 2}>`, { def: App.doc.dimPrec ?? 2 }); if (typeof p !== 'number') return;
  App.doc.dimH = h; App.doc.dimPrec = Math.max(0, Math.min(8, Math.round(p)));
  const k = await getKeyword('Apply to existing dimensions? [Yes/No] <Yes>', { keywords: ['Yes', 'No'], def: 'Yes' });
  if (k === 'Yes') App.doc.ents.forEach(e => { if (e.type === 'dim' || e.type === 'leader') { e.h = h; if (e.type === 'dim' && e.kind !== 'ang') e.prec = App.doc.dimPrec; invalidate(e); } });
  App.dirty = true;
});

// ---------- GROUP ----------
function groups() { if (!Array.isArray(App.doc.groups)) App.doc.groups = []; return App.doc.groups; }
function groupOf(id) { return groups().find(g => g.ids.includes(id)); }
def('GROUP', ['G'], 'Group objects so they select together', async () => {
  const s = await getSelection('Select objects'); if (s.length < 2) { UI.log('Select at least two objects.'); return; }
  const name = `*A${groups().length + 1}`;
  App.doc.groups = groups().map(g => ({ ...g, ids: g.ids.filter(id => !s.some(e => e.id === id)) })).filter(g => g.ids.length > 1);
  App.doc.groups.push({ name, ids: s.map(e => e.id) });
  UI.log(`Group "${name}" has been created with ${s.length} objects.`);
});
def('UNGROUP', [], 'Explode a group', async () => {
  const s = await getSelection('Select group'); const ids = new Set(s.map(e => e.id));
  const before = groups().length; App.doc.groups = groups().filter(g => !g.ids.some(id => ids.has(id)));
  UI.log(`${before - App.doc.groups.length} group(s) exploded.`);
});

// ---------- selection helpers ----------
def('SELECTSIMILAR', ['SIMILAR'], 'Select all objects of the same type and layer', async () => {
  const s = await getSelection('Select objects'); if (!s.length) return;
  const keys = new Set(s.map(e => e.type + '|' + e.layer));
  App.usedSel = false;
  App.sel.clear(); App.doc.ents.forEach(e => { if (editable(e) && keys.has(e.type + '|' + e.layer)) App.sel.add(e.id); });
  UI.log(`${App.sel.size} found`);
}, { noUndo: true });
def('QSELECT', ['QSE'], 'Quick select by object type, layer or color', async () => {
  const types = ['All', ...new Set(App.doc.ents.map(e => Types[e.type].label.replace(/\s+/g, '')))];
  const t = await getKeyword(`Object type [${types.join('/')}] <All>`, { keywords: types, def: 'All' });
  const layers = ['*', ...App.doc.layers.map(l => l.name)];
  const L = (await getString(`Layer name or * for any <*>`)).trim() || '*';
  App.sel.clear();
  App.doc.ents.forEach(e => {
    if (!editable(e)) return;
    if (t !== 'All' && Types[e.type].label.replace(/\s+/g, '') !== t) return;
    if (L !== '*' && e.layer.toLowerCase() !== L.toLowerCase()) return;
    App.sel.add(e.id);
  });
  void layers;
  UI.log(`${App.sel.size} item(s) selected.`);
}, { noUndo: true });

// ---------- cleanup ----------
def('PURGE', ['PU', '-PURGE'], 'Remove unused layers and blocks', async () => {
  const usedL = new Set(App.doc.ents.map(e => e.layer));
  Object.values(App.doc.blocks || {}).forEach(b => b.ents.forEach(e => usedL.add(e.layer)));
  const usedB = new Set();
  const markB = (ents) => ents.forEach(e => { if (e.type === 'insert' && !usedB.has(e.name)) { usedB.add(e.name); const b = App.doc.blocks[e.name]; if (b) markB(b.ents); } });
  markB(App.doc.ents);
  const lb = App.doc.layers.length, bb = Object.keys(App.doc.blocks || {}).length;
  App.doc.layers = App.doc.layers.filter(l => l.name === '0' || l.name === App.doc.cur || l.name === 'Dimensions' || usedL.has(l.name));
  for (const n of Object.keys(App.doc.blocks || {})) if (!usedB.has(n)) delete App.doc.blocks[n];
  UI.log(`Purged ${lb - App.doc.layers.length} layer(s) and ${bb - Object.keys(App.doc.blocks || {}).length} block(s).`);
});
def('OVERKILL', ['OV'], 'Delete duplicate and zero-length objects', async () => {
  const s = await getSelection('Select objects'); const seen = new Set(); const kill = [];
  const r6 = (o) => JSON.stringify(o, (k, v) => (k === 'id' ? undefined : typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
  for (const e of s) {
    if (e.type === 'line' && V.dist(e.p1, e.p2) < 1e-9) { kill.push(e); continue; }
    let key = r6(e);
    if (e.type === 'line') { const a = r6({ ...e, p1: e.p2, p2: e.p1 }); if (seen.has(a)) { kill.push(e); continue; } }
    if (seen.has(key)) kill.push(e); else seen.add(key);
  }
  removeEnts(kill); UI.log(`${kill.length} duplicate(s) deleted.`);
});

// ---------- DONUT / REVCLOUD ----------
def('DONUT', ['DO', 'DOUGHNUT'], 'Filled ring or dot', async () => {
  const di = await getDist(`Specify inside diameter of donut <${fmt(App.donutIn ?? 5)}>`, { def: App.donutIn ?? 5 }); if (typeof di !== 'number') return;
  const dout = await getDist(`Specify outside diameter of donut <${fmt(App.donutOut ?? 10)}>`, { def: App.donutOut ?? 10 }); if (typeof dout !== 'number') return;
  App.donutIn = di; App.donutOut = dout;
  const mk = (c) => ({ type: 'hatch', pat: 'SOLID', scale: 1, ang: 0, loops: di > 0 ? [arcPts(c, dout / 2, 0, undefined, 64).slice(0, -1), arcPts(c, di / 2, 0, undefined, 64).slice(0, -1)] : [arcPts(c, dout / 2, 0, undefined, 64).slice(0, -1)], layer: App.doc.cur });
  for (;;) { const c = await getPoint('Specify center of donut or <exit>', { preview: (q) => [mk(q)] }); if (!isPt(c)) return; const h = mk(c); delete h.layer; addEnt(h); }
});
def('REVCLOUD', ['RC'], 'Rectangular revision cloud', async () => {
  const a = await getPoint('Specify first corner point'); if (!isPt(a)) return;
  const arcLen = App.rcArc || Math.max(px(30), 1);
  const mk = (b) => {
    const corners = rectPts(a, b), pts = [];
    for (let i = 0; i < 4; i++) {
      const p = corners[i], q = corners[(i + 1) % 4], L = V.dist(p, q), n = Math.max(1, Math.round(L / arcLen));
      for (let k = 0; k < n; k++) {
        const s = V.lerp(p, q, k / n), t = V.lerp(p, q, (k + 1) / n), m = V.mid(s, t), r = V.dist(s, t) / 2, a0 = V.ang(m, s);
        for (let j = 0; j < 8; j++) pts.push(V.polar(m, a0 - Math.PI * j / 8, r));
      }
    }
    return { type: 'pline', pts, closed: true };
  };
  const b = await getPoint('Specify opposite corner', { rubber: false, preview: (q) => [{ ...mk(q), layer: App.doc.cur }] }); if (!isPt(b)) return;
  addEnt(mk(b));
});

// ---------- ALIGN ----------
def('ALIGN', ['AL'], 'Move, rotate and optionally scale objects using point pairs', async () => {
  const s = await getSelection(); if (!s.length) return;
  const s1 = await getPoint('Specify first source point'); if (!isPt(s1)) return;
  const d1 = await getPoint('Specify first destination point', { base: s1 }); if (!isPt(d1)) return;
  const s2 = await getPoint('Specify second source point or <continue>');
  if (!isPt(s2)) { const m = M.translate(d1.x - s1.x, d1.y - s1.y); s.forEach(e => entTransform(e, m)); return; }
  const d2 = await getPoint('Specify second destination point', { base: s2 }); if (!isPt(d2)) return;
  const k = await getKeyword('Scale objects based on alignment points? [Yes/No] <N>', { keywords: ['Yes', 'No'], def: 'No' });
  const ang = V.ang(d1, d2) - V.ang(s1, s2);
  const sc = k === 'Yes' ? V.dist(d1, d2) / Math.max(1e-12, V.dist(s1, s2)) : 1;
  const T = M.translate(d1.x - s1.x, d1.y - s1.y), Rm = M.rotate(d1, ang), Sm = M.scale(d1, sc);
  s.forEach(e => { entTransform(e, T); entTransform(e, Rm); if (sc !== 1) entTransform(e, Sm); });
});

// ---------- BOUNDARY ----------
def('BOUNDARY', ['BO', 'BPOLY'], 'Create a closed polyline from an enclosed area', async () => {
  for (;;) {
    const p = await getPoint('Pick internal point or <exit>', { noSnap: true, rubber: false }); if (!isPt(p)) return;
    const loops = findBoundary(p);
    if (!loops) { UI.log('Valid boundary not found.', 'err'); continue; }
    addEnt({ type: 'pline', pts: loops[0].map(V.clone), closed: true });
    UI.log('BOUNDARY created 1 polyline.');
  }
});

def('UNITS', ['UN', 'LUPREC'], 'Set display precision of coordinates', async () => {
  const v = await getDist(`Linear precision (decimal places) <${App.prec ?? 4}>`, { def: App.prec ?? 4 });
  if (typeof v === 'number') { App.prec = Math.max(0, Math.min(8, Math.round(v))); UI.updateCoords(); }
}, { noUndo: true });
