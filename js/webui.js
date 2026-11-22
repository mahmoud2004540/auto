// "Web" workspace: a browser-app style layout — compact header, Draw/Annotate/Modify toolbar,
// left icon rail with sliding palettes, canvas toolbar, chip-style command line and text status toggles.
(function () {
  Object.assign(ICONS, {
    chamfer: '<path d="M4 20V10l6-6h10"/><path class="b" d="M4 10l6-6" stroke-dasharray="2 2"/>',
    revcloud: '<path d="M6 16a3 3 0 0 1 0-6 4 4 0 0 1 7-2 3 3 0 0 1 5 2 3 3 0 0 1 0 6z"/>',
    measure: '<rect x="2" y="9" width="20" height="6" rx="1"/><path d="M6 9v3M10 9v3M14 9v3M18 9v3"/>',
    point: '<circle class="b" cx="12" cy="12" r="2"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    print: '<rect x="6" y="3" width="12" height="6"/><rect x="3" y="9" width="18" height="8" rx="1"/><rect x="7" y="14" width="10" height="7"/>',
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>',
    share: '<path d="M3 12l18-8-6 18-3-8z"/><path d="M12 14l9-10"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    rail_props: '<rect x="4" y="3" width="16" height="18" rx="1"/><path class="b" d="M7 7h10M7 11h10M7 15h6"/>',
    rail_blocks: '<rect x="3" y="5" width="14" height="10" rx="1"/><circle class="b" cx="17" cy="16" r="4"/>',
    rail_tools: '<path d="M5 4h11l3 3v13H5z"/><path class="b" d="M8 10h8M8 14h8M8 18h5"/>',
    rail_xref: '<rect x="3" y="4" width="14" height="12" rx="1"/><path class="b" d="M7 13l3-4 3 3 2-2 3 4"/><rect x="7" y="8" width="14" height="12" rx="1" opacity=".5"/>',
    rail_markup: '<path d="M5 4h14v12H9l-4 4z"/><path class="b" d="M8 8h8M8 12h5"/>',
    rail_check: '<circle cx="12" cy="12" r="9"/><path class="b" d="M8 12l3 3 5-6"/>',
  });

  const DRAW = [['RECTANG', 'Rectangle', 'rect'], ['CIRCLE', 'Circle', 'circle'], ['ARC', 'Arc', 'arc'], ['SPLINE', 'Spline', 'spline'], ['DIMLINEAR', 'Linear dimension', 'dimlin'], ['LINE', 'Line', 'line'], ['PLINE', 'Polyline', 'pline'], ['HATCH', 'Hatch', 'hatch'], ['ARRAYRECT', 'Rectangular array', 'array'], ['INSERT', 'Insert block', 'insert'], ['ELLIPSE', 'Ellipse', 'ellipse'], ['POLYGON', 'Polygon', 'polygon']];
  const ANNO = [['DIST', 'Measure', 'measure'], ['REVCLOUD', 'Revision cloud', 'revcloud'], ['DIMLINEAR', 'Dimension', 'dimali'], ['MTEXT', 'Text', 'text'], ['LEADER', 'Leader', 'leader'], ['ZOOM', 'Zoom window', 'zoomwin']];
  const MOD = [['MOVE', 'Move', 'move'], ['COPY', 'Copy', 'copy'], ['MIRROR', 'Mirror', 'mirror'], ['FILLET', 'Fillet', 'fillet'], ['CHAMFER', 'Chamfer', 'chamfer'], ['ARRAYPOLAR', 'Polar array', 'arrayp'], ['TRIM', 'Trim', 'trim'], ['MATCHPROP', 'Match properties', 'match'], ['ROTATE', 'Rotate', 'rotate'], ['SCALE', 'Scale', 'scale'], ['OFFSET', 'Offset', 'offset'], ['JOIN', 'Join', 'join'], ['STRETCH', 'Stretch', 'stretch'], ['EXTEND', 'Extend', 'extend'], ['EXPLODE', 'Explode', 'explode'], ['ERASE', 'Erase', 'erase'], ['BREAK', 'Break', 'break']];
  const RAIL = [['props', 'rail_props', 'Properties'], ['layers', 'layers', 'Layers'], ['blocks', 'rail_blocks', 'Blocks'], ['tools', 'rail_tools', 'Tool Palette'], ['xref', 'rail_xref', 'References'], ['markup', 'rail_markup', 'Markups'], ['check', 'rail_check', 'Drawing Check']];
  const has = (c) => !!Commands[c];
  const tb = (list) => list.filter(([c]) => has(c)).map(([c, l, i]) => `<button class="wbt" data-cmd="${c}" title="${esc(l)} (${c})">${icon(i)}</button>`).join('');
  const W = { panel: 'props', open: false };
  try { const sv = JSON.parse(localStorage.getItem('opendraft-wbpanel') || 'null'); if (sv) Object.assign(W, sv); } catch (_) {}
  const byId = (id) => document.getElementById(id);

  function build() {
    if (byId('wbHead')) return;
    const app = byId('app');
    const head = document.createElement('header'); head.id = 'wbHead';
    head.innerHTML = `<span class="wblogo">OD</span><span class="wbcrumb"><a data-cmd="STARTPAGE">OpenDraft</a> <i>/</i> <b id="wbDoc"></b></span>
      <span class="wbsp"></span><button class="wbsave" data-cmd="SAVE">Save as</button>
      <button class="wbic" data-cmd="PLOT" title="Plot">${icon('print')}</button><button class="wbic" data-cmd="OPTIONS" title="Settings">${icon('gear')}</button>
      <button class="wbic" data-cmd="HELP" title="Help">${icon('help')}</button><button class="wbic" id="wbBell" title="Notifications">${icon('bell')}</button><span class="wbav">ME</span>`;
    const info = document.createElement('div'); info.id = 'wbInfo';
    info.innerHTML = `<span class="wbi">i</span><span>Learn how to use this workspace — type a command or pick a tool.</span><span class="wbsp"></span><button id="wbLearn">Commands &amp; Shortcuts</button><button id="wbInfoX" title="Close">✕</button>`;
    const tools = document.createElement('div'); tools.id = 'wbTools';
    tools.innerHTML = `<div class="wbg"><h5>Draw</h5><div>${tb(DRAW)}</div></div><div class="wbg"><h5>Annotate</h5><div>${tb(ANNO)}</div></div><div class="wbg"><h5>Modify</h5><div>${tb(MOD)}</div></div>`;
    app.insertBefore(tools, byId('main')); app.insertBefore(info, tools); app.insertBefore(head, info);

    const main = byId('main');
    const rail = document.createElement('nav'); rail.id = 'wbRail';
    rail.innerHTML = RAIL.map(([k, i, t]) => `<button data-wbp="${k}" title="${t}">${icon(i)}</button>`).join('');
    const pan = document.createElement('aside'); pan.id = 'wbPanel';
    main.insertBefore(pan, main.firstChild); main.insertBefore(rail, pan);

    const vp = byId('viewport');
    const bar = document.createElement('div'); bar.id = 'wbBar';
    bar.innerHTML = `<button data-cmd="UNDO" title="Undo">${icon('undo')}</button><button data-cmd="REDO" title="Redo">${icon('redo')}</button>
      <button data-cmd="ZOOM_EXT" title="Zoom extents">${icon('zoomext')}</button><button data-cmd="ZOOM" title="Zoom window">${icon('zoomwin')}</button><span class="wbdiv"></span>
      <button class="wblay" id="wbLayer"></button><span class="wbsp"></span>
      <a class="wblink" data-cmd="DXFOUT">Export DXF ${icon('export')}</a><a class="wblink dim" data-cmd="SAVE">Download ${icon('save')}</a>`;
    vp.insertBefore(bar, vp.firstChild);
    const cube = document.createElement('button'); cube.id = 'wbCube'; cube.dataset.cmd = 'ZOOM_EXT'; cube.textContent = 'Top'; cube.title = 'Zoom extents';
    vp.appendChild(cube);
    const wctl = document.createElement('div'); wctl.id = 'wbVpCtl';
    wctl.innerHTML = `<button id="wbMax" title="Maximize drawing area">⤢</button><button id="wbCloseDoc" data-cmd="NEW" title="Close drawing">✕</button>`;
    vp.appendChild(wctl);

    const row = byId('cmdrow');
    const ok = document.createElement('span'); ok.id = 'wbCmdBtns';
    ok.innerHTML = `<button id="wbEsc" title="Cancel">Esc</button><button id="wbOk" title="Enter">✓</button>`;
    row.appendChild(ok);

    const st = byId('status');
    const tg = document.createElement('div'); tg.id = 'wbToggles';
    tg.innerHTML = `<button data-mode="grid" class="wbtx">SNAP &amp; GRID</button><button class="wbcar" data-car="grid">⌃</button>
      <button data-mode="osnap" class="wbtx">OSNAP</button><button class="wbcar" data-car="osnap">⌃</button>
      <button data-mode="otrack" class="wbtx">OTRACK</button><button data-mode="ortho" class="wbtx">ORTHO</button>
      <button data-mode="polar" class="wbtx">POLAR</button><button class="wbcar" data-car="polar">⌃</button><button class="wbmore" data-car="more" title="More">⋮</button>`;
    st.appendChild(tg);

    head.addEventListener('click', (e) => { if (e.target.closest('#wbBell')) UI.log('No new notifications.'); });
    byId('wbInfoX').onclick = () => { info.hidden = true; resize(); };
    byId('wbLearn').onclick = () => runCommand('HELP');
    rail.onclick = (e) => { const b = e.target.closest('[data-wbp]'); if (!b) return; const k = b.dataset.wbp; if (W.panel === k && W.open) W.open = false; else { W.panel = k; W.open = true; } showPanel(); };
    byId('wbLayer').onclick = (e) => { e.stopPropagation(); UI.layerPopup(byId('wbLayer')); };
    byId('wbEsc').onclick = () => { const i = byId('cmdinput'); i.focus(); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); };
    byId('wbOk').onclick = () => { const i = byId('cmdinput'); i.focus(); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); };
    byId('wbMax').onclick = () => { byId('app').classList.toggle('wbmax'); resize(); };
    tg.addEventListener('click', (e) => { const c = e.target.closest('[data-car]'); if (c) { e.stopPropagation(); caret(c); } });
  }

  function caret(btn) {
    const k = btn.dataset.car;
    if (k === 'grid') UI.popup(btn, [{ label: (App.modes.grid ? '✔ ' : '  ') + 'Grid display', fn: () => UI.toggleMode('grid') }, { label: (App.modes.snap ? '✔ ' : '  ') + 'Snap mode', fn: () => UI.toggleMode('snap') }, '-',
      ...[1, 5, 10, 50, 100].map(s => ({ label: (App.gridSize === s ? '✔ ' : '  ') + 'Spacing ' + s, fn: () => { App.gridSize = s; App.snapSize = s; App.dirty = true; } }))]);
    else if (k === 'osnap') {
      const names = { end: 'Endpoint', mid: 'Midpoint', cen: 'Center', quad: 'Quadrant', int: 'Intersection', perp: 'Perpendicular', ins: 'Insertion', node: 'Node', near: 'Nearest' };
      UI.popup(btn, Object.keys(names).map(s => ({ label: (App.osnaps[s] ? '✔ ' : '  ') + names[s], fn: () => { App.osnaps[s] = !App.osnaps[s]; } })));
    } else if (k === 'polar') UI.popup(btn, [90, 45, 30, 22.5, 18, 15, 10, 5].map(a => ({ label: (App.polarInc === a ? '✔ ' : '  ') + a + '°', fn: () => { App.polarInc = a; if (!App.modes.polar) UI.toggleMode('polar'); } })));
    else UI.popup(btn, [
      { label: (App.modes.dyn ? '✔ ' : '  ') + 'Dynamic input', fn: () => UI.toggleMode('dyn') },
      { label: (App.modes.lwt ? '✔ ' : '  ') + 'Lineweight', fn: () => UI.toggleMode('lwt') },
      { label: (App.modes.transp ? '✔ ' : '  ') + 'Transparency', fn: () => UI.toggleMode('transp') },
      { label: (App.modes.qp ? '✔ ' : '  ') + 'Quick Properties', fn: () => UI.toggleMode('qp') }, '-',
      { label: 'Isolate objects', cmd: 'ISOLATEOBJECTS' }, { label: 'End isolation', cmd: 'UNISOLATEOBJECTS' }, '-',
      ...Object.keys(WORKSPACES).map(w => ({ label: (w === UI.workspace ? '✔ ' : '  ') + 'Workspace: ' + w, fn: () => applyWorkspace(w) }))]);
  }

  // ---------- palettes ----------
  const homes = {};
  function borrow(id) { const el = byId(id); if (!el) return null; if (!homes[id]) homes[id] = el.parentNode; return el; }
  function giveBack() { for (const id of Object.keys(homes)) { const el = byId(id); if (el && el.parentNode !== homes[id]) homes[id].appendChild(el); } }

  function showPanel() {
    try { localStorage.setItem('opendraft-wbpanel', JSON.stringify(W)); } catch (_) {}
    const pan = byId('wbPanel'); if (!pan) return;
    document.querySelectorAll('#wbRail [data-wbp]').forEach(b => b.classList.toggle('on', W.open && b.dataset.wbp === W.panel));
    giveBack();
    pan.hidden = !W.open;
    if (!W.open) { resize(); return; }
    const title = RAIL.find(r => r[0] === W.panel)[2];
    const plus = { layers: 'LAYER', blocks: 'BLOCK', markup: 'REVCLOUD', xref: 'INSERT' }[W.panel];
    pan.innerHTML = `<div class="wbph"><h3>${title}${plus ? ` <button class="wbplus" data-cmd="${plus}" title="New">+</button>` : ''}</h3><button class="wbcol" title="Collapse">«</button></div><div class="wbpb"></div>`;
    pan.querySelector('.wbcol').onclick = () => { W.open = false; showPanel(); };
    const body = pan.querySelector('.wbpb');
    if (W.panel === 'props') { body.appendChild(borrow('propsBody')); byId('propsBody').classList.remove('hidden'); UI.refreshProps(); }
    else if (W.panel === 'layers') { body.appendChild(borrow('layersBody')); byId('layersBody').classList.remove('hidden'); UI.refreshLayers(); layerProps(body); }
    else if (W.panel === 'blocks') blocksPanel(body);
    else if (W.panel === 'tools') toolsPanel(body);
    else if (W.panel === 'xref') empty(body, 'No references in this drawing', 'Insert another drawing or a block to reference it here.', 'Insert…', 'INSERT');
    else if (W.panel === 'markup') empty(body, 'No markups in this drawing', 'Use revision clouds and leaders to mark changes for review.', 'New Markup', 'REVCLOUD');
    else if (W.panel === 'check') checkPanel(body);
    resize();
  }
  function empty(body, t, s, btn, cmd) {
    body.innerHTML = `<div class="wbempty"><svg viewBox="0 0 120 120" width="96" height="96"><path d="M30 25l40-12 30 12v62l-40 14-30-14z" fill="#d9e4f5" stroke="#5c7bb0" stroke-width="2"/><path d="M30 25l40 12 30-12M70 37v64" fill="none" stroke="#5c7bb0" stroke-width="2"/><path d="M58 80l36-12 10 8-36 13z" fill="#fff" stroke="#5c7bb0" stroke-width="2"/></svg><b>${t}</b><p>${s}</p><button class="wbpri" data-cmd="${cmd}">${btn}</button></div>`;
  }
  function layerProps(body) {
    const l = App.doc.layers.find(x => x.name === App.doc.cur) || App.doc.layers[0];
    const sec = document.createElement('div'); sec.className = 'wbsec';
    sec.innerHTML = `<h4>Layer Properties</h4><div class="wbkv"><span>Name</span><b>${esc(l.name)}</b><span>Linetype</span><select id="wbLt">${ltOptions(l.lt || 'Continuous')}</select><span>Lineweight</span><select id="wbLw">${lwOptions(l.lw)}</select></div>`;
    body.appendChild(sec);
    byId('wbLt').onchange = (e) => UI.change(() => { l.lt = e.target.value; });
    byId('wbLw').onchange = (e) => UI.change(() => { l.lw = e.target.value === '' ? 0.25 : parseFloat(e.target.value); });
  }
  function blocksPanel(body) {
    const names = Object.keys(App.doc.blocks || {}).filter(n => !n.startsWith('*'));
    body.innerHTML = `<div class="wbtabs"><span>Current drawing</span><button class="on">${icon('rail_blocks')}</button></div><div class="wbblk"></div>`;
    const box = body.querySelector('.wbblk');
    if (!names.length) { empty(box, 'No blocks in this drawing', 'Create a block from selected objects, or insert symbols from the Tool Palette.', 'Create Block', 'BLOCK'); return; }
    box.innerHTML = names.map(n => { let svg = ''; try { svg = entsSVG(insertEnts({ type: 'insert', name: n, p: { x: 0, y: 0 }, sx: 1, sy: 1, rot: 0 })); } catch (_) {} return `<button class="wbbt" data-blk="${esc(n)}" title="${esc(n)}">${svg}<span>${esc(n)}</span></button>`; }).join('');
    box.onclick = (e) => { const b = e.target.closest('[data-blk]'); if (!b) return; App.queue = [b.dataset.blk]; runCommand('-INSERT'); };
  }
  function toolsPanel(body) {
    const cats = [...new Set(TOOLS.map(t => t.cat))];
    body.innerHTML = cats.map(c => `<h4 class="wbcat">${esc(c)}</h4><div class="wbblk">${TOOLS.filter(t => t.cat === c).map(t => { let svg = ''; try { svg = entsSVG(t.gen(Object.fromEntries((t.params || []).map(q => [q.k, q.def])))); } catch (_) {} return `<button class="wbbt" data-tool="${t.id}" title="${esc(t.name)}">${svg}<span>${esc(t.name)}</span></button>`; }).join('')}</div>`).join('');
    body.onclick = (e) => { const b = e.target.closest('[data-tool]'); if (b) insertTool(TOOLS.find(t => t.id === b.dataset.tool)); };
  }
  function checkPanel(body) {
    const ents = App.doc.ents, lays = App.doc.layers;
    const zero = ents.filter(e => e.type === 'line' && V.dist(e.p1, e.p2) < 1e-9).length;
    const unused = lays.filter(l => l.name !== '0' && !ents.some(e => e.layer === l.name)).length;
    const on0 = ents.filter(e => e.layer === '0').length;
    const items = [[zero === 0, `Zero-length lines: ${zero}`, 'OVERKILL'], [unused === 0, `Unused layers: ${unused}`, 'PURGE'], [true, `Objects: ${ents.length}`, null], [on0 < ents.length || !ents.length, `Objects on layer 0: ${on0}`, null]];
    body.innerHTML = `<div class="wbchk">${items.map(([ok, t, c]) => `<div class="${ok ? 'ok' : 'bad'}"><span>${ok ? '✓' : '!'}</span>${t}${c && !ok ? ` <a data-cmd="${c}">Fix</a>` : ''}</div>`).join('')}</div><button class="wbpri" id="wbRecheck">Check again</button>`;
    byId('wbRecheck').onclick = () => checkPanel(body);
  }

  // ---------- refresh hooks ----------
  function syncTop() {
    if (!UI.web) return;
    const d = byId('wbDoc'); if (d) d.textContent = App.fileName + (/\.\w+$/.test(App.fileName) ? '' : '.dwg') + (App.modified ? ' *' : '');
    const l = App.doc.layers.find(x => x.name === App.doc.cur) || App.doc.layers[0];
    const lb = byId('wbLayer'); if (lb && l) lb.innerHTML = `<i style="background:${l.color}"></i>${esc(l.name)}<span>▾</span>`;
    const ch = byId('vplabel'); if (ch && !App.v3d) ch.innerHTML = `<span class="chip" data-cmd="ZOOM_EXT">Top</span><span class="chip">2D Wireframe</span>`;
  }
  for (const fn of ['refreshTitle', 'refreshLayers', 'refresh3D']) {
    const o = UI[fn]; UI[fn] = function (...a) { const r = o.apply(this, a); syncTop(); return r; };
  }
  const oProps = UI.refreshProps;
  UI.refreshProps = function (...a) { const r = oProps.apply(this, a); if (UI.web && W.open && W.panel === 'layers') { /* keep layer props fresh */ } return r; };

  function webIdle() {
    const a = byId('app'); a.classList.toggle('wbidle', !App.cmd);
    const u = byId('wbBar'); if (!u) return;
    u.querySelector('[data-cmd="UNDO"]').classList.toggle('off', !App.undo.length);
    u.querySelector('[data-cmd="REDO"]').classList.toggle('off', !App.redo.length);
  }
  // chip-style prompt: "LINE Specify next point or [Close] [Undo] :"
  const oPrompt = UI.setPrompt;
  UI.setPrompt = function (text, keywords) {
    if (UI.web) webIdle();
    if (!UI.web || !text) return oPrompt.call(this, text, keywords);
    const p = byId('prompt');
    const t = esc(text.replace(/\s*\[[^\]]*\]\s*$/, ''));
    const kws = (keywords || []).map(k => `<span class="kw" data-kw="${esc(k)}">${esc(k)}</span>`).join('');
    p.innerHTML = (App.cmd ? `<b>${esc(App.cmd)}</b> ` : '') + t + (kws ? ' or ' + kws : '') + ' :';
    this.updateDyn();
  };

  UI.setWeb = function (on) {
    if (on) build();
    UI.web = !!on; App.webLook = UI.web;
    const ch = document.querySelector('#cmdrow .chev'); if (ch) { ch.dataset.orig = ch.dataset.orig || ch.textContent; ch.textContent = UI.web ? '›' : ch.dataset.orig; }
    byId('app').classList.toggle('webui', UI.web);
    if (!UI.web) { giveBack(); byId('app').classList.remove('wbmax'); if (W.prevBg) { App.opts.bg = W.prevBg; W.prevBg = null; } }
    else { if (!W.prevBg) { W.prevBg = App.opts.bg; App.opts.bg = '#27398a'; } showPanel(); syncTop(); webIdle(); }
    UI.refreshStatus(); resize(); App.dirty = true;
  };

  // register as a workspace
  WORKSPACES.Web = WORKSPACES['Drafting & Annotation'];
  const oApply = applyWorkspace;
  applyWorkspace = function (name) { oApply(name); UI.setWeb(name === 'Web'); };
  Commands.WEBUI = { alias: [], desc: 'Switch to the Web workspace layout', noUndo: true, noRepeat: true, fn: async () => applyWorkspace(UI.web ? 'Drafting & Annotation' : 'Web') };
  if (!Commands.STARTPAGE) Commands.STARTPAGE = { alias: [], desc: 'Show the Start page', noUndo: true, noRepeat: true, fn: async () => UI.showStart(true) };
  try { if (localStorage.getItem('opendraft-ws') === 'Web') applyWorkspace('Web'); } catch (_) {}
})();
