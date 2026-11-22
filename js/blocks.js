// Blocks: definitions live in App.doc.blocks, references are 'insert' entities
'use strict';

const _insCache = new WeakMap();
let _insDepth = 0;

function insertMatrix(e, def) {
  const c = Math.cos(e.rot || 0), s = Math.sin(e.rot || 0);
  const sx = e.sx || 1, sy = e.sy || 1;
  const m = [sx * c, sx * s, -sy * s, sy * c, 0, 0];
  const t = M.apply(m, def.base || { x: 0, y: 0 });
  m[4] = e.p.x - t.x; m[5] = e.p.y - t.y;
  return m;
}

// block contents transformed to world coordinates (cached per insert object)
function insertEnts(e) {
  let out = _insCache.get(e);
  if (out) return out;
  const def = App.doc.blocks && App.doc.blocks[e.name];
  if (!def || _insDepth > 12) return [];
  _insDepth++;
  try {
    const m = insertMatrix(e, def);
    const nonUniform = Math.abs(Math.abs(e.sx || 1) - Math.abs(e.sy || 1)) > 1e-9;
    out = def.ents.filter(x => !(x.type === 'attdef' && x.invisible)).map(x => {
      let c = entClone(x);
      if (c.type === 'attdef') {
        const v = e.attrs && e.attrs[c.tag] !== undefined ? e.attrs[c.tag] : c.def;
        c = { type: 'text', p: c.p, h: c.h, rot: c.rot || 0, s: String(v ?? ''), layer: c.layer, color: c.color };
      }
      if (nonUniform && (c.type === 'circle' || c.type === 'arc')) c = { type: 'pline', pts: entApprox(x)[0].map(V.clone), closed: c.type === 'circle', layer: c.layer, color: c.color, lt: c.lt, lw: c.lw };
      return entTransform(c, m);
    });
  } finally { _insDepth--; }
  _insCache.set(e, out);
  return out;
}

// copy block sub-entity with ByBlock-style inheritance (layer 0 takes the insert's layer and color)
function inheritFromInsert(sub, ins) {
  const c = entClone(sub);
  if (c.layer === '0' || !c.layer) { c.layer = ins.layer; if (!c.color && ins.color) c.color = ins.color; if (!c.lt && ins.lt) c.lt = ins.lt; if (c.lw === undefined && ins.lw !== undefined) c.lw = ins.lw; }
  return c;
}

Types.insert = {
  label: 'Block Reference',
  approx: (e) => { const out = []; for (const s of insertEnts(e)) for (const pl of entApprox(s)) out.push(pl); return out.length ? out : [[e.p]]; },
  snaps: (e) => {
    const out = [{ p: e.p, t: 'ins' }];
    for (const s of insertEnts(e)) { for (const sn of Types[s.type].snaps(s)) { out.push(sn); if (out.length > 300) return out; } }
    return out;
  },
  grips: (e) => [{ p: e.p, set: (x, p) => { x.p = p; } }],
  transform: (e, m) => {
    const dv = M.vec(m, { x: Math.cos(e.rot || 0), y: Math.sin(e.rot || 0) });
    const k = Math.sqrt(Math.abs(M.det(m)));
    e.p = M.apply(m, e.p); e.rot = Math.atan2(dv.y, dv.x);
    e.sx = (e.sx || 1) * k; e.sy = (e.sy || 1) * k * (M.det(m) < 0 ? -1 : 1);
  },
  draw: (R, e) => {
    const g = R.g, base = g.strokeStyle;
    for (const s of insertEnts(e)) {
      const L = App.doc.layers.find(l => l.name === s.layer);
      if (L && !L.on) continue;
      const col = s.color || (!s.layer || s.layer === '0' ? base : (L ? L.color : base));
      g.strokeStyle = col; g.fillStyle = col;
      Types[s.type].draw(R, s);
    }
    g.strokeStyle = base; g.fillStyle = base;
  },
  props: (e) => [
    { k: 'Name', v: e.name },
    { k: 'Position X', v: e.p.x, set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.p.x = n; } },
    { k: 'Position Y', v: e.p.y, set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.p.y = n; } },
    { k: 'Scale X', v: e.sx || 1, set: (x, v) => { const n = parseFloat(v); if (n) x.sx = n; } },
    { k: 'Scale Y', v: e.sy || 1, set: (x, v) => { const n = parseFloat(v); if (n) x.sy = n; } },
    { k: 'Rotation', v: deg(normAng(e.rot || 0)), set: (x, v) => { const n = parseFloat(v); if (isFinite(n)) x.rot = rad(n); } },
  ],
  explode: (e) => insertEnts(e).map(s => { const c = inheritFromInsert(s, e); delete c.id; return c; }),
};

// flatten inserts (recursively) and dimensions into plain geometry for SVG/PNG export
function flattenEnt(e, out, depth = 0) {
  if (e.type === 'insert') {
    if (depth > 12) return;
    for (const s of insertEnts(e)) {
      const L = App.doc.layers.find(l => l.name === s.layer);
      if (L && !L.on) continue;
      flattenEnt(inheritFromInsert(s, e), out, depth + 1);
    }
  } else if (['dim', 'leader', 'mtext', 'table', 'spline'].includes(e.type)) {
    for (const p of Types[e.type].explode(e)) { p.layer = e.layer; if (e.color) p.color = e.color; out.push(p); }
  } else if (e.type === 'attdef') out.push({ type: 'text', p: e.p, h: e.h, rot: e.rot || 0, s: e.tag, layer: e.layer, color: e.color });
  else out.push(e);
}

// ---------- commands ----------
// ---------- attribute definitions ----------
Types.attdef = {
  label: 'Attribute Definition',
  approx: (e) => [textBox({ p: e.p, h: e.h, rot: e.rot || 0, s: e.tag })],
  snaps: (e) => [{ p: e.p, t: 'ins' }],
  grips: (e) => [{ p: e.p, set: (x, p) => { x.p = p; } }],
  transform: (e, m) => Types.text.transform(e, m),
  draw: (R, e) => R.text(e.p, e.h, e.rot || 0, e.tag),
  props: (e) => [
    { k: 'Tag', v: e.tag, str: true, set: (x, v) => { x.tag = v.toUpperCase().replace(/\s+/g, '_'); } },
    { k: 'Prompt', v: e.prompt || '', str: true, set: (x, v) => { x.prompt = v; } },
    { k: 'Default', v: e.def || '', str: true, set: (x, v) => { x.def = v; } },
    { k: 'Height', v: e.h, set: (x, v) => { const n = parseFloat(v); if (n > 0) x.h = n; } },
  ],
  explode: () => null,
};
function blockAttdefs(name) { const b = App.doc.blocks && App.doc.blocks[name]; return b ? b.ents.filter(x => x.type === 'attdef') : []; }
async function askAttributes(name) {
  const defs = blockAttdefs(name).filter(d => !d.constant);
  const attrs = {};
  for (const d of defs) { const v = await getString(`${d.prompt || d.tag} <${d.def || ''}>`); attrs[d.tag] = v === '' ? (d.def || '') : v; }
  return attrs;
}

def('ATTDEF', ['ATT', 'DDATTDEF'], 'Define a block attribute', async () => {
  const o = await new Promise((res) => {
    UI.dialog('Attribute Definition', `
      <div class="psgrid">
        <fieldset><legend>Mode</legend>
          <label><span>Invisible</span><input type="checkbox" id="ad_inv" style="width:auto"></label>
          <label><span>Constant</span><input type="checkbox" id="ad_con" style="width:auto"></label>
        </fieldset>
        <fieldset><legend>Attribute</legend>
          <label>Tag <input id="ad_tag" placeholder="ROOM_NO"></label>
          <label>Prompt <input id="ad_prompt" placeholder="Room number"></label>
          <label>Default <input id="ad_def"></label>
        </fieldset>
        <fieldset class="wide"><legend>Text Settings</legend>
          <label>Text height <input id="ad_h" value="${fmt(App.doc.textH)}"></label>
          <label>Rotation <input id="ad_rot" value="0"></label>
        </fieldset>
      </div><p class="muted">After OK, pick the insertion point in the drawing.</p>`, () => {
      const tag = document.getElementById('ad_tag').value.trim().toUpperCase().replace(/\s+/g, '_');
      if (!tag) { UI.log('Tag is required.', 'err'); return false; }
      res({ tag, prompt: document.getElementById('ad_prompt').value, def: document.getElementById('ad_def').value, h: parseFloat(document.getElementById('ad_h').value) || App.doc.textH, rot: rad(parseFloat(document.getElementById('ad_rot').value) || 0), invisible: document.getElementById('ad_inv').checked, constant: document.getElementById('ad_con').checked });
    });
    const c = document.getElementById('dlgCancel'), x = document.getElementById('dlgClose');
    const cancel = () => res(null); c.addEventListener('click', cancel); x.addEventListener('click', cancel);
  });
  if (!o) return;
  const p = await getPoint('Specify start point', { rubber: false, preview: (q) => [{ type: 'attdef', p: q, ...o, layer: App.doc.cur }] });
  if (!isPt(p)) return;
  addEnt({ type: 'attdef', p, ...o });
});

async function editAttributes(ins) {
  const defs = blockAttdefs(ins.name);
  if (!defs.length) { UI.log('This block has no attributes.', 'err'); return; }
  await new Promise((res) => {
    UI.dialog(`Enhanced Attribute Editor — Block: ${ins.name}`, `
      <table class="ptable"><tr><td><b>Tag</b></td><td><b>Value</b></td></tr>
      ${defs.map((d, i) => `<tr><td>${esc(d.tag)}<div class="muted" style="font-size:10px">${esc(d.prompt || '')}</div></td><td><input id="ae_${i}" value="${esc((ins.attrs && ins.attrs[d.tag]) ?? d.def ?? '')}" ${d.constant ? 'disabled' : ''}></td></tr>`).join('')}
      </table>`, () => {
      UI.change(() => { ins.attrs = ins.attrs || {}; defs.forEach((d, i) => { if (!d.constant) ins.attrs[d.tag] = document.getElementById('ae_' + i).value; }); invalidate(ins); });
      res();
    }, 'Apply');
    const done = () => res(); document.getElementById('dlgCancel').addEventListener('click', done); document.getElementById('dlgClose').addEventListener('click', done);
  });
}
def('EATTEDIT', ['ATTEDIT', 'ATE'], 'Edit block attribute values', async () => {
  const pk = await getEntity('Select a block', { filter: e => e.type === 'insert' });
  if (pk && typeof pk === 'object') await editAttributes(pk.e);
}, { noUndo: true });

def('BLOCK', ['B', 'BMAKE'], 'Create a block definition from selected objects', async () => {
  const name = (await getString('Enter block name')).trim();
  if (!name) return;
  if (/[<>/\\":;?*|=`]/.test(name)) { UI.log('Invalid block name.', 'err'); return; }
  App.doc.blocks = App.doc.blocks || {};
  if (App.doc.blocks[name]) {
    const k = await getKeyword(`Block "${name}" already exists. Redefine it? [Yes/No] <No>`, { keywords: ['Yes', 'No'], def: 'No' });
    if (k !== 'Yes') return;
  }
  const base = await getPoint('Specify insertion base point'); if (!isPt(base)) return;
  const s = await getSelection('Select objects');
  if (!s.length) { UI.log('No objects selected.'); return; }
  App.doc.blocks[name] = { base: V.clone(base), ents: s.map(e => { const c = entClone(e); delete c.id; return c; }) };
  removeEnts(s);
  // refresh existing references to a redefined block
  App.doc.ents.forEach(e => { if (e.type === 'insert' && e.name === name) { _insCache.delete(e); invalidate(e); } });
  const attrs = {};
  for (const d of s.filter(e => e.type === 'attdef')) attrs[d.tag] = d.def || '';
  addEnt({ type: 'insert', name, p: V.clone(base), sx: 1, sy: 1, rot: 0, attrs });
  UI.log(`Block "${name}" created with ${s.length} object(s).`, 'info');
});

def('INSERT', ['I', 'DDINSERT', 'CLASSICINSERT'], 'Insert a block', async () => {
  const names = Object.keys(App.doc.blocks || {}).filter(n => !n.startsWith('*'));
  if (!names.length) { UI.log('No blocks defined. Use BLOCK (B) to create one, or open a DXF that contains blocks.', 'err'); return; }
  UI.log('Blocks: ' + names.join(', '), 'info');
  const d0 = names.includes(App.lastBlock) ? App.lastBlock : names[0];
  let name = (await getString(`Enter block name <${d0}>`)).trim() || d0;
  const found = names.find(n => n.toLowerCase() === name.toLowerCase());
  if (!found) { UI.log(`Block "${name}" not found.`, 'err'); return; }
  name = found; App.lastBlock = name;
  let sc = 1, ro = 0;
  for (;;) {
    const p = await getPoint('Specify insertion point or [Scale/Rotate]', { keywords: ['Scale', 'Rotate'], rubber: false, preview: (q) => [{ type: 'insert', name, p: q, sx: sc, sy: sc, rot: ro, layer: App.doc.cur }] });
    if (p === 'Scale') { const v = await getDist('Specify scale factor <1>', { def: 1 }); if (typeof v === 'number' && v) sc = v; continue; }
    if (p === 'Rotate') { const v = await getAngle('Specify rotation angle <0>', { def: 0 }); if (typeof v === 'number') ro = v; continue; }
    if (!isPt(p)) return;
    const attrs = await askAttributes(name);
    addEnt({ type: 'insert', name, p, sx: sc, sy: sc, rot: ro, attrs });
    return;
  }
});
