// Tool palette panel, dialog boxes (DIMSTYLE, QSELECT, OPTIONS)
'use strict';

// ---------- generic dialog ----------
UI.dialog = function (title, html, onOk, okLabel = 'OK') {
  let m = document.getElementById('dlgModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'dlgModal'; m.className = 'modal';
    m.innerHTML = '<div class="dialog ps"><div class="dhead"><b id="dlgTitle"></b><button id="dlgClose">✕</button></div><div class="dbody" id="dlgBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') m.hidden = true; });
  }
  document.getElementById('dlgTitle').textContent = title;
  document.getElementById('dlgBody').innerHTML = html + `<div class="btnrow" style="justify-content:flex-end"><button class="btn" id="dlgCancel">Cancel</button><button class="btn pri" id="dlgOk">${okLabel}</button></div>`;
  const close = () => { m.hidden = true; };
  document.getElementById('dlgClose').onclick = close;
  document.getElementById('dlgCancel').onclick = close;
  document.getElementById('dlgOk').onclick = () => { if (onOk() !== false) close(); };
  m.hidden = false;
  const first = m.querySelector('input,select'); if (first) first.focus();
};
const $v = (id) => document.getElementById(id).value;

// ---------- DIMSTYLE dialog ----------
Commands['-DIMSTYLE'] = Object.assign({}, Commands.DIMSTYLE, { alias: [] });
Commands.DIMSTYLE = { alias: ['D', 'DST', 'DDIM'], desc: 'Dimension Style Manager', noUndo: true, noRepeat: true, fn: async () => {
  const d = App.doc;
  UI.dialog('Dimension Style Manager — Standard', `
    <div class="psgrid">
      <fieldset><legend>Text</legend>
        <label>Text height <input id="ds_h" value="${fmt(d.dimH)}"></label>
        <label>Precision <select id="ds_p">${[0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === (d.dimPrec ?? 2) ? 'selected' : ''}>${n === 0 ? '0' : '0.' + '0'.repeat(n)}</option>`).join('')}</select></label>
        <label>Suffix <input id="ds_sfx" value="${esc(d.dimSuffix || '')}" placeholder="e.g. mm"></label>
      </fieldset>
      <fieldset><legend>Symbols and arrows</legend>
        <label>Arrow size <input id="ds_a" value="${fmt(d.dimAsz || d.dimH)}"></label>
        <label>Dimension layer <select id="ds_l">${d.layers.map(l => `<option ${l.name === 'Dimensions' ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
        <label><span>Apply to existing</span><input type="checkbox" id="ds_all" checked style="width:auto"></label>
      </fieldset>
    </div>`, () => {
    const h = parseFloat($v('ds_h')), a = parseFloat($v('ds_a'));
    if (!(h > 0) || !(a > 0)) { UI.log('Text height and arrow size must be positive.', 'err'); return false; }
    UI.change(() => {
      d.dimH = h; d.dimAsz = a; d.dimPrec = parseInt($v('ds_p'), 10); d.dimSuffix = $v('ds_sfx').trim() || undefined;
      if (document.getElementById('ds_all').checked) d.ents.forEach(e => {
        if (e.type !== 'dim' && e.type !== 'leader') return;
        e.h = h; e.asz = a; if (e.type === 'dim' && e.kind !== 'ang') e.prec = d.dimPrec;
        if (e.type === 'dim') e.txt = d.dimSuffix ? `<> ${d.dimSuffix}` : undefined;
        invalidate(e);
      });
    });
  });
} };

// ---------- QSELECT dialog ----------
Commands['-QSELECT'] = Object.assign({}, Commands.QSELECT, { alias: [] });
Commands.QSELECT = { alias: ['QSE'], desc: 'Quick Select', noUndo: true, noRepeat: true, fn: async () => {
  const types = [...new Set(App.doc.ents.map(e => e.type))];
  const label = (t) => Types[t].label;
  const props = { Layer: (e) => e.layer, Color: (e) => e.color || 'ByLayer', Linetype: (e) => e.lt || 'ByLayer', Lineweight: (e) => (e.lw === undefined ? 'ByLayer' : String(e.lw)), 'Block name': (e) => e.name || '' };
  const vals = (pr) => [...new Set(App.doc.ents.map(props[pr]))].filter(v => v !== '');
  UI.dialog('Quick Select', `
    <div class="psgrid"><fieldset class="wide">
      <label>Apply to <select id="qs_apply"><option value="all">Entire drawing</option><option value="sel" ${App.sel.size ? 'selected' : ''}>Current selection</option></select></label>
      <label>Object type <select id="qs_type"><option value="*">Multiple</option>${types.map(t => `<option value="${t}">${label(t)}</option>`).join('')}</select></label>
      <label>Properties <select id="qs_prop">${Object.keys(props).map(p => `<option>${p}</option>`).join('')}</select></label>
      <label>Operator <select id="qs_op"><option value="eq">= Equals</option><option value="ne">&lt;&gt; Not Equal</option><option value="all">Select All</option></select></label>
      <label>Value <select id="qs_val"></select></label>
      <label>How to apply <select id="qs_how"><option value="in">Include in new selection set</option><option value="out">Exclude from new selection set</option></select></label>
      <label><span>Append to current selection set</span><input type="checkbox" id="qs_app" style="width:auto"></label>
    </fieldset></div>`, () => {
    const pr = props[$v('qs_prop')], op = $v('qs_op'), val = $v('qs_val'), ty = $v('qs_type');
    const pool = $v('qs_apply') === 'sel' ? selEnts() : App.doc.ents.filter(editable);
    const match = (e) => (ty === '*' || e.type === ty) && (op === 'all' || (op === 'eq' ? String(pr(e)) === val : String(pr(e)) !== val));
    const res = pool.filter(e => ($v('qs_how') === 'in' ? match(e) : !match(e)));
    if (!document.getElementById('qs_app').checked) App.sel.clear();
    res.forEach(e => App.sel.add(e.id));
    App.dirty = true; UI.refreshProps(); UI.log(`${res.length} item(s) selected.`);
  });
  const fill = () => { document.getElementById('qs_val').innerHTML = vals($v('qs_prop')).map(v => `<option>${esc(v)}</option>`).join(''); };
  document.getElementById('qs_prop').onchange = fill; fill();
} };

// ---------- OPTIONS dialog ----------
App.opts = Object.assign({ bg: '#212830', cross: 5, grip: 4, pick: 6 }, (() => { try { return JSON.parse(localStorage.getItem('opendraft-options') || '{}'); } catch (_) { return {}; } })());
def('OPTIONS', ['OP', 'CONFIG', 'PREFERENCES'], 'Options: display, drafting and selection settings', async () => {
  const o = App.opts;
  UI.dialog('Options', `
    <div class="psgrid">
      <fieldset><legend>Display</legend>
        <label>Model space background <input type="color" id="op_bg" value="${o.bg}" style="width:60px"></label>
        <label>Crosshair size (%) <input id="op_cross" type="number" min="1" max="100" value="${o.cross}"></label>
        <label><span>Show constraint badges</span><input type="checkbox" id="op_cons" ${App.modes.cons ? 'checked' : ''} style="width:auto"></label>
      </fieldset>
      <fieldset><legend>Drafting &amp; Selection</legend>
        <label>Grip size (px) <input id="op_grip" type="number" min="2" max="12" value="${o.grip}"></label>
        <label>Pickbox size (px) <input id="op_pick" type="number" min="2" max="20" value="${o.pick}"></label>
        <label>Polar angle increment <select id="op_polar">${[5, 10, 15, 22.5, 30, 45, 90].map(a => `<option ${a === App.polarInc ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label>Insertion units <select id="op_units">${Object.keys(UNITS_MM).map(u => `<option ${u === (App.doc.insUnits || 'mm') ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      </fieldset>
    </div>`, () => {
    o.bg = $v('op_bg'); o.cross = Math.max(1, Math.min(100, +$v('op_cross') || 5)); o.grip = Math.max(2, Math.min(12, +$v('op_grip') || 4)); o.pick = Math.max(2, Math.min(20, +$v('op_pick') || 6));
    App.polarInc = parseFloat($v('op_polar')); App.doc.insUnits = $v('op_units');
    App.modes.cons = document.getElementById('op_cons').checked;
    try { localStorage.setItem('opendraft-options', JSON.stringify(o)); } catch (_) { /* ignore */ }
    document.getElementById('viewport').style.background = o.bg;
    App.dirty = true; UI.refreshProps();
  });
}, { noUndo: true, noRepeat: true });

// ---------- tool palette panel ----------
UI.openTools = function (cat) {
  let p = document.getElementById('toolpal');
  if (p && !p.hidden && !cat) { p.hidden = true; return; }
  if (!p) {
    p = document.createElement('div'); p.id = 'toolpal';
    document.getElementById('viewport').appendChild(p);
    p.addEventListener('click', (ev) => {
      const tab = ev.target.closest('[data-tcat]'); if (tab) { UI.openTools(tab.dataset.tcat); return; }
      if (ev.target.closest('.tpclose')) { p.hidden = true; return; }
      const tile = ev.target.closest('[data-tool]');
      if (tile) { const t = TOOLS.find(x => x.id === tile.dataset.tool); if (t) runCommand(() => insertTool(t)); }
    });
    p.addEventListener('change', (ev) => { if (ev.target.id === 'tpUnits') { App.doc.insUnits = ev.target.value; UI.log(`Insertion units: ${ev.target.value}`); } });
    p.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  }
  UI.toolCat = cat || UI.toolCat || 'Architecture';
  const list = TOOLS.filter(t => t.cat === UI.toolCat);
  p.innerHTML = `<div class="tphead"><b>Tool Palettes</b><select id="tpUnits" title="Drawing units used for symbol sizes">${Object.keys(UNITS_MM).map(u => `<option ${u === (App.doc.insUnits || 'mm') ? 'selected' : ''}>${u}</option>`).join('')}</select><button class="tpclose" title="Close (Ctrl+3)">✕</button></div>
    <div class="tptabs">${TOOL_CATS.map(c => `<button data-tcat="${c}" class="${c === UI.toolCat ? 'on' : ''}">${c}</button>`).join('')}</div>
    <div class="tpgrid">${list.map(t => `<button class="tptile" data-tool="${t.id}" title="${esc(t.name)} — layer ${t.layer}">${toolSVG(t)}<span>${esc(t.name)}</span></button>`).join('')}</div>`;
  p.hidden = false;
};

document.getElementById('viewport').style.background = App.opts.bg;

// keys typed while focus is stranded inside a closed dialog go back to the command line
document.addEventListener('keydown', (ev) => {
  const t = ev.target;
  if (t && t.closest && t.closest('.modal[hidden]')) { t.blur(); document.getElementById('cmdinput').focus(); }
}, true);
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('.modal button');
  if (b) setTimeout(() => { if (b.closest('.modal[hidden]')) b.blur(); }, 0);
}, true);
