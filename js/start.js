// Web-app style Start page: left navigation, file browser table, resources panel.
// Replaces the simpler UI.showStart from ui2.js.
(function () {
  const FKEY = 'opendraft-folders';
  const folders = () => { try { return JSON.parse(localStorage.getItem(FKEY) || '[]'); } catch (_) { return []; } };
  const saveFolders = (f) => { try { localStorage.setItem(FKEY, JSON.stringify(f)); } catch (_) {} };
  const st = { view: 'mine', folder: null, q: '', sort: 'when', dir: -1, panel: true };
  try { st.panel = localStorage.getItem('opendraft-sp-panel') !== '0'; } catch (_) {}

  // remember which folder a drawing belongs to
  const baseRemember = rememberRecent;
  rememberRecent = function () {
    baseRemember();
    try {
      const list = recentList();
      if (list[0] && list[0].name === App.fileName) {
        const old = (UI._spFolderOf || {})[App.fileName];
        list[0].folder = UI._spPendingFolder !== undefined ? UI._spPendingFolder : (old || null);
        UI._spPendingFolder = undefined;
        localStorage.setItem('opendraft-recent', JSON.stringify(list));
      }
    } catch (_) {}
  };

  const SVGI = {
    dwg: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 2h10l5 5v15H5z" fill="#e6ecf5" stroke="#8aa0c2"/><path d="M15 2v5h5" fill="#c3d0e6"/><rect x="3" y="12" width="14" height="7" rx="1" fill="#2f7bff"/><text x="10" y="17.6" font-size="5.2" fill="#fff" text-anchor="middle" font-family="Segoe UI,Arial" font-weight="700">DWG</text></svg>',
    folder: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M2 6h8l2 2h10v12H2z" fill="#f2c14e" stroke="#c99b2a"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    support: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5h7l2 2h9v12H3z"/><path d="M9 13h6M12 10v6"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/></svg>',
    cab: '<svg viewBox="0 0 120 120" width="110" height="110"><path d="M30 25l40-12 30 12v62l-40 14-30-14z" fill="#d9e4f5" stroke="#5c7bb0" stroke-width="2"/><path d="M30 25l40 12 30-12" fill="none" stroke="#5c7bb0" stroke-width="2"/><path d="M70 37v64" stroke="#5c7bb0" stroke-width="2"/><rect x="38" y="44" width="24" height="14" fill="#fff" stroke="#5c7bb0" stroke-width="2" transform="skewY(14)"/><path d="M58 80l36-12 10 8-36 13z" fill="#fff" stroke="#5c7bb0" stroke-width="2"/><path d="M58 80v14l36-12V68" fill="#eef3fb" stroke="#5c7bb0" stroke-width="2"/></svg>',
    c1: '<svg viewBox="0 0 64 48"><rect x="6" y="8" width="52" height="32" rx="3" fill="#cfdcf2" stroke="#5c7bb0"/><path d="M12 32l12-14 10 10 6-6 12 10" fill="none" stroke="#2f7bff" stroke-width="2"/><circle cx="46" cy="16" r="4" fill="#f2c14e"/></svg>',
    c2: '<svg viewBox="0 0 64 48"><path d="M20 34a9 9 0 0 1 1-18 12 12 0 0 1 23 3 8 8 0 0 1 1 15z" fill="#cfdcf2" stroke="#5c7bb0"/><circle cx="32" cy="30" r="7" fill="#2f7bff"/><path d="M32 26v8M28 30h8" stroke="#fff" stroke-width="2"/></svg>',
    c3: '<svg viewBox="0 0 64 48"><rect x="8" y="10" width="34" height="24" rx="2" fill="#cfdcf2" stroke="#5c7bb0"/><rect x="44" y="16" width="12" height="22" rx="2" fill="#e9eff9" stroke="#5c7bb0"/><path d="M4 36h42" stroke="#5c7bb0" stroke-width="2"/><path d="M14 28l8-10 6 6 8-8" fill="none" stroke="#2f7bff" stroke-width="2"/></svg>',
    c4: '<svg viewBox="0 0 64 48"><rect x="10" y="8" width="44" height="28" rx="2" fill="#cfdcf2" stroke="#5c7bb0"/><path d="M28 16v12l10-6z" fill="#2f7bff"/><path d="M6 40h52" stroke="#5c7bb0" stroke-width="2"/></svg>'
  };

  const kb = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const when = (t) => { const d = new Date(t); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

  function rows() {
    const rec = recentList();
    UI._spFolderOf = Object.fromEntries(rec.map(r => [r.name, r.folder]));
    let items = [];
    if (st.view === 'sample') {
      items = [{ kind: 'sample', name: 'Sample House.dwg', when: Date.now(), size: 48000, owner: 'OpenDraft', key: 'house' },
               { kind: 'sample', name: 'Sample Flange.dwg', when: Date.now(), size: 21000, owner: 'OpenDraft', key: 'flange' },
               { kind: 'sample', name: 'Sample Wiring.dwg', when: Date.now(), size: 17000, owner: 'OpenDraft', key: 'wiring' }];
    } else if (st.view === 'recent') {
      items = rec.map((r, i) => ({ kind: 'file', name: r.name, when: r.when, size: (r.doc || '').length, owner: 'Me', i }));
    } else {
      if (!st.folder) items = folders().map(f => ({ kind: 'folder', name: f.name, when: f.when, size: null, owner: 'Me' }));
      items = items.concat(rec.map((r, i) => ({ kind: 'file', name: r.name, when: r.when, size: (r.doc || '').length, owner: 'Me', i, folder: r.folder || null })).filter(r => (r.folder || null) === st.folder));
    }
    if (st.q) items = items.filter(r => r.name.toLowerCase().includes(st.q.toLowerCase()));
    const k = st.sort;
    items.sort((a, b) => (a.kind === 'folder') - (b.kind === 'folder') ? (b.kind === 'folder') - (a.kind === 'folder') : ((a[k] ?? 0) > (b[k] ?? 0) ? 1 : (a[k] ?? 0) < (b[k] ?? 0) ? -1 : 0) * st.dir);
    return items;
  }

  function sampleDoc(key) {
    if (key === 'house') return sampleFloorPlan();
    const doc = newDoc(), ents = [];
    if (key === 'flange') {
      ents.push({ type: 'circle', c: { x: 0, y: 0 }, r: 100, layer: '0' }, { type: 'circle', c: { x: 0, y: 0 }, r: 40, layer: '0' }, { type: 'circle', c: { x: 0, y: 0 }, r: 75, layer: '0' });
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ents.push({ type: 'circle', c: { x: 75 * Math.cos(a), y: 75 * Math.sin(a) }, r: 9, layer: '0' }); }
      ents.push({ type: 'line', p1: { x: -115, y: 0 }, p2: { x: 115, y: 0 }, layer: '0' }, { type: 'line', p1: { x: 0, y: -115 }, p2: { x: 0, y: 115 }, layer: '0' });
      ents.push({ type: 'dim', kind: 'dia', c: { x: 0, y: 0 }, r: 100, p3: { x: 90, y: 90 }, h: 8, layer: '0' });
    } else {
      for (let i = 0; i < 4; i++) {
        ents.push({ type: 'circle', c: { x: i * 60, y: 0 }, r: 8, layer: '0' }, { type: 'line', p1: { x: i * 60 + 8, y: 0 }, p2: { x: i * 60 + 52, y: 0 }, layer: '0' });
        ents.push({ type: 'line', p1: { x: i * 60, y: -8 }, p2: { x: i * 60, y: -40 }, layer: '0' }, { type: 'text', p: { x: i * 60 - 6, y: 14 }, h: 6, rot: 0, s: 'L' + (i + 1), layer: '0' });
      }
      ents.push({ type: 'line', p1: { x: -20, y: -40 }, p2: { x: 200, y: -40 }, layer: '0' }, { type: 'text', p: { x: -20, y: -54 }, h: 7, rot: 0, s: 'LIGHTING CIRCUIT C1', layer: '0' });
    }
    doc.ents = ents.map((e, i) => ({ ...e, id: i + 1 })); doc.nextId = ents.length + 1;
    return doc;
  }

  function header(label, key) {
    const arrow = st.sort === key ? (st.dir > 0 ? ' ▲' : ' ▼') : '';
    return `<th data-sort="${key}">${label}${arrow}</th>`;
  }

  UI.showStart = function (show) {
    let s = document.getElementById('startpage');
    if (!s) { s = document.createElement('div'); s.id = 'startpage'; document.getElementById('main').appendChild(s); }
    document.querySelectorAll('#filetabs .ftab').forEach((t, i) => t.classList.toggle('active', show ? i === 0 : i === 1));
    if (!show) { s.hidden = true; return; }
    s.hidden = false;
    draw(s);
  };

  function draw(s) {
    const items = rows();
    const title = st.view === 'recent' ? 'Recent' : st.view === 'sample' ? 'Sample Files' : 'My Drawings';
    const crumbs = st.view === 'mine' && st.folder ? `<span class="spcrumb" data-nav="root">My Drawings</span> › <b>${esc(st.folder)}</b>` : `<b>${title}</b>`;
    const body = items.length ? `<table class="sptable"><thead><tr><th class="ft">File Type</th>${header('Name', 'name')}${header('Date Modified', 'when')}${header('Size', 'size')}${header('Owner', 'owner')}<th>Shared</th></tr></thead><tbody>${items.map((r, n) => `<tr data-row="${n}" tabindex="0"><td class="ft">${r.kind === 'folder' ? SVGI.folder : SVGI.dwg}</td><td class="nm">${esc(r.name)}</td><td>${r.when ? when(r.when) : ''}</td><td>${r.size == null ? '—' : kb(r.size)}</td><td>${esc(r.owner)}</td><td>${r.kind === 'sample' ? 'Read-only' : '—'}</td></tr>`).join('')}</tbody></table>`
      : `<div class="spempty">${SVGI.cab}<b>${st.q ? 'No files match your search' : "This folder doesn't contain any files"}</b><span>Create a new drawing or upload a DWG, DXF or JSON file.</span></div>`;
    s.innerHTML = `
      <div class="sp2nav">
        <div class="sp2brand">OpenDraft CAD</div>
        <div class="sp2split"><button class="sp2btn" data-act="new">New Drawing</button><button class="sp2dd" data-menu="new">▾</button></div>
        <div class="sp2split"><button class="sp2btn" data-act="upload">Upload...</button><button class="sp2dd" data-menu="upload">▾</button></div>
        <button class="sp2btn wide" data-act="folder">New Folder</button>
        <div class="sp2links">
          <a data-view="recent" class="${st.view === 'recent' ? 'on' : ''}">Recent</a>
          <a data-view="sample" class="${st.view === 'sample' ? 'on' : ''}">Sample Files</a>
          <a data-view="mine" class="${st.view === 'mine' ? 'on' : ''}">My Drawings</a>
          <a class="sub" data-act="upload">Add Local Files...</a>
          <a class="sub" data-act="dwghelp">About DWG support...</a>
        </div>
        <a class="sp2fb" data-cmd-start="HELP">Help &amp; shortcuts</a>
      </div>
      <div class="sp2main">
        <div class="sp2top"><div class="sp2crumbs">${crumbs}</div>
          <label class="sp2search">${SVGI.search}<input id="spSearch" placeholder="Search current folder..." value="${esc(st.q)}"></label></div>
        <div class="sp2tools"><button data-act="refresh">${SVGI.refresh} Refresh</button><button data-act="support">${SVGI.support} Manage Support Files</button></div>
        <div class="sp2list">${body}</div>
      </div>
      <aside class="sp2res${st.panel ? '' : ' closed'}">
        <button class="sp2toggle" data-act="panel" title="${st.panel ? 'Hide' : 'Show'} resources">${st.panel ? '»' : '«'}</button>
        <div class="sp2rbody">
          <h4>Welcome! Here are some resources to help you get started</h4>
          ${[['c1', 'Open DWG drawings', 'DWG files from other programs open directly. Save your work as DXF to reopen it anywhere.', 'Open a file', 'upload'],
             ['c2', 'Work with your files', 'Create new drawings, upload existing ones and keep them in folders on this device.', 'New folder', 'folder'],
             ['c3', 'Architecture, mechanical & electrical', 'Symbol libraries, walls, wiring, tolerances and 3D solids are on the ribbon tabs.', 'Open a sample', 'sample'],
             ['c4', 'Commands & shortcuts', 'Type any command on the command line or press F1 to see the full list of shortcuts.', 'Show commands', 'help']]
            .map(c => `<div class="sp2card">${SVGI[c[0]]}<div><b>${c[1]}</b><p>${c[2]}</p><a data-act="${c[4]}">${c[3]}</a></div></div>`).join('')}
        </div>
      </aside>`;
    const inp = s.querySelector('#spSearch');
    inp.oninput = () => { st.q = inp.value; const pos = inp.selectionStart; draw(s); const i2 = s.querySelector('#spSearch'); i2.focus(); i2.setSelectionRange(pos, pos); };
    s.onclick = (ev) => click(ev, s, items);
    s.ondblclick = (ev) => { const tr = ev.target.closest('tr[data-row]'); if (tr) openItem(items[+tr.dataset.row], s); };
    s.onkeydown = (ev) => { const tr = ev.target.closest('tr[data-row]'); if (tr && ev.key === 'Enter') openItem(items[+tr.dataset.row], s); };
    s.oncontextmenu = (ev) => { const tr = ev.target.closest('tr[data-row]'); if (!tr) return; ev.preventDefault(); rowMenu(items[+tr.dataset.row], ev, s); };
  }

  function openItem(r, s) {
    if (!r) return;
    if (r.kind === 'folder') { st.folder = r.name; st.q = ''; draw(s); return; }
    UI.showStart(false);
    if (r.kind === 'sample') { IO.openDoc(sampleDoc(r.key), r.name.replace('.dwg', '.json')); return; }
    const rec = recentList()[r.i];
    try { UI._spPendingFolder = rec.folder || null; IO.openDoc(JSON.parse(rec.doc), rec.name); } catch (_) { UI.log('Could not open the drawing.', 'err'); }
  }

  function popup(ev, entries) {
    document.querySelectorAll('.sp2pop').forEach(p => p.remove());
    const m = document.createElement('div'); m.className = 'sp2pop';
    m.innerHTML = entries.map((e, i) => `<button data-i="${i}">${e[0]}</button>`).join('');
    document.body.appendChild(m);
    const r = ev.target.getBoundingClientRect ? ev.target.getBoundingClientRect() : { left: ev.clientX, bottom: ev.clientY };
    m.style.left = Math.min((ev.type === 'contextmenu' ? ev.clientX : r.left), innerWidth - 200) + 'px';
    m.style.top = (ev.type === 'contextmenu' ? ev.clientY : r.bottom + 2) + 'px';
    m.onclick = (e2) => { const b = e2.target.closest('button'); if (!b) return; m.remove(); entries[+b.dataset.i][1](); };
    setTimeout(() => document.addEventListener('mousedown', function off(e3) { if (!m.contains(e3.target)) { m.remove(); document.removeEventListener('mousedown', off); } }), 0);
  }

  function rowMenu(r, ev, s) {
    const list = [['Open', () => openItem(r, s)]];
    if (r.kind === 'file') {
      list.push(['Rename...', async () => { const n = prompt('New name', r.name); if (!n) return; const rec = recentList(); rec[r.i].name = n; localStorage.setItem('opendraft-recent', JSON.stringify(rec)); draw(s); }]);
      const fs = folders();
      if (fs.length || r.folder) list.push(['Move to...', () => { const n = prompt('Folder name (blank = My Drawings)\n' + fs.map(f => f.name).join(', '), r.folder || ''); if (n === null) return; if (n && !fs.some(f => f.name === n)) { UI.log('No folder named ' + n, 'err'); return; } const rec = recentList(); rec[r.i].folder = n || null; localStorage.setItem('opendraft-recent', JSON.stringify(rec)); draw(s); }]);
      list.push(['Delete', () => { if (!confirm('Delete "' + r.name + '"?')) return; const rec = recentList(); rec.splice(r.i, 1); localStorage.setItem('opendraft-recent', JSON.stringify(rec)); draw(s); }]);
    } else if (r.kind === 'folder') {
      list.push(['Delete folder', () => { if (!confirm('Delete folder "' + r.name + '"? Files inside move to My Drawings.')) return; saveFolders(folders().filter(f => f.name !== r.name)); const rec = recentList().map(x => x.folder === r.name ? { ...x, folder: null } : x); localStorage.setItem('opendraft-recent', JSON.stringify(rec)); draw(s); }]);
    }
    popup(ev, list);
  }

  function click(ev, s, items) {
    const v = ev.target.closest('[data-view]'), a = ev.target.closest('[data-act]'), m = ev.target.closest('[data-menu]');
    const th = ev.target.closest('th[data-sort]'), nav = ev.target.closest('[data-nav]'), tr = ev.target.closest('tr[data-row]');
    const hc = ev.target.closest('[data-cmd-start]');
    if (v) { st.view = v.dataset.view; st.folder = null; st.q = ''; draw(s); return; }
    if (nav) { st.folder = null; draw(s); return; }
    if (th) { const k = th.dataset.sort; st.dir = st.sort === k ? -st.dir : (k === 'name' || k === 'owner' ? 1 : -1); st.sort = k; draw(s); return; }
    if (tr) { s.querySelectorAll('tr.sel').forEach(x => x.classList.remove('sel')); tr.classList.add('sel'); return; }
    if (hc) { UI.showStart(false); runCommand('HELP'); return; }
    if (m) {
      if (m.dataset.menu === 'new') popup(ev, [['Blank drawing (metric)', () => { UI.showStart(false); UI._spPendingFolder = st.folder; IO.newDrawing(); }], ['Blank drawing (imperial)', () => { UI.showStart(false); IO.newDrawing(); App.doc.insUnits = 'in'; UI.log('Imperial drawing (inches).'); }], ['From sample floor plan', () => { UI.showStart(false); IO.openDoc(sampleFloorPlan(), 'Sample House.json'); }]]);
      else popup(ev, [['Upload file (DWG / DXF / JSON)...', () => { UI._spPendingFolder = st.view === 'mine' ? st.folder : null; UI.showStart(false); IO.open(); }], ['Upload into new folder...', () => { const n = newFolder(s); if (n) { UI._spPendingFolder = n; UI.showStart(false); IO.open(); } }]]);
      return;
    }
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'new') { UI._spPendingFolder = st.view === 'mine' ? st.folder : null; UI.showStart(false); IO.newDrawing(); }
    else if (act === 'upload') { UI._spPendingFolder = st.view === 'mine' ? st.folder : null; UI.showStart(false); IO.open(); }
    else if (act === 'folder') { newFolder(s); }
    else if (act === 'refresh') { draw(s); }
    else if (act === 'support') { UI.showStart(false); runCommand('OPTIONS'); }
    else if (act === 'sample') { st.view = 'sample'; st.folder = null; draw(s); }
    else if (act === 'help') { UI.showStart(false); runCommand('HELP'); }
    else if (act === 'dwghelp') { UI.log('DWG files open directly (converted on load). Save as DXF to share your work with other CAD programs.'); UI.showStart(false); }
    else if (act === 'panel') { st.panel = !st.panel; try { localStorage.setItem('opendraft-sp-panel', st.panel ? '1' : '0'); } catch (_) {} draw(s); }
    void items;
  }

  function newFolder(s) {
    const n = (prompt('Folder name', 'New Folder') || '').trim();
    if (!n) return null;
    const fs = folders();
    if (fs.some(f => f.name === n)) { UI.log('A folder with that name already exists.', 'err'); return null; }
    fs.push({ name: n, when: Date.now() }); saveFolders(fs);
    st.view = 'mine'; st.folder = null; draw(s);
    return n;
  }
})();
