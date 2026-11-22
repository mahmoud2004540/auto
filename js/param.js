// Parametric drawing: geometric + dimensional constraints on lines, with an iterative solver
'use strict';

const CON_LABEL = { hor: 'H', ver: 'V', par: '∥', perp: '⊥', eq: '=', fix: '🔒', coin: '▪', len: 'L' };
function cons() { if (!Array.isArray(App.doc.cons)) App.doc.cons = []; return App.doc.cons; }
const entById = (id) => App.doc.ents.find(e => e.id === id);

function solveConstraints(pinned = new Set()) {
  const list = cons();
  if (!list.length) return;
  // drop constraints whose lines are gone
  App.doc.cons = list.filter(c => [c.a, c.b].every(id => id === undefined || (entById(id) && entById(id).type === 'line')));
  const C = App.doc.cons;
  if (!C.length) return;
  const pin = new Set(pinned);
  for (const c of C) if (c.t === 'fix') pin.add(c.a + ':' + c.k);
  const isPin = (e, k) => pin.has(e.id + ':' + k);
  const touched = new Set();
  const setPt = (e, k, p) => { if (!isPin(e, k)) { e[k] = p; touched.add(e); } };
  const rotLine = (e, ang) => {
    const L = V.dist(e.p1, e.p2);
    if (isPin(e, 'p1') && isPin(e, 'p2')) return;
    if (isPin(e, 'p2')) { setPt(e, 'p1', V.polar(e.p2, ang + Math.PI, L)); return; }
    if (isPin(e, 'p1')) { setPt(e, 'p2', V.polar(e.p1, ang, L)); return; }
    const m = V.mid(e.p1, e.p2); setPt(e, 'p1', V.polar(m, ang + Math.PI, L / 2)); setPt(e, 'p2', V.polar(m, ang, L / 2));
  };
  const setLen = (e, L) => {
    const a = V.ang(e.p1, e.p2);
    if (isPin(e, 'p2') && !isPin(e, 'p1')) setPt(e, 'p1', V.polar(e.p2, a + Math.PI, L));
    else setPt(e, 'p2', V.polar(e.p1, a, L));
  };
  const near = (a, b, tol) => Math.abs(normAng(a - b + Math.PI) - Math.PI) < tol;
  for (let it = 0; it < 80; it++) {
    let err = 0;
    for (const c of C) {
      const a = entById(c.a), b = c.b !== undefined ? entById(c.b) : null;
      switch (c.t) {
        case 'fix': if (!V.eq(a[c.k], c.at, 1e-9)) { a[c.k] = V.clone(c.at); touched.add(a); } break;
        case 'hor': {
          const d = a.p2.y - a.p1.y; if (Math.abs(d) < 1e-9) break; err += Math.abs(d);
          if (isPin(a, 'p1')) setPt(a, 'p2', { x: a.p2.x, y: a.p1.y });
          else if (isPin(a, 'p2')) setPt(a, 'p1', { x: a.p1.x, y: a.p2.y });
          else { const y = (a.p1.y + a.p2.y) / 2; setPt(a, 'p1', { x: a.p1.x, y }); setPt(a, 'p2', { x: a.p2.x, y }); }
          break;
        }
        case 'ver': {
          const d = a.p2.x - a.p1.x; if (Math.abs(d) < 1e-9) break; err += Math.abs(d);
          if (isPin(a, 'p1')) setPt(a, 'p2', { x: a.p1.x, y: a.p2.y });
          else if (isPin(a, 'p2')) setPt(a, 'p1', { x: a.p2.x, y: a.p1.y });
          else { const x = (a.p1.x + a.p2.x) / 2; setPt(a, 'p1', { x, y: a.p1.y }); setPt(a, 'p2', { x, y: a.p2.y }); }
          break;
        }
        case 'par': case 'perp': {
          const aa = V.ang(a.p1, a.p2) + (c.t === 'perp' ? Math.PI / 2 : 0), ab = V.ang(b.p1, b.p2);
          // choose the nearer of the two equivalent directions
          let target = near(ab, aa, Math.PI / 2) ? aa : aa + Math.PI;
          if (near(ab, target, 1e-10)) break;
          err += Math.abs(normAng(ab - target + Math.PI) - Math.PI);
          const bLocked = isPin(b, 'p1') && isPin(b, 'p2');
          if (bLocked) rotLine(a, ab - (c.t === 'perp' ? Math.PI / 2 : 0) + (target === aa ? 0 : Math.PI));
          else rotLine(b, target);
          break;
        }
        case 'eq': {
          const La = V.dist(a.p1, a.p2), Lb = V.dist(b.p1, b.p2);
          if (Math.abs(La - Lb) < 1e-9) break; err += Math.abs(La - Lb);
          if (isPin(b, 'p1') && isPin(b, 'p2')) setLen(a, Lb); else setLen(b, La);
          break;
        }
        case 'len': {
          const L = V.dist(a.p1, a.p2); if (Math.abs(L - c.v) < 1e-9) break; err += Math.abs(L - c.v);
          setLen(a, c.v); break;
        }
        case 'coin': {
          const pa = a[c.ka], pb = b[c.kb];
          if (V.eq(pa, pb, 1e-9)) break; err += V.dist(pa, pb);
          if (isPin(a, c.ka) && !isPin(b, c.kb)) setPt(b, c.kb, V.clone(pa));
          else if (isPin(b, c.kb) && !isPin(a, c.ka)) setPt(a, c.ka, V.clone(pb));
          else if (!isPin(a, c.ka)) { const m = V.mid(pa, pb); setPt(a, c.ka, m); setPt(b, c.kb, V.clone(m)); }
          break;
        }
        default: break;
      }
    }
    if (err < 1e-9) break;
  }
  touched.forEach(invalidate);
  App.dirty = true;
}

// draw constraint badges (screen space) in model view
function drawConstraints(g) {
  if (!App.modes.cons) return;
  const C = cons(); if (!C.length) return;
  const per = new Map();
  g.save();
  g.font = '11px sans-serif'; g.textBaseline = 'middle';
  for (const c of C) {
    const a = entById(c.a); if (!a || !visible(a)) continue;
    if (c.t === 'coin') { const p = w2s(a[c.ka]); g.fillStyle = '#4aa8ff'; g.fillRect(p.x - 3, p.y - 3, 6, 6); continue; }
    const n = per.get(a.id) || 0; per.set(a.id, n + 1);
    const m = w2s(c.t === 'fix' ? a[c.k] : V.mid(a.p1, a.p2));
    const label = c.t === 'len' ? `d=${fmt(c.v, 2)}` : CON_LABEL[c.t];
    const w = g.measureText(label).width + 8;
    const x = m.x + 8 + n * (w + 2), y = m.y - 12;
    g.fillStyle = c.t === 'len' ? 'rgba(30,60,110,.92)' : 'rgba(55,63,75,.92)';
    g.fillRect(x, y - 8, w, 16);
    g.strokeStyle = '#7f8b9a'; g.lineWidth = 1; g.strokeRect(x + 0.5, y - 7.5, w - 1, 15);
    g.fillStyle = c.t === 'len' ? '#9fd0ff' : '#e6eaf0'; g.fillText(label, x + 4, y);
  }
  g.restore();
}

// ---------- commands ----------
const isLine = (e) => e.type === 'line';
async function pickLine(prompt) { const p = await getEntity(prompt, { filter: isLine }); return p && typeof p === 'object' ? p : null; }
function addCon(c) { cons().push(c); solveConstraints(); }

def('GCHORIZONTAL', ['GCH'], 'Constrain a line to be horizontal', async () => { const p = await pickLine('Select a line'); if (p) addCon({ t: 'hor', a: p.e.id }); });
def('GCVERTICAL', ['GCV'], 'Constrain a line to be vertical', async () => { const p = await pickLine('Select a line'); if (p) addCon({ t: 'ver', a: p.e.id }); });
def('GCPARALLEL', ['GCPA'], 'Make the second line parallel to the first', async () => {
  const a = await pickLine('Select first line'); if (!a) return; App.sel.add(a.e.id); App.usedSel = true; App.dirty = true;
  const b = await pickLine('Select second line'); if (!b || b.e === a.e) return; addCon({ t: 'par', a: a.e.id, b: b.e.id });
});
def('GCPERPENDICULAR', ['GCPE'], 'Make the second line perpendicular to the first', async () => {
  const a = await pickLine('Select first line'); if (!a) return; App.sel.add(a.e.id); App.usedSel = true; App.dirty = true;
  const b = await pickLine('Select second line'); if (!b || b.e === a.e) return; addCon({ t: 'perp', a: a.e.id, b: b.e.id });
});
def('GCEQUAL', ['GCE'], 'Make two lines equal in length', async () => {
  const a = await pickLine('Select first line'); if (!a) return; App.sel.add(a.e.id); App.usedSel = true; App.dirty = true;
  const b = await pickLine('Select second line'); if (!b || b.e === a.e) return; addCon({ t: 'eq', a: a.e.id, b: b.e.id });
});
const endKey = (e, p) => (V.dist(e.p1, p) <= V.dist(e.p2, p) ? 'p1' : 'p2');
def('GCCOINCIDENT', ['GCCO'], 'Join two line endpoints', async () => {
  const a = await pickLine('Select first line near the endpoint'); if (!a) return; App.sel.add(a.e.id); App.usedSel = true; App.dirty = true;
  const b = await pickLine('Select second line near the endpoint'); if (!b || b.e === a.e) return;
  addCon({ t: 'coin', a: a.e.id, ka: endKey(a.e, a.p), b: b.e.id, kb: endKey(b.e, b.p) });
});
def('GCFIX', ['GCF'], 'Fix a line endpoint in place', async () => {
  const a = await pickLine('Select a line near the endpoint to fix'); if (!a) return;
  const k = endKey(a.e, a.p); addCon({ t: 'fix', a: a.e.id, k, at: V.clone(a.e[k]) });
});
def('DCLINEAR', ['DCL', 'DCALIGNED', 'DCDIMENSION'], 'Dimensional constraint: fix the length of a line', async () => {
  const a = await pickLine('Select a line'); if (!a) return;
  const L0 = V.dist(a.e.p1, a.e.p2);
  const v = await getDist(`Specify length <${fmt(L0)}>`, { def: L0 }); if (typeof v !== 'number' || v <= 0) return;
  App.doc.cons = cons().filter(c => !(c.t === 'len' && c.a === a.e.id));
  addCon({ t: 'len', a: a.e.id, v });
});
def('AUTOCONSTRAIN', ['AUTOC'], 'Add coincident, horizontal and vertical constraints automatically', async () => {
  const s = (await getSelection('Select lines')).filter(isLine);
  let n = 0; const tol = px(2);
  const has = (t, a) => cons().some(c => c.t === t && c.a === a);
  for (const e of s) {
    const a = normAng(V.ang(e.p1, e.p2));
    if ((Math.abs(Math.sin(a)) < 1e-6) && !has('hor', e.id)) { cons().push({ t: 'hor', a: e.id }); n++; }
    else if ((Math.abs(Math.cos(a)) < 1e-6) && !has('ver', e.id)) { cons().push({ t: 'ver', a: e.id }); n++; }
  }
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) for (const ka of ['p1', 'p2']) for (const kb of ['p1', 'p2']) {
    if (V.dist(s[i][ka], s[j][kb]) <= tol && !cons().some(c => c.t === 'coin' && ((c.a === s[i].id && c.ka === ka && c.b === s[j].id && c.kb === kb) || (c.b === s[i].id && c.kb === ka && c.a === s[j].id && c.ka === kb)))) {
      cons().push({ t: 'coin', a: s[i].id, ka, b: s[j].id, kb }); n++;
    }
  }
  solveConstraints();
  UI.log(`${n} constraint(s) applied.`);
});
def('DELCON', [], 'Delete constraints from selected objects', async () => {
  const s = await getSelection('Select objects'); const ids = new Set(s.map(e => e.id));
  const before = cons().length;
  App.doc.cons = cons().filter(c => !ids.has(c.a) && !ids.has(c.b));
  UI.log(`${before - App.doc.cons.length} constraint(s) removed.`); App.dirty = true;
});
def('CONSTRAINTBAR', ['CBAR'], 'Show or hide constraint badges', async () => { App.modes.cons = !App.modes.cons; App.dirty = true; UI.log(`<Constraints ${App.modes.cons ? 'shown' : 'hidden'}>`); }, { noUndo: true, noRepeat: true });
