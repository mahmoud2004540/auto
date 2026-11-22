// User interface: ribbon, palettes, command line, status bar, keyboard
'use strict';

const ICONS = {
  line: '<path d="M4 20 20 4"/><rect x="2.5" y="18.5" width="3" height="3"/><rect x="18.5" y="2.5" width="3" height="3"/>',
  pline: '<path d="M3 19 8 8l6 7 7-11"/>',
  circle: '<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/><circle cx="12" cy="12" r=".8"/>',
  arc: '<path d="M4 18a9 9 0 0 1 16 0"/><rect x="2.5" y="17" width="3" height="3"/><rect x="18.5" y="17" width="3" height="3"/>',
  rect: '<rect x="4" y="6" width="16" height="12"/>',
  polygon: '<path d="M12 3 20 8v8l-8 5-8-5V8z"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/>',
  text: '<path d="M5 5h14M12 5v15M9 20h6"/>',
  dimlin: '<path d="M4 7v13M20 7v13M4 15h16"/><path d="M7 13l-3 2 3 2M17 13l3 2-3 2"/><path d="M9 10h6"/>',
  dimali: '<path d="M4 18 16 6M8 20 20 8"/><path d="M6 19l12-12"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  copy: '<rect x="4" y="4" width="11" height="11"/><rect x="9" y="9" width="11" height="11"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  mirror: '<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 6 3 18h6zM15 6l6 12h-6z"/>',
  scale: '<rect x="3" y="11" width="10" height="10"/><path d="M13 11 21 3M15 3h6v6"/>',
  offset: '<path d="M4 18C8 8 16 8 20 4"/><path d="M4 22C9 12 17 12 21 9"/>',
  trim: '<path d="M3 12h18"/><path d="M12 3v6M12 15v6" stroke-dasharray="2 2"/><path d="M15 5l4 4M19 5l-4 4"/>',
  extend: '<path d="M21 3v18"/><path d="M3 12h12" /><path d="M15 12h5" stroke-dasharray="2 2"/>',
  fillet: '<path d="M4 20V11a7 7 0 0 1 7-7h9"/>',
  array: '<rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/><rect x="17" y="3" width="4" height="5"/><rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="3" y="17" width="5" height="4"/>',
  arrayp: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="4" r="1.6"/><circle cx="19" cy="16" r="1.6"/><circle cx="5" cy="16" r="1.6"/>',
  explode: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
  erase: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  dist: '<path d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  area: '<path d="M4 18 7 5l13 3-3 12z" fill="currentColor" fill-opacity=".18"/>',
  id: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>',
  selall: '<rect x="4" y="4" width="16" height="16" stroke-dasharray="3 2"/><path d="M8 12l3 3 5-6"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/>',
  match: '<path d="M4 20l6-6M14 4l6 6-8 8-6-6z"/>',
  zoomext: '<rect x="3" y="3" width="18" height="18" stroke-dasharray="3 2"/><path d="M8 8h8v8H8z"/>',
  zoomin: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20M7 10h6M10 7v6"/>',
  zoomout: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20M7 10h6"/>',
  zoomwin: '<rect x="3" y="5" width="12" height="10" stroke-dasharray="3 2"/><circle cx="16" cy="15" r="4"/><path d="M19 18l3 3"/>',
  pan: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.6 0-4-1.4-5.6-4L4 13.5a1.5 1.5 0 0 1 2.4-1.8L8 14"/>',
  new: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  open: '<path d="M3 7h6l2 2h10v10H3z"/>',
  save: '<path d="M5 3h12l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  export: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 15v6h16v-6"/>',
  svg: '<path d="M4 4h16v16H4z"/><path d="M7 15c2-6 8-6 10 0"/>',
  png: '<rect x="3" y="5" width="18" height="14"/><circle cx="8" cy="10" r="1.5"/><path d="M3 17l5-4 4 3 4-5 5 6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  props: '<rect x="4" y="3" width="16" height="18"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',
  cut: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16 18 3M16 16 6 3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
};
const icon = (k) => `<svg class="ic" viewBox="0 0 24 24">${ICONS[k] || ''}</svg>`;

const RIBBON = {
  Home: [
    { label: 'Draw', items: [['LINE', 'Line', 'line'], ['PLINE', 'Polyline', 'pline'], ['CIRCLE', 'Circle', 'circle'], ['ARC', 'Arc', 'arc'],
      { col: [['RECTANG', 'Rectangle', 'rect'], ['POLYGON', 'Polygon', 'polygon'], ['ELLIPSE', 'Ellipse', 'ellipse']] }] },
    { label: 'Modify', items: [
      { col: [['MOVE', 'Move', 'move'], ['COPY', 'Copy', 'copy'], ['ROTATE', 'Rotate', 'rotate']] },
      { col: [['MIRROR', 'Mirror', 'mirror'], ['SCALE', 'Scale', 'scale'], ['OFFSET', 'Offset', 'offset']] },
      { col: [['TRIM', 'Trim', 'trim'], ['EXTEND', 'Extend', 'extend'], ['FILLET', 'Fillet', 'fillet']] },
      { col: [['ARRAYRECT', 'Array', 'array'], ['EXPLODE', 'Explode', 'explode'], ['ERASE', 'Erase', 'erase']] }] },
    { label: 'Annotation', items: [['TEXT', 'Text', 'text'], ['DIMLINEAR', 'Dimension', 'dimlin']] },
    { label: 'Layers', items: [['LAYER', 'Layer Properties', 'layers'], { layerctl: true }] },
    { label: 'Properties', items: [['MATCHPROP', 'Match Properties', 'match'], { colorctl: true }] },
    { label: 'Utilities', items: [['DIST', 'Measure', 'dist'], { col: [['AREA', 'Area', 'area'], ['ID', 'ID Point', 'id'], ['LIST', 'List', 'list']] }] },
    { label: 'Clipboard', items: [['PASTECLIP', 'Paste', 'paste'], { col: [['COPYCLIP', 'Copy Clip', 'copy'], ['CUTCLIP', 'Cut', 'cut']] }] },
    { label: 'View', items: [['ZOOM_EXT', 'Extents', 'zoomext']] },
  ],
  Insert: [
    { label: 'Import', items: [['OPEN', 'Open DXF', 'open'], ['PASTECLIP', 'Paste', 'paste']] },
    { label: 'Array', items: [['ARRAYRECT', 'Rectangular', 'array'], ['ARRAYPOLAR', 'Polar', 'arrayp'], ['COPY', 'Path Copy', 'copy']] },
  ],
  Annotate: [
    { label: 'Text', items: [['TEXT', 'Single Line', 'text']] },
    { label: 'Dimensions', items: [['DIMLINEAR', 'Linear', 'dimlin'], ['DIMALIGNED', 'Aligned', 'dimali']] },
    { label: 'Inquiry', items: [['DIST', 'Distance', 'dist'], ['AREA', 'Area', 'area']] },
  ],
  View: [
    { label: 'Navigate', items: [['ZOOM_EXT', 'Extents', 'zoomext'], ['ZOOM', 'Window', 'zoomwin'], ['PAN', 'Pan', 'pan'], { col: [['ZOOM_IN', 'Zoom In', 'zoomin'], ['ZOOM_OUT', 'Zoom Out', 'zoomout']] }] },
    { label: 'Palettes', items: [['PROPERTIES', 'Properties', 'props'], ['LAYER', 'Layers', 'layers'], ['TOGGLE_SIDE', 'Show/Hide', 'props']] },
  ],
  Manage: [
    { label: 'Actions', items: [['UNDO', 'Undo', 'undo'], ['REDO', 'Redo', 'redo'], ['SELECTALL', 'Select All', 'selall']] },
    { label: 'Help', items: [['HELP', 'Commands', 'help']] },
  ],
  Output: [
    { label: 'File', items: [['NEW', 'New', 'new'], ['OPEN', 'Open', 'open'], ['SAVE', 'Save', 'save']] },
    { label: 'Export', items: [['DXFOUT', 'DXF', 'export'], ['SVGOUT', 'SVG', 'svg'], ['PNGOUT', 'PNG Plot', 'png']] },
  ],
};

const COLORS = [['ByLayer', ''], ['Red', '#ff0000'], ['Yellow', '#ffff00'], ['Green', '#00ff00'], ['Cyan', '#00ffff'], ['Blue', '#0000ff'], ['Magenta', '#ff00ff'], ['White', '#ffffff'], ['Gray', '#808080'], ['Orange', '#ff7f00']];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  tab: 'Home',
  cmdHist: [], histIdx: -1,
  sugg: [], suggIdx: -1,

  init() {
    document.querySelectorAll('[data-icon]').forEach(b => { b.innerHTML = icon(b.dataset.icon); });
    this.buildRibbon();
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cmd]');
      if (b) { ev.preventDefault(); b.blur(); this.exec(b.dataset.cmd); }
      const m = ev.target.closest('[data-mode]');
      if (m) { this.toggleMode(m.dataset.mode); }
      const kw = ev.target.closest('.kw');
      if (kw) submitInput(kw.dataset.kw);
      const col = ev.target.closest('.collapse');
      if (col) { const body = $(col.dataset.target); body.classList.toggle('hidden'); col.textContent = body.classList.contains('hidden') ? '+' : '–'; }
      if (!ev.target.closest('#osnapMenu') && !ev.target.closest('#osnapMenuBtn')) this.toggleOsnapMenu(false);
      if (ev.target.closest('#osnapMenuBtn')) this.toggleOsnapMenu();
      const lt = ev.target.closest('[data-layout]');
      if (lt) {
        if (lt.dataset.layout === 'Model') return;
        this.log('Paper space layouts are not available yet — drawing stays in Model space.', 'err');
      }
      const sg = ev.target.closest('#suggest div');
      if (sg) { $('cmdinput').value = ''; this.hideSuggest(); runCommand(sg.dataset.name); }
    });
    $('helpClose').onclick = () => { $('helpModal').hidden = true; };
    $('helpModal').onclick = (e) => { if (e.target.id === 'helpModal') $('helpModal').hidden = true; };
    this.bindKeys();
    this.buildOsnapMenu();
    // drag & drop files
    const vp = $('viewport');
    vp.addEventListener('dragover', (e) => { e.preventDefault(); });
    vp.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) IO.loadFile(f); });
    window.addEventListener('beforeunload', (e) => { if (App.modified) { e.preventDefault(); e.returnValue = ''; } });
    this.refreshAll();
  },

  exec(cmd) {
    switch (cmd) {
      case 'ZOOM_EXT': zoomExtents(); return;
      case 'ZOOM_IN': zoomAt({ x: CW / 2, y: CH / 2 }, 1.5); return;
      case 'ZOOM_OUT': zoomAt({ x: CW / 2, y: CH / 2 }, 1 / 1.5); return;
      case 'TOGGLE_SIDE': this.toggleSide(); return;
      default: runCommand(cmd);
    }
  },

  buildRibbon() {
    const tabs = $('ribbonTabs');
    tabs.innerHTML = Object.keys(RIBBON).map(t => `<button class="${t === this.tab ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('');
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; this.buildRibbon(); });
    const btn = ([c, l, i], small) => `<button class="rbtn${small ? ' small' : ''}" data-cmd="${c}" title="${esc(l)}${Commands[c] ? ' (' + c + ')' : ''}">${icon(i)}<span>${esc(l)}</span></button>`;
    $('ribbonPanels').innerHTML = RIBBON[this.tab].map(g => `<div class="rgroup"><div class="items">${g.items.map(it => {
      if (Array.isArray(it)) return btn(it);
      if (it.col) return `<div class="smallcol">${it.col.map(x => btn(x, true)).join('')}</div>`;
      if (it.colorctl) return `<div class="layerctl"><select id="ribbonColor" title="Color for new objects">${COLORS.map(([n, c]) => `<option value="${c}">${n}</option>`).join('')}</select><select disabled title="Linetype"><option>Continuous — ByLayer</option></select><select disabled title="Lineweight"><option>Default — ByLayer</option></select></div>`;
      if (it.layerctl) return `<div class="layerctl"><select id="ribbonLayer" title="Current layer"></select><div class="muted" style="font-size:11px">Current layer</div></div>`;
      return '';
    }).join('')}</div><div class="glabel">${g.label}</div></div>`).join('');
    const rl = $('ribbonLayer');
    if (rl) rl.onchange = () => {
      const v = rl.value; const s = selEnts();
      this.change(() => { if (s.length) s.forEach(e => { e.layer = v; }); else App.doc.cur = v; });
      rl.blur();
    };
    const rc = $('ribbonColor');
    if (rc) {
      rc.value = App.doc.curColor || '';
      rc.onchange = () => { const s = selEnts(); this.change(() => { if (s.length) s.forEach(e => { if (rc.value) e.color = rc.value; else delete e.color; }); else App.doc.curColor = rc.value || undefined; }); rc.blur(); };
    }
    this.refreshLayers();
  },

  // perform an undoable change from the UI
  change(fn) {
    if (App.cmd) cancelReq();
    const before = snapshot();
    fn();
    if (snapshot() !== before) pushUndo(before);
    App.dirty = true;
    this.refreshProps(); this.refreshLayers();
  },

  refreshAll() { this.refreshLayers(); this.refreshProps(); this.refreshStatus(); this.refreshTitle(); this.setPrompt('', null); },
  refreshTitle() { $('ftabName').textContent = App.fileName + (App.modified ? '*' : ''); $('doctitle').textContent = `${App.fileName}${App.modified ? ' *' : ''}  —  OpenDraft CAD`; document.title = `${App.fileName}${App.modified ? '*' : ''} - OpenDraft CAD`; },

  refreshStatus() {
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', !!App.modes[b.dataset.mode]));
    App.dirty = true;
  },
  toggleMode(m) {
    App.modes[m] = !App.modes[m];
    if (m === 'ortho' && App.modes.ortho) App.modes.polar = false;
    if (m === 'polar' && App.modes.polar) App.modes.ortho = false;
    const names = { grid: 'Grid', snap: 'Snap', ortho: 'Ortho', polar: 'Polar', osnap: 'Osnap', dyn: 'Dynamic input' };
    this.log(`<${names[m]} ${App.modes[m] ? 'on' : 'off'}>`);
    this.refreshStatus(); updateEffective(); updatePreview();
  },
  buildOsnapMenu() {
    const names = { end: 'Endpoint', mid: 'Midpoint', cen: 'Center', quad: 'Quadrant', int: 'Intersection', perp: 'Perpendicular', ins: 'Insertion', node: 'Node', near: 'Nearest' };
    $('osnapMenu').innerHTML = Object.keys(names).map(k => `<label><input type="checkbox" data-os="${k}" ${App.osnaps[k] ? 'checked' : ''}> ${names[k]}</label>`).join('');
    $('osnapMenu').querySelectorAll('input').forEach(i => i.onchange = () => { App.osnaps[i.dataset.os] = i.checked; });
  },
  toggleOsnapMenu(force) {
    const m = $('osnapMenu');
    const show = force === undefined ? m.hidden : force;
    if (show) { this.buildOsnapMenu(); const r = $('osnapMenuBtn').getBoundingClientRect(); m.style.left = Math.max(4, r.left - 80) + 'px'; }
    m.hidden = !show;
  },
  toggleSide() { const s = $('side'); if (window.innerWidth <= 760) s.classList.toggle('open'); else s.hidden = !s.hidden; resize(); },
  openPanel(which) {
    const s = $('side'); s.hidden = false; s.classList.add('open'); resize();
    const body = $(which === 'layers' ? 'layersBody' : 'propsBody'); body.classList.remove('hidden');
    body.scrollIntoView({ block: 'nearest' });
  },

  // ---------- command line ----------
  log(msg, cls = '') {
    const h = $('history');
    const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg;
    h.appendChild(d);
    while (h.childNodes.length > 500) h.removeChild(h.firstChild);
    h.scrollTop = h.scrollHeight;
  },
  echo(prompt, val) { this.log(`${prompt}: ${val}`); },
  showHistory(big) { $('history').classList.toggle('big', big === undefined ? !$('history').classList.contains('big') : big); $('history').scrollTop = 1e9; },
  setPrompt(text, keywords) {
    const p = $('prompt');
    if (!text) { p.innerHTML = App.cmd ? esc(App.cmd) : '<span class="muted">Type a command</span>'; this.updateDyn(); return; }
    let html = esc(text);
    if (keywords && keywords.length) {
      html += ' [' + keywords.map(k => `<span class="kw" data-kw="${esc(k)}">${esc(k)}</span>`).join('/') + ']';
    }
    p.innerHTML = html + ':';
    this.updateDyn();
  },
  updateCoords() {
    const p = App.req && ['point', 'dist', 'angle'].includes(App.req.kind) ? App.eff : App.raw;
    $('coords').textContent = `${p.x.toFixed(4)}, ${p.y.toFixed(4)}`;
  },
  updateDyn() {
    const d = $('dyn');
    const typed = $('cmdinput') ? $('cmdinput').value : '';
    if (!App.modes.dyn || !App.over || (!App.req && !typed)) { d.hidden = true; return; }
    let html = '';
    const r = App.req;
    if (r) {
      html = esc(r.prompt.replace(/\s*<[^>]*>$/, ''));
      const base = r.base || r.tmpBase;
      if (base && ['point', 'dist', 'angle'].includes(r.kind)) {
        const L = V.dist(base, App.eff), A = deg(normAng(V.ang(base, App.eff)));
        html += `<span class="v">${typed ? esc(typed) : fmt(L, 3)}</span> &lt; ${fmt(A, 1)}°`;
      } else if (typed) html += `<span class="v">${esc(typed)}</span>`;
    } else html = `<span class="v">${esc(typed)}</span>`;
    d.innerHTML = html;
    d.hidden = false;
    const x = Math.min(App.scr.x + 20, CW - d.offsetWidth - 4), y = Math.min(App.scr.y + 22, CH - 26);
    d.style.left = x + 'px'; d.style.top = y + 'px';
  },

  updateSuggest() {
    const v = $('cmdinput').value.trim().toUpperCase();
    if (!v || App.req) { this.hideSuggest(); return; }
    const out = [];
    for (const k in Commands) {
      const al = Commands[k].alias || [];
      const score = k === v || al.includes(v) ? 0 : k.startsWith(v) ? 1 : al.some(a => a.startsWith(v)) ? 2 : k.includes(v) ? 3 : 9;
      if (score < 9) out.push({ k, score });
    }
    out.sort((a, b) => a.score - b.score || a.k.localeCompare(b.k));
    this.sugg = out.slice(0, 10).map(o => o.k);
    this.suggIdx = -1;
    const s = $('suggest');
    if (!this.sugg.length) { this.hideSuggest(); return; }
    s.innerHTML = this.sugg.map((k, i) => `<div data-name="${k}" class="${i === this.suggIdx ? 'sel' : ''}"><span>${k}${Commands[k].alias.length ? ' <small>(' + Commands[k].alias.join(', ') + ')</small>' : ''}</span><small>${esc(Commands[k].desc)}</small></div>`).join('');
    s.hidden = false;
  },
  hideSuggest() { $('suggest').hidden = true; this.sugg = []; this.suggIdx = -1; },
  moveSuggest(d) {
    if (!this.sugg.length) return false;
    this.suggIdx = (this.suggIdx + d + this.sugg.length) % this.sugg.length;
    [...$('suggest').children].forEach((c, i) => c.classList.toggle('sel', i === this.suggIdx));
    return true;
  },

  bindKeys() {
    const inp = $('cmdinput');
    inp.addEventListener('input', () => { this.updateSuggest(); this.updateDyn(); });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || (ev.key === ' ' && !(App.req && App.req.kind === 'string'))) {
        ev.preventDefault(); ev.stopPropagation();
        let v = inp.value;
        if (this.suggIdx >= 0 && this.sugg[this.suggIdx]) v = this.sugg[this.suggIdx];
        inp.value = ''; this.hideSuggest();
        if (!App.req && v.trim()) { this.cmdHist.push(v.trim()); this.histIdx = -1; }
        submitInput(v);
        this.updateDyn();
        return;
      }
      if (ev.key === 'Tab') { ev.preventDefault(); if (this.sugg.length) { inp.value = this.sugg[Math.max(0, this.suggIdx)]; this.updateSuggest(); } return; }
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (this.moveSuggest(ev.key === 'ArrowUp' ? -1 : 1)) return;
        if (!this.cmdHist.length) return;
        if (this.histIdx < 0) this.histIdx = this.cmdHist.length;
        this.histIdx = Math.max(0, Math.min(this.cmdHist.length - 1, this.histIdx + (ev.key === 'ArrowUp' ? -1 : 1)));
        inp.value = this.cmdHist[this.histIdx];
      }
    });

    document.addEventListener('keydown', (ev) => {
      const t = ev.target;
      const isCmd = t === inp;
      const inField = !isCmd && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
      const fk = { F1: () => this.showHelp(), F2: () => this.showHistory(), F3: () => this.toggleMode('osnap'), F7: () => this.toggleMode('grid'), F8: () => this.toggleMode('ortho'), F9: () => this.toggleMode('snap'), F10: () => this.toggleMode('polar'), F12: () => this.toggleMode('dyn') };
      if (fk[ev.key]) { ev.preventDefault(); fk[ev.key](); return; }
      if (ev.key === 'Escape') {
        if (!$('helpModal').hidden) { $('helpModal').hidden = true; return; }
        if (inField) { t.blur(); return; }
        this.hideSuggest(); this.toggleOsnapMenu(false);
        if (inp.value) { inp.value = ''; this.updateDyn(); return; }
        if (App.req || App.cmd) { cancelReq(); return; }
        App.win = null; App.hotGrip = null; App.sel.clear(); App.dirty = true; this.refreshProps();
        return;
      }
      if (inField) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod) {
        const k = ev.key.toLowerCase();
        const map = { z: 'UNDO', y: 'REDO', s: 'SAVE', o: 'OPEN', a: 'SELECTALL', n: 'NEW', p: 'PNGOUT', c: 'COPYCLIP', v: 'PASTECLIP', x: 'CUTCLIP' };
        if (k === 'z' && ev.shiftKey) { ev.preventDefault(); runCommand('REDO'); return; }
        if (map[k] && !(isCmd && 'acvx'.includes(k) && inp.value)) { ev.preventDefault(); runCommand(map[k]); }
        return;
      }
      if ((ev.key === 'Delete' || (ev.key === 'Backspace' && !isCmd)) && !App.cmd && App.sel.size) { ev.preventDefault(); runCommand('ERASE'); return; }
      if (isCmd) return;
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); submitInput(''); return; }
      if (ev.key.length === 1 && !ev.altKey) inp.focus();
    });
  },

  // ---------- properties palette ----------
  refreshProps() {
    const body = $('propsBody');
    const s = selEnts();
    $('selinfo').textContent = s.length ? `${s.length} selected` : '';
    const layerOpts = (cur) => App.doc.layers.map(l => `<option value="${esc(l.name)}" ${l.name === cur ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
    if (!s.length) {
      body.innerHTML = `<div class="muted" style="padding:2px 0 6px">No selection</div>
      <table class="ptable">
        <tr><td colspan="2" class="psec">General</td></tr>
        <tr><td>Current layer</td><td><select data-g="cur">${layerOpts(App.doc.cur)}</select></td></tr>
        <tr><td>Text height</td><td><input data-g="textH" value="${fmt(App.doc.textH)}"></td></tr>
        <tr><td>Dim text height</td><td><input data-g="dimH" value="${fmt(App.doc.dimH)}"></td></tr>
        <tr><td colspan="2" class="psec">Drafting</td></tr>
        <tr><td>Grid spacing</td><td><input data-g="gridSize" value="${fmt(App.gridSize)}"></td></tr>
        <tr><td>Snap spacing</td><td><input data-g="snapSize" value="${fmt(App.snapSize)}"></td></tr>
        <tr><td>Polar increment</td><td><select data-g="polarInc">${[5, 10, 15, 22.5, 30, 45, 90].map(a => `<option ${a === App.polarInc ? 'selected' : ''}>${a}</option>`).join('')}</select></td></tr>
        <tr><td colspan="2" class="psec">Drawing</td></tr>
        <tr><td>Objects</td><td class="ro">${App.doc.ents.length}</td></tr>
      </table>`;
      body.querySelectorAll('[data-g]').forEach(el => el.onchange = () => {
        const k = el.dataset.g, v = el.value;
        if (k === 'cur') { this.change(() => { App.doc.cur = v; }); return; }
        const n = parseFloat(v); if (!(n > 0)) return;
        if (k === 'textH' || k === 'dimH') this.change(() => { App.doc[k] = n; });
        else { App[k] = n; App.dirty = true; }
      });
      return;
    }
    const types = {};
    s.forEach(e => { types[Types[e.type].label] = (types[Types[e.type].label] || 0) + 1; });
    const layers = new Set(s.map(e => e.layer)), colors = new Set(s.map(e => e.color || ''));
    const lv = layers.size === 1 ? [...layers][0] : null, cv = colors.size === 1 ? [...colors][0] : null;
    let html = `<div style="padding:2px 0 6px"><b>${s.length === 1 ? Types[s[0].type].label : s.length + ' objects'}</b> <span class="muted">${s.length > 1 ? Object.entries(types).map(([k, v]) => `${v} ${k}`).join(', ') : ''}</span></div>
      <table class="ptable"><tr><td colspan="2" class="psec">General</td></tr>
      <tr><td>Layer</td><td><select data-p="layer">${lv ? '' : '<option selected>*VARIES*</option>'}${layerOpts(lv)}</select></td></tr>
      <tr><td>Color</td><td><div style="display:flex;gap:3px"><select data-p="color" style="flex:1">${cv === null ? '<option selected>*VARIES*</option>' : ''}${COLORS.map(([n, c]) => `<option value="${c}" ${cv === c ? 'selected' : ''}>${n}</option>`).join('')}${cv && !COLORS.some(c => c[1] === cv) ? `<option value="${cv}" selected>${cv}</option>` : ''}</select><input type="color" data-p="colorpick" value="${cv || '#ffffff'}" style="width:26px;padding:0"></div></td></tr>`;
    if (s.length === 1) {
      html += `<tr><td colspan="2" class="psec">Geometry</td></tr>`;
      Types[s[0].type].props(s[0]).forEach((p, i) => {
        const val = typeof p.v === 'number' ? fmt(p.v) : p.v;
        html += `<tr><td>${esc(p.k)}</td><td>${p.set ? `<input data-i="${i}" data-k="${esc(p.k)}" value="${esc(val)}">` : `<span class="ro">${esc(val)}</span>`}</td></tr>`;
      });
    }
    html += '</table>';
    body.innerHTML = html;
    const sl = body.querySelector('[data-p=layer]');
    sl.onchange = () => this.change(() => s.forEach(e => { e.layer = sl.value; }));
    const sc = body.querySelector('[data-p=color]');
    sc.onchange = () => this.change(() => s.forEach(e => { if (sc.value) e.color = sc.value; else delete e.color; }));
    const cp = body.querySelector('[data-p=colorpick]');
    cp.onchange = () => this.change(() => s.forEach(e => { e.color = cp.value; }));
    body.querySelectorAll('input[data-i]').forEach(inp => {
      inp.onchange = () => {
        const e = s[0]; const p = Types[e.type].props(e)[+inp.dataset.i];
        this.change(() => { p.set(e, inp.value); invalidate(e); });
      };
      inp.onkeydown = (ev) => { if (ev.key === 'Enter') inp.blur(); };
    });
  },
  focusProp(name) {
    this.openPanel('props');
    const i = $('propsBody').querySelector(`input[data-k="${CSS.escape(name)}"]`);
    if (i) { i.focus(); i.select(); }
  },

  // ---------- layers palette ----------
  refreshLayers() {
    const body = $('layersBody');
    const counts = {};
    App.doc.ents.forEach(e => { counts[e.layer] = (counts[e.layer] || 0) + 1; });
    body.innerHTML = `<table class="ltable"><tr><th></th><th>Name</th><th>On</th><th>Lock</th><th>Color</th><th></th></tr>
      ${App.doc.layers.map((l, i) => `<tr class="${l.name === App.doc.cur ? 'cur' : ''}">
        <td><button data-l="cur" data-i="${i}" title="Set current">${l.name === App.doc.cur ? '✔' : '·'}</button></td>
        <td><input class="name" data-l="name" data-i="${i}" value="${esc(l.name)}" ${l.name === '0' ? 'readonly' : ''} title="${counts[l.name] || 0} object(s)"></td>
        <td><button data-l="on" data-i="${i}" title="On/Off">${l.on ? '●' : '○'}</button></td>
        <td><button data-l="lock" data-i="${i}" title="Lock/Unlock">${l.locked ? '🔒' : '🔓'}</button></td>
        <td><input type="color" data-l="color" data-i="${i}" value="${l.color}"></td>
        <td><button data-l="del" data-i="${i}" title="Delete layer">✕</button></td></tr>`).join('')}
      </table><div class="btnrow"><button class="btn" id="newLayer">+ New layer</button><button class="btn" id="layerFromSel" title="Make the selected object's layer current">Match current</button></div>`;
    body.querySelectorAll('[data-l]').forEach(el => {
      const l = App.doc.layers[+el.dataset.i];
      const act = el.dataset.l;
      if (act === 'name') { el.onchange = () => this.renameLayer(l, el.value.trim()); el.onkeydown = (e) => { if (e.key === 'Enter') el.blur(); }; return; }
      if (act === 'color') { el.onchange = () => this.change(() => { l.color = el.value; }); return; }
      el.onclick = () => {
        if (act === 'cur') this.change(() => { App.doc.cur = l.name; l.on = true; });
        if (act === 'on') this.change(() => { l.on = !l.on; if (!l.on) App.doc.ents.forEach(e => { if (e.layer === l.name) App.sel.delete(e.id); }); });
        if (act === 'lock') this.change(() => { l.locked = !l.locked; });
        if (act === 'del') {
          if (l.name === '0' || l.name === App.doc.cur) { this.log('Cannot delete layer 0 or the current layer.', 'err'); return; }
          if (counts[l.name]) { this.log(`Layer "${l.name}" contains ${counts[l.name]} object(s) and cannot be deleted.`, 'err'); return; }
          this.change(() => { App.doc.layers = App.doc.layers.filter(x => x !== l); });
        }
      };
    });
    $('newLayer').onclick = () => {
      let n = 1; while (App.doc.layers.some(l => l.name === 'Layer' + n)) n++;
      const palette = ['#ff0000', '#00ff00', '#00ffff', '#ff00ff', '#ff7f00', '#ffff00', '#0080ff'];
      this.change(() => { App.doc.layers.push({ name: 'Layer' + n, color: palette[(n - 1) % palette.length], on: true, locked: false }); });
    };
    $('layerFromSel').onclick = () => { const s = selEnts(); if (s.length) this.change(() => { App.doc.cur = s[0].layer; }); };
    const rl = $('ribbonLayer');
    if (rl) {
      const s = selEnts(); const ls = new Set(s.map(e => e.layer));
      const show = s.length ? (ls.size === 1 ? [...ls][0] : null) : App.doc.cur;
      rl.innerHTML = (show === null ? '<option selected>*VARIES*</option>' : '') + App.doc.layers.map(l => `<option value="${esc(l.name)}" ${l.name === show ? 'selected' : ''}>${l.on ? '●' : '○'} ${esc(l.name)}</option>`).join('');
      rl.style.color = (App.doc.layers.find(l => l.name === show) || {}).color || '';
    }
  },
  renameLayer(l, n) {
    if (!n || n === l.name) { this.refreshLayers(); return; }
    if (App.doc.layers.some(x => x.name.toLowerCase() === n.toLowerCase())) { this.log(`Layer "${n}" already exists.`, 'err'); this.refreshLayers(); return; }
    this.change(() => {
      App.doc.ents.forEach(e => { if (e.layer === l.name) e.layer = n; });
      if (App.doc.cur === l.name) App.doc.cur = n;
      l.name = n;
    });
  },

  // ---------- help ----------
  showHelp() {
    const rows = Object.keys(Commands).sort().map(k => `<tr><td><code>${k}</code></td><td>${(Commands[k].alias || []).map(a => `<code>${esc(a)}</code>`).join(' ')}</td><td>${esc(Commands[k].desc)}</td></tr>`).join('');
    $('helpBody').innerHTML = `
      <div class="ar">
        <b>دليل سريع:</b> اكتب اسم الأمر أو اختصاره في سطر الأوامر بالأسفل ثم اضغط Enter أو المسطرة (Space).
        مثال: <code>L</code> للخط، <code>C</code> للدائرة، <code>REC</code> للمستطيل، <code>M</code> للتحريك، <code>TR</code> للقص.
        أدخل الإحداثيات هكذا: <code>10,20</code> مطلقة، <code>@50,0</code> نسبية، <code>@100&lt;45</code> قطبية (طول&lt;زاوية)،
        أو اكتب رقماً فقط لتحديد الطول في اتجاه المؤشر. Enter أو الزر الأيمن للإنهاء، Esc للإلغاء.
        عجلة الماوس للتكبير، الزر الأوسط للتحريك، والنقر المزدوج على العجلة لعرض الرسم كاملاً.
      </div>
      <h4>Coordinate input</h4>
      <table>
        <tr><td><code>x,y</code></td><td>Absolute coordinates</td></tr>
        <tr><td><code>@dx,dy</code></td><td>Relative to last point</td></tr>
        <tr><td><code>@dist&lt;angle</code></td><td>Relative polar (angle in degrees, CCW from +X)</td></tr>
        <tr><td><code>number</code></td><td>Direct distance entry along cursor direction (works with Ortho/Polar)</td></tr>
      </table>
      <h4>Mouse &amp; keyboard</h4>
      <table>
        <tr><td>Wheel</td><td>Zoom at cursor</td></tr><tr><td>Middle drag</td><td>Pan</td></tr>
        <tr><td>Double-click wheel</td><td>Zoom extents</td></tr><tr><td>Right click / Enter / Space</td><td>Confirm / finish / repeat last command</td></tr>
        <tr><td>Esc</td><td>Cancel command / clear selection</td></tr>
        <tr><td>Drag left→right</td><td>Window selection (fully inside)</td></tr><tr><td>Drag right→left</td><td>Crossing selection (touching)</td></tr>
        <tr><td>Shift+click</td><td>Remove from selection</td></tr><tr><td>Click blue grip</td><td>Stretch that point</td></tr>
        <tr><td>F2 / F3 / F7 / F8 / F9 / F10 / F12</td><td>History / Osnap / Grid / Ortho / Snap / Polar / Dynamic input</td></tr>
        <tr><td>Ctrl+Z / Ctrl+Y / Ctrl+S / Ctrl+O / Ctrl+A</td><td>Undo / Redo / Save / Open / Select all</td></tr>
        <tr><td>Delete</td><td>Erase selection</td></tr>
        <tr><td>Drag &amp; drop</td><td>Drop a .dxf or .json file onto the drawing area to open it</td></tr>
      </table>
      <h4>Commands</h4>
      <table><tr><th>Command</th><th>Alias</th><th>Description</th></tr>${rows}</table>`;
    $('helpModal').hidden = false;
  },
};

// ---------- boot ----------
UI.init();
resize();
(() => {
  let rec = null;
  try { rec = localStorage.getItem('opendraft-autosave'); } catch (_) { rec = null; }
  if (rec) {
    try {
      const d = JSON.parse(rec);
      if (d && Array.isArray(d.ents) && d.ents.length) { App.doc = Object.assign(newDoc(), d); UI.log(`Recovered autosaved drawing (${d.ents.length} objects). Type NEW to start fresh.`, 'info'); }
    } catch (_) { /* ignore */ }
  }
})();
zoomExtents();
UI.refreshAll();
UI.log('Welcome to OpenDraft CAD. Type a command (e.g. LINE or L) — press F1 for help.', 'info');
UI.log('مرحباً! اكتب أمراً مثل L للخط أو C للدائرة، واضغط F1 للمساعدة.', 'info');
requestAnimationFrame(loop);
