// 3D view (WebGL, parallel projection), picking in 3D, visual styles, views, and the 3D solid commands
'use strict';

const V3 = { yaw: rad(-45), pitch: rad(54.74), style: 'shadededges', c: { x: 0, y: 0 } };
const VSTYLES = { wire: 'Wireframe', hidden: 'Hidden', shaded: 'Shaded', shadededges: 'Shaded with edges', realistic: 'Realistic', conceptual: 'Conceptual', xray: 'X-ray' };

function proj3(p, z, raw) {
  const c = Math.cos(V3.yaw), s = Math.sin(V3.yaw);
  const px0 = raw ? p.x : p.x - V3.c.x, py0 = raw ? p.y : p.y - V3.c.y;
  const x1 = px0 * c - py0 * s, y1 = px0 * s + py0 * c;
  const cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch);
  return { x: x1, y: y1 * cp + z * sp, d: -y1 * sp + z * cp };
}
function projS(p3) { const q = proj3({ x: p3[0], y: p3[1] }, p3[2]); return { x: (q.x - App.view.cx) * App.view.s + CW / 2, y: CH / 2 - (q.y - App.view.cy) * App.view.s, d: q.d }; }
// screen point → point on the working plane (z = elevation)
function groundPoint(sp) {
  const vx = (sp.x - CW / 2) / App.view.s + App.view.cx, vy = (CH / 2 - sp.y) / App.view.s + App.view.cy;
  const z = App.doc.elev || 0, cp = Math.max(1e-3, Math.cos(V3.pitch)), spn = Math.sin(V3.pitch);
  const y1 = (vy - z * spn) / cp, c = Math.cos(V3.yaw), s = Math.sin(V3.yaw);
  return { x: c * vx + s * y1 + V3.c.x, y: -s * vx + c * y1 + V3.c.y };
}
function closedLoop(e) {
  if (e.type === 'circle') return arcPts(e.c, e.r, 0, undefined, 64).slice(0, -1);
  if (e.type === 'pline' && e.closed) return e.pts;
  if (e.type === 'spline' && e.closed) return splinePts(e.pts, true, 8).slice(0, -1);
  return null;
}
function hexRGB01(h) { const [r, g, b] = hexRGB(h || '#ffffff'); return [r / 255, g / 255, b / 255]; }
function shade(hex, f) { const [r, g, b] = hexRGB(hex); const k = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${k(r)},${k(g)},${k(b)})`; }

// ---------- geometry of an entity in 3D: faces (polygons) and edges ----------
const _geo3Cache = new WeakMap();
{
  const inv0 = invalidate;
  invalidate = function (e) { inv0(e); _geo3Cache.delete(e); }; // eslint-disable-line no-global-assign
}
function geo3(e) {
  let g = _geo3Cache.get(e);
  if (g) return g;
  if (e.type === 'solid3d') g = { faces: e.polys, edges: solidEdges(e) };
  else if (e.thick && closedLoop(e)) { const m = meshPrism(closedLoop(e), 0, e.thick); g = { faces: m, edges: meshEdges(m) }; }
  else {
    const faces = [], edges = [];
    for (const pl of entApprox(e)) for (let i = 0; i < pl.length - 1; i++) {
      const a = pl[i], b = pl[i + 1];
      edges.push([[a.x, a.y, 0], [b.x, b.y, 0]]);
      if (e.thick) { edges.push([[a.x, a.y, e.thick], [b.x, b.y, e.thick]]); faces.push([[a.x, a.y, 0], [b.x, b.y, 0], [b.x, b.y, e.thick], [a.x, a.y, e.thick]]); }
    }
    if (e.thick) for (const pl of entApprox(e)) for (const a of [pl[0], pl[pl.length - 1]]) edges.push([[a.x, a.y, 0], [a.x, a.y, e.thick]]);
    g = { faces, edges };
  }
  _geo3Cache.set(e, g);
  return g;
}

// ---------- WebGL renderer ----------
const GL3 = { cv: null, gl: null, pf: null, pl: null, failed: false };
function glInit() {
  if (GL3.gl || GL3.failed) return GL3.gl;
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { antialias: true, preserveDrawingBuffer: true, alpha: false });
  if (!gl) { GL3.failed = true; return null; }
  const mk = (vs, fs) => {
    const p = gl.createProgram();
    for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); }
    gl.linkProgram(p); return p;
  };
  try {
    GL3.pf = mk('attribute vec3 p;attribute vec3 n;attribute vec4 c;uniform mat4 M;uniform vec3 L;uniform float lit;varying vec4 vc;void main(){gl_Position=M*vec4(p,1.0);float d=abs(dot(normalize(n),L));vc=vec4(c.rgb*mix(1.0,0.32+0.68*d,lit),c.a);}',
      'precision mediump float;varying vec4 vc;void main(){gl_FragColor=vc;}');
    GL3.pl = mk('attribute vec3 p;attribute vec4 c;uniform mat4 M;varying vec4 vc;void main(){gl_Position=M*vec4(p,1.0);gl_Position.z-=0.002*gl_Position.w;vc=c;}',
      'precision mediump float;varying vec4 vc;void main(){gl_FragColor=vc;}');
  } catch (err) { console.error(err); GL3.failed = true; return null; }
  GL3.cv = cv; GL3.gl = gl; GL3.buf = { p: gl.createBuffer(), n: gl.createBuffer(), c: gl.createBuffer() };
  return gl;
}
function viewMatrix(kz) {
  const c = Math.cos(V3.yaw), s = Math.sin(V3.yaw), cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch);
  const kx = App.view.s * 2 / CW, ky = App.view.s * 2 / CH, X = V3.c.x, Y = V3.c.y, cx = App.view.cx, cy = App.view.cy;
  const r0 = [c * kx, -s * kx, 0, (-c * X + s * Y - cx) * kx];
  const r1 = [s * cp * ky, c * cp * ky, sp * ky, (-(s * cp * X + c * cp * Y) - cy) * ky];
  const r2 = [s * sp * kz, c * sp * kz, -cp * kz, -(s * sp * X + c * sp * Y) * kz];
  return new Float32Array([r0[0], r1[0], r2[0], 0, r0[1], r1[1], r2[1], 0, r0[2], r1[2], r2[2], 0, r0[3], r1[3], r2[3], 1]);
}
function sceneRadius(ents) {
  let r = 10;
  for (const e of ents) for (const f of geo3(e).faces.concat(geo3(e).edges)) for (const p of f) r = Math.max(r, Math.hypot(p[0] - V3.c.x, p[1] - V3.c.y, p[2]));
  return r;
}
function render3D() {
  const ents = App.doc.ents.filter(e => visible(e) && !INFINITE.has(e.type));
  const temp = App.temp || [];
  const bg = (App.opts && App.opts.bg) || '#212830';
  const gl = glInit();
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);
  if (gl) {
    const W = Math.round(CW * DPR), H = Math.round(CH * DPR);
    if (GL3.cv.width !== W || GL3.cv.height !== H) { GL3.cv.width = W; GL3.cv.height = H; }
    gl.viewport(0, 0, W, H);
    const [br, bgc, bb] = hexRGB01(bg);
    gl.clearColor(br, bgc, bb, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    const kz = 1 / (sceneRadius(ents.concat(temp)) * 1.6 + 1);
    const Mx = viewMatrix(kz);
    const cpi = Math.cos(V3.pitch), spi = Math.sin(V3.pitch), cy = Math.cos(V3.yaw), sy = Math.sin(V3.yaw);
    const L = V3d.norm(V3d.add([-sy * spi, -cy * spi, cpi], [0.25, -0.15, 0.35]));
    const style = V3.style;
    const tp = [], tn = [], tc = [], lp = [], lc = [];
    const addEnt3 = (e, isTemp) => {
      const g = geo3(e);
      const sel = App.sel.has(e.id), hov = App.hover === e.id;
      let base = isTemp ? [0.85, 0.9, 1] : hexRGB01(entColor(e));
      if (!isTemp && (base[0] + base[1] + base[2]) > 2.9 && style !== 'wire') base = [0.82, 0.84, 0.88];
      let fc = base.slice(), a = 1;
      if (style === 'hidden') fc = hexRGB01(bg);
      if (style === 'conceptual') fc = [base[0] * 0.7 + 0.25, base[1] * 0.7 + 0.22, base[2] * 0.7 + 0.18];
      if (style === 'xray') a = 0.4;
      if (sel || hov) fc = [fc[0] * 0.5 + 0.12, fc[1] * 0.5 + 0.3, fc[2] * 0.5 + 0.55];
      if (isTemp) a = 0.55;
      if (style !== 'wire') for (const f of g.faces) {
        const n = newellNormal(f);
        for (let i = 1; i < f.length - 1; i++) for (const p of [f[0], f[i], f[i + 1]]) { tp.push(p[0], p[1], p[2]); tn.push(n[0], n[1], n[2]); tc.push(fc[0], fc[1], fc[2], a); }
      }
      const showEdges = style !== 'shaded' && style !== 'realistic' || !g.faces.length || sel || hov;
      if (showEdges) {
        let ec = style === 'wire' || style === 'xray' || style === 'hidden' || !g.faces.length ? base : [base[0] * 0.25, base[1] * 0.25, base[2] * 0.25];
        if (sel || hov) ec = [0.18, 0.48, 1];
        for (const [p, q] of g.edges) { lp.push(p[0], p[1], p[2], q[0], q[1], q[2]); lc.push(ec[0], ec[1], ec[2], 1, ec[0], ec[1], ec[2], 1); }
      }
    };
    ents.forEach(e => addEnt3(e, false));
    temp.forEach(e => { try { addEnt3(e, true); } catch (_) { /* preview only */ } });
    // ground grid
    if (App.modes.grid) {
      const ext = modelExtents() || { x1: -100, y1: -100, x2: 100, y2: 100 };
      let gsz = App.gridSize; const span = Math.max(ext.x2 - ext.x1, ext.y2 - ext.y1, 1);
      while (span / gsz > 40) gsz *= 5;
      const x0 = Math.floor((ext.x1 - span * 0.3) / gsz) * gsz, x1 = Math.ceil((ext.x2 + span * 0.3) / gsz) * gsz;
      const y0 = Math.floor((ext.y1 - span * 0.3) / gsz) * gsz, y1 = Math.ceil((ext.y2 + span * 0.3) / gsz) * gsz, z = App.doc.elev || 0;
      const gc = [0.24, 0.28, 0.34, 1];
      for (let x = x0; x <= x1 + 1e-9; x += gsz) { lp.push(x, y0, z, x, y1, z); lc.push(...gc, ...gc); }
      for (let y = y0; y <= y1 + 1e-9; y += gsz) { lp.push(x0, y, z, x1, y, z); lc.push(...gc, ...gc); }
    }
    const bind = (prog, name, buf, data, size) => { const loc = gl.getAttribLocation(prog, name); if (loc < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
    if (tp.length) {
      gl.useProgram(GL3.pf);
      gl.uniformMatrix4fv(gl.getUniformLocation(GL3.pf, 'M'), false, Mx);
      gl.uniform3f(gl.getUniformLocation(GL3.pf, 'L'), L[0], L[1], L[2]);
      gl.uniform1f(gl.getUniformLocation(GL3.pf, 'lit'), style === 'hidden' ? 0 : 1);
      bind(GL3.pf, 'p', GL3.buf.p, new Float32Array(tp), 3); bind(GL3.pf, 'n', GL3.buf.n, new Float32Array(tn), 3); bind(GL3.pf, 'c', GL3.buf.c, new Float32Array(tc), 4);
      const blend = style === 'xray' || temp.length;
      if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); if (style === 'xray') gl.depthMask(false); }
      gl.drawArrays(gl.TRIANGLES, 0, tp.length / 3);
      gl.disable(gl.BLEND); gl.depthMask(true);
      for (const nm of ['p', 'n', 'c']) { const loc = gl.getAttribLocation(GL3.pf, nm); if (loc >= 0) gl.disableVertexAttribArray(loc); }
    }
    if (lp.length) {
      gl.useProgram(GL3.pl);
      gl.uniformMatrix4fv(gl.getUniformLocation(GL3.pl, 'M'), false, Mx);
      bind(GL3.pl, 'p', GL3.buf.p, new Float32Array(lp), 3); bind(GL3.pl, 'c', GL3.buf.c, new Float32Array(lc), 4);
      gl.drawArrays(gl.LINES, 0, lp.length / 3);
      for (const nm of ['p', 'c']) { const loc = gl.getAttribLocation(GL3.pl, nm); if (loc >= 0) gl.disableVertexAttribArray(loc); }
    }
    ctx.drawImage(GL3.cv, 0, 0, CW, CH);
  } else {
    ctx.fillStyle = '#ff6b6b'; ctx.font = '13px sans-serif'; ctx.fillText('WebGL is not available in this browser, so the 3D view cannot be shown.', 20, 40);
  }
  // overlays: axis tripod, label, crosshair, selection window
  const o = { x: 60, y: CH - 60 };
  for (const [v, col, lab] of [[{ x: 1, y: 0, z: 0 }, '#e05555', 'X'], [{ x: 0, y: 1, z: 0 }, '#4cc560', 'Y'], [{ x: 0, y: 0, z: 1 }, '#4a8cff', 'Z']]) {
    const q = proj3({ x: v.x, y: v.y }, v.z, true), e = { x: o.x + q.x * 36, y: o.y - q.y * 36 };
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.font = '11px sans-serif'; ctx.fillText(lab, e.x + 3, e.y - 3);
  }
  ctx.fillStyle = '#b9c3cf'; ctx.font = '12px sans-serif';
  ctx.fillText(`[-][${V3.viewName || 'Custom View'}][${VSTYLES[V3.style]}]${App.orbitMode ? '  — ORBIT: drag to rotate, Enter or Esc to finish' : ''}`, 8, 18);
  if (App.win) {
    const a = App.win.s1, b = App.scr, crossing = b.x < a.x;
    ctx.fillStyle = crossing ? 'rgba(60,200,90,0.15)' : 'rgba(60,120,255,0.15)'; ctx.strokeStyle = crossing ? '#4cd964' : '#4a8cff'; ctx.lineWidth = 1;
    if (crossing) ctx.setLineDash([5, 4]);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.setLineDash([]);
  }
  const r = App.req;
  if (r && r.base && r.rubber !== false && ['point', 'dist', 'angle'].includes(r.kind)) {
    const a = w2s(r.base), b = w2s(App.eff); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  if (App.snap) drawSnapMarker(App.snap);
  if (App.over && !App.pan && !App.orbit) {
    const c = App.req && ['point', 'dist', 'angle'].includes(App.req.kind) ? w2s(App.eff) : App.scr;
    const Lh = Math.max(CW, CH) * ((App.opts && App.opts.cross) || 5) / 200;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.beginPath();
    if (!App.req || ['point', 'dist', 'angle'].includes(App.req.kind)) {
      // crosshair lines follow the X and Y axes of the working plane
      const p0 = App.req ? App.eff : App.raw;
      for (const d of [{ x: 1, y: 0 }, { x: 0, y: 1 }]) {
        const s1 = w2s(p0), s2 = w2s(V.add(p0, d)), dir = V.norm(V.sub(s2, s1));
        ctx.moveTo(c.x - dir.x * Lh, c.y - dir.y * Lh); ctx.lineTo(c.x + dir.x * Lh, c.y + dir.y * Lh);
      }
    }
    ctx.stroke();
    if (!App.req || App.req.kind === 'select' || App.req.kind === 'entity') ctx.strokeRect(Math.round(c.x) - 4.5, Math.round(c.y) - 4.5, 9, 9);
  }
}

// ---------- picking in 3D ----------
function pick3D(sp, filter) {
  let best = null, bd = -Infinity;
  const tol = (App.opts && App.opts.pick) || 6;
  for (const e of App.doc.ents) {
    if (!editable(e) || INFINITE.has(e.type) || (filter && !filter(e))) continue;
    const g = geo3(e);
    let hitD = -Infinity;
    for (const f of g.faces) {
      const s = f.map(projS);
      for (let i = 1; i < s.length - 1; i++) {
        const a = s[0], b = s[i], c = s[i + 1];
        const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y); if (Math.abs(den) < 1e-12) continue;
        const w1 = ((b.y - c.y) * (sp.x - c.x) + (c.x - b.x) * (sp.y - c.y)) / den, w2 = ((c.y - a.y) * (sp.x - c.x) + (a.x - c.x) * (sp.y - c.y)) / den, w3 = 1 - w1 - w2;
        if (w1 >= 0 && w2 >= 0 && w3 >= 0) hitD = Math.max(hitD, w1 * a.d + w2 * b.d + w3 * c.d);
      }
    }
    for (const [p, q] of g.edges) {
      const a = projS(p), b = projS(q), cl = closestOnSeg(sp, a, b);
      if (V.dist(cl.p, sp) < tol) hitD = Math.max(hitD, a.d + (b.d - a.d) * cl.t + 1e-6);
    }
    if (hitD > bd) { bd = hitD; best = e; }
  }
  return best;
}
function screenBox3(e) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const g = geo3(e);
  for (const set of [g.edges, g.faces]) for (const f of set) for (const p of f) { const s = projS(p); x1 = Math.min(x1, s.x); y1 = Math.min(y1, s.y); x2 = Math.max(x2, s.x); y2 = Math.max(y2, s.y); }
  return { x1, y1, x2, y2 };
}

// ---------- view control ----------
const VIEWS = { Top: [0, 0], Bottom: [0, 180], Front: [0, 90], Back: [180, 90], Left: [90, 90], Right: [-90, 90], SWiso: [45, 54.74], SEiso: [-45, 54.74], NEiso: [-135, 54.74], NWiso: [135, 54.74] };
const VIEW_LABEL = { Top: 'Top', Bottom: 'Bottom', Front: 'Front', Back: 'Back', Left: 'Left', Right: 'Right', SWiso: 'SW Isometric', SEiso: 'SE Isometric', NEiso: 'NE Isometric', NWiso: 'NW Isometric' };
function fit3D() {
  const ext = modelExtents();
  V3.c = ext ? { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 } : { x: 0, y: 0 };
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const e of App.doc.ents.filter(x => visible(x) && !INFINITE.has(x.type))) {
    const g = geo3(e);
    for (const set of [g.edges, g.faces]) for (const f of set) for (const p of f) { const q = proj3({ x: p[0], y: p[1] }, p[2]); x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y); }
  }
  if (!isFinite(x1)) { x1 = -100; y1 = -100; x2 = 100; y2 = 100; }
  const s = Math.min(CW / Math.max(x2 - x1, 1e-6), (CH - 100) / Math.max(y2 - y1, 1e-6)) * 0.8;
  App.view = { s, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 - 50 / s };
  App.dirty = true;
}
function enter3D(view) {
  if (App.bedit) { UI.log('Close the Block Editor first.', 'err'); return; }
  if (App.space !== 'Model') switchSpace('Model');
  if (!App.v3d) { App.views = App.views || {}; App.views.plan = { ...App.view }; }
  if (view && VIEWS[view]) { V3.yaw = rad(VIEWS[view][0]); V3.pitch = rad(Math.min(VIEWS[view][1], 179.9)); V3.viewName = VIEW_LABEL[view]; }
  App.v3d = true; fit3D(); App.dirty = true; UI.refresh3D();
}
function exit3D() {
  if (!App.v3d) return;
  App.v3d = false; App.orbitMode = false;
  if (App.views && App.views.plan) App.view = { ...App.views.plan }; else zoomExtents();
  App.dirty = true; UI.refresh3D();
}
const V3_BLOCK = new Set(['MTEXT', 'TABLE', 'TEXTEDIT', 'BEDIT', 'MVIEW', 'STRETCH', 'TRIM', 'EXTEND', 'FILLET', 'CHAMFER', 'OFFSET', 'BREAK', 'HATCH', 'DIMLINEAR', 'DIMALIGNED']);
const V3_OK = { has: (n) => !V3_BLOCK.has(n) };

// ---------- solid commands ----------
const elev = () => App.doc.elev || 0;
function addSolid(kind, polys) { if (!polys || !polys.length) { UI.log('Could not create the solid.', 'err'); return null; } return addEnt({ type: 'solid3d', kind, polys }); }
const tmpSolid = (kind, polys) => ({ type: 'solid3d', kind, polys, layer: App.doc.cur });
function ensure3DView() { if (!App.v3d && !App._no3dSwitch) { enter3D('SEiso'); UI.log('Switched to SE Isometric view. Type PLAN to return to the top view.', 'info'); } }

async function askHeight(prompt, base, preview) {
  const last = App.lastSolidH || 100;
  const h = await getDist(`${prompt} <${fmt(last)}>`, { def: last, base, preview });
  if (typeof h !== 'number' || h === 0) return null;
  App.lastSolidH = Math.abs(h); return h;
}
def('BOX', [], 'Create a 3D solid box', async () => {
  let a = await getPoint('Specify first corner or [Center]', { keywords: ['Center'] });
  let ctr = null;
  if (a === 'Center') { ctr = await getPoint('Specify center'); if (!isPt(ctr)) return; }
  const rectFrom = (q) => (ctr ? [V.sub(V.mul(ctr, 2), q), q] : [a, q]);
  const b0 = await getPoint('Specify other corner or [Cube/Length]', { base: ctr || a, rubber: false, keywords: ['Cube', 'Length'], preview: (q) => [{ type: 'pline', pts: rectPts(...rectFrom(q)), closed: true, layer: App.doc.cur }] });
  let A, Bp, h;
  if (b0 === 'Cube' || b0 === 'Length') {
    const L = await getDist('Specify length'); if (typeof L !== 'number') return;
    const W = b0 === 'Cube' ? L : await getDist('Specify width'); if (typeof W !== 'number') return;
    const o = ctr ? { x: ctr.x - L / 2, y: ctr.y - W / 2 } : a;
    A = o; Bp = { x: o.x + L, y: o.y + W };
    if (b0 === 'Cube') h = L;
  } else { if (!isPt(b0)) return; [A, Bp] = rectFrom(b0); }
  if (Math.abs(A.x - Bp.x) < 1e-9 || Math.abs(A.y - Bp.y) < 1e-9) { UI.log('The box needs a non-zero length and width.', 'err'); return; }
  ensure3DView();
  if (h === undefined) { h = await askHeight('Specify height', Bp, (q) => [tmpSolid('Box', meshPrism(rectPts(A, Bp), elev(), V.dist(Bp, q) || 1))]); if (h === null) return; }
  addSolid('Box', meshPrism(rectPts(A, Bp), elev(), h));
});
def('CYLINDER', ['CYL'], 'Create a 3D solid cylinder', async () => {
  const c = await getPoint('Specify center point of base'); if (!isPt(c)) return;
  const r0 = App.lastSolidR || 50;
  let r = await getDist(`Specify base radius or [Diameter] <${fmt(r0)}>`, { base: c, def: r0, keywords: ['Diameter'], preview: (q) => [{ type: 'circle', c, r: V.dist(c, q), layer: App.doc.cur }] });
  if (r === 'Diameter') { const d = await getDist('Specify diameter', { base: c }); if (typeof d !== 'number') return; r = d / 2; }
  if (typeof r !== 'number' || r <= 0) return;
  App.lastSolidR = r;
  ensure3DView();
  const h = await askHeight('Specify height', c, (q) => [tmpSolid('Cylinder', meshFrustum(c, r, r, elev(), V.dist(c, q) || 1))]); if (h === null) return;
  addSolid('Cylinder', meshFrustum(c, r, r, elev(), h));
});
def('CONE', [], 'Create a 3D solid cone', async () => {
  const c = await getPoint('Specify center point of base'); if (!isPt(c)) return;
  const r = await getDist(`Specify base radius <${fmt(App.lastSolidR || 50)}>`, { base: c, def: App.lastSolidR || 50, preview: (q) => [{ type: 'circle', c, r: V.dist(c, q), layer: App.doc.cur }] });
  if (typeof r !== 'number' || r <= 0) return;
  App.lastSolidR = r;
  ensure3DView();
  let rt = 0;
  let h = await getDist(`Specify height or [Top radius] <${fmt(App.lastSolidH || 100)}>`, { base: c, def: App.lastSolidH || 100, keywords: ['Top'], preview: (q) => [tmpSolid('Cone', meshFrustum(c, r, rt, elev(), V.dist(c, q) || 1))] });
  if (h === 'Top') { const t = await getDist('Specify top radius <0>', { def: 0 }); if (typeof t === 'number') rt = Math.max(0, t); h = await askHeight('Specify height', c); }
  if (typeof h !== 'number' || !h) return;
  addSolid(rt ? 'Frustum' : 'Cone', meshFrustum(c, r, rt, elev(), h));
});
def('SPHERE', [], 'Create a 3D solid sphere', async () => {
  const c = await getPoint('Specify center point'); if (!isPt(c)) return;
  ensure3DView();
  const r = await getDist(`Specify radius <${fmt(App.lastSolidR || 50)}>`, { base: c, def: App.lastSolidR || 50, preview: (q) => [tmpSolid('Sphere', meshSphere(c, elev(), V.dist(c, q) || 1, 24, 12))] });
  if (typeof r !== 'number' || r <= 0) return;
  App.lastSolidR = r;
  addSolid('Sphere', meshSphere(c, elev(), r));
});
def('PYRAMID', ['PYR'], 'Create a 3D solid pyramid', async () => {
  let sides = App.pyrSides || 4;
  let c = await getPoint(`Specify center point of base or [Sides] (${sides} sides)`, { keywords: ['Sides'] });
  if (c === 'Sides') { const n = await getDist(`Enter number of sides <${sides}>`, { def: sides }); if (typeof n === 'number') sides = App.pyrSides = Math.max(3, Math.min(32, Math.round(n))); c = await getPoint('Specify center point of base'); }
  if (!isPt(c)) return;
  const rp = await getPoint('Specify base radius', { base: c, preview: (q) => [{ type: 'pline', pts: Array.from({ length: sides }, (_, i) => V.polar(c, V.ang(c, q) + i * TAU / sides, V.dist(c, q))), closed: true, layer: App.doc.cur }] });
  let r, a0 = Math.PI / 4;
  if (typeof rp === 'number') r = rp; else if (isPt(rp)) { r = V.dist(c, rp); a0 = V.ang(c, rp); } else return;
  if (!(r > 0)) return;
  ensure3DView();
  const h = await askHeight('Specify height', c, (q) => [tmpSolid('Pyramid', meshPyramid(c, r, sides, a0, elev(), V.dist(c, q) || 1))]); if (h === null) return;
  addSolid('Pyramid', meshPyramid(c, r, sides, a0, elev(), h));
});
def('WEDGE', ['WE'], 'Create a 3D solid wedge', async () => {
  const a = await getPoint('Specify first corner'); if (!isPt(a)) return;
  const b = await getPoint('Specify other corner', { base: a, rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(a, q), closed: true, layer: App.doc.cur }] }); if (!isPt(b)) return;
  ensure3DView();
  const h = await askHeight('Specify height', b, (q) => [tmpSolid('Wedge', meshWedge(a, b, elev(), V.dist(b, q) || 1))]); if (h === null) return;
  addSolid('Wedge', meshWedge(a, b, elev(), h));
});
def('TORUS', ['TOR'], 'Create a 3D solid torus', async () => {
  const c = await getPoint('Specify center point'); if (!isPt(c)) return;
  const R = await getDist(`Specify radius <${fmt(App.lastSolidR || 50)}>`, { base: c, def: App.lastSolidR || 50, preview: (q) => [{ type: 'circle', c, r: V.dist(c, q), layer: App.doc.cur }] });
  if (typeof R !== 'number' || R <= 0) return;
  ensure3DView();
  const tr = await getDist(`Specify tube radius <${fmt(R / 4)}>`, { def: R / 4, preview: (q) => [tmpSolid('Torus', meshTorus(c, elev(), R, Math.min(R * 0.95, V.dist(V.polar(c, V.ang(c, q), R), q)) || 1, 24, 12))] });
  if (typeof tr !== 'number' || tr <= 0) return;
  addSolid('Torus', meshTorus(c, elev(), R, tr));
});

def('EXTRUDE', ['EXT'], 'Extrude closed shapes into 3D solids', async () => {
  const s = await getSelection('Select objects to extrude');
  if (!s.length) return;
  const closed = s.filter(e => closedLoop(e)), open = s.filter(e => !closedLoop(e) && ['line', 'pline', 'arc', 'spline'].includes(e.type));
  ensure3DView();
  const h = await askHeight('Specify height of extrusion', null, (q) => closed.map(e => tmpSolid('Extrusion', meshPrism(closedLoop(e), elev(), V.dist(App.lastPoint || q, q) || 1))));
  if (h === null) return;
  for (const e of closed) { const sol = addSolid('Extrusion', meshPrism(closedLoop(e), elev(), h)); if (sol) inheritStyle(e, sol); }
  removeEnts(closed);
  open.forEach(e => { e.thick = h; invalidate(e); });
  UI.log(`${closed.length} solid(s) created${open.length ? `, ${open.length} open object(s) given a height` : ''}.`, 'info');
});
def('REVOLVE', ['REV'], 'Revolve a closed profile around an axis into a solid', async () => {
  const s = (await getSelection('Select closed objects to revolve')).filter(e => closedLoop(e));
  if (!s.length) { UI.log('Select closed polylines, circles or closed splines.', 'err'); return; }
  let a = await getPoint('Specify axis start point or [X/Y]', { keywords: ['X', 'Y'] });
  let b;
  if (a === 'X') { a = { x: 0, y: 0 }; b = { x: 1, y: 0 }; } else if (a === 'Y') { a = { x: 0, y: 0 }; b = { x: 0, y: 1 }; }
  else { if (!isPt(a)) return; b = await getPoint('Specify axis endpoint', { base: a }); if (!isPt(b) || V.dist(a, b) < 1e-9) return; }
  const ang = await getAngle('Specify angle of revolution <360>', { def: TAU });
  if (typeof ang !== 'number' || Math.abs(ang) < 1e-9) return;
  ensure3DView();
  try {
    const made = [];
    for (const e of s) { const sol = addSolid('Revolve', meshRevolve(closedLoop(e), a, b, ang)); if (sol) { inheritStyle(e, sol); made.push(sol); } }
    removeEnts(s);
    UI.log(`${made.length} solid(s) created by revolution.`, 'info');
  } catch (err) { UI.log(err.message, 'err'); }
});
async function pickSolids(prompt, opts) { return (await getSelection(prompt, opts)).filter(e => e.type === 'solid3d'); }
def('UNION', ['UNI'], 'Combine solids into one', async () => {
  const s = await pickSolids('Select solids to union');
  if (s.length < 2) { UI.log('Select at least two 3D solids.', 'err'); return; }
  let m = s[0].polys; for (const e of s.slice(1)) m = CSG.union(m, e.polys);
  const r = addSolid('Union', m); if (r) inheritStyle(s[0], r); removeEnts(s);
});
def('SUBTRACT', ['SU'], 'Subtract solids from other solids', async () => {
  const A = await pickSolids('Select solids to subtract from');
  if (!A.length) { UI.log('Select at least one 3D solid.', 'err'); return; }
  App.sel.clear();
  const Bs = (await pickSolids('Select solids to subtract', { noPickfirst: true })).filter(e => !A.includes(e));
  if (!Bs.length) return;
  for (const a of A) { let m = a.polys; for (const b of Bs) m = CSG.subtract(m, b.polys); const r = addSolid('Subtract', m); if (r) inheritStyle(a, r); }
  removeEnts([...A, ...Bs]);
});
def('INTERSECT', ['IN'], 'Keep the common volume of solids', async () => {
  const s = await pickSolids('Select solids to intersect');
  if (s.length < 2) { UI.log('Select at least two 3D solids.', 'err'); return; }
  let m = s[0].polys; for (const e of s.slice(1)) m = CSG.intersect(m, e.polys);
  if (!m.length) { UI.log('The solids do not overlap; nothing was created.', 'err'); return; }
  const r = addSolid('Intersect', m); if (r) inheritStyle(s[0], r); removeEnts(s);
});
def('SLICE', ['SL'], 'Slice solids with a vertical plane through two points', async () => {
  const s = await pickSolids('Select solids to slice'); if (!s.length) return;
  const a = await getPoint('Specify first point on slicing plane'); if (!isPt(a)) return;
  const b = await getPoint('Specify second point on plane', { base: a }); if (!isPt(b) || V.dist(a, b) < 1e-9) return;
  const side = await getPoint('Specify a point on desired side or [keep Both sides] <Both>', { keywords: ['Both'], noSnap: true });
  let R = 1; for (const e of s) for (const f of e.polys) for (const p of f) R = Math.max(R, Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]));
  const d = V.norm(V.sub(b, a)), n = V.perp(d), L = R * 4;
  const half = (sg) => { const o = V.add(a, V.mul(n, sg * L)); const pts = [V.sub(a, V.mul(d, L)), V.add(a, V.mul(d, L)), V.add(o, V.mul(d, L)), V.sub(o, V.mul(d, L))]; return meshPrism(pts, -L, 2 * L); };
  const sides = isPt(side) ? [Math.sign(V.dot(V.sub(side, a), n)) || 1] : [1, -1];
  for (const e of s) for (const sg of sides) { const m = CSG.intersect(e.polys, half(sg)); if (m.length) { const r = addSolid(e.kind || 'Solid', m); if (r) inheritStyle(e, r); } }
  removeEnts(s);
});
def('3DMOVE', ['3M'], 'Move objects in 3D (with a Z displacement)', async () => {
  const s = await getSelection(); if (!s.length) return;
  const a = await getPoint('Specify base point'); if (!isPt(a)) return;
  const b = await getPoint('Specify second point', { base: a, preview: (q) => s.map(e => entTransform(entClone(e), M.translate(q.x - a.x, q.y - a.y))) }); if (!isPt(b)) return;
  const dz = await getDist('Specify Z displacement <0>', { def: 0 });
  s.forEach(e => { entTransform(e, M.translate(b.x - a.x, b.y - a.y)); if (typeof dz === 'number' && dz && e.type === 'solid3d') transformSolid3(e, p => [p[0], p[1], p[2] + dz]); });
});
def('ROTATE3D', ['3R', '3DROTATE'], 'Rotate solids about the X, Y or Z axis', async () => {
  const s = (await getSelection()).filter(e => e.type === 'solid3d'); if (!s.length) { UI.log('Select 3D solids.', 'err'); return; }
  const ax = await getKeyword('Specify axis [X/Y/Z] <Z>', { keywords: ['X', 'Y', 'Z'], def: 'Z' });
  const p = await getPoint('Specify a point on the axis'); if (!isPt(p)) return;
  const ang = await getAngle('Specify rotation angle'); if (typeof ang !== 'number') return;
  const o = [p.x, p.y, elev()];
  s.forEach(e => transformSolid3(e, q => rot3(q, ax || 'Z', o, ang)));
});
def('ELEV', [], 'Set the elevation (Z) for new objects', async () => {
  const v = await getDist(`Specify new default elevation <${fmt(App.doc.elev || 0)}>`, { def: App.doc.elev || 0 });
  if (typeof v === 'number') { App.doc.elev = v; App.dirty = true; }
});

def('ORBIT', ['3DO', '3DORBIT', 'VIEW3D', 'ISO'], 'Orbit the 3D view', async () => {
  if (!App.v3d) enter3D(V3.viewName ? undefined : 'SEiso');
  App.orbitMode = true; App.dirty = true;
  try { await getKeyword('Drag to orbit. Press Enter or Esc to finish', { keywords: ['eXit'], def: 'eXit' }); } catch (_) { /* Esc */ }
  App.orbitMode = false; V3.viewName = 'Custom View'; App.dirty = true;
}, { noUndo: true, noRepeat: true });
def('PLAN', ['TOP'], 'Return to the 2D top (plan) view', async () => { exit3D(); }, { noUndo: true, noRepeat: true });
def('-VIEW', ['V', 'VIEW'], 'Set a standard view: Top, Front, Left, Right, Back, Bottom or isometric', async () => {
  const keys = Object.keys(VIEWS);
  const k = await getKeyword(`Enter view [${keys.join('/')}] <SEiso>`, { keywords: keys, def: 'SEiso' });
  if (k === 'Top') { exit3D(); return; }
  enter3D(k);
}, { noUndo: true, noRepeat: true });
def('VSCURRENT', ['VS', 'SHADEMODE', 'VISUALSTYLES'], 'Set the visual style', async () => {
  const opts = ['2dwireframe', 'Wireframe', 'Hidden', 'Realistic', 'Conceptual', 'Shaded', 'shadedwithEdges', 'Xray'];
  const k = await getKeyword(`Enter an option [${opts.join('/')}] <shadedwithEdges>`, { keywords: opts, def: 'shadedwithEdges' });
  if (k === '2dwireframe') { exit3D(); return; }
  V3.style = { Wireframe: 'wire', Hidden: 'hidden', Realistic: 'realistic', Conceptual: 'conceptual', Shaded: 'shaded', shadedwithEdges: 'shadededges', Xray: 'xray' }[k] || 'shadededges';
  if (!App.v3d) enter3D('SEiso');
  App.dirty = true;
}, { noUndo: true, noRepeat: true });
