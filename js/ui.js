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
  hatch: '<rect x="3" y="3" width="18" height="18"/><path d="M3 9 9 3M3 15 15 3M3 21 21 3M9 21l12-12M15 21l6-6"/>',
  paste: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',
  cut: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16 18 3M16 16 6 3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
};
Object.assign(ICONS, {
  line: '<path d="M4 20 20 4"/><rect class="b" x="2.5" y="18.5" width="3" height="3"/><rect class="b" x="18.5" y="2.5" width="3" height="3"/>',
  pline: '<path d="M3 19 8 8l6 7 7-11"/><circle class="fb" cx="8" cy="8" r="1.6"/><circle class="fb" cx="14" cy="15" r="1.6"/>',
  circle: '<circle cx="12" cy="12" r="8"/><path class="b" d="M12 12h8"/><circle class="fb" cx="12" cy="12" r="1.5"/>',
  arc: '<path d="M4 18a9 9 0 0 1 16 0"/><rect class="b" x="2.5" y="16.5" width="3" height="3"/><rect class="b" x="18.5" y="16.5" width="3" height="3"/><rect class="b" x="10.5" y="7.5" width="3" height="3"/>',
  rect: '<rect x="4" y="6" width="16" height="12"/><rect class="b" x="2.5" y="4.5" width="3" height="3"/><rect class="b" x="18.5" y="16.5" width="3" height="3"/>',
  move: '<path class="b" d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  copy: '<rect x="3" y="3" width="11" height="11"/><rect class="b" x="10" y="10" width="11" height="11"/>',
  stretch: '<path d="M3 20V9h8"/><path class="b" d="M11 9h10M18 6l3 3-3 3"/><rect class="y" x="8" y="5" width="7" height="9" stroke-dasharray="2 2"/>',
  rotate: '<rect x="7" y="7" width="10" height="10"/><path class="b" d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  mirror: '<path class="y" d="M12 2v20" stroke-dasharray="2 2"/><path d="M9 6 3 18h6z"/><path class="b" d="M15 6l6 12h-6z"/>',
  scale: '<rect x="3" y="11" width="10" height="10"/><path class="b" d="M13 11 21 3M15 3h6v6"/>',
  trim: '<path d="M3 12h18"/><path d="M12 3v18" stroke-dasharray="2 2"/><path class="r" d="M15 5l4 4M19 5l-4 4"/>',
  fillet: '<path d="M4 21V11"/><path d="M11 4h10"/><path class="b" d="M4 11a7 7 0 0 1 7-7"/>',
  array: '<rect x="3" y="3" width="5" height="5"/><rect class="b" x="10" y="3" width="5" height="5"/><rect class="b" x="17" y="3" width="4" height="5"/><rect class="b" x="3" y="10" width="5" height="5"/><rect class="b" x="10" y="10" width="5" height="5"/><rect class="b" x="3" y="17" width="5" height="4"/>',
  erase: '<path class="r" d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  explode: '<path class="y" d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
  offset: '<path d="M4 18C8 8 16 8 20 4"/><path class="b" d="M4 22C9 12 17 12 21 9"/>',
  break: '<path d="M2 12h8M14 12h8"/><path class="r" d="M10 7v10M14 7v10"/>',
  join: '<path d="M2 12h9M13 12h9"/><circle class="fb" cx="12" cy="12" r="2.2"/>',
  breakpt: '<path d="M2 12h20"/><path class="r" d="M12 6v12"/>',
  text: '<path d="M5 21 12 3l7 18M8 14h8"/>',
  dimlin: '<path d="M4 6v14M20 6v14"/><path class="b" d="M4 13h16M7 11l-3 2 3 2M17 11l3 2-3 2"/>',
  layers: '<path class="y" d="M12 3 2 8l10 5 10-5z"/><path d="M2 12l10 5 10-5M2 16l10 5 10-5"/>',
  match: '<path d="M4 20l6-6"/><path class="y" d="M14 4l6 6-8 8-6-6z"/>',
  insert: '<rect x="3" y="9" width="12" height="12"/><path class="b" d="M14 3h7v7M21 3l-9 9"/>',
  blockc: '<rect x="3" y="3" width="18" height="18" stroke-dasharray="3 2"/><rect class="b" x="7" y="7" width="10" height="10"/><circle class="fb" cx="7" cy="17" r="1.6"/>',
  paste: '<rect class="y" x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',
  hatch: '<rect x="3" y="3" width="18" height="18"/><path class="b" d="M3 9 9 3M3 15 15 3M3 21 21 3M9 21l12-12M15 21l6-6"/>',
  dist: '<path class="y" d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  leader: '<path d="M4 20 12 10h8"/><path class="fb" d="M4 20l1.5-5 3 2.5z"/><path class="b" d="M13 6h8"/>',
  dimrad: '<circle cx="10" cy="14" r="7"/><path class="b" d="M10 14l8-8M15 6h5v5"/>',
  dimdia: '<circle cx="12" cy="12" r="8"/><path class="b" d="M6 18 18 6"/>',
  dimang: '<path d="M4 20h16M4 20 16 6"/><path class="b" d="M12 20a8 8 0 0 0-2.5-6"/>',
  pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path class="r" d="M8 13h8M8 16h8M8 10h3"/>',
  pagesetup: '<rect x="4" y="3" width="16" height="18"/><rect class="b" x="7" y="6" width="10" height="8"/><path d="M7 17h10"/>',
  spline: '<path d="M3 18c3-12 7-12 9-6s6 6 9-6"/><circle class="fb" cx="3" cy="18" r="1.5"/><circle class="fb" cx="12" cy="12" r="1.5"/><circle class="fb" cx="21" cy="6" r="1.5"/>',
  table: '<rect x="3" y="4" width="18" height="16"/><path class="b" d="M3 9h18"/><path d="M3 14h18M9 9v11M15 9v11"/>',
  extrude: '<path d="M4 17l8 4 8-4-8-4z"/><path class="b" d="M4 17V8l8-4 8 4v9M12 13V4"/>',
  orbit: '<ellipse cx="12" cy="12" rx="9" ry="4"/><path class="b" d="M12 3v18"/><path class="b" d="M19 8l2 4-4 0"/>',
  shaded: '<path class="fb" d="M12 3 4 7v10l8 4z" opacity=".55"/><path d="M12 3l8 4v10l-8 4-8-4V7zM12 11v10M4 7l8 4 8-4"/>',
  autocon: '<path d="M4 20V4h16"/><rect class="b" x="2.5" y="2.5" width="3" height="3"/><path class="y" d="M10 14l3 3 6-7"/>',
  gccoin: '<path d="M3 21 12 12M12 12l9-3"/><rect class="b" x="10" y="10" width="4" height="4"/>',
  gchor: '<path d="M3 12h18"/><path class="b" d="M7 6h10"/>',
  gcver: '<path d="M12 3v18"/><path class="b" d="M6 7v10"/>',
  gcpar: '<path d="M4 18 14 4M10 20 20 6"/>',
  gcperp: '<path d="M4 20h16M12 20V4"/><path class="b" d="M12 16h4v4"/>',
  gceq: '<path class="b" d="M5 9h14M5 15h14"/>',
  st_otrack: '<rect x="3" y="14" width="6" height="6"/><path d="M9 17h12M6 14V3" stroke-dasharray="2 2"/>',
  palette: '<rect x="3" y="3" width="8" height="8"/><rect class="b" x="13" y="3" width="8" height="8"/><rect class="b" x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
  door: '<path d="M4 20V4"/><path class="b" d="M4 4a16 16 0 0 1 16 16"/><path d="M4 20h16"/>',
  window: '<rect x="2" y="9" width="20" height="6"/><path class="b" d="M2 11.5h20M2 12.5h20"/>',
  stair: '<rect x="5" y="2" width="14" height="20"/><path d="M5 6h14M5 10h14M5 14h14M5 18h14"/><path class="b" d="M12 20V4M10 6l2-2 2 2"/>',
  gnd: '<path d="M12 3v9M5 12h14M8 16h8M11 20h2"/>',
  box3: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path class="b" d="M4 8l8 4 8-4M12 12v9"/>',
  cyl3: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12M19 6v12"/><path class="b" d="M5 18a7 2.5 0 0 0 14 0"/>',
  cone3: '<path d="M12 3 5 18M12 3l7 15"/><path class="b" d="M5 18a7 2.5 0 0 0 14 0"/><path d="M5 18a7 2.5 0 0 1 14 0" stroke-dasharray="2 2"/>',
  sph3: '<circle cx="12" cy="12" r="8"/><path class="b" d="M4 12a8 3 0 0 0 16 0"/><path d="M12 4a3 8 0 0 0 0 16" stroke-dasharray="2 2"/>',
  pyr3: '<path d="M12 3 4 17l8 4 8-4z"/><path class="b" d="M12 3v18"/>',
  wedge3: '<path d="M4 18l8 3 8-3-16-11z"/><path class="b" d="M4 7v11M12 21v0"/>',
  torus3: '<ellipse cx="12" cy="12" rx="9" ry="5"/><ellipse class="b" cx="12" cy="11.5" rx="4" ry="1.8"/>',
  union3: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/><path class="fb" d="M12 7a6 6 0 0 1 0 10a6 6 0 0 1 0-10z" opacity=".5"/>',
  subtract3: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6" stroke-dasharray="2 2"/><path class="r" d="M18 5l3 3M21 5l-3 3"/>',
  intersect3: '<circle cx="9" cy="12" r="6" stroke-dasharray="2 2"/><circle cx="15" cy="12" r="6" stroke-dasharray="2 2"/><path class="fb" d="M12 7a6 6 0 0 1 0 10a6 6 0 0 1 0-10z"/>',
  slice3: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path class="r" d="M3 15 21 9"/>',
  revolve3: '<path d="M6 4v16"/><path class="b" d="M9 6h5v12H9"/><path d="M18 8a9 4 0 0 1 0 8" stroke-dasharray="2 2"/>',
  move3: '<path class="b" d="M12 3v10M12 13l-7 5M12 13l7 5M12 3l-2 3M12 3l2 3"/>',
  rot3: '<path d="M4 12a8 4 0 1 0 16 0a8 4 0 1 0-16 0"/><path class="b" d="M12 3v18"/>',
  views3: '<rect x="5" y="5" width="14" height="14"/><path class="b" d="M5 5l4-3h14l-4 3M19 19l4-3V2"/>',
  vstyle: '<circle cx="12" cy="12" r="8"/><path class="fb" d="M12 4a8 8 0 0 1 0 16z"/>',
  st_grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
  st_snap: '<g fill="currentColor" stroke="none"><circle cx="5" cy="5" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></g>',
  st_ortho: '<path d="M5 3v16h16"/>',
  st_polar: '<circle cx="12" cy="12" r="8" stroke-dasharray="2 2"/><path d="M12 12 20 4M12 12h9"/>',
  st_osnap: '<rect x="6" y="6" width="12" height="12"/><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/>',
  st_dyn: '<rect x="3" y="7" width="12" height="9"/><path d="M15 12h6M18 9v6"/>',
  st_lwt: '<path d="M3 6h18" stroke-width="1"/><path d="M3 12h18" stroke-width="2.4"/><path d="M3 18h18" stroke-width="4"/>',
  st_props: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  wrench: '<path d="M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5a4 4 0 0 0-2-2z"/>',
  bulbOn: '<path class="fy" d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z"/><path d="M9.5 20h5"/>',
  bulbOff: '<path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z" opacity=".55"/><path d="M9.5 20h5" opacity=".55"/>',
  lockOn: '<rect class="fy" x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  lockOff: '<rect x="5" y="11" width="14" height="10" opacity=".7"/><path d="M8 11V7a4 4 0 0 1 7.5-2" opacity=".7"/>',
  laymcur: '<path class="y" d="M12 3 2 8l10 5 10-5z"/><path class="b" d="M5 18l3 3 6-6"/>',
  layoff: '<path class="y" d="M12 3 2 8l10 5 10-5z"/><path class="r" d="M15 15l6 6M21 15l-6 6"/>',
  layiso: '<path class="y" d="M12 3 2 8l10 5 10-5z"/><circle class="b" cx="17" cy="18" r="3.5"/>',
  layon: '<path class="y" d="M12 3 2 8l10 5 10-5z"/><path class="b" d="M14 18h7M17.5 14.5v7"/>',
});
const icon = (k) => `<svg class="ic" viewBox="0 0 24 24">${ICONS[k] || ''}</svg>`;

const RIBBON = {
  Home: [
    { label: 'Draw', items: [['LINE', 'Line', 'line'], ['PLINE', 'Polyline', 'pline'],
      ['CIRCLE', 'Circle', 'circle', [['Center, Radius', 'CIRCLE'], ['2-Point', 'CIRCLE', ['2P']], ['3-Point', 'CIRCLE', ['3P']]]],
      ['ARC', 'Arc', 'arc', [['3-Point', 'ARC'], ['Center, Start, End', 'ARC', ['Center']]]],
      { col: [['RECTANG', 'Rectangle', 'rect', [['Rectangle', 'RECTANG'], ['Polygon', 'POLYGON']]], ['ELLIPSE', 'Ellipse', 'ellipse'], ['HATCH', 'Hatch', 'hatch']] }],
      more: [['SPLINE', 'Spline', 'spline'], ['POLYGON', 'Polygon', 'polygon'], ['XLINE', 'Construction Line', 'line'], ['RAY', 'Ray', 'line'], ['POINT', 'Multiple Points', 'id'], ['DIVIDE', 'Divide', 'id'], ['MEASURE', 'Measure', 'id'], ['DONUT', 'Donut', 'circle'], ['REVCLOUD', 'Revision Cloud', 'rect'], ['BOUNDARY', 'Boundary', 'rect'], ['EXTRUDE', 'Extrude (3D)', 'extrude']] },
    { label: 'Modify', items: [
      { col: [['MOVE', 'Move', 'move'], ['COPY', 'Copy', 'copy'], ['STRETCH', 'Stretch', 'stretch']] },
      { col: [['ROTATE', 'Rotate', 'rotate'], ['MIRROR', 'Mirror', 'mirror'], ['SCALE', 'Scale', 'scale']] },
      { col: [['TRIM', 'Trim', 'trim', [['Trim', 'TRIM'], ['Extend', 'EXTEND']]], ['FILLET', 'Fillet', 'fillet', [['Fillet', 'FILLET'], ['Chamfer', 'CHAMFER']]], ['ARRAYRECT', 'Array', 'array', [['Rectangular Array', 'ARRAYRECT'], ['Polar Array', 'ARRAYPOLAR']]]] },
      { col: [['ERASE', 'Erase', 'erase'], ['EXPLODE', 'Explode', 'explode'], ['OFFSET', 'Offset', 'offset']] }],
      more: [['BREAK', 'Break', 'break'], ['BREAKATPOINT', 'Break at Point', 'breakpt'], ['JOIN', 'Join', 'join'], ['CHAMFER', 'Chamfer', 'fillet'], ['EXTEND', 'Extend', 'extend'], ['LENGTHEN', 'Lengthen', 'scale'], ['ALIGN', 'Align', 'move'], ['PEDIT', 'Edit Polyline', 'pline'], ['ARRAYPOLAR', 'Polar Array', 'arrayp'], ['MATCHPROP', 'Match Properties', 'match'], ['OVERKILL', 'Delete Duplicates', 'join']] },
    { label: 'Annotation', items: [['MTEXT', 'Text', 'text', [['Multiline Text', 'MTEXT'], ['Single Line', 'TEXT']]], ['DIMLINEAR', 'Dimension', 'dimlin', [['Linear', 'DIMLINEAR'], ['Aligned', 'DIMALIGNED'], ['Angular', 'DIMANGULAR'], ['Radius', 'DIMRADIUS'], ['Diameter', 'DIMDIAMETER'], ['Continue', 'DIMCONTINUE'], ['Baseline', 'DIMBASELINE'], ['Dimension Style...', 'DIMSTYLE']]], { col: [['LEADER', 'Leader', 'leader'], ['TABLE', 'Table', 'table'], ['DIMANGULAR', 'Angular', 'dimang']] }] },
    { label: 'Layers', items: [['LAYER', 'Layer Properties', 'layers'], { layerctl: true }] },
    { label: 'Block', items: [['INSERT', 'Insert', 'insert'], { col: [['BLOCK', 'Create', 'blockc'], ['EXPLODE', 'Explode', 'explode']] }] },
    { label: 'Properties', items: [['MATCHPROP', 'Match Properties', 'match'], { colorctl: true }] },
    { label: 'Groups', items: [['GROUP', 'Group', 'blockc']], more: [['UNGROUP', 'Ungroup', 'explode'], ['SELECTSIMILAR', 'Select Similar', 'selall'], ['QSELECT', 'Quick Select', 'list']] },
    { label: 'Utilities', items: [['DIST', 'Measure', 'dist', [['Distance', 'DIST'], ['Area', 'AREA'], ['ID Point', 'ID'], ['List', 'LIST'], ['Divide', 'DIVIDE'], ['Measure (points)', 'MEASURE']]], ], more: [['POINT', 'Point', 'id'], ['DDPTYPE', 'Point Style', 'id'], ['QSELECT', 'Quick Select', 'list'], ['UNITS', 'Units', 'dist'], ['PURGE', 'Purge', 'erase']] },
    { label: 'Clipboard', items: [['PASTECLIP', 'Paste', 'paste'], { col: [['COPYCLIP', 'Copy Clip', 'copy'], ['CUTCLIP', 'Cut', 'erase']] }] },
    { label: 'View', items: [['ZOOM_EXT', 'Extents', 'zoomext']] },
  ],
  Insert: [
    { label: 'Block', items: [['INSERT', 'Insert', 'insert'], ['BLOCK', 'Create Block', 'blockc']] },
    { label: 'Import', items: [['OPEN', 'Open DWG/DXF', 'open'], ['PASTECLIP', 'Paste', 'paste']] },
  ],
  Annotate: [
    { label: 'Text', items: [['MTEXT', 'Multiline Text', 'text'], { col: [['TEXT', 'Single Line', 'text'], ['TEXTEDIT', 'Edit Text', 'match']] }] },
    { label: 'Tables', items: [['TABLE', 'Table', 'table']] },
    { label: 'Hatch', items: [['HATCH', 'Hatch', 'hatch']] },
    { label: 'Linetypes', items: [['LINETYPE', 'Linetypes', 'list'], ['LTSCALE', 'LT Scale', 'scale'], ['LWDISPLAY', 'Show LWT', 'line']] },
    { label: 'Dimensions', items: [['DIMLINEAR', 'Linear', 'dimlin'], ['DIMALIGNED', 'Aligned', 'dimali'], { col: [['DIMANGULAR', 'Angular', 'dimang'], ['DIMRADIUS', 'Radius', 'dimrad'], ['DIMDIAMETER', 'Diameter', 'dimdia']] }] },
    { label: 'Leaders', items: [['LEADER', 'Leader', 'leader']] },
    { label: 'Inquiry', items: [['DIST', 'Distance', 'dist'], ['AREA', 'Area', 'area']] },
  ],
  View: [
    { label: 'Navigate', items: [['ZOOM_EXT', 'Extents', 'zoomext'], ['ZOOM', 'Window', 'zoomwin'], ['PAN', 'Pan', 'pan'], { col: [['ZOOM_IN', 'Zoom In', 'zoomin'], ['ZOOM_OUT', 'Zoom Out', 'zoomout']] }] },
    { label: 'Views', items: [['-VIEW', 'Views', 'views3', [['Top (plan)', '-VIEW', ['Top']], ['Front', '-VIEW', ['Front']], ['Left', '-VIEW', ['Left']], ['Right', '-VIEW', ['Right']], ['SW Isometric', '-VIEW', ['SWiso']], ['SE Isometric', '-VIEW', ['SEiso']], ['NE Isometric', '-VIEW', ['NEiso']], ['NW Isometric', '-VIEW', ['NWiso']]]], ['ORBIT', '3D Orbit', 'orbit'], ['PLAN', 'Top (2D)', 'zoomext'],
      ['VSCURRENT', 'Visual Styles', 'vstyle', [['2D Wireframe', 'VSCURRENT', ['2dwireframe']], ['Wireframe', 'VSCURRENT', ['Wireframe']], ['Hidden', 'VSCURRENT', ['Hidden']], ['Realistic', 'VSCURRENT', ['Realistic']], ['Conceptual', 'VSCURRENT', ['Conceptual']], ['Shaded', 'VSCURRENT', ['Shaded']], ['Shaded with Edges', 'VSCURRENT', ['shadedwithEdges']], ['X-ray', 'VSCURRENT', ['Xray']]]]] },
    { label: 'Palettes', items: [['PROPERTIES', 'Properties', 'props'], ['LAYER', 'Layers', 'layers'], ['TOGGLE_SIDE', 'Show/Hide', 'props']] },
  ],
  Architecture: [
    { label: 'Walls', items: [['WALL', 'Wall', 'rect']] },
    { label: 'Openings', items: [['TOOL:door', 'Door', 'door'], ['TOOL:door2', 'Double Door', 'door'], ['TOOL:window', 'Window', 'window'], { col: [['TOOL:slide', 'Sliding Door', 'door'], ['TOOL:stair', 'Stair', 'stair'], ['TOOL:column', 'Column', 'rect']] }] },
    { label: 'Furniture & Fixtures', items: [{ col: [['TOOL:bed2', 'Double Bed', 'rect'], ['TOOL:sofa', 'Sofa', 'rect'], ['TOOL:dining', 'Dining Table', 'table']] }, { col: [['TOOL:wc', 'WC', 'circle'], ['TOOL:basin', 'Basin', 'circle'], ['TOOL:bath', 'Bathtub', 'rect']] }, ['TOOLS_ARCH', 'All Symbols', 'palette']] },
    { label: 'Annotation', items: [{ col: [['TOOL:grid', 'Grid Bubble', 'circle'], ['TOOL:level', 'Level Mark', 'dimlin'], ['TOOL:north', 'North Arrow', 'leader']] }] },
  ],
  Mechanical: [
    { label: 'Centers', items: [['CENTERMARK', 'Center Mark', 'gccoin'], ['CENTERLINE', 'Centerline', 'gcpar']] },
    { label: 'GD&T', items: [['TOLERANCE', 'Tolerance', 'table'], { col: [['TOOL:datum', 'Datum', 'dimlin'], ['TOOL:surf', 'Surface Finish', 'leader'], ['TOOL:weld', 'Weld', 'leader']] }] },
    { label: 'Fasteners & Parts', items: [{ col: [['TOOL:bolt', 'Hex Bolt', 'rect'], ['TOOL:nut', 'Hex Nut', 'polygon'], ['TOOL:washer', 'Washer', 'circle']] }, { col: [['TOOL:bearing', 'Bearing', 'circle'], ['TOOL:gear', 'Spur Gear', 'circle'], ['TOOL:shaft', 'Shaft', 'circle']] }, ['TOOLS_MECH', 'All Symbols', 'palette']] },
    { label: 'Modify', items: [['CHAMFER', 'Chamfer', 'fillet'], ['FILLET', 'Fillet', 'fillet']] },
  ],
  Electrical: [
    { label: 'Wiring', items: [['WIRE', 'Wire', 'pline']] },
    { label: 'Power & Lighting', items: [{ col: [['TOOL:socket', 'Socket', 'circle'], ['TOOL:switch1', 'Switch', 'line'], ['TOOL:light', 'Light', 'circle']] }, { col: [['TOOL:db', 'Distribution Board', 'rect'], ['TOOL:fluor', 'Fluorescent', 'line'], ['TOOL:smoke', 'Smoke Detector', 'circle']] }] },
    { label: 'Schematic', items: [{ col: [['TOOL:res', 'Resistor', 'rect'], ['TOOL:cap', 'Capacitor', 'gcver'], ['TOOL:diode', 'Diode', 'polygon']] }, { col: [['TOOL:gnd', 'Ground', 'gnd'], ['TOOL:cb', 'Breaker', 'line'], ['TOOL:motor', 'Motor', 'circle']] }, ['TOOLS_ELEC', 'All Symbols', 'palette']] },
  ],
  Solid: [
    { label: 'Primitive', items: [['BOX', 'Box', 'box3', [['Box', 'BOX'], ['Cylinder', 'CYLINDER'], ['Cone', 'CONE'], ['Sphere', 'SPHERE'], ['Pyramid', 'PYRAMID'], ['Wedge', 'WEDGE'], ['Torus', 'TORUS']]], ['CYLINDER', 'Cylinder', 'cyl3'], { col: [['CONE', 'Cone', 'cone3'], ['SPHERE', 'Sphere', 'sph3'], ['PYRAMID', 'Pyramid', 'pyr3']] }, { col: [['WEDGE', 'Wedge', 'wedge3'], ['TORUS', 'Torus', 'torus3'], ['ELEV', 'Elevation', 'dist']] }] },
    { label: 'Solid', items: [['EXTRUDE', 'Extrude', 'extrude'], ['REVOLVE', 'Revolve', 'revolve3']] },
    { label: 'Boolean', items: [['UNION', 'Union', 'union3'], { col: [['SUBTRACT', 'Subtract', 'subtract3'], ['INTERSECT', 'Intersect', 'intersect3'], ['SLICE', 'Slice', 'slice3']] }] },
    { label: 'Modify 3D', items: [{ col: [['3DMOVE', '3D Move', 'move3'], ['ROTATE3D', '3D Rotate', 'rot3'], ['MIRROR', 'Mirror', 'mirror']] }] },
    { label: 'View', items: [['-VIEW', 'Views', 'views3', [['Top (plan)', '-VIEW', ['Top']], ['Front', '-VIEW', ['Front']], ['Back', '-VIEW', ['Back']], ['Left', '-VIEW', ['Left']], ['Right', '-VIEW', ['Right']], ['Bottom', '-VIEW', ['Bottom']], ['SW Isometric', '-VIEW', ['SWiso']], ['SE Isometric', '-VIEW', ['SEiso']], ['NE Isometric', '-VIEW', ['NEiso']], ['NW Isometric', '-VIEW', ['NWiso']]]],
      ['VSCURRENT', 'Visual Styles', 'vstyle', [['2D Wireframe', 'VSCURRENT', ['2dwireframe']], ['Wireframe', 'VSCURRENT', ['Wireframe']], ['Hidden', 'VSCURRENT', ['Hidden']], ['Realistic', 'VSCURRENT', ['Realistic']], ['Conceptual', 'VSCURRENT', ['Conceptual']], ['Shaded', 'VSCURRENT', ['Shaded']], ['Shaded with Edges', 'VSCURRENT', ['shadedwithEdges']], ['X-ray', 'VSCURRENT', ['Xray']]]],
      ['ORBIT', 'Orbit', 'orbit']] },
  ],
  Parametric: [
    { label: 'Geometric', items: [['AUTOCONSTRAIN', 'Auto Constrain', 'autocon'], { col: [['GCCOINCIDENT', 'Coincident', 'gccoin'], ['GCHORIZONTAL', 'Horizontal', 'gchor'], ['GCVERTICAL', 'Vertical', 'gcver']] }, { col: [['GCPARALLEL', 'Parallel', 'gcpar'], ['GCPERPENDICULAR', 'Perpendicular', 'gcperp'], ['GCEQUAL', 'Equal', 'gceq']] }, { col: [['GCFIX', 'Fix', 'lockOn'], ['CONSTRAINTBAR', 'Show/Hide', 'props']] }] },
    { label: 'Dimensional', items: [['DCLINEAR', 'Length', 'dimlin']] },
    { label: 'Manage', items: [['DELCON', 'Delete Constraints', 'erase']] },
  ],
  Manage: [
    { label: 'Actions', items: [['UNDO', 'Undo', 'undo'], ['REDO', 'Redo', 'redo'], ['SELECTALL', 'Select All', 'selall']] },
    { label: 'Customization', items: [['APPLOAD', 'Load Application', 'open'], ['OPTIONS', 'Options', 'props'], ['TOOLPALETTES', 'Tool Palettes', 'palette']] },
    { label: 'Cleanup', items: [['PURGE', 'Purge', 'erase'], ['OVERKILL', 'Overkill', 'join']] },
    { label: 'Drawing', items: [['UNITS', 'Units', 'dist'], ['DIMSTYLE', 'Dim Style', 'dimlin'], ['DDPTYPE', 'Point Style', 'id']] },
    { label: 'Help', items: [['HELP', 'Commands', 'help']] },
  ],
  Output: [
    { label: 'File', items: [['NEW', 'New', 'new'], ['OPEN', 'Open', 'open'], ['SAVE', 'Save', 'save']] },
    { label: 'Plot', items: [['PLOT', 'Plot PDF', 'pdf'], ['PAGESETUP', 'Page Setup', 'pagesetup']] },
    { label: 'Export', items: [['DXFOUT', 'DXF', 'export'], ['SVGOUT', 'SVG', 'svg'], ['PNGOUT', 'PNG Image', 'png']] },
  ],
};

const COLORS = [['ByLayer', ''], ['Red', '#ff0000'], ['Yellow', '#ffff00'], ['Green', '#00ff00'], ['Cyan', '#00ffff'], ['Blue', '#0000ff'], ['Magenta', '#ff00ff'], ['White', '#ffffff'], ['Gray', '#808080'], ['Orange', '#ff7f00']];

const ltOptions = (cur, byLayer) => (byLayer ? `<option value="" ${!cur ? 'selected' : ''}>ByLayer</option>` : '') + Object.keys(LTYPES).map(k => `<option value="${k}" ${cur === k ? 'selected' : ''}>${k}</option>`).join('');
const lwLabel = (w) => w === 0 ? '0.00 mm' : w.toFixed(2) + ' mm';
const lwOptions = (cur, byLayer) => (byLayer ? `<option value="" ${cur === undefined ? 'selected' : ''}>ByLayer</option>` : '') + LWEIGHTS.map(w => `<option value="${w}" ${cur === w ? 'selected' : ''}>${lwLabel(w)}</option>`).join('');
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
      const gm = ev.target.closest('.glabel.hasmore');
      if (gm) { ev.stopPropagation(); this.popup(gm, JSON.parse(gm.dataset.more).map(([cmd, label, ic]) => ({ label, cmd, icon: ic, hint: (Commands[cmd] && Commands[cmd].alias[0]) || '' }))); return; }
      const dd = ev.target.closest('.dd');
      if (dd) { ev.stopPropagation(); const m = JSON.parse(dd.dataset.menu); this.popup(dd, m.map(([label, cmd, kws]) => ({ label, cmd, kws, icon: null }))); return; }
      if (ev.target.closest('.logo')) { ev.stopPropagation(); this.appMenu(ev.target.closest('.logo')); return; }
      if (ev.target.closest('#clRecent')) { ev.stopPropagation(); this.recentMenu(ev.target.closest('#clRecent')); return; }
      if (ev.target.closest('#clHist')) { this.showHistory(); return; }
      if (!ev.target.closest('.popmenu')) this.closePopup();
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
        const n = lt.dataset.layout;
        if (n === '+') runCommand('LAYOUT'); else switchSpace(n);
      }
      const sg = ev.target.closest('#suggest div');
      if (sg) { $('cmdinput').value = ''; this.hideSuggest(); runCommand(sg.dataset.name); }
    });
    $('helpClose').onclick = () => { $('helpModal').hidden = true; };
    $('helpModal').onclick = (e) => { if (e.target.id === 'helpModal') $('helpModal').hidden = true; };
    this.bindKeys();
    this.buildOsnapMenu();
    const sb = $('search');
    const matches = () => {
      const v = sb.value.trim().toUpperCase(); if (!v) return [];
      return Object.keys(Commands).filter(k => k.includes(v) || (Commands[k].alias || []).includes(v) || Commands[k].desc.toUpperCase().includes(v)).slice(0, 10);
    };
    sb.addEventListener('input', () => {
      const m = matches();
      if (!m.length) { this.closePopup(); return; }
      this.popup(sb, m.map(k => ({ label: `${k} — ${Commands[k].desc}`, cmd: k, hint: (Commands[k].alias || [])[0] || '' })));
      sb.focus();
    });
    sb.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { const m = matches(); this.closePopup(); sb.value = ''; sb.blur(); if (m[0]) runCommand(m[0]); }
    });
    // drag & drop files
    const vp = $('viewport');
    vp.addEventListener('dragover', (e) => { e.preventDefault(); });
    vp.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { if (/\.lsp$/i.test(f.name)) lispLoadFile(f); else IO.loadFile(f); } });
    window.addEventListener('beforeunload', (e) => { if (App.modified) { e.preventDefault(); e.returnValue = ''; } });
    this.refreshAll();
  },

  exec(cmd) {
    switch (cmd) {
      case 'ZOOM_EXT': if (App.v3d) { exit3D(); return; } zoomExtents(); return;
      case 'ZOOM_IN': zoomAt({ x: CW / 2, y: CH / 2 }, 1.5); return;
      case 'ZOOM_OUT': zoomAt({ x: CW / 2, y: CH / 2 }, 1 / 1.5); return;
      case 'TOGGLE_SIDE': this.toggleSide(); return;
      case 'TOOLS_ARCH': this.openTools('Architecture'); return;
      case 'TOOLS_MECH': this.openTools('Mechanical'); return;
      case 'TOOLS_ELEC': this.openTools('Electrical'); return;
      case 'CANCEL': cancelReq(); $('cmdinput').value = ''; this.updateDyn(); return;
      default:
        if (cmd.startsWith('TOOL:')) { const t = TOOLS.find(x => x.id === cmd.slice(5)); if (t) runCommand(() => insertTool(t)); return; }
        runCommand(cmd);
    }
  },

  buildRibbon() {
    const tabs = $('ribbonTabs');
    tabs.innerHTML = Object.keys(RIBBON).map(t => `<button class="${t === this.tab ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('');
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; this.buildRibbon(); });
    const btn = ([c, l, i, menu], small) => {
      const dd = menu ? `<span class="dd" title="More options" data-menu="${esc(JSON.stringify(menu))}">&#9662;</span>` : '';
      return `<div class="rb${small ? ' small' : ''}"><button class="rbtn${small ? ' small' : ''}" data-cmd="${c}" title="${esc(l)}${Commands[c] ? ' (' + c + ')' : ''}">${icon(i)}<span>${esc(l)}</span></button>${dd}</div>`;
    };
    $('ribbonPanels').innerHTML = RIBBON[this.tab].map(g => `<div class="rgroup"><div class="items">${g.items.map(it => {
      if (Array.isArray(it)) return btn(it);
      if (it.col) return `<div class="smallcol">${it.col.map(x => btn(x, true)).join('')}</div>`;
      if (it.colorctl) return `<div class="layerctl"><select id="ribbonColor" title="Color for new objects">${COLORS.map(([n, c]) => `<option value="${c}">${n}</option>`).join('')}</select><select id="ribbonLt" title="Linetype for new objects">${ltOptions(App.doc.curLt, true)}</select><select id="ribbonLw" title="Lineweight for new objects">${lwOptions(App.doc.curLw, true)}</select></div>`;
      if (it.layerctl) return `<div class="layerctl"><button class="ldrop" id="layerDrop" title="Layer control"></button><div class="licons">${[['LAYMCUR', 'laymcur', 'Make object\'s layer current'], ['LAYOFF', 'layoff', 'Turn object\'s layer off'], ['LAYISO', 'layiso', 'Isolate object\'s layer'], ['LAYON', 'layon', 'Turn all layers on'], ['LAYLCK', 'lockOn', 'Lock object\'s layer'], ['LAYULK', 'lockOff', 'Unlock object\'s layer']].map(([c, i, t]) => `<button class="rbtn small" data-cmd="${c}" title="${t} (${c})">${icon(i)}</button>`).join('')}</div></div>`;
      return '';
    }).join('')}</div><div class="glabel${g.more ? ' hasmore' : ''}" ${g.more ? `data-more="${esc(JSON.stringify(g.more))}" title="More ${esc(g.label)} tools"` : ''}>${g.label}</div></div>`).join('');
    const ld = $('layerDrop');
    if (ld) ld.onclick = (ev) => { ev.stopPropagation(); this.layerPopup(ld); };
    const applyProp = (key, val) => { const s = selEnts(); this.change(() => { if (s.length) s.forEach(e => { if (val === undefined) delete e[key]; else e[key] = val; }); else App.doc['cur' + key[0].toUpperCase() + key.slice(1)] = val; }); };
    const rlt = $('ribbonLt'); if (rlt) rlt.onchange = () => { applyProp('lt', rlt.value || undefined); rlt.blur(); };
    const rlw = $('ribbonLw'); if (rlw) rlw.onchange = () => { applyProp('lw', rlw.value === '' ? undefined : parseFloat(rlw.value)); rlw.blur(); };
    const rc = $('ribbonColor');
    if (rc) {
      rc.value = App.doc.curColor || '';
      rc.onchange = () => { const s = selEnts(); this.change(() => { if (s.length) s.forEach(e => { if (rc.value) e.color = rc.value; else delete e.color; }); else App.doc.curColor = rc.value || undefined; }); rc.blur(); };
    }
    this.refreshLayers();
  },

  layerRowHtml(l) {
    return `<span class="li" data-lt="on">${icon(l.on ? 'bulbOn' : 'bulbOff')}</span><span class="li" data-lt="lock">${icon(l.locked ? 'lockOn' : 'lockOff')}</span><span class="sw" style="background:${l.color}"></span><span class="lname">${esc(l.name)}</span>`;
  },
  layerPopup(anchor) {
    this.closePopup();
    const box = document.createElement('div');
    box.className = 'popmenu layerpop';
    const render = () => {
      box.innerHTML = App.doc.layers.map((l, i) => `<div class="lrow${l.name === App.doc.cur ? ' cur' : ''}" data-i="${i}">${this.layerRowHtml(l)}</div>`).join('');
    };
    render();
    box.onclick = (ev) => {
      ev.stopPropagation();
      const row = ev.target.closest('.lrow'); if (!row) return;
      const l = App.doc.layers[+row.dataset.i];
      const t = ev.target.closest('[data-lt]');
      if (t) { this.change(() => { if (t.dataset.lt === 'on') l.on = !l.on; else l.locked = !l.locked; }); render(); return; }
      const s = selEnts();
      this.change(() => { if (s.length) s.forEach(e => { e.layer = l.name; }); else App.doc.cur = l.name; });
      this.closePopup();
    };
    this.placePopup(box, anchor);
  },
  popup(anchor, items) {
    this.closePopup();
    const box = document.createElement('div');
    box.className = 'popmenu';
    box.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `<div class="mi" data-i="${i}">${it.icon ? icon(it.icon) : '<span class="noic"></span>'}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</div>`).join('');
    box.onclick = (ev) => {
      ev.stopPropagation();
      const mi = ev.target.closest('.mi'); if (!mi) return;
      const it = items[+mi.dataset.i];
      this.closePopup();
      if (it.fn) it.fn(); else this.runWith(it.cmd, it.kws);
    };
    this.placePopup(box, anchor);
  },
  placePopup(box, anchor) {
    document.body.appendChild(box);
    const r = anchor.getBoundingClientRect();
    const h = box.offsetHeight, w = box.offsetWidth;
    let top = r.bottom + 2; if (top + h > window.innerHeight - 4) top = Math.max(4, r.top - h - 2);
    box.style.top = top + 'px';
    box.style.left = Math.max(4, Math.min(r.left, window.innerWidth - w - 4)) + 'px';
    this._popup = box;
  },
  closePopup() { if (this._popup) { this._popup.remove(); this._popup = null; } },
  runWith(cmd, kws) {
    if (Commands[cmd] && kws && kws.length) runCommand(cmd, kws.slice()); else this.exec(cmd);
  },
  appMenu(anchor) {
    this.popup(anchor, [
      { label: 'New', cmd: 'NEW', icon: 'new', hint: 'Ctrl+N' }, { label: 'Open (DWG / DXF)...', cmd: 'OPEN', icon: 'open', hint: 'Ctrl+O' },
      { label: 'Save', cmd: 'SAVE', icon: 'save', hint: 'Ctrl+S' }, { label: 'Save As...', cmd: 'SAVE', icon: 'save' }, '-',
      { label: 'Export DXF', cmd: 'DXFOUT', icon: 'export' }, { label: 'Export SVG', cmd: 'SVGOUT', icon: 'svg' },
      { label: 'Plot (PDF)...', cmd: 'PLOT', icon: 'pdf', hint: 'Ctrl+P' }, { label: 'Page Setup...', cmd: 'PAGESETUP', icon: 'pagesetup' },
      { label: 'Export PNG image', cmd: 'PNGOUT', icon: 'png' }, '-',
      { label: 'Drawing Utilities: Select All', cmd: 'SELECTALL', icon: 'selall' }, { label: 'Commands & Help', cmd: 'HELP', icon: 'help', hint: 'F1' },
    ]);
  },
  recentMenu(anchor) {
    const items = this.recent.slice(-10).reverse().map(c => ({ label: c, cmd: c, hint: (Commands[c].alias || [])[0] || '' }));
    if (!items.length) items.push({ label: 'No recent commands', fn: () => {} });
    this.popup(anchor, items);
  },
  recent: [],
  contextMenu(x, y) {
    const anchor = { getBoundingClientRect: () => ({ left: x, right: x, top: y, bottom: y }) };
    const sel = App.sel.size > 0;
    const last = App.lastCmd;
    const items = [];
    if (last) items.push({ label: `Repeat ${last}`, cmd: last });
    if (this.recent.length) items.push({ label: 'Recent Input...', fn: () => this.recentMenu(anchor) });
    items.push('-');
    if (sel) {
      items.push({ label: 'Cut', cmd: 'CUTCLIP', icon: 'cut', hint: 'Ctrl+X' }, { label: 'Copy', cmd: 'COPYCLIP', icon: 'copy', hint: 'Ctrl+C' });
      if (App.clip) items.push({ label: 'Paste', cmd: 'PASTECLIP', icon: 'paste', hint: 'Ctrl+V' });
      items.push('-', { label: 'Erase', cmd: 'ERASE', icon: 'erase', hint: 'Del' }, { label: 'Move', cmd: 'MOVE', icon: 'move' }, { label: 'Copy Selection', cmd: 'COPY', icon: 'copy' },
        { label: 'Scale', cmd: 'SCALE', icon: 'scale' }, { label: 'Rotate', cmd: 'ROTATE', icon: 'rotate' }, '-',
        { label: 'Deselect All', fn: () => { App.sel.clear(); App.dirty = true; this.refreshProps(); } },
        { label: 'Select Similar', cmd: 'SELECTSIMILAR', icon: 'selall' }, { label: 'Group', cmd: 'GROUP', icon: 'blockc' }, '-',
        { label: 'Properties', fn: () => this.openPanel('props'), icon: 'props', hint: 'Ctrl+1' });
    } else {
      if (App.clip) items.push({ label: 'Paste', cmd: 'PASTECLIP', icon: 'paste', hint: 'Ctrl+V' }, '-');
      items.push({ label: 'Undo', cmd: 'UNDO', icon: 'undo', hint: 'Ctrl+Z' }, { label: 'Redo', cmd: 'REDO', icon: 'redo', hint: 'Ctrl+Y' }, '-',
        { label: 'Pan', cmd: 'PAN', icon: 'pan' }, { label: 'Zoom', cmd: 'ZOOM', icon: 'zoomwin' }, { label: 'Zoom Extents', cmd: 'ZOOM_EXT', icon: 'zoomext' }, '-',
        { label: 'Quick Select...', cmd: 'QSELECT', icon: 'list' }, { label: 'Select All', cmd: 'SELECTALL', icon: 'selall', hint: 'Ctrl+A' }, '-',
        { label: 'Properties', fn: () => this.openPanel('props'), icon: 'props', hint: 'Ctrl+1' });
    }
    while (items[0] === '-') items.shift();
    this.popup(anchor, items);
  },

  refresh3D() {
    $('viewport').classList.toggle('v3d', !!App.v3d);
    $('vplabel').innerHTML = App.v3d ? '' : '[-][<span data-cmd="ZOOM_EXT">Top</span>][2D Wireframe]';
  },
  refreshLayoutTabs() {
    const box = $('ltabs'); if (!box) return;
    const names = ['Model', ...layouts().map(l => l.name)];
    box.innerHTML = names.map(n => `<button class="lt${n === App.space ? ' active' : ''}" data-layout="${esc(n)}">${esc(n)}</button>`).join('') + '<button class="lt" data-layout="+" title="New layout">+</button>';
    box.querySelectorAll('[data-layout]').forEach(b => {
      if (b.dataset.layout === 'Model' || b.dataset.layout === '+') return;
      b.oncontextmenu = (ev) => {
        ev.preventDefault();
        const n = b.dataset.layout;
        switchSpace(n);
        this.popup(b, [
          { label: 'Page Setup Manager...', fn: () => this.pageSetup(), icon: 'pagesetup' },
          { label: 'Plot (PDF)...', cmd: 'PLOT', icon: 'pdf' }, '-',
          { label: 'New layout', cmd: 'LAYOUT' },
          { label: 'Delete layout', fn: () => this.deleteLayout(n), icon: 'erase' },
        ]);
      };
    });
    const paper = App.space !== 'Model';
    $('spaceLabel').textContent = paper && App.vpActive == null ? 'PAPER' : 'MODEL';
    $('viewport').classList.toggle('paper', paper);
    const bar = $('layoutbar');
    bar.hidden = !paper;
    if (paper) {
      const L = curLayout(), G = layoutGeom(L);
      const vi = App.vpActive != null ? App.vpActive : App.vpSel;
      const V0 = vi != null ? G.vps[vi] : null;
      const cur = V0 ? (L.vports && L.vports[vi] && L.vports[vi].scale) || 'Fit' : null;
      const scaleSel = V0 ? `<select id="vpScaleSel" title="Viewport scale">${(cur === 'custom' || (cur && !PLOT_SCALES.includes(cur)) ? `<option selected>${esc(V0.label)}</option>` : '')}${PLOT_SCALES.map(x => `<option ${x === cur ? 'selected' : ''}>${x}</option>`).join('')}</select>` : '';
      bar.innerHTML = `<span><b>${esc(L.name)}</b> · ${esc(L.paper)} ${L.orient === 'P' ? 'Portrait' : 'Landscape'}</span>` +
        (App.vpActive != null ? `<span class="vpstate">MODEL · Viewport ${vi + 1}</span>` : V0 ? `<span>Viewport ${vi + 1} selected</span>` : `<span>${G.vps.length} viewport(s)</span>`) +
        (V0 ? `<span>Scale ${scaleSel}</span>` : '') +
        (App.vpActive != null ? '<button class="btn" data-cmd="PSPACE">Paper</button>' : '<button class="btn" data-cmd="MVIEW">New Viewport</button>') +
        `<button class="btn" data-cmd="PAGESETUP">Page Setup</button><button class="btn pri" data-cmd="PLOT">Plot</button>`;
      const ss = document.getElementById('vpScaleSel');
      if (ss) ss.onchange = () => { if (PLOT_SCALES.includes(ss.value)) setVpScale(vi, ss.value); ss.blur(); };
    }
  },
  deleteLayout(n) {
    if (layouts().length <= 1) { this.log('A drawing needs at least one layout.', 'err'); return; }
    switchSpace('Model');
    this.change(() => { App.doc.layouts = layouts().filter(l => l.name !== n); });
    this.refreshLayoutTabs();
  },
  pageSetup() {
    let L = curLayout();
    if (!L) { L = layouts()[0]; switchSpace(L.name); }
    const G = layoutGeom(L);
    const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const t = L.title || {};
    $('psBody').innerHTML = `
      <div class="psgrid">
        <fieldset><legend>Layout</legend>
          <label>Name <input id="ps_name" value="${esc(L.name)}"></label>
          <label>Paper size <select id="ps_paper">${opt(Object.keys(PAPERS), L.paper)}</select></label>
          <label>Orientation <select id="ps_orient"><option value="L" ${L.orient !== 'P' ? 'selected' : ''}>Landscape</option><option value="P" ${L.orient === 'P' ? 'selected' : ''}>Portrait</option></select></label>
        </fieldset>
        <fieldset><legend>Plot scale</legend>
          <label>Scale <select id="ps_scale">${opt(PLOT_SCALES, L.scale)}</select></label>
          <label>Drawing units <select id="ps_units">${Object.keys(UNITS_MM).map(u => `<option value="${u}" ${u === L.units ? 'selected' : ''}>1 unit = 1 ${u}</option>`).join('')}</select></label>
          <label>View center <select id="ps_ctr"><option value="ext" ${!L.center ? 'selected' : ''}>Drawing extents</option><option value="xy" ${L.center ? 'selected' : ''}>Point X,Y</option></select></label>
          <label>X,Y <input id="ps_xy" value="${fmt(G.center.x)},${fmt(G.center.y)}"></label>
          <div class="muted" id="ps_info">Current: ${esc(G.scaleLabel)}</div>
        </fieldset>
        <fieldset class="wide"><legend>Title block</legend>
          <label>Drawing title <input id="ps_title" value="${esc(t.title || '')}"></label>
          <label>Project <input id="ps_project" value="${esc(t.project || '')}"></label>
          <label>Drawn by <input id="ps_drawn" value="${esc(t.drawnBy || '')}"></label>
          <label>Date <input id="ps_date" value="${esc(t.date || '')}"></label>
          <label>Sheet <input id="ps_sheet" value="${esc(t.sheet || '')}"></label>
        </fieldset>
      </div>
      <div class="btnrow" style="justify-content:flex-end"><button class="btn" id="ps_apply">Apply</button><button class="btn pri" id="ps_plot">Apply &amp; Plot PDF</button></div>`;
    const apply = () => {
      const nn = $('ps_name').value.trim() || L.name;
      if (nn !== L.name && (nn === 'Model' || layouts().some(l => l.name === nn))) { this.log(`Layout name "${nn}" is not available.`, 'err'); return false; }
      this.change(() => {
        const old = L.name;
        L.name = nn; L.paper = $('ps_paper').value; L.orient = $('ps_orient').value; L.scale = $('ps_scale').value; L.units = $('ps_units').value;
        if ($('ps_ctr').value === 'ext') L.center = null;
        else { const c = parseCoord($('ps_xy').value, null); if (c) L.center = c; }
        if (Array.isArray(L.vports) && L.vports[0]) { L.vports[0].scale = L.scale; L.vports[0].center = L.center; }
        L.title = { title: $('ps_title').value, project: $('ps_project').value, drawnBy: $('ps_drawn').value, date: $('ps_date').value, sheet: $('ps_sheet').value };
        if (App.space === old) { App.space = nn; if (App.views && App.views[old]) { App.views[nn] = App.views[old]; delete App.views[old]; } }
      });
      zoomPaper(); this.refreshLayoutTabs();
      return true;
    };
    $('ps_apply').onclick = () => { if (apply()) $('psModal').hidden = true; };
    $('ps_plot').onclick = () => { if (apply()) { $('psModal').hidden = true; plotLayoutPDF(curLayout()); } };
    $('psClose').onclick = () => { $('psModal').hidden = true; };
    $('psModal').hidden = false;
  },

  // perform an undoable change from the UI
  change(fn) {
    if (App.cmd) cancelReq();
    const before = snapshot();
    fn();
    if (App.doc.cons && App.doc.cons.length) solveConstraints();
    if (snapshot() !== before) pushUndo(before);
    App.dirty = true;
    this.refreshProps(); this.refreshLayers();
  },

  refreshAll() { this.refreshLayoutTabs(); this.refreshLayers(); this.refreshProps(); this.refreshStatus(); this.refreshTitle(); this.setPrompt('', null); },
  refreshTitle() { $('ftabName').textContent = App.fileName + (App.modified ? '*' : ''); $('doctitle').textContent = `${App.fileName}${App.modified ? ' *' : ''}  —  OpenDraft CAD`; document.title = `${App.fileName}${App.modified ? '*' : ''} - OpenDraft CAD`; },

  refreshStatus() {
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', !!App.modes[b.dataset.mode]));
    App.dirty = true;
  },
  toggleMode(m) {
    App.modes[m] = !App.modes[m];
    if (m === 'ortho' && App.modes.ortho) App.modes.polar = false;
    if (m === 'polar' && App.modes.polar) App.modes.ortho = false;
    const names = { grid: 'Grid', snap: 'Snap', ortho: 'Ortho', polar: 'Polar', osnap: 'Osnap', otrack: 'Object Snap Tracking', dyn: 'Dynamic input', lwt: 'Lineweight display', transp: 'Transparency display', selcyc: 'Selection cycling', qp: 'Quick Properties', cons: 'Constraint bars' };
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
    const pr = App.prec ?? 4;
    $('coords').textContent = `${p.x.toFixed(pr)}, ${p.y.toFixed(pr)}`;
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
        html += App.dynLock ? `<span class="v">${fmt(App.dynLock.len, 3)} &#128274;</span> &lt; <span class="v">${typed ? esc(typed) : fmt(A, 1)}</span>°`
          : `<span class="v">${typed ? esc(typed) : fmt(L, 3)}</span> &lt; ${fmt(A, 1)}°`;
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
      const pb = inp.value.trimStart().startsWith('(') ? parenBalance(inp.value) : null;
      if (ev.key === ' ' && pb && (pb.depth > 0 || pb.inString)) return; // typing a LISP expression
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
      if (ev.key === 'Tab' && App.req && App.req.kind === 'point' && App.req.base && App.modes.dyn) {
        ev.preventDefault();
        const n = parseNum(inp.value);
        if (n !== null && n > 0) { App.dynLock = { len: n }; inp.value = ''; updateEffective(); updatePreview(); App.dirty = true; this.updateDyn(); }
        else if (App.dynLock) { App.dynLock = null; this.updateDyn(); }
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
      const fk = { F1: () => this.showHelp(), F2: () => this.showHistory(), F3: () => this.toggleMode('osnap'), F7: () => this.toggleMode('grid'), F8: () => this.toggleMode('ortho'), F9: () => this.toggleMode('snap'), F10: () => this.toggleMode('polar'), F11: () => this.toggleMode('otrack'), F12: () => this.toggleMode('dyn') };
      if (fk[ev.key]) { ev.preventDefault(); fk[ev.key](); return; }
      if (ev.key === 'Escape') {
        if (!$('helpModal').hidden) { $('helpModal').hidden = true; return; }
        if (!$('psModal').hidden) { $('psModal').hidden = true; return; }
        if (inField) { t.blur(); return; }
        this.hideSuggest(); this.toggleOsnapMenu(false);
        if (inp.value) { inp.value = ''; this.updateDyn(); return; }
        if (App.req || App.cmd) { cancelReq(); return; }
        if (App.v3d) { exit3D(); return; }
        App.win = null; App.hotGrip = null; App.sel.clear(); App.dirty = true; this.refreshProps();
        return;
      }
      if (inField) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod) {
        const k = ev.key.toLowerCase();
        if (k === '1') { ev.preventDefault(); const sd = $('side'); if (sd.hidden || !sd.classList.contains('open') && window.innerWidth <= 760) this.openPanel('props'); else { sd.hidden = true; sd.classList.remove('open'); resize(); } return; }
        if (k === '3') { ev.preventDefault(); this.openTools(); return; }
        if (k === '9') { ev.preventDefault(); $('cmdline').hidden = !$('cmdline').hidden; return; }
        const map = { z: 'UNDO', y: 'REDO', s: 'SAVE', o: 'OPEN', a: 'SELECTALL', n: 'NEW', p: 'PLOT', c: 'COPYCLIP', v: 'PASTECLIP', x: 'CUTCLIP' };
        if (k === 'z' && ev.shiftKey) { ev.preventDefault(); runCommand('REDO'); return; }
        if (map[k] && !(isCmd && 'acvx'.includes(k) && inp.value)) { ev.preventDefault(); runCommand(map[k]); }
        return;
      }
      if (ev.key === 'Delete' && !App.cmd && App.space !== 'Model' && App.vpActive == null && App.vpSel != null) {
        ev.preventDefault(); const L = curLayout(); materializeVports(L); const i = App.vpSel; App.vpSel = null;
        this.change(() => { L.vports.splice(i, 1); }); this.refreshLayoutTabs(); this.log('Viewport deleted.'); return;
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
        <tr><td>Linetype scale</td><td><input data-g="ltscale" value="${fmt(App.doc.ltscale || 1)}"></td></tr>
        <tr><td>Polar increment</td><td><select data-g="polarInc">${[5, 10, 15, 22.5, 30, 45, 90].map(a => `<option ${a === App.polarInc ? 'selected' : ''}>${a}</option>`).join('')}</select></td></tr>
        <tr><td colspan="2" class="psec">Drawing</td></tr>
        <tr><td>Objects</td><td class="ro">${App.doc.ents.length}</td></tr>
      </table>`;
      body.querySelectorAll('[data-g]').forEach(el => el.onchange = () => {
        const k = el.dataset.g, v = el.value;
        if (k === 'cur') { this.change(() => { App.doc.cur = v; }); return; }
        const n = parseFloat(v); if (!(n > 0)) return;
        if (k === 'textH' || k === 'dimH' || k === 'ltscale') this.change(() => { App.doc[k] = n; });
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
    const lts = new Set(s.map(e => e.lt || '')), lws = new Set(s.map(e => e.lw === undefined ? '' : e.lw));
    const ltv = lts.size === 1 ? ([...lts][0] || undefined) : null, lwv = lws.size === 1 ? ([...lws][0] === '' ? undefined : [...lws][0]) : null;
    html += `<tr><td>Linetype</td><td><select data-p="lt">${ltv === null ? '<option selected>*VARIES*</option>' : ''}${ltOptions(ltv, true)}</select></td></tr>
      <tr><td>Linetype scale</td><td><input data-p="lts" value="${s.length === 1 ? fmt(s[0].lts || 1) : ''}"></td></tr>
      <tr><td>Lineweight</td><td><select data-p="lw">${lwv === null ? '<option selected>*VARIES*</option>' : ''}${lwOptions(lwv, true)}</select></td></tr>
      <tr><td>3D height (thickness)</td><td><input data-p="thick" value="${s.length === 1 ? fmt(s[0].thick || 0) : ''}"></td></tr>`;
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
    const slt = body.querySelector('[data-p=lt]');
    slt.onchange = () => this.change(() => s.forEach(e => { if (slt.value) e.lt = slt.value; else delete e.lt; }));
    const slw = body.querySelector('[data-p=lw]');
    slw.onchange = () => this.change(() => s.forEach(e => { if (slw.value === '') delete e.lw; else e.lw = parseFloat(slw.value); }));
    const slts = body.querySelector('[data-p=lts]');
    slts.onchange = () => { const n = parseFloat(slts.value); if (n > 0) this.change(() => s.forEach(e => { if (n === 1) delete e.lts; else e.lts = n; })); };
    const sth = body.querySelector('[data-p=thick]');
    sth.onchange = () => { const n = parseFloat(sth.value); if (n >= 0) this.change(() => s.forEach(e => { if (n) e.thick = n; else delete e.thick; })); };
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
    body.innerHTML = `<table class="ltable"><tr><th></th><th>Name</th><th>On</th><th>Lock</th><th>Color</th><th>Linetype</th><th>LW</th><th></th></tr>
      ${App.doc.layers.map((l, i) => `<tr class="${l.name === App.doc.cur ? 'cur' : ''}">
        <td><button data-l="cur" data-i="${i}" title="Set current">${l.name === App.doc.cur ? '✔' : '·'}</button></td>
        <td><input class="name" data-l="name" data-i="${i}" value="${esc(l.name)}" ${l.name === '0' ? 'readonly' : ''} title="${counts[l.name] || 0} object(s)"></td>
        <td><button data-l="on" data-i="${i}" title="On/Off">${l.on ? '●' : '○'}</button></td>
        <td><button data-l="lock" data-i="${i}" title="Lock/Unlock">${l.locked ? '🔒' : '🔓'}</button></td>
        <td><input type="color" data-l="color" data-i="${i}" value="${l.color}"></td>
        <td><select class="lsel" data-l="lt" data-i="${i}">${ltOptions(l.lt || 'Continuous', false)}</select></td>
        <td><select class="lsel" data-l="lw" data-i="${i}">${lwOptions(l.lw === undefined ? 0.25 : l.lw, false)}</select></td>
        <td><button data-l="del" data-i="${i}" title="Delete layer">✕</button></td></tr>`).join('')}
      </table><div class="btnrow"><button class="btn" id="newLayer">+ New layer</button><button class="btn" id="layerFromSel" title="Make the selected object's layer current">Match current</button></div>`;
    body.querySelectorAll('[data-l]').forEach(el => {
      const l = App.doc.layers[+el.dataset.i];
      const act = el.dataset.l;
      if (act === 'name') { el.onchange = () => this.renameLayer(l, el.value.trim()); el.onkeydown = (e) => { if (e.key === 'Enter') el.blur(); }; return; }
      if (act === 'color') { el.onchange = () => this.change(() => { l.color = el.value; }); return; }
      if (act === 'lt') { el.onchange = () => this.change(() => { l.lt = el.value; }); return; }
      if (act === 'lw') { el.onchange = () => this.change(() => { l.lw = parseFloat(el.value); }); return; }
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
      this.change(() => { App.doc.layers.push({ name: 'Layer' + n, color: palette[(n - 1) % palette.length], on: true, locked: false, lt: 'Continuous', lw: 0.25 }); });
    };
    $('layerFromSel').onclick = () => { const s = selEnts(); if (s.length) this.change(() => { App.doc.cur = s[0].layer; }); };
    const ld = $('layerDrop');
    if (ld) {
      const s = selEnts(); const ls = new Set(s.map(e => e.layer));
      const show = s.length ? (ls.size === 1 ? [...ls][0] : null) : App.doc.cur;
      const L = App.doc.layers.find(l => l.name === show);
      ld.innerHTML = L ? this.layerRowHtml(L) + '<span class="arr">&#9662;</span>' : '<span class="lname">*VARIES*</span><span class="arr">&#9662;</span>';
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
        <tr><td>Drag &amp; drop</td><td>Drop a .dwg, .dxf, .json or .lsp file onto the drawing area to open it</td></tr>
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
