// Simple 3D: extruded objects (thickness) and an orbit viewer (parallel projection)
'use strict';

const V3 = { yaw: rad(-45), pitch: rad(55), style: 'shaded', c: { x: 0, y: 0 } };

function closedLoop(e) {
  if (e.type === 'circle') return arcPts(e.c, e.r, 0, undefined, 64).slice(0, -1);
  if (e.type === 'pline' && e.closed) return e.pts;
  if (e.type === 'spline' && e.closed) return splinePts(e.pts, true, 8).slice(0, -1);
  return null;
}
function proj3(p, z, raw) {
  const c = Math.cos(V3.yaw), s = Math.sin(V3.yaw);
  const px0 = raw ? p.x : p.x - V3.c.x, py0 = raw ? p.y : p.y - V3.c.y;
  const x1 = px0 * c - py0 * s, y1 = px0 * s + py0 * c;
  const cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch);
  return { x: x1, y: y1 * cp + z * sp, d: -y1 * sp + z * cp };
}
function shade(hex, f) { const [r, g, b] = hexRGB(hex); const k = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${k(r)},${k(g)},${k(b)})`; }

function render3D() {
  const ents = App.doc.ents.filter(visible);
  // projected extents → view fit is kept in App.view3d
  const toS = (q) => ({ x: (q.x - App.view.cx) * App.view.s + CW / 2, y: CH / 2 - (q.y - App.view.cy) * App.view.s });
  ctx.fillStyle = '#1b2027'; ctx.fillRect(0, 0, CW, CH);
  // ground grid
  if (App.modes.grid) {
    const ext = modelExtents() || { x1: -100, y1: -100, x2: 100, y2: 100 };
    let g = App.gridSize; const span = Math.max(ext.x2 - ext.x1, ext.y2 - ext.y1, 1);
    while (span / g > 40) g *= 5;
    const x0 = Math.floor((ext.x1 - span * 0.2) / g) * g, x1 = Math.ceil((ext.x2 + span * 0.2) / g) * g;
    const y0 = Math.floor((ext.y1 - span * 0.2) / g) * g, y1 = Math.ceil((ext.y2 + span * 0.2) / g) * g;
    ctx.strokeStyle = '#2c343f'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1; x += g) { const a = toS(proj3({ x, y: y0 }, 0)), b = toS(proj3({ x, y: y1 }, 0)); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    for (let y = y0; y <= y1; y += g) { const a = toS(proj3({ x: x0, y }, 0)), b = toS(proj3({ x: x1, y }, 0)); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
  }
  const faces = [], wires = [];
  const light = V.norm({ x: 0.4, y: -0.6 });
  for (const e of ents) {
    const col = entColor(e);
    const loop = e.thick ? closedLoop(e) : null;
    if (loop && loop.length > 2) {
      const h = e.thick, n = loop.length;
      const ccw = polyArea(loop) > 0;
      for (let i = 0; i < n; i++) {
        const a = loop[i], b = loop[(i + 1) % n];
        const quad = [proj3(a, 0), proj3(b, 0), proj3(b, h), proj3(a, h)];
        const nrm = V.norm(ccw ? { x: b.y - a.y, y: a.x - b.x } : { x: a.y - b.y, y: b.x - a.x });
        const lit = 0.55 + 0.45 * Math.max(0, V.dot(nrm, light));
        faces.push({ pts: quad, d: quad.reduce((s, q) => s + q.d, 0) / 4, fill: shade(col, lit * 0.8), stroke: e.type === 'circle' ? null : col });
      }
      const top = loop.map(p => proj3(p, h)), bot = loop.map(p => proj3(p, 0));
      faces.push({ pts: bot, d: Math.min(...bot.map(q => q.d)), fill: shade(col, 0.35), stroke: col });
      faces.push({ pts: top, d: Math.max(...top.map(q => q.d)), fill: shade(col, 0.95), stroke: col });
    } else {
      for (const pl of entApprox(e)) wires.push({ pts: pl.map(p => proj3(p, 0)), col, thick: e.thick || 0, src: pl });
      if (e.thick) for (const pl of entApprox(e)) {
        wires.push({ pts: pl.map(p => proj3(p, e.thick)), col });
        for (let i = 0; i < pl.length; i++) wires.push({ pts: [proj3(pl[i], 0), proj3(pl[i], e.thick)], col });
      }
    }
  }
  ctx.lineJoin = 'round';
  for (const w of wires) {
    ctx.strokeStyle = w.col; ctx.lineWidth = 1; ctx.beginPath();
    w.pts.forEach((q, i) => { const s = toS(q); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke();
  }
  faces.sort((a, b) => a.d - b.d);
  for (const f of faces) {
    ctx.beginPath(); f.pts.forEach((q, i) => { const s = toS(q); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.closePath();
    if (V3.style === 'shaded') { ctx.fillStyle = f.fill; ctx.fill(); }
    if (f.stroke || V3.style !== 'shaded') { ctx.strokeStyle = V3.style === 'shaded' ? 'rgba(0,0,0,0.55)' : (f.stroke || '#fff'); ctx.lineWidth = 1; ctx.stroke(); }
  }
  // axis tripod
  const o = { x: 60, y: CH - 60 };
  for (const [v, c, l] of [[{ x: 1, y: 0, z: 0 }, '#e05555', 'X'], [{ x: 0, y: 1, z: 0 }, '#4cc560', 'Y'], [{ x: 0, y: 0, z: 1 }, '#4a8cff', 'Z']]) {
    const q = proj3({ x: v.x, y: v.y }, v.z, true), e = { x: o.x + q.x * 36, y: o.y - q.y * 36 };
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.font = '11px sans-serif'; ctx.fillText(l, e.x + 3, e.y - 3);
  }
  ctx.fillStyle = '#b9c3cf'; ctx.font = '12px sans-serif';
  ctx.fillText(`[-][Custom View][${V3.style === 'shaded' ? 'Shaded with edges' : 'Wireframe'}]  — drag to orbit, wheel to zoom, Esc or Top to return`, 8, 18);
}

function fit3D() {
  const ext = modelExtents();
  V3.c = ext ? { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 } : { x: 0, y: 0 };
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const e of App.doc.ents.filter(visible)) {
    const b = entBBox(e); if (!isFinite(b.x1)) continue;
    for (const p of [{ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y1 }, { x: b.x2, y: b.y2 }, { x: b.x1, y: b.y2 }]) for (const z of [0, e.thick || 0]) {
      const q = proj3(p, z); x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y);
    }
  }
  if (!isFinite(x1)) { x1 = -100; y1 = -100; x2 = 100; y2 = 100; }
  zoomRect({ x1, y1, x2, y2 }, 0.1);
}
function enter3D() {
  if (App.space !== 'Model') switchSpace('Model');
  if (App.req || App.cmd) cancelReq();
  if (!App.v3d) { App.views = App.views || {}; App.views.plan = { ...App.view }; }
  App.v3d = true; App.sel.clear(); fit3D(); App.dirty = true; UI.refresh3D();
}
function exit3D() {
  if (!App.v3d) return;
  App.v3d = false;
  if (App.views && App.views.plan) App.view = { ...App.views.plan }; else zoomExtents();
  App.dirty = true; UI.refresh3D();
}

const V3_OK = new Set(['ORBIT', 'PLAN', 'VSCURRENT', 'ZOOM', 'UNDO', 'REDO', 'HELP', 'SAVE', 'OPEN', 'NEW', 'GRID', 'PROPERTIES', 'LAYER', 'VIEW3D']);

def('EXTRUDE', ['EXT'], 'Give closed shapes a height (3D extrusion)', async () => {
  const s = await getSelection('Select closed polylines, rectangles, circles or other objects');
  if (!s.length) return;
  const h0 = App.lastExtrude || 30;
  const h = await getDist(`Specify height of extrusion <${fmt(h0)}>`, { def: h0 });
  if (typeof h !== 'number') return;
  App.lastExtrude = h;
  let n = 0; s.forEach(e => { if (['line', 'pline', 'circle', 'arc', 'spline', 'rect'].includes(e.type)) { e.thick = h; n++; } });
  UI.log(`${n} object(s) extruded to height ${fmt(h)}. Use ORBIT (3DO) or the 3D button to view.`, 'info');
});
def('ORBIT', ['3DO', '3DORBIT', 'VIEW3D', 'ISO'], 'Switch to a 3D orbit view', async () => { enter3D(); }, { noUndo: true, noRepeat: true });
def('PLAN', ['TOP'], 'Return to the 2D top (plan) view', async () => { exit3D(); }, { noUndo: true, noRepeat: true });
def('VSCURRENT', ['VS', 'SHADEMODE'], 'Set visual style: Wireframe or Shaded', async () => {
  const k = await getKeyword(`Enter an option [Wireframe/Shaded] <${V3.style === 'shaded' ? 'Wireframe' : 'Shaded'}>`, { keywords: ['Wireframe', 'Shaded'], def: V3.style === 'shaded' ? 'Wireframe' : 'Shaded' });
  V3.style = k === 'Shaded' ? 'shaded' : 'wire'; App.dirty = true;
}, { noUndo: true, noRepeat: true });
