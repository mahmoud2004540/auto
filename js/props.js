// AutoCAD-style Properties palette: object-type filter, collapsible categories, multi-object editing
'use strict';

UI.propFilter = 'all';
UI.propCollapsed = {};
const PLOT_STYLE = 'ByColor';

UI.refreshProps = function () {
  const body = document.getElementById('propsBody');
  const all = selEnts();
  document.getElementById('selinfo').textContent = all.length ? `${all.length} selected` : '';
  const byType = {};
  all.forEach(e => { (byType[e.type] = byType[e.type] || []).push(e); });
  if (this.propFilter !== 'all' && !byType[this.propFilter]) this.propFilter = 'all';
  const s = this.propFilter === 'all' ? all : byType[this.propFilter];
  const typeKeys = Object.keys(byType);
  const oneType = typeKeys.length === 1 ? typeKeys[0] : this.propFilter !== 'all' ? this.propFilter : null;

  const head = `<div class="pphead"><select id="ppType">${all.length ? `<option value="all" ${this.propFilter === 'all' ? 'selected' : ''}>${typeKeys.length === 1 ? Types[typeKeys[0]].label + (all.length > 1 ? ` (${all.length})` : '') : `All (${all.length})`}</option>${typeKeys.length > 1 ? typeKeys.map(t => `<option value="${t}" ${this.propFilter === t ? 'selected' : ''}>${Types[t].label} (${byType[t].length})</option>`).join('') : ''}` : '<option>No selection</option>'}</select>
    <button class="ppbtn" data-cmd="SELECTALL" title="Select all objects">${icon('selall')}</button><button class="ppbtn" id="ppSelect" title="Select Objects">${icon('id')}</button><button class="ppbtn" data-cmd="QSELECT" title="Quick Select">${icon('list')}</button></div>`;

  const rows = [];                                 // [category, label, html, key]
  const cat = (name, list) => { rows.push({ cat: name, list }); };
  const same = (vals) => (vals.every(v => v === vals[0]) ? vals[0] : null);
  const layerOpts = (cur) => App.doc.layers.map(l => `<option value="${esc(l.name)}" ${l.name === cur ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  const colorSel = (cv, key) => `<div class="ppcol"><span class="sw" style="background:${cv || (key === 'cur' ? '#ffffff' : 'transparent')}"></span><select data-p="${key}">${cv === null ? '<option selected>*VARIES*</option>' : ''}${COLORS.map(([n, c]) => `<option value="${c}" ${cv === c ? 'selected' : ''}>${n}</option>`).join('')}${cv && !COLORS.some(c => c[1] === cv) ? `<option value="${cv}" selected>${cv}</option>` : ''}<option value="__custom">Select Color...</option></select></div>`;

  if (!all.length) {
    cat('General', [
      ['Color', colorSel(App.doc.curColor || '', 'curColor')],
      ['Layer', `<select data-g="cur">${layerOpts(App.doc.cur)}</select>`],
      ['Linetype', `<select data-g="curLt">${ltOptions(App.doc.curLt, true)}</select>`],
      ['Linetype scale', `<input data-g="ltscale" value="${fmt(App.doc.ltscale || 1)}">`],
      ['Lineweight', `<select data-g="curLw">${lwOptions(App.doc.curLw, true)}</select>`],
      ['Transparency', '<span class="ro">ByLayer</span>'],
      ['Thickness', `<input data-g="elev" value="${fmt(App.doc.elev || 0)}" title="Elevation for new objects">`],
    ]);
    cat('Plot style', [['Plot style', `<span class="ro">${PLOT_STYLE}</span>`], ['Plot style table', '<span class="ro">monochrome.ctb</span>'], ['Plotted attached to', `<span class="ro">${esc(App.space)}</span>`]]);
    cat('View', [['Center X', `<span class="ro">${fmt(App.view.cx, 4)}</span>`], ['Center Y', `<span class="ro">${fmt(App.view.cy, 4)}</span>`], ['Height', `<span class="ro">${fmt(CH / App.view.s, 4)}</span>`], ['Width', `<span class="ro">${fmt(CW / App.view.s, 4)}</span>`]]);
    cat('Misc', [
      ['Annotation scale', '<span class="ro">1:1</span>'], ['UCS icon On', '<span class="ro">Yes</span>'], ['UCS Name', '<span class="ro"></span>'],
      ['Visual Style', `<span class="ro">${App.v3d ? VSTYLES[V3.style] : '2D Wireframe'}</span>`],
      ['Text height', `<input data-g="textH" value="${fmt(App.doc.textH)}">`],
      ['Grid spacing', `<input data-g="gridSize" value="${fmt(App.gridSize)}">`], ['Snap spacing', `<input data-g="snapSize" value="${fmt(App.snapSize)}">`],
      ['Polar increment', `<select data-g="polarInc">${[5, 10, 15, 22.5, 30, 45, 90].map(a => `<option ${a === App.polarInc ? 'selected' : ''}>${a}</option>`).join('')}</select>`],
    ]);
  } else {
    const lv = same(s.map(e => e.layer)), cv = same(s.map(e => e.color || '')), ltv = same(s.map(e => e.lt || '')), lwv = same(s.map(e => (e.lw === undefined ? '' : e.lw)));
    const trv = same(s.map(e => (e.tr === undefined ? 'ByLayer' : e.tr))), thv = same(s.map(e => e.thick || 0)), ltsv = same(s.map(e => e.lts || 1));
    cat('General', [
      ['Color', colorSel(cv, 'color')],
      ['Layer', `<select data-p="layer">${lv === null ? '<option selected>*VARIES*</option>' : ''}${layerOpts(lv)}</select>`],
      ['Linetype', `<select data-p="lt">${ltv === null ? '<option selected>*VARIES*</option>' : ''}${ltOptions(ltv || undefined, true)}</select>`],
      ['Linetype scale', `<input data-p="lts" value="${ltsv === null ? '*VARIES*' : fmt(ltsv)}">`],
      ['Plot style', `<span class="ro">${PLOT_STYLE}</span>`],
      ['Lineweight', `<select data-p="lw">${lwv === null ? '<option selected>*VARIES*</option>' : ''}${lwOptions(lwv === '' ? undefined : lwv, true)}</select>`],
      ['Transparency', `<input data-p="tr" value="${trv === null ? '*VARIES*' : trv}">`],
      ['Hyperlink', `<input data-p="href" value="${esc(same(s.map(e => e.href || '')) ?? '*VARIES*')}">`],
      ['Thickness', `<input data-p="thick" value="${thv === null ? '*VARIES*' : fmt(thv)}">`],
    ]);
    if (oneType) {
      const list = s;
      const first = Types[oneType].props(list[0]);
      const geo = first.map((p, i) => {
        const vals = list.map(e => { const q = Types[oneType].props(e)[i]; return q ? (typeof q.v === 'number' ? fmt(q.v) : String(q.v)) : ''; });
        const v = same(vals);
        const shown = v === null ? '*VARIES*' : v;
        return [p.k, p.set ? `<input data-i="${i}" data-k="${esc(p.k)}" value="${esc(shown)}">` : `<span class="ro">${esc(shown)}</span>`];
      });
      const catName = ['text', 'mtext', 'attdef'].includes(oneType) ? 'Text' : ['insert', 'table'].includes(oneType) ? 'Misc' : oneType === 'dim' ? 'Text & Primary Units' : 'Geometry';
      if (geo.length) cat(catName, geo);
    }
  }
  body.innerHTML = head + rows.map(r => `<div class="ppcat${this.propCollapsed[r.cat] ? ' closed' : ''}" data-cat="${esc(r.cat)}"><div class="ppcathead"><span class="ar">▾</span>${esc(r.cat)}</div><table class="pptable">${r.list.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table></div>`).join('');

  // ---- wiring ----
  body.querySelector('#ppType').onchange = (ev) => { this.propFilter = ev.target.value; this.refreshProps(); };
  const ps = body.querySelector('#ppSelect'); if (ps) ps.onclick = () => runCommand(async () => { App.sel.clear(); const r = await getSelection('Select objects', { noPickfirst: true }); App.usedSel = false; r.forEach(e => App.sel.add(e.id)); });
  body.querySelectorAll('.ppcathead').forEach(h => h.onclick = () => { const c = h.parentElement.dataset.cat; this.propCollapsed[c] = !this.propCollapsed[c]; h.parentElement.classList.toggle('closed'); });
  const pickColor = (cb) => { const inp = document.createElement('input'); inp.type = 'color'; inp.onchange = () => cb(inp.value); inp.click(); };
  body.querySelectorAll('[data-g]').forEach(el => el.onchange = () => {
    const k = el.dataset.g, v = el.value;
    if (k === 'cur') { this.change(() => { App.doc.cur = v; }); return; }
    if (k === 'curLt') { this.change(() => { App.doc.curLt = v || undefined; }); return; }
    if (k === 'curLw') { this.change(() => { App.doc.curLw = v === '' ? undefined : parseFloat(v); }); return; }
    if (k === 'elev') { const n = parseFloat(v); if (isFinite(n)) this.change(() => { App.doc.elev = n; }); return; }
    const n = parseFloat(v); if (!(n > 0)) return;
    if (k === 'textH' || k === 'ltscale') this.change(() => { App.doc[k] = n; });
    else { App[k] = n; App.dirty = true; }
  });
  const ccur = body.querySelector('[data-p=curColor]');
  if (ccur) ccur.onchange = () => { if (ccur.value === '__custom') pickColor(c => this.change(() => { App.doc.curColor = c; })); else this.change(() => { App.doc.curColor = ccur.value || undefined; }); };
  if (!all.length) return;
  const set = (fn) => this.change(() => s.forEach(e => { fn(e); invalidate(e); }));
  const q = (sel) => body.querySelector(sel);
  const cs = q('[data-p=color]'); cs.onchange = () => { if (cs.value === '__custom') pickColor(c => set(e => { e.color = c; })); else set(e => { if (cs.value) e.color = cs.value; else delete e.color; }); };
  q('[data-p=layer]').onchange = (ev) => set(e => { e.layer = ev.target.value; });
  q('[data-p=lt]').onchange = (ev) => set(e => { if (ev.target.value) e.lt = ev.target.value; else delete e.lt; });
  q('[data-p=lw]').onchange = (ev) => set(e => { if (ev.target.value === '') delete e.lw; else e.lw = parseFloat(ev.target.value); });
  q('[data-p=lts]').onchange = (ev) => { const n = parseFloat(ev.target.value); if (n > 0) set(e => { if (n === 1) delete e.lts; else e.lts = n; }); };
  q('[data-p=tr]').onchange = (ev) => { const v = ev.target.value.trim(); const n = parseInt(v, 10); set(e => { if (/^bylayer$/i.test(v) || v === '') delete e.tr; else if (n >= 0 && n <= 90) e.tr = n; }); };
  q('[data-p=href]').onchange = (ev) => set(e => { if (ev.target.value) e.href = ev.target.value; else delete e.href; });
  q('[data-p=thick]').onchange = (ev) => { const n = parseFloat(ev.target.value); if (n >= 0) set(e => { if (n) e.thick = n; else delete e.thick; }); };
  body.querySelectorAll('input[data-i]').forEach(inp => {
    inp.onchange = () => {
      if (inp.value === '*VARIES*') return;
      this.change(() => s.forEach(e => { const p = Types[e.type].props(e)[+inp.dataset.i]; if (p && p.set) { p.set(e, inp.value); invalidate(e); } }));
    };
    inp.onkeydown = (ev) => { if (ev.key === 'Enter') inp.blur(); };
  });
  body.querySelectorAll('input:not([data-i])').forEach(inp => { inp.onkeydown = (ev) => { if (ev.key === 'Enter') inp.blur(); }; });
};

// ---------- Text Editor contextual tab (while editing MTEXT) ----------
const TEXT_SYMBOLS = [['Degree', '°'], ['Plus/Minus', '±'], ['Diameter', 'Ø'], ['Almost equal', '≈'], ['Angle', '∠'], ['Center line', '℄'], ['Delta', 'Δ'], ['Not equal', '≠'], ['Ohm', 'Ω'], ['Squared', '²'], ['Cubed', '³'], ['Subscript 2', '₂']];
CONTEXT_TABS.textedit = {
  label: 'Text Editor',
  html: () => `<div class="rgroup"><div class="items"><div class="layerctl"><label class="ctxfield">Text height <input id="te_h" value="${fmt(App.mtextH || App.doc.textH)}"></label><label class="ctxfield">Style <select disabled><option>Standard</option></select></label></div></div><div class="glabel">Style</div></div>
    <div class="rgroup"><div class="items"><div class="smallcol"><button class="rbtn small" id="te_up">${icon('text')}<span>UPPERCASE</span></button><button class="rbtn small" id="te_low">${icon('text')}<span>lowercase</span></button></div></div><div class="glabel">Formatting</div></div>
    <div class="rgroup"><div class="items"><button class="rbtn" id="te_sym">${icon('dimang')}<span>Symbol</span></button><button class="rbtn" id="te_field">${icon('table')}<span>Field</span></button></div><div class="glabel">Insert</div></div>
    <div class="rgroup"><div class="items"><div class="layerctl"><label class="ctxfield">Find <input id="te_find"></label><label class="ctxfield">Replace <input id="te_rep"></label></div><button class="rbtn" id="te_fr">${icon('match')}<span>Replace All</span></button></div><div class="glabel">Tools</div></div>
    <div class="rgroup"><div class="items"><button class="rbtn" id="te_close">${icon('erase')}<span>Close Text Editor</span></button></div><div class="glabel">Close</div></div>`,
  bind: (root) => {
    const ta = () => document.querySelector('.mteditor textarea');
    const insert = (txt) => { const t = ta(); if (!t) return; const a = t.selectionStart, b = t.selectionEnd; t.value = t.value.slice(0, a) + txt + t.value.slice(b); t.selectionStart = t.selectionEnd = a + txt.length; t.focus(); };
    const caseSel = (up) => { const t = ta(); if (!t) return; let a = t.selectionStart, b = t.selectionEnd; if (a === b) { a = 0; b = t.value.length; } const mid = t.value.slice(a, b); t.value = t.value.slice(0, a) + (up ? mid.toUpperCase() : mid.toLowerCase()) + t.value.slice(b); t.focus(); };
    root.querySelector('#te_h').onchange = (ev) => { const n = parseFloat(ev.target.value); if (n > 0) { App.mtextH = n; const t = ta(); if (t) t.style.fontSize = Math.max(12, Math.min(40, n * App.view.s)) + 'px'; } };
    root.querySelector('#te_up').onclick = () => caseSel(true);
    root.querySelector('#te_low').onclick = () => caseSel(false);
    root.querySelector('#te_sym').onclick = (ev) => { ev.stopPropagation(); UI.popup(root.querySelector('#te_sym'), TEXT_SYMBOLS.map(([l, c]) => ({ label: `${l}  ${c}`, fn: () => insert(c) })).concat(['-', { label: 'Non-breaking Space', fn: () => insert(' ') }])); };
    root.querySelector('#te_field').onclick = (ev) => { ev.stopPropagation(); UI.popup(root.querySelector('#te_field'), [{ label: 'Date', fn: () => insert(todayStr()) }, { label: 'Filename', fn: () => insert(App.fileName) }, { label: 'Current layer', fn: () => insert(App.doc.cur) }]); };
    root.querySelector('#te_fr').onclick = () => { const t = ta(), f = root.querySelector('#te_find').value; if (!t || !f) return; const n = t.value.split(f).length - 1; t.value = t.value.split(f).join(root.querySelector('#te_rep').value); UI.log(`${n} replacement(s) made.`); t.focus(); };
    root.querySelector('#te_close').onclick = () => { const ok = document.querySelector('.mteditor [data-a=ok]'); if (ok) ok.click(); };
  },
};
{
  const orig = editTextInPlace;
  editTextInPlace = async function (p, w, h, init, multiline = true) { // eslint-disable-line no-global-assign
    if (multiline) { App.mtextH = h; UI.setContext('textedit'); }
    try { return await orig(p, w, h, init, multiline); } finally { if (multiline) UI.setContext(null); }
  };
}
