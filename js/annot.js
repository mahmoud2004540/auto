// Spline, multiline text (MText) and tables
'use strict';

// ---------- spline (fit points, Catmull-Rom interpolation) ----------
function splinePts(P, closed, seg = 16) {
  const n = P.length;
  if (n < 3) return closed && n === 2 ? [...P, P[0]] : P.slice();
  const get = (i) => {
    if (closed) return P[((i % n) + n) % n];
    if (i < 0) return V.sub(V.mul(P[0], 2), P[1]);
    if (i > n - 1) return V.sub(V.mul(P[n - 1], 2), P[n - 2]);
    return P[i];
  };
  const out = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(closed ? P[0] : P[n - 1]);
  return out;
}
Types.spline = {
  label: 'Spline',
  approx: (e) => [splinePts(e.pts, e.closed)],
  snaps: (e) => [{ p: e.pts[0], t: 'end' }, { p: e.pts[e.pts.length - 1], t: 'end' }, ...e.pts.slice(1, -1).map(p => ({ p, t: 'node' }))],
  grips: (e) => e.pts.map((p, i) => ({ p, set: (x, q) => { x.pts[i] = q; } })),
  transform: (e, m) => { e.pts = e.pts.map(p => M.apply(m, p)); },
  draw: (R, e) => R.poly(splinePts(e.pts, e.closed), false),
  props: (e) => {
    const a = splinePts(e.pts, e.closed); let L = 0; for (let i = 1; i < a.length; i++) L += V.dist(a[i - 1], a[i]);
    return [{ k: 'Fit points', v: e.pts.length }, { k: 'Closed', v: e.closed ? 'Yes' : 'No', set: (x, v) => { x.closed = /^(y|yes|1|true)$/i.test(v.trim()); } }, { k: 'Length', v: L }];
  },
  explode: (e) => [{ type: 'pline', pts: splinePts(e.pts, e.closed).map(V.clone), closed: false }],
};

// ---------- multiline text ----------
function mtextLines(e) {
  const out = [];
  for (const para of String(e.s || '').split('\n')) {
    if (!e.w || e.w <= 0) { out.push(para); continue; }
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      const t = line + word;
      if (line && textWidth(t.trimEnd(), e.h) > e.w) { out.push(line.trimEnd()); line = word.trimStart(); } else line = t;
    }
    out.push(line);
  }
  return out;
}
function mtextLayout(e) {
  const rot = e.rot || 0, ux = { x: Math.cos(rot), y: Math.sin(rot) }, uy = V.perp(ux);
  const lines = mtextLines(e), step = e.h * 1.66 * (e.lsp || 1);
  const items = lines.map((s, i) => ({ p: V.add(e.p, V.mul(uy, -(e.h + i * step))), s }));
  const w = e.w > 0 ? e.w : Math.max(e.h, ...lines.map(s => textWidth(s, e.h)));
  const hgt = e.h + (lines.length - 1) * step + e.h * 0.4;
  const pt = (a, b) => V.add(e.p, V.add(V.mul(ux, a), V.mul(uy, -b)));
  return { items, rot, box: [pt(0, 0), pt(w, 0), pt(w, hgt), pt(0, hgt), pt(0, 0)], w, hgt };
}
Types.mtext = {
  label: 'MText',
  approx: (e) => [mtextLayout(e).box],
  snaps: (e) => [{ p: e.p, t: 'ins' }],
  grips: (e) => {
    const L = mtextLayout(e);
    return [{ p: e.p, set: (x, p) => { x.p = p; } }, { p: L.box[1], set: (x, p) => { x.w = Math.max(x.h, V.dot(V.sub(p, x.p), { x: Math.cos(x.rot || 0), y: Math.sin(x.rot || 0) })); } }];
  },
  transform: (e, m) => {
    const k = Math.sqrt(Math.abs(M.det(m)));
    const dv = M.vec(m, { x: Math.cos(e.rot || 0), y: Math.sin(e.rot || 0) });
    e.p = M.apply(m, e.p); e.rot = Math.atan2(dv.y, dv.x); e.h *= k; if (e.w) e.w *= k;
  },
  draw: (R, e) => { const L = mtextLayout(e); for (const it of L.items) if (it.s) R.text(it.p, e.h, L.rot, it.s); },
  props: (e) => [
    { k: 'Contents', v: String(e.s || '').replace(/\n/g, '\\P'), str: true, set: (x, v) => { x.s = v.replace(/\\P/g, '\n'); } },
    { k: 'Text height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
    { k: 'Defined width', v: e.w || 0, set: (x, v) => { const n = parseFloat(v); if (n >= 0) x.w = n; } },
    { k: 'Line spacing', v: e.lsp || 1, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.lsp = n; } },
    { k: 'Rotation', v: deg(normAng(e.rot || 0)), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.rot = rad(n); } },
  ],
  explode: (e) => { const L = mtextLayout(e); return L.items.filter(i => i.s).map(i => ({ type: 'text', p: i.p, h: e.h, rot: L.rot, s: i.s })); },
};

// ---------- table ----------
function tableGeom(e) {
  const xs = [0]; e.cw.forEach(w => xs.push(xs[xs.length - 1] + w));
  const W = xs[xs.length - 1], H = e.rh * e.rows;
  const P = (x, y) => ({ x: e.p.x + x, y: e.p.y - y });
  const lines = [];
  for (let r = 0; r <= e.rows; r++) lines.push([P(0, r * e.rh), P(W, r * e.rh)]);
  for (let c = 0; c < xs.length; c++) {
    // title row (row 0) is merged across all columns
    const y0 = (c === 0 || c === xs.length - 1 || !e.title) ? 0 : e.rh;
    lines.push([P(xs[c], y0), P(xs[c], H)]);
  }
  const texts = [];
  for (let r = 0; r < e.rows; r++) for (let c = 0; c < e.cols; c++) {
    const s = (e.cells[r] && e.cells[r][c]) || '';
    if (!s) continue;
    if (e.title && r === 0) {
      if (c > 0) continue;
      const w = textWidth(s, e.h * 1.2);
      texts.push({ p: P((W - w) / 2, r * e.rh + (e.rh + e.h * 1.2) / 2), h: e.h * 1.2, s });
    } else {
      const w = textWidth(s, e.h);
      const x = r === 1 && e.title ? xs[c] + (e.cw[c] - w) / 2 : xs[c] + e.h * 0.6;
      texts.push({ p: P(x, r * e.rh + (e.rh + e.h) / 2), h: e.h, s });
    }
  }
  return { lines, texts, W, H, xs, P };
}
function tableCellAt(e, p) {
  const g = tableGeom(e);
  const x = p.x - e.p.x, y = e.p.y - p.y;
  if (x < 0 || y < 0 || x > g.W || y > g.H) return null;
  const r = Math.min(e.rows - 1, Math.floor(y / e.rh));
  let c = 0; while (c < e.cols - 1 && x > g.xs[c + 1]) c++;
  return { r, c: e.title && r === 0 ? 0 : c };
}
Types.table = {
  label: 'Table',
  approx: (e) => tableGeom(e).lines,
  snaps: (e) => { const g = tableGeom(e); return [g.P(0, 0), g.P(g.W, 0), g.P(g.W, g.H), g.P(0, g.H)].map(p => ({ p, t: 'end' })); },
  grips: (e) => [{ p: e.p, set: (x, p) => { x.p = p; } }],
  transform: (e, m) => {
    const k = Math.sqrt(Math.abs(M.det(m)));
    e.p = M.apply(m, e.p); e.rh *= k; e.h *= k; e.cw = e.cw.map(w => w * k);
  },
  draw: (R, e) => {
    const g = tableGeom(e);
    for (const [a, b] of g.lines) R.line(a, b);
    for (const t of g.texts) R.text(t.p, t.h, 0, t.s);
  },
  props: (e) => [
    { k: 'Rows', v: e.rows }, { k: 'Columns', v: e.cols },
    { k: 'Row height', v: e.rh, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.rh = n; } },
    { k: 'Text height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
    { k: 'Tip', v: 'Double-click a cell to edit' },
  ],
  explode: (e) => { const g = tableGeom(e); return [...g.lines.map(([a, b]) => ({ type: 'line', p1: a, p2: b })), ...g.texts.map(t => ({ type: 'text', p: t.p, h: t.h, rot: 0, s: t.s }))]; },
};

// ---------- in-place text editor ----------
function editTextInPlace(p, wWorld, h, initial, multiline = true) {
  return new Promise((res, rej) => {
    const vp = document.getElementById('viewport');
    const box = document.createElement('div');
    box.className = 'mteditor';
    const sp = w2s(p);
    box.innerHTML = `<div class="mtbar"><span>${multiline ? 'Text Editor' : 'Cell'}</span><span class="muted">Ctrl+Enter = OK · Esc = Cancel</span><button class="btn pri" data-a="ok">OK</button><button class="btn" data-a="cancel">Cancel</button></div><textarea spellcheck="false"></textarea>`;
    vp.appendChild(box);
    const ta = box.querySelector('textarea');
    ta.value = initial || '';
    ta.style.fontSize = Math.max(12, Math.min(40, h * App.view.s)) + 'px';
    ta.style.width = Math.max(200, Math.min(CW - 40, (wWorld || 0) * App.view.s || 320)) + 'px';
    ta.rows = multiline ? Math.max(3, (initial || '').split('\n').length + 1) : 1;
    box.style.left = Math.max(4, Math.min(sp.x, CW - 220)) + 'px';
    box.style.top = Math.max(4, Math.min(sp.y - 30, CH - 160)) + 'px';
    const cleanup = () => { box.remove(); };
    const r = { kind: 'mtext', prompt: 'Enter text', res, rej, cleanup };
    App.req = r; UI.setPrompt(multiline ? 'Enter multiline text (Ctrl+Enter to finish)' : 'Enter cell text', null);
    const ok = () => { if (App.req !== r) return; App.req = null; cleanup(); res(ta.value); };
    const cancel = () => { if (App.req !== r) return; App.req = null; cleanup(); rej(new Cancel()); };
    box.querySelector('[data-a=ok]').onclick = ok;
    box.querySelector('[data-a=cancel]').onclick = cancel;
    ta.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
      else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey || !multiline)) { ev.preventDefault(); ok(); }
    });
    setTimeout(() => ta.focus(), 0);
  });
}

// ---------- commands ----------
def('MTEXT', ['MT', 'T'], 'Multiline text with word wrap', async () => {
  const a = await getPoint('Specify first corner'); if (!isPt(a)) return;
  const h = App.doc.textH;
  const b = await getPoint('Specify opposite corner', { rubber: false, keywords: ['Height'], preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, color: '#4a8cff', dash: true }] });
  let hh = h, q = b;
  if (b === 'Height') {
    const v = await getDist(`Specify height <${fmt(h)}>`, { def: h }); if (typeof v !== 'number') return;
    hh = App.doc.textH = v;
    q = await getPoint('Specify opposite corner', { rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, color: '#4a8cff', dash: true }] });
  }
  if (!isPt(q)) return;
  const tl = { x: Math.min(a.x, q.x), y: Math.max(a.y, q.y) };
  const w = Math.abs(q.x - a.x);
  const s = await editTextInPlace(tl, w, hh, '');
  if (!s.trim()) return;
  addEnt({ type: 'mtext', p: tl, w, h: hh, s, rot: 0 });
});

def('TABLE', ['TB'], 'Insert a table', async () => {
  let cols = await getDist('Enter number of columns <5>', { def: 5 }); if (typeof cols !== 'number') return;
  let rows = await getDist('Enter number of data rows <4>', { def: 4 }); if (typeof rows !== 'number') return;
  cols = Math.max(1, Math.min(50, Math.round(cols))); rows = Math.max(1, Math.min(200, Math.round(rows)));
  const h = App.doc.textH;
  const cw0 = await getDist(`Specify column width <${fmt(h * 10)}>`, { def: h * 10 }); if (typeof cw0 !== 'number') return;
  const mk = (p) => {
    const cells = [['Title', ...Array(cols - 1).fill('')], Array.from({ length: cols }, (_, i) => 'Header ' + (i + 1))];
    for (let r = 0; r < rows; r++) cells.push(Array(cols).fill(''));
    return { type: 'table', p, rows: rows + 2, cols, rh: h * 2.2, cw: Array(cols).fill(cw0), h, cells, title: true, layer: App.doc.cur };
  };
  const p = await getPoint('Specify insertion point (top-left)', { rubber: false, preview: (q) => [mk(q)] });
  if (!isPt(p)) return;
  const t = mk(p); delete t.layer;
  addEnt(t);
  UI.log('Table created. Double-click a cell to edit its text.', 'info');
});

def('SPLINE', ['SPL'], 'Draw a smooth spline through fit points', async () => {
  const p0 = await getPoint('Specify first point'); if (!isPt(p0)) return;
  const pts = [p0];
  for (;;) {
    const kws = pts.length >= 3 ? ['Close', 'Undo'] : ['Undo'];
    const p = await getPoint('Enter next point', { base: pts[pts.length - 1], keywords: kws, preview: (q) => [{ type: 'spline', pts: [...pts, q], closed: false, layer: App.doc.cur }] });
    if (p === null) break;
    if (p === 'Undo') { if (pts.length > 1) pts.pop(); continue; }
    if (p === 'Close') { addEnt({ type: 'spline', pts, closed: true }); return; }
    pts.push(p);
  }
  if (pts.length > 1) addEnt({ type: 'spline', pts, closed: false });
});

def('TEXTEDIT', ['ED', 'DDEDIT', 'MTEDIT'], 'Edit text, MText or table cells', async () => {
  for (;;) {
    const pick = await getEntity('Select an annotation object or <exit>', { filter: e => ['text', 'mtext', 'table'].includes(e.type) });
    if (!pick || typeof pick !== 'object') return;
    await editEntityText(pick.e, pick.p);
  }
});
async function editEntityText(e, at) {
  if (e.type === 'mtext') { e.s = await editTextInPlace(e.p, e.w, e.h, e.s); }
  else if (e.type === 'text') { e.s = (await editTextInPlace(V.add(e.p, { x: 0, y: e.h }), textWidth(e.s, e.h) * 1.3, e.h, e.s, false)).replace(/\n/g, ' '); }
  else if (e.type === 'table') {
    const c = tableCellAt(e, at); if (!c) return;
    const g = tableGeom(e);
    const s = await editTextInPlace(g.P(g.xs[c.c], c.r * e.rh), e.title && c.r === 0 ? g.W : e.cw[c.c], e.h, (e.cells[c.r] || [])[c.c] || '', false);
    if (!e.cells[c.r]) e.cells[c.r] = [];
    e.cells[c.r][c.c] = s.replace(/\n/g, ' ');
  }
  invalidate(e); App.dirty = true;
}
