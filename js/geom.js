// Basic 2D geometry helpers
'use strict';

const TAU = Math.PI * 2;
const EPS = 1e-9;

const V = {
  p: (x, y) => ({ x, y }),
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  cross: (a, b) => a.x * b.y - a.y * b.x,
  len: (a) => Math.hypot(a.x, a.y),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  ang: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
  polar: (p, a, d) => ({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d }),
  mid: (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
  norm: (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  perp: (a) => ({ x: -a.y, y: a.x }),
  eq: (a, b, e = 1e-7) => Math.abs(a.x - b.x) < e && Math.abs(a.y - b.y) < e,
  clone: (a) => ({ x: a.x, y: a.y }),
};

function normAng(a) { a %= TAU; if (a < 0) a += TAU; return a; }
function deg(r) { return r * 180 / Math.PI; }
function rad(d) { return d * Math.PI / 180; }

// is angle a inside ccw arc from a1 to a2
function angInArc(a, a1, a2) {
  const span = normAng(a2 - a1);
  return normAng(a - a1) <= span + 1e-9;
}

function closestOnSeg(p, a, b) {
  const d = V.sub(b, a);
  const l2 = V.dot(d, d);
  if (l2 < EPS) return { p: V.clone(a), t: 0 };
  let t = V.dot(V.sub(p, a), d) / l2;
  t = Math.max(0, Math.min(1, t));
  return { p: V.lerp(a, b, t), t };
}
function ptSegDist(p, a, b) { return V.dist(p, closestOnSeg(p, a, b).p); }

// segment-segment intersection; returns {p,t,u} or null
function segSeg(a, b, c, d, infinite = false) {
  const r = V.sub(b, a), s = V.sub(d, c);
  const den = V.cross(r, s);
  if (Math.abs(den) < EPS) return null;
  const q = V.sub(c, a);
  const t = V.cross(q, s) / den;
  const u = V.cross(q, r) / den;
  if (!infinite && (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9)) return null;
  return { p: V.add(a, V.mul(r, t)), t, u };
}

// segment-circle intersections: returns [{p,t}]
function segCircle(a, b, c, r, infinite = false) {
  const d = V.sub(b, a), f = V.sub(a, c);
  const A = V.dot(d, d), B = 2 * V.dot(f, d), C = V.dot(f, f) - r * r;
  let disc = B * B - 4 * A * C;
  if (A < EPS || disc < 0) return [];
  disc = Math.sqrt(disc);
  const out = [];
  for (const t of [(-B - disc) / (2 * A), (-B + disc) / (2 * A)]) {
    if (infinite || (t >= -1e-9 && t <= 1 + 1e-9)) out.push({ p: V.add(a, V.mul(d, t)), t });
  }
  return out;
}

function circle3(p1, p2, p3) {
  const ax = p1.x, ay = p1.y, bx = p2.x, by = p2.y, cx = p3.x, cy = p3.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < EPS) return null;
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  const c = { x: ux, y: uy };
  return { c, r: V.dist(c, p1) };
}

function rectNorm(a, b) {
  return { x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y), x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y) };
}
function ptInRect(p, r) { return p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2; }
function segRect(a, b, r) {
  if (ptInRect(a, r) || ptInRect(b, r)) return true;
  const c = [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y1 }, { x: r.x2, y: r.y2 }, { x: r.x1, y: r.y2 }];
  for (let i = 0; i < 4; i++) if (segSeg(a, b, c[i], c[(i + 1) % 4])) return true;
  return false;
}

// Affine matrices: [a,b,c,d,e,f] -> x' = a x + c y + e ; y' = b x + d y + f
const M = {
  apply: (m, p) => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] }),
  vec: (m, v) => ({ x: m[0] * v.x + m[2] * v.y, y: m[1] * v.x + m[3] * v.y }),
  det: (m) => m[0] * m[3] - m[1] * m[2],
  translate: (dx, dy) => [1, 0, 0, 1, dx, dy],
  rotate: (o, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, s, -s, c, o.x - c * o.x + s * o.y, o.y - s * o.x - c * o.y];
  },
  scale: (o, k) => [k, 0, 0, k, o.x - k * o.x, o.y - k * o.y],
  mirror: (p1, p2) => {
    const u = V.norm(V.sub(p2, p1));
    const a = 2 * u.x * u.x - 1, b = 2 * u.x * u.y, d = 2 * u.y * u.y - 1;
    return [a, b, b, d, p1.x - a * p1.x - b * p1.y, p1.y - b * p1.x - d * p1.y];
  },
};

function fmt(n, prec = 4) {
  if (!isFinite(n)) return String(n);
  let s = n.toFixed(prec);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}
