// Discipline tool palettes: architecture, mechanical, electrical symbols + WALL, WIRE, CENTERMARK, CENTERLINE, TOLERANCE
'use strict';

const S = {
  L: (x1, y1, x2, y2, o = {}) => ({ type: 'line', p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, layer: '0', ...o }),
  C: (x, y, r, o = {}) => ({ type: 'circle', c: { x, y }, r, layer: '0', ...o }),
  A: (x, y, r, a1, a2, o = {}) => ({ type: 'arc', c: { x, y }, r, a1: rad(a1), a2: rad(a2), layer: '0', ...o }),
  PL: (pts, closed = true, o = {}) => ({ type: 'pline', pts: pts.map(([x, y]) => ({ x, y })), closed, layer: '0', ...o }),
  R: (x, y, w, h, o = {}) => S.PL([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, o),
  T: (x, y, h, s, center = true) => ({ type: 'text', p: { x: center ? x - textWidth(s, h) / 2 : x, y: center ? y - h / 2 : y }, h, rot: 0, s, layer: '0' }),
  H: (pts) => ({ type: 'hatch', loops: [pts.map(([x, y]) => ({ x, y }))], pat: 'SOLID', scale: 1, ang: 0, layer: '0' }),
  EL: (cx, cy, rx, ry, n = 48) => S.PL(Array.from({ length: n }, (_, i) => [cx + rx * Math.cos(i * TAU / n), cy + ry * Math.sin(i * TAU / n)])),
  POLY: (cx, cy, r, n, a0 = 0) => S.PL(Array.from({ length: n }, (_, i) => [cx + r * Math.cos(a0 + i * TAU / n), cy + r * Math.sin(a0 + i * TAU / n)])),
};
const CEN = { lt: 'Center' };

// ---- tool catalogue (sizes in millimetres; base point = (0,0)) ----
const TOOLS = [
  // ===== Architecture =====
  { id: 'door', cat: 'Architecture', name: 'Door', layer: 'A-DOOR', color: '#00ff00', params: [{ k: 'w', label: 'Door width', def: 900 }],
    gen: ({ w }) => [S.R(0, 0, 40, w), S.A(0, 0, w, 0, 90), S.L(0, 0, w, 0)] },
  { id: 'door2', cat: 'Architecture', name: 'Double Door', layer: 'A-DOOR', color: '#00ff00', params: [{ k: 'w', label: 'Opening width', def: 1500 }],
    gen: ({ w }) => [S.R(0, 0, 40, w / 2), S.A(0, 0, w / 2, 0, 90), S.R(w - 40, 0, 40, w / 2), S.A(w, 0, w / 2, 90, 180), S.L(0, 0, w, 0)] },
  { id: 'slide', cat: 'Architecture', name: 'Sliding Door', layer: 'A-DOOR', color: '#00ff00', params: [{ k: 'w', label: 'Opening width', def: 1800 }],
    gen: ({ w }) => [S.R(0, -20, w * 0.55, 40), S.R(w * 0.45, 30, w * 0.55, 40), S.L(w * 0.2, 0, w * 0.35, 0), S.L(w * 0.65, 50, w * 0.8, 50)] },
  { id: 'window', cat: 'Architecture', name: 'Window', layer: 'A-GLAZ', color: '#00ffff', params: [{ k: 'w', label: 'Window width', def: 1200 }, { k: 't', label: 'Wall thickness', def: 200 }],
    gen: ({ w, t }) => [S.R(0, 0, w, t), S.L(0, t * 0.42, w, t * 0.42), S.L(0, t * 0.58, w, t * 0.58)] },
  { id: 'bed2', cat: 'Architecture', name: 'Double Bed', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 1600, 2000), S.R(100, 1620, 650, 300), S.R(850, 1620, 650, 300), S.L(0, 1450, 1600, 1450), S.L(0, 1450, 300, 1600)] },
  { id: 'bed1', cat: 'Architecture', name: 'Single Bed', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 900, 2000), S.R(100, 1620, 700, 300), S.L(0, 1450, 900, 1450), S.L(0, 1450, 250, 1600)] },
  { id: 'sofa', cat: 'Architecture', name: 'Sofa 3-Seat', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 2100, 900), S.R(0, 700, 2100, 200), S.R(0, 0, 200, 700), S.R(1900, 0, 200, 700), S.L(767, 0, 767, 700), S.L(1333, 0, 1333, 700)] },
  { id: 'chair', cat: 'Architecture', name: 'Armchair', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 850, 850), S.R(0, 650, 850, 200), S.R(0, 0, 150, 650), S.R(700, 0, 150, 650)] },
  { id: 'dining', cat: 'Architecture', name: 'Dining Table 6', layer: 'A-FURN', color: '#ff7f00',
    gen: () => { const o = [S.R(0, 0, 1600, 900)]; for (const x of [150, 575, 1000]) { o.push(S.R(x, -500, 450, 450), S.R(x, 950, 450, 450)); } return o; } },
  { id: 'rtable', cat: 'Architecture', name: 'Round Table 4', layer: 'A-FURN', color: '#ff7f00',
    gen: () => { const o = [S.C(0, 0, 500)]; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, c = V.polar({ x: 0, y: 0 }, a, 750); o.push(S.POLY(c.x, c.y, 300, 4, a + Math.PI / 4)); } return o; } },
  { id: 'desk', cat: 'Architecture', name: 'Desk + Chair', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 1400, 700), S.R(475, -550, 450, 450), S.A(700, -100, 225, 180, 360)] },
  { id: 'wc', cat: 'Architecture', name: 'WC', layer: 'A-PLUM', color: '#ff00ff',
    gen: () => [S.R(0, 500, 450, 200), S.EL(225, 270, 190, 260), S.EL(225, 250, 140, 190)] },
  { id: 'basin', cat: 'Architecture', name: 'Wash Basin', layer: 'A-PLUM', color: '#ff00ff',
    gen: () => [S.R(0, 0, 550, 450), S.EL(275, 200, 200, 140), S.C(275, 380, 25)] },
  { id: 'bath', cat: 'Architecture', name: 'Bathtub', layer: 'A-PLUM', color: '#ff00ff',
    gen: () => [S.R(0, 0, 1700, 750), S.PL([[80, 80], [1450, 80], [1620, 200], [1620, 550], [1450, 670], [80, 670]]), S.C(1500, 375, 30)] },
  { id: 'shower', cat: 'Architecture', name: 'Shower', layer: 'A-PLUM', color: '#ff00ff',
    gen: () => [S.R(0, 0, 900, 900), S.L(0, 0, 900, 900), S.L(0, 900, 900, 0), S.C(450, 450, 40)] },
  { id: 'ksink', cat: 'Architecture', name: 'Kitchen Sink', layer: 'A-PLUM', color: '#ff00ff',
    gen: () => [S.R(0, 0, 1000, 500), S.R(50, 50, 420, 400), S.R(530, 50, 420, 400), S.C(260, 250, 25), S.C(740, 250, 25)] },
  { id: 'stove', cat: 'Architecture', name: 'Cooker', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 600, 600), S.C(150, 150, 90), S.C(450, 150, 90), S.C(150, 450, 110), S.C(450, 450, 70)] },
  { id: 'fridge', cat: 'Architecture', name: 'Refrigerator', layer: 'A-FURN', color: '#ff7f00',
    gen: () => [S.R(0, 0, 700, 700), S.L(0, 80, 700, 80), S.T(350, 400, 120, 'REF')] },
  { id: 'stair', cat: 'Architecture', name: 'Stair', layer: 'A-STRS', color: '#ffff00', params: [{ k: 'w', label: 'Stair width', def: 1000 }, { k: 'n', label: 'Number of risers', def: 12 }, { k: 'g', label: 'Tread (going)', def: 280 }],
    gen: ({ w, n, g }) => {
      const N = Math.max(2, Math.round(n)), L = (N - 1) * g, o = [S.R(0, 0, w, L)];
      for (let i = 1; i < N - 1; i++) o.push(S.L(0, i * g, w, i * g));
      o.push(S.L(w / 2, g / 2, w / 2, L - g * 0.6), S.H([[w / 2, L - g * 0.2], [w / 2 - 80, L - g * 0.7], [w / 2 + 80, L - g * 0.7]]), S.T(w / 2, g * 0.25, 120, 'UP'));
      return o;
    } },
  { id: 'column', cat: 'Architecture', name: 'Column', layer: 'S-COLS', color: '#ff0000', params: [{ k: 'w', label: 'Column size', def: 400 }],
    gen: ({ w }) => [S.R(-w / 2, -w / 2, w, w), S.H([[-w / 2, -w / 2], [w / 2, -w / 2], [w / 2, w / 2], [-w / 2, w / 2]])] },
  { id: 'grid', cat: 'Architecture', name: 'Grid Bubble', layer: 'S-GRID', color: '#ff0000', params: [{ k: 's', label: 'Grid label', def: 'A', str: true }],
    gen: ({ s }) => [S.L(0, 0, 0, 1500, CEN), S.C(0, 1900, 400), S.T(0, 1900, 350, String(s))] },
  { id: 'north', cat: 'Architecture', name: 'North Arrow', layer: 'A-ANNO', color: '#ffffff',
    gen: () => [S.C(0, 0, 500), S.H([[0, 500], [-200, -300], [0, -150]]), S.PL([[0, 500], [200, -300], [0, -150]]), S.T(0, 720, 250, 'N')] },
  { id: 'level', cat: 'Architecture', name: 'Level Mark', layer: 'A-ANNO', color: '#ffffff', params: [{ k: 's', label: 'Level text', def: '+0.00', str: true }],
    gen: ({ s }) => [S.H([[0, 0], [-120, 160], [120, 160]]), S.L(-120, 160, 900, 160), S.T(150, 230, 160, String(s), false)] },
  { id: 'section', cat: 'Architecture', name: 'Section Mark', layer: 'A-ANNO', color: '#ffffff', params: [{ k: 's', label: 'Section label', def: 'A', str: true }],
    gen: ({ s }) => [S.C(0, 0, 350), S.H(Array.from({ length: 13 }, (_, i) => [350 * Math.cos(Math.PI + i * Math.PI / 12), 350 * Math.sin(Math.PI + i * Math.PI / 12)])), S.L(-350, 0, 350, 0), S.T(0, 175, 250, String(s)), S.L(0, 350, 0, 900)] },

  // ===== Mechanical =====
  { id: 'nut', cat: 'Mechanical', name: 'Hex Nut (top)', layer: 'M-PART', color: '#ffffff', params: [{ k: 'd', label: 'Thread size M', def: 10 }],
    gen: ({ d }) => { const s = 1.6 * d; return [S.POLY(0, 0, s / Math.sqrt(3), 6, 0), S.C(0, 0, s / 2), S.C(0, 0, d * 0.42), S.A(0, 0, d / 2, 0, 270), S.L(-d * 0.8, 0, d * 0.8, 0, CEN), S.L(0, -d * 0.8, 0, d * 0.8, CEN)]; } },
  { id: 'bolt', cat: 'Mechanical', name: 'Hex Bolt (side)', layer: 'M-PART', color: '#ffffff', params: [{ k: 'd', label: 'Thread size M', def: 10 }, { k: 'l', label: 'Length', def: 40 }],
    gen: ({ d, l }) => { const k = 0.65 * d, s = 1.6 * d, tl = Math.min(l, 2 * d + 6); return [S.R(-k, -s / 2, k, s), S.L(-k, -s / 6, 0, -s / 6), S.L(-k, s / 6, 0, s / 6), S.R(0, -d / 2, l, d), S.L(l - tl, -d * 0.42, l, -d * 0.42), S.L(l - tl, d * 0.42, l, d * 0.42), S.L(l - tl, -d / 2, l - tl, d / 2), S.L(-k - 2, 0, l + 3, 0, CEN)]; } },
  { id: 'washer', cat: 'Mechanical', name: 'Washer', layer: 'M-PART', color: '#ffffff', params: [{ k: 'd', label: 'Bolt size M', def: 10 }],
    gen: ({ d }) => [S.C(0, 0, d), S.C(0, 0, d * 0.54), S.L(-d * 1.2, 0, d * 1.2, 0, CEN), S.L(0, -d * 1.2, 0, d * 1.2, CEN)] },
  { id: 'bearing', cat: 'Mechanical', name: 'Ball Bearing', layer: 'M-PART', color: '#ffffff', params: [{ k: 'D', label: 'Outer diameter', def: 47 }, { k: 'd', label: 'Bore diameter', def: 20 }],
    gen: ({ D, d }) => { const rm = (D + d) / 4, rb = (D - d) / 8, o = [S.C(0, 0, D / 2), S.C(0, 0, d / 2), S.C(0, 0, rm + rb * 0.9), S.C(0, 0, rm - rb * 0.9)]; const n = Math.max(6, Math.floor(TAU * rm / (rb * 2.6))); for (let i = 0; i < n; i++) { const c = V.polar({ x: 0, y: 0 }, i * TAU / n, rm); o.push(S.C(c.x, c.y, rb)); } o.push(S.L(-D * 0.6, 0, D * 0.6, 0, CEN), S.L(0, -D * 0.6, 0, D * 0.6, CEN)); return o; } },
  { id: 'gear', cat: 'Mechanical', name: 'Spur Gear', layer: 'M-PART', color: '#ffffff', params: [{ k: 'z', label: 'Number of teeth', def: 24 }, { k: 'm', label: 'Module', def: 2 }],
    gen: ({ z, m }) => {
      const N = Math.max(6, Math.round(z)), rp = m * N / 2, ra = rp + m, rf = rp - 1.25 * m, pts = [];
      for (let i = 0; i < N; i++) { const a = i * TAU / N, w = TAU / N; pts.push([rf * Math.cos(a), rf * Math.sin(a)], [ra * Math.cos(a + w * 0.2), ra * Math.sin(a + w * 0.2)], [ra * Math.cos(a + w * 0.45), ra * Math.sin(a + w * 0.45)], [rf * Math.cos(a + w * 0.65), rf * Math.sin(a + w * 0.65)]); }
      return [S.PL(pts), S.C(0, 0, rp, CEN), S.C(0, 0, Math.max(m * 3, rf * 0.3)), S.L(-ra * 1.1, 0, ra * 1.1, 0, CEN), S.L(0, -ra * 1.1, 0, ra * 1.1, CEN)];
    } },
  { id: 'shaft', cat: 'Mechanical', name: 'Shaft w/ Keyway', layer: 'M-PART', color: '#ffffff', params: [{ k: 'd', label: 'Shaft diameter', def: 30 }],
    gen: ({ d }) => { const b = d / 4, t = d / 8; return [S.C(0, 0, d / 2), S.PL([[-b / 2, d / 2 - t], [b / 2, d / 2 - t], [b / 2, Math.sqrt(d * d / 4 - b * b / 4)], [-b / 2, Math.sqrt(d * d / 4 - b * b / 4)]], false), S.L(-d * 0.65, 0, d * 0.65, 0, CEN), S.L(0, -d * 0.65, 0, d * 0.65, CEN)]; } },
  { id: 'surf', cat: 'Mechanical', name: 'Surface Finish', layer: 'M-ANNO', color: '#00ffff', params: [{ k: 's', label: 'Roughness text', def: 'Ra 3.2', str: true }],
    gen: ({ s }) => [S.PL([[-3, 5.2], [0, 0], [6, 10.4], [16, 10.4]], false), S.L(-3, 5.2, 3, 5.2), S.T(2, 11.4, 2.5, String(s), false)] },
  { id: 'datum', cat: 'Mechanical', name: 'Datum Feature', layer: 'M-ANNO', color: '#00ffff', params: [{ k: 's', label: 'Datum letter', def: 'A', str: true }],
    gen: ({ s }) => [S.H([[-3, 0], [3, 0], [0, 4]]), S.L(0, 4, 0, 8), S.R(-4, 8, 8, 8), S.T(0, 12, 4, String(s))] },
  { id: 'weld', cat: 'Mechanical', name: 'Fillet Weld', layer: 'M-ANNO', color: '#00ffff', params: [{ k: 's', label: 'Leg size', def: '5', str: true }],
    gen: ({ s }) => [S.L(0, 0, 10, 10), S.L(10, 10, 40, 10), S.H([[0, 0], [2.5, 1], [1, 2.5]]), S.PL([[20, 10], [20, 16], [26, 10]], false), S.T(14, 11, 3, String(s), false)] },

  // ===== Electrical: building plan =====
  { id: 'socket', cat: 'Electrical', name: 'Socket Outlet', layer: 'E-POWR', color: '#ff7f00',
    gen: () => [S.A(0, 0, 150, 0, 180), S.L(-150, 0, 150, 0), S.L(0, 150, 0, 260)] },
  { id: 'socket2', cat: 'Electrical', name: 'Double Socket', layer: 'E-POWR', color: '#ff7f00',
    gen: () => [S.A(0, 0, 150, 0, 180), S.L(-150, 0, 150, 0), S.L(-50, 140, -50, 260), S.L(50, 140, 50, 260)] },
  { id: 'switch1', cat: 'Electrical', name: 'Switch 1-Way', layer: 'E-LITE', color: '#ffff00',
    gen: () => [S.C(0, 0, 60), S.L(42, 42, 220, 220), S.L(220, 220, 270, 170)] },
  { id: 'switch2', cat: 'Electrical', name: 'Switch 2-Gang', layer: 'E-LITE', color: '#ffff00',
    gen: () => [S.C(0, 0, 60), S.L(42, 42, 220, 220), S.L(220, 220, 270, 170), S.L(160, 160, 210, 110)] },
  { id: 'light', cat: 'Electrical', name: 'Ceiling Light', layer: 'E-LITE', color: '#ffff00',
    gen: () => [S.C(0, 0, 150), S.L(-106, -106, 106, 106), S.L(-106, 106, 106, -106)] },
  { id: 'wlight', cat: 'Electrical', name: 'Wall Light', layer: 'E-LITE', color: '#ffff00',
    gen: () => [S.A(0, 0, 150, 0, 180), S.L(-150, 0, 150, 0), S.L(-75, 30, 75, 120), S.L(-75, 120, 75, 30)] },
  { id: 'fluor', cat: 'Electrical', name: 'Fluorescent', layer: 'E-LITE', color: '#ffff00',
    gen: () => [S.L(-600, 0, 600, 0), S.L(-600, -80, -600, 80), S.L(600, -80, 600, 80)] },
  { id: 'db', cat: 'Electrical', name: 'Distribution Board', layer: 'E-POWR', color: '#ff7f00',
    gen: () => [S.R(-300, -150, 600, 300), S.H([[-300, -150], [300, -150], [-300, 150]])] },
  { id: 'smoke', cat: 'Electrical', name: 'Smoke Detector', layer: 'E-FIRE', color: '#ff0000',
    gen: () => [S.C(0, 0, 150), S.T(0, 0, 150, 'SD')] },
  { id: 'data', cat: 'Electrical', name: 'Data Outlet', layer: 'E-COMM', color: '#00ffff',
    gen: () => [S.PL([[-150, 0], [150, 0], [0, 200]]), S.T(0, 70, 100, 'D')] },
  { id: 'tv', cat: 'Electrical', name: 'TV Outlet', layer: 'E-COMM', color: '#00ffff',
    gen: () => [S.R(-150, 0, 300, 200), S.T(0, 100, 100, 'TV')] },
  { id: 'fan', cat: 'Electrical', name: 'Ceiling Fan', layer: 'E-POWR', color: '#ff7f00',
    gen: () => { const o = [S.C(0, 0, 60)]; for (let i = 0; i < 3; i++) { const a = i * TAU / 3; const p = V.polar({ x: 0, y: 0 }, a, 350); o.push(S.L(Math.cos(a) * 60, Math.sin(a) * 60, p.x, p.y), S.C(p.x, p.y, 50)); } return o; } },
  // ===== Electrical: schematic (millimetres on a 10 mm grid) =====
  { id: 'res', cat: 'Electrical', name: 'Resistor', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 10, 0), S.R(10, -3, 20, 6), S.L(30, 0, 40, 0)] },
  { id: 'cap', cat: 'Electrical', name: 'Capacitor', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 18, 0), S.L(18, -7, 18, 7), S.L(22, -7, 22, 7), S.L(22, 0, 40, 0)] },
  { id: 'ind', cat: 'Electrical', name: 'Inductor', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 8, 0), S.A(11, 0, 3, 0, 180), S.A(17, 0, 3, 0, 180), S.A(23, 0, 3, 0, 180), S.A(29, 0, 3, 0, 180), S.L(32, 0, 40, 0)] },
  { id: 'diode', cat: 'Electrical', name: 'Diode', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 14, 0), S.H([[14, -6], [14, 6], [25, 0]]), S.L(25, -6, 25, 6), S.L(25, 0, 40, 0)] },
  { id: 'led', cat: 'Electrical', name: 'LED', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 14, 0), S.H([[14, -6], [14, 6], [25, 0]]), S.L(25, -6, 25, 6), S.L(25, 0, 40, 0), S.L(20, 8, 26, 14), S.L(24, 6, 30, 12), S.H([[26, 14], [23, 13], [25, 11]]), S.H([[30, 12], [27, 11], [29, 9]])] },
  { id: 'gnd', cat: 'Electrical', name: 'Ground', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 0, -10), S.L(-10, -10, 10, -10), S.L(-6, -14, 6, -14), S.L(-2, -18, 2, -18)] },
  { id: 'batt', cat: 'Electrical', name: 'Battery', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 17, 0), S.L(17, -9, 17, 9), S.L(23, -4, 23, 4), S.L(23, 0, 40, 0), S.T(12, 9, 4, '+')] },
  { id: 'fuse', cat: 'Electrical', name: 'Fuse', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 40, 0), S.R(10, -3, 20, 6)] },
  { id: 'cb', cat: 'Electrical', name: 'Circuit Breaker', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 12, 0), S.L(12, 0, 28, 8), S.L(28, 0, 40, 0), S.L(10, -2, 14, 2), S.L(10, 2, 14, -2)] },
  { id: 'no', cat: 'Electrical', name: 'Contact NO', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 14, 0), S.L(14, 0, 27, 7), S.L(28, 0, 40, 0)] },
  { id: 'nc', cat: 'Electrical', name: 'Contact NC', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 14, 0), S.L(14, 0, 29, -4), S.L(28, 0, 40, 0), S.L(28, 0, 28, -6)] },
  { id: 'motor', cat: 'Electrical', name: 'Motor', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 10, 0), S.C(20, 0, 10), S.T(20, 0, 8, 'M'), S.L(30, 0, 40, 0)] },
  { id: 'lamp', cat: 'Electrical', name: 'Lamp', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.L(0, 0, 12, 0), S.C(20, 0, 8), S.L(14.3, -5.7, 25.7, 5.7), S.L(14.3, 5.7, 25.7, -5.7), S.L(28, 0, 40, 0)] },
  { id: 'xfmr', cat: 'Electrical', name: 'Transformer', layer: 'E-SCHM', color: '#ffffff', gen: () => [S.C(14, 0, 9), S.C(26, 0, 9), S.L(0, 0, 5, 0), S.L(35, 0, 40, 0)] },
];

const TOOL_CATS = ['Architecture', 'Mechanical', 'Electrical'];
function ensureLayer(name, color, lt) {
  let l = App.doc.layers.find(x => x.name === name);
  if (!l) { l = { name, color: color || '#ffffff', on: true, locked: false, lt: lt || 'Continuous', lw: 0.25 }; App.doc.layers.push(l); UI.refreshLayers(); }
  return l;
}
function unitFactor() { return 1 / (UNITS_MM[App.doc.insUnits || 'mm'] || 1); }

// SVG thumbnail of generated geometry
function toolSVG(t) {
  let ents;
  try { ents = t.gen(Object.fromEntries((t.params || []).map(p => [p.k, p.def]))); } catch (_) { return ''; }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const paths = [], fills = [];
  for (const e of ents) {
    if (e.type === 'hatch') { fills.push(e.loops[0]); e.loops[0].forEach(p => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); }); continue; }
    for (const pl of entApprox(e)) { paths.push(pl); pl.forEach(p => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); }); }
  }
  const w = Math.max(x2 - x1, 1e-6), h = Math.max(y2 - y1, 1e-6), pad = Math.max(w, h) * 0.08;
  const T = (p) => `${fmt(p.x - x1 + pad, 2)},${fmt(y2 - p.y + pad, 2)}`;
  const sw = fmt(Math.max(w, h) / 45, 3);
  return `<svg viewBox="0 0 ${fmt(w + 2 * pad, 2)} ${fmt(h + 2 * pad, 2)}" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths.map(pl => `<polyline points="${pl.map(T).join(' ')}"/>`).join('')}${fills.map(l => `<polygon points="${l.map(T).join(' ')}" fill="currentColor" stroke="none"/>`).join('')}</g></svg>`;
}

async function insertTool(t) {
  const P = {};
  for (const pr of t.params || []) {
    App.toolParams = App.toolParams || {};
    const key = t.id + '.' + pr.k, def = App.toolParams[key] ?? pr.def;
    let v;
    if (pr.str) { v = (await getString(`${pr.label} <${def}>`)).trim() || def; }
    else { v = await getDist(`${pr.label} <${fmt(def)}>`, { def }); if (typeof v !== 'number' || v <= 0) return; }
    P[pr.k] = v; App.toolParams[key] = v;
  }
  const f = unitFactor();
  const ents = t.gen(P).map(e => entTransform(e, M.scale({ x: 0, y: 0 }, f)));
  const name = (t.layer.split('-')[0] + '-' + t.name).toUpperCase().replace(/[^A-Z0-9]+/g, '_') + ((t.params || []).length ? '_' + (t.params || []).map(p => String(P[p.k]).replace(/[^A-Za-z0-9.+-]/g, '')).join('x') : '');
  App.doc.blocks = App.doc.blocks || {};
  App.doc.blocks[name] = { base: { x: 0, y: 0 }, ents };
  App.doc.ents.forEach(e => { if (e.type === 'insert' && e.name === name) invalidate(e); });
  ensureLayer(t.layer, t.color);
  let ro = App.toolRot || 0, sc = 1;
  for (;;) {
    const p = await getPoint(`Specify insertion point for ${t.name} or [Rotate/Scale/Flip]`, { keywords: ['Rotate', 'Scale', 'Flip'], rubber: false, preview: (q) => [{ type: 'insert', name, p: q, sx: sc, sy: Math.abs(sc) * (App.toolFlip ? -1 : 1), rot: ro, layer: t.layer }] });
    if (p === 'Rotate') { const v = await getAngle(`Specify rotation angle <${fmt(deg(ro))}>`, { def: ro }); if (typeof v === 'number') ro = App.toolRot = v; continue; }
    if (p === 'Scale') { const v = await getDist('Specify scale factor <1>', { def: 1 }); if (typeof v === 'number' && v) sc = v; continue; }
    if (p === 'Flip') { App.toolFlip = !App.toolFlip; continue; }
    if (!isPt(p)) return;
    addEnt({ type: 'insert', name, p, sx: sc, sy: Math.abs(sc) * (App.toolFlip ? -1 : 1), rot: ro, layer: t.layer });
  }
}

// ---------- discipline commands ----------
def('TOOLPALETTES', ['TP', 'ADCENTER', 'DC'], 'Tool palettes: architecture, mechanical, electrical symbols', async () => { UI.openTools(); }, { noUndo: true, noRepeat: true });

def('WALL', ['WA'], 'Draw double-line walls', async () => {
  App.wallT = App.wallT || 200 * unitFactor();
  ensureLayer('A-WALL', '#c0c0c0');
  let t = App.wallT;
  let p0 = await getPoint(`Specify start point or [Thickness] (thickness = ${fmt(t)})`, { keywords: ['Thickness'] });
  if (p0 === 'Thickness') { const v = await getDist(`Wall thickness <${fmt(t)}>`, { def: t }); if (typeof v === 'number' && v > 0) t = App.wallT = v; p0 = await getPoint('Specify start point'); }
  if (!isPt(p0)) return;
  const pts = [p0];
  const mk = (pp, closed) => {
    if (pp.length < 2) return [];
    const center = { type: 'pline', pts: pp, closed };
    const a = pp[0], b = pp[1], n = V.perp(V.norm(V.sub(b, a))), m = V.mid(a, b);
    const s1 = offsetEnt(center, t / 2, V.add(m, V.mul(n, t))), s2 = offsetEnt(center, t / 2, V.sub(m, V.mul(n, t)));
    const out = [s1, s2].filter(Boolean).map(x => ({ ...x, layer: 'A-WALL' }));
    if (!closed && s1 && s2) {
      out.push({ type: 'line', p1: s1.pts[0], p2: s2.pts[0], layer: 'A-WALL' });
      out.push({ type: 'line', p1: s1.pts[s1.pts.length - 1], p2: s2.pts[s2.pts.length - 1], layer: 'A-WALL' });
    }
    return out;
  };
  for (;;) {
    const p = await getPoint('Specify next point or [Close/Undo]', { base: pts[pts.length - 1], keywords: pts.length >= 3 ? ['Close', 'Undo'] : ['Undo'], preview: (q) => mk([...pts, q], false) });
    if (p === null) break;
    if (p === 'Undo') { if (pts.length > 1) pts.pop(); continue; }
    if (p === 'Close') { mk(pts, true).forEach(e => addEnt(e)); return; }
    pts.push(p);
  }
  mk(pts, false).forEach(e => addEnt(e));
});

def('WIRE', ['WI'], 'Draw an electrical wire (polyline on E-WIRE layer)', async () => {
  ensureLayer('E-WIRE', '#ff7f00');
  const p0 = await getPoint('Specify wire start point'); if (!isPt(p0)) return;
  const pts = [p0];
  for (;;) {
    const p = await getPoint('Specify next point or [Undo]', { base: pts[pts.length - 1], keywords: ['Undo'], preview: (q) => [{ type: 'pline', pts: [...pts, q], closed: false, layer: 'E-WIRE' }] });
    if (p === null) break;
    if (p === 'Undo') { if (pts.length > 1) pts.pop(); continue; }
    if (!isPt(p)) return;
    pts.push(p);
  }
  if (pts.length > 1) addEnt({ type: 'pline', pts, closed: false, layer: 'E-WIRE' });
});

def('CENTERMARK', ['CM'], 'Center mark on circles and arcs', async () => {
  ensureLayer('Center', '#ff0000', 'Center');
  for (;;) {
    const pk = await getEntity('Select circle or arc to add center mark or <exit>', { filter: e => e.type === 'circle' || e.type === 'arc' });
    if (!pk || typeof pk !== 'object') return;
    const { c, r } = pk.e, ext = r * 0.2 + px(4);
    addEnt({ type: 'line', p1: { x: c.x - r - ext, y: c.y }, p2: { x: c.x + r + ext, y: c.y }, layer: 'Center' });
    addEnt({ type: 'line', p1: { x: c.x, y: c.y - r - ext }, p2: { x: c.x, y: c.y + r + ext }, layer: 'Center' });
  }
});
def('CENTERLINE', ['CL'], 'Centerline between two lines', async () => {
  ensureLayer('Center', '#ff0000', 'Center');
  const a = await getEntity('Select first line', { filter: e => e.type === 'line' }); if (!a || typeof a !== 'object') return;
  App.sel.add(a.e.id); App.usedSel = true; App.dirty = true;
  const b = await getEntity('Select second line', { filter: e => e.type === 'line' && e !== a.e }); if (!b || typeof b !== 'object') return;
  const A = a.e, B = b.e;
  const flip = V.dot(V.sub(A.p2, A.p1), V.sub(B.p2, B.p1)) < 0;
  const b1 = flip ? B.p2 : B.p1, b2 = flip ? B.p1 : B.p2;
  const m1 = V.mid(A.p1, b1), m2 = V.mid(A.p2, b2), d = V.norm(V.sub(m2, m1)), ext = V.dist(m1, m2) * 0.06;
  addEnt({ type: 'line', p1: V.sub(m1, V.mul(d, ext)), p2: V.add(m2, V.mul(d, ext)), layer: 'Center' });
});

const GDT = { Position: '⌖', Flatness: '⏥', Straightness: '—', Circularity: '○', Cylindricity: '⌭', Perpendicularity: '⟂', Parallelism: '∥', Angularity: '∠', Concentricity: '◎', Symmetry: '⌯', Profile: '⌒', Runout: '↗' };
def('TOLERANCE', ['TOL'], 'Geometric tolerance (feature control frame)', async () => {
  const keys = Object.keys(GDT);
  const sym = await getKeyword(`Geometric characteristic [${keys.join('/')}] <Position>`, { keywords: keys, def: 'Position' });
  const tol = (await getString('Tolerance value (e.g. Ø0.05 or 0.02) <0.05>')).trim() || '0.05';
  const dat = (await getString('Datum references separated by spaces (e.g. A B C) <A>')).trim() || 'A';
  const h = App.doc.dimH, cells = [GDT[sym], tol, ...dat.split(/\s+/).filter(Boolean)];
  const build = (p) => {
    const out = []; let x = 0; const H = h * 2;
    for (const s of cells) {
      const w = Math.max(H, textWidth(s, h) + h * 1.2);
      out.push({ type: 'pline', pts: [{ x: p.x + x, y: p.y }, { x: p.x + x + w, y: p.y }, { x: p.x + x + w, y: p.y + H }, { x: p.x + x, y: p.y + H }], closed: true, layer: App.doc.cur });
      out.push({ type: 'text', p: { x: p.x + x + (w - textWidth(s, h)) / 2, y: p.y + (H - h) / 2 + h * 0.1 }, h, rot: 0, s, layer: App.doc.cur });
      x += w;
    }
    return out;
  };
  const p = await getPoint('Enter tolerance location', { rubber: false, preview: build }); if (!isPt(p)) return;
  build(p).forEach(e => { delete e.layer; addEnt(e); });
});
