// Dimension styles: Dimension Style Manager, Modify/New dialogs, arrowheads, unit formatting
'use strict';

const ARROWS = { closed: 'Closed filled', open: 'Open', tick: 'Architectural tick', dot: 'Dot', none: 'None' };
function defaultDimStyle(h) {
  return { h, asz: h, exe: h * 0.5, exo: h * 0.25, arr: 'closed', prec: 2, zt: true, dsep: '.', prefix: '', suffix: '', lfac: 1, tad: 'above', tih: false, scale: 1, cm: h * 0.5 };
}
function dimStyles() {
  const d = App.doc;
  if (!d.dimstyles) {
    const h = d.dimH || 2.5;
    d.dimstyles = {
      Standard: defaultDimStyle(h),
      'ISO-25': Object.assign(defaultDimStyle(2.5), { dsep: ',', exo: 0.625, exe: 1.25 }),
      Architectural: Object.assign(defaultDimStyle(h), { arr: 'tick', prec: 0, asz: h * 0.6 }),
    };
    d.dimstyle = 'Standard';
  }
  if (!d.dimstyles[d.dimstyle]) d.dimstyle = Object.keys(d.dimstyles)[0];
  return d.dimstyles;
}
function applyDimStyle(e, name) {
  const n = name || App.doc.dimstyle || 'Standard', st = dimStyles()[n]; if (!st) return;
  const k = st.scale || 1;
  e.ds = n; e.h = st.h * k; e.asz = st.asz * k; e.arr = st.arr;
  if (e.type === 'dim') {
    e.exe = st.exe * k; e.exo = st.exo * k; e.zt = st.zt; e.dsep = st.dsep; e.prefix = st.prefix; e.suffix = st.suffix; e.lfac = st.lfac; e.tad = st.tad; e.tih = st.tih;
    if (e.kind !== 'ang') e.prec = st.prec;
  }
}
function fmtDimVal(e, v) {
  const prec = e.prec ?? 2;
  let s = (v * (e.lfac || 1)).toFixed(prec);
  if (e.zt !== false && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  if (e.dsep === ',') s = s.replace('.', ',');
  return (e.prefix || '') + s + (e.suffix || '');
}
function drawArrow(R, a, size, type) {
  if (type === 'none') return;
  if (type === 'tick') { const n = V.norm(V.add(a.dir, V.perp(a.dir))); R.line(V.sub(a.p, V.mul(n, size * 0.5)), V.add(a.p, V.mul(n, size * 0.5))); return; }
  if (type === 'dot') { R.fill(arcPts(a.p, size * 0.25, 0, undefined, 16)); return; }
  const b = arrowPts(a, size);
  if (type === 'open') { R.line(b[1], b[0]); R.line(b[0], b[2]); return; }
  R.fill(b);
}
function arrowEnts(a, size, type) {
  if (type === 'none') return [];
  if (type === 'tick') { const n = V.norm(V.add(a.dir, V.perp(a.dir))); return [{ type: 'line', p1: V.sub(a.p, V.mul(n, size * 0.5)), p2: V.add(a.p, V.mul(n, size * 0.5)) }]; }
  if (type === 'dot') return [{ type: 'hatch', loops: [arcPts(a.p, size * 0.25, 0, undefined, 16).slice(0, -1)], pat: 'SOLID', scale: 1, ang: 0 }];
  const b = arrowPts(a, size);
  if (type === 'open') return [{ type: 'line', p1: b[1], p2: b[0] }, { type: 'line', p1: b[0], p2: b[2] }];
  return [{ type: 'hatch', loops: [b], pat: 'SOLID', scale: 1, ang: 0 }];
}

// ---------- preview (SVG) ----------
function dimPreviewSVG(st) {
  const h = st.h * (st.scale || 1), u = h * 8;
  const shape = [{ type: 'pline', pts: [{ x: 0, y: 0 }, { x: 2.2 * u, y: 0 }, { x: 2.2 * u, y: 1.4 * u }, { x: 1.4 * u, y: 1.4 * u }, { x: 0.9 * u, y: 0.6 * u }, { x: 0, y: 0.6 * u }], closed: true }, { type: 'arc', c: { x: 1.65 * u, y: 0.65 * u }, r: 0.4 * u, a1: 0, a2: Math.PI }];
  const dims = [
    { type: 'dim', p1: { x: 0, y: 0.6 * u }, p2: { x: 0.9 * u, y: 0.6 * u }, p3: { x: 0.4 * u, y: 1.05 * u }, ang: 0 },
    { type: 'dim', p1: { x: 2.2 * u, y: 0 }, p2: { x: 2.2 * u, y: 1.4 * u }, p3: { x: 2.65 * u, y: 0.7 * u }, ang: Math.PI / 2 },
    { type: 'dim', kind: 'rad', c: { x: 1.65 * u, y: 0.65 * u }, r: 0.4 * u, p3: { x: 2.0 * u, y: 1.15 * u } },
    { type: 'dim', p1: { x: 0, y: 0 }, p2: { x: 2.2 * u, y: 0 }, p3: { x: 1.1 * u, y: -0.5 * u }, ang: 0 },
  ];
  const keep = App.doc.dimstyles; App.doc.dimstyles = Object.assign({}, keep, { __pv: st });
  dims.forEach(d => applyDimStyle(d, '__pv'));
  App.doc.dimstyles = keep;
  const flat = []; [...shape, ...dims].forEach(e => flattenEnt(e, flat));
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const grow = (p) => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); };
  flat.forEach(e => entApprox(e).forEach(pl => pl.forEach(grow)));
  const pad = u * 0.15, T = (p) => `${fmt(p.x - x1 + pad, 2)},${fmt(y2 - p.y + pad, 2)}`;
  const parts = flat.map(e => {
    if (e.type === 'text') { const [x, y] = T(e.p).split(','); return `<text x="${x}" y="${y}" font-size="${fmt(e.h, 3)}" fill="#0a2a6a" stroke="none" font-family="Arial" transform="rotate(${fmt(-deg(e.rot || 0), 2)} ${x} ${y})">${esc(e.s)}</text>`; }
    if (e.type === 'hatch') return `<polygon points="${e.loops[0].map(T).join(' ')}" fill="#0a2a6a" stroke="none"/>`;
    return entApprox(e).map(pl => `<polyline points="${pl.map(T).join(' ')}"/>`).join('');
  }).join('');
  return `<svg viewBox="0 0 ${fmt(x2 - x1 + 2 * pad, 2)} ${fmt(y2 - y1 + 2 * pad, 2)}" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="#14213d" stroke-width="${fmt(u / 90, 3)}">${parts}</g></svg>`;
}

// ---------- dialogs ----------
function dimStyleManager(selected) {
  const styles = dimStyles(), names = Object.keys(styles);
  let sel = selected && styles[selected] ? selected : App.doc.dimstyle;
  UI.dialog('Dimension Style Manager', `
    <div class="dsm">
      <div class="dsmleft"><div>Current dimstyle: <b id="dsCur">${esc(App.doc.dimstyle)}</b></div><div class="muted" style="margin-top:6px">Styles:</div>
        <div class="dslist" id="dsList">${names.map(n => `<button class="dsitem${n === sel ? ' on' : ''}" data-n="${esc(n)}">${n === App.doc.dimstyle ? '▸ ' : ''}${esc(n)}</button>`).join('')}</div>
        <label class="muted" style="margin-top:6px">List: <select disabled><option>All styles</option></select></label></div>
      <div class="dsmmid"><div>Preview of: <b id="dsPvName">${esc(sel)}</b></div><div class="dsprev" id="dsPv">${dimPreviewSVG(styles[sel])}</div>
        <div class="muted" id="dsDesc">${esc(sel)}</div></div>
      <div class="dsmright"><button class="btn" id="dsSet">Set Current</button><button class="btn" id="dsNew">New...</button><button class="btn" id="dsMod">Modify...</button><button class="btn" disabled>Override...</button><button class="btn" disabled>Compare...</button></div>
    </div>`, () => {}, 'Close');
  document.getElementById('dlgCancel').style.display = 'none';
  const pick = (n) => { sel = n; document.querySelectorAll('.dsitem').forEach(b => b.classList.toggle('on', b.dataset.n === n)); document.getElementById('dsPvName').textContent = n; document.getElementById('dsDesc').textContent = n; document.getElementById('dsPv').innerHTML = dimPreviewSVG(styles[n]); };
  document.querySelectorAll('.dsitem').forEach(b => { b.onclick = () => pick(b.dataset.n); b.ondblclick = () => { pick(b.dataset.n); document.getElementById('dsSet').click(); }; });
  document.getElementById('dsSet').onclick = () => { UI.change(() => { App.doc.dimstyle = sel; App.doc.dimH = styles[sel].h * (styles[sel].scale || 1); }); dimStyleManager(sel); };
  document.getElementById('dsMod').onclick = () => modifyDimStyle(sel, false);
  document.getElementById('dsNew').onclick = () => {
    UI.dialog('Create New Dimension Style', `<div class="psgrid"><fieldset class="wide"><label>New Style Name: <input id="dsNewName" value="Copy of ${esc(sel)}"></label>
      <label>Start With: <select id="dsStart">${names.map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label>Use for: <select disabled><option>All dimensions</option></select></label></fieldset></div>`, () => {
      const nn = document.getElementById('dsNewName').value.trim();
      if (!nn || styles[nn]) { UI.log(nn ? `Dimension style "${nn}" already exists.` : 'Enter a style name.', 'err'); return false; }
      const from = document.getElementById('dsStart').value;
      setTimeout(() => modifyDimStyle(nn, true, JSON.parse(JSON.stringify(styles[from]))), 0);
    }, 'Continue');
    document.getElementById('dlgCancel').style.display = '';
    document.getElementById('dlgCancel').onclick = () => setTimeout(() => dimStyleManager(sel), 0);
  };
}
function modifyDimStyle(name, isNew, startFrom) {
  const styles = dimStyles();
  const st = JSON.parse(JSON.stringify(startFrom || styles[name]));
  const tabs = ['Lines', 'Symbols and Arrows', 'Text', 'Fit', 'Primary Units', 'Alternate Units', 'Tolerances'];
  const num = (id, v) => `<input id="${id}" type="number" step="any" value="${fmt(v, 6)}">`;
  const arrowSel = (id) => `<select id="${id}">${Object.entries(ARROWS).map(([k, l]) => `<option value="${k}" ${st.arr === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  UI.dialog(`${isNew ? 'New' : 'Modify'} Dimension Style: ${name}`, `
    <div class="dstabs">${tabs.map((t, i) => `<button class="dstab${i === 0 ? ' on' : ''}" data-t="${i}" ${i > 4 ? 'disabled' : ''}>${t}</button>`).join('')}</div>
    <div class="dsbody">
      <div class="dspanes">
        <div class="dspane" data-t="0"><fieldset><legend>Dimension lines</legend><label>Color <select disabled><option>ByBlock</option></select></label><label>Linetype <select disabled><option>ByBlock</option></select></label></fieldset>
          <fieldset><legend>Extension lines</legend><label>Extend beyond dim lines ${num('ds_exe', st.exe)}</label><label>Offset from origin ${num('ds_exo', st.exo)}</label></fieldset></div>
        <div class="dspane" data-t="1" hidden><fieldset><legend>Arrowheads</legend><label>First ${arrowSel('ds_arr')}</label><label>Second <select disabled><option>Same as first</option></select></label><label>Leader ${arrowSel('ds_arrL')}</label><label>Arrow size ${num('ds_asz', st.asz)}</label></fieldset>
          <fieldset><legend>Center marks</legend><label>Size ${num('ds_cm', st.cm ?? st.h * 0.5)}</label></fieldset></div>
        <div class="dspane" data-t="2" hidden><fieldset><legend>Text appearance</legend><label>Text style <select disabled><option>Standard</option></select></label><label>Text height ${num('ds_h', st.h)}</label></fieldset>
          <fieldset><legend>Text placement</legend><label>Vertical <select id="ds_tad"><option value="above" ${st.tad !== 'center' ? 'selected' : ''}>Above</option><option value="center" ${st.tad === 'center' ? 'selected' : ''}>Centered</option></select></label></fieldset>
          <fieldset><legend>Text alignment</legend><label><span>Horizontal</span><input type="radio" name="ds_al" value="h" ${st.tih ? 'checked' : ''} style="width:auto"></label><label><span>Aligned with dimension line</span><input type="radio" name="ds_al" value="a" ${!st.tih ? 'checked' : ''} style="width:auto"></label></fieldset></div>
        <div class="dspane" data-t="3" hidden><fieldset><legend>Scale for dimension features</legend><label>Use overall scale of ${num('ds_sc', st.scale || 1)}</label></fieldset></div>
        <div class="dspane" data-t="4" hidden><fieldset><legend>Linear dimensions</legend><label>Unit format <select disabled><option>Decimal</option></select></label>
          <label>Precision <select id="ds_prec">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${n === st.prec ? 'selected' : ''}>${n ? '0.' + '0'.repeat(n) : '0'}</option>`).join('')}</select></label>
          <label>Decimal separator <select id="ds_dsep"><option value="." ${st.dsep !== ',' ? 'selected' : ''}>'.' (Period)</option><option value="," ${st.dsep === ',' ? 'selected' : ''}>',' (Comma)</option></select></label>
          <label>Prefix <input id="ds_pre" value="${esc(st.prefix || '')}"></label><label>Suffix <input id="ds_suf" value="${esc(st.suffix || '')}"></label></fieldset>
          <fieldset><legend>Measurement scale</legend><label>Scale factor ${num('ds_lf', st.lfac || 1)}</label></fieldset>
          <fieldset><legend>Zero suppression</legend><label><span>Trailing</span><input type="checkbox" id="ds_zt" ${st.zt !== false ? 'checked' : ''} style="width:auto"></label></fieldset></div>
      </div>
      <div class="dsprev small" id="dsMPv">${dimPreviewSVG(st)}</div>
    </div>`, () => {
    read();
    UI.change(() => {
      styles[name] = st;
      App.doc.ents.forEach(e => { if ((e.type === 'dim' || e.type === 'leader') && (e.ds || 'Standard') === name) { applyDimStyle(e, name); invalidate(e); } });
      if (App.doc.dimstyle === name) App.doc.dimH = st.h * (st.scale || 1);
    });
    setTimeout(() => dimStyleManager(name), 0);
  }, 'OK');
  document.getElementById('dlgCancel').onclick = () => setTimeout(() => dimStyleManager(name), 0);
  const $q = (id) => document.getElementById(id);
  const read = () => {
    const n = (id, d) => { const v = parseFloat($q(id).value); return isFinite(v) && v >= 0 ? v : d; };
    st.exe = n('ds_exe', st.exe); st.exo = n('ds_exo', st.exo); st.arr = $q('ds_arr').value; st.asz = n('ds_asz', st.asz) || st.asz; st.cm = n('ds_cm', st.cm);
    st.h = n('ds_h', st.h) || st.h; st.tad = $q('ds_tad').value; st.tih = document.querySelector('input[name=ds_al]:checked').value === 'h';
    st.scale = n('ds_sc', st.scale) || 1; st.prec = parseInt($q('ds_prec').value, 10); st.dsep = $q('ds_dsep').value; st.prefix = $q('ds_pre').value; st.suffix = $q('ds_suf').value;
    st.lfac = n('ds_lf', st.lfac) || 1; st.zt = $q('ds_zt').checked;
  };
  document.querySelectorAll('.dstab').forEach(b => b.onclick = () => { document.querySelectorAll('.dstab').forEach(x => x.classList.toggle('on', x === b)); document.querySelectorAll('.dspane').forEach(p => { p.hidden = p.dataset.t !== b.dataset.t; }); });
  document.querySelectorAll('.dsbody input, .dsbody select').forEach(el => { el.addEventListener('change', () => { read(); $q('dsMPv').innerHTML = dimPreviewSVG(st); }); });
}

Commands.DIMSTYLE = { alias: ['D', 'DST', 'DDIM', 'DIMSTY'], desc: 'Dimension Style Manager', noUndo: true, noRepeat: true, fn: async () => { dimStyleManager(); } };
