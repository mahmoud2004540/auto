// File I/O: native JSON, DXF import/export, SVG, PNG
'use strict';

const ACI = { 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff', 6: '#ff00ff', 7: '#ffffff', 8: '#808080', 9: '#c0c0c0', 30: '#ff7f00', 40: '#ffbf00', 140: '#007fff', 200: '#bf00ff', 250: '#333333', 251: '#505050', 252: '#696969', 253: '#828282', 254: '#bebebe', 255: '#ffffff' };
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hexToAci(h) {
  const [r, g, b] = hexRGB(h || '#ffffff');
  let best = 7, bd = Infinity;
  for (const k in ACI) { const [R, G, B] = hexRGB(ACI[k]); const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = +k; } }
  return best;
}
function aciToHex(n) {
  n = Math.abs(n);
  if (ACI[n]) return ACI[n];
  if (n >= 10 && n <= 249) {
    const hue = Math.floor((n - 10) / 10) * 15, v = [1, 1, 0.8, 0.8, 0.6, 0.6, 0.5, 0.5, 0.3, 0.3][(n - 10) % 10], sat = (n % 2) ? 0.5 : 1;
    const f = (k) => { const kk = (k + hue / 60) % 6; return v - v * sat * Math.max(0, Math.min(kk, 4 - kk, 1)); };
    const h2 = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + h2(f(5)) + h2(f(3)) + h2(f(1));
  }
  return '#ffffff';
}

// ZIP (store, no compression) for file types the viewer cannot save directly
function crc32(u8) {
  let c, crc = 0xFFFFFFFF;
  const T = crc32.T || (crc32.T = Array.from({ length: 256 }, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
  for (let i = 0; i < u8.length; i++) crc = T[(crc ^ u8[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const csize = central.reduce((s, a) => s + a.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}

const SAVE_EXT = ['gif', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'json', 'md', 'csv', 'html', 'svg', 'pdf', 'zip'];
let _dlCap;
async function download(name, data, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  // inside the claude.ai viewer: use the platform's download capability
  if (window.claude && typeof window.claude.use === 'function') {
    if (_dlCap === undefined) { try { _dlCap = await window.claude.use('downloads'); } catch (_) { _dlCap = null; } }
    if (_dlCap) {
      let fname = name, payload = blob;
      const ext = (name.split('.').pop() || '').toLowerCase();
      if (!SAVE_EXT.includes(ext)) {
        payload = makeZip([{ name, data: new Uint8Array(await blob.arrayBuffer()) }]);
        fname = name.replace(/\.[^.]+$/, '') + '.zip';
        UI.log(`${name} is packed inside ${fname} (unzip it to get the file).`, 'info');
      }
      try { await _dlCap.save({ filename: fname, data: payload }); UI.log(`Saved ${fname}`, 'info'); }
      catch (err) {
        const code = err && err.code;
        if (code === 'declined') UI.log('Save cancelled.');
        else if (code === 'rate_limited') UI.log('Another save is waiting for your answer; try again in a moment.', 'err');
        else UI.log(`Saving is not available here (${code || 'unavailable'}). Open index.html from your computer to save files.`, 'err');
      }
      return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function exportables(keepInserts) {
  const out = [];
  for (const e of App.doc.ents) {
    if (!visible(e) || (!keepInserts && layerOf(e).plot === false)) continue;
    if (e.type === 'insert' && keepInserts) out.push(e);
    else flattenEnt(e, out);
  }
  return out;
}

function acText(s) {
  return String(s || '').replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/%%[cC]/g, '\u00d8').replace(/%%[dD]/g, '\u00b0').replace(/%%[pP]/g, '\u00b1').replace(/%%[uUoOkK]/g, '').replace(/%%%/g, '%');
}

const IO = {
  newDrawing() {
    App.doc = newDoc(); App.undo = []; App.redo = []; App.sel.clear(); App.modified = false;
    App.fileName = 'Drawing' + (++IO.counter);
    zoomExtents(); UI.refreshAll(); UI.log('New drawing.');
  },
  counter: 1,

  save() {
    const name = App.fileName.replace(/\.(json|dxf)$/i, '') + '.json';
    download(name, JSON.stringify({ format: 'opendraft', version: 1, doc: App.doc }, null, 1), 'application/json');
    App.modified = false; UI.refreshTitle(); UI.log(`Saved ${name}`);
  },

  open() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.dwg,.dxf,.json,.zip';
    inp.onchange = () => { const f = inp.files[0]; if (f) IO.loadFile(f); };
    inp.click();
  },

  // DWG → DXF through LibreDWG (WebAssembly, GPL-3.0), loaded on first use
  DWG_BASE: 'https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@0.8.2/wasm/',
  async dwgToDxf(buf) {
    if (!IO._dwgMod) {
      UI.log('Loading the DWG reader (first time only, about 11 MB)...', 'info');
      const mod = await import(IO.DWG_BASE + 'libredwg-web.js');
      const create = mod.default || mod.createModule;
      let lastErr = null;
      for (const w of ['vendor/libredwg/libredwg-web.wasm', IO.DWG_BASE + 'libredwg-web.wasm']) {
        try { IO._dwgMod = await create({ locateFile: (f) => (f.endsWith('.wasm') ? w : IO.DWG_BASE + f), print: () => {}, printErr: () => {} }); break; } catch (e) { lastErr = e; }
      }
      if (!IO._dwgMod) throw new Error('Could not load the DWG reader' + (lastErr ? ': ' + lastErr.message : '') + '. Check the internet connection.');
    }
    const m = IO._dwgMod;
    m.FS.writeFile('in.dwg', new Uint8Array(buf));
    try {
      let err;
      try { err = m.dwg_write_dxf('in.dwg', 'out.dxf'); } catch (e) { IO._dwgMod = null; throw new Error('This DWG file could not be read (' + e.message + ').'); }
      let out = null; try { out = m.FS.readFile('out.dxf'); } catch (_) { out = null; }
      if (!out || !out.length) throw new Error(`This DWG file could not be read (error code ${err}). Try saving it as DXF from AutoCAD.`);
      return new TextDecoder('utf-8').decode(out);
    } finally {
      try { m.FS.unlink('in.dwg'); } catch (_) { /* ignore */ }
      try { m.FS.unlink('out.dxf'); } catch (_) { /* ignore */ }
    }
  },

  async unzipFirst(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let i = 0;
    while (i + 30 <= u8.length && dv.getUint32(i, true) === 0x04034b50) {
      const method = dv.getUint16(i + 8, true), csize = dv.getUint32(i + 18, true), nlen = dv.getUint16(i + 26, true), xlen = dv.getUint16(i + 28, true);
      const name = new TextDecoder().decode(u8.subarray(i + 30, i + 30 + nlen));
      const start = i + 30 + nlen + xlen, data = u8.subarray(start, start + csize);
      if (/\.(dxf|dwg|json)$/i.test(name)) {
        if (method === 0) return { name, data: data.slice() };
        if (method === 8 && typeof DecompressionStream !== 'undefined') {
          const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
          return { name, data: new Uint8Array(out) };
        }
        throw new Error('Unsupported compression in ZIP');
      }
      i = start + csize;
    }
    throw new Error('No DWG, DXF or JSON drawing found inside the ZIP file');
  },

  loadFile(f) {
    if (/\.zip$/i.test(f.name)) {
      f.arrayBuffer().then(b => IO.unzipFirst(b)).then(({ name, data }) => IO.loadFile(new File([data], name))).catch(err => UI.log('Could not open file: ' + err.message, 'err'));
      return;
    }
    if (/\.dwg$/i.test(f.name)) {
      const rb = new FileReader();
      rb.onload = async () => {
        try {
          const head = new TextDecoder('ascii').decode(new Uint8Array(rb.result, 0, 6));
          const ver = { AC1012: 'R13', AC1014: 'R14', AC1015: '2000', AC1018: '2004', AC1021: '2007', AC1024: '2010', AC1027: '2013', AC1032: '2018' }[head] || head;
          UI.log(`Reading ${f.name} (AutoCAD ${ver} format)...`, 'info');
          const text = await IO.dwgToDxf(rb.result);
          IO.openDoc(IO.parseDXF(text), f.name);
        } catch (err) { console.error(err); UI.log('Could not open file: ' + err.message, 'err'); }
      };
      rb.readAsArrayBuffer(f);
      return;
    }
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const text = String(rd.result);
        let doc;
        if (/\.dxf$/i.test(f.name)) doc = IO.parseDXF(text);
        else {
          const j = JSON.parse(text);
          doc = j.doc || j;
          if (!Array.isArray(doc.ents) || !Array.isArray(doc.layers)) throw new Error('Not a drawing file');
        }
        IO.openDoc(doc, f.name);
      } catch (err) { console.error(err); UI.log('Could not open file: ' + err.message, 'err'); }
    };
    rd.readAsText(f);
  },

  // initial view after opening: ignore a few objects that are far larger than the rest
  focusMainDrawing() {
    const items = App.doc.ents.filter(e => visible(e) && !INFINITE.has(e.type)).map(e => ({ e, b: entBBox(e) })).filter(x => isFinite(x.b.x1));
    if (items.length < 8) return;
    const diag = (b) => Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
    const ds = items.map(x => diag(x.b)).sort((a, b) => a - b), med = ds[Math.floor(ds.length / 2)] || 1;
    const core = items.filter(x => diag(x.b) <= med * 200);
    if (core.length === items.length || core.length < items.length * 0.9) return;
    let r = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    for (const { b } of core) r = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) };
    zoomRect(r);
    UI.log(`${items.length - core.length} object(s) are much larger than the rest of the drawing; type Z then E to see everything.`, 'info');
  },

  openDoc(doc, name) {
    const before = snapshot();
    if (App.space !== 'Model') switchSpace('Model');
    App.doc = Object.assign(newDoc(), doc);
    App.undo = [before]; App.redo = []; App.sel.clear();
    App.fileName = name.replace(/\.(json|dxf|dwg)$/i, '');
    App.modified = false;
    zoomExtents(); IO.focusMainDrawing(); UI.refreshAll();
    UI.log(`Opened ${name}: ${App.doc.ents.length} object(s), ${App.doc.layers.length} layer(s), ${Object.keys(App.doc.blocks || {}).length} block(s).`, 'info');
  },

  // ---------- DXF export (R12 ASCII) ----------
  exportDXF() {
    const L = [];
    const w = (c, v) => { L.push(String(c)); L.push(String(v)); };
    const num = (n) => (Math.abs(n) < 1e-12 ? 0 : +n.toFixed(8));
    w(0, 'SECTION'); w(2, 'HEADER'); w(9, '$ACADVER'); w(1, 'AC1009'); w(9, '$INSUNITS'); w(70, 4); w(9, '$PDMODE'); w(70, App.doc.pdmode || 0); w(9, '$LTSCALE'); w(40, App.doc.ltscale || 1); w(0, 'ENDSEC');
    w(0, 'SECTION'); w(2, 'TABLES');
    const ltk = Object.keys(LTYPES);
    w(0, 'TABLE'); w(2, 'LTYPE'); w(70, ltk.length);
    for (const k of ltk) {
      const pat = LTYPES[k].pat;
      w(0, 'LTYPE'); w(2, k.toUpperCase()); w(70, 0); w(3, LTYPES[k].desc); w(72, 65); w(73, pat.length);
      w(40, num(pat.reduce((a, b) => a + Math.abs(b), 0)));
      for (const v of pat) w(49, v);
    }
    w(0, 'ENDTAB');
    w(0, 'TABLE'); w(2, 'LAYER'); w(70, App.doc.layers.length);
    for (const l of App.doc.layers) { w(0, 'LAYER'); w(2, l.name); w(70, l.locked ? 4 : 0); w(62, (l.on ? 1 : -1) * hexToAci(l.color)); w(6, (l.lt || 'Continuous').toUpperCase()); }
    w(0, 'ENDTAB');
    w(0, 'TABLE'); w(2, 'STYLE'); w(70, 1);
    w(0, 'STYLE'); w(2, 'STANDARD'); w(70, 0); w(40, 0); w(41, 1); w(50, 0); w(71, 0); w(42, 2.5); w(3, 'txt'); w(4, '');
    w(0, 'ENDTAB');
    w(0, 'ENDSEC');
    const writeEnt = (e) => {
      const head = (t) => { w(0, t); w(8, e.layer || '0'); if (e.thick) w(39, num(e.thick)); if (e.lt) w(6, e.lt.toUpperCase()); if (e.color) w(62, hexToAci(e.color)); };
      if (e.type === 'hatch') {
        const pat = HATCH_PATTERNS[e.pat] || HATCH_PATTERNS.ANSI31;
        if (!pat.fam.length) {
          for (const l of e.loops) { head('POLYLINE'); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, 1); for (const p of l) { w(0, 'VERTEX'); w(8, e.layer || '0'); w(10, num(p.x)); w(20, num(p.y)); w(30, 0); } w(0, 'SEQEND'); w(8, e.layer || '0'); }
        } else for (const [a, b] of hatchLines(e)) { head('LINE'); w(10, num(a.x)); w(20, num(a.y)); w(30, 0); w(11, num(b.x)); w(21, num(b.y)); w(31, 0); }
        return;
      }
      if (e.type === 'line') { head('LINE'); w(10, num(e.p1.x)); w(20, num(e.p1.y)); w(30, 0); w(11, num(e.p2.x)); w(21, num(e.p2.y)); w(31, 0); }
      else if (e.type === 'circle') { head('CIRCLE'); w(10, num(e.c.x)); w(20, num(e.c.y)); w(30, 0); w(40, num(e.r)); }
      else if (e.type === 'arc') { head('ARC'); w(10, num(e.c.x)); w(20, num(e.c.y)); w(30, 0); w(40, num(e.r)); w(50, num(deg(normAng(e.a1)))); w(51, num(deg(normAng(e.a2)))); }
      else if (e.type === 'pline') {
        head('POLYLINE'); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, e.closed ? 1 : 0);
        for (const p of e.pts) { w(0, 'VERTEX'); w(8, e.layer || '0'); w(10, num(p.x)); w(20, num(p.y)); w(30, 0); }
        w(0, 'SEQEND'); w(8, e.layer || '0');
      } else if (e.type === 'point') { head('POINT'); w(10, num(e.p.x)); w(20, num(e.p.y)); w(30, 0); }
      else if (e.type === 'xline' || e.type === 'ray') { const [a, b] = [e.type === 'ray' ? e.p : V.sub(e.p, V.mul(e.d, 1e4)), V.add(e.p, V.mul(e.d, 1e4))]; head('LINE'); w(10, num(a.x)); w(20, num(a.y)); w(30, 0); w(11, num(b.x)); w(21, num(b.y)); w(31, 0); }
      else if (e.type === 'attdef') { head('ATTDEF'); w(10, num(e.p.x)); w(20, num(e.p.y)); w(30, 0); w(40, num(e.h)); w(1, e.def || ''); w(3, e.prompt || e.tag); w(2, e.tag); w(70, (e.invisible ? 1 : 0) | (e.constant ? 2 : 0)); w(50, num(deg(normAng(e.rot || 0)))); }
      else if (e.type === 'insert') {
        const defs = blockAttdefs(e.name);
        head('INSERT'); if (defs.length) w(66, 1); w(2, e.name); w(10, num(e.p.x)); w(20, num(e.p.y)); w(30, 0); w(41, num(e.sx || 1)); w(42, num(e.sy || 1)); w(43, 1); w(50, num(deg(normAng(e.rot || 0))));
        if (defs.length) {
          const m = insertMatrix(e, App.doc.blocks[e.name]), k = Math.sqrt(Math.abs(M.det(m)));
          for (const d of defs) {
            const q = M.apply(m, d.p); const v = (e.attrs && e.attrs[d.tag]) ?? d.def ?? '';
            w(0, 'ATTRIB'); w(8, e.layer || '0'); w(10, num(q.x)); w(20, num(q.y)); w(30, 0); w(40, num(d.h * k)); w(1, v); w(2, d.tag); w(70, (d.invisible ? 1 : 0) | (d.constant ? 2 : 0)); w(50, num(deg(normAng((d.rot || 0) + (e.rot || 0)))));
          }
          w(0, 'SEQEND'); w(8, e.layer || '0');
        }
      }
      else if (e.type === 'text') { head('TEXT'); w(10, num(e.p.x)); w(20, num(e.p.y)); w(30, 0); w(40, num(e.h)); w(1, e.s); w(50, num(deg(normAng(e.rot || 0)))); }
    };
    w(0, 'SECTION'); w(2, 'BLOCKS');
    for (const [bn, bd] of Object.entries(App.doc.blocks || {})) {
      w(0, 'BLOCK'); w(8, '0'); w(2, bn); w(70, 0); w(10, num(bd.base.x)); w(20, num(bd.base.y)); w(30, 0); w(3, bn);
      for (const be of bd.ents) { if (be.type === 'insert' || be.type === 'attdef') writeEnt(be); else { const f = []; flattenEnt(be, f); f.forEach(writeEnt); } }
      w(0, 'ENDBLK'); w(8, '0');
    }
    w(0, 'ENDSEC');
    w(0, 'SECTION'); w(2, 'ENTITIES');
    for (const e of exportables(true)) writeEnt(e);
    w(0, 'ENDSEC'); w(0, 'EOF');
    const name = App.fileName.replace(/\.(json|dxf)$/i, '') + '.dxf';
    download(name, L.join('\r\n') + '\r\n', 'application/dxf');
    UI.log(`Exported ${name}`);
  },

  // ---------- DXF import ----------
  parseDXF(text) {
    const lines = text.split(/\r?\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1].replace(/\s+$/, '')]);
    const doc = newDoc(); doc.layers = []; doc.ents = [];
    const layerMap = new Map();
    const ensureLayer = (n) => { n = n || '0'; if (!layerMap.has(n)) { const l = { name: n, color: '#ffffff', on: true, locked: false }; layerMap.set(n, l); doc.layers.push(l); } return n; };
    const blocks = new Map();
    let section = null, i = 0;
    // collect records
    const records = []; // {sec, type, g:[[c,v]...]}
    while (i < pairs.length) {
      const [c, v] = pairs[i];
      if (c === 0 && v === 'SECTION') { section = pairs[i + 1] && pairs[i + 1][1]; i += 2; continue; }
      if (c === 0 && v === 'ENDSEC') { section = null; i++; continue; }
      if (c === 0 && v === 'EOF') break;
      if (c === 0) {
        const rec = { sec: section, type: v, g: [] }; i++;
        while (i < pairs.length && pairs[i][0] !== 0) { rec.g.push(pairs[i]); i++; }
        records.push(rec); continue;
      }
      i++;
    }
    const get = (r, code, d) => { const p = r.g.find(x => x[0] === code); return p ? p[1] : d; };
    const getN = (r, code, d = 0) => { const v = get(r, code); return v === undefined ? d : parseFloat(v); };
    for (let q = 0; q + 1 < pairs.length; q++) if (pairs[q][0] === 9 && pairs[q][1].trim() === '$LTSCALE') { const v = parseFloat(pairs[q + 1][1]); if (v > 0) doc.ltscale = v; break; }
    // layers
    for (const r of records) if (r.sec === 'TABLES' && r.type === 'LAYER') {
      const n = get(r, 2, '0'); ensureLayer(n);
      const l = layerMap.get(n); const col = parseInt(get(r, 62, '7'), 10);
      l.color = aciToHex(col); l.on = col >= 0; l.locked = (parseInt(get(r, 70, '0'), 10) & 4) !== 0;
      l.lt = ltName(get(r, 6, 'Continuous')) || 'Continuous';
      const lw = parseInt(get(r, 370, '-3'), 10); l.lw = lw >= 0 ? lw / 100 : 0.25;
    }
    ensureLayer('0');

    const bulgePts = (pts, bulges, closed) => {
      const out = [];
      const n = pts.length;
      for (let k = 0; k < n; k++) {
        out.push(pts[k]);
        const b = bulges[k] || 0;
        if (Math.abs(b) > 1e-9 && (k < n - 1 || closed)) {
          const p1 = pts[k], p2 = pts[(k + 1) % n];
          const th = 4 * Math.atan(b), ch = V.dist(p1, p2); if (ch < 1e-12) continue;
          const r = ch / (2 * Math.sin(Math.abs(th) / 2));
          const m = V.mid(p1, p2), dir = V.norm(V.sub(p2, p1));
          const h = Math.sqrt(Math.max(0, r * r - ch * ch / 4)) * Math.sign(b) * (Math.abs(th) > Math.PI ? -1 : 1);
          const c = V.add(m, V.mul(V.perp(dir), h));
          const a1 = V.ang(c, p1), seg = Math.max(4, Math.ceil(Math.abs(th) / TAU * 64));
          for (let s = 1; s < seg; s++) out.push(V.polar(c, a1 + th * s / seg, r));
        }
      }
      return out;
    };

    // convert a list of records to entities
    const convert = (recs, sink, depth) => {
      for (let k = 0; k < recs.length; k++) {
        const r = recs[k];
        if (depth === 0 && parseInt(get(r, 67, '0'), 10) === 1) continue; // paper space object
        const base = { layer: ensureLayer(get(r, 8, '0')) };
        const col = get(r, 62); if (col !== undefined && +col !== 256 && +col !== 0) base.color = aciToHex(+col);
        const elt = ltName(get(r, 6)); if (elt) base.lt = elt;
        const elw = parseInt(get(r, 370, '-1'), 10); if (elw >= 0) base.lw = elw / 100;
        const els = getN(r, 48, 1); if (els !== 1 && els > 0) base.lts = els;
        const th = getN(r, 39, 0); if (th) base.thick = th;
        switch (r.type) {
          case 'LINE': sink.push({ ...base, type: 'line', p1: { x: getN(r, 10), y: getN(r, 20) }, p2: { x: getN(r, 11), y: getN(r, 21) } }); break;
          case 'CIRCLE': sink.push({ ...base, type: 'circle', c: { x: getN(r, 10), y: getN(r, 20) }, r: getN(r, 40) }); break;
          case 'ARC': sink.push({ ...base, type: 'arc', c: { x: getN(r, 10), y: getN(r, 20) }, r: getN(r, 40), a1: rad(getN(r, 50)), a2: rad(getN(r, 51)) }); break;
          case 'LWPOLYLINE': {
            const pts = [], bul = []; let cur = null;
            for (const [c, v] of r.g) {
              if (c === 10) { cur = { x: parseFloat(v), y: 0 }; pts.push(cur); bul.push(0); }
              else if (c === 20 && cur) cur.y = parseFloat(v);
              else if (c === 42 && pts.length) bul[pts.length - 1] = parseFloat(v);
            }
            const closed = (parseInt(get(r, 70, '0'), 10) & 1) === 1;
            if (pts.length > 1) sink.push({ ...base, type: 'pline', pts: bulgePts(pts, bul, closed), closed });
            break;
          }
          case 'POLYLINE': {
            const closed = (parseInt(get(r, 70, '0'), 10) & 1) === 1;
            const pts = [], bul = [];
            while (k + 1 < recs.length && recs[k + 1].type === 'VERTEX') { k++; const vr = recs[k]; pts.push({ x: getN(vr, 10), y: getN(vr, 20) }); bul.push(getN(vr, 42)); }
            if (k + 1 < recs.length && recs[k + 1].type === 'SEQEND') k++;
            if (pts.length > 1) sink.push({ ...base, type: 'pline', pts: bulgePts(pts, bul, closed), closed });
            break;
          }
          case 'ATTDEF': {
            const tag = String(get(r, 2, '')).trim().toUpperCase(); if (!tag) break;
            const fl = parseInt(get(r, 70, '0'), 10) || 0;
            sink.push({ ...base, type: 'attdef', p: { x: getN(r, 10), y: getN(r, 20) }, h: getN(r, 40, 2.5) || 2.5, rot: rad(getN(r, 50)), tag, prompt: get(r, 3, ''), def: acText(get(r, 1, '')), invisible: !!(fl & 1), constant: !!(fl & 2) });
            break;
          }
          case 'TEXT': case 'ATTRIB': {
            const s = acText(get(r, 1, '')); if (!s) break;
            let p = { x: getN(r, 10), y: getN(r, 20) };
            const h = getN(r, 40, 2.5) || 2.5, rot = rad(getN(r, 50)), hj = getN(r, 72), vj = getN(r, 74) || getN(r, 73);
            if ((hj || vj) && get(r, 11) !== undefined) {
              p = { x: getN(r, 11), y: getN(r, 21) };
              const w = textWidth(s, h), ux = { x: Math.cos(rot), y: Math.sin(rot) }, uy = V.perp(ux);
              const dx = hj === 1 || hj === 4 ? -w / 2 : hj === 2 ? -w : 0, dy = vj === 2 || hj === 4 ? -h / 2 : vj === 3 ? -h : 0;
              p = V.add(p, V.add(V.mul(ux, dx), V.mul(uy, dy)));
            }
            sink.push({ ...base, type: 'text', p, h, rot, s });
            break;
          }
          case 'MTEXT': {
            let s = r.g.filter(x => x[0] === 3 || x[0] === 1).map(x => x[1]).join('').replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            s = s.replace(/\\P/g, '\n').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '');
            const h = getN(r, 40, 2.5) || 2.5; let p = { x: getN(r, 10), y: getN(r, 20) };
            const rot = get(r, 50) !== undefined ? rad(getN(r, 50)) : Math.atan2(getN(r, 21), getN(r, 11) || 1);
            s = acText(s);
            if (s.trim()) {
              const mt = { ...base, type: 'mtext', p, h, rot, s, w: getN(r, 41, 0) };
              const att = getN(r, 71, 1);
              if (att > 1) {
                const L = mtextLayout(mt), ux = { x: Math.cos(rot), y: Math.sin(rot) }, uy = V.perp(ux);
                const col = (att - 1) % 3, row = Math.floor((att - 1) / 3);
                mt.p = V.add(p, V.add(V.mul(ux, -L.w * col / 2), V.mul(uy, L.hgt * row / 2)));
              }
              sink.push(mt);
            }
            break;
          }
          case 'ELLIPSE': {
            const c = { x: getN(r, 10), y: getN(r, 20) }, ax = { x: getN(r, 11), y: getN(r, 21) };
            const ratio = getN(r, 40, 1), t1 = getN(r, 41, 0), t2 = get(r, 42) !== undefined ? getN(r, 42) : TAU;
            const ra = V.len(ax), rb = ra * ratio, ang = Math.atan2(ax.y, ax.x);
            let span = t2 - t1; if (span <= 0) span += TAU;
            const full = Math.abs(span - TAU) < 1e-6, n = 96, pts = [];
            for (let s = 0; s <= (full ? n - 1 : n); s++) {
              const t = t1 + span * s / n, x = Math.cos(t) * ra, y = Math.sin(t) * rb;
              pts.push({ x: c.x + x * Math.cos(ang) - y * Math.sin(ang), y: c.y + x * Math.sin(ang) + y * Math.cos(ang) });
            }
            sink.push({ ...base, type: 'pline', pts, closed: full });
            break;
          }
          case 'SPLINE': {
            let pts = []; let cur = null;
            const fit = r.g.some(x => x[0] === 11);
            for (const [c, v] of r.g) {
              if (c === (fit ? 11 : 10)) { cur = { x: parseFloat(v), y: 0 }; pts.push(cur); }
              else if (c === (fit ? 21 : 20) && cur) cur.y = parseFloat(v);
            }
            const sclosed = (parseInt(get(r, 70, '0'), 10) & 1) === 1;
            if (fit && pts.length > 1) { sink.push({ ...base, type: 'spline', pts, closed: sclosed }); break; }
            if (pts.length > 2) pts = bspline(pts, parseInt(get(r, 71, '3'), 10) || 3);
            if (pts.length > 1) sink.push({ ...base, type: 'pline', pts, closed: sclosed });
            break;
          }
          case 'HATCH': {
            const loops = []; let cur = null, i = 0; const g = r.g;
            const name = (get(r, 2, 'ANSI31') || 'ANSI31').toUpperCase();
            const solid = get(r, 70) === '1' || name === 'SOLID';
            // walk boundary data: starts after code 91
            while (i < g.length && g[i][0] !== 91) i++;
            const nLoops = i < g.length ? parseInt(g[i][1], 10) : 0; i++;
            for (let L = 0; L < nLoops && i < g.length; L++) {
              while (i < g.length && g[i][0] !== 92) i++;
              if (i >= g.length) break;
              const flag = parseInt(g[i][1], 10); i++;
              cur = [];
              if (flag & 2) { // polyline loop
                let hasB = false; while (i < g.length && g[i][0] !== 93) { if (g[i][0] === 72) hasB = g[i][1].trim() === '1'; i++; }
                const n = parseInt(g[i][1], 10); i++;
                const pts = [], bul = [];
                for (let v = 0; v < n && i < g.length; v++) {
                  const p = { x: 0, y: 0 }; let bb = 0;
                  if (g[i][0] === 10) { p.x = parseFloat(g[i][1]); i++; }
                  if (g[i] && g[i][0] === 20) { p.y = parseFloat(g[i][1]); i++; }
                  if (hasB && g[i] && g[i][0] === 42) { bb = parseFloat(g[i][1]); i++; }
                  pts.push(p); bul.push(bb);
                }
                cur = bulgePts(pts, bul, true);
              } else {
                while (i < g.length && g[i][0] !== 93) i++;
                const n = parseInt(g[i][1], 10); i++;
                for (let ed = 0; ed < n && i < g.length; ed++) {
                  while (i < g.length && g[i][0] !== 72) i++;
                  const et = parseInt(g[i][1], 10); i++;
                  const vals = {}; while (i < g.length && ![72, 97, 92, 75].includes(g[i][0])) { if (vals[g[i][0]] === undefined) vals[g[i][0]] = parseFloat(g[i][1]); i++; }
                  if (et === 1) { cur.push({ x: vals[10], y: vals[20] }); }
                  else if (et === 2) {
                    const c = { x: vals[10], y: vals[20] }, rr = vals[40]; let a1 = rad(vals[50]), a2 = rad(vals[51]);
                    const ccw = vals[73] !== 0; if (!ccw) { a1 = -a1; a2 = -a2; }
                    let span = a2 - a1; if (ccw && span < 0) span += TAU; if (!ccw && span > 0) span -= TAU;
                    const segs = Math.max(4, Math.ceil(Math.abs(span) / TAU * 64));
                    for (let k2 = 0; k2 < segs; k2++) cur.push(V.polar(c, a1 + span * k2 / segs, rr));
                  } else if (et === 3) {
                    const c = { x: vals[10], y: vals[20] }, ax = { x: vals[11], y: vals[21] }, ratio = vals[40];
                    const ra = V.len(ax), rb = ra * ratio, ang = Math.atan2(ax.y, ax.x);
                    let t1 = rad(vals[50]), t2 = rad(vals[51]); let span = t2 - t1; if (span <= 0) span += TAU;
                    for (let k2 = 0; k2 < 48; k2++) { const t = t1 + span * k2 / 48, x = Math.cos(t) * ra, y = Math.sin(t) * rb; cur.push({ x: c.x + x * Math.cos(ang) - y * Math.sin(ang), y: c.y + x * Math.sin(ang) + y * Math.cos(ang) }); }
                  } else if (et === 4 && vals[10] !== undefined) cur.push({ x: vals[10], y: vals[20] });
                }
              }
              if (cur.length > 2 && cur.every(p => isFinite(p.x) && isFinite(p.y))) loops.push(cur);
            }
            if (loops.length) sink.push({ ...base, type: 'hatch', loops, pat: solid ? 'SOLID' : (HATCH_PATTERNS[name] ? name : 'ANSI31'), scale: getN(r, 41, 1) || 1, ang: rad(getN(r, 52, 0)) });
            break;
          }
          case 'XLINE': case 'RAY': {
            const d = V.norm({ x: getN(r, 11, 1), y: getN(r, 21, 0) });
            sink.push({ ...base, type: r.type === 'RAY' ? 'ray' : 'xline', p: { x: getN(r, 10), y: getN(r, 20) }, d }); break;
          }
          case 'SOLID': case 'TRACE': {
            const q = [10, 11, 13, 12].map(c => ({ x: getN(r, c, NaN), y: getN(r, c + 10, NaN) })).filter(p => isFinite(p.x) && isFinite(p.y));
            const pts = q.filter((p, i) => !q.slice(0, i).some(o => V.eq(o, p)));
            if (pts.length > 2) sink.push({ ...base, type: 'hatch', loops: [pts], pat: 'SOLID', scale: 1, ang: 0 });
            break;
          }
          case '3DFACE': {
            const q = [10, 11, 12, 13].map(c => ({ x: getN(r, c, NaN), y: getN(r, c + 10, NaN) })).filter(p => isFinite(p.x));
            if (q.length > 2) sink.push({ ...base, type: 'pline', pts: q, closed: true });
            break;
          }
          case 'TOLERANCE': {
            const t = acText(get(r, 1, '')).replace(/%%v/gi, ' | ').replace(/\{\\Fgdt;(.)\}/g, '$1');
            if (t) sink.push({ ...base, type: 'text', p: { x: getN(r, 10), y: getN(r, 20) }, h: doc.dimH || 2.5, rot: 0, s: t });
            break;
          }
          case 'MULTILEADER': {
            let mode = '', h = 0, txt = '', landing = null; const line = []; let cur = null;
            for (const [c, v] of r.g) {
              const vt = String(v).trim();
              if (c === 300 && vt === 'CONTEXT_DATA{') mode = 'ctx';
              else if (c === 302 && vt === 'LEADER{') mode = 'leader';
              else if (c === 304 && vt === 'LEADER_LINE{') mode = 'line';
              else if (c === 305 || c === 303) mode = 'ctx';
              else if (c === 304) txt = txt || v;
              else if (c === 41 && mode === 'ctx' && !h) h = parseFloat(v);
              else if (c === 10 && (mode === 'line' || mode === 'leader')) { cur = { x: parseFloat(v), y: 0 }; if (mode === 'line') line.push(cur); else landing = cur; }
              else if (c === 20 && cur) { cur.y = parseFloat(v); cur = null; }
            }
            const pts = [...line]; if (landing && (!pts.length || !V.eq(pts[pts.length - 1], landing))) pts.push(landing);
            const s2 = acText(txt).replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '');
            if (pts.length > 1) sink.push({ ...base, type: 'leader', pts, s: s2, h: h || 2.5 });
            break;
          }
          case 'POINT': sink.push({ ...base, type: 'point', p: { x: getN(r, 10), y: getN(r, 20) } }); break;
          case 'ARC_DIMENSION': case 'LARGE_RADIAL_DIMENSION': case 'ACAD_TABLE':
          case 'INSERT': case 'DIMENSION': {
            if (depth > 8) break;
            const bname = get(r, 2, ''); const b = blocks.get(bname); if (!b) break;
            if (!doc.blocks[bname]) {
              doc.blocks[bname] = { base: b.base, ents: [] };
              const sub = []; convert(b.recs, sub, depth + 1);
              doc.blocks[bname].ents = sub;
            }
            if (r.type !== 'INSERT') sink.push({ ...base, type: 'insert', name: bname, p: { x: b.base.x, y: b.base.y }, sx: 1, sy: 1, rot: 0 });
            else {
              const ins = { ...base, type: 'insert', name: bname, p: { x: getN(r, 10), y: getN(r, 20) }, sx: getN(r, 41, 1) || 1, sy: getN(r, 42, 1) || 1, rot: rad(getN(r, 50)) };
              const tags = new Set(doc.blocks[bname].ents.filter(x => x.type === 'attdef').map(x => x.tag));
              while (k + 1 < recs.length && recs[k + 1].type === 'ATTRIB') {
                const a = recs[++k], tag = String(get(a, 2, '')).trim().toUpperCase(), val = acText(get(a, 1, ''));
                if (tags.has(tag)) (ins.attrs = ins.attrs || {})[tag] = val;
                else if (val) sink.push({ ...base, type: 'text', p: { x: getN(a, 10), y: getN(a, 20) }, h: getN(a, 40, 2.5) || 2.5, rot: rad(getN(a, 50)), s: val });
              }
              if (k + 1 < recs.length && recs[k + 1].type === 'SEQEND') k++;
              sink.push(ins);
            }
            break;
          }
          default: break;
        }
      }
    };
    // blocks
    let curB = null;
    for (const r of records) {
      if (r.sec !== 'BLOCKS') continue;
      if (r.type === 'BLOCK') { curB = { name: get(r, 2, ''), base: { x: getN(r, 10), y: getN(r, 20) }, recs: [] }; blocks.set(curB.name, curB); }
      else if (r.type === 'ENDBLK') curB = null;
      else if (curB) curB.recs.push(r);
    }
    const ents = [];
    convert(records.filter(r => r.sec === 'ENTITIES'), ents, 0);
    ents.forEach((e, idx) => { e.id = idx + 1; if (!e.layer) e.layer = '0'; });
    doc.ents = ents.filter(e => {
      const ok = (o) => Object.values(o).every(v => typeof v !== 'number' || isFinite(v));
      if (e.type === 'pline') return e.pts.every(ok);
      if (e.type === 'hatch') return e.loops.every(l => l.every(ok));
      return ok(e) && ['p1', 'p2', 'c', 'p'].every(k => !e[k] || ok(e[k]));
    });
    doc.nextId = ents.length + 1;
    doc.cur = '0';
    return doc;
  },

  // ---------- SVG ----------
  exportSVG() {
    const ents = exportables();
    if (!ents.length) { UI.log('Nothing to export.'); return; }
    let r = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    for (const e of ents) { const b = entBBox(e); r = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) }; }
    const pad = Math.max(r.x2 - r.x1, r.y2 - r.y1) * 0.03 || 1;
    const W = r.x2 - r.x1 + pad * 2, H = r.y2 - r.y1 + pad * 2;
    const T = (p) => `${fmt(p.x - r.x1 + pad, 4)},${fmt(r.y2 + pad - p.y, 4)}`;
    const col = (e) => { const c = entColor(e); return c.toLowerCase() === '#ffffff' ? '#000000' : c; };
    const sw = fmt(Math.max(W, H) / 1500, 5);
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(W, 4)} ${fmt(H, 4)}" width="${Math.round(W * 4)}" height="${Math.round(H * 4)}" style="background:#fff">`,
      `<g fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">`];
    const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const sorted = ents.filter(e => e.type === 'hatch').concat(ents.filter(e => e.type !== 'hatch'));
    const lwOf = (e) => App.modes.lwt ? ` stroke-width="${fmt(Math.max(+sw, entLw(e) * Math.max(W, H) / 400), 5)}"` : '';
    for (const e of sorted) {
      const c = col(e);
      const pat = e.type === 'text' || e.type === 'hatch' ? [] : (LTYPES[entLt(e)] || LTYPES.Continuous).pat;
      const da = pat.length ? ` stroke-dasharray="${pat.map(v => fmt(Math.max(Math.abs(v) * (App.doc.ltscale || 1) * (e.lts || 1), 0.001), 4)).join(' ')}"` : '';
      const st = `${da}${lwOf(e)}`;
      if (e.type === 'hatch') {
        const hp = HATCH_PATTERNS[e.pat] || HATCH_PATTERNS.ANSI31;
        if (!hp.fam.length) out.push(`<path d="${e.loops.map(l => 'M' + l.map(T).join(' L') + ' Z').join(' ')}" fill="${c}" fill-rule="evenodd" stroke="none"/>`);
        else out.push(`<path d="${hatchLines(e).map(([a, b]) => `M${T(a)} L${T(b)}`).join(' ')}" stroke="${c}"/>`);
        continue;
      }
      if (e.type === 'line') out.push(`<line x1="${T(e.p1).split(',')[0]}" y1="${T(e.p1).split(',')[1]}" x2="${T(e.p2).split(',')[0]}" y2="${T(e.p2).split(',')[1]}" stroke="${c}"${st}/>`);
      else if (e.type === 'circle') { const [cx, cy] = T(e.c).split(','); out.push(`<circle cx="${cx}" cy="${cy}" r="${fmt(e.r, 4)}" stroke="${c}"${st}/>`); }
      else if (e.type === 'arc') {
        const s = V.polar(e.c, e.a1, e.r), t = V.polar(e.c, e.a2, e.r), span = normAng(e.a2 - e.a1);
        out.push(`<path d="M${T(s)} A${fmt(e.r, 4)},${fmt(e.r, 4)} 0 ${span > Math.PI ? 1 : 0} 0 ${T(t)}" stroke="${c}"${st}/>`);
      } else if (e.type === 'pline') out.push(`<${e.closed ? 'polygon' : 'polyline'} points="${e.pts.map(T).join(' ')}" stroke="${c}"${st}/>`);
      else if (e.type === 'text') { const [x, y] = T(e.p).split(','); out.push(`<text x="${x}" y="${y}" font-family="Arial" font-size="${fmt(e.h, 4)}" fill="${c}" stroke="none" transform="rotate(${fmt(-deg(e.rot || 0), 3)} ${x} ${y})">${esc(e.s)}</text>`); }
    }
    out.push('</g></svg>');
    download(App.fileName + '.svg', out.join('\n'), 'image/svg+xml');
    UI.log(`Exported ${App.fileName}.svg`);
  },

  // ---------- PNG (white "plot") ----------
  exportPNG() {
    const ents = exportables();
    if (!ents.length) { UI.log('Nothing to export.'); return; }
    let r = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    for (const e of ents) { const b = entBBox(e); r = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) }; }
    const W = 2400, H = Math.max(200, Math.round(W * Math.max(r.y2 - r.y1, 1e-6) / Math.max(r.x2 - r.x1, 1e-6)));
    const Hc = Math.min(H, 4000);
    const off = document.createElement('canvas'); off.width = W; off.height = Hc;
    const g = off.getContext('2d');
    const saved = { view: { ...App.view }, CW, CH };
    CW = W; CH = Hc;
    App.view.cx = (r.x1 + r.x2) / 2; App.view.cy = (r.y1 + r.y2) / 2;
    App.view.s = Math.min(W / Math.max(r.x2 - r.x1, 1e-6), Hc / Math.max(r.y2 - r.y1, 1e-6)) * 0.94;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hc); g.lineWidth = 1.5; g.lineCap = 'round';
    const R = makeR(g);
    const sorted = ents.filter(e => e.type === 'hatch').concat(ents.filter(e => e.type !== 'hatch'));
    for (const e of sorted) {
      let c = entColor(e); if (c.toLowerCase() === '#ffffff') c = '#000000';
      g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 1.5;
      applyEntStyle(g, e, App.view.s, App.modes.lwt ? (lw) => Math.max(1.5, lw * 8) : null);
      Types[e.type].draw(R, e);
      g.setLineDash([]);
    }
    App.view = saved.view; CW = saved.CW; CH = saved.CH; App.dirty = true;
    off.toBlob(b => { download(App.fileName + '.png', b); UI.log(`Exported ${App.fileName}.png`); });
  },
};

// uniform cubic B-spline evaluation (approximate SPLINE control points)
function bspline(cp, degree) {
  if (degree !== 3 || cp.length < 4) return cp;
  const out = [cp[0]];
  for (let i = 0; i < cp.length - 3; i++) {
    const [p0, p1, p2, p3] = [cp[i], cp[i + 1], cp[i + 2], cp[i + 3]];
    for (let s = 1; s <= 16; s++) {
      const t = s / 16, t2 = t * t, t3 = t2 * t;
      const b0 = (1 - t) ** 3 / 6, b1 = (3 * t3 - 6 * t2 + 4) / 6, b2 = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6, b3 = t3 / 6;
      out.push({ x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x, y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y });
    }
  }
  out.push(cp[cp.length - 1]);
  return out;
}
