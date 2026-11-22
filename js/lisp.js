// Mini AutoLISP: reader, evaluator, common built-ins, (command ...), defun c:XXX, APPLOAD
'use strict';

const LSym = (s) => ({ s: s.toUpperCase() });
const isSym = (x, n) => x && typeof x === 'object' && !Array.isArray(x) && 's' in x && (!n || x.s === n);
const PAUSE = { pause: true };
const lispTrue = (v) => !(v === null || v === undefined || v === false || (Array.isArray(v) && v.length === 0 && !v.dotted));
const lnil = (v) => (lispTrue(v) ? v : null);

function lispRead(src) {
  const toks = (src.match(/"(?:\\.|[^"\\])*"|;[^\n]*|[()']|[^\s()';]+/g) || []).filter(t => !t.startsWith(';'));
  let i = 0;
  const atom = (t) => {
    if (t.startsWith('"')) return t.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(.)/g, '$1');
    if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return parseFloat(t);
    if (/^nil$/i.test(t)) return null;
    if (t === 'T' || t === 't') return true;
    return LSym(t);
  };
  const read = () => {
    if (i >= toks.length) throw new Error('malformed list on input');
    const t = toks[i++];
    if (t === "'") return [LSym('QUOTE'), read()];
    if (t === '(') {
      const lst = [];
      while (i < toks.length && toks[i] !== ')') {
        if (toks[i] === '.') { i++; const cdr = read(); const d = [lst.pop(), cdr]; d.dotted = true; if (toks[i] === ')') i++; return d.length ? (lst.length ? Object.assign([...lst, ...d], { dotted: false }) : d) : d; }
        lst.push(read());
      }
      if (toks[i] !== ')') throw new Error('malformed list on input'); i++;
      return lst;
    }
    if (t === ')') throw new Error('extra right paren on input');
    return atom(t);
  };
  const forms = []; while (i < toks.length) forms.push(read());
  return forms;
}

function lispStr(v, raw) {
  if (v === null || v === undefined) return 'nil';
  if (v === true) return 'T';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : fmt(v, 6);
  if (typeof v === 'string') return raw ? v : JSON.stringify(v);
  if (isSym(v)) return v.s;
  if (v && v.lfn) return `#<USUBR @${v.name || 'lambda'}>`;
  if (typeof v === 'function') return '#<SUBR>';
  if (v && v.ss) return `<Selection set: ${v.ids.length}>`;
  if (v && v.ename) return `<Entity name: ${v.ename}>`;
  if (Array.isArray(v)) return v.dotted ? `(${lispStr(v[0])} . ${lispStr(v[1])})` : `(${v.map(x => lispStr(x)).join(' ')})`;
  return String(v);
}

const LispG = new Map();
let lispKw = null;
const toPt = (v) => (Array.isArray(v) && typeof v[0] === 'number' ? { x: v[0], y: v[1] } : null);
const fromPt = (p) => (p ? [p.x, p.y, 0] : null);
const car = (l) => (Array.isArray(l) && l.length ? l[0] : null);
const cdr = (l) => (Array.isArray(l) ? (l.dotted ? l[1] : lnil(l.slice(1))) : null);
const num = (v) => { if (typeof v !== 'number') throw new Error(`bad argument type: numberp: ${lispStr(v)}`); return v; };

function cmdArg(v) {
  if (v === PAUSE) return PAUSE;
  if (v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v) && typeof v[0] === 'number') return `#${v[0]},${v[1]}`;
  if (v && v.ss) return { selIds: v.ids };
  if (v && v.ename) return { selIds: [v.ename] };
  return lispStr(v, true);
}
async function lispCommand(args) {
  // split into consecutive commands: each string that names a command starts a new one
  let i = 0;
  while (i < args.length) {
    let name = String(args[i++]).replace(/^[_.]+/, '');
    const cname = resolveCmd(name);
    if (!cname) throw new Error(`Unknown command "${name}"`);
    const inputs = [];
    while (i < args.length) { inputs.push(cmdArg(args[i])); i++; }
    App.queue = inputs;
    App.sel.clear();
    const saveSel = App.usedSel;
    try { await Commands[cname].fn(); } finally { App.queue = []; App.req = null; App.temp = []; App.usedSel = saveSel; App.sel.clear(); App.dirty = true; }
  }
}

const B = {
  '+': (...a) => a.reduce((s, x) => s + num(x), 0),
  '-': (...a) => (a.length === 1 ? -num(a[0]) : a.slice(1).reduce((s, x) => s - num(x), num(a[0]))),
  '*': (...a) => a.reduce((s, x) => s * num(x), 1),
  '/': (...a) => a.slice(1).reduce((s, x) => { if (!num(x)) throw new Error('divide by zero'); const r = s / x; return Number.isInteger(s) && Number.isInteger(x) ? Math.trunc(r) : r; }, num(a[0])),
  REM: (a, b) => num(a) % num(b), '1+': (a) => num(a) + 1, '1-': (a) => num(a) - 1, ABS: (a) => Math.abs(num(a)),
  MIN: (...a) => Math.min(...a.map(num)), MAX: (...a) => Math.max(...a.map(num)), SQRT: (a) => Math.sqrt(num(a)), EXPT: (a, b) => num(a) ** num(b),
  SIN: (a) => Math.sin(num(a)), COS: (a) => Math.cos(num(a)), ATAN: (a, b) => (b === undefined ? Math.atan(num(a)) : Math.atan2(num(a), num(b))), FIX: (a) => Math.trunc(num(a)), FLOAT: (a) => num(a), PI: Math.PI,
  '=': (...a) => a.every(x => x === a[0]) || null, '/=': (a, b) => a !== b || null,
  '<': (...a) => a.every((x, i) => i === 0 || a[i - 1] < x) || null, '>': (...a) => a.every((x, i) => i === 0 || a[i - 1] > x) || null,
  '<=': (...a) => a.every((x, i) => i === 0 || a[i - 1] <= x) || null, '>=': (...a) => a.every((x, i) => i === 0 || a[i - 1] >= x) || null,
  EQ: (a, b) => a === b || null, EQUAL: (a, b, f) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= (f || 0) : lispStr(a) === lispStr(b)) || null,
  NULL: (a) => !lispTrue(a) || null, NOT: (a) => !lispTrue(a) || null, MINUSP: (a) => num(a) < 0 || null, ZEROP: (a) => num(a) === 0 || null, NUMBERP: (a) => typeof a === 'number' || null,
  LISTP: (a) => Array.isArray(a) || a === null || null, ATOM: (a) => !Array.isArray(a) || null,
  LIST: (...a) => lnil(a), CONS: (a, b) => (Array.isArray(b) && !b.dotted ? [a, ...b] : b === null ? [a] : Object.assign([a, b], { dotted: true })),
  CAR: car, CDR: cdr, CADR: (l) => car(cdr(l)), CDDR: (l) => cdr(cdr(l)), CADDR: (l) => car(cdr(cdr(l))), CAAR: (l) => car(car(l)), CDAR: (l) => cdr(car(l)),
  NTH: (n, l) => (Array.isArray(l) ? l[num(n)] ?? null : null), LENGTH: (l) => (Array.isArray(l) ? l.length : 0), LAST: (l) => (Array.isArray(l) && l.length ? l[l.length - 1] : null),
  APPEND: (...a) => lnil(a.flatMap(x => (Array.isArray(x) ? x : []))), REVERSE: (l) => lnil([...(l || [])].reverse()),
  MEMBER: (x, l) => { const i = (l || []).findIndex(y => lispStr(y) === lispStr(x)); return i < 0 ? null : l.slice(i); },
  ASSOC: (k, l) => (l || []).find(p => Array.isArray(p) && lispStr(p[0]) === lispStr(k)) || null,
  STRCAT: (...a) => a.join(''), STRLEN: (s) => String(s || '').length, SUBSTR: (s, st, n) => String(s).substr(num(st) - 1, n === undefined ? undefined : num(n)),
  STRCASE: (s, lower) => (lispTrue(lower) ? String(s).toLowerCase() : String(s).toUpperCase()),
  ITOA: (n) => String(Math.trunc(num(n))), ATOI: (s) => parseInt(s, 10) || 0, ATOF: (s) => parseFloat(s) || 0,
  RTOS: (n, m, p) => fmt(num(n), p === undefined ? 4 : p), ANGTOS: (a, m, p) => fmt(deg(normAng(num(a))), p === undefined ? 0 : p), READ: (s) => lispRead(String(s))[0] ?? null,
  DISTANCE: (a, b) => V.dist(toPt(a), toPt(b)), ANGLE: (a, b) => normAng(V.ang(toPt(a), toPt(b))), POLAR: (p, a, d) => fromPt(V.polar(toPt(p), num(a), num(d))),
  INTERS: (a, b, c, d, onseg) => { const r = segSeg(toPt(a), toPt(b), toPt(c), toPt(d), onseg === null); return r ? fromPt(r.p) : null; },
  DTR: (d) => rad(num(d)), RTD: (r) => deg(num(r)),
  PRINC: (v) => { if (v !== undefined) UI.log(lispStr(v, true)); return v ?? null; },
  PRIN1: (v) => { UI.log(lispStr(v)); return v; }, PRINT: (v) => { UI.log(lispStr(v)); return v; }, PROMPT: (s) => { UI.log(String(s)); return null; }, TERPRI: () => null,
  ALERT: (s) => { UI.log('** ' + s + ' **', 'info'); return null; },
  INITGET: (bits, kws) => { lispKw = typeof bits === 'string' ? bits : (kws || null); return null; },
  GETPOINT: async (base, msg) => { if (typeof base === 'string') { msg = base; base = null; } const kw = lispKw ? lispKw.split(/\s+/) : undefined; lispKw = null; const p = await getPoint(msg || 'Specify point', { base: toPt(base) || undefined, keywords: kw }); return typeof p === 'string' ? p : fromPt(p); },
  GETCORNER: async (base, msg) => fromPt(await getPoint(msg || 'Specify opposite corner', { base: toPt(base), rubber: false, preview: (q) => [{ type: 'pline', pts: rectPts(toPt(base), q), closed: true, color: '#4a8cff' }] })),
  GETDIST: async (base, msg) => { if (typeof base === 'string') { msg = base; base = null; } const v = await getDist(msg || 'Specify distance', { base: toPt(base) || undefined }); return typeof v === 'number' ? v : null; },
  GETREAL: async (msg) => { const v = await getDist(msg || 'Enter a number'); return typeof v === 'number' ? v : null; },
  GETINT: async (msg) => { const v = await getDist(msg || 'Enter an integer'); return typeof v === 'number' ? Math.round(v) : null; },
  GETANGLE: async (base, msg) => { if (typeof base === 'string') { msg = base; base = null; } const v = await getAngle(msg || 'Specify angle', { base: toPt(base) || undefined }); return typeof v === 'number' ? v : null; },
  GETSTRING: async (cr, msg) => { if (typeof cr === 'string') msg = cr; const s = await getString(msg || 'Enter text'); return s; },
  GETKWORD: async (msg) => { const kw = (lispKw || '').split(/\s+/).filter(Boolean); lispKw = null; const k = await getKeyword(msg || 'Enter an option', { keywords: kw }); return k || null; },
  GETVAR: (n) => { const v = String(n).toUpperCase(); return { CLAYER: App.doc.cur, TEXTSIZE: App.doc.textH, LTSCALE: App.doc.ltscale || 1, DIMTXT: App.doc.dimH, PDMODE: App.doc.pdmode || 0, ORTHOMODE: App.modes.ortho ? 1 : 0, GRIDMODE: App.modes.grid ? 1 : 0, OSMODE: App.modes.osnap ? 1 : 0, LASTPOINT: fromPt(App.lastPoint) }[v] ?? null; },
  SETVAR: (n, val) => { const v = String(n).toUpperCase(); if (v === 'CLAYER' && App.doc.layers.some(l => l.name === val)) App.doc.cur = val; else if (v === 'TEXTSIZE') App.doc.textH = num(val); else if (v === 'LTSCALE') App.doc.ltscale = num(val); else if (v === 'DIMTXT') App.doc.dimH = num(val); else if (v === 'PDMODE') App.doc.pdmode = num(val); else if (v === 'ORTHOMODE') App.modes.ortho = !!val; else if (v === 'GRIDMODE') App.modes.grid = !!val; else if (v === 'OSMODE') App.modes.osnap = !!val; App.dirty = true; UI.refreshStatus(); return val; },
  COMMAND: async (...a) => { await lispCommand(a); return null; },
  ENTLAST: () => { const e = App.doc.ents[App.doc.ents.length - 1]; return e ? { ename: e.id } : null; },
  ENTDEL: (en) => { const e = entById(en && en.ename); if (e) removeEnts([e]); return en; },
  ENTSEL: async (msg) => { const p = await getEntity(msg || 'Select object'); return p && typeof p === 'object' ? [{ ename: p.e.id }, fromPt(p.p)] : null; },
  ENTGET: (en) => {
    const e = entById(en && en.ename); if (!e) return null;
    const pr = (k, v) => Object.assign([k, v], { dotted: true });
    const out = [pr(-1, en), pr(0, Types[e.type].label.toUpperCase().replace(/\s+/g, '')), pr(8, e.layer)];
    if (e.type === 'line') out.push([10, e.p1.x, e.p1.y, 0], [11, e.p2.x, e.p2.y, 0]);
    if (e.type === 'circle' || e.type === 'arc') out.push([10, e.c.x, e.c.y, 0], pr(40, e.r));
    if (e.type === 'text' || e.type === 'mtext') out.push([10, e.p.x, e.p.y, 0], pr(1, e.s), pr(40, e.h));
    if (e.type === 'pline') e.pts.forEach(p => out.push([10, p.x, p.y]));
    if (e.type === 'insert') out.push(pr(2, e.name), [10, e.p.x, e.p.y, 0]);
    return out;
  },
  SSGET: async (mode) => { const s = String(mode || '').toUpperCase() === 'X' ? App.doc.ents.filter(editable) : await getSelection('Select objects', { noPickfirst: false }); return s.length ? { ss: true, ids: s.map(e => e.id) } : null; },
  SSLENGTH: (ss) => (ss && ss.ss ? ss.ids.length : 0), SSNAME: (ss, i) => (ss && ss.ss && ss.ids[num(i)] !== undefined ? { ename: ss.ids[num(i)] } : null),
  TYPE: (v) => LSym(v === null ? 'NIL' : typeof v === 'number' ? (Number.isInteger(v) ? 'INT' : 'REAL') : typeof v === 'string' ? 'STR' : Array.isArray(v) ? 'LIST' : isSym(v) ? 'SYM' : v && v.ss ? 'PICKSET' : v && v.ename ? 'ENAME' : 'USUBR'),
  VL_LOAD_COM: () => null,
};
B['VL-LOAD-COM'] = B.VL_LOAD_COM;
for (const [k, v] of Object.entries(B)) LispG.set(k, v);
LispG.set('PAUSE', PAUSE);

function lookup(env, s) {
  for (let e = env; e; e = e.parent) if (e.vars.has(s)) return e.vars.get(s);
  return LispG.has(s) ? LispG.get(s) : null;
}
function assign(env, s, v) {
  for (let e = env; e; e = e.parent) if (e.vars.has(s)) { e.vars.set(s, v); return; }
  LispG.set(s, v);
}

async function lispEval(x, env) {
  if (isSym(x)) return lookup(env, x.s);
  if (!Array.isArray(x) || x.dotted) return x;
  if (!x.length) return null;
  const h = x[0];
  if (isSym(h)) {
    switch (h.s) {
      case 'QUOTE': return x[1];
      case 'SETQ': { let v = null; for (let i = 1; i < x.length; i += 2) { v = await lispEval(x[i + 1], env); assign(env, x[i].s, v); } return v; }
      case 'IF': return lispTrue(await lispEval(x[1], env)) ? lispEval(x[2], env) : (x[3] !== undefined ? lispEval(x[3], env) : null);
      case 'COND': for (const c of x.slice(1)) { const t = await lispEval(c[0], env); if (lispTrue(t)) { let v = t; for (const f of c.slice(1)) v = await lispEval(f, env); return v; } } return null;
      case 'PROGN': { let v = null; for (const f of x.slice(1)) v = await lispEval(f, env); return v; }
      case 'AND': { for (const f of x.slice(1)) if (!lispTrue(await lispEval(f, env))) return null; return true; }
      case 'OR': { for (const f of x.slice(1)) if (lispTrue(await lispEval(f, env))) return true; return null; }
      case 'WHILE': { let v = null, guard = 0; while (lispTrue(await lispEval(x[1], env))) { for (const f of x.slice(2)) v = await lispEval(f, env); if (++guard > 1e6) throw new Error('loop limit'); } return v; }
      case 'REPEAT': { let v = null; const n = await lispEval(x[1], env); for (let i = 0; i < n; i++) for (const f of x.slice(2)) v = await lispEval(f, env); return v; }
      case 'FOREACH': { const lst = await lispEval(x[2], env) || []; let v = null; const sc = { vars: new Map(), parent: env }; for (const it of lst) { sc.vars.set(x[1].s, it); for (const f of x.slice(3)) v = await lispEval(f, sc); } return v; }
      case 'LAMBDA': return { lfn: true, params: x[1] || [], body: x.slice(2), env };
      case 'FUNCTION': return lispEval(x[1], env);
      case 'DEFUN': {
        const name = x[1].s, params = x[2] || [];
        const fn = { lfn: true, name, params, body: x.slice(3), env: null };
        LispG.set(name, fn);
        if (name.startsWith('C:')) {
          const cname = name.slice(2);
          Commands[cname] = { alias: [], desc: 'User-defined LISP command', fn: async () => { await lispApply(fn, []); } };
        }
        return LSym(name);
      }
      default: break;
    }
  }
  const f = await lispEval(h, env);
  const args = [];
  for (const a of x.slice(1)) args.push(await lispEval(a, env));
  return lispApply(f, args, h);
}
async function lispApply(f, args, h) {
  if (typeof f === 'function') return (await f(...args)) ?? null;
  if (f && f.lfn) {
    const sc = { vars: new Map(), parent: f.env };
    let local = false, i = 0;
    for (const p of f.params) { if (isSym(p, '/')) { local = true; continue; } sc.vars.set(p.s, local ? null : (args[i++] ?? null)); }
    let v = null; for (const form of f.body) v = await lispEval(form, sc); return v;
  }
  throw new Error(`no function definition: ${h && isSym(h) ? h.s : lispStr(f)}`);
}
B.APPLY = async (f, l) => lispApply(f, l || []); LispG.set('APPLY', B.APPLY);
B.MAPCAR = async (f, ...ls) => { const n = Math.min(...ls.map(l => (l || []).length)); const out = []; for (let i = 0; i < n; i++) out.push(await lispApply(f, ls.map(l => l[i]))); return lnil(out); }; LispG.set('MAPCAR', B.MAPCAR);

async function lispRun(src) {
  let v = null;
  for (const f of lispRead(src)) v = await lispEval(f, null);
  return v;
}
function parenBalance(s) { let d = 0, q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '"' && s[i - 1] !== '\\') q = !q; else if (!q && c === '(') d++; else if (!q && c === ')') d--; } return { depth: d, inString: q }; }

def('APPLOAD', ['AP', 'LOAD'], 'Load an AutoLISP (.lsp) file', async () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.lsp,.txt';
  inp.onchange = () => { const f = inp.files[0]; if (f) lispLoadFile(f); };
  inp.click();
}, { noUndo: true, noRepeat: true });
function lispLoadFile(f) {
  const rd = new FileReader();
  rd.onload = () => runCommand(async () => {
    const before = Object.keys(Commands).length;
    await lispRun(String(rd.result));
    UI.log(`${f.name} successfully loaded. ${Object.keys(Commands).length - before} new command(s).`, 'info');
  });
  rd.readAsText(f);
}
