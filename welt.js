// Realm of Many — Welt-Seite fuer Follower (Bio-Link). Erzeugt aus web/haeuser.js + /tmp/rb/welt_teil.js; Daten: daten.json (welt_bauen.py).
// Realm of Many — Haeuser-Katalog + Dorfprobe (16.10.2026). Basis: reel2.js (Stil Reel v2); nur Haeuser, keine Figuren/Story.
// ?typ=NAME (3 Varianten nebeneinander) | ?dorf=1. Gruppen: WOHNEN (Follower, je 1 Name), GETEILT (Doppelhaus 2, Langhaus 2-4 Namen), ARBEIT (nur Meilensteine/Wuensche) Stil: tagsueber Variante 2, abends Variante 5 (siehe PLAN-FEST.md).
// Gezeigt wird NUR, was es gibt: das Lagerfeuer und eine Person; der Rest der Welt liegt im Nebel.
// NUR Vorschau, kein Systemteil. Bausteine aus mix.js uebernommen. ?profil=1|2|3 fuer Profilbilder, sonst Reel (window.__setT(t)).
// Layout in Bildschirm-Koordinaten: u = rechts, w = nach hinten. Welt: x = u, z = -w.
addEventListener("error", e => window.__fehler = String(e.message)); addEventListener("unhandledrejection", e => window.__fehler = String(e.reason));
import * as THREE from "three";
const P = new URLSearchParams(location.search);
const CFG = { tex: true, weich: true, nurTag: P_NACHT(), tiere: P.get("tiere") !== "aus", kleidung: true };   // tiere/kleidung: eigene Releases (18.10. 22 Uhr)   // 18.10. 20:00 Anthony: "erstmal nur Tag im Live" — nurTag=false schaltet Tag/Nacht wieder ein
let scene, WEILER = false, NB, SPERRE = [], EMITTER = [], FENSTERLICHT = [], FENSTERMAT = [], FEUER = [], RAUCH = [], MENSCHEN = [], WOLKEN = [], SCHAFE = [], GLANZ = [];
let flussW, PFADE = [], PLATZ = [], hoeheFn;
let aufWeg = () => false, aufHauptweg = () => false;
function wegFrei(u, w, r = 1) { if (!aufWeg(u, w, 0) && !aufWeg(u + r, w, 0) && !aufWeg(u - r, w, 0) && !aufWeg(u, w + r, 0) && !aufWeg(u, w - r, 0)) return [u, w];   // 18.10. 22 Uhr: nie auf einem Weg
  for (let d = 1; d < 12; d += .5) for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, x = u + Math.cos(a) * d, y = w + Math.sin(a) * d;
    if (!aufWeg(x, y, 0) && !aufWeg(x + r, y, 0) && !aufWeg(x - r, y, 0) && !aufWeg(x, y + r, 0) && !aufWeg(x, y - r, 0) && Math.abs(y - flussW(x)) > 3.4) return [x, y]; } return [u, w]; }
function P_NACHT() { return new URLSearchParams(location.search).get("nacht") !== "an"; }   // ?nacht=an: Tag/Nacht zum Testen   // 18.10. abends: Wegenetz (wird nach dem Gelaende gesetzt)
const WASSER_Y = -.62;
const hoehe = (u, w) => hoeheFn(u, w);

// ---------------------------------------------------------------- Zufall + Rauschen
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = rng(1610);
const rr = (a, b) => a + (b - a) * R(), pick = a => a[Math.floor(R() * a.length)];
function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
function rausch(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = t => t * t * (3 - 2 * t);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf); }
const fbm = (x, y, o = 4) => { let v = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * rausch(x * f + i * 17, y * f - i * 9); n += a; a *= .5; f *= 2.03; } return v / n; };
const sst = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- Palette (Stronghold: Ocker, Moosgruen, Holzbraun, Stein)
const PAL = {
  gras: 0x76803e, gras2: 0x8a8a45, grasOcker: 0xa39553, grasDunkel: 0x5f6c34, erde: 0x9b7b4e, erdeDunkel: 0x7a5c39,
  acker: 0x6f4d2e, ackerHell: 0x86603a, weizen: 0xd4ae58, weizen2: 0xc39a45, kohl: 0x6f8f3e,
  holz: 0x7b5534, holzDunkel: 0x4b3322, putz: 0xe2d1a6, stroh: 0xc39b55, strohDunkel: 0x9c7840, schindel: 0x6e4d37,
  stein: 0x9d9686, steinDunkel: 0x77705f, laub: 0x5c7330, laub2: 0x758739, laub3: 0x928a3a, tanne: 0x3f5530, stamm: 0x5e4128,
  wasser: 0x5e8479, haut: 0xe0b48c, schaf: 0xe9e1cc, fels: 0x8f897b, felsHell: 0xcfc9bd, fenster: 0x2b1f15, heu: 0xd9b964,
};
// ==== SAISON (Quelle: web/saison_teil.js — gemeinsam fuer Welt-Seite und Reels; welt_bauen.py/reel_tag.py setzen diesen Block ein) ====
// Jahreszeit nach dem deutschen Kalender (Anthony 17.10.: Reels uebernehmen die Jahreszeit, nicht die Tageszeit).
// ?monat=1..12 erzwingt einen Monat (Pruefung, Reels). Wirkt nur ueber PAL + Material-Haken, vor dem Bau der Szene.
const SAISON = (() => {
  const q = new URLSearchParams(location.search), z = +q.get("monat");
  const m = z >= 1 && z <= 12 ? z : +new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", month: "numeric" }).format(new Date());
  const name = m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn";
  return { monat: m, name, schnee: name === "winter", laub: m === 10 || m === 11 };
})();
{ const W = { gras: 0xdfe3e2, gras2: 0xd3d8d6, grasOcker: 0xc8cabf, grasDunkel: 0xb3b9b1, erde: 0x8d8174, erdeDunkel: 0x726658,
    laub: 0xc4c8c3, laub2: 0x8f8677, laub3: 0xd9ddda, tanne: 0x3a4d36, wasser: 0x6f8b90, heu: 0xe8e4da };
  const FR = { gras: 0x6f9a3e, gras2: 0x86a046, grasOcker: 0x9aa452, grasDunkel: 0x557a32, laub: 0x6a9a3c, laub2: 0x8bb04a };
  const SO = { gras: 0x6c8a3a, gras2: 0x7f9442, grasOcker: 0x9a9a4e, grasDunkel: 0x56702f, laub: 0x4f7a2c, laub2: 0x678f36, laub3: 0x7e9a3c };
  const TAB = { 12: { ...W, gras: 0xcfd4cf, gras2: 0xc3c9c0 }, 1: W, 2: { ...W, gras: 0xd2d7d2 },
    3: { ...FR, laub3: 0x9aa850, grasOcker: 0xa49a58 }, 4: { ...FR, laub3: 0xe6c4cf }, 5: { ...FR, laub3: 0xf0e4d8 },
    6: SO, 7: SO, 8: { ...SO, grasOcker: 0xaa9e52 }, 9: {},
    10: { laub: 0x6e7a32, laub2: 0xc0802c, laub3: 0xa4502a, grasOcker: 0xb09a50, gras2: 0x948c46 },
    11: { laub: 0x7a6a3a, laub2: 0x9a6a30, laub3: 0x7e4a2c, gras: 0x6f7440, grasOcker: 0x9c8a50 } };
  Object.assign(PAL, TAB[SAISON.monat] || {}); }
// Material-Haken (mat() ruft ihn auf): im Winter liegt Schnee auf Stroh- und Schindeldaechern
function SAISON_MAT(key, m) {
  if (SAISON.schnee && ["stroh", "strohDunkel", "schindel"].includes(key)) { m.map = null; m.color.setHex(key === "strohDunkel" ? 0xdfe4e8 : 0xeef1f4); m.needsUpdate = true; } }
// ==== /SAISON ====
// ---------------------------------------------------------------- Texturen (handgemalt wirkend, Canvas)
const css = (c, f = 1) => { const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f); return `rgb(${r | 0},${g | 0},${b | 0})`; };
function leinwand(f, S = 256) { const c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"); const alt = R; R = rng(S + f.length); f(g, S); R = alt;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (CFG.pixel) { t.magFilter = THREE.NearestFilter; } return t; }
const flecken = (g, S, n, farben, rmin, rmax, a) => { for (let i = 0; i < n; i++) { const x = R() * S, y = R() * S, r = rr(rmin, rmax);
  for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); const c = pick(farben);
    gr.addColorStop(0, css(c).replace("rgb", "rgba").replace(")", `,${a})`)); gr.addColorStop(1, css(c).replace("rgb", "rgba").replace(")", ",0)")); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r); } } };
const striche = (g, S, n, farben, lmin, lmax, breite, a, winkel = Math.PI / 2, streu = .15) => { g.lineCap = "round";
  for (let i = 0; i < n; i++) { const x = R() * S, y = R() * S, l = rr(lmin, lmax), w = winkel + rr(-streu, streu); g.strokeStyle = css(pick(farben)); g.globalAlpha = a; g.lineWidth = breite;
    for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(w) * l, y + dy + Math.sin(w) * l); g.stroke(); } }
  g.globalAlpha = 1; };
const TEX = CFG.tex ? {
  holz: leinwand((g, S) => { g.fillStyle = css(0x8a6040); g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 32) { g.fillStyle = css(0x8a6040, rr(.85, 1.12)); g.fillRect(0, y, S, 32);
      for (let k = 0; k < 7; k++) { g.strokeStyle = css(pick([0x5e3f26, 0xa77a4f, 0x6c4a2e])); g.globalAlpha = .45; g.lineWidth = rr(.8, 2); g.beginPath();
        const yy = y + rr(3, 29), ph = R() * 6; for (let x = 0; x <= S; x += 8) g.lineTo(x, yy + Math.sin(x / 40 + ph) * 2); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = css(0x3e2a19); g.fillRect(0, y, S, 2.5); } }),
  stroh: leinwand((g, S) => { g.fillStyle = css(0xbe9853); g.fillRect(0, 0, S, S);
    striche(g, S, 2600, [0xd9b86a, 0xa8834a, 0xe6c983, 0x8f6d3c, 0xc9a35c], 10, 22, 1.6, .75);
    for (let y = 0; y < S; y += 43) { const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, "rgba(70,45,20,.35)"); gr.addColorStop(1, "rgba(70,45,20,0)"); g.fillStyle = gr; g.fillRect(0, y, S, 9); } }),
  stein: leinwand((g, S) => { g.fillStyle = css(0x6d665a); g.fillRect(0, 0, S, S);
    for (let y = 0, row = 0; y < S; y += 32, row++) { let x = row % 2 ? -24 : 0; while (x < S) { const w = rr(38, 66);
      g.fillStyle = css(0x9d9686, rr(.82, 1.12)); g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, 28, 6); g.fill();
      g.fillStyle = "rgba(255,250,235,.22)"; g.fillRect(x + 5, y + 3, w - 10, 3); g.fillStyle = "rgba(40,30,20,.22)"; g.fillRect(x + 5, y + 26, w - 10, 3); x += w; } }
    flecken(g, S, 40, [0x5f6a3a, 0x847a62], 6, 18, .25); }),
  putz: leinwand((g, S) => { g.fillStyle = css(0xe6d7b0); g.fillRect(0, 0, S, S); flecken(g, S, 160, [0xcdb98c, 0xf3e8c8, 0xd8c497], 10, 40, .22);
    striche(g, S, 40, [0xb9a479], 4, 14, .8, .5, 0, 3); }),
  gras: leinwand((g, S) => { g.fillStyle = css(0xffffff, .93); g.fillRect(0, 0, S, S); flecken(g, S, 60, [0xffffff, 0xc8c8b0, 0xe8e0b0], 14, 46, .45);
    striche(g, S, 2600, [0xffffff, 0xbfc0a0, 0xdcd6a6, 0xa9ae8c], 3, 8, 1.4, .55, -Math.PI / 2, .5); }),
  acker: leinwand((g, S) => { g.fillStyle = css(0x6f4d2e); g.fillRect(0, 0, S, S); flecken(g, S, 120, [0x5a3c22, 0x86603a, 0x7a5636], 4, 14, .5); }),
  schindel: leinwand((g, S) => { g.fillStyle = css(0x4f3726); g.fillRect(0, 0, S, S);
    for (let y = 0, r = 0; y < S; y += 22, r++) for (let x = (r % 2) * -13; x < S; x += 26) { g.fillStyle = css(0x6e4d37, rr(.8, 1.15)); g.fillRect(x + 1, y + 1, 24, 20); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 1, y + 17, 24, 4); } }),
  laub: leinwand((g, S) => { g.fillStyle = css(0xffffff, .85); g.fillRect(0, 0, S, S); flecken(g, S, 90, [0xffffff, 0x9a9a8a, 0xd8d8b0], 8, 26, .55);
    striche(g, S, 500, [0x7a7a6a, 0xffffff], 3, 7, 3, .35, 0, 3); }),
  weizen: leinwand((g, S) => { g.fillStyle = css(0xd4ae58); g.fillRect(0, 0, S, S); striche(g, S, 1800, [0xe8c86e, 0xb38a3c, 0xf0d88a, 0xa47e36], 6, 16, 1.3, .8, -Math.PI / 2, .25); }),
} : {};

// Weltmasstab-UVs fuer Kisten/Extrusionen (Textur wiederholt sich ~ alle 2.2 m statt gestreckt zu werden)
function weltUV(geo, s = 1 / 2.2) { const p = geo.attributes.position, n = geo.attributes.normal; if (!n) geo.computeVertexNormals();
  const N = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; } uv[i * 2] = u * s; uv[i * 2 + 1] = v * s; }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return geo; }

// ---------------------------------------------------------------- Materialien
const MC = new Map();
function mat(key, o = {}) {
  const k = key + JSON.stringify(o); if (MC.has(k)) return MC.get(k);
  const base = { flatShading: true, roughness: .95, metalness: 0 };
  const texKey = { holz: "holz", holzDunkel: "holz", stamm: "holz", stroh: "stroh", strohDunkel: "stroh", stein: "stein", steinDunkel: "stein", fels: "stein",
    putz: "putz", acker: "acker", ackerHell: "acker", schindel: "schindel", laub: "laub", laub2: "laub", laub3: "laub", tanne: "laub", weizen: "weizen", weizen2: "weizen", heu: "stroh" }[key];
  let m;
  if (CFG.tex && texKey && TEX[texKey]) {
    const tint = { holzDunkel: 0x6a5a50, stamm: 0x8a7a70, strohDunkel: 0xc0a890, steinDunkel: 0xb8b4ac, fels: 0xe0dcd0, ackerHell: 0xffe0c0, laub: PAL.laub, laub2: PAL.laub2,
      laub3: PAL.laub3, tanne: PAL.tanne, weizen2: 0xe0d0b0, heu: 0xfff0d0 }[key] ?? 0xffffff;
    m = new THREE.MeshStandardMaterial({ ...base, map: TEX[texKey], color: tint, ...o });
  } else m = new THREE.MeshStandardMaterial({ ...base, color: PAL[key] ?? key, ...o });
  if (typeof SAISON_MAT === "function") SAISON_MAT(key, m);
  MC.set(k, m); return m;
}
const farbe = c => mat(c);   // reine Farbe (Kleidung u. a.)
const KONTUR = new THREE.LineBasicMaterial({ color: 0x2e1d0e, transparent: true, opacity: .9 });
function mesh(geo, m, schatten = true) {
  if (CFG.tex && m.map) weltUV(geo);
  const x = new THREE.Mesh(geo, m); x.castShadow = schatten; x.receiveShadow = true;
  if (CFG.kontur) x.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 32), KONTUR));
  return x;
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
function pfadAbstand(u, w) { let best = 1e9;
  for (const p of PFADE) for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (w - ay) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(u - ax - t * dx, w - ay - t * dy)); }
  for (const [x, y, r] of PLATZ) best = Math.min(best, Math.max(0, Math.hypot(u - x, w - y) - r + 1.3));
  return best; }
function hoeheRoh(u, w) { return (fbm(u * .035 + 3, w * .035 - 5) - .5) * 2.6 + (fbm(u * .12, w * .12) - .5) * .5; }
function hoeheDorf(u, w) { let h = Math.max(hoeheRoh(u, w), WASSER_Y + .5); h *= .35 + .65 * sst(6, 22, Math.hypot(u, w - (WEILER ? 3 : 0)));
  const d = Math.abs(w - flussW(u)); h = Math.min(h, WASSER_Y - .55 + (h - WASSER_Y + .55) * sst(1.4, 3.6, d));
  return h; }
const setze = (o, u, w, rot = 0, dy = 0) => { o.position.set(u, hoehe(u, w) + dy, -w); o.rotation.y = rot; scene.add(o); return o; };
function baum(art = "laub", s = 1, einfach = false) { const g = new THREE.Group();   // einfach: 1 Krone (Randwald, 18.10.)
  if (art === "tanne") { const st = mesh(new THREE.CylinderGeometry(.14, .2, 1.2, 5), mat("stamm")); st.position.y = .6; g.add(st);
    for (let i = 0; i < 3; i++) { const k = mesh(new THREE.ConeGeometry(1.6 - i * .4, 1.9, 6), mat("tanne")); k.position.y = 1.6 + i * 1.05; k.rotation.y = R() * 3; g.add(k); } }
  else { const st = mesh(new THREE.CylinderGeometry(.15, .24, 2.2, 5), mat("stamm")); st.position.y = 1.1; g.add(st);
    const fk = pick(["laub", "laub", "laub2", "laub3"]);
    for (let i = 0; i < (einfach ? 1 : 3); i++) { const k = mesh(new THREE.IcosahedronGeometry(rr(einfach ? 1.4 : 1.0, 1.45), 0), mat(fk)); k.position.set(rr(-.6, .6), 2.6 + rr(0, .9) + i * .25, rr(-.6, .6)); k.rotation.set(R() * 3, R() * 3, 0); g.add(k); } }
  g.scale.setScalar(s); return g; }
function busch(s = 1) { const k = mesh(new THREE.IcosahedronGeometry(.7 * s, 0), mat(pick(["laub", "laub2"]))); k.position.y = .35 * s; k.scale.y = .75; const g = new THREE.Group(); g.add(k); return g; }
function fels(s = 1) { const k = mesh(new THREE.DodecahedronGeometry(.6 * s, 0), mat("fels")); k.scale.set(1, .6, .8); k.position.y = .2 * s; k.rotation.set(R(), R() * 3, R()); const g = new THREE.Group(); g.add(k); return g; }

function giebelDach(l, b, hRidge, dicke, mDach, ueber = .5, firstMat) {   // Satteldach: Laengsachse x
  const g = new THREE.Group(), a = Math.atan2(hRidge, b / 2), s = Math.hypot(b / 2, hRidge) + ueber;
  for (const sg of [1, -1]) { const p = mesh(new THREE.BoxGeometry(l + ueber * 1.2, dicke, s), mDach);
    const dir = new THREE.Vector3(0, -Math.sin(a), Math.cos(a) * sg), nrm = new THREE.Vector3(0, Math.cos(a), Math.sin(a) * sg);
    p.position.set(0, hRidge / 2, b / 4 * sg).addScaledVector(dir, ueber / 2).addScaledVector(nrm, dicke / 2); p.rotation.x = a * sg; g.add(p); }
  const f = mesh(new THREE.BoxGeometry(l + ueber * 1.25, dicke * 1.1, dicke * 1.6), firstMat || mDach); f.position.y = hRidge + dicke * .75; f.rotation.x = Math.PI / 4; g.add(f);
  return g; }
function giebel(l, b, hRidge, m) { const sh = new THREE.Shape([new THREE.Vector2(-b / 2, 0), new THREE.Vector2(b / 2, 0), new THREE.Vector2(0, hRidge)]);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: l, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-l / 2, 0, 0); return mesh(geo, m); }

function haus(o) {
  const { l = 5, b = 3.6, h = 2.3, wand = "fachwerk", dach = "stroh", kamin = false, licht = false, wandMat = null } = o;
  const g = new THREE.Group(), y0 = .35;
  g.add(box(l + .3, 1.1, b + .3, mat("stein"), 0, y0 - .55));
  const wm = wandMat || (wand === "holz" ? mat("holz") : wand === "stein" ? mat("stein") : mat("putz"));
  g.add(box(l, h, b, wm, 0, y0 + h / 2));
  const rh = b * (dach === "stroh" ? .62 : .5);
  const gb = giebel(l, b, rh, wm); gb.position.y = y0 + h; g.add(gb);
  const bm = mat("holzDunkel");
  if (wand === "fachwerk") {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.2, h, .2, bm, sx * (l / 2 - .02), y0 + h / 2, sz * (b / 2 - .02)));
    for (const sz of [-1, 1]) { g.add(box(l, .17, .08, bm, 0, y0 + .08, sz * (b / 2 + .03))); g.add(box(l, .17, .08, bm, 0, y0 + h - .08, sz * (b / 2 + .03)));
      g.add(box(l, .12, .07, bm, 0, y0 + h * .52, sz * (b / 2 + .03)));
      const n = Math.max(2, Math.round(l / 1.6)); for (let i = 1; i < n; i++) g.add(box(.14, h, .07, bm, -l / 2 + i * l / n, y0 + h / 2, sz * (b / 2 + .03)));
      const br = box(.12, Math.hypot(l / n, h * .5) * .98, .06, bm, -l / 2 + l / n / 2, y0 + h * .26, sz * (b / 2 + .035)); br.rotation.z = Math.atan2(l / n, h * .5) * (sz > 0 ? 1 : -1); g.add(br);
      const br2 = br.clone(); br2.position.x = l / 2 - l / n / 2; br2.rotation.z *= -1; g.add(br2); }
    for (const sx of [-1, 1]) { g.add(box(.08, .17, b, bm, sx * (l / 2 + .03), y0 + h - .08, 0)); g.add(box(.08, .17, b, bm, sx * (l / 2 + .03), y0 + .08, 0));
      g.add(box(.07, rh * .95, .14, bm, sx * (l / 2 + .04), y0 + h + rh * .47, 0)); g.add(box(.07, .12, b * .55, bm, sx * (l / 2 + .04), y0 + h + rh * .45, 0)); }
  } else if (wand === "holz") { for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.22, h + .1, .22, bm, sx * (l / 2), y0 + h / 2, sz * (b / 2))); }
  const dm = dach === "stroh" ? mat("stroh") : mat("schindel");
  const d = giebelDach(l, b, rh, dach === "stroh" ? .34 : .16, dm, dach === "stroh" ? .55 : .4, dach === "stroh" ? mat("strohDunkel") : mat("holzDunkel")); d.position.y = y0 + h; g.add(d);
  // Tuer + Fenster (Vorderseite +z, Rueckseite, Giebelseite)
  const fm = new THREE.MeshBasicMaterial({ color: PAL.fenster }); FENSTERMAT.push({ m: fm, th: rr(.3, .75), an: licht });
  const tx = rr(-l / 4, l / 4);
  g.add(box(.85, 1.55, .1, mat("holzDunkel"), tx, y0 + .78, b / 2 + .05));
  for (const [x, z, ry] of [[tx < 0 ? l / 4 + .3 : -l / 4 - .3, b / 2 + .05, 0], [rr(-l / 4, l / 4), -b / 2 - .05, 0], [l / 2 + .05, rr(-.4, .4), Math.PI / 2], [-l / 2 - .05, 0, Math.PI / 2]]) {
    const f = box(.55, .5, .08, fm, x, y0 + h * .62, z); f.rotation.y = ry; f.castShadow = false; g.add(f);
    const la = box(.68, .09, .12, mat("holzDunkel"), x, y0 + h * .62 - .3, z); la.rotation.y = ry; g.add(la);
    if (licht && R() < .6) FENSTERLICHT.push({ g, fm, p: new THREE.Vector3(x * 1.25, y0 + h * .62, z * 1.6) }); }
  if (kamin) { const k = box(.55, rh + 1.3, .55, mat("stein"), l / 2 - .8, y0 + h + (rh + 1.3) / 2 - .2, -b / 6); g.add(k); EMITTER.push({ g, p: new THREE.Vector3(l / 2 - .8, y0 + h + rh + 1.2, -b / 6) }); }
  return g;
}
function brunnen() { const g = new THREE.Group();
  const r = mesh(new THREE.CylinderGeometry(1.05, 1.15, .95, 10, 1, true), mat("stein")); r.position.y = .47; r.material.side = THREE.DoubleSide; g.add(r);
  g.add(box(.05, .05, .05, mat("stein"))); const wa = mesh(new THREE.CircleGeometry(.95, 10), new THREE.MeshStandardMaterial({ color: 0x2c3a38, roughness: .2 })); wa.rotation.x = -Math.PI / 2; wa.position.y = .55; g.add(wa);
  const rand = mesh(new THREE.TorusGeometry(1.08, .12, 4, 10), mat("steinDunkel")); rand.rotation.x = Math.PI / 2; rand.position.y = .95; g.add(rand);
  for (const x of [-1.05, 1.05]) g.add(box(.18, 2.3, .18, mat("holz"), x, 1.15, 0));
  g.add(box(2.3, .14, .14, mat("holz"), 0, 1.9, 0));
  const d = giebelDach(2.0, 1.6, .8, .12, mat("schindel"), .3, mat("holzDunkel")); d.rotation.y = Math.PI / 2; d.position.y = 2.25; g.add(d);
  const e = mesh(new THREE.CylinderGeometry(.2, .16, .3, 7), mat("holz")); e.position.set(.25, 1.3, 0); g.add(e);
  return g; }
function zaun(punkte, hoch = 1.0) {  // Punkte in (u,w)
  for (let i = 0; i < punkte.length - 1; i++) { const [a, b] = [punkte[i], punkte[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.8));
    for (let k = 0; k <= n; k++) { if (k === n && i < punkte.length - 2) continue; const t = k / n, u = a[0] + (b[0] - a[0]) * t, w = a[1] + (b[1] - a[1]) * t;
      const p = box(.14, hoch + .2, .14, mat("holz")); setze(p, u, w, R() * .3, (hoch + .2) / 2 - .1); p.rotation.z = rr(-.06, .06); }
    for (const yy of [hoch * .45, hoch * .88]) { const um = (a[0] + b[0]) / 2, wm = (a[1] + b[1]) / 2;
      const r = box(L, .08, .08, mat("holz")); r.position.set(um, (hoehe(a[0], a[1]) + hoehe(b[0], b[1])) / 2 + yy, -wm); r.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]); scene.add(r); } } }
function feld(u, w, rot, L, B, art) {  // L entlang lokal x, B entlang z
  const g = new THREE.Group();
  g.add(box(L, .3, B, mat("acker"), 0, -.05, 0));
  const reihen = Math.floor(B / .62);
  if (art === "acker") { for (let i = 0; i < reihen; i++) g.add(box(L - .3, .22, .34, mat("ackerHell"), 0, .16, -B / 2 + .31 + i * .62)); }
  else if (art === "weizen") { for (let i = 0; i < reihen; i++) { const r = box(L - .3, rr(.72, .82), .5, mat(i % 2 ? "weizen" : "weizen2"), 0, .45, -B / 2 + .31 + i * .62); g.add(r); }
    const geo = new THREE.ConeGeometry(.09, .28, 4), n = 160, im = new THREE.InstancedMesh(geo, mat("weizen"), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let k = 0; k < n; k++) { m4.compose(new THREE.Vector3(rr(-L / 2 + .3, L / 2 - .3), .9, -B / 2 + .31 + Math.floor(R() * reihen) * .62), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(k, m4); }
    im.castShadow = true; g.add(im); }
  else { const geo = new THREE.IcosahedronGeometry(.3, 0);
    const n = Math.floor(L / .75), im = new THREE.InstancedMesh(geo, mat("kohl"), reihen * n);
    im.castShadow = true; im.receiveShadow = true; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < reihen; i++) for (let j = 0; j < n; j++) { const x = -L / 2 + .45 + j * (L - .9) / (n - 1), z = -B / 2 + .31 + i * .62;
      q.setFromEuler(new THREE.Euler(0, R() * 3, 0)); m4.compose(new THREE.Vector3(x + rr(-.05, .05), .28, z), q, new THREE.Vector3(1, 1, rr(.8, 1.1)));
      im.setMatrixAt(k, m4); im.setColorAt(k, c.setScalar(rr(.88, 1.08))); k++; }
    g.add(im); }
  setze(g, u, w, rot); return g; }
function heuhaufen() { const g = new THREE.Group(); const z = mesh(new THREE.CylinderGeometry(1.1, 1.25, 1.1, 8), mat("heu")); z.position.y = .55; g.add(z);
  const k = mesh(new THREE.ConeGeometry(1.15, 1.2, 8), mat("heu")); k.position.y = 1.7; g.add(k); return g; }
function holzstapel(n = 3) { const g = new THREE.Group(); for (let r = 0; r < n; r++) for (let i = 0; i < 4 - r; i++) { const s = mesh(new THREE.CylinderGeometry(.17, .17, 1.4, 6), mat("holz")); s.rotation.x = Math.PI / 2; s.position.set(-.5 + i * .34 + r * .17, .17 + r * .3, 0); g.add(s); } return g; }
function fass() { const g = new THREE.Group(); const f = mesh(new THREE.CylinderGeometry(.33, .3, .8, 8), mat("holz")); f.position.y = .4; g.add(f);
  for (const y of [.15, .65]) { const r = mesh(new THREE.CylinderGeometry(.345, .345, .06, 8), mat("steinDunkel")); r.position.y = y; g.add(r); } return g; }
function kiste() { const g = new THREE.Group(); g.add(box(.7, .6, .7, mat("holz"), 0, .3, 0)); return g; }
function karren() { const g = new THREE.Group(); g.add(box(2.1, .5, 1.2, mat("holz"), 0, .85, 0));
  for (const z of [-.7, .7]) { const r = mesh(new THREE.CylinderGeometry(.5, .5, .12, 10), mat("holzDunkel")); r.rotation.x = Math.PI / 2; r.position.set(.2, .5, z); g.add(r); }
  for (const z of [-.45, .45]) g.add(box(1.6, .08, .08, mat("holz"), -1.8, .7, z)); g.add(box(.9, .5, .8, mat("heu"), .1, 1.3, 0)); return g; }
function schaf() { const g = new THREE.Group(); const k = mesh(new THREE.IcosahedronGeometry(.42, 1), mat("schaf")); k.scale.set(1.35, .9, .95); k.position.y = .62; g.add(k);
  g.add(box(.26, .28, .24, farbe(0x3a3028), .62, .78, 0)); for (const [x, z] of [[.3, .18], [.3, -.18], [-.3, .18], [-.3, -.18]]) g.add(box(.09, .36, .09, farbe(0x3a3028), x, .18, z)); return g; }

// Leute — leicht ueberproportional wie bei Stronghold
const TUCH = [0x8a3b2a, 0x5b6b34, 0x6d5a3a, 0x4f5f78, 0x9a7a3a, 0x7a4a5a, 0x5a4a32, 0xa0603a];
function mensch(o = {}) {
  const { pose = "steh", tuch = pick(TUCH), hut = R() < .35, haube = !hut && R() < .25, s = 1.45 } = o;
  const g = new THREE.Group(), tm = farbe(tuch), hm = farbe(0x4a3a2a), hautm = farbe(PAL.haut);
  const beine = [], sitz = pose === "sitz", hip = sitz ? .48 : .72;
  if (sitz) for (const sx of [-1, 1]) { g.add(box(.16, .16, .5, hm, sx * .1, hip, .2)); g.add(box(.15, .48, .16, hm, sx * .1, hip / 2, .44)); g.add(box(.16, .09, .26, farbe(0x3a2a1c), sx * .1, .05, .5)); }
  else for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * .1, hip, 0); piv.add(box(.16, hip, .18, hm, 0, -hip / 2, 0)); piv.add(box(.17, .09, .28, farbe(0x3a2a1c), 0, -hip + .05, .05));
    if (pose === "geh") piv.rotation.x = sx * .38; beine.push(piv); g.add(piv); }
  const ober = new THREE.Group(); ober.position.y = hip; g.add(ober);
  const rumpf = mesh(new THREE.CylinderGeometry(.18, .29, .82, 7), tm); rumpf.position.y = .28; ober.add(rumpf);
  const gurt = mesh(new THREE.CylinderGeometry(.24, .24, .07, 7), farbe(0x3a2a1c)); gurt.position.y = .22; ober.add(gurt);
  const kopf = mesh(new THREE.IcosahedronGeometry(.18, 1), hautm); kopf.position.y = .9; ober.add(kopf);
  if (hut) { const ht = mesh(new THREE.CylinderGeometry(.07, .38, .16, 8), mat("heu")); ht.position.y = 1.06; ober.add(ht); }
  else if (haube) { const hb = mesh(new THREE.ConeGeometry(.24, .42, 7), tm); hb.position.set(0, 1.04, -.03); ober.add(hb); }
  else { const ha = mesh(new THREE.SphereGeometry(.19, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), farbe(pick([0x3a2a1a, 0x7a4a24, 0xb08a50, 0x2a2018]))); ha.position.set(0, .93, -.02); ober.add(ha); }
  const arme = [];
  for (const sx of [-1, 1]) { const a = new THREE.Group(); a.position.set(sx * .25, .62, 0); a.add(box(.11, .5, .12, tm, 0, -.24, 0));
    const hd = mesh(new THREE.IcosahedronGeometry(.07, 0), hautm); hd.position.y = -.52; a.add(hd); ober.add(a); arme.push(a); }
  const stock = (len, m = mat("holz")) => mesh(new THREE.CylinderGeometry(.035, .035, len, 5), m);
  if (sitz) { ober.rotation.x = .18; arme.forEach(a => { a.rotation.x = -1.05; a.rotation.z = a.position.x > 0 ? .25 : -.25; }); }
  else if (pose === "hacke") { ober.rotation.x = .42; arme.forEach(a => a.rotation.x = -.95);
    const st = stock(1.8); st.position.set(-.12, -1.2, 0); arme[1].add(st); const bl = box(.3, .08, .32, mat("steinDunkel"), -.12, -2.08, .14); arme[1].add(bl); }
  else if (pose === "axt") { arme.forEach(a => { a.rotation.x = -2.75; a.rotation.z = a.position.x > 0 ? .25 : -.25; });
    const st = stock(1.0); st.position.set(-.12, -.85, 0); arme[1].add(st); const kl = box(.08, .26, .34, mat("steinDunkel"), -.12, -1.3, .14); arme[1].add(kl); }
  else if (pose === "sack") { arme[1].rotation.x = -2.6; arme[0].rotation.x = -.2; const sk = mesh(new THREE.IcosahedronGeometry(.32, 0), farbe(0xcdb98a)); sk.scale.set(1.3, .9, .9); sk.position.set(.22, .78, -.08); ober.add(sk); }
  else if (pose === "korb") { arme.forEach(a => a.rotation.x = -.85); const kb = mesh(new THREE.CylinderGeometry(.26, .2, .26, 8), mat("heu")); kb.position.set(0, .22, .5); ober.add(kb); }
  else if (pose === "rede") { arme[1].rotation.x = -.9; arme[1].rotation.z = .4; arme[0].rotation.x = -.15; }
  else if (pose === "geh") { arme[0].rotation.x = .35; arme[1].rotation.x = -.35; }
  else { arme.forEach(a => a.rotation.z = a.position.x > 0 ? .1 : -.1); }
  g.userData.m = { ober, arme, beine, pose, phase: R() * 6 }; MENSCHEN.push(g);
  g.scale.setScalar(s); return g; }

function feuer(groesse = 1) { const g = new THREE.Group();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, st = mesh(new THREE.DodecahedronGeometry(.24, 0), mat(i % 3 ? "stein" : "steinDunkel")); st.position.set(Math.cos(a) * .95, .12, Math.sin(a) * .95); st.scale.y = .7; st.rotation.set(R(), R(), R()); g.add(st); }
  for (let i = 0; i < 5; i++) { const s = mesh(new THREE.CylinderGeometry(.08, .1, 1.2, 5), mat("holzDunkel")); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * .3, .4, Math.sin(a) * .3); s.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); g.add(s); }
  const FL = []; const glut = new THREE.Mesh(new THREE.CircleGeometry(.55, 8), new THREE.MeshBasicMaterial({ color: 0xff6a20, fog: false })); glut.rotation.x = -Math.PI / 2; glut.position.y = .05; g.add(glut);
  for (const [r, h, c, y] of [[.45, 1.35, 0xff7a22, .65], [.3, 1.05, 0xffb436, .6], [.15, .7, 0xfff0a0, .5]]) { const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), new THREE.MeshBasicMaterial({ color: c, fog: false })); f.position.y = y; f.rotation.y = R() * 2; g.add(f); FL.push(f); }
  const pl = new THREE.PointLight(0xff9440, 18, 30, 1.6); pl.position.y = 1.4; pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.bias = -.002; pl.shadow.radius = 3;
  FEUER.push({ pl, FL });
  g.add(pl); g.scale.setScalar(groesse); EMITTER.push({ g, p: new THREE.Vector3(0, 1.6, 0), feuer: true }); return g; }

// Rauch / Glanz als Sprites
const rauchTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.55, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function rauchAlt(pos, feuerRauch) {
  const n = 11, wind = new THREE.Vector3(1.0, 0, -.35);
  for (let i = 0; i < n; i++) { const t = i / (n - 1);
    const c = CFG.nacht ? (feuerRauch && t < .25 ? 0x9a6a50 : 0x5a5e6a) : (feuerRauch ? 0xd8d2c4 : 0xcfc8ba);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rauchTex, color: c, transparent: true, depthWrite: false, fog: false, opacity: (1 - t) * (CFG.nacht ? .45 : .62) + .04 }));
    sp.position.copy(pos).add(new THREE.Vector3(0, t * 6.5, 0)).addScaledVector(wind, t * t * 4.2 + Math.sin(i * 1.7) * .15);
    sp.scale.setScalar(.5 + t * 2.4); sp.renderOrder = 5; scene.add(sp); } }
function glanz(pos, farbeG, gr, op) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rauchTex, color: farbeG, transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: op, blending: THREE.AdditiveBlending }));
  sp.position.copy(pos); sp.scale.setScalar(gr); sp.renderOrder = 10; scene.add(sp); return sp; }

// ================================================================ Reel-Teil (16.10.2026)
let ctx;
const zz = (a, b, t) => a + (b - a) * t, klemm = x => Math.max(0, Math.min(1, x)), weich = x => { x = klemm(x); return x * x * (3 - 2 * x); };
const farb3 = (a, b, c, n) => n < .5 ? new THREE.Color(a).lerp(new THREE.Color(b), n * 2) : new THREE.Color(b).lerp(new THREE.Color(c), (n - .5) * 2);
const vek3 = (a, b, c, n) => n < .5 ? new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), n * 2) : new THREE.Vector3(...b).lerp(new THREE.Vector3(...c), (n - .5) * 2);
const NEBEL_TAG = 0xe7e0cc, NEBEL_DAEMM = 0xc9a888, NEBEL_NACHT = 0x1f2638;

// Nebel: elliptisch, fogNear = Skalierung der Ellipse (23 x 46 m), fogFar = Mitte (w)
THREE.ShaderChunk.fog_pars_vertex = "#ifdef USE_FOG\n varying vec3 vNebelW;\n#endif";
THREE.ShaderChunk.fog_vertex = "#ifdef USE_FOG\n vec4 nbP = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n nbP = instanceMatrix * nbP;\n #endif\n vNebelW = (modelMatrix * nbP).xyz;\n#endif";
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor; varying vec3 vNebelW; uniform float fogNear; uniform float fogFar;
 float nbH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
 float nbN(vec2 p){ vec2 i = floor(p), q = fract(p); q = q*q*(3.0-2.0*q);
   return mix(mix(nbH(i), nbH(i+vec2(1,0)), q.x), mix(nbH(i+vec2(0,1)), nbH(i+vec2(1,1)), q.x), q.y); }
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
 vec2 nbQ = (vec2(vNebelW.x, -vNebelW.z) - vec2(0.0, fogFar)) / (vec2(23.0, 46.0) * fogNear);
 float nbn = nbN(vNebelW.xz * 0.11) * 0.6 + nbN(vNebelW.xz * 0.33) * 0.4;
 float nbF = smoothstep(1.0, 1.8, length(nbQ) + (nbn - 0.5) * 0.45 - vNebelW.y * 0.012);
 gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, nbF);
#endif`;
const nebelF = (u, w, y, s, c) => sst(1, 1.8, Math.hypot(u / (23 * s), (w - c) / (46 * s)) - y * .012);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(devicePixelRatio); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 900);
const SONNE_DIR = [[-48, 62, 8], [-62, 24, 14], [-40, 60, -25]];

function neueSzene(nb, nebelS) {
  scene = new THREE.Scene(); NB = nb;
  scene.fog = new THREE.Fog(NEBEL_TAG, nebelS, nb.c[1]); scene.background = new THREE.Color(NEBEL_TAG);
  SPERRE = []; EMITTER = []; FENSTERLICHT = []; FENSTERMAT = []; FEUER = []; RAUCH = []; MENSCHEN = []; WOLKEN = []; SCHAFE = []; GLANZ = [];
  const hemi = new THREE.HemisphereLight(0xfff0d2, 0x6a6338, 1.45); scene.add(hemi);
  const sonne = new THREE.DirectionalLight(0xffe2b4, 2.9); sonne.castShadow = true;
  sonne.shadow.mapSize.set(4096, 4096); sonne.shadow.radius = 7; sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = .04; sonne.shadow.intensity = .85;
  Object.assign(sonne.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 300 }); sonne.shadow.camera.layers.enable(1);
  scene.add(sonne, sonne.target);
  return { scene, hemi, sonne };
}
function fertig(c) { Object.assign(c, { NB, SPERRE, EMITTER, FENSTERLICHT, FENSTERMAT, FEUER, RAUCH, MENSCHEN, WOLKEN, SCHAFE, GLANZ, hoeheFn, flussW });
  scene.updateMatrixWorld(true);
  for (const e of EMITTER) { const p = e.g.localToWorld(e.p.clone()); rauch(p, e.feuer);
    if (e.feuer) { const q = p.clone().add(new THREE.Vector3(0, -.7, 0)); GLANZ.push({ sp: glanz(q.clone(), 0xffb050, 3.2, .35), tag: .35, nacht: .1 }, { sp: glanz(q.clone().add(new THREE.Vector3(0, .1, 0)), 0xff8a30, 7, 0), tag: 0, nacht: .32 }, { sp: glanz(q.clone().add(new THREE.Vector3(0, -.1, 0)), 0xffd080, 2.5, 0), tag: 0, nacht: .5 }); } }
  for (const f of FEUER) { f.pos = f.pl.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -1.4, 0)); f.funken = [];
    for (let i = 0; i < 18; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rauchTex, color: i % 3 ? 0xffb040 : 0xffe080, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); sp.renderOrder = 11; scene.add(sp); f.funken.push(sp); } }
  c.fensterL = FENSTERLICHT.slice(0, 9).map(f => { const l = new THREE.PointLight(0xffa850, 0, 6.5, 1.8); l.position.copy(f.g.localToWorld(f.p.clone())); scene.add(l); return { l, fm: f.fm }; });
  return c; }

function gelaende(sz, seg, mitteW, wasser = true) {
  const g = new THREE.PlaneGeometry(sz, seg ? sz : sz, seg, seg); g.rotateX(-Math.PI / 2); g.translate(0, 0, -mitteW);
  const p = g.attributes.position, cols = [], col = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const u = p.getX(i), w = -p.getZ(i), y = hoehe(u, w);
    const n = fbm(u * .06 + 11, w * .06 + 4), n2 = rausch(u * .5, w * .5);
    col.setHex(n > .58 ? PAL.grasOcker : n > .46 ? PAL.gras2 : n < .34 ? PAL.grasDunkel : PAL.gras); c2.setHex(PAL.gras); col.lerp(c2, .25 + .3 * n2);
    const pf = pfadAbstand(u, w); if (pf < 2.2) col.lerp(c2.setHex(PAL.erde), sst(2.2, .9, pf) * .92);
    const df = Math.abs(w - flussW(u)); if (df < 3.4) col.lerp(c2.setHex(0x8a7a4e), sst(3.4, 1.6, df) * .7);
    p.setY(i, y); cols.push(col.r, col.g, col.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const gt = TEX.gras.clone(); gt.repeat.set(sz / 4.5, sz / 4.5); gt.needsUpdate = true;
  const t = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: gt })); t.receiveShadow = true; scene.add(t);
  if (wasser) { const wg = new THREE.PlaneGeometry(sz, sz, 40, 40); wg.rotateX(-Math.PI / 2); wg.translate(0, WASSER_Y, -mitteW);
    const wa = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: PAL.wasser, roughness: .25, metalness: .1, flatShading: true })); wa.receiveShadow = true; scene.add(wa); } }

function rauch(pos, feuerRauch) { const n = 10, arr = [];
  for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rauchTex, color: 0xd8d2c4, transparent: true, depthWrite: false, fog: false })); sp.renderOrder = 5; scene.add(sp); arr.push(sp); }
  RAUCH.push({ pos, feuer: feuerRauch, arr, ph: R() }); }
function wolken(n = 8) { const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < n; i++) { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(3, 6), 0), m); s.position.set(rr(-5, 5), 0, rr(-4, 4)); s.scale.y = .45; s.castShadow = true; s.layers.set(1); g.add(s); }
    scene.add(g); WOLKEN.push({ g, u0: rr(-90, 90), w: rr(-40, 70) }); } }
function emblemTex() { const c = document.createElement("canvas"); c.width = 512; c.height = 768; const g = c.getContext("2d");
  g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 0); g.lineTo(512, 768); g.lineTo(256, 610); g.lineTo(0, 768); g.closePath(); g.fillStyle = "#c9a04a"; g.fill();
  g.beginPath(); g.moveTo(26, 26); g.lineTo(486, 26); g.lineTo(486, 712); g.lineTo(256, 572); g.lineTo(26, 712); g.closePath(); g.fillStyle = "#7a2822"; g.fill();
  flecken(g, 512, 30, [0x5a1a16, 0x8e3a2e], 20, 60, .25);
  const flamme = (s, farbeF) => { g.save(); g.translate(256, 470); g.scale(s, s); g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(-120, -10, -130, -120, -60, -200); g.bezierCurveTo(-40, -150, -20, -140, -10, -150); g.bezierCurveTo(-30, -230, 10, -300, 50, -330);
    g.bezierCurveTo(40, -260, 110, -220, 110, -130); g.bezierCurveTo(120, -40, 70, 0, 0, 0); g.fillStyle = farbeF; g.fill(); g.restore(); };
  flamme(1, "#e2b04a"); flamme(.55, "#f6dc8a");
  g.fillStyle = "#e2b04a"; g.save(); g.translate(256, 505); for (const r of [-.35, .35]) { g.save(); g.rotate(r); g.fillRect(-115, -14, 230, 28); g.restore(); } g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function banner(b = 2, h = 3) { const g = new THREE.Group(), tex = emblemTex();
  const geo = new THREE.PlaneGeometry(b, h, 16, 24); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, .12 * Math.sin(x * 2.4 + y * .9) * (x + b / 2) / b); } geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide, roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .28 });
  const f = new THREE.Mesh(geo, m); f.castShadow = true; f.position.set(0, -h / 2, 0); g.add(f);
  g.add(box(b + .5, .1, .1, mat("holzDunkel"), 0, .05, 0)); return g; }
function burg() { const g = new THREE.Group(), R0 = 6.2, n = 8;
  const ecke = i => { const a = (i / n) * Math.PI * 2 + Math.PI / 8; return [Math.cos(a) * R0, Math.sin(a) * R0]; };
  for (let i = 0; i < n; i++) { const [x1, z1] = ecke(i), [x2, z2] = ecke(i + 1), L = Math.hypot(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, rot = -Math.atan2(z2 - z1, x2 - x1);
    const tor = mz > 4.5 && Math.abs(mx) < 2;
    const seg = new THREE.Group(); seg.position.set(mx, 0, mz); seg.rotation.y = rot; g.add(seg);
    if (tor) { for (const s of [-1, 1]) seg.add(box(L * .32, 2.6, .8, mat("stein"), s * L * .34, 1.3, 0)); seg.add(box(L * .36, .8, .8, mat("stein"), 0, 2.2, 0)); seg.add(box(L * .34, 1.8, .2, mat("holzDunkel"), 0, .9, .1)); }
    else seg.add(box(L + .2, 2.2, .75, mat("stein"), 0, 1.1, 0));
    for (let k = 0; k < Math.floor(L / .8); k++) seg.add(box(.38, .42, .8, mat("stein"), -L / 2 + .4 + k * .8, (tor ? 2.6 : 2.2) + .2, 0)); }
  for (let i = 0; i < n; i += 2) { const [x, z] = ecke(i); const t = mesh(new THREE.CylinderGeometry(1, 1.1, 3.6, 8), mat("stein")); t.position.set(x, 1.8, z); g.add(t);
    const d = mesh(new THREE.ConeGeometry(1.35, 1.9, 8), mat("schindel")); d.position.set(x, 4.55, z); g.add(d); }
  g.add(box(4, 6.4, 4, mat("stein"), -.6, 3.2, -1.2));
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { g.add(box(.42, .5, .5, mat("stein"), -.6 - 1.75 + k * .875, 6.6, -1.2 + s * 1.8)); g.add(box(.5, .5, .42, mat("stein"), -.6 + s * 1.8, 6.6, -1.2 - 1.75 + k * .875)); }
  g.add(box(.6, .9, .1, mat("fenster"), -.6, 4.5, .85)); g.add(box(.1, .9, .6, mat("fenster"), 1.45, 4.5, -1.2));
  const mast = mesh(new THREE.CylinderGeometry(.06, .06, 3.2, 5), mat("holzDunkel")); mast.position.set(-.6, 8.2, -1.2); g.add(mast);
  const f = banner(1.4, 1.9); f.rotation.z = Math.PI / 2; f.rotation.y = 0; f.position.set(-.55, 9.6, -1.2); f.scale.set(1, 1, 1); g.add(f);
  
  return g; }

// ---------------------------------------------------------------- Welten
const BAUPLAETZE = [[-9, -2], [8, -3.5], [-13.5, 4], [12.5, 2.5], [-5, -9.5], [5, -11], [-15, -8.5], [15.5, -9.5], [-6.5, 18.5], [6, 19.5], [15.5, 17], [-16, 17]];
function weltStart() {
  WEILER = false; flussW = u => 9.5 + 1.8 * Math.sin(u / 5) + .6 * Math.sin(u / 2.3); PFADE = []; PLATZ = [[0, 0, 2.6]]; hoeheFn = hoeheDorf;
  const c = neueSzene({ c: [0, 2], r: [23, 46] }, .55); gelaende(170, 260, 8);
  lagerfeuer();
  setze(unterstand(), -3.6, .9, Math.PI / 2 + .25); SPERRE.push([-3.6, .9, 2.6]);
  setze(holzstapel(1), -1.6, -2.3, .9); SPERRE.push([-1.6, -2.3, 1], [1.9, .5, 1.6]);
  for (const [u, w] of BAUPLAETZE) SPERRE.push([u, w, 4.2]);
  waldRand(); gras(3200, [-32, 32], [-30, 45]); wolken(); vorschau(c); return fertig(c); }
function unterstand() {   // Jaeger-Unterstand: liegender Stamm als First, A-Boecke, schraeg angelehnte Aeste, Steine am Fuss (Inspo: The Forest, eigene Umsetzung)
  const g = new THREE.Group(), L = 3.2, H = 1.45, tief = 1.75;
  const first = mesh(new THREE.CylinderGeometry(.19, .21, L, 7), mat("stamm")); first.rotation.z = Math.PI / 2; first.position.y = H; g.add(first);
  for (const x of [-L / 2 + .35, L / 2 - .35]) for (const sz of [-1, 1]) { const bk = box(.24, 1.65, .32, mat("stamm"), x, .78, sz * .36); bk.rotation.x = -sz * .42; g.add(bk); }
  const n = 15, a = Math.atan2(tief, H), lang = Math.hypot(tief, H) + .25;
  for (let i = 0; i < n; i++) { const x = -L / 2 + .2 + i * (L - .4) / (n - 1) + rr(-.05, .05);
    const st = mesh(new THREE.CylinderGeometry(.055, .07, lang, 5), mat(i % 3 ? "stamm" : "holzDunkel")); st.position.set(x, H / 2 + .05 + tief / lang * .1, -tief / 2 - H / lang * .1); st.rotation.x = a + rr(-.04, .04); st.rotation.z = rr(-.05, .05); g.add(st);
    const k = mesh(new THREE.DodecahedronGeometry(rr(.17, .25), 0), mat("felsHell")); k.position.set(x + rr(-.05, .05), .12, -tief - .05); k.scale.y = .75; k.rotation.set(R(), R(), R()); g.add(k); }
  const decke = box(L - .3, .12, lang * .82, mat("tanne"), 0, H / 2 + .02, -tief / 2 - .08); decke.rotation.x = a - Math.PI / 2 + Math.PI; decke.rotation.x = -(Math.PI / 2 - a); g.add(decke);
  for (let i = 0; i < 6; i++) { const z = mesh(new THREE.ConeGeometry(.42, 1.3, 5), mat(i % 2 ? "tanne" : "laub")); z.rotation.x = -(Math.PI / 2 - a) - Math.PI / 2; z.position.set(-1.3 + i * .52, H * (.35 + .3 * (i % 2)), -tief * (.65 - .3 * (i % 2)) - .05); z.scale.set(1, 1, .3); g.add(z); }
  return g; }
function waldRand() {
  for (let i = 0; i < 1700; i++) { const u = rr(-34, 34), w = rr(-45, 62);
    const ell = Math.hypot(u / 23, (w - 2) / 46), dicht = fbm(u * .07 + 5, w * .07 - 2);
    const rand = (u * .85 + w * .3) < -8 + 9 * (dicht - .5) || w > 21 + 10 * (dicht - .5) + .1 * u;
    const p = rand ? .6 : .025 + .35 * sst(.8, 1.15, ell);
    if (R() > p || !frei(u, w, .8) || Math.hypot(u, w) < 5.5 || ell > 1.35) continue;
    setze(baum(dicht > .6 && R() < .6 ? "tanne" : "laub", rr(.8, 1.3)), u, w, R() * 6); SPERRE.push([u, w, 1.2]); }
  for (let i = 0; i < 60; i++) { const u = rr(-30, 30), w = rr(-25, 40); if (!frei(u, w, .3) || Math.hypot(u, w) < 4) continue; setze(R() < .5 ? busch(rr(.7, 1.2)) : fels(rr(.5, 1.3)), u, w, R() * 6); } }
function vorschau(c) {    // Ausblick: Haeuser, die von oben aufs Land gesetzt werden (nur Vorschau, kein Bestand)
  const B = Math.PI / 4, typen = [{ l: 5.2, b: 3.6, kamin: true }, { l: 4.2, b: 3.2, wand: "holz", dach: "schindel" }, { l: 5, b: 3.6 }, { l: 3.8, b: 3, wand: "holz" }];
  c.VORSCHAU = BAUPLAETZE.map(([u, w], i) => { const h = haus(typen[i % 4]); EMITTER.pop && typen[i % 4].kamin && EMITTER.pop();
    h.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; if (o.material.isMeshStandardMaterial) { o.material.emissive = new THREE.Color(0xffd9a0); o.material.emissiveIntensity = .12; } } });
    setze(h, u, w, B + (i % 2) * Math.PI / 2 + rr(-.12, .12), -.05); h.userData.y0 = h.position.y; h.visible = false;
    const staub = []; for (let k = 0; k < 7; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rauchTex, color: 0xd9c9a4, transparent: true, depthWrite: false, fog: false, opacity: 0 })); scene.add(sp); staub.push({ sp, a: k / 7 * Math.PI * 2 }); }
    return { h, u, w, staub }; }); }
function lagerfeuer() { setze(feuer(), 0, 0); SPERRE.push([0, 0, 2.6]);
  const blick = Math.atan2(-1.95, .6), st = mesh(new THREE.CylinderGeometry(.24, .26, 2.0, 7), mat("stamm")); st.rotation.z = Math.PI / 2; const g = new THREE.Group(); st.position.y = .24; g.add(st);
  setze(g, 2.05, .63, blick); setze(mensch({ pose: "sitz", tuch: 0x8a3b2a, hut: false, haube: true }), 1.95, .6, blick, 0); }
function weltBanner() {
  WEILER = false; flussW = () => 1e6; PFADE = []; PLATZ = [[0, 0, .6]]; hoeheFn = (u, w) => 1.0 * Math.exp(-(u * u + w * w) / 22) + (fbm(u * .2, w * .2) - .5) * .3;
  const c = neueSzene({ c: [0, 0], r: [6, 12] }, .27); gelaende(50, 120, 0, false);
  const mast = mesh(new THREE.CylinderGeometry(.08, .1, 5.2, 6), mat("holzDunkel")); const g = new THREE.Group(); mast.position.y = 2.6; g.add(mast);
  const kn = mesh(new THREE.IcosahedronGeometry(.18, 0), farbe(0xd8a628)); kn.position.y = 5.3; g.add(kn);
  const b = banner(2.2, 3.2); b.position.set(0, 4.75, .12); g.add(b); setze(g, 0, 0, 0);
  SPERRE.push([0, 0, 1.2]);
  setze(feuer(.55), 1.9, -.6); SPERRE.push([1.9, -.6, 1.2]);
  for (const [u, w, s] of [[-3.2, 3.5, .9], [3.6, 4.8, 1.1], [-5.5, 6, 1], [5.5, 1.5, .8]]) { setze(baum("laub", s), u, w, R() * 6); SPERRE.push([u, w, 1.3]); }
  for (const [u, w] of [[-1.6, -1.2], [-2.4, .8]]) setze(fels(.6), u, w, R());
  gras(1400, [-10, 10], [-10, 12]); return fertig(c); }
function weltBurg() {
  WEILER = false; flussW = () => 1e6; hoeheFn = (u, w) => { const d = Math.hypot(u, w); return 5.2 * Math.exp(-((d / 10.5) ** 2)) * (d < 7.6 ? 1 : 1) + (fbm(u * .06, w * .06) - .5) * 1.2 * sst(6, 14, d); };
  const huegel = hoeheFn; hoeheFn = (u, w) => { const d = Math.hypot(u, w); return d < 7.4 ? huegel(0, 0) : huegel(u, w) + (huegel(0, 0) - huegel(u, w)) * sst(9, 7.4, d); };
  PFADE = [[[-4, -40], [-6, -24], [-3, -16], [3, -12], [5, -8], [1.5, -6.2]]]; PLATZ = [[0, 0, 7.6]];
  const c = neueSzene({ c: [0, 2], r: [16, 32] }, .72); gelaende(130, 220, 2, false);
  setze(burg(), 0, 0, -Math.PI / 2 * 0); SPERRE.push([0, 0, 8.5]);
  const B = Math.PI / 4;
  wald(); gras(); wolken(5); return fertig(c); }
function wald() { const N = WEILER ? 1900 : 900, wr = WEILER ? [-80, 90] : [-30, 45], ur = WEILER ? 40 : 22;
  for (let i = 0; i < N; i++) { const u = rr(-ur, ur), w = rr(wr[0], wr[1]);
    const ell = Math.hypot((u - NB.c[0]) / NB.r[0], (w - NB.c[1]) / NB.r[1]), dicht = fbm(u * .07 + 5, w * .07 - 2);
    const p = sst(.55, 1.05, ell) * .55 * (dicht > .45 ? 1 : .35) + (ell < .75 ? .015 : 0);
    if (R() > p || !frei(u, w, .8) || Math.hypot(u, w) < (WEILER ? 4 : 5.5)) continue;
    if (ell > (WEILER ? 1.35 : 1.22)) continue;
    setze(baum(dicht > .62 && R() < .6 ? "tanne" : "laub", rr(.8, 1.3)), u, w, R() * 6); SPERRE.push([u, w, 1.2]); }
  for (let i = 0; i < (WEILER ? 70 : 26); i++) { const u = rr(-ur, ur), w = rr(wr[0] * .6, wr[1] * .6); if (!frei(u, w, .3)) continue; setze(R() < .5 ? busch(rr(.7, 1.2)) : fels(rr(.5, 1.3)), u, w, R() * 6); } }
function gras(n = WEILER ? 2600 : 1200, ub = [-30, 30], wb = WEILER ? [-45, 60] : [-15, 20]) {
  const geo = new THREE.ConeGeometry(.1, .42, 3), im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), n);
  im.receiveShadow = true; const m4 = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion(); let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) { const u = rr(...ub), w = rr(...wb); if (!frei(u, w, .1)) continue;
    m4.compose(new THREE.Vector3(u, hoehe(u, w) + .15, -w), q.setFromEuler(new THREE.Euler(rr(-.2, .2), R() * 3, rr(-.2, .2))), new THREE.Vector3(1, rr(.6, 1.3), 1));
    im.setMatrixAt(k, m4); im.setColorAt(k, c.setHex(pick([PAL.grasDunkel, PAL.gras2, PAL.grasOcker, 0x6a7a30]))); k++; }
  im.count = k; scene.add(im); }
const frei = (u, w, r = 0) => Math.abs(w - flussW(u)) > 2.6 + r && (SPERRE.frei ? SPERRE.frei(u, w, r) : SPERRE.every(([a, b, rr2]) => Math.hypot(u - a, w - b) > rr2 + r)) && pfadAbstand(u, w) > 1.6 + r && !aufWeg(u, w, r);
// 18.10.: Hindernis-Raster (gleiche Pruefung, nur Nachbarzellen) -> Laden bleibt bei 500/1000 Bewohnern schnell
function sperreGitter() { const a = [], G = new Map(), C = 6, k = (i, j) => i * 73856093 ^ j * 19349663;
  a.push = function (...xs) { for (const x of xs) { Array.prototype.push.call(this, x); const [u, w, rr2] = x;
      for (let i = Math.floor((u - rr2) / C); i <= Math.floor((u + rr2) / C); i++) for (let j = Math.floor((w - rr2) / C); j <= Math.floor((w + rr2) / C); j++) { const kk = k(i, j); (G.get(kk) || G.set(kk, []).get(kk)).push(x); } }
    return this.length; };
  a.frei = (u, w, r) => { for (let i = Math.floor((u - r) / C); i <= Math.floor((u + r) / C); i++) for (let j = Math.floor((w - r) / C); j <= Math.floor((w + r) / C); j++) {
      const l = G.get(k(i, j)); if (l) for (const [x, y, rr2] of l) if (Math.hypot(u - x, w - y) <= rr2 + r) return false; } return true; };
  return a; }

// ---------------------------------------------------------------- Zeitabhaengiges
function wegPunkt(pts, s) { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= L || i === pts.length - 2) { const t = Math.min(1, s / L); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], -(b[1] - a[1]))]; } s -= L; } }
function bewegen(c, t, n, nebelS, nebelC) {
  hoeheFn = c.hoeheFn; flussW = c.flussW;
  for (const g of c.MENSCHEN) { const { ober, arme, beine, pose, phase } = g.userData.m, z = t + phase, weg = g.userData.weg;
    if (weg) { const [u, w, r] = wegPunkt(weg.pts, weg.s0 + weg.v * t); let y = hoehe(u, w); if (Math.abs(w - flussW(u)) < 3.2) y = Math.max(y, .07);
      g.position.set(u, y + .03 * Math.abs(Math.sin(z * 6)), -w); g.rotation.y = r;
      beine.forEach((b, i) => b.rotation.x = (i ? 1 : -1) * .45 * Math.sin(z * 6));
      if (pose === "geh") { arme[0].rotation.x = .35 * Math.sin(z * 6); arme[1].rotation.x = -.35 * Math.sin(z * 6); } }
    else if (pose === "sitz") { ober.rotation.x = .18 + .04 * Math.sin(z * 1.4); arme.forEach(a => a.rotation.x = -1.05 + .08 * Math.sin(z * 1.1)); }
    else if (pose === "hacke") { const s = Math.sin(z * 4.2); ober.rotation.x = .42 + .12 * s; arme.forEach(a => a.rotation.x = -1.25 - .35 * s); }
    else if (pose === "axt") { const p = (z / 1.3) % 1, a = p < .65 ? -1.1 - 1.7 * weich(p / .65) : -2.8 + 1.7 * ((p - .65) / .35) ** 2;
      arme.forEach(x => x.rotation.x = a); ober.rotation.x = .1 + .25 * klemm((-a - 1.1) / 1.7 * -1 + 1); }
    else if (pose === "rede") { arme[1].rotation.x = -.9 + .35 * Math.sin(z * 2.3); arme[1].rotation.z = .4 + .15 * Math.sin(z * 1.7); ober.rotation.y = .12 * Math.sin(z * .8); }
    else ober.rotation.x = .03 * Math.sin(z * 1.2); }
  for (const s of c.SCHAFE) s.s.rotation.y = s.r0 + .25 * Math.sin(t * .5 + s.ph);
  for (const w of c.WOLKEN) w.g.position.set(((w.u0 + t * 1.6 + 120) % 240 + 240) % 240 - 120, 30, -w.w);
  // Feuer
  const flack = .82 + .1 * Math.sin(t * 13) + .08 * Math.sin(t * 29.7 + 1) + .05 * Math.sin(t * 7.3);
  for (const f of c.FEUER) { f.pl.intensity = zz(16, 80, n) * flack; f.FL.forEach((m, i) => { m.scale.set(1, .85 + .25 * Math.sin(t * (11 + i * 3) + i) * .8 + .1 * Math.sin(t * 23 + i), 1); m.rotation.y = t * (1.5 + i); }); }
  for (const f of c.FEUER) if (f.funken) f.funken.forEach((sp, i) => { const k = f.funken.length, p = (t * (.32 + .07 * (i % 5)) + i / k) % 1;
    sp.position.copy(f.pos).add(new THREE.Vector3(.45 * Math.sin(i * 3.7 + p * 6) * p + .25 * Math.sin(i), .9 + p * 4.6, .3 * Math.cos(i * 2.3) * (1 - p) + .4 * Math.sin(i * 1.3 + p * 4) * p));
    sp.material.opacity = (1 - p) * klemm(p / .05) * zz(.55, 1, n) * (.6 + .4 * Math.sin(t * 17 + i * 5) ** 2); sp.scale.setScalar(zz(.09, .13, n) * (1.2 - p * .5)); });
  for (const g of c.GLANZ) g.sp.material.opacity = zz(g.tag, g.nacht, n) * (.85 + .15 * flack);
  // Rauch
  const rc = farb3(0xd8d2c4, 0xb8a090, 0x5a5e6a, n), wind = new THREE.Vector3(1.0, 0, -.35);
  for (const r of c.RAUCH) r.arr.forEach((sp, i) => { const p = ((t * (r.feuer ? .17 : .12) + i / r.arr.length + r.ph) % 1);
    sp.position.copy(r.pos).add(new THREE.Vector3(.18 * Math.sin(t * .9 + i * 2.1), p * 6.5, 0)).addScaledVector(wind, p * p * 4.2);
    sp.scale.setScalar(.5 + p * 2.4); sp.material.color.copy(r.feuer && p < .2 && n > .5 ? new THREE.Color(0x9a6a50) : rc);
    const nf = nebelF(sp.position.x, -sp.position.z, sp.position.y, nebelS, nebelC);
    sp.material.opacity = ((1 - p) * zz(.62, .45, n) + .04) * klemm(p / .08) * (1 - nf); });
  // Fenster, Licht, Nebel
  for (const f of c.FENSTERMAT) { const k = f.an ? weich((n - f.th) / .12) : 0; f.k = k; f.m.color.setHex(PAL.fenster).lerp(new THREE.Color(0xffc46a), k); }
  for (const f of c.fensterL) { const e = c.FENSTERMAT.find(x => x.m === f.fm); f.l.intensity = 7 * (e ? e.k : 0); }
  const nb = farb3(NEBEL_TAG, NEBEL_DAEMM, NEBEL_NACHT, n); c.scene.fog.color.copy(nb); c.scene.background.copy(nb);
  c.scene.fog.near = nebelS; c.scene.fog.far = nebelC;
  c.hemi.color.copy(farb3(0xfff0d2, 0xffc89a, 0x6a7cac, n)); c.hemi.groundColor.copy(farb3(0x6a6338, 0x5a4030, 0x2a2630, n)); c.hemi.intensity = n < .5 ? zz(1.45, 1.05, n * 2) : zz(1.05, .5, n * 2 - 1);
  c.sonne.color.copy(farb3(0xffe2b4, 0xff9a5a, 0x9db2e0, n)); c.sonne.intensity = n < .5 ? zz(2.9, 1.9, n * 2) : zz(1.9, .22, n * 2 - 1);
  c.sonneDir = vek3(...SONNE_DIR, n); c.sonne.shadow.radius = zz(7, 5, n);
}
function kamera(c, breite, zielU, zielW, azGrad = 0, elGrad = 31, zielY = 0) {
  const asp = innerHeight / innerWidth, h = breite * asp; Object.assign(cam, { left: -breite / 2, right: breite / 2, top: h / 2, bottom: -h / 2 }); cam.updateProjectionMatrix();
  const el = elGrad * Math.PI / 180, az = azGrad * Math.PI / 180, ziel = new THREE.Vector3(zielU, zielY, -zielW);
  const abst = Math.max(300, breite * 1.6); if (cam.far < abst * 3) { cam.far = abst * 3; cam.updateProjectionMatrix(); }   // 18.10. Fix: weite Ansicht ohne abgeschnittene Landschaft
  cam.position.copy(ziel).add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(abst)); cam.lookAt(ziel);
  c.sonne.target.position.copy(ziel); c.sonne.position.copy(ziel).add(c.sonneDir || new THREE.Vector3(...SONNE_DIR[0])); }
const feuerVersatz = b => .10 * b * (innerHeight / innerWidth) / Math.sin(31 * Math.PI / 180);

// ---------------------------------------------------------------- Ablauf (22 s)
const PL = JSON.parse(P.get("plan") || '{"s":[0.8,2.1,8.1,13.2,16.1,21.8,26.4,29.5],"e":[1.7,7.8,12.9,15.2,21.4,24.9,29.1,31.4],"dauer":35}');
const DAUER = PL.dauer;
function zustand(t) {
  const S = PL.s, E = PL.e;
  const hoch = weich((t - S[3]) / (S[4] + .8 - S[3])), zurueck = weich((t - S[6] + .2) / 2.6), weit = hoch * (1 - zurueck);
  const nah = zz(21, 15.5, weich(t / S[3])) - 1.5 * weich((t - S[6]) / (DAUER - S[6]));
  const b = zz(nah, 50, weit), el = zz(31, 43, weit);
  const n = weich((t - S[6] - .3) / (E[7] + 1 - S[6]));
  return { welt: "start", b, el, zu: zz(.4, 0, weit), zw: zz(feuerVersatz(b) * .8, 3, weit), az: -6 + 12 * t / DAUER, s: zz(.55, 1.08, weit) - .05 * n, c: 2, n, weit,
    haus: { von: S[4] + .2, bis: E[5] - .4, weg: S[6] - .1 } };
}
function vorschauBewegen(c, t, z) {
  if (!c.VORSCHAU) return; const N = c.VORSCHAU.length, { von, bis, weg } = z.haus;
  c.VORSCHAU.forEach((v, i) => { const t0 = von + i * (bis - von) / N, p = klemm((t - t0) / .75), q = klemm((t - weg - i * .09) / .9);
    v.h.visible = p > 0 && q < 1; const fall = (1 - p) ** 3 * 22, hebt = q * q * 22;
    v.h.position.y = v.h.userData.y0 + fall + hebt;
    const op = Math.min(1, p * 3) * (1 - q) * .86; v.h.traverse(o => { if (o.isMesh) o.material.opacity = op; });
    const st = klemm((t - t0 - .75) / 1.0); v.staub.forEach(({ sp, a }) => { const r = .8 + st * 2.6; sp.position.set(v.u + Math.cos(a) * r, v.h.userData.y0 + .4 + st * .6, -(v.w + Math.sin(a) * r * .8)); sp.scale.setScalar(1 + st * 2); sp.material.opacity = st > 0 && st < 1 ? .45 * (1 - st) : 0; }); }); }


// ================================================================ Haeuser-Katalog (16.10.2026)
// 12 Typen x Varianten (Seed je Follower -> unterscheidbares Haus). Gleicher Stil wie Reel v2.
const SAT = { stroh: () => mat("stroh"), schindel: () => mat("schindel"), ziegel: () => mat(0x9a4b33), moos: () => mat(0x6d7a3c), schiefer: () => mat(0x5d6068) };
const FIRST = { stroh: () => mat("strohDunkel"), schindel: () => mat("holzDunkel"), ziegel: () => mat(0x7a3524), moos: () => mat(0x55602e), schiefer: () => mat(0x44474e) };
function dach(l, b, rh, art, ueber = .5) { return giebelDach(l, b, rh, art === "stroh" ? .34 : art === "moos" ? .28 : .16, SAT[art](), ueber, FIRST[art]()); }
function umfaerben(g, von, zu) { g.traverse(o => { if (o.isMesh && o.material === von) o.material = zu; }); return g; }
function pult(l, tiefe, hHoch, hTief, m, dicke = .16) { const a = Math.atan2(hHoch - hTief, tiefe), s = Math.hypot(tiefe, hHoch - hTief) + .4;
  const p = box(l + .3, dicke, s, m, 0, (hHoch + hTief) / 2, 0); p.rotation.x = a; return p; }
function pyramide(r, h, m) { const k = mesh(new THREE.ConeGeometry(r, h, 4), m); k.rotation.y = Math.PI / 4; return k; }
function tuer(g, x, y0, z, ry = 0) { const t = box(.85, 1.55, .1, mat("holzDunkel"), x, y0 + .78, z); t.rotation.y = ry; g.add(t); }
function fenster(g, x, y, z, ry = 0) { const f = box(.5, .45, .08, mat("fenster"), x, y, z); f.rotation.y = ry; g.add(f); const l = box(.62, .08, .12, mat("holzDunkel"), x, y - .27, z); l.rotation.y = ry; g.add(l); }

const TYPEN = {
  blockhaus(v) { const g = new THREE.Group(), l = rr(4.2, 5.4), b = rr(3, 3.6), h = 2.1, art = pick(["schindel", "moos", "stroh"]);
    g.add(box(l + .3, .5, b + .3, mat("stein"), 0, -.1, 0));
    for (let i = 0; i < 8; i++) { const y = .3 + i * .26 + .13;
      for (const sz of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(.14, .14, l + .5, 6), mat(i % 2 ? "stamm" : "holz")); c.rotation.z = Math.PI / 2; c.position.set(0, y + (i % 2) * 0, sz * b / 2); g.add(c); }
      for (const sx of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(.14, .14, b + .5, 6), mat(i % 2 ? "holz" : "stamm")); c.rotation.x = Math.PI / 2; c.position.set(sx * l / 2, y + .13, 0); g.add(c); } }
    const rh = b * .55, gb = giebel(l, b, rh, mat("holz")); gb.position.y = .3 + h; g.add(gb);
    const d = dach(l, b, rh, art); d.position.y = .3 + h; g.add(d);
    tuer(g, rr(-.5, .5), .3, b / 2 + .16); fenster(g, -l / 2 - .16, 1.5, 0, Math.PI / 2);
    if (v.anbau) { const s = new THREE.Group();   // Holzschuppen an der Giebelseite: Pfosten, Pultdach, grosser Holzstapel
      for (const [x, z] of [[2.0, 1.3], [2.0, -1.3], [.2, 1.3], [.2, -1.3]]) s.add(box(.16, x > 1 ? 1.5 : 2.1, .16, mat("stamm"), x, x > 1 ? .75 : 1.05, z));
      const p = box(2.5, .14, 3.1, mat(art === "moos" ? "schindel" : art), 1.1, 1.9, 0); p.rotation.z = -.3; s.add(p);
      for (let r2 = 0; r2 < 4; r2++) for (let k = 0; k < 6 - r2; k++) { const st = mesh(new THREE.CylinderGeometry(.16, .16, 1.3, 7), mat(k % 2 ? 0xc29a64 : 0xa87e4c)); st.rotation.z = Math.PI / 2; st.position.set(2.45, .17 + r2 * .29, -1.0 + k * .36 + r2 * .18); s.add(st); }
      s.position.x = l / 2 + .15; g.add(s); }
    return g; },
  fachwerk(v) { const art = pick(["stroh", "schindel", "ziegel"]), g = haus({ l: rr(4.6, 6), b: rr(3.4, 4), h: v.hoch ? 3.4 : 2.3, dach: art === "stroh" ? "stroh" : "schindel", kamin: R() < .6 });
    if (art === "ziegel") { umfaerben(g, mat("schindel"), SAT.ziegel()); umfaerben(g, mat("holzDunkel"), mat("holzDunkel")); }
    if (v.hoch) fenster(g, 0, 2.9, 2.1);
    return g; },
  steinkate(v) { const g = haus({ l: rr(4, 5.2), b: rr(3.2, 3.8), h: 2.1, wand: "stein", dach: pick(["stroh", "schindel"]), kamin: true });
    if (v.anbau) { const a = new THREE.Group(); a.add(box(2.2, 1.7, 2.6, mat("stein"), 0, .85, 0)); const p = box(2.6, .16, 3.0, mat("schindel"), 0, 1.95, 0); p.rotation.z = .28; a.add(p); a.position.x = -3.4; g.add(a); }
    return g; },
  langhaus(v) { const g = haus({ l: rr(9, 11.5), b: rr(4.6, 5.4), h: 1.5, wand: v.putz ? "fachwerk" : "holz", dach: "stroh", kamin: false });
    EMITTER.push({ g, p: new THREE.Vector3(0, 5.2, 0) }); return g; },
  wachturm(v) { const g = new THREE.Group(), H = v.hoch ? 7.5 : 6, s = 2.6;
    if (v.holz) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.add(box(.5, .4, .5, mat("stamm"), sx * s / 2, .2, sz * s / 2)); g.add(box(.26, 1.1, .26, mat("stamm"), sx * s / 2, .55, sz * s / 2)); } else g.add(box(s + .8, 1.2, s + .8, mat("stein"), 0, .4, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.26, H, .26, mat("stamm"), sx * s / 2, 1 + H / 2, sz * s / 2));
    for (const sz of [-1, 1]) for (let k = 0; k < 2; k++) { const y = 1 + H * (.25 + k * .45), d = box(.12, Math.hypot(s, H * .4), .12, mat("holz"), 0, y, sz * s / 2); d.rotation.z = Math.atan2(s, H * .4) * (k ? 1 : -1); g.add(d); }
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const y = 1 + H * (.25 + k * .45), d = box(.12, Math.hypot(s, H * .4), .12, mat("holz"), sx * s / 2, y, 0); d.rotation.x = Math.atan2(s, H * .4) * (k ? 1 : -1); g.add(d); }
    g.add(box(s + 1.2, .22, s + 1.2, mat("holz"), 0, 1 + H, 0));
    for (const [x, z, w, d] of [[0, (s + 1.1) / 2, s + 1.2, .1], [0, -(s + 1.1) / 2, s + 1.2, .1], [(s + 1.1) / 2, 0, .1, s + 1.2], [-(s + 1.1) / 2, 0, .1, s + 1.2]]) g.add(box(w, .7, d, mat("holz"), x, 1.45 + H, z));
    const DH = v.holz ? 1.3 : 0;   // Holzturm: Dach hoeher, damit man die Wache sieht
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.16, 2.1 + DH, .16, mat("stamm"), sx * (s / 2 + .4), 2.1 + H + DH / 2, sz * (s / 2 + .4)));
    const p = pyramide((s + 1.8) / Math.SQRT2 * 1.0, 1.7, SAT[pick(["schindel", "stroh", "schiefer"])]()); p.position.y = 3.95 + H + DH; g.add(p);
    const leiter = new THREE.Group(); for (const x of [-.25, .25]) leiter.add(box(.08, H + .4, .08, mat("holz"), x, (H + .4) / 2 + .6, 0)); for (let i = 0; i < H / .45; i++) leiter.add(box(.5, .06, .06, mat("holz"), 0, 1 + i * .45, 0));
    leiter.position.z = s / 2 + .2; g.add(leiter); return g; },
  schmiede(v) { const g = haus({ l: rr(4, 4.8), b: 3.4, h: 2.2, wand: "stein", dach: v.stroh ? "stroh" : "schindel", kamin: false });
    const k = box(.9, 5.2, .9, mat("steinDunkel"), -1, 2.6, -.6); g.add(k); EMITTER.push({ g, p: new THREE.Vector3(-1, 5.3, -.6) });
    const s = new THREE.Group(); for (const [x, z] of [[1.2, 1.4], [1.2, -1.4], [3.6, 1.4], [3.6, -1.4]]) s.add(box(.2, 2.5, .2, mat("stamm"), x, 1.25, z));
    const p = box(3.0, .16, 3.4, mat(v.stroh ? "stroh" : "schindel"), 2.4, 2.6, 0); p.rotation.z = -.16; s.add(p);
    const esse = box(1.2, .9, 1.0, mat("stein"), 2.2, .45, -.6); s.add(esse); const glut = new THREE.Mesh(new THREE.BoxGeometry(.8, .06, .6), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); glut.position.set(2.2, .93, -.6); s.add(glut);
    s.add(box(.5, .5, .3, mat("steinDunkel"), 3.1, .45, .7)); s.add(box(.7, .14, .3, mat(0x3a3a40), 3.1, .75, .7)); s.add(fass().translateX(1.8).translateZ(.9));
    s.position.x = g.children[1].geometry.parameters.width / 2 - 1.2; g.add(s); return g; },
  fischerhuette(v) { const g = new THREE.Group(), l = rr(3.2, 4), b = 2.8;
    for (const x of [-l / 2 + .2, l / 2 - .2]) for (const z of [-b / 2 + .2, b / 2 - .2]) g.add(box(.18, 1.3, .18, mat("stamm"), x, .45, z));
    g.add(box(l + .4, .16, b + .4, mat("holz"), 0, 1.1, 0));
    const h = haus({ l, b, h: 1.9, wand: "holz", dach: v.stroh ? "stroh" : "schindel" }); h.children[0].visible = false; h.position.y = .85; g.add(h);
    const steg = new THREE.Group(); steg.add(box(1.2, .12, 4.2, mat("holz"), 0, .9, 2.1)); for (const z of [1, 2.4, 3.8]) for (const x of [-.5, .5]) steg.add(box(.14, 1.4, .14, mat("stamm"), x, .3, z));
    steg.position.set(l / 4, 0, b / 2); g.add(steg);
    const g2 = new THREE.Group(); for (const x of [-1, 1]) g2.add(box(.1, 1.8, .1, mat("stamm"), x, .9, 0)); g2.add(box(2.2, .08, .08, mat("holz"), 0, 1.75, 0));
    const netz = box(1.9, 1.1, .03, mat(0x8a8470), 0, 1.15, 0); netz.material = netz.material.clone(); netz.material.transparent = true; netz.material.opacity = .75; g2.add(netz);
    g2.position.set(-l / 2 - 1.4, 0, .6); g2.rotation.y = .4; g.add(g2);
    if (v.boot) { const bo = mesh(new THREE.CylinderGeometry(.55, .55, 2.6, 8, 1, false, 0, Math.PI), mat("holzDunkel")); bo.rotation.z = Math.PI / 2; bo.rotation.y = Math.PI / 2; bo.position.set(-l / 2 - .6, .45, -1.6); bo.scale.set(1, 1, .6); g.add(bo); }
    return g; },
  baumhaus(v) { const g = new THREE.Group(), H = rr(3.6, 4.4);
    const st = mesh(new THREE.CylinderGeometry(.45, .7, H + 3.5, 7), mat("stamm")); st.position.y = (H + 3.5) / 2; g.add(st);
    const fk = pick(["laub", "laub2", "laub3"]);
    for (let i = 0; i < 5; i++) { const k = mesh(new THREE.IcosahedronGeometry(rr(1.8, 2.4), 0), mat(fk)); k.position.set(rr(-1.6, 1.6), H + 3.6 + rr(-.4, 1.2), rr(-1.6, 1.6)); k.rotation.set(R() * 3, R() * 3, 0); g.add(k); }
    g.add(box(3.4, .18, 3.0, mat("holz"), .2, H, .2));
    for (const [x, z] of [[-1.4, 1.6], [1.8, 1.6], [1.8, -1.2]]) { const s = box(.12, 2.0, .12, mat("stamm"), x, H - 1, z); s.rotation.z = x > 0 ? .5 : -.5; g.add(s); }
    const h = haus({ l: 2.4, b: 2.0, h: 1.6, wand: "holz", dach: v.stroh ? "stroh" : "schindel" }); h.children[0].visible = false; h.scale.setScalar(.95); h.position.set(.4, H - .2, -.2); g.add(h);
    for (const [x, z, w, d] of [[.2, 1.65, 3.4, .08], [1.85, .2, .08, 3.0]]) g.add(box(w, .5, d, mat("holz"), x, H + .35, z));
    const le = new THREE.Group(); for (const x of [-.22, .22]) le.add(box(.07, H + .3, .07, mat("holz"), x, (H + .3) / 2, 0)); for (let i = 0; i < H / .42; i++) le.add(box(.44, .05, .05, mat("holz"), 0, .3 + i * .42, 0));
    le.position.set(-.9, 0, 2.1); le.rotation.x = -.18; g.add(le); return g; },
  jurte(v) { const g = new THREE.Group(), r = rr(2.1, 2.7), filz = pick([0xd8c8a6, 0xc2a57a, 0xb8b2a2]), band = pick([0x8a3b2a, 0x4f5f78, 0x5b6b34]);
    const w = mesh(new THREE.CylinderGeometry(r, r, 1.7, 14), mat(filz)); w.position.y = .85; g.add(w);
    const bd = mesh(new THREE.CylinderGeometry(r + .02, r + .02, .22, 14), mat(band)); bd.position.y = 1.35; g.add(bd);
    const d = mesh(new THREE.ConeGeometry(r + .25, 1.3, 14), mat(filz)); d.position.y = 2.35; g.add(d);
    const k = mesh(new THREE.CylinderGeometry(.35, .4, .25, 10), mat("holz")); k.position.y = 3.05; g.add(k);
    const t = box(.8, 1.3, .3, mat(band), 0, .65, r - .05); g.add(t); g.add(box(1.05, .12, .32, mat("holz"), 0, 1.36, r - .05));
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4, s = box(.04, 2.4, .04, mat(0x6a5a40), Math.cos(a) * (r + .9), .6, Math.sin(a) * (r + .9)); s.rotation.z = Math.cos(a) * .5; s.rotation.x = -Math.sin(a) * .5; g.add(s); }
    return g; },
  kapelle(v) { const g = new THREE.Group();
    if (v.schrein) { g.add(box(1.2, .4, 1.2, mat("stein"), 0, .2, 0)); g.add(box(.7, 1.6, .5, mat("stein"), 0, 1.2, 0)); const n = box(.4, .5, .1, mat("fenster"), 0, 1.4, .26); g.add(n);
      const d = dach(.9, .9, .45, "schindel", .15); d.position.y = 2.0; g.add(d); g.add(box(.1, .5, .1, mat(0xd8a628), 0, 2.75, 0)); g.add(box(.35, .1, .1, mat(0xd8a628), 0, 2.85, 0)); return g; }
    const l = rr(5.5, 7), b = 3.6, h = 2.9, wand = pick(["stein", "putz"]), art = pick(["schiefer", "schindel"]);
    g.add(box(l + .3, .6, b + .3, mat("stein"), 0, 0, 0)); g.add(box(l, h, b, mat(wand), 0, .3 + h / 2, 0));
    const gb = giebel(l, b, b * .85, mat(wand)); gb.position.y = .3 + h; g.add(gb); const d = dach(l, b, b * .85, art, .35); d.position.y = .3 + h; g.add(d);
    const ap = mesh(new THREE.CylinderGeometry(b / 2 - .1, b / 2 - .1, h * .85, 10, 1, false, 0, Math.PI), mat(wand)); ap.rotation.y = Math.PI / 2; ap.position.set(-l / 2, .3 + h * .42, 0); g.add(ap);
    const ad = mesh(new THREE.ConeGeometry(b / 2 + .1, 1.4, 10, 1, false, 0, Math.PI), SAT[art]()); ad.rotation.y = Math.PI / 2; ad.position.set(-l / 2, .3 + h * .85 + .7, 0); g.add(ad);
    const tu = box(1.1, 1.3, 1.1, mat(wand), l / 2 - .5, .3 + h + b * .85 + .2, 0); g.add(tu); g.add(box(.5, .55, 1.12, mat("fenster"), l / 2 - .5, .3 + h + b * .85 + .3, 0));
    const sp = pyramide(1.0, 1.8, SAT[art]()); sp.position.set(l / 2 - .5, .3 + h + b * .85 + 1.75, 0); g.add(sp);
    const tr = mesh(new THREE.CylinderGeometry(.5, .5, .12, 12, 1, false, 0, Math.PI), mat("holzDunkel")); tr.rotation.x = Math.PI / 2; tr.rotation.z = 0; tr.position.set(l / 2 + .06, .3 + 1.6, 0); tr.rotation.y = Math.PI / 2; g.add(tr);
    g.add(box(.1, 1.6, 1.0, mat("holzDunkel"), l / 2 + .05, .3 + .8, 0));
    for (const x of [-l / 4, l / 4 - .6]) { const f = box(.4, .9, .08, mat("fenster"), x, .3 + h * .6, b / 2 + .04); g.add(f); }
    return g; },
  muehle(v) { const g = new THREE.Group();
    if (v.bock) { g.add(box(2.6, 1.2, 2.6, mat("stamm"), 0, .6, 0)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const s = box(.18, 2.2, .18, mat("stamm"), x * .8, 1.6, z * .8); s.rotation.z = x * .3; g.add(s); }
      const k = new THREE.Group(); k.add(box(3.0, 3.4, 3.6, mat("holz"), 0, 4.2, 0)); const d = dach(3.0, 3.6, 1.3, "schindel", .25); d.rotation.y = Math.PI / 2; d.position.y = 5.9; k.add(d); g.add(k); }
    else { const t = mesh(new THREE.CylinderGeometry(1.5, 2.3, 6.2, 8), mat(pick(["putz", "stein"]))); t.position.y = 3.1; g.add(t);
      const c = mesh(new THREE.ConeGeometry(1.9, 1.6, 8), SAT[pick(["schindel", "stroh"])]()); c.position.y = 7.0; g.add(c); tuer(g, 0, 0, 2.15); fenster(g, 0, 4.3, 1.75); }
    const nabe = new THREE.Group(); nabe.position.set(0, v.bock ? 4.8 : 6.0, v.bock ? 1.95 : 1.85); nabe.rotation.z = rr(0, Math.PI / 2);
    nabe.add(mesh(new THREE.CylinderGeometry(.18, .18, .5, 6).rotateX(Math.PI / 2), mat("holzDunkel")));
    for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(box(.14, 4.6, .12, mat("holzDunkel"), 0, 2.3, .1));
      const tuch = box(1.0, 3.4, .03, mat(0xe2d6b8), .6, 2.8, .14); arm.add(tuch); for (let k = 0; k < 5; k++) arm.add(box(1.1, .05, .05, mat("holz"), .55, 1.2 + k * .8, .16)); nabe.add(arm); }
    g.add(nabe); return g; },
  hof(v) { const g = new THREE.Group(); const h = haus({ l: 5, b: 3.6, dach: v.ziegel ? "schindel" : "stroh", kamin: true }); if (v.ziegel) umfaerben(h, mat("schindel"), SAT.ziegel()); h.position.set(-3, 0, -1.5); g.add(h);
    const sch = new THREE.Group(); sch.add(box(6, 3.0, 4.2, mat("holz"), 0, 1.5, 0)); const gb = giebel(6, 4.2, 2.3, mat("holz")); gb.position.y = 3; sch.add(gb); const d = dach(6, 4.2, 2.3, v.ziegel ? "ziegel" : "stroh"); d.position.y = 3; sch.add(d);
    sch.add(box(2.2, 2.4, .1, mat("holzDunkel"), 0, 1.2, 2.12)); sch.rotation.y = Math.PI / 2; sch.position.set(4, 0, -.5); g.add(sch);
    const hh = heuhaufen(); hh.position.set(3.4, 0, 4.2); hh.scale.setScalar(.8); g.add(hh);
    const zp = [[-6.5, 4.5], [7, 4.5], [7, -4.8], [-6.5, -4.8]]; for (let i = 0; i < 4; i++) { const [a, b] = [zp[i], zp[(i + 1) % 4]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 1.8);
      for (let k = 0; k < n; k++) { if (i === 0 && k > n / 2 - 1 && k < n / 2 + 1) continue; const t = k / n; g.add(box(.12, 1.0, .12, mat("holz"), a[0] + (b[0] - a[0]) * t, .5, a[1] + (b[1] - a[1]) * t)); }
      for (const y of [.45, .85]) { const r = box(L, .07, .07, mat("holz"), (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); r.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); g.add(r); } }
    return g; },
};
const VARIANTEN = { holzhuette: [{}, { anbau: true }, {}], fachwerk: [{}, { hoch: true }, {}], steinkate: [{}, { anbau: true }, {}], langhaus: [{}, { putz: true }, {}],
  wachturm: [{}, { hoch: true }, {}], schmiede: [{}, { stroh: true }, {}], fischerhuette: [{}, { boot: true, stroh: true }, { boot: true }], baumhaus: [{}, { stroh: true }, {}],
  jurte: [{}, {}, {}], kapelle: [{}, { schrein: true }, {}], muehle: [{}, { bock: true }, {}], hof: [{}, { ziegel: true }, {}] };
const NAMEN = { holzhuette: "Holzhuette", fachwerk: "Fachwerkhaus", steinkate: "Steinkate", langhaus: "Langhaus", wachturm: "Wachturm", schmiede: "Schmiede",
  fischerhuette: "Fischerhuette", baumhaus: "Baumhaus", jurte: "Jurte", kapelle: "Kapelle / Schrein", muehle: "Muehle", hof: "Bauernhof" };
// Ein Haus fuer einen Follower: Typ + Seed (z. B. Hash des Namens) -> immer dasselbe, aber unterscheidbare Haus
function hausFuer(typ, seed, varIdx = seed % 3) { const alt = R; R = rng(seed * 7919 + 13); const g = TYPEN[typ](VARIANTEN[typ][varIdx]); R = alt; return g; }

// ---------------------------------------------------------------- Seiten: ?typ=NAME (Katalogzelle) | ?dorf=1
// ---------------------------------------------------------------- Wohnhaeuser (Korrektur 16.10.: Follower bekommen NUR Wohnhaeuser)
Object.assign(TYPEN, {
  holzhuette(v) { const g = haus({ l: rr(3.2, 4.2), b: rr(2.8, 3.2), h: 2.0, wand: "holz", dach: pick(["stroh", "schindel"]), kamin: R() < .4 });
    if (v.moos) umfaerben(g, mat("schindel"), SAT.moos());
    if (v.bank) { g.add(box(1.4, .12, .4, mat("holz"), 0, .55, 2.0)); for (const x of [-.55, .55]) g.add(box(.1, .45, .3, mat("stamm"), x, .3, 2.0)); }
    return g; },
  lehmkate(v) { const lehm = pick([0xb4844e, 0xa6764a, 0xc08f58]), g = haus({ l: rr(4, 5), b: rr(3.2, 3.8), h: 1.8, wand: "fachwerk", dach: "stroh", kamin: R() < .5, wandMat: mat(lehm) }); if (v.dunkel) umfaerben(g, mat("holzDunkel"), mat(0x3a2a1c));
    if (v.zaun) { for (let k = 0; k < 7; k++) g.add(box(.08, .7, .08, mat("holz"), -2.4 + k * .8, .35, 3.2)); g.add(box(5, .06, .06, mat("holz"), 0, .55, 3.2)); }
    return g; },
  verandahaus(v) { const l = rr(4.4, 5.2), b = 3.6, art = pick(["schindel", "stroh", "ziegel"]), g = haus({ l, b, h: 2.3, wand: v.putz ? "fachwerk" : "holz", dach: art === "stroh" ? "stroh" : "schindel", kamin: true });
    if (art === "ziegel") umfaerben(g, mat("schindel"), SAT.ziegel());
    const ve = new THREE.Group(); ve.add(box(l, .16, 1.7, mat("holz"), 0, .3, 0)); for (const x of [-l / 2 + .15, 0, l / 2 - .15]) ve.add(box(.16, 2.0, .16, mat("stamm"), x, 1.3, .7));
    const p = box(l + .4, .14, 2.1, SAT[art](), 0, 2.45, .15); p.rotation.x = .28; ve.add(p); ve.add(box(l - .4, .06, .06, mat("holz"), 0, .95, .78));
    ve.add(box(1.3, .1, .38, mat("holz"), -l / 4, .75, -.45)); ve.position.z = b / 2 + .85; g.add(ve); return g; },
  stelzenhaus(v) { const g = new THREE.Group(), l = rr(3.4, 4.2), b = 3.0, H = v.hoch ? 2.2 : 1.5;
    for (const x of [-l / 2 + .2, 0, l / 2 - .2]) for (const z of [-b / 2 + .2, b / 2 - .2]) { const p = box(.2, H + .3, .2, mat("stamm"), x, H / 2 - .1, z); p.rotation.z = rr(-.04, .04); g.add(p); }
    g.add(box(l + .5, .16, b + .5, mat("holz"), 0, H, 0));
    const h = haus({ l, b, h: 2.0, wand: "holz", dach: pick(["stroh", "schindel"]), kamin: R() < .5 }); h.children[0].visible = false; h.position.y = H - .25; g.add(h);
    const tr = new THREE.Group(); const n = Math.round(H / .3); for (let i = 0; i < n; i++) tr.add(box(1.0, .08, .34, mat("holz"), 0, .15 + i * .3, i * .3)); for (const x of [-.5, .5]) { const w = box(.08, .1, Math.hypot(H, n * .3), mat("stamm"), x, H / 2, n * .15); w.rotation.x = -Math.atan2(H, n * .3); tr.add(w); }
    tr.position.set(l / 4, 0, b / 2 + .25); tr.rotation.y = 0; tr.children.forEach(c => c.position.z = -c.position.z + n * .3); g.add(tr);
    return g; },
  jurte(v) { const g = new THREE.Group(), r = rr(2.2, 2.7), filz = pick([0xd8c8a6, 0xc2a57a, 0xb8b2a2]), band = pick([0x8a3b2a, 0x4f5f78, 0x5b6b34]), band2 = pick([0xc9a04a, 0xe2d6b8]);
    const w = mesh(new THREE.CylinderGeometry(r, r, 1.7, 16), mat(filz)); w.position.y = .85; g.add(w);
    for (const [y, c, hh] of [[1.38, band, .22], [1.2, band2, .06], [.25, band, .14]]) { const bd = mesh(new THREE.CylinderGeometry(r + .02, r + .02, hh, 16), mat(c)); bd.position.y = y; g.add(bd); }
    const d = mesh(new THREE.ConeGeometry(r + .3, 1.35, 16), mat(filz)); d.position.y = 2.37; g.add(d);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = box(.06, .04, r + .2, mat(band), Math.cos(a) * (r / 2 + .1), 2.4, Math.sin(a) * (r / 2 + .1)); s.rotation.y = -a + Math.PI / 2; s.rotation.x = .78; s.lookAt(new THREE.Vector3(0, 3.0, 0)); g.add(s); }
    const k = mesh(new THREE.CylinderGeometry(.38, .42, .22, 10), mat("holz")); k.position.y = 3.06; g.add(k);
    const ro = mesh(new THREE.CylinderGeometry(.08, .08, .9, 6), mat(0x4a4a50)); ro.position.set(.2, 3.4, .1); g.add(ro);
    const tf = new THREE.Group(); tf.add(box(1.1, 1.45, .2, mat(0xa8452e), 0, .73, 0)); tf.add(box(1.3, .14, .26, mat(band2), 0, 1.5, 0)); for (const x of [-.6, .6]) tf.add(box(.12, 1.5, .26, mat(band2), x, .75, 0));
    tf.add(box(.7, .06, .08, mat(band2), 0, .9, .12)); tf.position.z = r - .02; g.add(tf);
    g.add(box(1.6, .04, 1.0, mat(pick([0x8a3b2a, 0x6a4a7a, 0x4f5f78])), .2, .03, r + .9));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3, s = box(.03, 2.6, .03, mat(0x6a5a40), Math.cos(a) * (r + 1.0), .7, Math.sin(a) * (r + 1.0)); s.rotation.z = Math.cos(a) * .55; s.rotation.x = -Math.sin(a) * .55; g.add(s);
      const pf = box(.08, .3, .08, mat("stamm"), Math.cos(a) * (r + 1.65), .12, Math.sin(a) * (r + 1.65)); g.add(pf); }
    if (v.extra) { const f = fass(); f.position.set(-r - .3, 0, .8); g.add(f); const kb = mesh(new THREE.CylinderGeometry(.3, .25, .3, 8), mat("heu")); kb.position.set(-r - .2, .15, 1.6); g.add(kb); }
    return g; },
  doppelhaus(v) { const l = rr(7, 8.5), b = 3.8, g = haus({ l, b, h: 2.3, wand: v.holz ? "holz" : "fachwerk", dach: pick(["stroh", "schindel"]), kamin: false });
    g.children.filter(c => c.isMesh && Math.abs(c.position.z - (b / 2 + .05)) < .01 && c.geometry.parameters.height > 1.4).forEach(c => c.position.x = -l / 4);
    tuer(g, l / 4, .35, b / 2 + .05); g.add(box(.2, 2.4, b + .1, mat("holzDunkel"), 0, 1.5, 0));
    for (const x of [-l / 4 - 1.1, l / 4 + 1.1]) fenster(g, x, 1.75, b / 2 + .06);
    for (const x of [-l / 2 + .9, l / 2 - .9]) { const k = box(.55, 2.2, .55, mat("stein"), x, 2.35 + b * .31, -b / 6); g.add(k); EMITTER.push({ g, p: new THREE.Vector3(x, 3.5 + b * .31, -b / 6) }); }
    for (const x of [-l / 4 + .65, l / 4 + .65]) g.add(box(.42, .22, .05, mat(0xc9a04a), x, 2.15, b / 2 + .1));   // Namensschilder (2 Bewohner)
    return g; },
  langhaus(v) { const n = v.n || 3, l = 2.9 * n + 1, b = rr(4.8, 5.4), g = haus({ l, b, h: 1.6, wand: v.putz ? "fachwerk" : "holz", dach: "stroh", kamin: false });
    g.children.filter(c => c.isMesh && Math.abs(c.position.z - (b / 2 + .05)) < .01 && c.geometry.parameters.height > 1.4).forEach(c => c.visible = false);
    for (let i = 0; i < n; i++) { const x = -l / 2 + .5 + 2.9 * (i + .5); tuer(g, x, .35, b / 2 + .05); g.add(box(.42, .22, .05, mat(0xc9a04a), x + .65, 1.85, b / 2 + .1));   // je Bewohner Tuer + Namensschild
      if (i) g.add(box(.18, 1.6, .1, mat("holzDunkel"), x - 1.45, 1.15, b / 2 + .08)); }
    for (let i = 0; i < Math.ceil(n / 2); i++) EMITTER.push({ g, p: new THREE.Vector3(-l / 2 + .5 + 5.8 * (i + .5), 1.95 + b * .62, 0) });
    return g; },
});
Object.assign(VARIANTEN, { blockhaus: [{}, { anbau: true }, { anbau: true }], holzhuette: [{}, { bank: true }, { moos: true, bank: true }], lehmkate: [{}, { zaun: true }, { dunkel: true }],
  verandahaus: [{}, { putz: true }, {}], stelzenhaus: [{}, { hoch: true }, {}], jurte: [{}, { extra: true }, { extra: true }], doppelhaus: [{}, { holz: true }, {}],
  langhaus: [{ n: 3, putz: true }, { n: 2 }, { n: 4 }], fischerhuette: [{}, { boot: true, stroh: true }, { boot: true }] });
// Gruppen: Follower bekommen nur WOHNEN (je 1 Name) bzw. GETEILT (2-4 Namen); ARBEIT nur fuer Meilensteine/Wuensche, nie zufaellig an Follower
const WOHNEN = ["holzhuette", "blockhaus", "fachwerk", "steinkate", "lehmkate", "verandahaus", "stelzenhaus", "fischerhuette", "baumhaus", "jurte"];
const GETEILT = { doppelhaus: [2, 2], langhaus: [2, 4] };
const ARBEIT = ["schmiede", "muehle", "hof", "wachturm", "kapelle"];
function wohnhausFuer(seed) { const typ = WOHNEN[seed % WOHNEN.length]; return { typ, haus: hausFuer(typ, Math.floor(seed / WOHNEN.length)) }; }
window.__gruppen = { WOHNEN, GETEILT: Object.keys(GETEILT), ARBEIT };


// ================================================================ Dorf-Bauten aus Wuenschen + Berufe (17.10.2026), gemeinsam fuer Reel und Weltkarte
// BAUTEN[typ]() -> Gruppe; g.userData.stufen = {fundament, waende, dach, rest} (fuer Zeitraffer: bauStufe(g, p 0..1)); g.userData.kamin = lokaler Rauchpunkt
const bergArbeiter = (g, x, z, ry, tuch, hacke = true) => { const m = new THREE.Group(), t = mat(tuch);   // 19.10.: feste Arbeiterfigur (Bergmann/Steinmetz), immer sichtbar
  for (const dx of [-.11, .11]) m.add(box(.16, .75, .18, mat(0x4a3a2a), dx, .38, 0)); m.add(box(.46, .7, .3, t, 0, 1.1, 0)); const kopf = mesh(new THREE.IcosahedronGeometry(.19, 0), mat(PAL.haut)); kopf.position.y = 1.62; m.add(kopf);
  const helm = mesh(new THREE.SphereGeometry(.21, 8, 5, 0, 6.283, 0, 1.5), mat(0x8a6a3a)); helm.position.y = 1.7; m.add(helm);
  const arm = box(.13, .62, .14, t, .31, 1.3, .15); arm.rotation.x = -1.6; m.add(arm); m.add(box(.13, .62, .14, t, -.31, 1.1, 0));
  if (hacke) { const st = box(.05, 1.1, .05, mat("stamm"), .31, 1.65, .7); st.rotation.x = -.5; m.add(st); const kp = box(.5, .08, .08, mat(0x777777), .31, 2.1, .95); m.add(kp); }
  m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar(1.1); g.add(m); };
const BAUTEN = {
  holzfaellerhuette() {
    const g = new THREE.Group(), l = 4.6, b = 3.6, h = 2.1, st = { fundament: [], waende: [], dach: [], rest: [] };
    const teil = (k, o) => { st[k].push(o); g.add(o); return o; };
    teil("fundament", box(l + .4, .5, b + .4, mat("stein"), 0, .0, 0));
    for (let i = 0; i < 8; i++) { const y = .3 + i * .26 + .13;
      for (const sz of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(.14, .14, l + .5, 6), mat(i % 2 ? "stamm" : "holz")); c.rotation.z = Math.PI / 2; c.position.set(0, y, sz * b / 2); teil("waende", c); }
      for (const sx of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(.14, .14, b + .5, 6), mat(i % 2 ? "holz" : "stamm")); c.rotation.x = Math.PI / 2; c.position.set(sx * l / 2, y + .13, 0); teil("waende", c); } }
    teil("waende", box(.85, 1.5, .12, mat("holzDunkel"), -.6, 1.05, b / 2 + .16)); teil("waende", box(.55, .45, .1, mat("fenster"), 1.2, 1.5, b / 2 + .16));
    const rh = b * .55, gb = giebel(l, b, rh, mat("holz")); gb.position.y = .3 + h; teil("dach", gb);
    const d = dach(l, b, rh, "schindel"); d.position.y = .3 + h; teil("dach", d);
    teil("dach", box(.55, rh + 1.4, .55, mat("stein"), -l / 2 + .7, .3 + h + (rh + 1.4) / 2 - .3, -b / 5)); g.userData.kamin = new THREE.Vector3(-l / 2 + .7, .3 + h + rh + 1.2, -b / 5);
    // Holzstapel unter Pultdach, Hackklotz mit Axt, Saegebock
    const s = new THREE.Group(); for (const [x, z] of [[0, 1.4], [0, -1.4], [1.9, 1.4], [1.9, -1.4]]) s.add(box(.16, x ? 1.5 : 2.0, .16, mat("stamm"), x, x ? .75 : 1.0, z));
    const p = box(2.4, .14, 3.2, mat("schindel"), .95, 1.85, 0); p.rotation.z = -.25; s.add(p); s.position.x = l / 2 + .2; teil("rest", s);
    const stapel = new THREE.Group(); stapel.position.set(l / 2 + 1.1, 0, 0); g.add(stapel); g.userData.stapel = stapel; st.rest.push(stapel);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6 - r; k++) { const c = mesh(new THREE.CylinderGeometry(.16, .16, 1.2, 7), mat(k % 2 ? 0xc29a64 : 0xa87e4c)); c.rotation.x = Math.PI / 2; c.position.set(-.8 + k * .33 + r * .16, .17 + r * .29, 0); stapel.add(c); }
    const extra = []; for (let k = 0; k < 6; k++) { const c = mesh(new THREE.CylinderGeometry(.16, .16, 1.2, 7), mat(k % 2 ? 0xc29a64 : 0xa87e4c)); c.rotation.x = Math.PI / 2; c.position.set(-.64 + (k % 3) * .33 + Math.floor(k / 3) * .16, .17 + (3 + Math.floor(k / 3)) * .29, 0); c.visible = false; stapel.add(c); extra.push(c); }
    g.userData.stapelExtra = extra;
    const kl = new THREE.Group(); kl.add(mesh(new THREE.CylinderGeometry(.35, .4, .55, 8), mat("stamm"))); kl.children[0].position.y = .27;
    const axt = box(.07, .9, .07, mat("holz"), .1, .85, 0); axt.rotation.z = -.5; kl.add(axt); kl.add(box(.06, .22, .3, mat("steinDunkel"), .32, 1.18, 0)); kl.position.set(1.0, 0, b / 2 + 1.4); teil("rest", kl);
    for (const [x, z] of [[-2.8, 2.6], [3.6, 3.0], [-3.4, -2.2]]) { const sp = mesh(new THREE.CylinderGeometry(.3, .38, .35, 7), mat("stamm")); sp.position.set(x, .17, z); teil("rest", sp); }
    g.userData.stufen = st; return g; },
  bauplatz(a = 3.4) {   // abgesteckter, leerer Platz: 4 Pfloecke, Schnur, Erde (a = halbe Seitenlaenge; Wunsch-Platz 3.4, Hausplatz ~2.3)
    const g = new THREE.Group();
    g.add(box(2 * a, .06, 2 * a, mat(0x9b7b4e), 0, .02, 0));
    for (const [x, z] of [[-a, -a], [a, -a], [a, a], [-a, a]]) { g.add(box(.16, 1.0, .16, mat("holz"), x, .5, z)); g.add(box(.2, .12, .2, mat(0xc8402a), x, .95, z)); }
    for (const [x, z, w, d] of [[0, -a, 2 * a, .04], [0, a, 2 * a, .04], [-a, 0, .04, 2 * a], [a, 0, .04, 2 * a]]) g.add(box(w, .04, d, mat(0xe8dcc0), x, .7, z));
    const sch = box(.9, .6, .07, mat(0xd9b77a), a - .3, .85, a + .5); g.add(sch); g.add(box(.1, .9, .1, mat("stamm"), a - .3, .45, a + .45));
    return g; },
  taverne(gd = {}) {   // 18.10.: Taverne — Fachwerk, Wirtshausschild mit Krug, Faesser, Tische + Baenke draussen, Fenster leuchten abends
    const g = new THREE.Group(); const h = haus({ l: 7.2, b: 5.0, h: 2.7, wand: "fachwerk", dach: "stroh", kamin: true, licht: true }); g.add(h);
    const arm = box(1.2, .1, .1, mat("holzDunkel"), 3.9, 2.6, 2.7); g.add(arm); const tafel = box(.08, .7, .9, mat(0xc9a04a), 4.4, 2.15, 2.7); g.add(tafel);
    const krug = mesh(new THREE.CylinderGeometry(.18, .16, .32, 8), mat(0xe8dcc0)); krug.position.set(4.46, 2.15, 2.7); g.add(krug);
    for (const [x, z] of [[-4.1, 1.6], [-4.1, .6], [-4.1, -.4], [4.1, -1.2]]) { const f = fass(); f.position.set(x, 0, z); g.add(f); }
    for (const x of [-1.8, 1.8]) { g.add(box(2.0, .1, .9, mat("holz"), x, .78, 4.2)); g.add(box(.12, .74, .7, mat("holzDunkel"), x - .8, .37, 4.2)); g.add(box(.12, .74, .7, mat("holzDunkel"), x + .8, .37, 4.2));
      for (const dz of [-.85, .85]) { g.add(box(2.0, .08, .32, mat("holz"), x, .46, 4.2 + dz)); g.add(box(.1, .44, .28, mat("holzDunkel"), x, .22, 4.2 + dz)); }
      for (const dx of [-.5, .5]) { const k = mesh(new THREE.CylinderGeometry(.07, .06, .16, 7), mat(0xe8dcc0)); k.position.set(x + dx, .91, 4.2); g.add(k); } }
    g.userData.sitze = [[-2.5, 3.35], [-1.1, 3.35], [-2.5, 5.05], [-1.1, 5.05], [1.1, 3.35], [2.5, 3.35], [1.1, 5.05], [2.5, 5.05]];
    if (gd.klein) g.scale.setScalar(.82); return g; },
  grosseschmiede() {   // 18.10.: grosse Schmiede — Steinhaus, offene Werkstatt mit 2 Essen, Blasebalg, 2 Ambosse, Erz + Holz
    const g = new THREE.Group(), L = 8, T = 5;
    g.add(box(L + .6, .5, T + 3.6, mat("stein"), 0, .0, .9));
    const hs = haus({ l: L, b: T, h: 2.6, wand: "stein", dach: "schindel", kamin: false }); g.add(hs);
    for (const x of [-2.4, 2.4]) { g.add(box(.9, 6.2, .9, mat("steinDunkel"), x, 3.1, -1.2)); EMITTER.push({ g, p: new THREE.Vector3(x, 6.3, -1.2) }); }
    const dachV = box(L + .4, .14, 3.6, mat("schindel"), 0, 2.5, T / 2 + 1.7); dachV.rotation.x = .18; g.add(dachV);
    for (const x of [-L / 2, -L / 6, L / 6, L / 2]) g.add(box(.22, 2.4, .22, mat("stamm"), x, 1.2, T / 2 + 3.2));
    for (const x of [-2.4, 2.4]) { g.add(box(1.4, 1.0, 1.1, mat("stein"), x, .5, T / 2 + 1.0));
      const gl = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, .7), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); gl.position.set(x, 1.03, T / 2 + 1.0); g.add(gl);
      const bb = box(.7, .35, .5, mat("holzDunkel"), x - 1.2, .55, T / 2 + 1.0); bb.rotation.z = .3; g.add(bb);   // Blasebalg
      g.add(box(.45, .5, .3, mat("steinDunkel"), x + .3, .25, T / 2 + 2.5)); g.add(box(.75, .15, .32, mat(0x3a3a40), x + .3, .55, T / 2 + 2.5)); }   // Amboss
    for (let i = 0; i < 9; i++) { const e = mesh(new THREE.DodecahedronGeometry(rr(.28, .45), 0), mat(i % 3 ? 0x6a6a72 : 0x8a5a3a)); e.position.set(-L / 2 - 1.3 + rr(-.6, .6), .25 + (i > 5 ? .35 : 0), T / 2 + rr(-.6, 2.2)); g.add(e); }   // Erzhaufen
    const hz = holzstapel(3); hz.position.set(L / 2 + 1.4, 0, T / 2 + 1.2); hz.rotation.y = Math.PI / 2; g.add(hz);
    g.add(box(1.6, .5, .6, mat("holz"), 0, .25, T / 2 + 3.6));   // Wassertrog
    return g; },
  gemeinschaftsfeld(gd = {}) {   // 18.10. Upgrade Tag 3: gemeinsames Feld — Zustand gepfluegt / gruen / reif, niedriger Zaun (ca. 22 x 16 m), optional Vogelscheuche
    const g = new THREE.Group(), lx = 22, lz = 16, zu = gd.zustand || "saat";
    g.add(box(lx, .08, lz, mat("acker"), 0, .02, 0));
    for (let i = 0; i < 14; i++) g.add(box(lx * .94, .12, .32, mat(i % 2 ? "ackerHell" : "erdeDunkel"), 0, .08, -lz / 2 + (i + .5) * lz / 14));
    const reihen = zu === "gepfluegt" ? 0 : zu === "saat" ? 5 : 14, farbe = zu === "reif" ? 0xd9b04a : 0x6f9a3e, hoch = zu === "reif" ? .75 : zu === "gruen" ? .45 : .28;
    for (let i = 0; i < reihen; i++) g.add(box(lx * .9, hoch, .4, mat(farbe), 0, hoch / 2 + .06, -lz / 2 + (i + .5) * lz / 14));   // Saatreihen (eine Reihe = ein Mesh)
    if (gd.vogelscheuche) { const v = new THREE.Group(); v.add(box(.1, 2.2, .1, mat("holzDunkel"), 0, 1.1, 0)); v.add(box(1.4, .08, .08, mat("holzDunkel"), 0, 1.7, 0));
      v.add(box(.5, .7, .3, mat(0x8a3b2a), 0, 1.5, 0)); const kp = mesh(new THREE.IcosahedronGeometry(.2, 0), mat("heu")); kp.position.y = 2.1; v.add(kp);
      const hut = mesh(new THREE.ConeGeometry(.32, .3, 7), mat("heu")); hut.position.y = 2.35; v.add(hut); v.position.set(2, 0, 1.5); g.add(v); }
    const pf = (x, z) => g.add(box(.14, .8, .14, mat("holzDunkel"), x, .4, z));
    for (let k = 0; k <= 11; k++) { const x = -lx / 2 - .4 + k * (lx + .8) / 11; pf(x, -lz / 2 - .4); pf(x, lz / 2 + .4); }
    for (let k = 1; k < 8; k++) { const z = -lz / 2 - .4 + k * (lz + .8) / 8; pf(-lx / 2 - .4, z); pf(lx / 2 + .4, z); }
    for (const sz of [-1, 1]) { g.add(box(lx + .8, .08, .06, mat("holz"), 0, .62, sz * (lz / 2 + .4))); }
    for (const sx of [-1, 1]) { g.add(box(.06, .08, lz + .8, mat("holz"), sx * (lx / 2 + .4), .62, 0)); }
    return g; },
  brunnen() { return brunnen(); },   // 18.10. abends: Dorf 2
  holzstapel() { return holzstapel(3); },
  garten() { const g = new THREE.Group(); g.add(box(3.2, .12, 2.4, mat("erdeDunkel"), 0, .06, 0));   // kleiner Gemuesegarten mit Flechtzaun
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) { const k_ = mesh(new THREE.IcosahedronGeometry(.2 + R() * .08, 0), mat(r === 1 ? "laub2" : "laub")); k_.position.set(-1.2 + k * .6, .22, -.75 + r * .75); k_.scale.y = .7; g.add(k_); }
    for (const [x, z, l, ry] of [[0, 1.35, 3.6, 0], [0, -1.35, 3.6, 0], [1.75, 0, 2.7, Math.PI / 2], [-1.75, .45, 1.8, Math.PI / 2]]) { const f = box(l, .45, .07, mat("holz"), x, .25, z); f.rotation.y = ry; g.add(f); }
    return g; },
  wachposten() { const g = new THREE.Group();   // 19.10.: kleiner Torposten am Hauptweg (Dorf 2/3)
    for (const [x, z] of [[-.9, -.9], [.9, -.9], [-.9, .9], [.9, .9]]) g.add(box(.18, 2.4, .18, mat("stamm"), x, 1.2, z));
    g.add(box(2.3, .14, 2.3, mat("holz"), 0, .3, 0)); const d = pyramide(1.75, 1.0, mat("schindel")); d.position.y = 2.4; g.add(d);
    g.add(box(.08, 3.6, .08, mat("holzDunkel"), 1.3, 1.8, 0)); g.add(box(.7, .45, .03, mat(0xb03a2e), 1.65, 3.2, 0)); return g; },
  fischerhuette(gd) {   // 19.10. Tag 4 P1: Fischerhuette mit Steg, Boot, Netz-Gestell (Katalog) + Fischtrocken-Gestell; Steg zeigt zum Bach (rot im Patch)
    const g = hausFuer("fischerhuette", gd.seed || 4711, 2);
    const tr = new THREE.Group(); for (const x of [-.9, .9]) tr.add(box(.1, 1.6, .1, mat("stamm"), x, .8, 0)); tr.add(box(2.0, .07, .07, mat("holz"), 0, 1.55, 0));
    for (let i = 0; i < 5; i++) { const f = box(.08, .38, .14, mat(0x9aa6a8), -.7 + i * .35, 1.3, 0); tr.add(f); }
    tr.position.set(2.6, 0, -1.4); tr.rotation.y = -.5; g.add(tr);
    if (gd.ober) { const m = new THREE.Group(), tuch = mat(0x3f5a6a);   // Oberfischer am Stegende mit Angel
      for (const x of [-.11, .11]) m.add(box(.16, .75, .18, mat(0x4a3a2a), x, .38, 0)); m.add(box(.46, .7, .3, tuch, 0, 1.1, 0)); for (const x of [-.31, .31]) m.add(box(.13, .62, .14, tuch, x, 1.1, 0));
      const kopf = mesh(new THREE.IcosahedronGeometry(.19, 0), mat(PAL.haut)); kopf.position.y = 1.62; m.add(kopf); const hut = mesh(new THREE.CylinderGeometry(.32, .32, .06, 8), mat(0xc8a860)); hut.position.y = 1.78; m.add(hut);
      const angel = box(.04, 3.2, .04, mat("stamm"), .3, 2.0, .9); angel.rotation.x = .75; m.add(angel); const schnur = box(.01, 2.2, .01, mat(0xe8e4d8), .3, 1.1, 2.0); m.add(schnur);
      m.scale.setScalar(1.1); const lx = (g.userData.l || 3.6) / 4; m.position.set(.9, 1.0, 4.6); g.add(m); g.userData.oberP = new THREE.Vector3(.9, 3.2, 4.6); }
    gd._g = g; return g; },
  jaegerhuette(gd) {   // 19.10.: Jaegerhuette am Waldrand — Blockhuette, Hochsitz, Wildgestell, Felle, Bogen
    const g = new THREE.Group(); const h = haus({ l: 3.6, b: 3.0, h: 2.0, wand: "holz", dach: "schindel", kamin: true }); g.add(h);
    const hs = new THREE.Group(); for (const x of [-.7, .7]) for (const z of [-.7, .7]) hs.add(box(.14, 3.6, .14, mat("stamm"), x, 1.8, z));
    hs.add(box(1.8, .1, 1.8, mat("holz"), 0, 3.6, 0)); for (const [x, z, w, d] of [[0, .85, 1.8, .06], [0, -.85, 1.8, .06], [.85, 0, .06, 1.8]]) hs.add(box(w, .6, d, mat("holz"), x, 3.95, z));
    const dach = pyramide(1.5, .8, mat("schindel")); dach.position.y = 4.9; hs.add(dach); for (const x of [-.25, .25]) hs.add(box(.06, 3.7, .06, mat("holz"), x, 1.85, -1.1)); for (let i = 0; i < 8; i++) hs.add(box(.5, .05, .05, mat("holz"), 0, .4 + i * .44, -1.1));
    hs.position.set(4.2, 0, -1.5); g.add(hs);
    const wg = new THREE.Group(); for (const x of [-1, 1]) wg.add(box(.12, 2.0, .12, mat("stamm"), x, 1.0, 0)); wg.add(box(2.2, .1, .1, mat("stamm"), 0, 1.95, 0));
    const reh = box(.35, 1.0, .5, mat(0x8a5a32), -.3, 1.35, 0); wg.add(reh); for (let i = 0; i < 3; i++) wg.add(box(.6, .7, .04, mat([0x7a5030, 0x9a7a50, 0x5a4028][i]), .2 + i * .25, 1.4, .1 + i * .05));
    wg.position.set(-3.0, 0, 1.2); wg.rotation.y = .3; g.add(wg);
    const bogen = mesh(new THREE.TorusGeometry(.7, .04, 4, 10, Math.PI), mat("holzDunkel")); bogen.position.set(1.9, .9, 1.65); bogen.rotation.z = Math.PI / 2; g.add(bogen);
    return g; },
  hexenhuette(gd) {   // 19.10. v2 (Anthony „nachbessern“): eigene krumme Hexenhuette am Waldrand — eingesunkenes Moosdach, schiefer Schornstein mit Rauch,
    // verwittertes dunkles Holz, schiefe Tuer, rundes Fenster mit gruenem Schimmer, Baeume/Pilze/Steine drumherum, umzaeunter Kraeutergarten, Kessel + Katze
    const g = new THREE.Group(), L = 3.6, B = 3.0, H = 2.0, holz = mat(0x3e3128), holz2 = mat(0x2e241e), moos = mat(0x4a5a2a), moos2 = mat(0x3a4a24);
    g.add(box(L + .3, .5, B + .3, mat("steinDunkel"), 0, .1, 0));
    const wand = new THREE.Group(); for (let i = 0; i < 6; i++) { const b = box(L, .36, B, i % 2 ? holz : holz2, (i % 2 ? .05 : -.05), .55 + i * .34, 0); wand.add(b); }
    wand.rotation.z = .04; g.add(wand);
    const dach = new THREE.Group();   // eingesunkenes Satteldach aus zwei geknickten Haelften je Seite
    for (const sg of [-1, 1]) for (const [k, dx, dz] of [[0, -.9, 0], [1, .9, .12]]) { const t = box(L / 2 + .55, .16, B / 2 + .65, k ? moos : moos2, dx, 0, sg * (B / 4 + .15)); t.rotation.x = sg * (.62 + k * .12); t.position.y = 2.75 - k * .12; dach.add(t); }
    dach.add(box(L + .9, .14, .3, moos, 0, 3.15, 0)); dach.rotation.z = -.07; g.add(dach);
    for (let i = 0; i < 6; i++) { const m = mesh(new THREE.IcosahedronGeometry(.16 + (i % 3) * .05, 0), moos); m.position.set(-1.5 + i * .6, 2.9 - (i % 2) * .2, (i % 2 ? .7 : -.7)); m.scale.y = .45; g.add(m); }
    const sch = box(.55, 1.9, .55, mat("steinDunkel"), 1.2, 3.1, -.5); sch.rotation.z = -.22; sch.rotation.x = .08; g.add(sch); EMITTER.push({ g, p: new THREE.Vector3(1.45, 4.1, -.42), hexe: true });
    const tuer = box(.8, 1.4, .08, mat(0x24190f), -.6, 1.05, B / 2 + .04); tuer.rotation.z = .1; g.add(tuer);
    const fenster = mesh(new THREE.CircleGeometry(.28, 12), new THREE.MeshBasicMaterial({ color: 0x7aff6a })); fenster.position.set(.8, 1.75, B / 2 + .05); g.add(fenster);
    const rahmen = mesh(new THREE.TorusGeometry(.3, .05, 4, 12), holz2); rahmen.position.copy(fenster.position); g.add(rahmen);
    // Kessel (bleibt), Kraeuterbuendel unter der Traufe
    const kessel = mesh(new THREE.CylinderGeometry(.5, .38, .6, 9), mat(0x222222)); kessel.position.set(2.6, .45, 1.6); g.add(kessel);
    for (const x of [-.6, .6]) { const b2 = box(.06, 1.2, .06, mat("stamm"), 2.6 + x, .6, 1.6); b2.rotation.z = x * .4; g.add(b2); }
    const brei = mesh(new THREE.CircleGeometry(.42, 9), new THREE.MeshBasicMaterial({ color: 0x6aff5a })); brei.rotation.x = -Math.PI / 2; brei.position.set(2.6, .76, 1.6); g.add(brei);
    g.add(mesh(new THREE.CylinderGeometry(.25, .35, .2, 7), new THREE.MeshBasicMaterial({ color: 0xff8a30 }))).position.set(2.6, .1, 1.6);
    for (let i = 0; i < 5; i++) g.add(box(.12, .4, .12, mat([0x6a7a3a, 0x8a6a3a, 0x5a6a2a][i % 3]), -1.4 + i * .5, 1.95, B / 2 + .25));
    // Kraeutergarten mit Flechtzaun
    const gt = new THREE.Group(); gt.add(box(2.6, .1, 2.0, mat("erdeDunkel"), 0, .05, 0));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const pf = mesh(new THREE.IcosahedronGeometry(.16, 0), mat([0x5a7a3a, 0x7a6a9a, 0x6a8a4a][r])); pf.position.set(-.9 + k * .6, .2, -.6 + r * .6); pf.scale.y = .8; gt.add(pf); }
    for (const [x, z, l, ry] of [[0, 1.05, 2.8, 0], [0, -1.05, 2.8, 0], [1.35, 0, 2.1, Math.PI / 2], [-1.35, 0, 2.1, Math.PI / 2]]) { const f = box(l, .4, .06, holz2, x, .22, z); f.rotation.y = ry; f.rotation.z = .04; gt.add(f); }
    gt.position.set(-3.2, 0, 1.0); g.add(gt);
    // Waldrand: dunkle Tannen + knorrige Laubbaeume, Pilze, Steine
    const tanne = (x, z, s) => { const t = new THREE.Group(); t.add(box(.2, 1.0, .2, mat("stamm"), 0, .5, 0)); for (let i = 0; i < 3; i++) { const c = mesh(new THREE.ConeGeometry(1.3 - i * .35, 1.5, 6), mat(0x23361f)); c.position.y = 1.4 + i * .9; t.add(c); } t.scale.setScalar(s); t.position.set(x, 0, z); g.add(t); };
    const knorrig = (x, z, s) => { const t = new THREE.Group(); const st = box(.32, 2.2, .32, mat(0x3a2a1c), 0, 1.1, 0); st.rotation.z = .2; t.add(st); const ast = box(.14, 1.2, .14, mat(0x3a2a1c), .5, 1.9, 0); ast.rotation.z = -.9; t.add(ast);
      for (const [a, b, c] of [[.2, 2.6, 0], [.9, 2.3, .3], [-.3, 2.3, -.4]]) { const k = mesh(new THREE.IcosahedronGeometry(.75, 0), mat(0x3f4a24)); k.position.set(a, b, c); t.add(k); } t.scale.setScalar(s); t.position.set(x, 0, z); g.add(t); };
    tanne(-4.2, -2.6, 1.15); tanne(-2.2, -4.0, 1.3); tanne(3.8, -3.4, 1.05); tanne(-5.6, -.6, .95); knorrig(4.6, -1.0, 1.1); knorrig(-1.0, -4.6, 1.0); knorrig(5.4, 2.4, .9);
    for (let i = 0; i < 9; i++) { const a = i * 1.7, rr_ = 3.4 + (i % 3) * .8, x = Math.cos(a) * rr_, z = Math.sin(a) * rr_; if (z > 1.2 && x > 1.5 && x < 3.6) continue;
      const pz = new THREE.Group(); pz.add(box(.06, .18, .06, mat(0xe8e0c8), 0, .09, 0)); const hut = mesh(new THREE.SphereGeometry(.13, 6, 4, 0, 6.283, 0, 1.6), mat(i % 2 ? 0xb02a20 : 0x8a6a3a)); hut.position.y = .19; pz.add(hut); pz.position.set(x, 0, z); g.add(pz); }
    for (let i = 0; i < 6; i++) { const st = mesh(new THREE.DodecahedronGeometry(.22 + (i % 3) * .1, 0), mat("steinDunkel")); st.position.set(Math.cos(i * 2.3) * 4.4, .1, Math.sin(i * 2.3) * 3.9); st.scale.y = .6; g.add(st); }
    // Katze + Figur (bleiben)
    const katz = new THREE.Group(), sw2 = mat(0x151515); const kk = mesh(new THREE.IcosahedronGeometry(.2, 0), sw2); kk.scale.set(1.5, .8, .8); kk.position.y = .25; katz.add(kk);
    const kp = mesh(new THREE.IcosahedronGeometry(.13, 0), sw2); kp.position.set(.28, .4, 0); katz.add(kp); for (const z of [-.06, .06]) { const o = mesh(new THREE.ConeGeometry(.05, .12, 4), sw2); o.position.set(.29, .55, z); katz.add(o); }
    const sw3 = box(.04, .4, .04, sw2, -.32, .45, 0); sw3.rotation.z = .5; katz.add(sw3); katz.position.set(.2, .52, B / 2 + .55); katz.rotation.y = 1.2; g.add(katz);
    const m = new THREE.Group(), tuch = mat(0x3a2a4a); for (const x of [-.11, .11]) m.add(box(.16, .75, .18, mat(0x2a2028), x, .38, 0));
    const rock = mesh(new THREE.ConeGeometry(.4, 1.3, 7), tuch); rock.position.y = .75; m.add(rock); for (const x of [-.3, .3]) m.add(box(.13, .6, .14, tuch, x, 1.15, 0));
    const kopf = mesh(new THREE.IcosahedronGeometry(.18, 0), mat(PAL.haut)); kopf.position.y = 1.58; m.add(kopf); const hh = mesh(new THREE.ConeGeometry(.3, .75, 7), mat(0x2a1a34)); hh.position.y = 2.0; hh.rotation.z = .2; m.add(hh);
    const krempe = mesh(new THREE.CylinderGeometry(.42, .42, .04, 9), mat(0x2a1a34)); krempe.position.y = 1.68; m.add(krempe);
    m.scale.setScalar(1.1); m.position.set(1.7, 0, 2.3); m.rotation.y = -.9; g.add(m); g.userData.hexeP = new THREE.Vector3(1.7, 3.5, 2.3);
    gd._g = g; GLANZ.push({ sp: glanz(new THREE.Vector3(0, 0, 0), 0x6aff5a, 2.4, .35), tag: .35, nacht: .7, hexe: gd }); return g; },
  ruestungsstaender() {   // 19.10. Tag 4 P2: Ruestungsstaender des Plattner (Armorsmith) neben der Schmiede
    const g = new THREE.Group(), metall = mat(0x9aa0a8), dunkel = mat(0x5a5e66);
    for (const x of [-.7, .7]) { const st = new THREE.Group(); st.add(box(.1, 1.6, .1, mat("stamm"), 0, .8, 0)); st.add(box(.6, .08, .08, mat("stamm"), 0, 1.3, 0));
      const brust = box(.5, .62, .28, metall, 0, 1.15, 0); st.add(brust); st.add(box(.52, .12, .3, dunkel, 0, .82, 0));
      const helm = mesh(new THREE.SphereGeometry(.2, 8, 6, 0, 6.283, 0, 1.7), metall); helm.position.y = 1.72; st.add(helm); st.position.x = x; g.add(st); }
    const schild = mesh(new THREE.CylinderGeometry(.42, .42, .06, 10), mat(0x7a2a22)); schild.rotation.x = Math.PI / 2 - .3; schild.position.set(0, .45, .5); g.add(schild);
    return g; },
  stall_klein(gd) {   // 19.10.: kleiner Pferdestall mit Koppel und 2 Pferden (Stable master)
    const g = new THREE.Group(); const h = haus({ l: 4.4, b: 3.2, h: 2.2, wand: "holz", dach: "stroh" }); h.position.set(-3.2, 0, -1.2); g.add(h);
    const heu = box(1.2, .7, .9, mat("stroh"), -.4, .35, -2.6); g.add(heu);
    for (const [x, z, l, ry] of [[2.0, 3.2, 7, 0], [2.0, -3.2, 7, 0], [5.5, 0, 6.4, Math.PI / 2], [-1.5, 1.8, 2.8, Math.PI / 2]]) { const f = new THREE.Group(); for (let i = 0; i <= Math.round(l / 1.6); i++) f.add(box(.12, 1.0, .12, mat("stamm"), -l / 2 + i * l / Math.round(l / 1.6), .5, 0)); for (const y of [.45, .85]) f.add(box(l, .08, .08, mat("holz"), 0, y, 0)); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f); }
    const pferd = (fell, x, z, ry, grasen) => { const p = new THREE.Group(), m = mat(fell), dk = mat(0x2a1e16);
      const k = box(1.5, .62, .55, m, 0, 1.15, 0); p.add(k); for (const [lx, lz] of [[.55, .2], [.55, -.2], [-.55, .2], [-.55, -.2]]) p.add(box(.14, .9, .14, m, lx, .45, lz));
      const hals = box(.3, .8, .32, m, .78, 1.55, 0); hals.rotation.z = grasen ? -1.9 : -.55; p.add(hals); const kopf = box(.55, .28, .26, m, grasen ? 1.15 : 1.08, grasen ? .55 : 1.95, 0); kopf.rotation.z = grasen ? -1.1 : -.25; p.add(kopf);
      const mahne = box(.08, .7, .1, dk, .66, 1.75, 0); mahne.rotation.z = -.55; if (!grasen) p.add(mahne); const sw = box(.1, .7, .1, dk, -.8, .95, 0); sw.rotation.z = .4; p.add(sw);
      p.position.set(x, 0, z); p.rotation.y = ry; g.add(p); };
    const n = gd.pferde || 2, fells = [0x7a4a28, 0xe8e0d0, 0x3a2a1c, 0x9a7a50, 0x5a3a20, 0xc8b8a0];
    if (n <= 2) { pferd(0x7a4a28, 2.2, .9, .4, false); pferd(0xe8e0d0, 3.4, -1.3, 2.3, true); }
    else for (let i = 0; i < n; i++) pferd(fells[i % fells.length], .2 + (i % 3) * 1.9 + (Math.floor(i / 3) % 2) * .6, -2.2 + Math.floor(i / 3) * 1.6, .4 + i * 1.3, i % 3 === 1);
    const trog = box(1.4, .35, .45, mat("holzDunkel"), .6, .2, -2.5); g.add(trog);
    return g; },
  schneiderbank() {   // 19.10.: Werkbank des Schneiders vor der Huette — Stoffballen, Schere, Garnrollen
    const g = new THREE.Group(); g.add(box(1.8, .1, .8, mat("holz"), 0, .85, 0)); for (const x of [-.8, .8]) for (const z of [-.3, .3]) g.add(box(.1, .85, .1, mat("stamm"), x, .42, z));
    const farben = [0x8a2a3a, 0x2a4a7a, 0xd8c890, 0x3a6a3a];
    farben.forEach((f, i) => { const b = mesh(new THREE.CylinderGeometry(.18, .18, .7, 10), mat(f)); b.rotation.z = Math.PI / 2; b.position.set(-.5 + (i % 2) * .5, 1.08 + Math.floor(i / 2) * .3, -.15 + (i % 2) * .05); g.add(b); });
    const tuch = box(.8, .02, .6, mat(0xb07a9a), .45, .91, .05); tuch.rotation.y = .3; g.add(tuch);
    for (let i = 0; i < 3; i++) { const sp = mesh(new THREE.CylinderGeometry(.05, .05, .12, 6), mat(farben[i])); sp.position.set(.6 + i * .12, .97, -.25); g.add(sp); }
    const pupp = new THREE.Group(); pupp.add(box(.06, 1.2, .06, mat("stamm"), 0, .6, 0)); const torso = mesh(new THREE.CylinderGeometry(.22, .18, .6, 8), mat(0x6a3a5a)); torso.position.y = 1.35; pupp.add(torso); pupp.position.set(1.4, 0, .1); g.add(pupp);
    return g; },
  mine(gd) {   // 19.10. spät (v3): Stolleneingang im Felsmassiv — graue Felswand mit Bändern, Rahmen bündig eingelassen, Tunnel mit Tiefe, Schotter-Vorplatz, Schienen zur Abraumhalde
    const g = new THREE.Group(), holz = mat("holz"), hd = mat("holzDunkel"), stein = mat("stein"), FG = [0x8a877f, 0x7b7871, 0x6e6b65, 0x625f5a], fm = FG.map(c => mat(c));
    const R = rng(Math.round(Math.abs(gd.u * 7 + gd.w * 13)) + 11), OW = 2.6, OH = 3.0, MW = 7.5;   // Öffnung (m), Massiv-Halbbreite
    // Felsmassiv: drei Stufen nach hinten, Front aus Felsbändern (unterschiedlich tief/grau), seitlich + oben unregelmäßige Blöcke
    for (const [z0, z1, top] of [[0, -3.2, 6.9], [-3.2, -6.4, 8.0], [-6.4, -9.8, 9.1]]) {
      for (const sx of [-1, 1]) { const tp = top + (z0 === 0 ? 0 : (R() - .5) * 1.4); g.add(box(MW - OW / 2 - .35, tp, z0 - z1, fm[(z0 === 0 ? 1 : 2)], sx * (OW / 2 + .35 + (MW - OW / 2 - .35) / 2), tp / 2, (z0 + z1) / 2)); }
      g.add(box(OW + .7, top - OH - .3, z0 - z1, fm[2], 0, OH + .3 + (top - OH - .3) / 2, (z0 + z1) / 2)); }
    for (let i = 0; i < 9; i++) { const yb = i * .78, t = .25 + R() * .35;   // Bänder an der Front (links/rechts der Öffnung, über dem Rahmen)
      for (const sx of [-1, 1]) { const w = MW - OW / 2 - .5 - R() * 1.2; g.add(box(w, .7, t, fm[(i + (sx > 0 ? 1 : 0)) % 4], sx * (OW / 2 + .45 + w / 2), yb + .35, t / 2 - R() * .1)); }
      if (yb > OH + .2) g.add(box(OW + 1.0, .7, t, fm[i % 4], (R() - .5) * .4, yb + .35, t / 2)); }
    for (let i = 0; i < 34; i++) { const f = mesh(new THREE.DodecahedronGeometry(.7 + R() * 1.1, 0), fm[i % 4]); const sx = i % 2 ? 1 : -1;   // Kanten/Krone: bricht die Stufen
      if (i < 10) f.position.set(sx * (MW + .2 - R() * .8), .4 + R() * 6, -R() * 9);
      else { const st = [[0, 6.9], [-3.2, 8.0], [-6.4, 9.1], [-9.8, 9.1]][i % 4]; f.position.set((R() * 2 - 1) * MW, st[1] - .2 + R() * .5, st[0] - .3 + (R() - .5) * 1.2); f.scale.set(1.4, .55, 1); }
      f.rotation.set(R() * 3, R() * 3, R() * 3); f.scale.set(1, .7 + R() * .3, 1); g.add(f); }
    for (let i = 0; i < 6; i++) { const f = mesh(new THREE.DodecahedronGeometry(.5 + R() * .6, 0), fm[(i + 1) % 4]); f.position.set((i % 2 ? 1 : -1) * (MW + 1 + R() * 2.5), .3, .4 + R() * 1.2); f.scale.y = .7; g.add(f); }   // Geröll am Wandfuß
    // Tunnel mit Tiefe (unbeleuchtet, nach hinten dunkler) + innere Stützrahmen
    const TL = 9.2, NS = 6;
    for (let k = 0; k < NS; k++) { const z = -(k + .5) * TL / NS, f = 1 - k / NS, c = new THREE.Color(0x4a443d).multiplyScalar(.05 + .5 * f * f), ci = new THREE.Color(0x3a352f).multiplyScalar(.04 + .45 * f * f);
      const mw = new THREE.MeshBasicMaterial({ color: c }), mi = new THREE.MeshBasicMaterial({ color: ci });
      for (const sx of [-1, 1]) g.add(box(.3, OH, TL / NS + .02, mw, sx * (OW / 2 + .1), OH / 2, z)); g.add(box(OW + .4, .3, TL / NS + .02, mi, 0, OH + .1, z)); g.add(box(OW, .05, TL / NS + .02, mi, 0, .03, z)); }
    g.add(box(OW + .4, OH + .4, .1, new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, OH / 2, -TL));
    for (const z of [-2.4, -5.0]) { const mh = new THREE.MeshBasicMaterial({ color: z < -3 ? 0x2a2018 : 0x4a3626 }); for (const sx of [-1, 1]) g.add(box(.22, OH - .1, .22, mh, sx * (OW / 2 - .15), (OH - .1) / 2, z)); g.add(box(OW, .24, .26, mh, 0, OH - .2, z)); }
    g.add(box(.16, .22, .16, new THREE.MeshBasicMaterial({ color: 0xd89a4a }), .9, 2.2, -3.4));   // Laterne innen
    // Rahmen bündig in der Wand: Stützen + Kappholz + Schild, Laterne
    for (const sx of [-1, 1]) g.add(box(.36, OH + .2, .4, holz, sx * (OW / 2 + .1), (OH + .2) / 2, .05)); g.add(box(OW + 1.1, .42, .46, holz, 0, OH + .3, .05)); g.add(box(.9, .4, .06, hd, 0, OH + .3, .3));
    g.add(box(.08, .5, .08, mat("stamm"), OW / 2 + .45, 2.7, .35)); g.add(box(.24, .32, .24, new THREE.MeshBasicMaterial({ color: 0xffc46a }), OW / 2 + .45, 2.35, .4));
    // Vorplatz aus Schotter/Erde, Schienen aus dem Tunnel, Prellbock, Lore an der Abraumhalde
    g.add(box(13.6, .12, 10.5, mat(0x84745c), 0, .05, 5.25)); g.add(box(2.0, .13, 3.2, mat(0x6e604c), 0, .06, 11.6));
    for (let i = 0; i < 40; i++) { const st = mesh(new THREE.DodecahedronGeometry(.08 + R() * .14, 0), i % 3 ? stein : mat("steinDunkel"), false); st.position.set((R() * 2 - 1) * 6.2, .12, .5 + R() * 9.5); g.add(st); }
    for (const x of [-.45, .45]) g.add(box(.07, .07, TL + 8.2, mat(0x6a6a6a), x, .14, (8 - TL) / 2)); for (let i = 0; i < 18; i++) g.add(box(1.3, .08, .22, hd, 0, .1, -TL + .4 + i * (TL + 7.6) / 17));
    g.add(box(1.4, .5, .3, hd, 0, .3, 8.3));
    const lore = (x, z, voll) => { const l = new THREE.Group(); l.add(box(1.0, .55, 1.3, mat(0x5a4a3a), 0, .55, 0)); for (const [lx, lz] of [[-.45, -.4], [.45, -.4], [-.45, .4], [.45, .4]]) { const rr = mesh(new THREE.CylinderGeometry(.16, .16, .08, 8), mat(0x3a3a3a)); rr.rotation.z = Math.PI / 2; rr.position.set(lx, .22, lz); l.add(rr); }
      if (voll) for (let i = 0; i < 5; i++) { const st = mesh(new THREE.DodecahedronGeometry(.2 + (i % 3) * .06, 0), stein); st.position.set(-.25 + (i % 3) * .25, .9, -.3 + Math.floor(i / 3) * .5); l.add(st); } l.position.set(x, .08, z); g.add(l); };
    lore(0, -1.6, true); lore(0, 6.6, true);
    const halde = mesh(new THREE.ConeGeometry(2.6, 1.9, 7), mat(0x7d756a)); halde.position.set(3.7, .95, 7.4); halde.scale.z = .8; g.add(halde);
    for (let i = 0; i < 10; i++) { const st = mesh(new THREE.DodecahedronGeometry(.25 + R() * .25, 0), i % 2 ? stein : mat("steinDunkel")); st.position.set(3.7 + Math.cos(i * 2.1) * (1.5 + R()), .25, 7.4 + Math.sin(i * 2.1) * 1.4); g.add(st); }
    bergArbeiter(g, 1.9, 3.6, .5, 0x6a5a40); bergArbeiter(g, -2.0, 5.2, -.6, 0x5a4a3a, false);
    g.userData.festeHoehe = hoehe(gd.u, gd.w) + bergH(gd.u, gd.w) - .02; return g; },
  steinbruch(gd) {   // Steinbruch an der Nordflanke: gestapelte Quader, Hebekran (A-Gestell), Werkbank, Schubkarre
    const g = new THREE.Group(), q = mat(0xb8ae94), q2 = mat(0x9a917a), holz = mat("holz");
    for (let i = 0; i < 14; i++) g.add(box(1.1, .55, .7, i % 3 ? q : q2, -3.5 + (i % 4) * 1.15, .3 + Math.floor(i / 4) * .56, 1.5 + (i % 2) * .1));
    for (let i = 0; i < 8; i++) g.add(box(.9, .5, .9, i % 2 ? q : q2, 2.4 + (i % 2) * 1.0, .25 + Math.floor(i / 2) * .5, 2.6 + (i % 3) * .2));
    for (const s of [-1, 1]) { const b = box(.2, 4.6, .2, holz, s * 1.1, 2.2, -1.2); b.rotation.z = s * .26; g.add(b); } g.add(box(.18, .18, 3.2, holz, 0, 4.4, -.4));
    g.add(box(.04, 2.6, .04, mat(0xe8dcc0), 0, 3.1, 1.0)); g.add(box(.9, .45, .6, q, 0, 1.6, 1.0));
    g.add(box(2.0, .1, .8, holz, -1.0, .85, 4.2)); for (const x of [-1.8, -.2]) g.add(box(.1, .85, .1, holz, x, .42, 4.2));
    bergArbeiter(g, -1.0, 3.2, .3, 0x7a6a50); bergArbeiter(g, 1.8, 3.6, -.5, 0x5a6a50); bergArbeiter(g, -2.6, 2.6, 1.2, 0x6a5a5a, false);
    const sk = new THREE.Group(); sk.add(box(.8, .3, .6, mat(0x6a5a4a), 0, .5, 0)); sk.add(box(.06, .06, 1.2, holz, .3, .45, .7)); sk.add(box(.06, .06, 1.2, holz, -.3, .45, .7)); sk.position.set(3.4, 0, 5.0); g.add(sk);
    g.userData.festeHoehe = hoehe(gd.u, gd.w) + bergH(gd.u, gd.w); return g; },
  gasthaus(gd) {   // 19.10. abends: Gasthaus fuer Besucher (Upgrade Tag 4 Part 3, most ♥ „we need an inn“) — zweistoeckiges Fachwerk, Wirtshausschild, Gaststall mit Pferden, Anbindebalken, Laternen, Baenke
    const g = new THREE.Group(), holz = mat("holz"), hd = mat("holzDunkel");
    const h1 = haus({ l: 8, b: 5.2, h: 2.4, wand: "stein", dach: "schindel" }); h1.children.forEach(c => { if (c.position.y > 2.6) c.visible = false; }); g.add(h1);
    const h2 = haus({ l: 8.4, b: 5.6, h: 2.3, wand: "fachwerk", dach: "schindel", kamin: true, licht: true }); h2.position.y = 2.75; g.add(h2);
    g.add(box(8.6, .22, 5.8, hd, 0, 2.9, 0));   // Geschossbalken
    const arm = box(1.4, .1, .1, hd, 4.6, 3.6, 2.2); g.add(arm); const sch = box(.06, .8, 1.0, mat(0xc89a4a), 5.15, 3.05, 2.2); g.add(sch); g.add(box(.07, .5, .5, mat(0x7a3a1a), 5.2, 3.05, 2.2));
    for (const x of [-3.2, 3.2]) g.add(box(.2, .3, .2, mat(0xffc46a), x, 2.3, 2.75));
    for (const [x, z] of [[-2.2, 3.6], [2.0, 3.6]]) { g.add(box(2.2, .12, .5, holz, x, .5, z)); for (const dx of [-.9, .9]) g.add(box(.1, .5, .4, hd, x + dx, .25, z)); }
    const st = new THREE.Group(); for (const [x, z] of [[0, 0], [3.6, 0], [0, 3.2], [3.6, 3.2]]) st.add(box(.2, 2.4, .2, mat("stamm"), x, 1.2, z));   // offener Gaststall
    const pd = box(4.2, .14, 3.8, mat("schindel"), 1.8, 2.45, 1.6); pd.rotation.x = .12; st.add(pd); st.add(box(1.0, .6, .8, mat("heu"), 3.0, .3, .5));
    const pferd = (fell, x, z, ry) => { const p = new THREE.Group(), m = mat(fell); p.add(box(1.5, .62, .55, m, 0, 1.15, 0)); for (const [lx, lz] of [[.55, .2], [.55, -.2], [-.55, .2], [-.55, -.2]]) p.add(box(.14, .9, .14, m, lx, .45, lz));
      const hl = box(.3, .8, .32, m, .78, 1.55, 0); hl.rotation.z = -.55; p.add(hl); const kp = box(.55, .28, .26, m, 1.08, 1.95, 0); kp.rotation.z = -.25; p.add(kp); p.position.set(x, 0, z); p.rotation.y = ry; st.add(p); };
    pferd(0x7a4a28, 1.0, 1.0, .1); pferd(0x3a2a1c, 2.4, 2.3, .1); st.position.set(5.6, 0, -1.6); g.add(st);
    g.add(box(3.2, .1, .1, hd, 5.0, .95, 3.8)); for (const x of [3.5, 6.5]) g.add(box(.12, 1.0, .12, hd, x, .5, 3.8));   // Anbindebalken
    gd._g = g; return g; },
  fischerei(gd) {   // 19.10. abends: Fischerei fuer @harlem_horsfall2011 (Zusage per DM) — Fischerhaus, langer Steg mit Boot, 2 Netzgestelle, Fischkoerbe, Raeucherhuette mit Rauch, Fishery master am Stegende
    const g = new THREE.Group(), holz = mat("holz"), hd = mat("holzDunkel"), fisch = mat(0x9aa6a8);
    const h = haus({ l: 6.2, b: 4.2, h: 2.3, wand: "holz", dach: "schindel", kamin: false }); h.position.set(-1.5, 0, -1.5); g.add(h);
    const stegL = Math.max(6, (gd.steg || 8)); for (let i = 0; i < Math.round(stegL / .5); i++) g.add(box(1.6, .1, .44, i % 2 ? holz : hd, 1.8, .55, 1.2 + i * .5));
    for (let i = 0; i <= stegL / 2; i++) for (const x of [1.1, 2.5]) g.add(box(.16, 1.5, .16, mat("stamm"), x, .1, 1.3 + i * 2));
    const boot = mesh(new THREE.CylinderGeometry(.6, .6, 3.0, 8, 1, false, 0, Math.PI), hd); boot.rotation.z = Math.PI / 2; boot.rotation.y = Math.PI / 2; boot.scale.set(1, 1, .6); boot.position.set(3.4, .25, 1.2 + stegL * .7); g.add(boot);
    for (const [x, z] of [[-5.0, 1.6], [-5.0, 4.0]]) { const n = new THREE.Group(); for (const dx of [-1.1, 1.1]) n.add(box(.1, 1.9, .1, mat("stamm"), dx, .95, 0)); n.add(box(2.4, .08, .08, holz, 0, 1.85, 0));
      const netz = box(2.1, 1.2, .03, mat(0x8a8470), 0, 1.2, 0); netz.material = netz.material.clone(); netz.material.transparent = true; netz.material.opacity = .7; n.add(netz); n.position.set(x, 0, z); n.rotation.y = .3; g.add(n); }
    const tr = new THREE.Group(); for (const x of [-.9, .9]) tr.add(box(.1, 1.6, .1, mat("stamm"), x, .8, 0)); tr.add(box(2.0, .07, .07, holz, 0, 1.55, 0)); for (let i = 0; i < 6; i++) tr.add(box(.08, .38, .14, fisch, -.75 + i * .3, 1.3, 0)); tr.position.set(-2.4, 0, 2.6); g.add(tr);
    for (const [x, z] of [[.2, 1.4], [.8, 2.0], [-.4, 2.2]]) { const k = mesh(new THREE.CylinderGeometry(.35, .28, .45, 9, 1, true), mat("stroh")); k.material = k.material.clone(); k.material.side = THREE.DoubleSide; k.position.set(x, .23, z); g.add(k);
      for (let i = 0; i < 3; i++) g.add(box(.09, .07, .3, fisch, x - .1 + i * .1, .42, z)); }
    const rh = new THREE.Group(); rh.add(box(1.8, 1.7, 1.6, mat(0x5a4a3a), 0, .85, 0)); const dp = pyramide(1.45, .9, mat("schindel")); dp.position.y = 2.15; rh.add(dp); rh.add(box(.5, .9, .5, mat("steinDunkel"), .4, 2.4, -.3));
    rh.position.set(3.6, 0, -2.8); g.add(rh); EMITTER.push({ g, p: new THREE.Vector3(4.0, 3.0, -3.1) });
    if (gd.meister) { const m = new THREE.Group(), tuch = mat(0x2f4a5a);
      for (const x of [-.11, .11]) m.add(box(.16, .75, .18, mat(0x3a2e24), x, .38, 0)); m.add(box(.46, .7, .3, tuch, 0, 1.1, 0)); for (const x of [-.31, .31]) m.add(box(.13, .62, .14, tuch, x, 1.1, 0));
      const kopf = mesh(new THREE.IcosahedronGeometry(.19, 0), mat(PAL.haut)); kopf.position.y = 1.62; m.add(kopf); const hut = mesh(new THREE.CylinderGeometry(.34, .34, .06, 8), mat(0xc8a860)); hut.position.y = 1.78; m.add(hut);
      const angel = box(.04, 3.4, .04, mat("stamm"), .3, 2.1, .9); angel.rotation.x = .75; m.add(angel); m.add(box(.01, 2.4, .01, mat(0xe8e4d8), .3, 1.1, 2.1));
      m.scale.setScalar(1.1); m.position.set(1.8, .6, 1.2 + stegL - .6); g.add(m); g.userData.meisterP = new THREE.Vector3(1.8, 3.0, 1.2 + stegL - .6); }
    gd._g = g; return g; },
  kaserne(gd) {   // 20.10.: Upgrade Part 4 (most ♥: @olrdyesmaj „A barracks for soldiers to train“, 41♥) — Langhaus aus Stein + Holz, Übungsplatz mit Zaun, Strohpuppen, Waffenständer, Zielscheibe, Banner; Soldaten mit Selbstbezug im Hof
    const g = new THREE.Group(), holz = mat("holz"), hd = mat("holzDunkel"), stroh = mat("stroh"), eisen = mat(0x8a8a8a), rot = mat(0x8a2a2a);
    const h = haus({ l: 11, b: 5, h: 2.6, wand: "stein", dach: "schindel", kamin: true }); h.position.set(0, 0, -4.2); g.add(h);
    g.add(box(1.4, 2.0, .12, hd, 0, 1.35, -1.62)); for (const x of [-3.5, 3.5]) g.add(box(.9, .7, .1, mat(0x2a2420), x, 1.9, -1.62));   // Tor + Fenster
    const ban = new THREE.Group(); ban.add(box(.12, 5.2, .12, mat("stamm"), 0, 2.6, 0)); const tuch = box(1.1, 1.5, .04, rot, .6, 4.4, 0); ban.add(tuch); ban.add(box(.5, .5, .05, mat(0xd8b040), .6, 4.4, .03)); ban.position.set(-6.2, 0, -1.2); g.add(ban);
    for (let i = 0; i < 14; i++) { const x = -6.5 + i, z = 6.6; g.add(box(.1, .9, .1, mat("stamm"), x, .45, z)); }   // Zaun vorn (Mitte offen)
    g.add(box(5.6, .08, .08, holz, -3.7, .75, 6.6)); g.add(box(5.6, .08, .08, holz, 3.7, .75, 6.6));
    for (const x of [-6.6, 6.6]) { for (let i = 0; i < 8; i++) g.add(box(.1, .9, .1, mat("stamm"), x, .45, -1.2 + i)); g.add(box(.08, .08, 8, holz, x, .75, 2.3)); }
    g.add(box(12.6, .04, 7.6, mat(0x8a7656), 0, .03, 2.7));   // gestampfter Übungsplatz
    for (const [x, z] of [[-4.2, 1.6], [-2.4, 1.6], [4.6, 1.0]]) { const p = new THREE.Group(); p.add(box(.12, 1.7, .12, mat("stamm"), 0, .85, 0)); const k = mesh(new THREE.CylinderGeometry(.3, .26, .9, 7), stroh); k.position.y = 1.35; p.add(k);
      const kp = mesh(new THREE.IcosahedronGeometry(.2, 0), stroh); kp.position.y = 1.98; p.add(kp); p.add(box(.9, .1, .1, holz, 0, 1.5, 0)); p.position.set(x, 0, z); g.add(p); }
    const rack = new THREE.Group(); rack.add(box(2.2, .1, .3, holz, 0, 1.4, 0)); rack.add(box(2.2, .1, .3, holz, 0, .4, 0)); for (const x of [-1, 1]) rack.add(box(.1, 1.6, .1, mat("stamm"), x, .8, 0));
    for (let i = 0; i < 6; i++) { const sp = box(.04, 2.0, .04, mat("stamm"), -.8 + i * .32, 1.0, .05); sp.rotation.z = .08; rack.add(sp); rack.add(box(.07, .22, .03, eisen, -.8 + i * .32 + .08, 2.05, .05)); }
    rack.position.set(5.4, 0, -1.0); rack.rotation.y = -Math.PI / 2; g.add(rack);
    const ziel = new THREE.Group(); const sch = mesh(new THREE.CylinderGeometry(.6, .6, .15, 14), stroh); sch.rotation.x = Math.PI / 2; sch.position.y = 1.2; ziel.add(sch);
    const ring = mesh(new THREE.CylinderGeometry(.3, .3, .16, 14), rot); ring.rotation.x = Math.PI / 2; ring.position.y = 1.2; ziel.add(ring); for (const x of [-.35, .35]) { const b = box(.08, 1.4, .08, mat("stamm"), x, .6, -.2); b.rotation.x = -.25; ziel.add(b); }
    ziel.position.set(4.6, 0, 4.6); ziel.rotation.y = -.5; g.add(ziel);
    for (const [x, z] of [[2.0, -1.2], [2.6, -1.1]]) { const f = mesh(new THREE.CylinderGeometry(.3, .3, .7, 9), hd); f.position.set(x, .35, z); g.add(f); }
    const soldat = (x, z, ry, farbe, cmd) => { const m = new THREE.Group(), t = mat(farbe);
      for (const dx of [-.11, .11]) m.add(box(.16, .75, .18, mat(0x3a3028), dx, .38, 0)); m.add(box(.48, .72, .32, t, 0, 1.1, 0)); m.add(box(.5, .1, .34, mat(0x5a4030), 0, .8, 0));
      const kopf = mesh(new THREE.IcosahedronGeometry(.19, 0), mat(PAL.haut)); kopf.position.y = 1.62; m.add(kopf); const helm = mesh(new THREE.SphereGeometry(.22, 8, 5, 0, 6.283, 0, 1.5), eisen); helm.position.y = 1.7; m.add(helm);
      const arm = box(.13, .62, .14, t, .31, 1.3, .15); arm.rotation.x = -1.2; m.add(arm); m.add(box(.13, .62, .14, t, -.31, 1.1, 0));
      if (cmd) { const um = box(.56, .9, .06, rot, 0, 1.05, -.2); m.add(um); const sw = box(.05, .9, .05, eisen, .31, 1.75, .55); sw.rotation.x = -.9; m.add(sw); }
      else { const sp = box(.05, 2.2, .05, mat("stamm"), .31, 1.4, .45); sp.rotation.x = -.35; m.add(sp); m.add(box(.06, .25, .06, eisen, .31, 2.45, .85)); m.add(box(.08, .55, .45, hd, -.4, 1.1, .1)); }
      m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar(1.1); g.add(m); return m; };
    const leute = gd.leute || [], plaetze = [[-4.2, 3.0, Math.PI], [-2.4, 3.0, Math.PI], [4.0, 2.2, Math.PI * .8], [-0.6, 4.4, Math.PI], [1.4, 4.4, Math.PI], [-3.2, 5.2, Math.PI], [3.0, 5.4, Math.PI * .9], [0.4, 2.6, Math.PI]];
    g.userData.leuteP = []; let k = 0;
    const sortiert = [...leute].sort((a, b) => (/commander|leader|master/i.test(b.rolle) ? 1 : 0) - (/commander|leader|master/i.test(a.rolle) ? 1 : 0));
    for (const l of sortiert) { const cmd = /commander|leader|master/i.test(l.rolle), P = cmd ? [0, .4, 0] : plaetze[k++ % plaetze.length];
      if (cmd && g.userData.leuteP.some(q => q.cmd)) { const Q = plaetze[k++ % plaetze.length]; P[0] = Q[0]; P[1] = Q[1]; }
      soldat(P[0], P[1], cmd ? 0 : P[2], cmd ? 0x3a3a5a : [0x6a2a2a, 0x2a3a5a, 0x4a4a2a][k % 3], cmd);
      g.userData.leuteP.push({ h: l.h, rolle: l.rolle, cmd, p: new THREE.Vector3(P[0], 2.6, P[1]) }); }
    if (!leute.length) { soldat(-4.2, 3.0, Math.PI, 0x6a2a2a); soldat(-2.4, 3.0, Math.PI, 0x2a3a5a); }
    gd._g = g; return g; },
  holzturm(gd) {   // 18.10. abends: Holz-Wachturm (Turmplatz), oben steht die Turmwache
    const g = TYPEN.wachturm({ holz: true }), H = 6;
    if (gd.wache) { const m = new THREE.Group(), y0 = 1 + H + .11, tuch = mat([0x5b4a3a, 0x3f5a6a, 0x6a3f3a, 0x4a5a32][(gd.wache.length) % 4]);   // eigene kleine Figur (mensch() wird vom Alltag gesteuert)
      for (const x of [-.11, .11]) m.add(box(.16, .75, .18, mat(0x4a3a2a), x, .38, 0)); m.add(box(.46, .7, .3, tuch, 0, 1.1, 0)); for (const x of [-.31, .31]) m.add(box(.13, .62, .14, tuch, x, 1.1, 0));
      const kopf = mesh(new THREE.IcosahedronGeometry(.19, 0), mat(PAL.haut)); kopf.position.y = 1.62; m.add(kopf); const helm = mesh(new THREE.ConeGeometry(.22, .26, 7), mat(0x8a8a86)); helm.position.y = 1.8; m.add(helm);
      m.scale.setScalar(1.15); m.position.set(.2, y0, .2); m.rotation.y = .6; g.add(m);
      const sp = box(.05, 2.1, .05, mat("stamm"), .32, 1 + H + 1.05, .1); g.add(sp); g.add(box(.09, .22, .05, mat(0xb8b8b0), .32, 1 + H + 2.2, .1)); }
    return g; },
  bruecke() {   // 18.10. Stadtplan: Holzbruecke ueber den Bach (quer zum Fluss, Laengsachse = z), Deck auf Hoehe 0
    const g = new THREE.Group(), L = 10, B = 2.6;
    for (let i = 0; i < 16; i++) { const p = box(B, .16, L / 16 - .04, mat(i % 2 ? "holz" : "holzDunkel"), 0, .3, -L / 2 + (i + .5) * L / 16); g.add(p); }
    for (const sx of [-1, 1]) { g.add(box(.18, .18, L, mat("holzDunkel"), sx * (B / 2 - .1), .16, 0)); g.add(box(.1, .1, L, mat("holz"), sx * (B / 2), 1.15, 0));
      for (let i = 0; i <= 5; i++) { const z = -L / 2 + i * L / 5; g.add(box(.12, .9, .12, mat("holzDunkel"), sx * (B / 2), .75, z)); g.add(box(.26, 1.8, .26, mat("stamm"), sx * (B / 2 - .2), -.6, z)); } }
    g.userData.festeHoehe = .05; return g; },
  beerenbusch() { const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const k = mesh(new THREE.IcosahedronGeometry(rr(.6, .85), 0), mat(i % 2 ? "laub" : "laub2")); k.position.set(rr(-.5, .5), .55 + rr(0, .25), rr(-.5, .5)); k.scale.y = .8; g.add(k); }
    for (let i = 0; i < 22; i++) { const b = mesh(new THREE.IcosahedronGeometry(.07, 0), mat(0xb0283a)); const a = R() * 6.28, r = rr(.55, .95); b.position.set(Math.cos(a) * r, rr(.35, 1.1), Math.sin(a) * r); g.add(b); }
    return g; },
};
// ==== ZUSAGEN-1810:BAUTEN (patches/zusagen_1810.py) — Steinhuette fuers erste Paar, Wachhaus, Weide mit Stall, Wassermuehle ====
const ZUS = { raeder: [], falke: null, herde: null, pos: {} };
const ZL2W = (gd, x, z) => { const r = gd.rot || 0; return [gd.u + x * Math.cos(r) + z * Math.sin(r), gd.w + x * Math.sin(r) - z * Math.cos(r)]; };   // Gebaeude-lokal (x, z) -> Welt (u, w)
VARIANTEN.steinhaus_paar = [{}, { links: true }, {}];   // Variante = Seite des Erdbeergartens (aus bewohner.json haeuser_geteilt.var)
Object.assign(TYPEN, {
  steinhaus_paar(v) {   // gemeinsame Steinhuette: Schieferdach, Kamin, Vordach, Fensterlaeden, Erdbeergarten mit Mauer
    const g = new THREE.Group(), l = 5.8, b = 4.3, h = 2.6, y0 = .35, rh = b * .56, sx = v.links ? -1 : 1;
    const stein = mat("stein"), sd = mat("steinDunkel"), hd = mat("holzDunkel"), ho = mat("holz");
    g.add(box(l + .5, .6, b + .5, sd, 0, 0, 0));
    g.add(box(l, h, b, stein, 0, y0 + h / 2, 0));
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) g.add(box(.5, h + .05, .5, sd, ex * l / 2, y0 + h / 2, ez * b / 2));
    const gb = giebel(l, b, rh, stein); gb.position.y = y0 + h; g.add(gb);
    const d = dach(l, b, rh, "schiefer", .5); d.position.y = y0 + h; g.add(d);
    for (const ez of [-1, 1]) g.add(box(l + .9, .16, .2, hd, 0, y0 + h + .1, ez * (b / 2 + .08)));
    // Tuer auf der Seite gegenueber dem Garten, Vordach mit Pfosten, Stufe, Bank
    const tx = -sx * 1.05;
    tuer(g, tx, y0, b / 2 + .05);
    for (const dx of [-.85, .85]) g.add(box(.14, 2.3, .14, mat("stamm"), tx + dx, y0 + 1.1, b / 2 + 1.25));
    const vd = box(2.5, .12, 1.8, SAT.schiefer(), tx, y0 + 2.34, b / 2 + .85); vd.rotation.x = .2; g.add(vd);
    g.add(box(1.8, .18, .8, sd, tx, .12, b / 2 + .55));
    g.add(box(1.4, .1, .42, ho, -sx * 2.5, .55, b / 2 + .45)); for (const dx of [-.55, .55]) g.add(box(.1, .45, .34, hd, -sx * 2.5 + dx, .3, b / 2 + .45));
    // Fenster (leuchten abends) mit Laeden und Blumenkasten
    const fm = new THREE.MeshBasicMaterial({ color: PAL.fenster }); FENSTERMAT.push({ m: fm, th: .42, an: true });
    const laden = mat(0x3f6f7a);
    for (const [x, z, ry] of [[sx * 1.5, b / 2 + .05, 0], [-l / 2 - .05, .2, Math.PI / 2], [l / 2 + .05, .2, Math.PI / 2]]) {
      const f = box(.7, .6, .08, fm, x, y0 + h * .62, z); f.rotation.y = ry; f.castShadow = false; g.add(f);
      for (const s2 of [-1, 1]) { const lx = x + s2 * .5 * Math.cos(ry), lz = z - s2 * .5 * Math.sin(ry), lo = box(.28, .66, .06, laden, lx, y0 + h * .62, lz); lo.rotation.y = ry; g.add(lo); }
      const kx = box(.9, .18, .22, hd, x + .12 * Math.sin(ry), y0 + h * .62 - .42, z + .12 * Math.cos(ry)); kx.rotation.y = ry; g.add(kx);
      for (let i = 0; i < 4; i++) { const bl = mesh(new THREE.IcosahedronGeometry(.07, 0), mat(i % 2 ? 0xd4213d : 0xe8c040)); const o = (i - 1.5) * .2; bl.position.set(x + o * Math.cos(ry) + .14 * Math.sin(ry), y0 + h * .62 - .27, z - o * Math.sin(ry) + .14 * Math.cos(ry)); g.add(bl); }
      FENSTERLICHT.push({ g, fm, p: new THREE.Vector3(x * 1.25, y0 + h * .62, z * 1.6) }); }
    // Kamin (Schornstein auf der Gartenseite) mit Rauch
    const cx = sx * (l / 2 - .9);
    g.add(box(.85, rh + 2.1, .85, sd, cx, y0 + h + (rh + 2.1) / 2 - .3, -b / 6)); g.add(box(1.05, .2, 1.05, stein, cx, y0 + h + rh + 1.9, -b / 6));
    EMITTER.push({ g, p: new THREE.Vector3(cx, y0 + h + rh + 2.2, -b / 6) });
    // Garten: Steinmauer, Beet, Walderdbeeren (gruen mit roten Tupfern)
    const gx = sx * 2.7, gz = b / 2 + 3.0;
    g.add(box(3.7, .1, 2.6, mat("erdeDunkel"), gx, .05, gz));
    for (const [x, z, w2, d2] of [[0, 1.35, 3.9, .24], [0, -1.35, 3.9, .24], [1.95, 0, .24, 2.7], [-1.95, 0, .24, 2.7]]) g.add(box(w2, .38, d2, sd, gx + x, .19, gz + z));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
      const bx = gx - 1.4 + k * .56, bz = gz - .8 + r * .8, bu = mesh(new THREE.IcosahedronGeometry(.19, 0), mat(r === 1 ? "laub2" : "laub")); bu.position.set(bx, .24, bz); bu.scale.y = .62; g.add(bu);
      for (const [ox, oz] of [[.12, .06], [-.1, -.1], [.02, .15]]) { const be = mesh(new THREE.IcosahedronGeometry(.06, 0), mat(0xd4213d)); be.position.set(bx + ox, .3, bz + oz); g.add(be); } }
    g.add(box(.1, 1.0, .1, mat("stamm"), gx + 1.5, .5, gz + 1.0)); g.add(box(.5, .35, .04, mat(0xd9b77a), gx + 1.5, .95, gz + 1.0));   // kleines Beetschild
    return g; },
});
Object.assign(BAUTEN, {
  wachhaus(gd) {   // Wachhaus am Haupttor der inneren Palisade: Steinhaus, Podest vor der Tuer, Fahne, Speerstaender, Feuerkorb
    const g = new THREE.Group(), l = 4.2, b = 3.4, hs = haus({ l, b, h: 2.35, wand: "stein", dach: "schindel", kamin: true, licht: true }); g.add(hs);
    g.add(box(1.9, .12, 1.9, mat("holzDunkel"), -.6, .04, b / 2 + 1.2)); g.add(box(1.7, .3, 1.7, mat("holz"), -.6, .2, b / 2 + 1.2));   // Podest fuer den Hauptmann
    g.add(box(.12, 5.2, .12, mat("stamm"), l / 2 + .55, 2.6, b / 2 + .35)); g.add(box(1.3, .85, .05, mat(0xa81f2a), l / 2 + 1.2, 4.55, b / 2 + .35)); g.add(box(1.3, .12, .06, mat(0xe0b040), l / 2 + 1.2, 4.07, b / 2 + .35));
    g.add(box(1.4, .1, .45, mat("holz"), l / 2 - .5, .32, b / 2 + .55));
    for (let i = 0; i < 4; i++) { const sp = box(.05, 2.3, .05, mat("stamm"), l / 2 - .2 - i * .28, 1.5, b / 2 + .55); sp.rotation.z = .08 * (i - 1.5); g.add(sp);
      const sz = mesh(new THREE.ConeGeometry(.06, .26, 5), mat(0xb8b8b0)); sz.position.set(l / 2 - .2 - i * .28 + .09 * (i - 1.5) * 0 , 2.78, b / 2 + .55); sz.rotation.z = .08 * (i - 1.5); g.add(sz); }
    for (const [x, z] of [[-l / 2 - .9, b / 2 - .2], [-l / 2 - .9, b / 2 - 1.1], [-l / 2 - .3, b / 2 + .4]]) { const f = fass(); f.position.set(x, 0, z); f.scale.setScalar(.8); g.add(f); }
    const kb = mesh(new THREE.CylinderGeometry(.34, .2, .3, 8), mat(0x4a4a50)); kb.position.set(2.5, .75, b / 2 + 1.5); g.add(kb);
    for (const [x, z] of [[-.2, -.2], [.2, -.2], [0, .22]]) g.add(box(.06, .7, .06, mat(0x3a3a40), 2.5 + x, .35, b / 2 + 1.5 + z));
    const fl = mesh(new THREE.ConeGeometry(.22, .5, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 }), false); fl.position.set(2.5, 1.1, b / 2 + 1.5); g.add(fl);
    return g; },
  weidestall(gd) {   // Weide am Fluss (20 x 13 m): Holzzaun mit offenem Tor, kleiner Stall (offener Unterstand), Heu, Traenke zum Fluss hin
    const g = new THREE.Group(), LX = 20, LZ = 13, h0 = hoehe(gd.u, gd.w), holz = mat("holz"), dk = mat("holzDunkel");
    const dh = (x, z) => { const [u, w] = ZL2W(gd, x, z); return hoehe(u, w) - h0; };
    const seg = (x1, z1, x2, z2) => { const L = Math.hypot(x2 - x1, z2 - z1), y = (dh(x1, z1) + dh(x2, z2)) / 2, ry = -Math.atan2(z2 - z1, x2 - x1);
      for (const hy of [.4, .82]) { const r = box(L, .07, .08, holz, (x1 + x2) / 2, y + hy, (z1 + z2) / 2); r.rotation.y = ry; g.add(r); } };
    const kanten = [[-LX / 2, -LZ / 2, LX / 2, -LZ / 2], [LX / 2, -LZ / 2, LX / 2, LZ / 2], [LX / 2, LZ / 2, 1.3, LZ / 2], [-1.3, LZ / 2, -LX / 2, LZ / 2], [-LX / 2, LZ / 2, -LX / 2, -LZ / 2]];
    for (const [x1, z1, x2, z2] of kanten) { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / 1.9)); let px = x1, pz = z1;
      g.add(box(.16, 1.2, .16, dk, x1, dh(x1, z1) + .5, z1));
      for (let i = 1; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n; g.add(box(.16, 1.2, .16, dk, x, dh(x, z) + .5, z)); seg(px, pz, x, z); px = x; pz = z; } }
    for (const s2 of [-1, 1]) { const f = box(1.3, .8, .06, holz, s2 * 1.3 + s2 * .15, .6, LZ / 2 + .55); f.rotation.y = s2 * 1.1; g.add(f); }   // Tor steht offen
    // Stall (offener Unterstand an der Ostseite? nein: an der Landseite, Rueckwand am Zaun)
    const sx = -5.8, sz = LZ / 2 - 2.5, sw = 8.4, sd = 3.7, sy = dh(sx, sz);
    for (const [x, z, hh] of [[sx - sw / 2, sz - sd / 2, 2.9], [sx + sw / 2, sz - sd / 2, 2.9], [sx, sz - sd / 2, 2.9], [sx - sw / 2, sz + sd / 2, 2.1], [sx + sw / 2, sz + sd / 2, 2.1], [sx, sz + sd / 2, 2.1]]) g.add(box(.22, hh, .22, mat("stamm"), x, sy + hh / 2, z));
    g.add(box(sw, 2.0, .14, holz, sx, sy + 1.0, sz + sd / 2)); g.add(box(.14, 2.0, sd, holz, sx - sw / 2, sy + 1.0, sz)); g.add(box(.14, 2.0, sd, holz, sx + sw / 2, sy + 1.0, sz));
    const pr = pult(sw, sd, 2.95, 2.1, SAT.schindel()); pr.position.x += sx; pr.position.z += sz; pr.position.y += sy; g.add(pr);
    const hh = heuhaufen(); hh.position.set(sx + 2.4, sy, sz + .9); hh.scale.setScalar(.85); g.add(hh);
    for (const [x, z] of [[sx - 2.6, sz + 1.2], [sx - 1.4, sz + 1.2], [sx - 2.0, sz + 1.2]]) g.add(box(.9, .5, .5, mat("heu"), x, sy + .25 + (x === sx - 2.0 ? .5 : 0), z));
    // Traenke (Wasser) am Fluss-Ende der Weide + Futterraufe
    g.add(box(3.4, .5, .7, holz, 4.5, dh(4.5, -LZ / 2 + 1.4) + .25, -LZ / 2 + 1.4)); g.add(box(3.1, .05, .45, mat(0x4f7f8f), 4.5, dh(4.5, -LZ / 2 + 1.4) + .5, -LZ / 2 + 1.4));
    g.add(box(2.2, .6, .5, holz, -6.5, dh(-6.5, -2.5) + .55, -2.5));
    if (gd.id === "weidestall-1" || !ZUS.pos.weide) ZUS.pos.weide = { gd, LX, LZ, sx, sz, sw, sd };
    return g; },
  wassermuehle(gd) {   // Wassermuehle am Ufer: Stein-Erdgeschoss, Holz-Obergeschoss, Lastenbalken, Muehlstein, Wasserrad (dreht, steht im Bach)
    const g = new THREE.Group(), l = 5.4, b = 4.2, y0 = .35, hu = 2.1, ho2 = 1.7, h0 = hoehe(gd.u, gd.w), R = 1.5;
    g.add(box(l + .5, .7, b + .5, mat("steinDunkel"), 0, 0, 0));
    g.add(box(l, hu, b, mat("stein"), 0, y0 + hu / 2, 0));
    g.add(box(l - .1, ho2, b - .1, mat("holz"), 0, y0 + hu + ho2 / 2, 0));
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) g.add(box(.3, ho2 + .1, .3, mat("holzDunkel"), ex * (l / 2 - .05), y0 + hu + ho2 / 2, ez * (b / 2 - .05)));
    const rh = b * .62, gb = giebel(l - .1, b - .1, rh, mat("holz")); gb.position.y = y0 + hu + ho2; g.add(gb);
    const d = dach(l - .1, b - .1, rh, "schindel", .55); d.position.y = y0 + hu + ho2; g.add(d);
    tuer(g, 1.5, y0, b / 2 + .05); fenster(g, -1.3, y0 + 1.3, b / 2 + .06); fenster(g, -1.3, y0 + hu + .9, b / 2 + .06); fenster(g, 1.3, y0 + hu + .9, b / 2 + .06);
    g.add(box(.18, .18, 1.5, mat("holzDunkel"), 0, y0 + hu + ho2 + rh * .7, b / 2 + .7));   // Lastenbalken unter dem Giebel, Seil + Sack
    g.add(box(.04, 1.5, .04, mat(0xe8dcc0), 0, y0 + hu + ho2 + rh * .7 - .75, b / 2 + 1.35)); const sk0 = mesh(new THREE.IcosahedronGeometry(.28, 0), farbe(0xcdb98a)); sk0.scale.set(1.1, .9, .9); sk0.position.set(0, y0 + hu + ho2 + rh * .7 - 1.6, b / 2 + 1.35); g.add(sk0);
    for (let i = 0; i < 5; i++) { const sk = mesh(new THREE.IcosahedronGeometry(.3, 0), farbe(i % 2 ? 0xcdb98a : 0xbfa978)); sk.scale.set(1.2, .85, .9); sk.position.set(-2.9 + (i % 3) * .55, .32 + (i > 2 ? .4 : 0), b / 2 + .9 + (i % 2) * .3); g.add(sk); }
    const ms = mesh(new THREE.CylinderGeometry(.75, .75, .24, 14), mat(0x8f897b)); ms.position.set(3.1, .75, b / 2 + .7); ms.rotation.x = Math.PI / 2 - .3; g.add(ms);
    // Wasserrad am Ostende des Hauses (von Sueden sichtbar): Achse quer zur Wand, Radhaus-Gerüst aus Holz zur Hausecke, Schaufeln tauchen in den Bach
    const wx = l / 2 + 1.9, wz = -(b / 2 + 2.3), [wu, ww] = ZL2W(gd, wx, wz), wy = flussY(wu) + R - .35 - h0;
    const tmp = new THREE.Group(), hd = mat("holzDunkel"), hz = mat("holz");   // Rad im Ursprung bauen, je Material zu EINEM Mesh vereinen (2 Draw-Calls), die Gruppe dreht sich
    for (let i = 0; i < 6; i++) { const s = box(2 * R, .14, .14, hd); s.rotation.z = i * Math.PI / 6; tmp.add(s); }
    for (const zz of [-.42, .42]) for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI, s = box(2 * Math.PI * R / 12 * 1.05, .14, .14, hd, Math.cos(a) * R, Math.sin(a) * R, zz); s.rotation.z = a + Math.PI / 2; tmp.add(s); }
    for (let i = 0; i < 12; i++) { const a = (i + .5) / 12 * 2 * Math.PI, p = box(.55, .09, .95, hz, Math.cos(a) * (R + .1), Math.sin(a) * (R + .1), 0); p.rotation.z = a; tmp.add(p); }
    const rad = new THREE.Group(); rad.position.set(wx, wy, wz); for (const t of zerlegen(tmp)) { const m = new THREE.Mesh(t.geo, t.m); m.castShadow = m.receiveShadow = true; rad.add(m); }
    g.add(rad); ZUS.raeder.push(rad);
    const wl = mesh(new THREE.CylinderGeometry(.13, .13, 1.7, 8).rotateX(Math.PI / 2), hd); wl.position.set(wx, wy, wz); g.add(wl);
    for (const s2 of [-1, 1]) g.add(box(.26, 2.6, .26, mat("stamm"), wx + s2 * (R + .55), wy - .6, wz));
    for (const [z2, hh] of [[wz - .62, .45], [wz + .62, .45]]) { const x1 = l / 2 - .05, z1 = -b / 2 + .1 + (z2 > wz ? .0 : 0), x2 = wx - R - .55, L = Math.hypot(x2 - x1, z2 - z1); const bm = box(L, .2, .2, hz, (x1 + x2) / 2, wy + hh, (z1 + z2) / 2); bm.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(bm); }
    for (const s2 of [-1, 1]) g.add(box(.2, .2, 1.5, hz, wx + s2 * (R + .55), wy + .5, wz));
    ZUS.pos.muehle = { gd, wheel: [wu, ww], b };
    return g; },
});
// ==== /ZUSAGEN-1810:BAUTEN ====

// ==== TURM-1910:BAUTEN (patches/turm_1910.py) — Alchemie- und Forschungsturm fuer Uebernatuerliches, Varianten A / B / C ====
const TURM = { var: "A", quellen: [], orbit: null, funken: null, dampf: null, halo: [], pos: {}, g: null };
const TU = {   // Farben: dunkler Stein, Schiefer, leuchtende Kristalle (MeshBasic = leuchten auch bei Tag)
  stein: () => mat(0x50536a), stein2: () => mat(0x5f6380), schiefer: () => mat(0x3a4778), kupfer: () => mat(0x3f8f7c), gold: () => mat(0xd9b04a),
  fenster: () => new THREE.MeshBasicMaterial({ color: 0xffd98a }), vio: () => new THREE.MeshBasicMaterial({ color: 0xb46cff }), tuerkis: () => new THREE.MeshBasicMaterial({ color: 0x59ffd6 }),
  gruen: () => new THREE.MeshBasicMaterial({ color: 0x7dff5a }), rot: () => new THREE.MeshBasicMaterial({ color: 0xff6a8a }) };
const TUC = {}; for (const k of Object.keys(TU)) { const f = TU[k]; let m = null; TU[k] = () => m || (m = f()); }   // Materialien teilen -> wenige Draw-Calls
const tuStab = (g, x, z, h, m) => g.add(box(.18, h, .18, m, x, h / 2, z));
function tuKristall(g, x, y, z, s, m, extra = 1) {   // Doppelpyramide (Oktaeder) + 2 kleine Splitter
  const k = mesh(new THREE.OctahedronGeometry(1, 0), m, false); k.scale.set(.6 * s, 1.15 * s * extra, .6 * s); k.position.set(x, y, z); g.add(k);
  for (const [dx, dz, q] of [[.8, .2, .5], [-.7, -.3, .42]]) { const c = mesh(new THREE.OctahedronGeometry(1, 0), m, false); c.scale.set(.3 * s * q * 2, .6 * s * q * 2, .3 * s * q * 2); c.position.set(x + dx * s, y - .4 * s, z + dz * s); c.rotation.z = dx * .5; g.add(c); } }
function tuFenster(g, x, y, z, ry, w = .5, h = .8) { const f = box(w, h, .12, TU.fenster(), 0, 0, 0); const r = new THREE.Group(); r.add(f); r.add(box(w + .16, .1, .2, mat("holzDunkel"), 0, -h / 2 - .05, 0)); r.add(box(w + .16, .1, .2, mat("holzDunkel"), 0, h / 2 + .05, 0)); r.position.set(x, y, z); r.rotation.y = ry; g.add(r); }
function tuErker(g, x, y, z, ry, s = 1) {   // Holzerker mit Spitzdach und Fenster
  const e = new THREE.Group(), ho = mat("holz"), hd = mat("holzDunkel");
  e.add(box(2.0 * s, 1.7 * s, 1.6 * s, ho, 0, 0, 0)); for (const sx of [-1, 1]) e.add(box(.14, 1.8 * s, 1.7 * s, hd, sx * 1.0 * s, 0, 0)); e.add(box(2.1 * s, .14, 1.7 * s, hd, 0, -.85 * s, 0));
  tuFenster(e, 0, 0, .83 * s, 0, .6 * s, .8 * s); const d = giebelDach(2.1 * s, 1.7 * s, .9 * s, .14, TU.schiefer(), .3, mat(0x1f2536)); d.rotation.y = Math.PI / 2; d.position.y = .85 * s; e.add(d);
  e.position.set(x, y, z); e.rotation.y = ry; g.add(e); }
function tuSpitze(g, cx, cz, y0, r0, h, seg, bieg, m, n = 6) {   // schiefes Spitzdach aus n Kegelstuempfen
  for (let j = 0; j < n; j++) { const t0 = j / n, t1 = (j + 1) / n, c = mesh(new THREE.CylinderGeometry(r0 * (1 - t1) + .05, r0 * (1 - t0), h / n + .05, seg), m); c.position.set(cx + bieg * t0 * t0 * 1, y0 + h * (j + .5) / n, cz + bieg * .35 * t0 * t0); c.rotation.y = j * .3; g.add(c); }
  const rand = mesh(new THREE.CylinderGeometry(r0 * 1.12, r0 * 1.12, .22, seg), mat(0x1f2536)); rand.position.set(cx, y0 + .05, cz); g.add(rand); }
function tuBalkon(g, cx, cz, y, r, rot = 0, fernrohr = true) {
  const m = mat("holzDunkel"), ho = mat("holz");
  const p = mesh(new THREE.CylinderGeometry(r, r * .92, .3, 12), TU.stein2()); p.position.set(cx, y, cz); g.add(p);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + rot; if (i % 4 === 0) continue; g.add(box(.12, 1.0, .12, m, cx + Math.cos(a) * (r - .1), y + .65, cz + Math.sin(a) * (r - .1))); }
  for (const hy of [.9, 1.15]) { const rg = mesh(new THREE.TorusGeometry(r - .1, .05, 4, 12).rotateX(Math.PI / 2), ho); rg.position.set(cx, y + hy, cz); g.add(rg); }
  if (fernrohr) { const t = new THREE.Group(), rohr = mesh(new THREE.CylinderGeometry(.2, .28, 3.2, 8), TU.kupfer()); rohr.rotation.z = Math.PI / 2 - .75; rohr.position.set(.6, 1.3, 0); t.add(rohr);
    t.add(mesh(new THREE.CylinderGeometry(.3, .3, .12, 8), TU.gold())); const l = mesh(new THREE.CylinderGeometry(.3, .3, .06, 8), TU.tuerkis()); l.rotation.z = Math.PI / 2 - .75; l.position.set(2.0, 2.45, 0); t.add(l);
    for (const [dx, dz] of [[-.5, 0], [.4, .5], [.4, -.5]]) { const b = box(.1, 1.3, .1, m, dx * .6, .6, dz * .6); b.rotation.z = -dx * .5; b.rotation.x = dz * .5; t.add(b); }
    t.position.set(cx + r * .2, y + .15, cz); t.rotation.y = rot * 0 + .6; g.add(t); } }
function tuLabor(g, v, ox, oz, ry) {   // Alchemie-Anbau: offener Schuppen mit Regalen + Destillation, Kessel auf Feuer, Kraeuterbeete
  const L = new THREE.Group(), st = TU.stein(), ho = mat("holz"), hd = mat("holzDunkel"), farbe2 = v === "B" ? [TU.vio(), TU.tuerkis()] : v === "C" ? [TU.gruen(), TU.vio()] : [TU.gruen(), TU.tuerkis()];
  L.add(box(7.2, .5, 5.2, mat("steinDunkel"), 0, .0, 0));
  L.add(box(7.0, 3.0, .4, st, 0, 1.75, -2.4)); for (const sx of [-1, 1]) L.add(box(.4, 3.0, 4.6, st, sx * 3.4, 1.75, -.2));
  const dach = pult(7.6, 5.4, 4.2, 3.1, TU.schiefer()); dach.position.set(0, 0, 0); L.add(dach);
  for (const [x, z] of [[-3.4, 2.1], [3.4, 2.1]]) L.add(box(.3, 3.2, .3, mat("stamm"), x, 1.9, z)); L.add(box(7.4, .25, .3, hd, 0, 3.5, 2.1));
  // Regale mit Glaesern an der Rueckwand
  for (const y of [1.0, 1.9, 2.8]) { L.add(box(5.8, .1, .5, ho, 0, y, -2.0)); for (let i = 0; i < 8; i++) { const c = [TU.gruen(), TU.vio(), TU.tuerkis(), TU.rot()][(i + (y * 3 | 0)) % 4]; L.add(box(.3, .42, .3, c, -2.5 + i * .72, y + .26, -2.0)); } }
  // Tisch mit Destillierkolben (Kugel + Hals + Rohr + Auffang)
  L.add(box(3.2, .12, 1.3, ho, 0, 1.0, -.2)); for (const [x, z] of [[-1.4, .3], [1.4, .3], [-1.4, -.7], [1.4, -.7]]) L.add(box(.12, 1.0, .12, hd, x, .5, z));
  const kolb = (x, m, s = 1) => { const k = mesh(new THREE.IcosahedronGeometry(.4 * s, 1), m, false); k.position.set(x, 1.62, -.2); L.add(k); const h = mesh(new THREE.CylinderGeometry(.09 * s, .12 * s, .6 * s, 6), m, false); h.position.set(x, 2.15, -.2); L.add(h); };
  kolb(-1.1, farbe2[0]); kolb(.2, farbe2[1], .8); const rohr = box(1.3, .07, .07, TU.gold(), -.45, 2.4, -.2); L.add(rohr); const au = mesh(new THREE.CylinderGeometry(.22, .17, .5, 7), farbe2[1], false); au.position.set(1.1, 1.38, -.2); L.add(au);
  for (const x of [-1.1, .2]) TURM.quellen.push({ lok: [L, ox, oz, ry, x, 2.55, -.2], farbe: x < 0 ? 0 : 1, rate: .45 });
  // Kraeuterbuendel am Balken
  for (let i = 0; i < 7; i++) L.add(box(.18, .5, .18, mat(i % 2 ? "laub" : "laub2"), -2.9 + i * .98, 3.2, 2.1));
  // Kessel auf Feuer vor dem Schuppen
  const K = new THREE.Group(); for (let i = 0; i < 4; i++) { const h = box(.1, .1, 1.0, mat("stamm"), 0, .14, 0); h.rotation.y = i * .8; K.add(h); }
  const fl = mesh(new THREE.ConeGeometry(.32, .8, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 }), false); fl.position.y = .55; K.add(fl);
  for (const a of [0, 2.1, 4.2]) { const b = box(.1, .9, .1, mat(0x2c2c32), Math.cos(a) * .85, .45, Math.sin(a) * .85); b.rotation.z = Math.cos(a) * -.3; b.rotation.x = Math.sin(a) * .3; K.add(b); }
  const kes = mesh(new THREE.SphereGeometry(.95, 10, 7, 0, Math.PI * 2, 0, Math.PI * .62), mat(0x24242a)); kes.rotation.x = Math.PI; kes.position.y = 1.55; K.add(kes);
  const rim = mesh(new THREE.TorusGeometry(.93, .09, 5, 12).rotateX(Math.PI / 2), mat(0x15151a)); rim.position.y = 1.35; K.add(rim);
  const bruehe = mesh(new THREE.CircleGeometry(.88, 12).rotateX(-Math.PI / 2), farbe2[0], false); bruehe.position.y = 1.36; K.add(bruehe);
  K.position.set(-1.0, .2, 4.6); L.add(K); TURM.quellen.push({ lok: [L, ox, oz, ry, -1.0, 1.6, 4.6], farbe: 0, rate: 1, gross: true });
  const K2 = K.clone(); K2.scale.setScalar(.7); K2.position.set(2.2, .2, 4.2); const l2 = K2.children.find(c => c.geometry && c.geometry.type === "CircleGeometry"); if (l2) l2.material = farbe2[1]; L.add(K2); TURM.quellen.push({ lok: [L, ox, oz, ry, 2.2, 1.2, 4.2], farbe: 1, rate: .7, gross: true });
  // Kraeuterbeete (3 erhoehte Beete, bunte Tupfer)
  for (let b = 0; b < 3; b++) { const bx = -3.2 + b * 3.2, bz = 8.0; L.add(box(2.6, .42, 1.2, ho, bx, .21, bz)); L.add(box(2.4, .1, 1.0, mat("erdeDunkel"), bx, .45, bz));
    for (let i = 0; i < 6; i++) { const k = mesh(new THREE.IcosahedronGeometry(.17, 0), mat(i % 2 ? "laub" : "laub2")); k.position.set(bx - 1.0 + i * .4, .62, bz + (i % 2 ? .2 : -.2)); k.scale.y = .8; L.add(k); }
    for (let i = 0; i < 3; i++) { const k = mesh(new THREE.IcosahedronGeometry(.08, 0), [TU.vio(), TU.rot(), TU.tuerkis()][(b + i) % 3], false); k.position.set(bx - .7 + i * .7, .8, bz); L.add(k); } }
  for (const [x, z] of [[4.7, 2.5], [4.7, 3.4]]) { const f = fass(); f.position.set(x, 0, z); L.add(f); }
  L.position.set(ox, 0, oz); L.rotation.y = ry; g.add(L); return L; }

function tuTurmA(g) {   // "Der verdrehte Dorn": gedrehter, schiefer Stein-Turm, Holzerker, krummes Schieferdach, Observatorium, Kristallkrone
  const N = 10, H = 3.0, r0 = 4.4, r1 = 2.35, cxF = t => 2.4 * Math.sin(t * 3.2), czF = t => 1.4 * Math.sin(t * 2.3 + 1);
  g.add(box(12, .9, 12, mat("steinDunkel"), 0, .15, 0));
  for (let i = 0; i < N; i++) { const t = i / (N - 1), r = r0 + (r1 - r0) * t, cx = cxF(t), cz = czF(t), s = mesh(new THREE.CylinderGeometry(r * .93, r, H + .2, 8), i % 2 ? TU.stein() : TU.stein2()); s.position.set(cx, .6 + i * H + H / 2, cz); s.rotation.y = i * .27; g.add(s);
    const b = mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, .2, 8), mat("holzDunkel")); b.position.set(cx, .6 + (i + 1) * H, cz); b.rotation.y = i * .27; g.add(b);
    for (const k of [0, 1]) { const a = i * 1.9 + k * 3.1, R = r * .96 + .05; tuFenster(g, cx + Math.cos(a) * R, .6 + i * H + H * .5, cz + Math.sin(a) * R, -a + Math.PI / 2, .46, .8); }
    if (i % 3 === 1) { const a = i * 2.3, R = r + .9; tuErker(g, cx + Math.cos(a) * R, .6 + i * H + 1.2, cz + Math.sin(a) * R, -a + Math.PI / 2, .95); } }
  const ty = .6 + N * H, tx = cxF(1), tz = czF(1);
  tuBalkon(g, cxF(.8), czF(.8), .6 + 7.6 * H, 4.0, 0.3);
  tuSpitze(g, tx, tz, ty, r1 * 1.08, 9.0, 8, 2.2, TU.schiefer(), 7); g.userData.spitze = [tx + 2.2, ty + 9.0 + 1.9, tz + .8];
  tuKristall(g, tx + 2.2, ty + 11.6, tz + .8, 1.5, TU.vio()); g.userData.kristall = [tx + 2.2, ty + 11.6, tz + .8];
  for (const [dx, dz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) { const s = mesh(new THREE.CylinderGeometry(.04, .04, 2.3, 4), mat("holzDunkel")); s.position.set(tx + 2.2 + dx * .5, ty + 10.2, tz + .8 + dz * .5); s.rotation.z = -dx * .2; s.rotation.x = dz * .2; g.add(s); }
  const tuer = new THREE.Group(); tuer.add(box(1.5, 2.3, .3, mat("holzDunkel"), 0, 1.15, 0)); tuer.add(box(1.9, .22, .5, mat("stamm"), 0, 2.4, 0)); for (const s of [-1, 1]) tuer.add(box(.2, 2.4, .5, mat("stamm"), s * .85, 1.2, 0)); tuer.position.set(0, .6, r0 * .95 + .1); g.add(tuer);
  g.userData.hoehe = ty + 12; g.userData.tuer = [0, 0, r0 * .95 + 1.6]; g.userData.lab = [10.5, -1.5, -.5]; g.userData.orbit = { typ: "buch", n: 9, r: 6.8, y: ty + 5.5, c: [tx + 1.2, tz + .4], lang: 36 }; }

function tuTurmB(g) {   // "Die Sternwarte": breiter, leicht geneigter Rundturm, aussen laufende Wendeltreppe, Kupferkuppel mit Spalt + grosses Fernrohr
  const N = 7, H = 3.4, r0 = 5.2, r1 = 3.9; { const sk = mesh(new THREE.CylinderGeometry(7, 7.6, 1.2, 14), mat("steinDunkel")); sk.position.y = .2; g.add(sk); }
  const lean = .028; const g2 = new THREE.Group(); g2.rotation.z = -lean; g.add(g2);
  for (let i = 0; i < N; i++) { const t = i / (N - 1), r = r0 + (r1 - r0) * t; const s = mesh(new THREE.CylinderGeometry(r * .97, r, H + .1, 14), i % 2 ? TU.stein() : TU.stein2()); s.position.y = .8 + i * H + H / 2; g2.add(s);
    const b = mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, .22, 14), TU.schiefer()); b.position.y = .8 + (i + 1) * H; g2.add(b);
    for (let k = 0; k < 3; k++) { const a = i * .7 + k * 2.1 + 1; tuFenster(g2, Math.cos(a) * (r * .985), .8 + i * H + H * .55, Math.sin(a) * (r * .985), -a + Math.PI / 2, .5, 1.0); } }
  // Wendeltreppe aussen (breite Stufen, Holzgelaender)
  const ST = 52; for (let i = 0; i < ST; i++) { const a = i * .24 + .4, t = i / ST, r = r0 + (r1 - r0) * (.8 * t) + .9, y = .9 + t * (N - 1) * H; const s = box(1.7, .22, 1.0, mat("holz"), Math.cos(a) * r, y, Math.sin(a) * r); s.rotation.y = -a + Math.PI / 2; g2.add(s);
    if (i % 4 === 0) g2.add(box(.1, 1.1, .1, mat("holzDunkel"), Math.cos(a) * (r + .8), y + .6, Math.sin(a) * (r + .8))); }
  const ty = .8 + N * H; const ring = mesh(new THREE.CylinderGeometry(r1 + .6, r1 + .6, .5, 14), mat("holz")); ring.position.y = ty + .25; g2.add(ring);
  const kuppel = mesh(new THREE.SphereGeometry(r1 + .35, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), TU.kupfer()); kuppel.position.y = ty + .5; g2.add(kuppel);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const r = mesh(new THREE.TorusGeometry(r1 + .37, .07, 4, 12, Math.PI).rotateY(a), TU.gold()); r.position.y = ty + .5; g2.add(r); }
  const spalt = box(1.5, 2.6, r1 * 1.3, TU.tuerkis(), r1 * .55, ty + 2.3, 0); spalt.rotation.z = -.35; g2.add(spalt);   // leuchtender Spalt der Kuppel
  const f = new THREE.Group(), tube = mesh(new THREE.CylinderGeometry(.34, .5, 6.6, 10), TU.kupfer()); tube.rotation.z = Math.PI / 2 - .9; tube.position.set(1.4, 1.4, 0); f.add(tube);
  const lin = mesh(new THREE.CylinderGeometry(.5, .5, .1, 10), TU.tuerkis()); lin.rotation.z = Math.PI / 2 - .9; lin.position.set(4.35, 4.0, 0); f.add(lin); f.add(mesh(new THREE.CylinderGeometry(.6, .6, .35, 8), TU.gold()));
  f.position.set(r1 * .3, ty + 2.1, 0); g2.add(f);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const p = mesh(new THREE.CylinderGeometry(.22, .3, 3.2, 6), TU.stein2()); p.position.set(Math.cos(a) * (r1 + 2.6), ty - 1.4, Math.sin(a) * (r1 + 2.6)); g2.add(p); tuKristall(g2, Math.cos(a) * (r1 + 2.6), ty + .9, Math.sin(a) * (r1 + 2.6), .55, i % 2 ? TU.vio() : TU.tuerkis()); }
  const tuer = new THREE.Group(); tuer.add(box(1.6, 2.4, .35, mat("holzDunkel"), 0, 1.2, 0)); for (const s of [-1, 1]) tuer.add(box(.22, 2.5, .5, mat("stamm"), s * .9, 1.25, 0)); tuer.add(box(2.0, .24, .5, mat("stamm"), 0, 2.5, 0)); tuer.position.set(0, .8, -r0 - 0.15); tuer.rotation.y = Math.PI; g.add(tuer);
  g.userData.hoehe = ty + 6; g.userData.tuer = [0, 0, -r0 - 1.8]; g.userData.lab = [-11.5, 3.5, Math.PI * .5 + .3]; g.userData.kristall = [Math.sin(lean) * ty, ty + 3, 0];
  g.userData.orbit = { typ: "buch", n: 12, r: 8.6, y: ty + 4.2, c: [Math.sin(lean) * ty, 0], lang: 44 }; g.userData.spitze = [Math.sin(lean) * ty, ty + 4.5, 0]; }

function tuTurmC(g) {   // "Der windschiefe Zauberstapel": zwei schiefe Tuerme mit Bruecke, viele Spitzdaecher, Holzerker, Hangelaternen, Kristallbaum + schwebende Runensteine
  const stack = (x0, z0, N, r0, r1, H, drehen, lean, seed) => { let px = x0, pz = z0; const ox = []; for (let i = 0; i < N; i++) { const t = i / (N - 1), r = r0 + (r1 - r0) * t, s = mesh(new THREE.CylinderGeometry(r * .9, r, H + .15, i % 3 === 0 ? 6 : 8), i % 2 ? TU.stein() : TU.stein2());
      px = x0 + lean[0] * Math.sin(t * 2.6 + seed) * 1.8 + t * lean[0] * 1.6; pz = z0 + lean[1] * Math.sin(t * 1.9 + seed * 2) * 1.5 + t * lean[1];
      s.position.set(px, .6 + i * H + H / 2, pz); s.rotation.y = i * drehen; s.rotation.z = Math.sin(i * 1.7 + seed) * .035; g.add(s);
      const b = mesh(new THREE.CylinderGeometry(r * 1.15, r * .95, .3, i % 3 === 0 ? 6 : 8), mat("holz")); b.position.set(px, .6 + (i + 1) * H - .1, pz); b.rotation.y = i * drehen; g.add(b);
      tuFenster(g, px + Math.cos(i * 2.4 + seed) * r * .95, .6 + i * H + H * .5, pz + Math.sin(i * 2.4 + seed) * r * .95, -(i * 2.4 + seed) + Math.PI / 2, .46, .8);
      if (i % 2 === 0 && i > 0) { const a = i * 1.3 + seed * 3, R = r + .9; tuErker(g, px + Math.cos(a) * R, .6 + i * H + 1, pz + Math.sin(a) * R, -a + Math.PI / 2, .85); }
      ox.push([px, pz]); }
    return [px, pz, .6 + N * H, r1]; };
  g.add(box(14, .9, 11, mat("steinDunkel"), 1, .15, 0));
  const [ax, az, ay, ar] = stack(-2.5, 0, 9, 3.9, 2.3, 3.0, .31, [1, -1], 0.5), [bx, bz, by, br] = stack(5.8, -.5, 6, 3.2, 2.0, 3.0, -.4, [-.9, 1], 2);
  tuSpitze(g, ax, az, ay, ar * 1.12, 8.5, 6, -1.6, TU.schiefer(), 6); tuSpitze(g, bx, bz, by, br * 1.2, 6.5, 6, 1.4, mat(0x4a2f5e), 5);
  for (const [x, y, z, s] of [[ax + 1.5, ay + 2.2, az + 1, .8], [bx - 1.3, by + 2.0, bz - .8, .65]]) { const w = mesh(new THREE.ConeGeometry(.4 * s, 1.3 * s, 5), TU.schiefer()); w.position.set(x, y, z); w.rotation.z = .5; g.add(w); }
  const bry = .6 + 5 * 3.0, a1 = [ax + 2.3, bry, az], b1 = [bx - 2.1, bry - .1, bz];   // Bruecke zwischen den Tuermen
  const L = Math.hypot(b1[0] - a1[0], b1[2] - a1[2]), br_ = box(L, .22, 1.4, mat("holz"), (a1[0] + b1[0]) / 2, bry, (a1[2] + b1[2]) / 2); br_.rotation.y = -Math.atan2(b1[2] - a1[2], b1[0] - a1[0]); g.add(br_);
  for (const s of [-1, 1]) { const r = box(L, .09, .09, mat("holzDunkel"), (a1[0] + b1[0]) / 2, bry + 1.0, (a1[2] + b1[2]) / 2 + s * .7); r.rotation.y = br_.rotation.y; g.add(r); }
  // Hangelaternen (leuchten tags)
  for (const [x, y, z] of [[ax + 2.9, .6 + 3 * 3.0, az + 1], [bx + 2.0, .6 + 3 * 3.0, bz + 2], [bx - 3.3, bry - 2.5, bz - 1.2], [ax - 3.3, .6 + 6 * 3, az]]) { g.add(box(.04, 1.0, .04, mat("holzDunkel"), x, y + .5, z)); const l = mesh(new THREE.OctahedronGeometry(.28, 0), TU.gold(), false); l.position.set(x, y, z); g.add(l); }
  // Kristallbaum auf dem hohen Turm: Holzzinken halten ein Kristallbuendel
  const cy = ay + 9.8; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const s = mesh(new THREE.CylinderGeometry(.05, .08, 2.4, 4), mat("holzDunkel")); s.position.set(ax - 1.6 + dx * .55, cy - 1.0, az + dz * .55); s.rotation.z = -dx * .22; s.rotation.x = dz * .22; g.add(s); }
  tuKristall(g, ax - 1.6, cy + .6, az, 1.8, TU.vio(), 1.15); tuKristall(g, ax - 1.6 + .9, cy - .5, az + .6, .8, TU.tuerkis()); tuKristall(g, ax - 1.6 - .9, cy - .3, az - .5, .7, TU.rot());
  g.userData.kristall = [ax - 1.6, cy + .8, az]; g.userData.spitze = [ax - 1.6, cy + 3.2, az];
  tuBalkon(g, bx, bz, by - 2.2, 3.3, 1, true);
  const tuer = new THREE.Group(); tuer.add(box(1.6, 2.2, .3, mat("holzDunkel"), 0, 1.1, 0)); for (const s of [-1, 1]) tuer.add(box(.2, 2.3, .5, mat("stamm"), s * .9, 1.15, 0)); tuer.add(box(2.0, .22, .5, mat("stamm"), 0, 2.3, 0)); tuer.position.set(-.8, .6, 4.4); g.add(tuer);
  g.userData.hoehe = cy + 4; g.userData.tuer = [-.8, 0, 6.2]; g.userData.lab = [-12.5, -2.5, Math.PI]; g.userData.orbit = { typ: "stein", n: 10, r: 7.2, y: cy - 1.2, c: [ax - 1.6, az], lang: 32 }; }

Object.assign(BAUTEN, {
  zauberturm(gd) {
    const v = ["A", "B", "C"].includes((P.get("turm") || "").toUpperCase()) ? P.get("turm").toUpperCase() : (gd.var || "A"), g = new THREE.Group(); TURM.var = v; TURM.quellen.length = 0;
    ({ A: tuTurmA, B: tuTurmB, C: tuTurmC })[v](g);
    const lab = g.userData.lab, L = tuLabor(g, v, lab[0], lab[1], lab[2]);
    g.userData.festeHoehe = undefined; g.userData.kamin = undefined; TURM.g = g; g.userData.var = v;
    // Lichtsaeule als Landmarke in der Totale (hauchduenner, additiver Zylinder; nur Variante A und C, B hat das Kuppellicht)
    if (v !== "B") { const k = g.userData.kristall, bm = mesh(new THREE.CylinderGeometry(.5, 1.3, 34, 8, 1, true), new THREE.MeshBasicMaterial({ color: v === "A" ? 0xb46cff : 0x8affc8, transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), false); bm.position.set(k[0], k[1] + 17, k[2]); g.add(bm); }
    return g; },
});
// ==== /TURM-1910:BAUTEN ====

function bauStufe(g, p) {   // Zeitraffer: 0 nichts, .25 Fundament, .6 Waende, .85 Dach, 1 alles
  const st = g.userData.stufen, k = (a, b) => klemm((p - a) / (b - a));
  for (const o of st.fundament) { const f = k(0, .2); o.visible = f > 0; o.scale.y = Math.max(.01, f); }
  for (const o of st.waende) { const f = k(.2, .55); o.visible = f > 0 && o.position.y < .3 + f * 2.4; }
  for (const o of st.dach) { const f = k(.55, .8); o.visible = f > 0; o.position.y = (o.userData.y0 ??= o.position.y) + (1 - f) * 3.5; }
  for (const o of st.rest) { const f = k(.8, 1); o.visible = f > 0; o.scale.setScalar(Math.max(.01, f)); } }

// ================================================================ Welt-Seite (Bio-Link), 16.10.2026
// Daten: ./daten.json (von welt_bauen.py aus data/bewohner.json; ohne Opt-outs, nur Handles). Gleiche Haeuser/Startwerte wie web/haeuser.js.
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const DATEN = await fetch("./daten.json?v=" + Date.now()).then(r => r.json());
const HUD = { suche: document.getElementById("suche"), meldung: document.getElementById("meldung"), schilder: document.getElementById("schilder") };
// Sichtbare Texte kommen aus daten.json (welt-config.json "texte", wunsch.json, welt-zustand.json); hier nur Ersatz, falls ein Feld fehlt (17.10.)
const TX = { wunsch_titel: "Today's wish", wunsch_von: "wish by", naechster: "", nicht_da: "@{h} isn't here yet — new followers move in at the next count.",
  nicht_da_n: "@{h} isn't here yet — new followers move in at the next count ({n}× a day).", hier: "Here lives @{h}", geteilt: "Shared house · {alle}",
  leeres_haus: "Common house", rennen_titel: "Wish race", rennen_hinweis: "comment on the latest reel — most likes gets built",
  seit: "Since your last visit:", seit_neu: "{namen} moved in", seit_weg: "{n} moved away", seit_bau: "{name} +{plus} %", seit_bau_neu: "new: {name}",
  gebaut: "built", geplant: "planned", rodung: "Clearing the forest", rodung_klein: "room for new cabins", fertig_zu: "{p} % built",
  t_arbeit: "at work", t_wache: "on patrol", t_taverne: "at the tavern", t_nachtwache: "night watch", t_weg: "on the way", t_heim: "heading home", t_feuer: "by the fire", t_einzug: "moving in", t_halle: "at the Village Hall",
  saison: { winter: "winter", spring: "spring", summer: "summer", autumn: "autumn" }, wetter: { regen: "rain", schnee: "snow", nebel: "mist", klar: "" },
  ...(DATEN.texte || {}) };
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fuell = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
document.getElementById("kopfzahl").textContent = `Day ${DATEN.tag} · ${DATEN.einwohner.toLocaleString("en-US")} ${DATEN.einwohner === 1 ? "soul" : "souls"}`;
{ const k = document.getElementById("kopf"), pf = document.getElementById("pfeil");   // KARTE-KOMPAKT: Tippen klappt auf/zu
  if (k && pf) k.addEventListener("click", e => { if (e.target.closest("button")) return; const zu = k.classList.toggle("zu"); pf.textContent = zu ? "▾" : "▴"; }); }
const RENNEN = DATEN.wunsch_rennen && (DATEN.wunsch_rennen.top || []).length ? DATEN.wunsch_rennen : null;   // nur umgedeutete Texte (wachstum.py)
{ const W = DATEN.wunsch, el = document.getElementById("wunsch");
  el.innerHTML = (W ? `<b>${esc(W.titel || TX.wunsch_titel)}:</b> ${esc(W.text)}` + (W.von ? ` <span>— ${esc(TX.wunsch_von)} @${esc(W.von)}</span>` : "") : "")
    + (RENNEN ? `<div class="naechster"><b>${esc(TX.rennen_titel)}:</b> ${RENNEN.top.slice(0, 3).map((x, i) => `${i + 1}. ${esc(x.text)} (${+x.likes || 0}♥)`).join(" · ")} — ${esc(TX.rennen_hinweis)}</div>`
      : TX.naechster ? `<div class="naechster">${esc(TX.naechster)}</div>` : "");
  if (!el.innerHTML) el.style.display = "none"; }

// ---- Tageszeit nach deutscher Uhrzeit (Anthony 17.10.: fuer alle gleich, Uhrzeit klein in der Ecke). ?uhr=HH:MM simuliert.
const ZEIT = (() => {
  const q = P.get("uhr"), start = performance.now(), opt = { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" };
  const teile = () => Object.fromEntries(new Intl.DateTimeFormat("en-GB", opt).formatToParts(new Date()).map(x => [x.type, x.value]));
  let basis; if (q) { const [h, m] = q.split(":").map(Number); basis = h * 3600 + (m || 0) * 60; }
  const sek = () => { if (basis !== undefined) return (basis + (performance.now() - start) / 1000) % 86400; const t = teile(); return +t.hour * 3600 + +t.minute * 60 + +t.second; };
  const t = teile(), mon = SAISON.monat, doy = P.get("monat") ? (mon - 1) * 30.4 + 15 : Math.floor((Date.UTC(+t.year, +t.month - 1, +t.day) - Date.UTC(+t.year, 0, 0)) / 864e5);
  let sommer = mon >= 4 && mon <= 10;
  if (!P.get("monat")) try { sommer = /GMT\+2/.test(new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", timeZoneName: "shortOffset" }).format(new Date())); } catch (e) {}
  const L = 12.2 + 4.55 * Math.sin(2 * Math.PI * (doy - 80) / 365), mittag = 12.1 + (sommer ? 1 : 0);   // Berlin: Tageslaenge 7.6–16.8 h
  return { sek, auf: mittag - L / 2, unter: mittag + L / 2, text: () => { const s = sek(); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}`; } };
})();
const tagSek = s => { if (!CFG.nurTag) return s; const H = s / 3600; return H >= 8 && H < 17 ? s : 9 * 3600 + (s % (7 * 3600)); };   // nur Tag: Nachtstunden laufen als Tagesablauf (09–16 Uhr) weiter
function nachtGrad(stunde) {   // 0 Tag · .5 Daemmerung · 1 Nacht
  if (CFG.nurTag) return 0;
  const { auf, unter } = ZEIT, k = (a, b, x) => weich((x - a) / (b - a));
  if (stunde < 12) return stunde < auf ? 1 - .5 * k(auf - 1, auf, stunde) : .5 - .5 * k(auf, auf + .75, stunde);
  return stunde < unter ? .5 * k(unter - 1.25, unter, stunde) : .5 + .5 * k(unter, unter + 1, stunde); }
const WETTER = (() => { const q = P.get("wetter"); if (q) return q;   // aus Datum + Jahreszeit (alle sehen dasselbe Wetter)
  const d = +new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date()).replace(/-/g, "") % 100000, x = h2(d, 77);
  return SAISON.name === "winter" ? (x < .35 ? "schnee" : "klar") : SAISON.name === "autumn" ? (x < .28 ? "regen" : x < .48 ? "nebel" : "klar")
    : SAISON.name === "spring" ? (x < .25 ? "regen" : "klar") : (x < .12 ? "regen" : "klar"); })();
const UHR = document.getElementById("uhr");
const uhrText = () => { if (UHR) UHR.textContent = [CFG.nurTag ? null : ZEIT.text(), TX.saison[SAISON.name], TX.wetter[WETTER]].filter(Boolean).join(" · "); };
uhrText();
// ---- "Since your last visit" (nur im Browser des Besuchers, localStorage; kein Server)
{ const el = document.getElementById("seit"), KEY = "realm-besuch", bew = DATEN.haeuser.flatMap(h => h.bewohner), bau = {};
  for (const g of DATEN.gebaeude || []) { const name = g.name || g.schild || g.wunsch; if (!name) continue;
    if (g.fertig && g.n) bau[g.id] = [name, Math.round((g.fertig[1] - g.fertig[0]) / g.n * 100)]; else bau[g.id] = [name, Math.round((g.fortschritt ?? 1) * 100)]; }
  let alt = null; try { alt = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (el && alt && Date.now() - alt.t > 6e5) { const teile = [], neu = bew.filter(h => !alt.bew.includes(h)), weg = alt.bew.filter(h => !bew.includes(h));
    if (neu.length) teile.push(fuell(TX.seit_neu, { namen: neu.slice(0, 3).map(h => "@" + h).join(", ") + (neu.length > 3 ? ` +${neu.length - 3}` : "") }));
    if (weg.length) teile.push(fuell(TX.seit_weg, { n: weg.length }));
    for (const [id, [name, p]] of Object.entries(bau)) { const a = alt.bau?.[id]?.[1]; if (a === undefined) teile.push(fuell(TX.seit_bau_neu, { name })); else if (p > a) teile.push(fuell(TX.seit_bau, { name, plus: p - a })); }
    if (teile.length) { el.innerHTML = `<b>${esc(TX.seit)}</b> ${esc(teile.join(" · "))}<button aria-label="close">×</button>`; el.style.display = "block"; el.querySelector("button").onclick = () => el.style.display = "none"; } }
  if (!alt || Date.now() - alt.t > 6e5) try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), bew, bau })); } catch (e) {} }

// ---- Lage der Haeuser: in Einzugsreihenfolge auf einer Spirale um das Feuer, frei von Bach/Feuer/Unterstand; Fischerhuetten ans Ufer
WEILER = false; flussW = u => 9.5 + 1.8 * Math.sin(u / 5) + .6 * Math.sin(u / 2.3); PFADE = []; PLATZ = [[0, 0, 2.6]]; hoeheFn = hoeheDorf;
const DORF_MITTE_W = 19.5, LAGE = [], belegt = [[0, 0, 4.5], [-3.6, .9, 3.2], [1.9, .5, 2]];
const DOERFER = [DATEN.dorf2, DATEN.dorf3, DATEN.dorf4].map((d, i) => d && d.status === "angelegt" ? Object.assign(d, { nr: i + 2 }) : null).filter(Boolean);   // 18.10. 22:30: weitere Doerfer
// ---- Berg im Sueden: Hoehe als globale Funktion (Gebaeude/Figuren am Berg brauchen sie schon vorher) — 19.10. abends
const BERG_DEF = DATEN.berg || { u: 0, w: -505, lu: 300, lw: 115, h: 62 }; BERG_DEF.steinbruch = BERG_DEF.steinbruch || { u: 30, w: BERG_DEF.w + BERG_DEF.lw * .62 };
const MINEN_RAHMEN = (DATEN.gebaeude || []).filter(g => g.typ === "mine").map(g => ({ u: g.u, w: g.w, c: Math.cos(g.rot || 0), s: Math.sin(g.rot || 0) }));
const BERG_SPORN = (DATEN.gebaeude || []).filter(g => g.typ === "mine").map(g => { const r = g.rot || 0; return { u: g.u - 7 * Math.sin(r), w: g.w + 7 * Math.cos(r), fu: g.u + 3.2 * Math.sin(r), fw: g.w - 3.2 * Math.cos(r) }; });   // 19.10.: Felsausläufer hinter jedem Stollen
function bergRoh(u, w) { let sp = 0; for (const S of BERG_SPORN) sp = Math.max(sp, 13 * Math.exp(-((u - S.u) ** 2 + (w - S.w) ** 2) / (2 * 8.5 * 8.5)) + 4 * Math.exp(-((u - S.u) ** 2 + (w - S.w) ** 2) / (2 * 22 * 22)));
  const B = BERG_DEF, tu = B.u - B.lu * .55, tw = B.w;   // Grat vom Stollen-Ausläufer in den Bergrücken (kein Einzelbuckel)
  for (const S of BERG_SPORN) { const du = tu - S.u, dw = tw - S.w, L2 = du * du + dw * dw, t = Math.max(0, Math.min(1, ((u - S.u) * du + (w - S.w) * dw) / L2)), d = Math.hypot(u - S.u - t * du, w - S.w - t * dw);
    sp = Math.max(sp, (11 + 12 * t) * Math.exp(-d * d / (2 * (9 + 8 * t) ** 2)) * (.85 + .3 * fbm(u * .09, w * .09))); }
  return Math.max(sp, bergRohKern(u, w)); }
function bergRohKern(u, w) { const B = BERG_DEF, x = (u - B.u) / B.lu, z0 = (w - B.w) / B.lw, r2 = x * x + z0 * z0; if (r2 >= 1) return 0; const z = z0 > 0 ? z0 * .55 : z0 * 1.6;   // Nordflanke (Dorfseite) flach + lang, Sued steil
  const kamm = Math.exp(-z * z * 5.5) * (.75 + .25 * Math.cos(x * 5.2)) * (1 - x * x) ** .8, nb = (fbm(u * .045 + 3, w * .045 - 7) - .5) * .5 + (fbm(u * .14, w * .14) - .5) * .18;
  return Math.max(0, (kamm + nb * kamm + .12 * (1 - r2)) * B.h * (1 - r2) ** .35); }
function bergH(u, w) { let y = bergRoh(u, w); const S = BERG_DEF.steinbruch, dq = Math.hypot((u - S.u) / 28, (w - S.w) / 16); if (dq < 1) { const stufe = 3.2; y = Math.min(y, Math.floor(y / stufe) * stufe + (1 - dq) * .4); }
  for (const M of MINEN_RAHMEN) { const du = u - M.u, dw = w - M.w, x = du * M.c + dw * M.s, z = du * M.s - dw * M.c, ax = Math.abs(x);   // v3: Felsmassiv-Nische (Gelände bleibt unter dem Massiv, davor ebener Vorplatz)
    if (ax > 20 || z < -24 || z > 24) continue;
    if (z > 0) y = Math.min(y, Math.hypot(Math.max(0, ax - 6.8), Math.max(0, z - 13.5)) * 1.3);
    else if (z > -9.8) y = Math.min(y, 5.6 + .35 * -z + Math.max(0, ax - 7.5) * 1.2);
    else y = Math.min(y, 9.0 + (-9.8 - z) * 1.1 + Math.max(0, ax - 7.5) * 1.2);
    if (z <= 0 && z > -3 && ax < 9.5) y = Math.min(y, 5.6 * -z / 3 + Math.max(0, ax - 7.5) * 1.2);   // nichts ragt vor die Wand (Gitter 2 m)
    if (ax < 4.4 && z > -10 && z <= .5) y = 0; }
  return y; }
const W_GEB = DATEN.gebaeude || [], W_BP = DATEN.bauplaetze || [], W_DEKO = DATEN.deko || [], W_BERUFE = DATEN.berufe || {};   // aus data/welt-zustand.json (17.10.)
for (const g of W_GEB) belegt.push([g.u, g.w, 5.2]); for (const g of W_BP) belegt.push([g.u, g.w, 3.0]); for (const g of W_DEKO) belegt.push([g.u, g.w, 1.6]);
for (const h of DATEN.haeuser) if (h.u !== undefined) belegt.push([h.u, h.w, h.typ === "langhaus" ? 9.0 : h.typ === "steinhaus_paar" ? 6.5 : 3.0]);   // v3: gespeicherte Plaetze (lage.py)
const passt = (u, w, r) => belegt.every(([a, b, rr2]) => Math.hypot(u - a, w - b) > rr2 + r) && Math.abs(w - flussW(u)) > 2.8 + r * .6;
DATEN.haeuser.forEach((h, i) => {
  const typ = h.art === "geteilt" ? h.typ : (h.typ || WOHNEN[h.seed % WOHNEN.length]), r = typ === "langhaus" ? 6.2 : typ === "doppelhaus" ? 4.8 : 3.4;
  let pos = h.u !== undefined ? [h.u, h.w, 0] : null;   // v3: gespeicherte Lage hat Vorrang
  if (typ === "fischerhuette" && !pos) for (let j = 0; j < 60 && !pos; j++) { const u = (j % 2 ? -1 : 1) * (5 + 4.2 * Math.floor(j / 2)), s = (j >> 1) % 2 ? 1 : -1, w = flussW(u) + s * 3.4; if (passt(u, w, 2.6)) pos = [u, w, s]; }
  for (let k = 0; k < 4000 && !pos; k++) { const a = (i * 2.399963 + k * .61) % (Math.PI * 2), rad = 1.15 * Math.sqrt(k * 9 + i * 6), u = Math.cos(a) * rad, w = DORF_MITTE_W + Math.sin(a) * rad * 1.15; if (passt(u, w, r)) pos = [u, w, 0]; }   // Dorf jenseits des Bachs (Anthony 16.10.)
  if (h.u === undefined) belegt.push([pos[0], pos[1], r]); LAGE.push({ ...h, typ, u: pos[0], w: pos[1], ufer: pos[2] });
});
// ---- Viertel (18.10.): offen = Huetten darin oder Status rodung/offen. Offene Viertel bekommen einen Trampelpfad, keinen Wald, Baumstuempfe + Holzstapel (Rodung).
const W_VIERTEL = DATEN.viertel || [], imViertel = (u, w, v) => Math.hypot((u - v.mitte.u) / 1.15, (w - v.mitte.w) / .95) <= v.r;
for (const v of W_VIERTEL) { v.huetten = LAGE.filter(l => imViertel(l.u, l.w, v)).length; v.offen = v.huetten > 0 || v.status === "rodung" || v.status === "offen"; }
const VOFFEN = W_VIERTEL.filter(v => v.offen && v.id !== "kern"), VFREI = (u, w) => VOFFEN.some(v => Math.hypot((u - v.mitte.u) / 1.15, (w - v.mitte.w) / .95) <= v.r + 1.5);
PFADE = VOFFEN.filter(v => v.weg).map(v => v.weg).concat((DATEN.dorf2 && DATEN.dorf2.status === "angelegt") ? (DATEN.strassen || []) : []);   // 18.10.: Strasse nach Dorf 2
const maxR = Math.max(10, ...LAGE.map(l => Math.hypot(l.u, (l.w - 1) / 1.15)), ...DOERFER.map(d => Math.hypot(d.u, d.w) + 20), ...[...W_GEB, ...W_BP].map(g => Math.hypot(g.u, (g.w - 1) / 1.15)), DORF_MITTE_W + 6,
  ...VOFFEN.map(v => Math.hypot(v.mitte.u, (v.mitte.w - 1) / 1.15) + v.r * .8));
window.__lage = LAGE.map(l => [l.typ, +l.u.toFixed(2), +l.w.toFixed(2)]);
const NS = Math.max(.6, (maxR + 9) / 23);                               // Nebel weicht mit dem Dorf
const ZONE_R = maxR + 14, KACHEL = 45;   // 18.10.: ausserhalb ZONE_R wirft nichts Schatten (Fernwald); Dorf in Kacheln zusammengefasst

// ---- Welt bauen
const c = neueSzene({ c: [0, 2], r: [23 * NS, 46 * NS] }, NS); SPERRE = sperreGitter();
c.sonne.shadow.mapSize.set(2048, 2048); Object.assign(c.sonne.shadow.camera, { left: -60 * NS, right: 60 * NS, top: 60 * NS, bottom: -60 * NS });
const TER = Math.max(260, Math.ceil(2 * (46 * NS * 2.1 + 12)));   // Randschutz: Gelaende reicht bis in den vollen Nebel (Mitte w=2 wie der Nebel)
gelaende(TER, Math.min(300, Math.round(TER)), 2);
const FLUSS = { u0: -TER / 2, schritt: 1.5, y: [] };   // 18.10. Fix: Bach als eigenes Band (faellt nie durch ein grobes Gelaende-Raster)
{ const pos = [], ufer = [], idx = [], n = Math.ceil(TER / FLUSS.schritt), zelle = TER / Math.min(300, Math.round(TER));
  for (let i = 0; i <= n; i++) { const u = FLUSS.u0 + i * FLUSS.schritt, m = flussW(u);
    let y = WASSER_Y + .05; for (const d of [-6, -3.5, 3.5, 6]) for (const du of [-zelle, 0, zelle]) y = Math.max(y, hoehe(u + du, m + d) + .04 * (zelle > 3 ? 1 : 0));
    if (zelle <= 3) y = WASSER_Y + .03; FLUSS.y.push(y);
    pos.push(u, y, -(m + 2.6), u, y, -(m - 2.6)); ufer.push(u, y - .015, -(m + 3.6), u, y - .015, -(m - 3.6));
    if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const mk = (arr, farbe, glanz) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: farbe, roughness: glanz ? .3 : 1, metalness: glanz ? .1 : 0 })); m.receiveShadow = true; scene.add(m); return m; };
  if (zelle > 3) mk(ufer, 0x8a7a4e, false); FLUSS.mesh = mk(pos, PAL.wasser, true); }
const flussY = u => FLUSS.y[Math.max(0, Math.min(FLUSS.y.length - 1, Math.round((u - FLUSS.u0) / FLUSS.schritt)))];
// ---- Wege (18.10. abends, Wunsch "dirt roads"): Erdwege als ein Band-Mesh, leicht unregelmaessig, Breite nach Verkehr (patches/wege.py).
// Ueber Wasser kein Weg — an den Furten liegen Trittsteine. Baeume/Steine meiden die Wege (aufWeg in frei()).
const W_WEGE = DATEN.wege || [], W_FURTEN = DATEN.furten || [];
if (W_WEGE.length) {
  const zelleT = TER / Math.min(300, Math.round(TER)), x0 = -TER / 2, z0 = -TER / 2 - 2;
  const terY = (u, w) => { const fx = (u - x0) / zelleT, fz = (-w - z0) / zelleT, i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j;
    const h = (ii, jj) => hoehe(x0 + ii * zelleT, -(z0 + jj * zelleT));
    return a + b < 1 ? h(i, j) + (h(i + 1, j) - h(i, j)) * a + (h(i, j + 1) - h(i, j)) * b : h(i + 1, j + 1) + (h(i, j + 1) - h(i + 1, j + 1)) * (1 - a) + (h(i + 1, j) - h(i + 1, j + 1)) * (1 - b); };
  const yMax = (u, w, hb) => Math.max(terY(u, w), terY(u + hb, w), terY(u - hb, w), terY(u, w + hb), terY(u, w - hb));
  const RC = 1.0, RU0 = Math.min(...W_WEGE.flatMap(x => x.linie.map(p => p[0]))) - 4, RW0 = Math.min(...W_WEGE.flatMap(x => x.linie.map(p => p[1]))) - 4;
  const RNU = Math.ceil((Math.max(...W_WEGE.flatMap(x => x.linie.map(p => p[0]))) + 4 - RU0) / RC), RNW = Math.ceil((Math.max(...W_WEGE.flatMap(x => x.linie.map(p => p[1]))) + 4 - RW0) / RC);
  const RAST = new Float32Array(RNU * RNW), RAST2 = new Uint8Array(RNU * RNW);   // RAST2: nur Wege/Strassen (ohne Huettenpfade) -> Palisadentore   // halbe Wegbreite je Zelle (0 = kein Weg)
  const pos = [], col = [], idx = [], c = new THREE.Color(), cE = new THREE.Color(PAL.erde), cR = new THREE.Color(PAL.gras), cD = new THREE.Color(PAL.erde).multiplyScalar(.82);
  let n = 0;
  for (const wg of W_WEGE) { const L = wg.linie, haupt = wg.art === "strasse", pfad = wg.art === "pfad";
    const S = []; for (let i = 0; i < L.length - 1; i++) { const [au, aw, ab] = L[i], [bu, bw, bb] = L[i + 1], d = Math.hypot(bu - au, bw - aw), k = Math.max(1, Math.ceil(d / .9));
      for (let t = 0; t < k; t++) S.push([au + (bu - au) * t / k, aw + (bw - aw) * t / k, (ab + (bb - ab) * t / k) || 1]); }
    S.push([L[L.length - 1][0], L[L.length - 1][1], L[L.length - 1][2] || 1]);
    let offen = false;
    for (let i = 0; i < S.length; i++) { const [u, w, b] = S[i], p = S[Math.max(0, i - 1)], q = S[Math.min(S.length - 1, i + 1)];
      let tu = q[0] - p[0], tw = q[1] - p[1]; const tl = Math.hypot(tu, tw) || 1; tu /= tl; tw /= tl;
      const nass = Math.abs(w - flussW(u)) < 3.0;
      const hb = b * .5 * (1 + .16 * (fbm(u * .35 + 7, w * .35) - .5) * 2), hl = hb * (1 + .12 * (rausch(u * 1.7, w * 1.3) - .5)), hr = hb * (1 + .12 * (rausch(u * 1.3 + 9, w * 1.7) - .5));
      for (let ru = -Math.ceil(hb); ru <= Math.ceil(hb); ru++) for (let rw = -Math.ceil(hb); rw <= Math.ceil(hb); rw++) { if (Math.hypot(ru, rw) * RC > hb + .35) continue;
        const gi = Math.round((u + ru * RC - RU0) / RC), gj = Math.round((w + rw * RC - RW0) / RC); if (gi >= 0 && gj >= 0 && gi < RNU && gj < RNW) RAST[gi * RNW + gj] = Math.max(RAST[gi * RNW + gj], hb); if (!pfad) RAST2[gi * RNW + gj] = 1; }
      if (nass) { offen = false; continue; }
      const y = yMax(u, w, hb) + (haupt ? .07 : .06) + (pfad ? -.005 : 0), nu = -tw, nw = tu, mh = fbm(u * .5, w * .5);
      const P = [[u + nu * hl, w + nw * hl], [u + nu * hl * .45, w + nw * hl * .45], [u - nu * hr * .45, w - nw * hr * .45], [u - nu * hr, w - nw * hr]];
      for (let k = 0; k < 4; k++) { pos.push(P[k][0], y, -P[k][1]);
        c.copy(cE).lerp(cD, haupt && (k === 1 || k === 2) ? .35 : .1 + .2 * mh); if (k === 0 || k === 3) c.lerp(cR, pfad ? .45 : .3); col.push(c.r, c.g, c.b); }
      if (offen) { const o = n - 4; for (let k = 0; k < 3; k++) idx.push(o + k, n + k, o + k + 1, o + k + 1, n + k, n + k + 1); }
      n += 4; offen = true; } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; scene.add(m); window.__wege = W_WEGE.length;
  aufHauptweg = (u, w) => { const gi = Math.round((u - RU0) / RC), gj = Math.round((w - RW0) / RC); return gi >= 0 && gj >= 0 && gi < RNU && gj < RNW && RAST2[gi * RNW + gj] === 1; };
  aufWeg = (u, w, r = 0) => { const gi = Math.round((u - RU0) / RC), gj = Math.round((w - RW0) / RC); if (gi < 0 || gj < 0 || gi >= RNU || gj >= RNW) return false;
    const hb = RAST[gi * RNW + gj]; return hb > 0 && r < 2.5; };
  // Trittsteine an den Furten
  const st = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.45, 0), mat("stein"), W_FURTEN.length * 9), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3();
  let si = 0; for (const f of W_FURTEN) for (let k = 0; k < 9; k++) { const w = flussW(f.u) - 2.9 + k * .72, u = f.u + (rausch(k * 3.1, f.u) - .5) * .6;
    M4.compose(V.set(u, flussY(u) + .02, -w), Q.setFromEuler(new THREE.Euler(0, k * 1.3, 0)), new THREE.Vector3(1.1, .45, 1)); st.setMatrixAt(si++, M4); }
  st.receiveShadow = true; st.castShadow = true; scene.add(st); }
lagerfeuer(); setze(unterstand(), -3.6, .9, Math.PI / 2 + .25); setze(holzstapel(1), -1.6, -2.3, .9);
SPERRE.push([-3.6, .9, 2.6], [-1.6, -2.3, 1], [1.9, .5, 1.6]);
const B = Math.PI / 4;
// ---- 18.10.: Holzhuetten gebuendelt (InstancedMesh je Vorlage x Material). Die ersten 6 (Gruender) + geteilte Haeuser bleiben einzeln wie bisher.
// Vorlage = (Variante, seed % PROTO_N); ferne Viertel (> LOD_R von der Mitte) zusaetzlich als einfache Huette, beim Herauszoomen umgeschaltet.
const PROTO_N = 6, LOD_R = 75, PROTO = new Map(), BUENDEL = new Map(), LOD = { detail: [], einfach: [], stand: null };
function vereinen(geos) { const n = geos.reduce((s, x) => s + x.attributes.position.count, 0), geo = new THREE.BufferGeometry();
  for (const a of ["position", "normal", "uv"]) { const it = a === "uv" ? 2 : 3, arr = new Float32Array(n * it); let o = 0; for (const x of geos) { arr.set(x.attributes[a].array, o); o += x.attributes[a].array.length; } geo.setAttribute(a, new THREE.BufferAttribute(arr, it)); }
  geo.computeBoundingSphere(); return geo; }
function zerlegen(g) { const teile = new Map(); g.updateMatrixWorld(true);
  g.traverse(o => { if (!o.isMesh || !o.visible) return; let x = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); x.applyMatrix4(o.matrixWorld);
    if (!x.attributes.uv) x.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); if (!x.attributes.normal) x.computeVertexNormals();
    if (!teile.has(o.material.uuid)) teile.set(o.material.uuid, { m: o.material, g: [] }); teile.get(o.material.uuid).g.push(x); });
  return [...teile.values()].map(t => ({ m: t.m, geo: vereinen(t.g) })); }
function vorlage(v, k) { const key = v + ":" + k; if (PROTO.has(key)) return PROTO.get(key);
  const fl = FENSTERLICHT.length, em = EMITTER.length, g = hausFuer("holzhuette", 50021 + k * 7919, v);
  const kamin = EMITTER.length > em ? EMITTER[em].p.clone() : null; EMITTER.length = em; FENSTERLICHT.length = fl;
  const p = { teile: zerlegen(g), bbox: new THREE.Box3().setFromObject(g), kamin }; PROTO.set(key, p); return p; }
let EINFACH = null;
function einfacheHuette() { if (EINFACH) return EINFACH; const g = new THREE.Group();   // ~40 Dreiecke: Sockel, Wand, Satteldach
  g.add(box(4.0, .5, 3.3, mat("stein"), 0, .1)); g.add(box(3.7, 2.0, 3.0, mat("holz"), 0, 1.35));
  for (const sg of [1, -1]) { const d = box(4.2, .2, 2.2, mat(sg > 0 ? "stroh" : "schindel")); d.position.set(0, 2.85, sg * .78); d.rotation.x = sg * .62; g.add(d); }
  EINFACH = zerlegen(g); return EINFACH; }
const huetteMatrix = (l, rot) => new THREE.Matrix4().compose(new THREE.Vector3(l.u, hoehe(l.u, l.w) - .05, -l.w), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(1, 1, 1));
LAGE.forEach((l, i) => { l.einzelIndex = i; });
for (const l of LAGE) {
  if (l.typ === "holzhuette" && l.art !== "geteilt" && l.einzelIndex >= 6 && P.get("buendel") !== "aus") {   // gebuendelt
    const v = l.var ?? 0, k = l.seed % PROTO_N, pr = vorlage(v, k), rot = l.rot ?? 0, fern = Math.hypot(l.u, l.w - 15) > LOD_R;
    const key = v + ":" + k + (fern ? ":F" : ""); if (!BUENDEL.has(key)) BUENDEL.set(key, { pr, fern, m: [] }); BUENDEL.get(key).m.push(huetteMatrix(l, rot));
    l.lok = pr.bbox; l.g = null; const y = hoehe(l.u, l.w) - .05;
    l.dach = new THREE.Vector3(l.u, y + pr.bbox.max.y + .6, -l.w); l.groesse = Math.max(pr.bbox.max.x - pr.bbox.min.x, pr.bbox.max.z - pr.bbox.min.z);
    if (pr.kamin && Math.hypot(l.u, l.w - DORF_MITTE_W) < 45) { const a = new THREE.Object3D(); a.matrixAutoUpdate = false; a.matrix.copy(huetteMatrix(l, rot)); scene.add(a); a.updateMatrixWorld(true); EMITTER.push({ g: a, p: pr.kamin.clone() }); }
    SPERRE.push([l.u, l.w, 4.4]); continue; }
  const g = l.art === "geteilt" ? hausFuer(l.typ, l.seed, l.var ?? undefined) : l.typ && l.var !== undefined ? hausFuer(l.typ, l.seed, l.var) : wohnhausFuer(l.seed).haus;
  const rot = l.rot !== undefined ? l.rot : l.typ === "fischerhuette" ? (l.ufer < 0 ? 0 : Math.PI) + rr(-.2, .2) : B + (l.seed % 2) * Math.PI / 2 + ((l.seed >> 3) % 7 - 3) * .04;
  l.lok = new THREE.Box3().setFromObject(g); l.g = g;   // lokale Masse fuer Tuer-Schilder
  setze(g, l.u, l.w, rot, -.05); g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g); l.dach = new THREE.Vector3(l.u, bb.max.y + .6, -l.w); l.groesse = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
  SPERRE.push([l.u, l.w, l.typ === "langhaus" ? 7 : l.typ === "doppelhaus" ? 5.5 : l.typ === "steinhaus_paar" ? 8 : 4.4]);
}
for (const { pr, fern, m } of BUENDEL.values()) {
  const setz = (teile, liste) => teile.forEach(t => { const im = new THREE.InstancedMesh(t.geo, t.m, m.length); m.forEach((x, i) => im.setMatrixAt(i, x));
    im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); liste && liste.push(im); });
  setz(pr.teile, fern ? LOD.detail : null); if (fern) setz(einfacheHuette(), LOD.einfach); }
window.__buendel = () => ({ vorlagen: PROTO.size, buendel: BUENDEL.size, huetten: [...BUENDEL.values()].reduce((s, b) => s + b.m.length, 0) });
for (const gd of W_GEB) { const g = BAUTEN[gd.typ] ? BAUTEN[gd.typ](gd) : ARBEIT.includes(gd.typ) ? hausFuer(gd.typ, gd.seed || 7) : null; if (!g) continue;
  (g.userData.stapelExtra || []).forEach(x => x.visible = true);   // Holz ist schon gesammelt
  setze(g, gd.u, gd.w, gd.rot || 0); if (g.userData.festeHoehe !== undefined) g.position.y = g.userData.festeHoehe; const p = gd.fortschritt ?? 1;
  if (p < 1) { if (g.userData.stufen) bauStufe(g, p); else { g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g), hz = bb.min.y + .15 + p * (bb.max.y - bb.min.y);   // Bau waechst von unten
      g.traverse(o => { if (o.isMesh) o.visible = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y < hz; }); } }
  g.updateMatrixWorld(true); if (g.userData.kamin && p >= 1) EMITTER.push({ g, p: g.userData.kamin.clone() }); SPERRE.push([gd.u, gd.w, gd.sperre || 4.8]);
  if (gd.typ === "schmiede" || gd.typ === "grosseschmiede") g.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial && o.material.color.getHex() === 0xff7a2a) {   // 18.10.: Glut der Esse(n) leuchtet
    const q = o.getWorldPosition(new THREE.Vector3()); GLANZ.push({ sp: glanz(q.clone().add(new THREE.Vector3(0, .25, 0)), 0xff8a30, 2.6, .5), tag: .55, nacht: .9 });
    gd.esse = gd.esse || { u: q.x, w: -q.z }; (gd.essen = gd.essen || []).push({ u: q.x, w: -q.z }); } });
  if (g.userData.sitze) gd.sitze = g.userData.sitze.map(([x, z]) => { const q = new THREE.Vector3(x, 0, z).applyMatrix4(g.matrixWorld); return { u: q.x, w: -q.z, r: g.rotation.y + (z < 4.2 ? 0 : Math.PI) }; });
  const bb = new THREE.Box3().setFromObject(g); gd.schildP = gd.schildP || new THREE.Vector3(gd.u, Math.max(bb.max.y, hoehe(gd.u, gd.w) + 1.5) + 1.2, -gd.w); }
for (const bp of W_BP) { setze(BAUTEN.bauplatz(bp.groesse || 3.4), bp.u, bp.w, bp.rot ?? B); SPERRE.push([bp.u, bp.w, (bp.groesse || 3.4) * 2.1]); }
for (const dk of W_DEKO) { if (!BAUTEN[dk.typ]) continue; [dk.u, dk.w] = wegFrei(dk.u, dk.w, dk.typ === "garten" ? 2 : 1); setze(BAUTEN[dk.typ](), dk.u, dk.w, R() * 6); SPERRE.push([dk.u, dk.w, 1.4]); }
for (const d2 of DOERFER) {   // 18.10.: kleiner Dorfplatz von Dorf 2 (ab 22:30 auch Dorf 3): Steinkreis, Feuerstelle, Baenke
  const g = new THREE.Group();
  g.add(box(9, .05, 9, mat(0x9b7b4e), 0, .02, 0));
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, s_ = mesh(new THREE.DodecahedronGeometry(.32, 0), mat("stein")); s_.position.set(Math.cos(a) * 1.3, .12, Math.sin(a) * 1.3); g.add(s_); }
  for (let i = 0; i < 4; i++) { const h = box(.08, .08, 1.0, mat("stamm"), 0, .1, 0); h.rotation.y = i * .8; g.add(h); }
  const fl = mesh(new THREE.ConeGeometry(.35, .8, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 }), false); fl.position.y = .45; g.add(fl);
  for (const [x, z, ry] of [[0, 3, 0], [0, -3, 0], [3, 0, Math.PI / 2]]) { const b = box(2.2, .14, .45, mat("holz"), x, .45, z); b.rotation.y = ry; g.add(b); const b2 = box(.2, .45, .4, mat("holzDunkel"), x, .22, z); b2.rotation.y = ry; g.add(b2); }
  setze(g, d2.u, d2.w, 0); SPERRE.push([d2.u, d2.w, 6]); GLANZ.push({ sp: glanz(new THREE.Vector3(d2.u, hoehe(d2.u, d2.w) + .7, -d2.w), 0xffa040, 2.2, .3), tag: .3, nacht: .8 });
  d2.schildP = new THREE.Vector3(d2.u, hoehe(d2.u, d2.w) + 3, -d2.w); }
{ // Rodung: Stuempfe (1 Draw-Call fuer alle) + ein Holzstapel je offenem Viertel; frisch gerodet (Status rodung) = mehr Stuempfe
  const st = []; for (const v of VOFFEN) { const n = v.status === "rodung" || v.huetten < 3 ? 16 : 9;
    for (let i = 0, k = 0; i < 80 && k < n; i++) { const a = R() * 6.283, q = rr(.35, 1.05) * v.r, u = v.mitte.u + Math.cos(a) * q * 1.15, w = v.mitte.w + Math.sin(a) * q * .95;
      if (frei(u, w, .5)) { st.push([u, w]); SPERRE.push([u, w, .8]); k++; } }
    const a0 = Math.atan2(19.5 - v.mitte.w, -v.mitte.u), hu = v.mitte.u + Math.cos(a0) * v.r * .75, hw = v.mitte.w + Math.sin(a0) * v.r * .7;
    if (frei(hu, hw, .8)) { setze(holzstapel(3), hu, hw, a0); SPERRE.push([hu, hw, 1.4]); }
    if (v.status === "rodung" && !v.huetten) v.schildP = new THREE.Vector3(v.mitte.u, hoehe(v.mitte.u, v.mitte.w) + 2.2, -v.mitte.w); }
  if (st.length) { const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.32, .4, .45, 7), mat("stamm"), st.length), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion();
    st.forEach(([u, w], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(u, hoehe(u, w) + .2, -w), q4.setFromEuler(new THREE.Euler(0, R() * 6, 0)), new THREE.Vector3(1, rr(.7, 1.2), 1))));
    im.castShadow = im.receiveShadow = true; scene.add(im); } }
// ---- Part 2 (17.10. abends): Palisade-Baustelle, Tiere, laufende Bewohner — wie im Reel reel_tag02p2v2 (gleiche Lage/Formeln)
const LEBEN = { rehe: [], hasen: [], voegel: [], laeufer: [], wurzeln: [] };
for (const gd of W_GEB) if (gd.typ === "palisade_baustelle" && gd.fertig) {
  const C = gd.c, PR = gd.r, N = gd.n, PP = [], SEILE = new THREE.Group(); scene.add(SEILE);
  const RAD = gd.radien ? (deg => { const d = ((deg % 360) + 360) % 360, k = Math.floor(d), f = d - k; return gd.radien[k % 360] * (1 - f) + gd.radien[(k + 1) % 360] * f; }) : () => PR;   // 18.10. abends: Radius je Winkel (aeussere Palisade um ganz Dorf 1)
  const FUSS = { grosseschmiede: 7.5, schmiede: 4.5, taverne: 6.5, gemeinschaftsfeld: 13, holzfaellerhuette: 4.5, holzturm: 2.8, brunnen: 1.6, werkstatt: 4.5, wachposten: 1.8, fischerhuette: 3.0, jaegerhuette: 4.5, hexenhuette: 6.0, stall_klein: 6.5, schneiderbank: 1.2, mine: 4.5, steinbruch: 6, gasthaus: 6, fischerei: 5, kaserne: 7.5 };
  const ARC = [];   // 18.10. abends: Pfaehle nach Bogenlaenge verteilen (bei Radius je Winkel sonst Loecher an Ausbuchtungen)
  if (gd.radien) { let L = 0, q = null; for (let k = 0; k <= 4000; k++) { const deg = gd.von_grad + (gd.bis_grad - gd.von_grad) * k / 4000, a = deg * Math.PI / 180, p = { u: C.u + Math.cos(a) * RAD(deg) * (gd.su || 1), w: C.w + Math.sin(a) * RAD(deg) * (gd.sw || 1), deg };
      if (q) L += Math.hypot(p.u - q.u, p.w - q.w); p.L = L; ARC.push(p); q = p; } }
  const degBei = i => { if (!ARC.length) return gd.von_grad + (gd.bis_grad - gd.von_grad) * i / (N - 1); const ziel = ARC[ARC.length - 1].L * i / (N - 1); let lo = 0, hi = ARC.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC[m].L < ziel) lo = m; else hi = m; } return ARC[hi].deg; };
  for (let i = 0; i < N; i++) { const deg = degBei(i), a = deg * Math.PI / 180, r0 = RAD(deg) + (fbm(i * .08, 7.3) - .5) * (gd.radien ? .8 : 4); PP.push({ u: C.u + Math.cos(a) * r0 * (gd.su || 1), w: C.w + Math.sin(a) * r0 * (gd.sw || 1), a }); }
  const HUETTE_NAH = (u, w) => LAGE.some(l => Math.hypot(l.u - u, l.w - w) < (l.typ === "langhaus" ? 8 : gd.radien ? 2.9 : 3.4)) || Math.abs(w - flussW(u)) < 3.6
    || W_GEB.some(g => FUSS[g.typ] && Math.hypot(g.u - u, g.w - w) < FUSS[g.typ] + 1);   // 18.10.: Tor/Luecke statt durch Huetten oder den Bach
  const V = Math.max(0, gd.fertig[0]), Bi = Math.min(N, gd.fertig[1]), KOMPLETT = V <= 0 && Bi >= N; gd.prozent = Math.round((Bi - V) / N * 100);
  const pfahl = (i, p) => { const g = new THREE.Group(), h = 2.5 + h2(i, 3) * .4; const sm = mesh(new THREE.CylinderGeometry(.2, .23, h, 7), mat(i % 3 ? "stamm" : "holz")); sm.position.y = h / 2; g.add(sm);
    const sp = mesh(new THREE.ConeGeometry(.2, .55, 7), mat("stamm")); sp.position.y = h + .27; g.add(sp); setze(g, p.u, p.w, i * 1.7); SPERRE.push([p.u, p.w, 1.6]); };
  const TORE = [];   // 18.10. abends: wo ein Weg die Palisade kreuzt -> Tor (offen)
  let hLuecken = 0, hVorher = false;
  for (const [i, p] of PP.entries()) {
    if (HUETTE_NAH(p.u, p.w)) { const nass = Math.abs(p.w - flussW(p.u)) < 3.6; if (!nass && !hVorher) hLuecken++; hVorher = !nass; continue; } hVorher = false;
    if (aufHauptweg(p.u, p.w) || aufHauptweg(p.u + Math.cos(p.a) * .8, p.w + Math.sin(p.a) * .8) || aufHauptweg(p.u - Math.cos(p.a) * .8, p.w - Math.sin(p.a) * .8)) { const t = TORE[TORE.length - 1]; if (t && i - t.bis <= 2) t.bis = i; else TORE.push({ von: i, bis: i }); continue; }
    if (i >= V && i < Bi) { const g = new THREE.Group(), h = 2.5 + h2(i, 3) * .4;
      const sm = mesh(new THREE.CylinderGeometry(.2, .23, h, 7), mat(i % 3 ? "stamm" : "holz")); sm.position.y = h / 2; g.add(sm);
      const sp = mesh(new THREE.ConeGeometry(.2, .55, 7), mat("stamm")); sp.position.y = h + .27; g.add(sp); setze(g, p.u, p.w, i * 1.7); }
    else if (i % 5 === 0) { const g = new THREE.Group(); g.add(box(.12, .9, .12, mat("holz"), 0, .45, 0)); g.add(box(.16, .12, .16, mat(0xc8402a), 0, .9, 0)); setze(g, p.u, p.w, 0); }
    SPERRE.push([p.u, p.w, 1.6]); }
  let toreGebaut = 0;
  for (const t of [...TORE]) {   // 19.10.: Mini-Luecke (Weg streift nur) -> Pfaehle; langer Lauf (Weg laeuft mit) -> Tor 5 m in der Mitte, Rest Pfaehle
    const L0 = Math.hypot(PP[Math.min(N - 1, t.bis + 1)].u - PP[Math.max(0, t.von - 1)].u, PP[Math.min(N - 1, t.bis + 1)].w - PP[Math.max(0, t.von - 1)].w);
    if (t.bis < V || t.von >= Bi) continue;
    if (L0 < 1.2) { for (let i = t.von; i <= t.bis; i++) if (!HUETTE_NAH(PP[i].u, PP[i].w)) pfahl(i, PP[i]); TORE.splice(TORE.indexOf(t), 1); continue; }
    if (L0 > 10) { const m = Math.round((t.von + t.bis) / 2), halb = Math.max(1, Math.round(2.6 / (L0 / Math.max(1, t.bis - t.von + 2)))); for (let i = t.von; i <= t.bis; i++) if (Math.abs(i - m) > halb && !HUETTE_NAH(PP[i].u, PP[i].w)) pfahl(i, PP[i]); t.von = m - halb; t.bis = m + halb; } }
  for (const t of TORE) { const a = PP[Math.max(0, t.von - 1)], b = PP[Math.min(N - 1, t.bis + 1)], L = Math.hypot(b.u - a.u, b.w - a.w), g = new THREE.Group();
    if (t.bis < V || t.von >= Bi || L > 10 || L < 1.2) continue;   // Weg laeuft an der Palisade entlang -> offene Luecke statt Riesentor
    for (const x of [-L / 2, L / 2]) { const pf = mesh(new THREE.CylinderGeometry(.26, .3, 4.2, 7), mat("stamm")); pf.position.set(x, 2.1, 0); g.add(pf); }
    g.add(box(L + .8, .3, .32, mat("holz"), 0, 3.9, 0)); g.add(box(L + 1.2, .14, .9, mat("holzDunkel"), 0, 4.15, 0));
    for (const sg of [-1, 1]) { const f = box(L * .5 - .2, 2.4, .12, mat("holz"), 0, 1.3, 0), d = new THREE.Group(); f.position.x = -sg * (L * .25 - .1); d.add(f); d.position.set(sg * L / 2, 0, 0); d.rotation.y = sg * 1.25; g.add(d); }
    setze(g, (a.u + b.u) / 2, (a.w + b.w) / 2, -Math.atan2(b.w - a.w, b.u - a.u)); toreGebaut++; }
  gd.tore = toreGebaut; gd.luecken = TORE.length - toreGebaut; gd.huettenluecken = hLuecken;
  const seil = (a, b) => { const L = Math.hypot(b.u - a.u, b.w - a.w), sl = box(L, .04, .04, mat(0xe8dcc0)); sl.position.set((a.u + b.u) / 2, (hoehe(a.u, a.w) + hoehe(b.u, b.w)) / 2 + .7, -(a.w + b.w) / 2); sl.rotation.y = -Math.atan2(b.w - a.w, b.u - a.u); SEILE.add(sl); };   // 18.10.: in Gruppe -> wird zusammengefasst (sonst 1 Draw-Call je Seil)
  for (let i = Bi; i < N - 5; i += 5) seil(PP[i], PP[i + 5]); for (let i = 5; i < V; i += 5) seil(PP[i - 5], PP[i]);
  const M = PP[Math.min(N - 1, Math.round((V + Bi) / 2))], IN = { u: C.u + Math.cos(M.a) * (PR - 4), w: C.w + Math.sin(M.a) * (PR - 4) };
  if (KOMPLETT) { gd.schildP = new THREE.Vector3(M.u, hoehe(M.u, M.w) + 4.2, -M.w); gd.mitte = M; continue; }
  const st = new THREE.Group(); for (let r0 = 0; r0 < 3; r0++) for (let k = 0; k < 6 - r0; k++) { const c2 = mesh(new THREE.CylinderGeometry(.22, .22, 3.6, 7), mat(k % 2 ? "stamm" : "holz"));
    c2.rotation.z = Math.PI / 2; c2.position.set(0, .22 + r0 * .4, -1.1 + k * .44 + r0 * .22); st.add(c2); }
  setze(st, IN.u + 3.5, IN.w - 1, M.a); SPERRE.push([IN.u + 3.5, IN.w - 1, 2.5]);
  [PP[Math.min(N - 1, Bi + 1)], PP[Math.max(0, V - 2)]].filter((p, i) => i ? V > 0 : Bi < N).forEach((p, i) => { const m = mensch({ pose: "axt", tuch: i ? 0x5b6b34 : 0x7a4a5a, hut: !i }); const u = p.u - Math.cos(p.a) * 1.4, w = p.w - Math.sin(p.a) * 1.4;
    m.position.set(u, hoehe(u, w), -w); m.rotation.y = Math.atan2(p.u - u, -(p.w - w)); scene.add(m); SPERRE.push([u, w, 1]); });
  gd.schildP = new THREE.Vector3(M.u, hoehe(M.u, M.w) + 4.2, -M.w); gd.mitte = M; }
function reh(bock) { const g = new THREE.Group(), fell = mat(0x9a6a3e);
  const k = mesh(new THREE.IcosahedronGeometry(.5, 0), fell); k.scale.set(1.5, .75, .7); k.position.y = 1.0; g.add(k);
  for (const [x, z] of [[.5, .18], [.5, -.18], [-.5, .18], [-.5, -.18]]) g.add(box(.09, .85, .09, mat(0x6a4a2c), x, .45, z));
  const hals = new THREE.Group(); hals.position.set(.62, 1.15, 0); g.add(hals); const hs = box(.16, .6, .16, fell, .12, .25, 0); hs.rotation.z = -.5; hals.add(hs);
  const kopf = mesh(new THREE.IcosahedronGeometry(.17, 0), fell); kopf.scale.set(1.5, .9, .8); kopf.position.set(.32, .55, 0); hals.add(kopf);
  for (const z of [-.08, .08]) hals.add(box(.05, .18, .1, fell, .22, .72, z));
  if (bock) for (const z of [-.07, .07]) { const a = box(.03, .32, .03, mat(0xd8c8a0), .26, .82, z); a.rotation.x = z * 4; hals.add(a); }
  g.add(box(.08, .12, .12, mat(0xf0ead8), -.78, 1.1, 0)); g.userData.hals = hals; return g; }
function hase() { const g = new THREE.Group(), fell = mat(0x8a7a62); const k = mesh(new THREE.IcosahedronGeometry(.2, 0), fell); k.scale.set(1.3, .9, .85); k.position.y = .22; g.add(k);
  const kopf = mesh(new THREE.IcosahedronGeometry(.11, 0), fell); kopf.position.set(.22, .36, 0); g.add(kopf);
  for (const z of [-.04, .04]) { const o = box(.04, .22, .06, fell, .2, .55, z); o.rotation.z = -.25; g.add(o); }
  g.add(box(.08, .08, .08, mat(0xf0ead8), -.27, .28, 0)); g.scale.setScalar(1.7); return g; }
// ---- Figuren aus den Kommentaren (18.10.): Dorfkatze (@d.sancheese2), Fass-Bewohner (@philyparz)
const W_FIG = DATEN.figuren || [], FIG = {};
function katze() { const g = new THREE.Group(), fell = mat(0xc8782c), hell = mat(0xf2e6d0), dunkel = mat(0x8a4a1c);
  const k = mesh(new THREE.IcosahedronGeometry(.22, 1), fell); k.scale.set(1.5, .8, .8); k.position.y = .27; g.add(k);
  for (const x of [-.12, .05]) g.add(box(.06, .02, .3, dunkel, x, .43, 0));   // Streifen
  const kopf = new THREE.Group(); kopf.position.set(.3, .42, 0); g.add(kopf);
  const kk = mesh(new THREE.IcosahedronGeometry(.13, 1), fell); kopf.add(kk);
  for (const z of [-.065, .065]) { const o = mesh(new THREE.ConeGeometry(.045, .11, 4), fell); o.position.set(.01, .13, z); kopf.add(o); }
  for (const z of [-.045, .045]) kopf.add(box(.02, .03, .03, mat(0x2a3a20), .12, .03, z));   // Augen
  const beine = []; for (const [x, z] of [[.18, .08], [.18, -.08], [-.18, .08], [-.18, -.08]]) { const b = box(.06, .2, .06, hell, x, .1, z); g.add(b); beine.push(b); }
  const sw = new THREE.Group(); sw.position.set(-.31, .3, 0); sw.add(box(.05, .36, .05, fell, 0, .17, 0)); sw.rotation.z = .5; g.add(sw);
  g.userData = { schwanz: sw, kopf, beine, rumpf: k }; g.scale.setScalar(1.7); return g; }
function fassHeim(f) { const g = new THREE.Group();
  const fa = mesh(new THREE.CylinderGeometry(.95, .95, 1.9, 14), mat("holz")); fa.rotation.z = Math.PI / 2; fa.position.y = .97; g.add(fa);
  for (const x of [-.7, 0, .7]) { const ri = mesh(new THREE.CylinderGeometry(.985, .985, .1, 14), mat(0x4a4038)); ri.rotation.z = Math.PI / 2; ri.position.set(x, .97, 0); g.add(ri); }
  const loch = mesh(new THREE.CircleGeometry(.72, 14), new THREE.MeshBasicMaterial({ color: 0x1c130c }), false); loch.rotation.y = Math.PI / 2; loch.position.set(.965, .97, 0); g.add(loch);
  for (const z of [-.75, .75]) g.add(box(.35, .28, .25, mat("holzDunkel"), -.4, .14, z));
  g.add(box(.5, .05, .7, mat(0x8a3b2a), -.2, 1.93, 0));   // Flicken/Decke oben
  // davor: Sitzklotz, Becher, kleines Feuer
  const kl = mesh(new THREE.CylinderGeometry(.28, .32, .42, 8), mat("stamm")); kl.position.set(1.7, .21, -.5); g.add(kl);
  const be = mesh(new THREE.CylinderGeometry(.07, .06, .14, 8), mat(0x9a9a92)); be.position.set(1.95, .49, -.3); g.add(be);
  for (let i = 0; i < 4; i++) { const h = box(.07, .07, .6, mat("stamm"), 2.9, .06, 0); h.rotation.y = i * .8; h.position.x = 2.9; g.add(h); }
  const fl = mesh(new THREE.ConeGeometry(.22, .55, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 }), false); fl.position.set(2.9, .32, 0); g.add(fl);
  g.userData.flamme = fl; return g; }
for (const f of W_FIG) {
  if (f.typ === "fass" && f.u !== undefined) { [f.u, f.w] = wegFrei(f.u, f.w, 1.6); const g = fassHeim(f); setze(g, f.u, f.w, f.rot ?? Math.PI * .85, 0); SPERRE.push([f.u, f.w, 3.4]);
    const m = mensch({ pose: "sitz", tuch: 0x6d5a3a, hut: true }); const lp = g.localToWorld(new THREE.Vector3(1.7, 0, -.5)); g.updateMatrixWorld(true);
    const p = new THREE.Vector3(1.7, 0, -.5).applyMatrix4(g.matrixWorld); m.position.set(p.x, hoehe(p.x, -p.z) + .12, p.z); m.rotation.y = g.rotation.y + Math.PI / 2; scene.add(m);
    const fw = new THREE.Vector3(2.9, .35, 0).applyMatrix4(g.matrixWorld); GLANZ.push({ sp: glanz(fw, 0xff9a40, 1.6, .35), tag: .35, nacht: .8 });
    FIG.fass = { ...f, g, m, dach: new THREE.Vector3(f.u, hoehe(f.u, f.w) + 3.0, -f.w) }; LEBEN.wurzeln.push(g, m); }
  if (f.typ === "katze") { const g = katze(); scene.add(g); FIG.katze = { ...f, g }; LEBEN.wurzeln.push(g); }
}
// Kleine Polen-Flagge am Haus (weiss/rot, Mast, weht leicht) — @wujekblazej, @benedykt.photography
FIG.flaggen = []; FIG.schaukeln = [];

for (const f of W_FIG) {
  const l = LAGE.find(x => x.bewohner.includes(f.handle)); if (!l) continue;
  if (f.typ === "flagge") { const [u, w] = wegFrei(l.u + 2.4, l.w - 1.6, .5), g = new THREE.Group();
    g.add(box(.08, 3.4, .08, mat("holzDunkel"), 0, 1.7, 0)); const tuch = new THREE.Group(); tuch.position.set(0, 3.25, 0);
    tuch.add(box(1.0, .3, .03, mat(0xf4f1ea), .5, .15, 0)); tuch.add(box(1.0, .3, .03, mat(0xd4213d), .5, -.15, 0)); g.add(tuch);
    setze(g, u, w, .4); SPERRE.push([u, w, .6]); FIG.flaggen.push({ g, tuch, ph: u }); LEBEN.wurzeln.push(g); }
  if (f.typ === "schaukel") { const [u, w] = wegFrei(l.u + 4.4, l.w - 3.8, 1.6), g = new THREE.Group();
    const st = mesh(new THREE.CylinderGeometry(.22, .32, 3.6, 7), mat("stamm")); st.position.y = 1.8; g.add(st);
    const ast = mesh(new THREE.CylinderGeometry(.1, .14, 2.0, 6), mat("stamm")); ast.rotation.z = Math.PI / 2; ast.position.set(.9, 3.3, 0); g.add(ast);
    for (const [x, y, z, rr2] of [[0, 4.3, 0, 1.5], [.9, 4.0, .4, 1.1], [-.5, 3.9, -.3, 1.0]]) { const k = mesh(new THREE.IcosahedronGeometry(rr2, 0), mat("laub2")); k.position.set(x, y, z); g.add(k); }
    const pendel = new THREE.Group(); pendel.position.set(1.6, 3.25, 0); g.add(pendel);
    pendel.add(box(.03, 2.4, .03, mat(0xd8c8a0), 0, -1.2, 0));
    const reifen = mesh(new THREE.TorusGeometry(.32, .11, 6, 12), mat(0x2a2624)); reifen.position.y = -2.55; pendel.add(reifen);
    const kind = mensch({ pose: "sitz", tuch: 0x4f5f78, hut: false, s: 1.1 }); kind.scale.setScalar(.75); kind.position.set(0, -2.95, .05); pendel.add(kind);
    setze(g, u, w, -Math.PI / 2 + .35); SPERRE.push([u, w, 1.6]); FIG.schaukeln.push({ pendel, kind, ph: w }); LEBEN.wurzeln.push(g); }
}
if (FIG.katze) {   // Rundweg mit Unfug: Dorfplatz -> aufs Fass -> Schmiede -> aufs Dach einer Huette -> zurueck
  const sm = W_GEB.find(g => g.typ === "schmiede"), fs = FIG.fass;
  const dachH = LAGE.filter(l => l.typ === "holzhuette" && l.dach).sort((a, b) => Math.hypot(a.u, a.w - 4) - Math.hypot(b.u, b.w - 4))[0];
  const P_ = [{ u: 2.6, w: -3.2, y: 0, ruhe: 3.5 }];
  if (fs) P_.push({ u: fs.u, w: fs.w, y: hoehe(fs.u, fs.w) + 1.93, ruhe: 5, oben: true });
  if (sm) P_.push({ u: sm.u + 2.2, w: sm.w + 2.4, y: 0, ruhe: 3 });
  if (dachH) P_.push({ u: dachH.u, w: dachH.w, y: dachH.dach.y - .75, ruhe: 6, oben: true });
  P_.push({ u: -2.4, w: 3.6, y: 0, ruhe: 3 });
  let T = 0; P_.forEach((p, i) => { const q = P_[(i + 1) % P_.length]; p.t0 = T; p.lauf = Math.hypot(q.u - p.u, q.w - p.w) / 1.7; T += p.ruhe + p.lauf; }); FIG.katze.weg = P_; FIG.katze.T = T; }
// ==== ZUSAGEN-1810:FIGUREN (patches/zusagen_1810.py) — Paar, Hauptmann, Falkner + Falke, Hirten + Herde, Mueller ====
ZUS.raeder.forEach(r => { r.updateWorldMatrix(true, false); scene.attach(r); LEBEN.wurzeln.push(r); });   // Rad aus dem Haus loesen (sonst wird es mit dem Haus zusammengefasst und steht still)
const zGeb = id => W_GEB.find(x => x.id === id), zFig = typ => W_FIG.filter(f => f.typ === typ);
function zFigur(u, w, ry, o, y = 0, fest = true) { const m = mensch(o); m.position.set(u, hoehe(u, w) + y, -w); m.rotation.y = ry; scene.add(m); SPERRE.push([u, w, .9]);
  if (fest) MENSCHEN.splice(MENSCHEN.indexOf(m), 1); else LEBEN.wurzeln.push(m);   // fest: wird mit der Welt zusammengefasst (wenige Draw-Calls), nur der Falkner bleibt einzeln (Falke wechselt Arm/Flug)
  return m; }
const zArme = m => m.userData.m.arme, zOber = m => m.userData.m.ober;
const zBlick = (du, dw) => Math.atan2(du, -dw);   // Figur schaut nach lokal +z; Welt-Richtung (du, dw) -> rotation.y
function zFalke(flug) {
  const g = new THREE.Group(), br = farbe(0x6a4a30), hell = farbe(0xe8dcc0), dk = farbe(0x3a2a1c);
  const rumpf = mesh(new THREE.IcosahedronGeometry(.16, 1), br); rumpf.scale.set(1.5, .8, .8); g.add(rumpf);
  const kopf = mesh(new THREE.IcosahedronGeometry(.085, 1), hell); kopf.position.set(.26, .1, 0); g.add(kopf);
  const schn = mesh(new THREE.ConeGeometry(.035, .1, 5), farbe(0xd8b030)); schn.rotation.z = -Math.PI / 2; schn.position.set(.36, .08, 0); g.add(schn);
  g.add(box(.3, .03, .14, dk, -.34, -.02, 0));
  const fl = [];
  for (const sg of [-1, 1]) { const f = new THREE.Group(); f.position.set(.02, .06, sg * .1); f.add(box(.34, .02, flug ? .62 : .26, br, 0, 0, sg * (flug ? .31 : .1))); f.add(box(.14, .02, flug ? .5 : .2, dk, -.2, 0, sg * (flug ? .32 : .1))); g.add(f); fl.push(f); f.userData.sg = sg; }
  g.userData.fluegel = fl; g.scale.setScalar(flug ? 2.4 : 1.35); return g; }
function zKuh() {
  const g = new THREE.Group(), weiss = mat(0xf0ece4), braun = mat(0x7a4a2c), dk = farbe(0x3a3028), rosa = farbe(0xe8a8a0);
  const k = mesh(new THREE.IcosahedronGeometry(.52, 1), weiss); k.scale.set(1.6, .85, .85); k.position.y = .98; g.add(k);
  const f1 = mesh(new THREE.IcosahedronGeometry(.3, 0), braun); f1.scale.set(1.1, .6, 1.0); f1.position.set(-.2, 1.28, .12); g.add(f1);
  const f2 = mesh(new THREE.IcosahedronGeometry(.24, 0), braun); f2.scale.set(1, .6, 1.0); f2.position.set(.35, 1.18, -.18); g.add(f2);
  g.add(box(.42, .36, .42, weiss, .9, 1.05, 0)); g.add(box(.2, .2, .34, rosa, 1.12, .98, 0));
  for (const z of [-.2, .2]) { g.add(box(.05, .12, .05, farbe(0xe8dcc0), .98, 1.3, z)); g.add(box(.12, .05, .1, braun, .84, 1.12, z * 1.7)); }
  for (const [x, z] of [[.5, .22], [.5, -.22], [-.5, .22], [-.5, -.22]]) g.add(box(.13, .75, .13, dk, x, .38, z));
  g.add(box(.05, .6, .05, dk, -.88, .85, 0)); g.add(box(.3, .22, .3, rosa, -.25, .52, 0));
  return g; }
const zFrei = (cu, cw, rot, r, rmin) => {   // freie Stellen rund um eine Huette, Vorderseite bevorzugt
  const fv = [Math.sin(rot), -Math.cos(rot)], k = [];
  for (let rad = rmin; rad <= rmin + 5; rad += .6) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, u = cu + Math.cos(a) * rad, w = cw + Math.sin(a) * rad;
    if (frei(u, w, r)) k.push({ u, w, s: rad * .6 - (Math.cos(a) * fv[0] + Math.sin(a) * fv[1]) * 2.5 }); }
  return k.sort((p, q) => p.s - q.s); };
{ // ---- Erstes Paar: beide Figuren vor der Steinhuette
  const PH = LAGE.find(l => l.typ === "steinhaus_paar");
  if (PH) { const sg = PH.var === 1 ? -1 : 1, cfg = { kilian_tme: [-sg * 1.0 - .55, { tuch: 0x4f5f78, hut: true, pose: "steh" }, .3], nateilya: [-sg * 1.0 + .75, { tuch: 0x8a3b2a, hut: false, haube: true, pose: "rede" }, -.3] };
    ZUS.paar = [];
    for (const h of PH.bewohner) { const c = cfg[h] || [0, { pose: "steh" }, 0]; const [u, w] = ZL2W(PH, c[0], 2.15 + 1.8);
      const m = zFigur(u, w, PH.rot + c[2], c[1]); ZUS.paar.push({ h, m, u, w }); }
    for (const [px, pz, pr] of [[-1.2, 5.6, 4.6], [-1.2, 9.6, 3.6], [sg * 4.4, 8.4, 3.2]]) { const [fu, fw] = ZL2W(PH, px, pz); SPERRE.push([fu, fw, pr]); }   // Vorplatz + Garten frei von Baeumen
    ZUS.pos.paar = { u: PH.u, w: PH.w }; } }
{ // ---- Hauptmann der Wache am Wachhaus (Podest, Helm mit Kamm, Umhang, Speer)
  const WH = zGeb("wachhaus-1"), f = zFig("hauptmann")[0];
  if (WH && f) { const [u, w] = ZL2W(WH, -.6, 1.7 + 1.2);
    const m = zFigur(u, w, WH.rot, { tuch: 0x7a1f2a, hut: false, haube: false, pose: "steh" }, .3), ob = zOber(m), ar = zArme(m);
    const helm = mesh(new THREE.ConeGeometry(.24, .34, 8), farbe(0x9a9ea6)); helm.position.set(0, 1.08, 0); ob.add(helm);
    const kamm = box(.06, .2, .36, farbe(0xa81f2a), 0, 1.25, 0); ob.add(kamm); ob.add(box(.5, .08, .26, farbe(0x6a6e76), 0, .96, 0));
    ob.add(box(.58, 1.0, .06, farbe(0xa81f2a), 0, .1, -.3)); ob.add(box(.6, .1, .08, farbe(0xe0b040), 0, .56, -.27));   // Umhang + Spange
    const sp = box(.05, 2.5, .05, mat("stamm"), .04, -.7, .08); ar[1].add(sp); const sz = mesh(new THREE.ConeGeometry(.07, .3, 6), farbe(0xc8c8c0)); sz.position.set(.04, .7, .08); ar[1].add(sz);
    ar[1].rotation.x = -.1; ZUS.hauptmann = { m, u, w, h: f.handle }; ZUS.pos.hauptmann = { u, w }; } }
{ // ---- Falkner: Falke auf dem Arm, Sitzpfahl + kleine Voliere neben der Huette; der Falke kreist ab und zu ueber dem Dorf
  const f = zFig("falkner")[0], FH = f && LAGE.find(l => l.bewohner.includes(f.handle));
  if (FH) { const rot = FH.rot ?? 0, k1 = zFrei(FH.u, FH.w, rot, 1.2, 3.4), a = k1[0];
    if (a) { SPERRE.push([a.u, a.w, 1.2]);
      const m = zFigur(a.u, a.w, rot - .4, { tuch: 0x5b6b34, hut: true, pose: "steh" }, 0, false), ar = zArme(m);
      ar[0].rotation.x = -1.3; ar[0].rotation.z = 0; ar[0].add(box(.16, .2, .16, farbe(0x6a4a2c), 0, -.5, 0));   // Falknerhandschuh
      const fa = zFalke(false); fa.rotation.z = -Math.PI / 2; fa.position.set(0, -.68, 0); ar[0].add(fa);
      const k2 = zFrei(FH.u, FH.w, rot, 1.0, 3.4).filter(p => Math.hypot(p.u - a.u, p.w - a.w) > 2.4 && p.w > a.w - .6), b = k2[0];
      if (b) { SPERRE.push([b.u, b.w, 1.0]); const sp = new THREE.Group(); sp.add(box(.2, 1.5, .2, mat("stamm"), 0, .75, 0)); sp.add(box(.9, .08, .08, mat("holz"), 0, 1.5, 0)); sp.add(box(.1, .22, .1, farbe(0x6a4a2c), .4, 1.36, 0));
        const kl = mesh(new THREE.CylinderGeometry(.34, .4, .16, 8), mat("stein")); kl.position.y = .08; sp.add(kl); setze(sp, b.u, b.w, rot + .6); ZUS.pos.sitzpfahl = { u: b.u, w: b.w }; }
      const k3 = zFrei(FH.u, FH.w, rot, 2.0, 4.4).filter(p => Math.hypot(p.u - a.u, p.w - a.w) > 3.4 && (p.w > a.w + 1.2 || Math.abs(p.u - a.u) > 3.6) && (!b || Math.hypot(p.u - b.u, p.w - b.w) > 3.4)), c3 = k3[0];
      if (c3) { SPERRE.push([c3.u, c3.w, 2.0]); const vo = new THREE.Group(), S = 2.2, H3 = 2.3, hd = mat("holzDunkel");
        for (const [x, z] of [[-S / 2, -S / 2], [S / 2, -S / 2], [S / 2, S / 2], [-S / 2, S / 2]]) vo.add(box(.14, H3, .14, mat("stamm"), x, H3 / 2, z));
        for (const [x, z, w2, d2] of [[0, -S / 2, S, .04], [0, S / 2, S, .04], [-S / 2, 0, .04, S], [S / 2, 0, .04, S]]) for (const y of [.5, 1.1, 1.7, H3 - .06]) vo.add(box(w2, .05, d2, hd, x, y, z));
        for (let i = 1; i < 9; i++) { const x = -S / 2 + i * S / 9; for (const z of [-S / 2, S / 2]) vo.add(box(.03, H3 - .1, .03, hd, x, H3 / 2, z)); for (const sx2 of [-1, 1]) vo.add(box(.03, H3 - .1, .03, hd, sx2 * S / 2, H3 / 2, x)); }
        const dp = box(S + .5, .1, S + .5, mat("schindel"), 0, H3 + .1, 0); dp.rotation.x = .14; vo.add(dp); vo.add(box(S - .2, .06, S - .2, mat("heu"), 0, .05, 0)); vo.add(box(.06, .06, S - .4, mat("holz"), 0, 1.0, 0));
        setze(vo, c3.u, c3.w, rot); ZUS.pos.voliere = { u: c3.u, w: c3.w }; }
      const fl = zFalke(true); fl.visible = false; scene.add(fl); LEBEN.wurzeln.push(fl);
      ZUS.falke = { g: fl, arm: fa, hand: ar[0], cu: FH.u, cw: FH.w, h: f.handle }; ZUS.pos.falkner = { u: a.u, w: a.w, hut: [FH.u, FH.w] }; } } }
{ // ---- Weide: Herde (Schafe + Kuehe als Instanzen) und zwei Hirten
  const WS = zGeb("weidestall-1"), P = ZUS.pos.weide;
  if (WS && P) { const { LX, LZ, sx, sz, sw, sd } = P, hirten = zFig("hirte");
    const tiere = [], hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    const heim = [[-6.5, -2.5], [-3.5, -3.6], [0, -1], [2.5, -3.2], [5.5, -1.2], [7, 2.2], [2.5, 3.3], [-.5, 3.4], [-5, .6]];
    heim.forEach(([x, z], i) => tiere.push({ art: i % 4 === 3 ? "kuh" : "schaf", x, z, ax: Math.max(.5, Math.min(1.4 + hash(i) * 1.6, 8.7 - Math.abs(x))), az: Math.max(.5, Math.min(1.1 + hash(i + 9) * 1.2, 5.3 - Math.abs(z))), w1: .11 + hash(i + 3) * .08, w2: .09 + hash(i + 5) * .08, p1: hash(i + 1) * 6.28, p2: hash(i + 2) * 6.28, s: i % 4 === 3 ? 1.15 : 1 }));
    const teile = { schaf: zerlegen(schaf()), kuh: zerlegen(zKuh()) }, M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), SC = new THREE.Vector3();
    const arten = {}; for (const art of ["schaf", "kuh"]) { const lst = tiere.filter(x => x.art === art); arten[art] = { lst, ims: teile[art].map(t => { const im = new THREE.InstancedMesh(t.geo, t.m, lst.length); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; }) }; }
    const pos = (a, t) => { const x = a.x + a.ax * Math.sin(a.w1 * t + a.p1), z = a.z + a.az * Math.sin(a.w2 * t + a.p2), [u, w] = ZL2W(WS, x, z); return [u, w]; };
    ZUS.herde = { n: tiere.length, tick(t) { for (const art in arten) { const A = arten[art]; A.lst.forEach((a, i) => { const [u, w] = pos(a, t), [u2, w2] = pos(a, t + .4), psi = Math.atan2(w2 - w, u2 - u);
          const wipp = art === "schaf" ? .025 * Math.sin(t * 1.3 + a.p1) : 0; M4.compose(V3.set(u, hoehe(u, w) + wipp, -w), Q4.setFromEuler(new THREE.Euler(0, psi, .04 * Math.sin(t * .9 + a.p2))), SC.set(a.s, a.s, a.s)); A.ims.forEach(im => im.setMatrixAt(i, M4)); });
        A.ims.forEach(im => { im.instanceMatrix.needsUpdate = true; }); } } };
    ZUS.herde.tick(0); ZUS.pos.herde = { u: WS.u, w: WS.w, sperre: 12 };
    const tor = ZL2W(WS, 3.0, LZ / 2 + 1.2), ft = ZL2W(WS, 6.2, -LZ / 2 + 2.6);
    const h1 = hirten[0], h2 = hirten[1];
    if (h1) { const m = zFigur(tor[0], tor[1], WS.rot + Math.PI, { tuch: 0x6d5a3a, hut: true, pose: "steh" }), ar = zArme(m); ar[1].add(box(.05, 2.3, .05, mat("stamm"), .06, -.9, .1)); ar[1].rotation.x = -.12; ZUS.hirten = [{ h: h1.handle, m, u: tor[0], w: tor[1] }]; }
    if (h2) { const m = zFigur(ft[0], ft[1], WS.rot + .5, { tuch: 0x5b6b34, hut: false, haube: false, pose: "sitz" }, .0); const st = mesh(new THREE.CylinderGeometry(.34, .4, .45, 8), mat("stamm")); st.position.set(ft[0] - Math.sin(WS.rot + .5) * .5, hoehe(ft[0], ft[1]) + .22, -ft[1] - Math.cos(WS.rot + .5) * .5); scene.add(st); (ZUS.hirten = ZUS.hirten || []).push({ h: h2.handle, m, u: ft[0], w: ft[1] }); } } }
{ // ---- Mueller am Wasserrad-Haus
  const MH = zGeb("wassermuehle-1"), f = zFig("mueller")[0];
  if (MH && f) { const [u, w] = ZL2W(MH, .7, 2.1 + 1.6), m = zFigur(u, w, MH.rot + .25, { tuch: 0xcdb98a, hut: false, haube: false, pose: "sack" });
    ZUS.mueller = { m, u, w, h: f.handle }; ZUS.pos.mueller = { u, w }; } }
{ // ---- 19.10. abends: Herden auf allen weiteren Weiden (gleiche Weide-Form 20 x 13 m), je Weide ein InstancedMesh-Satz
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const teile = { schaf: zerlegen(schaf()), kuh: zerlegen(zKuh()) }, M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), SC = new THREE.Vector3(), E3 = new THREE.Euler();
  ZUS.herden = [];
  for (const WS of W_GEB.filter(g => g.typ === "weidestall" && g.id !== "weidestall-1")) {
    const n = WS.tiere || 10, tiere = [];
    for (let i = 0; i < n; i++) { const x = -7 + (i % 5) * 3.4 + hash(i + WS.u) * 1.2, z = -3.8 + Math.floor(i / 5) * 3.6 + hash(i + WS.w) * .9;
      tiere.push({ art: i % 4 === 3 ? "kuh" : "schaf", x, z, ax: Math.max(.5, Math.min(1.2 + hash(i) * 1.4, 8.7 - Math.abs(x))), az: Math.max(.4, Math.min(1 + hash(i + 9), 5.3 - Math.abs(z))), w1: .11 + hash(i + 3) * .08, w2: .09 + hash(i + 5) * .08, p1: hash(i + 1) * 6.28, p2: hash(i + 2) * 6.28, s: i % 4 === 3 ? 1.15 : 1 }); }
    const arten = {}; for (const art of ["schaf", "kuh"]) { const lst = tiere.filter(x => x.art === art); if (!lst.length) continue; arten[art] = { lst, ims: teile[art].map(t => { const im = new THREE.InstancedMesh(t.geo, t.m, lst.length); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; }) }; }
    const pos = (a, t) => ZL2W(WS, a.x + a.ax * Math.sin(a.w1 * t + a.p1), a.z + a.az * Math.sin(a.w2 * t + a.p2));
    const h = { n, tick(t) { for (const art in arten) { const A = arten[art]; A.lst.forEach((a, i) => { const [u, w] = pos(a, t), [u2, w2] = pos(a, t + .4);
        M4.compose(V3.set(u, hoehe(u, w), -w), Q4.setFromEuler(E3.set(0, Math.atan2(w2 - w, u2 - u), 0)), SC.set(a.s, a.s, a.s)); A.ims.forEach(im => im.setMatrixAt(i, M4)); }); A.ims.forEach(im => { im.instanceMatrix.needsUpdate = true; }); } } };
    h.tick(0); ZUS.herden.push(h); }
}
// ---- 19.10. abends: Reiter + Karren auf den Strassen zwischen den Doerfern (Anthony: „2 Pferde auf 3000 Menschen wäre ziemlich traurig“)
const RITT = (() => { const S = (DATEN.wege || []).filter(w => w.art === "strasse" && w.linie.length > 3).map(w => { const P = w.linie; let L = 0; const acc = [0];
    for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); acc.push(L); } return { P, L, acc }; }).filter(x => x.L > 120);
  const out = [], hash = n => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5; return s - Math.floor(s); };
  const pferd = fell => { const p = new THREE.Group(), m = mat(fell), dk = mat(0x2a1e16); p.add(box(1.5, .62, .55, m, 0, 1.15, 0)); for (const [lx, lz] of [[.55, .2], [.55, -.2], [-.55, .2], [-.55, -.2]]) p.add(box(.14, .9, .14, m, lx, .45, lz));
    const hl = box(.3, .8, .32, m, .78, 1.55, 0); hl.rotation.z = -.55; p.add(hl); const kp = box(.55, .28, .26, m, 1.08, 1.95, 0); kp.rotation.z = -.25; p.add(kp); const sw = box(.1, .7, .1, dk, -.8, .95, 0); sw.rotation.z = .4; p.add(sw); return p; };
  S.forEach((s, si) => { const n = Math.max(2, Math.round(s.L / 140)); for (let k = 0; k < n; k++) { const g = new THREE.Group(), fell = [0x7a4a28, 0xe8e0d0, 0x3a2a1c, 0x9a7a50][(si * 3 + k) % 4];
      const pf = pferd(fell); g.add(pf); const karre = (si + k) % 3 === 2;
      if (karre) { g.add(box(2.0, .5, 1.3, mat("holz"), -2.0, .9, 0)); for (const z of [-.7, .7]) { const rad = mesh(new THREE.CylinderGeometry(.45, .45, .1, 10), mat("holzDunkel")); rad.rotation.x = Math.PI / 2; rad.position.set(-2.1, .45, z); g.add(rad); }
        g.add(box(.9, .5, .9, mat("stroh"), -2.1, 1.35, 0)); const m = mensch({ pose: "sitz", tuch: 0x6d5a3a, hut: true }); m.position.set(-1.3, .7, 0); m.rotation.y = Math.PI / 2; g.add(m); }
      else { const m = mensch({ pose: "sitz", tuch: [0x5b4a3a, 0x3f5a6a, 0x7a3a2a][k % 3], hut: k % 2 === 0 }); m.position.set(.05, 1.0, 0); m.rotation.y = Math.PI / 2; g.add(m); }
      scene.add(g); LEBEN.wurzeln.push(g); out.push({ g, s, v: karre ? 1.6 : 2.6, ph: hash(si * 10 + k) * s.L, karre }); } });
  window.__rittDbg = () => out.slice(0, 3).map(r => { let m = 0, v = 0; r.g.traverse(o => { if (o.isMesh) { m++; if (o.visible) v++; } }); return { pos: r.g.position.toArray().map(x => +x.toFixed(1)), parent: r.g.parent === scene, vis: r.g.visible, meshes: m, sicht: v, kinder: r.g.children.length }; });
  window.__ritt = () => out.map(r => [+r.g.position.x.toFixed(1), +(-r.g.position.z).toFixed(1), r.karre]);
  return { n: out.length, tick(t) { for (const r of out) { const s = r.s, z = (r.ph + t * r.v) % (2 * s.L), d = z < s.L ? z : 2 * s.L - z, rueck = z >= s.L;
      let i = 1; while (i < s.acc.length - 1 && s.acc[i] < d) i++; const a = s.P[i - 1], b = s.P[i], f = (d - s.acc[i - 1]) / Math.max(.01, s.acc[i] - s.acc[i - 1]);
      const side = rueck ? -1.1 : 1.1, dx = b[0] - a[0], dw = b[1] - a[1], l = Math.hypot(dx, dw) || 1, u = a[0] + dx * f - dw / l * side, w = a[1] + dw * f + dx / l * side;
      r.g.position.set(u, hoehe(u, w) + (r.karre ? 0 : .04 * Math.abs(Math.sin(t * 8))), -w); r.g.rotation.y = Math.atan2(rueck ? -dw : dw, rueck ? -dx : dx); } } }; })();
function ZUSAGEN_LEBEN(t) {
  t = ZUS.frieren != null && ZUS.frieren !== undefined ? ZUS.frieren : t + (ZUS.t0 || 0);
  for (const r of ZUS.raeder) r.rotation.z = -t * .5;
  if (ZUS.herde) ZUS.herde.tick(t);
  for (const h of ZUS.herden || []) h.tick(t); RITT.tick(t);
  const F = ZUS.falke; if (F) {
    const T = 75, z = t % T, ez = x => x * x * (3 - 2 * x), H0 = hoehe(F.cu, F.cw) + 12, Rr = 17, fl = F.g.userData.fluegel;
    const bahn = a => [F.cu + Math.cos(a) * Rr * 1.2, F.cw + Math.sin(a) * Rr, H0 + 1.6 * Math.sin(a * 2)];
    F.hand.updateWorldMatrix(true, false); const hp = new THREE.Vector3(0, -.68, 0).applyMatrix4(F.hand.matrixWorld), am = [hp.x, -hp.z, hp.y];
    const a44 = 0.4, a62 = a44 + 2 * Math.PI * 1.2;
    let p = null, v = null;
    if (z >= 38 && z < 44) { const k = ez((z - 38) / 6), b = bahn(a44); p = [am[0] + (b[0] - am[0]) * k, am[1] + (b[1] - am[1]) * k, am[2] + (b[2] - am[2]) * k + 2 * Math.sin(k * Math.PI)]; }
    else if (z >= 44 && z < 62) { const a = a44 + (z - 44) / 18 * (a62 - a44); p = bahn(a); }
    else if (z >= 62 && z < 68) { const k = ez((z - 62) / 6), b = bahn(a62); p = [b[0] + (am[0] - b[0]) * k, b[1] + (am[1] - b[1]) * k, b[2] + (am[2] - b[2]) * k]; }
    const flug = !!p; F.g.visible = flug; F.arm.visible = !flug;
    if (flug) { const q = z < 44 ? 44.0001 : z, pr = F.prev || p, dx = p[0] - pr[0], dw = p[1] - pr[1];
      F.g.position.set(p[0], p[2], -p[1]); if (Math.hypot(dx, dw) > 1e-4) F.g.rotation.y = Math.atan2(dw, dx);
      F.prev = p; const flap = (z < 44 || z >= 62) ? .75 * Math.sin(t * 11) : .12 * Math.sin(t * 3) - .08;
      fl.forEach(f => { f.rotation.x = f.userData.sg * flap; }); F.g.rotation.z = (z >= 44 && z < 62) ? .32 : 0; } else F.prev = null; } }
window.__zusagen = () => ({ pos: ZUS.pos, falke: ZUS.falke ? { sichtbar: ZUS.falke.g.visible, p: [ZUS.falke.g.position.x, ZUS.falke.g.position.y, -ZUS.falke.g.position.z] } : null, herde: ZUS.herde ? ZUS.herde.n : 0, raeder: ZUS.raeder.length,
  figuren: { paar: (ZUS.paar || []).map(x => x.h), hauptmann: ZUS.hauptmann?.h, falkner: ZUS.falke?.h, hirten: (ZUS.hirten || []).map(x => x.h), mueller: ZUS.mueller?.h } });
window.__zusagen_t0 = s => { ZUS.t0 = s; }; window.__zusagen_frieren = s => { ZUS.frieren = s; };   // nur Pruefung: Zeitversatz, um den Falken im Flug zu zeigen
window.__falke_zeit = t => { const F = ZUS.falke; if (!F) return null; ZUSAGEN_LEBEN(t); return { flug: F.g.visible, p: F.g.visible ? [F.g.position.x, F.g.position.y, -F.g.position.z] : null }; };
// ==== /ZUSAGEN-1810:FIGUREN ====
// ==== TURM-1910:FIGUREN (patches/turm_1910.py) — Hausherr + Gelehrte, schwebende Buecher/Steine, Dampf, Funken, Kristall-Leuchten, Pfad ====
{ const TG = W_GEB.find(x => x.typ === "zauberturm");
  if (TG && TURM.g) {
    const g = TURM.g, ud = g.userData, W3 = (o, x, y, z) => o.localToWorld(new THREE.Vector3(x, y, z)); g.updateMatrixWorld(true);
    const lab = g.children.find(c => c.isGroup && c.userData && c.position.x === ud.lab[0] && c.position.z === ud.lab[1]) || g;
    const kr = W3(g, ...ud.kristall), sp = W3(g, ...ud.spitze); TURM.pos = { u: TG.u, w: TG.w, hoehe: ud.hoehe, kristall: { u: kr.x, w: -kr.z, y: kr.y }, var: TURM.var };
    // ---- Leuchten (auch bei Tag): Halo-Sprites um den Kristall, pulsieren
    const farbeV = { A: 0xb46cff, B: 0x59ffd6, C: 0xc47cff }[TURM.var];
    TURM.halo.push({ sp: glanz(kr.clone(), farbeV, 14, .85), g0: 14 }, { sp: glanz(kr.clone().add(new THREE.Vector3(0, .5, 0)), 0xffffff, 5.5, .8), g0: 5.5 });
    for (const h of TURM.halo) GLANZ.push({ sp: h.sp, tag: .75, nacht: .95 });
    // ---- Schwebende Buecher / Runensteine (1 InstancedMesh, Farben je Instanz)
    const O = ud.orbit, oc = W3(g, O.c[0], 0, O.c[1]);
    const geo = O.typ === "buch" ? new THREE.BoxGeometry(1.1, .2, .8) : new THREE.OctahedronGeometry(.62, 0), im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: .6, emissive: 0x2a1850, emissiveIntensity: .55 }), O.n);
    const cols = O.typ === "buch" ? [0x8a2b3a, 0x2b5a8a, 0x3b7a4a, 0x7a4a8a, 0xb88a2a] : [0x6a6a78, 0x7a7a8a, 0x58586a]; const cc = new THREE.Color(); for (let i = 0; i < O.n; i++) im.setColorAt(i, cc.setHex(cols[i % cols.length]));
    im.castShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); TURM.orbit = { im, O, cx: oc.x, cz: oc.z, y0: oc.y + O.y - ud.hoehe * 0 };
    if (O.typ === "stein") { const rim = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.3, 0), new THREE.MeshBasicMaterial({ color: 0x9a7cff }), O.n); rim.frustumCulled = false; rim.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(rim); TURM.orbit.glut = rim; }
    // ---- Partikel: Dampf (gruen/violett/tuerkis) und Funken als EIN Points-Objekt je Art mit eigenem Shader (Groesse + Alpha je Teilchen)
    const SH = size => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: rauchTex }, px: { value: 10 } },
      vertexShader: "attribute float gr; attribute float al; attribute vec3 fa; varying float vA; varying vec3 vF; uniform float px; void main(){ vA = al; vF = fa; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = gr * px; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform sampler2D map; varying float vA; varying vec3 vF; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vF, t.a * vA); }" });
    const pts = (n, size) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute("gr", new THREE.BufferAttribute(new Float32Array(n), 1));
      geo.setAttribute("al", new THREE.BufferAttribute(new Float32Array(n), 1)); geo.setAttribute("fa", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const p = new THREE.Points(geo, SH(size)); p.frustumCulled = false; scene.add(p); return p; };
    const Q = TURM.quellen.map(q => { const w = W3(q.lok[0], q.lok[4], q.lok[5], q.lok[6]); return { x: w.x, y: w.y, z: w.z, f: q.farbe, rate: q.rate, gross: !!q.gross }; });
    const DF = [new THREE.Color(0x58e04a), new THREE.Color(0xa65cff), new THREE.Color(0x3fe8c8)], VF = TURM.var === "B" ? [1, 0] : TURM.var === "C" ? [0, 1] : [0, 2];
    const nD = 110, nF = 46; TURM.dampf = { p: pts(nD, 1), n: nD, q: Q, DF, VF }; TURM.funken = { p: pts(nF, 1), n: nF, c: [W3(g, 0, 0, 0), W3(lab, 0, 0, 7)], ud };
    TURM.px = () => innerHeight / (cam.top - cam.bottom);
    // ---- Pfad zum Hauptweg (Erdband aus Quadern, 1 InstancedMesh) + Baumfreiheit
    { let best = null; const door = W3(g, ...ud.tuer), du = door.x, dw = -door.z;
      for (const wg of W_WEGE) for (let i = 0; i < wg.linie.length - 1; i++) { const [a0, a1] = wg.linie[i], [b0, b1] = wg.linie[i + 1], L = Math.hypot(b0 - a0, b1 - a1), n = Math.max(1, Math.ceil(L / 2));
        for (let k = 0; k <= n; k++) { const u = a0 + (b0 - a0) * k / n, w = a1 + (b1 - a1) * k / n, d = Math.hypot(u - du, w - dw); if (!best || d < best.d) best = { d, u, w }; } }
      if (best && best.d < 90) { const n = Math.ceil(best.d / 1.6), pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, .1, 1.9), mat("erde"), n), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < n; i++) { const t = i / (n - 1 || 1), u = du + (best.u - du) * t + Math.sin(t * 9 + 1) * .9 * Math.sin(t * Math.PI), w = dw + (best.w - dw) * t;
          m4.compose(v3.set(u, hoehe(u, w) + .04, -w), q4.setFromEuler(new THREE.Euler(0, i * .9, 0)), s3.set(1 + .3 * Math.sin(i * 2.1), 1, 1 + .25 * Math.cos(i * 1.7))); pm.setMatrixAt(i, m4); if (i % 2 === 0) SPERRE.push([u, w, 1.8]); }
        pm.receiveShadow = true; scene.add(pm); TURM.pos.pfad = { n, laenge: Math.round(best.d), zu: [Math.round(best.u), Math.round(best.w)] }; } }
    // ---- Figuren: Hausherr an der Tuer, Gelehrte vor dem Turm und im Labor
    const WF = W_FIG.filter(f => f.typ === "turmwaechter" || f.typ === "gelehrter"), HUT = [0x4a2f7a, 0x2f4f8a, 0x1f6a5a, 0x7a2f5a, 0x3a3a52, 0x8a5a1f];
    const zm = (o, n) => { const alt = R; R = rng(1910 + n * 31); const m = mensch(o); R = alt; MENSCHEN.splice(MENSCHEN.indexOf(m), 1); return m; };
    const hutSetzen = (m, farbe, hoch) => { const ob = m.userData.m.ober, hm = farbe_(farbe); const kegel = mesh(new THREE.ConeGeometry(.2, hoch, 7), hm); kegel.position.set(0, 1.12 + hoch / 2 - .12, 0); kegel.rotation.z = .15; ob.add(kegel);
      const rand = mesh(new THREE.CylinderGeometry(.34, .34, .03, 9), hm); rand.position.set(0, 1.04, 0); ob.add(rand); ob.add(box(.38, .04, .38, farbe_(0xd9b04a), 0, 1.07, 0).rotateY(.4)); };
    const farbe_ = c => mat(c);
    const spots = [], doorL = ud.tuer, labL = [[-2.4, 0, 4.9], [.3, 0, 6.0], [1.2, 0, 3.4], [3.4, 0, 5.0], [-3.6, 0, 6.6], [0, 0, 1.2]], labW = W3(lab, 0, 0, 5);
    const tw = W3(g, 0, 0, 0), dW = W3(g, doorL[0], 0, doorL[2]);   // Gelehrte stehen locker rund um den Turm (Goldener Winkel), nicht im Labor und nicht auf dem Zugangspfad
    for (let k = 0; spots.length < 80 && k < 600; k++) { const a = k * 2.399963, r = 8.5 + 1.3 * Math.sqrt(k), u = tw.x + Math.cos(a) * r, w = -tw.z + Math.sin(a) * r;
      if (Math.hypot(u - labW.x, w + labW.z) < 8 || Math.hypot(u - dW.x, w + dW.z) < 3 || Math.abs(w - flussW(u)) < 4) continue; spots.push(new THREE.Vector3(u, 0, -w)); }
    const labSpots = labL.map(([x, y, z]) => W3(lab, x, y, z)); const poses = ["rede", "steh", "korb", "sack", "steh", "rede"]; let si = 0, li = 0, n = 0; TURM.pos.figuren = [];
    for (const f of WF.sort((a, b) => (b.typ === "turmwaechter") - (a.typ === "turmwaechter"))) { n++;
      const hausherr = f.typ === "turmwaechter", ort = hausherr ? W3(g, doorL[0] - 1.3, 0, doorL[2] + .4) : (li < labSpots.length && n % 4 === 0 ? labSpots[li++] : spots[Math.min(si++, spots.length - 1)]);
      const m = zm({ tuch: HUT[n % HUT.length], hut: false, haube: false, pose: hausherr ? "steh" : poses[n % poses.length] }, n); hutSetzen(m, HUT[(n + 2) % HUT.length], hausherr ? .8 : .55);
      if (hausherr) { const ar = m.userData.m.arme, stab = mesh(new THREE.CylinderGeometry(.03, .04, 2.1, 5), mat("stamm")); stab.position.set(.07, -.75, .08); ar[1].add(stab); const orb = mesh(new THREE.IcosahedronGeometry(.12, 1), TU.vio(), false); orb.position.set(.07, .35, .08); ar[1].add(orb); ar[1].rotation.x = -.15; }
      const u = ort.x, w = -ort.z; m.position.set(u, hoehe(u, w), -w); m.rotation.y = Math.atan2(TG.u - u, -(TG.w - w)) + (hausherr ? Math.PI : (n % 2 ? .6 : -.6)); scene.add(m); SPERRE.push([u, w, .9]);
      TURM.pos.figuren.push({ h: f.handle, typ: f.typ, titel: f.titel, u: +u.toFixed(1), w: +w.toFixed(1) }); f.__ort = { u, w }; }
  } }
const TURM_ZEIT = { t0: 0 };
function TURM_LEBEN(t) {
  if (!TURM.orbit) return; if (TURM.frieren != null) t = TURM.frieren; const O = TURM.orbit, D = O.O, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < D.n; i++) { const a = t * 2 * Math.PI / D.lang + i / D.n * 2 * Math.PI, r = D.r * (1 + .08 * Math.sin(i * 2.3)), y = O.y0 + .9 * Math.sin(t * .9 + i * 1.7) + (i % 3) * 1.1 - 1.0;
    e.set(.25 * Math.sin(t * .6 + i), -a + i, .35 * Math.sin(t * .8 + i * 2)); m4.compose(v.set(O.cx + Math.cos(a) * r, y, O.cz + Math.sin(a) * r), q.setFromEuler(e), s.set(1, 1, 1)); O.im.setMatrixAt(i, m4);
    if (O.glut) { m4.compose(v.set(O.cx + Math.cos(a) * r, y, O.cz + Math.sin(a) * r), q.setFromEuler(e), s.set(.7 + .3 * Math.sin(t * 3 + i), .7 + .3 * Math.sin(t * 3 + i), .7 + .3 * Math.sin(t * 3 + i))); O.glut.setMatrixAt(i, m4); } }
  O.im.instanceMatrix.needsUpdate = true; if (O.glut) O.glut.instanceMatrix.needsUpdate = true;
  const pl = .92 + .12 * Math.sin(t * 2.1) + .06 * Math.sin(t * 5.3); for (const h of TURM.halo) h.sp.scale.setScalar(h.g0 * pl);
  const px = TURM.px(), Dp = TURM.dampf, pos = Dp.p.geometry.attributes.position, gr = Dp.p.geometry.attributes.gr, al = Dp.p.geometry.attributes.al, fa = Dp.p.geometry.attributes.fa; Dp.p.material.uniforms.px.value = px;
  for (let i = 0; i < Dp.n; i++) { const q_ = Dp.q[i % Dp.q.length], per = q_.gross ? 5.5 : 4, ph = (t / per + i * .6180339) % 1, wob = Math.sin(t * .8 + i * 1.3);
    pos.setXYZ(i, q_.x + wob * (.25 + ph * .9) * (q_.gross ? 1 : .6), q_.y + ph * (q_.gross ? 5.4 : 3.6), q_.z + Math.cos(t * .7 + i) * (.2 + ph * .8));
    gr.setX(i, (q_.gross ? 1.5 : 1.0) * (.5 + ph * 1.8)); al.setX(i, Math.min(1, ph * 6) * (1 - ph) * .85 * q_.rate); const c = Dp.DF[Dp.VF[q_.f]]; fa.setXYZ(i, c.r, c.g, c.b); }
  pos.needsUpdate = gr.needsUpdate = al.needsUpdate = fa.needsUpdate = true;
  const F = TURM.funken, fp = F.p.geometry.attributes.position, fg = F.p.geometry.attributes.gr, fl = F.p.geometry.attributes.al, ff = F.p.geometry.attributes.fa; F.p.material.uniforms.px.value = px;
  for (let i = 0; i < F.n; i++) { const c = F.c[i % 2], a = t * (.12 + (i % 5) * .03) + i * 2.4, r = (i % 2 ? 4 : 9) + 3 * Math.sin(i * 1.7), y = (i % 2 ? 1.4 : 3.5) + 2.2 * Math.sin(t * .5 + i) + 1.4 * Math.sin(t * 1.3 + i * 3);
    fp.setXYZ(i, c.x + Math.cos(a) * r, c.y + Math.max(.5, y) + (i % 2 ? 0 : (i % 7) * 1.2), c.z + Math.sin(a) * r); fg.setX(i, .55 + .25 * Math.sin(t * 4 + i)); fl.setX(i, .6 + .4 * Math.sin(t * 2.7 + i * 5)); const col = i % 3 === 0 ? [1, .95, .4] : i % 3 === 1 ? [.55, 1, .45] : [.8, .6, 1]; ff.setXYZ(i, col[0], col[1], col[2]); }
  fp.needsUpdate = fg.needsUpdate = fl.needsUpdate = ff.needsUpdate = true; }
window.__turm = () => ({ ...TURM.pos, pfad: TURM.pos.pfad || null }); window.__turm_frieren = s => { TURM.frieren = s; };
// ==== /TURM-1910:FIGUREN ====
for (const dk of W_DEKO) {
  if (dk.typ === "reh") { const g = reh(dk.bock); setze(g, dk.u, dk.w, dk.rot || 0); SPERRE.push([dk.u, dk.w, 1.4]); LEBEN.rehe.push({ g, u: dk.u, ph: h2(dk.u * 10, 1) * 6 }); LEBEN.wurzeln.push(g); }
  if (dk.typ === "hase") { const g = hase(); setze(g, dk.u, dk.w, 0); SPERRE.push([dk.u, dk.w, 1]); LEBEN.hasen.push({ g, u: dk.u, w: dk.w, ph: h2(dk.u * 10, 2) * 6, dir: h2(dk.w * 10, 3) * 6 }); LEBEN.wurzeln.push(g); }
  if (dk.typ === "voegel") { const fl = new THREE.MeshBasicMaterial({ color: 0x3a3028, side: THREE.DoubleSide });
    for (let i = 0; i < (dk.n || 11); i++) { const g = new THREE.Group(); for (const sg of [-1, 1]) { const f = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.1, 0, 0), new THREE.Vector3(-.12, 0, sg * .55), new THREE.Vector3(.1, 0, sg * .32)]), fl); f.userData.s = sg; g.add(f); }
      g.scale.setScalar(.95); scene.add(g); LEBEN.voegel.push({ g, dx: (i % 4) * 1.6 - 2.4 + h2(i, 4), dw: Math.floor(i / 4) * 1.8 + h2(i, 5), ph: h2(i, 6) * 6 }); } } }
// ---- 18.10.: Wald gebuendelt (InstancedMesh je Bauteil): gleiche Baumform wie baum(), aber ohne Einzel-Meshes -> schnell laden, wenige Draw-Calls
const WALD = (() => {
  const T = { stammL: [], stammT: [], laub: [], laub2: [], laub3: [], tanne0: [], tanne1: [], tanne2: [] }, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const grp = new THREE.Object3D(), teil = new THREE.Object3D(); grp.add(teil);
  function rein(liste, x, y, z, rx, ry, sx, sy, sz, fern) { teil.position.set(x, y, z); teil.rotation.set(rx, ry, 0); teil.scale.set(sx, sy, sz); teil.updateMatrix(); grp.updateMatrixWorld(true); teil.updateMatrixWorld(true);
    liste.push([teil.matrixWorld.clone(), fern]); }
  return {
    baum(art, s, u, w, rot, einfach) { const fern = Math.hypot(u, w - DORF_MITTE_W * .6) > ZONE_R;
      grp.position.set(u, hoehe(u, w), -w); grp.rotation.set(0, rot, 0); grp.scale.setScalar(s); grp.updateMatrixWorld(true);
      if (art === "tanne") { rein(T.stammT, 0, .6, 0, 0, 0, 1, 1, 1, fern); for (let i = 0; i < 3; i++) rein(T["tanne" + i], 0, 1.6 + i * 1.05, 0, 0, R() * 3, 1, 1, 1, fern); }
      else { rein(T.stammL, 0, 1.1, 0, 0, 0, 1, 1, 1, fern); const fk = pick(["laub", "laub", "laub2", "laub3"]);
        for (let i = 0; i < (einfach ? 1 : 3); i++) { const r0 = rr(einfach ? 1.4 : 1.0, 1.45); rein(T[fk], rr(-.6, .6), 2.6 + rr(0, .9) + i * .25, rr(-.6, .6), R() * 3, R() * 3, r0, r0, r0, fern); } } },
    fertig() { const GEO = { stammL: new THREE.CylinderGeometry(.15, .24, 2.2, 5), stammT: new THREE.CylinderGeometry(.14, .2, 1.2, 5), laub: new THREE.IcosahedronGeometry(1, 0),
        tanne0: new THREE.ConeGeometry(1.6, 1.9, 6), tanne1: new THREE.ConeGeometry(1.2, 1.9, 6), tanne2: new THREE.ConeGeometry(.8, 1.9, 6) };
      const MAT = { stammL: mat("stamm"), stammT: mat("stamm"), laub: mat("laub"), laub2: mat("laub2"), laub3: mat("laub3"), tanne0: mat("tanne"), tanne1: mat("tanne"), tanne2: mat("tanne") };
      let n = 0; for (const [k, liste] of Object.entries(T)) for (const fern of [false, true]) { const l = liste.filter(x => x[1] === fern); if (!l.length) continue;
        const g = (GEO[k] || GEO.laub).clone(); if (CFG.tex && MAT[k].map) weltUV(g, 1 / 1.6);
        const im = new THREE.InstancedMesh(g, MAT[k], l.length); l.forEach((x, i) => im.setMatrixAt(i, x[0])); im.castShadow = !fern; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); n += l.length; }
      return n; } };
})();
{ // ---- Wald (18.10. 17 Uhr, Fix): Baeume nach Abstand zu den Siedlungen statt ueber die ganze (riesige) Welt —
  // Lichtungen in den Vierteln, dichter Wald dazwischen und rundherum, Waldguertel zwischen Dorf 1 und Dorf 2. Gleiche Dichte wie vor Dorf 2.
  const ORTE = [...W_VIERTEL.map(v => [v.mitte.u, v.mitte.w, v.r * 1.15]), ...W_GEB.filter(g => g.u !== undefined).map(g => [g.u, g.w, 8]), [0, 0, 10], [0, DORF_MITTE_W, 14]];
  for (const d of DOERFER) ORTE.push([d.u, d.w, 12]);
  const WALDKERN = [...(DATEN.flaechen || []).filter(f => f.art === "landschaft").map(f => [f.u, f.w, 60]), ...DOERFER.map(d => [d.u, d.w, 260])];   // 18.10. 22:40: Landschaftsguertel = dichter Wald
  const nahDistGenau = (u, w) => { let m = 1e9; for (const [a, b, rr2] of ORTE) { const d = Math.hypot(u - a, (w - b) * .9) - rr2; if (d < m) m = d; } return m; };
  const U0 = Math.min(...ORTE.map(o => o[0])) - 150, U1 = Math.max(...ORTE.map(o => o[0])) + 150, W0 = Math.min(...ORTE.map(o => o[1])) - 110, W1 = Math.max(...ORTE.map(o => o[1])) + 120;
  const ZIEL = 36000, VERSUCHE = 220000; let n = 0;
  const C = 6, NX = Math.ceil((U1 - U0) / C) + 1, NW = Math.ceil((W1 - W0) / C) + 1, GR = new Float32Array(NX * NW);   // Abstands-Raster (schnell)
  for (let i = 0; i < NX; i++) for (let j = 0; j < NW; j++) GR[i * NW + j] = nahDistGenau(U0 + i * C, W0 + j * C);
  const nahDist = (u, w) => GR[Math.round((u - U0) / C) * NW + Math.round((w - W0) / C)];
  for (let i = 0; i < VERSUCHE && n < ZIEL; i++) { const u = rr(U0, U1), w = rr(W0, W1), d = nahDist(u, w);
    if (d > 150 && !WALDKERN.some(([a, b, r]) => Math.hypot(u - a, w - b) < r)) continue; const dicht = fbm(u * .07 + 5, w * .07 - 2);
    const p = d < 4 ? 0 : d < 22 ? .06 + .2 * dicht : .35 + .5 * sst(.3, .7, dicht);   // Lichtung -> Waldrand -> Wald
    if (R() > p || !frei(u, w, .8) || Math.hypot(u, w) < 5.5 || VFREI(u, w)) continue;
    WALD.baum(dicht > .6 && R() < .6 ? "tanne" : "laub", rr(.8, 1.3), u, w, R() * 6, d > 55); SPERRE.push([u, w, 1.2]); n++; }
  for (const dk of W_DEKO) if (dk.typ === "baum") { [dk.u, dk.w] = wegFrei(dk.u, dk.w, 1); WALD.baum(R() < .25 ? "tanne" : "laub", rr(.9, 1.2), dk.u, dk.w, R() * 6, false); SPERRE.push([dk.u, dk.w, 1.2]); n++; }   // 18.10. abends: Baeume am Platz von Dorf 2
  window.__waldbaeume = n; }
window.__baeume = WALD.fertig();
// ---- Weite Sicht (19.10. 00:30): Nebel jenseits des Waldes (Fog of War, waechst mit der Welt) + breiterer Bach/Hauptstrassen beim weiten Herauszoomen
// ---- Berg im Sueden (19.10. abends, Anthony): Bergruecken suedlich von Dorf 1 — Fels, Schnee oben, Nadelwald an den Haengen,
// Steinbruch-taugliche Flanke zur Dorfseite (Nordflanke, Terrassen). Eigenes statisches Mesh ueber dem Gelaende (Gelaende/Fluss/Wald bleiben unveraendert).
const BERG = (() => { const B = BERG_DEF, cu = B.u, cw = B.w, hb = bergH, STB = B.steinbruch;
  const NU = 340, NW = 156, g = new THREE.PlaneGeometry(B.lu * 2 + 80, B.lw * 2 + 40, NU, NW); g.rotateX(-Math.PI / 2); g.translate(cu, 0, -cw);   // Rand fuer die Stollen-Auslaeufer an der Westspitze
  const p = g.attributes.position, col = [], c = new THREE.Color(), cG = new THREE.Color(PAL.grasDunkel), cF = new THREE.Color(0x6e6b64), cF2 = new THREE.Color(0x58554f), cS = new THREE.Color(0xeeece6), cQ = new THREE.Color(0x8a8270);
  for (let i = 0; i < p.count; i++) { const u = p.getX(i), w = -p.getZ(i), y = hb(u, w), y2 = hb(u + 1.5, w), y3 = hb(u, w + 1.5), steil = Math.hypot(y2 - y, y3 - y) / 1.5;
    p.setY(i, hoehe(u, w) + y - (y < .05 ? .6 : 0));
    const hr = y / B.h; c.copy(cG).lerp(cF, sst(.06, .3, hr) * .85 + sst(.5, 1.1, steil) * .85).lerp(cF2, sst(.4, .7, hr) * .4 * (fbm(u * .2, w * .2)));
    if (hr > 1.12) c.lerp(cS, sst(1.12, 1.24, hr + (fbm(u * .3, w * .3) - .5) * .12) * (1 - sst(.9, 1.4, steil) * .6));
    if (Math.hypot((u - STB.u) / 28, (w - STB.w) / 16) < 1 && y > .3) c.copy(cQ).lerp(cF2, fbm(u * .5, w * .5) * .4);
    col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.receiveShadow = true; m.castShadow = false; scene.add(m);
  // Nadelwald an den Haengen (instanziert): unten dicht, oben licht, nicht im Steinbruch, nicht auf Fels/Schnee
  const RB = rng(4242), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), lst = [];
  for (let i = 0; i < 30000 && lst.length < 2600; i++) { const u = cu + (RB() * 2 - 1) * B.lu, w = cw + (RB() * 2 - 1) * B.lw, y = hb(u, w), hr = y / B.h;
    if (y < 1.0 || hr > .6 || Math.hypot((u - STB.u) / 32, (w - STB.w) / 20) < 1 || W_GEB.some(g => (g.typ === "mine" || g.typ === "steinbruch") && Math.hypot(u - g.u, w - g.w) < (g.typ === "mine" ? 17 : 14))) continue;
    const steil = Math.hypot(hb(u + 1.5, w) - y, hb(u, w + 1.5) - y) / 1.5; if (steil > 1.5 || RB() > (1 - hr * 1.3)) continue;
    lst.push([u, hoehe(u, w) + y, w, .8 + RB() * .6, RB() * 6]); }
  const teile = [[new THREE.CylinderGeometry(.18, .26, 1.4, 5).translate(0, .7, 0), mat("stamm")], [new THREE.ConeGeometry(1.5, 2.2, 6).translate(0, 2.1, 0), mat("tanne")], [new THREE.ConeGeometry(1.1, 1.9, 6).translate(0, 3.1, 0), mat("tanne")], [new THREE.ConeGeometry(.7, 1.6, 6).translate(0, 4.0, 0), mat("tanne")]];
  for (const [geo, mt] of teile) { const im = new THREE.InstancedMesh(geo, mt, lst.length); lst.forEach(([u, y, w, sk, ro], k) => im.setMatrixAt(k, M4.compose(V.set(u, y, -w), Q.setFromEuler(new THREE.Euler(0, ro, 0)), S3.set(sk, sk * (1 + (k % 5) * .06), sk))));
    im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); }
  window.__berg = () => ({ baeume: lst.length, spitze: Math.round(Math.max(...Array.from({ length: 200 }, (_, k) => hb(cu + (k / 100 - 1) * B.lu * .9, cw)))), steinbruch: STB });
  return { cu, cw, B, hb, STB, baeume: lst.length }; })();
const FERN = { teile: [], an: null };
{ // Nebelrand (19.10. spät: Abstandsfeld)
  // 19.10. spät: Nebel folgt der echten Wald-/Berggrenze (Abstandsfeld als Textur) statt eines Rechteck-Rings — schließt überall, auch gedreht
  const ORTE = [...W_VIERTEL.map(v => [v.mitte.u, v.mitte.w, v.r * 1.15]), ...W_GEB.filter(g => g.u !== undefined).map(g => [g.u, g.w, 8]), [0, 0, 10], [0, DORF_MITTE_W, 14], ...DOERFER.map(d => [d.u, d.w, 12])];
  const KERN = [...(DATEN.flaechen || []).filter(f => f.art === "landschaft").map(f => [f.u, f.w, 60]), ...DOERFER.map(d => [d.u, d.w, 260])];
  const BU0 = Math.min(...ORTE.map(o => o[0])) - 150, BU1 = Math.max(...ORTE.map(o => o[0])) + 150, BW0 = Math.min(...ORTE.map(o => o[1])) - 110, BW1 = Math.max(...ORTE.map(o => o[1])) + 120;   // = Waldgebiet
  const B = BERG.B, ZC = 12, GU0 = Math.min(BU0, B.u - B.lu) - 160, GW0 = Math.min(BW0, B.w - B.lw) - 160, GU1 = Math.max(BU1, B.u + B.lu) + 160, GW1 = Math.max(BW1, B.w + B.lw) + 160;
  const NX = Math.ceil((GU1 - GU0) / ZC) + 1, NZ = Math.ceil((GW1 - GW0) / ZC) + 1, A = new Uint8Array(NX * NZ * 4);
  const nebelA = (u, w) => { let d = 1e9; for (const [a, b, r] of ORTE) { const x = Math.hypot(u - a, (w - b) * .9) - r; if (x < d) d = x; } d -= 150;
    for (const [a, b, r] of KERN) d = Math.min(d, Math.hypot(u - a, w - b) - r);
    d = Math.max(d, BU0 - u, u - BU1, BW0 - w, w - BW1);   // Wald endet am Rechteck
    d = Math.min(d, (Math.hypot((u - B.u) / B.lu, (w - B.w) / B.lw) - 1) * B.lw);   // Berg bleibt sichtbar
    return sst(12, 75, d); };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = (j * NX + i) * 4, a = Math.round(255 * nebelA(GU0 + i * ZC, GW0 + j * ZC)); A[k] = A[k + 1] = A[k + 2] = A[k + 3] = a; }
  const tx = new THREE.DataTexture(A, NX, NZ, THREE.RGBAFormat); tx.magFilter = tx.minFilter = THREE.LinearFilter; tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; tx.needsUpdate = true;
  const cu = (GU0 + GU1) / 2, cw = (GW0 + GW1) / 2, au = (GU1 - GU0) / 2, aw = (GW1 - GW0) / 2, GR = Math.max(TER * 2.2, (au + aw) * 3);
  const g = new THREE.PlaneGeometry(GR, GR, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { farbe: { value: new THREE.Color(NEBEL_TAG) }, feld: { value: tx }, o: { value: new THREE.Vector2(GU0, GW0) }, gr: { value: new THREE.Vector2((NX - 1) * ZC, (NZ - 1) * ZC) }, nx: { value: new THREE.Vector2(NX, NZ) } },
    vertexShader: "varying vec2 vp; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vp = vec2(w.x, -w.z); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: "uniform vec3 farbe; uniform sampler2D feld; uniform vec2 o; uniform vec2 gr; uniform vec2 nx; varying vec2 vp; void main(){ vec2 q = (vp - o) / gr; float a = (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) ? 1.0 : texture2D(feld, (q * (nx - 1.0) + 0.5) / nx).a; gl_FragColor = vec4(farbe, a * 0.97); }" });
  const nebel = new THREE.Mesh(g, m); nebel.position.set(cu, 9, -cw); nebel.renderOrder = 8; nebel.frustumCulled = false; scene.add(nebel); window.__nebelrand = { cu, cw, au, aw, nebelA };
  // breiter Bach + Hauptstrassen nur in der weiten Sicht (sonst unsichtbar)
  const band = (pts, halb, farbe, y0) => { const pos = [], idx = []; pts.forEach(([u, w, y], i) => { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)]; let tu = q[0] - p[0], tw = q[1] - p[1]; const l = Math.hypot(tu, tw) || 1; tu /= l; tw /= l;
      pos.push(u - tw * halb, y + y0, -(w + tu * halb), u + tw * halb, y + y0, -(w - tu * halb)); if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const mm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: farbe, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); mm.visible = false; mm.renderOrder = 2; scene.add(mm); FERN.teile.push(mm); };
  const fl = []; for (let i = 0; i < FLUSS.y.length; i += 2) { const u = FLUSS.u0 + i * FLUSS.schritt; if (nebelA(u, flussW(u)) < .9) fl.push([u, flussW(u), FLUSS.y[i]]); } band(fl, 6.5, PAL.wasser, .06);
  for (const wg of W_WEGE.filter(x => x.art === "strasse")) band(wg.linie.filter((p, i) => i % 2 === 0 || i === wg.linie.length - 1).filter(p => Math.abs(p[1] - flussW(p[0])) > 3).map(p => [p[0], p[1], hoehe(p[0], p[1])]), 4.5, PAL.erde, .12); }
// ---- Tiere ueberall (18.10. 22 Uhr): Huehner + Katzen an Huetten in allen Vierteln und Dorf 2, Rehe/Fuechse/Hasen am Waldrand und auf Lichtungen.
// Alle instanziert (je Tierart + Material ein Draw-Call), nie im Wasser oder auf Wegen. Die Tiere der Mitte bleiben wie sie sind.
const TIERE = { n: {} };
if (CFG.tiere) { const RT = rng(90210), rr2 = (a, b) => a + RT() * (b - a), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), E = new THREE.Euler();
  const ok = (u, w, r = .6) => Math.abs(w - flussW(u)) > 3.4 + r && !aufWeg(u, w, 0) && !aufWeg(u + r, w, 0) && !aufWeg(u - r, w, 0) && Math.hypot(u, w) > 9;
  const huhn = farbe => { const g = new THREE.Group(), f = mat(farbe); const k = mesh(new THREE.IcosahedronGeometry(.17, 0), f); k.scale.set(1.3, 1, .9); k.position.y = .26; g.add(k);
    const ko = mesh(new THREE.IcosahedronGeometry(.09, 0), f); ko.position.set(.19, .43, 0); g.add(ko); g.add(box(.05, .07, .03, mat(0xc8302a), .19, .53, 0)); g.add(box(.07, .03, .03, mat(0xe0a030), .29, .42, 0));
    g.add(box(.1, .14, .03, f, -.22, .36, 0)); for (const z of [-.05, .05]) g.add(box(.025, .14, .025, mat(0xd09030), 0, .07, z)); g.scale.setScalar(1.3); return g; };
  const fuchs = () => { const g = new THREE.Group(), f = mat(0xc0602a), w = mat(0xf0e6d6); const k = mesh(new THREE.IcosahedronGeometry(.25, 0), f); k.scale.set(1.6, .8, .75); k.position.y = .36; g.add(k);
    const ko = mesh(new THREE.ConeGeometry(.14, .34, 5), f); ko.rotation.z = -Math.PI / 2; ko.position.set(.48, .44, 0); g.add(ko); for (const z of [-.06, .06]) { const o = mesh(new THREE.ConeGeometry(.045, .12, 4), f); o.position.set(.38, .6, z); g.add(o); }
    const sw = mesh(new THREE.ConeGeometry(.1, .5, 5), f); sw.rotation.z = Math.PI / 2 + .4; sw.position.set(-.55, .38, 0); g.add(sw); const sp = mesh(new THREE.ConeGeometry(.06, .14, 5), w); sp.rotation.z = Math.PI / 2 + .4; sp.position.set(-.8, .3, 0); g.add(sp);
    for (const [x, z] of [[.22, .08], [.22, -.08], [-.22, .08], [-.22, -.08]]) g.add(box(.06, .26, .06, mat(0x3a2418), x, .13, z)); return g; };
  const katz = () => { const g = katze(); return g; };
  const art = (name, vorlage, liste, schatten = false) => { TIERE.n[name] = liste.length; if (!liste.length) return; const v = vorlage(); v.updateMatrixWorld(true);
    const kacheln = new Map(); for (const x of liste) { const k = Math.floor(x[0] / 150) + "," + Math.floor(x[1] / 150); if (!kacheln.has(k)) kacheln.set(k, []); kacheln.get(k).push(x); }   // je 150-m-Kachel ein Mesh -> ausserhalb des Bildes wird nichts gezeichnet
    for (const t of zerlegen(v)) for (const teil of kacheln.values()) { const im = new THREE.InstancedMesh(t.geo, t.m, teil.length); teil.forEach(([u, w, rot, sk], i) => im.setMatrixAt(i, M4.compose(V.set(u, hoehe(u, w), -w), Q.setFromEuler(E.set(0, rot, 0)), S3.setScalar(sk || 1))));
      im.castShadow = false; im.receiveShadow = false; im.computeBoundingSphere(); scene.add(im); } };
  // Huehner + Katzen an Huetten (jede ~6. Huette ein kleiner Trupp, jede ~40. eine Katze vor der Tuer)
  const huehner = [[], []], katzen = [];
  LAGE.forEach((l, i) => { if (l.typ === "langhaus" || Math.hypot(l.u, l.w) < 12) return; const z = Math.abs(Math.round(l.u * 31 + l.w * 17));
    const platz = (u, w) => { if (ok(u, w, .3)) return [u, w]; for (const [du, dw] of [[1.4, 0], [-1.4, 0], [0, -1.4], [2.2, -1], [-2.2, -1], [0, 1.6]]) if (ok(u + du, w + dw, .3) && !LAGE.some(x => Math.hypot(x.u - u - du, x.w - w - dw) < 2.6)) return [u + du, w + dw]; return null; };   // 19.10.: ausweichen statt verschwinden
    if (z % 6 === 0) { const n = 2 + z % 3; for (let k = 0; k < n; k++) { const p_ = platz(l.u + rr2(-3, 3), l.w - rr2(2.6, 4.6)); if (p_) huehner[k % 2].push([p_[0], p_[1], RT() * 6.283, rr2(.9, 1.1)]); } }
    if (z % 40 === 7) { const p_ = platz(l.u + rr2(-1.2, 1.2), l.w - 3.1); if (p_) katzen.push([p_[0], p_[1], RT() * 6.283, .9]); } });
  art("huehner_weiss", () => huhn(0xf2ece0), huehner[0]); art("huehner_braun", () => huhn(0x9a5a2a), huehner[1]); art("katzen", katz, katzen);
  // Waldrand + Lichtungen: Ring um jedes offene Viertel und um beide Dorfplaetze (dort beginnt der Wald), dazu leere Viertel als Lichtung
  const orte = [...VOFFEN.map(v => [v.mitte.u, v.mitte.w, v.r * 1.15]), ...W_VIERTEL.filter(v => !v.offen && v.id !== "kern").map(v => [v.mitte.u, v.mitte.w, v.r * .6, true])];
  const rehe = [], hasen = [], fuechse = [];
  for (let i = 0; i < 2600 && rehe.length + hasen.length + fuechse.length < 330; i++) { const o = orte[Math.floor(RT() * orte.length)], lichtung = o[3], a = RT() * 6.283, d = lichtung ? RT() * o[2] : o[2] + rr2(2, 9);
    const u = o[0] + Math.cos(a) * d, w = o[1] + Math.sin(a) * d; if (!ok(u, w, 1) || LAGE.some(l => Math.abs(l.u - u) < 6 && Math.abs(l.w - w) < 6)) continue;
    const x = RT(); if (x < .32) { const n = 1 + Math.floor(RT() * 3); for (let k = 0; k < n; k++) { const uu = u + rr2(-2.5, 2.5), ww = w + rr2(-2.5, 2.5); if (ok(uu, ww, 1)) rehe.push([uu, ww, RT() * 6.283, rr2(.9, 1.05)]); } }
    else if (x < .9) hasen.push([u, w, RT() * 6.283, 1]); else fuechse.push([u, w, RT() * 6.283, 1]); }
  art("rehe", () => reh(false), rehe, true); art("hasen", hase, hasen); art("fuechse", fuchs, fuechse, true);
  window.__tiere = () => TIERE.n; }
const GEB_R = { zauberturm: 9, weidestall: 7, wachhaus: 3.4, grosseschmiede: 7.5, schmiede: 4.5, taverne: 6.5, gemeinschaftsfeld: 13, holzfaellerhuette: 4.5, holzturm: 2.8, brunnen: 1.6, werkstatt: 4.5, wachposten: 1.8, fischerhuette: 3.0, jaegerhuette: 4.5, hexenhuette: 6.0, stall_klein: 6.5, schneiderbank: 1.2, mine: 4.5, steinbruch: 6, gasthaus: 6, fischerei: 5, kaserne: 7.5 };
window.__inventar = () => {  window.__pferde = W_GEB.filter(g => g.typ === "stall_klein").reduce((a, g) => a + (g.pferde || 2), 0) + RITT.n;
 let pf = 0; scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === "CylinderGeometry") pf++; });
  return { fluss: FLUSS.mesh ? FLUSS.y.length : 0, baeume: window.__waldbaeume || 0, baum_teile: window.__baeume || 0, huetten: LAGE.length,
    huetten_im_wasser: LAGE.filter(l => Math.abs(l.w - flussW(l.u)) < 2.6).length,
    objekte_auf_weg: [...W_DEKO.filter(d => d.u != null && !/reh|hase|voegel|fuchs|huhn/.test(d.typ)).map(d => [d.u, d.w, d.typ]), ...W_GEB.filter(g => /brunnen|holzturm/.test(g.typ)).map(g => [g.u, g.w, g.id]),
      ...(FIG.fass ? [[FIG.fass.u, FIG.fass.w, "fass"]] : []), ...FIG.flaggen.map(f => [f.g.position.x, -f.g.position.z, "flagge"]), ...(FIG.schaukeln || []).map(f => [f.pendel.parent.position.x, -f.pendel.parent.position.z, "schaukel"])]
      .filter(([u, w]) => aufWeg(u, w, 0)).map(x => x[2]),
    objekte_im_wasser: [...W_GEB.filter(g => GEB_R[g.typ]).map(g => [g.u, g.w, GEB_R[g.typ], g.id]), ...W_DEKO.filter(d => d.u != null).map(d => [d.u, d.w, 1.5, d.typ]), ...(DATEN.figuren || []).filter(f => f.u != null).map(f => [f.u, f.w, 1, f.typ])].filter(([u, w, r]) => Math.abs(w - flussW(u)) - r < 3.6).map(x => x[3]), gebaeude: W_GEB.length, wege: W_WEGE.length, tiere: Object.values(TIERE.n).reduce((a, b) => a + b, 0), bergbaeume: BERG.baeume, pferde: window.__pferde, weidetiere: (ZUS.herde ? ZUS.herde.n : 0) + (ZUS.herden || []).reduce((a, h) => a + h.n, 0), tierarten: TIERE.n, tore: W_GEB.reduce((n, g) => n + (g.tore || 0), 0), palisade_luecken: W_GEB.filter(g => g.typ === "palisade_baustelle").map(g => [g.id, g.tore, g.luecken, g.huettenluecken].join(":")).join(" "), palisade_prozent: W_GEB.filter(g => g.typ === "palisade_baustelle").map(g => g.prozent), figuren: (DATEN.figuren || []).length,
    viertel: W_VIERTEL.length, deko: W_DEKO.length, schilder: SCH.length, bmax: Math.round(B_MAX) }; };
gras(Math.round(2600 * NS * (SAISON.schnee ? .35 : 1)), [-30 * NS, 30 * NS], [-28 * NS, 40 * NS]); wolken(6);
if (SAISON.laub) { const n = 64, im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.42, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), n);   // Laubhaufen (Herbst), 1 Draw-Call
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cl = new THREE.Color(); let k = 0;
  for (let i = 0; i < n * 8 && k < n; i++) { const u = rr(-26, 26) * NS, w = rr(-14, 36) * NS; if (!frei(u, w, .2)) continue;
    m4.compose(new THREE.Vector3(u, hoehe(u, w) + .02, -w), q.setFromEuler(new THREE.Euler(0, R() * 6, 0)), new THREE.Vector3(rr(.7, 1.4), rr(.18, .3), rr(.7, 1.4)));
    im.setMatrixAt(k, m4); im.setColorAt(k, cl.setHex(pick([PAL.laub2, PAL.laub3, 0x8a5a2a]))); k++; }
  im.count = k; im.receiveShadow = true; scene.add(im); }
const ALLTAG = alltagBauen();
// ==== Welt huebscher (18.10. 21:40 live): a Boden + d Wasser/Natur immer; c Licht nur per ?licht=c (Test); b nicht. ?huebsch=… zum Vergleichen
{ const HV = P.has("huebsch") ? P.get("huebsch") : "ad" + (P.get("licht") === "c" ? "c" : ""), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), E = new THREE.Euler();
  const HG = new Map(), hk = (u, w) => `${Math.floor(u / 6)},${Math.floor(w / 6)}`; for (const l of LAGE) { const k = hk(l.u, l.w); if (!HG.has(k)) HG.set(k, []); HG.get(k).push(l); }
  const nahHuette = (u, w, r) => { const i = Math.floor(u / 6), j = Math.floor(w / 6); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const l of HG.get(`${i + a},${j + b}`) || []) if (Math.hypot(l.u - u, l.w - w) < r) return true; return false; };
  const W_ORTE = [...W_VIERTEL.filter(v => v.offen).map(v => [v.mitte.u, v.mitte.w, v.r * 1.2]), [0, 0, 14], [0, DORF_MITTE_W, 16]].concat(DOERFER.map(d => [d.u, d.w, 16]));
  const imDorf = (u, w) => W_ORTE.some(([a, b, r]) => Math.hypot(u - a, w - b) < r);
  const inst = (geo, m, liste) => { if (!liste.length) return; const im = new THREE.InstancedMesh(geo, m, liste.length); liste.forEach((x, i) => im.setMatrixAt(i, x)); im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); };
  const mx = (u, y, w, ry, sx, sy, sz) => M4.clone().compose(V.set(u, y, -w), Q.setFromEuler(E.set(0, ry, 0)), S3.set(sx, sy, sz));
  const zufall = (n, f) => { const out = []; for (let i = 0; i < n * 6 && out.length < n; i++) { const o = W_ORTE[Math.floor(R() * W_ORTE.length)], a = R() * 6.283, r = Math.sqrt(R()) * o[2], u = o[0] + Math.cos(a) * r, w = o[1] + Math.sin(a) * r; const x = f(u, w); if (x) out.push(x); } return out; };
  if (HV.includes("a")) {   // a) Boden: Grasbueschel, Wildblumen, Steinchen im Dorf (instanziert, 3 Draw-Calls)
    const ok = (u, w) => Math.abs(w - flussW(u)) > 3.3 && !aufWeg(u, w, 0) && !nahHuette(u, w, 2.4) && Math.hypot(u, w) > 5;
    inst(new THREE.ConeGeometry(.12, .42, 4), mat(0x6f8a3a), zufall(16000, (u, w) => ok(u, w) && mx(u, hoehe(u, w) + .15, w, R() * 6, 1 + R(), .7 + R() * .8, 1 + R())));
    const bl = zufall(3500, (u, w) => ok(u, w) && mx(u, hoehe(u, w) + .2, w, 0, 1, 1, 1)); const blm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09, 0), new THREE.MeshStandardMaterial({ roughness: .8 }), Math.max(1, bl.length));
    const fc = [0xe8d070, 0xd88aa8, 0xf0ece0, 0xa890d8, 0xe07850].map(x => new THREE.Color(x)); bl.forEach((x, i) => { blm.setMatrixAt(i, x); blm.setColorAt(i, fc[i % fc.length]); }); scene.add(blm);
    inst(new THREE.DodecahedronGeometry(.16, 0), mat("stein"), zufall(2500, (u, w) => ok(u, w) && mx(u, hoehe(u, w) + .05, w, R() * 6, 1 + R(), .5, 1 + R()))); }
  if (HV.includes("b")) {   // b) Haeuser belebt: Fass/Kiste/Bank/Blumenkasten/Waescheleine an jeder Huette (instanziert)
    const fass = [], kiste = [], bank = [], blumen = [], leine = [], tuch = [];
    for (const l of LAGE) { if (l.typ === "langhaus") continue; const z = (Math.abs(Math.round(l.u * 7 + l.w * 13)) % 5), u = l.u + (z % 2 ? 1.7 : -1.7), w = l.w - 2.2, y = hoehe(u, w);
      if (z === 0 || z === 3) fass.push(mx(u, y + .35, w, 0, 1, 1, 1)); if (z === 1) kiste.push(mx(u, y + .25, w, R(), 1, 1, 1)); if (z === 2 || z === 4) bank.push(mx(l.u, hoehe(l.u, l.w - 2.4) + .22, l.w - 2.4, 0, 1, 1, 1));
      blumen.push(mx(l.u + .9, hoehe(l.u, l.w) + .75, l.w - 2.05, 0, 1, 1, 1));
      if (z === 4) { const lu = l.u + 2.6; leine.push(mx(lu, hoehe(lu, l.w) + 1.4, l.w, Math.PI / 2, 1, 1, 1)); for (let k = 0; k < 3; k++) tuch.push(mx(lu, hoehe(lu, l.w) + 1.15, l.w - .8 + k * .8, Math.PI / 2, 1, 1, 1)); } }
    inst(new THREE.CylinderGeometry(.3, .3, .7, 8), mat("holzDunkel"), fass); inst(new THREE.BoxGeometry(.5, .5, .5), mat("holz"), kiste); inst(new THREE.BoxGeometry(1.4, .1, .35), mat("holz"), bank);
    const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(.8, .16, .2), new THREE.MeshStandardMaterial({ color: 0xd06a7a, roughness: .8 }), Math.max(1, blumen.length)); blumen.forEach((x, i) => { bm.setMatrixAt(i, x); bm.setColorAt(i, new THREE.Color([0xd06a7a, 0xe8c050, 0xb090e0][i % 3])); }); scene.add(bm);
    inst(new THREE.BoxGeometry(2.6, .03, .03), mat(0xe8dcc0), leine); const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(.6, .5, .03), new THREE.MeshStandardMaterial({ roughness: .9, side: THREE.DoubleSide }), Math.max(1, tuch.length)); tuch.forEach((x, i) => { tm.setMatrixAt(i, x); tm.setColorAt(i, new THREE.Color([0xf0ece0, 0x8aa0c8, 0xc87a6a][i % 3])); }); scene.add(tm); }
  if (HV.includes("c")) {   // c) Licht/Stimmung: filmischer Tonwert, warmes Licht, weiche Vignette
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; document.getElementById("c").style.filter = "saturate(1.12) contrast(1.05) sepia(.06)";
    const vg = document.createElement("div"); vg.style.cssText = "position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(40,25,10,.38) 100%);z-index:1"; document.body.appendChild(vg);
    c.sonne.color.setHex(0xffd49a); }
  if (HV.includes("d")) {   // d) Wasser/Natur: Schilf + Seerosen am Ufer, Wasser glaenzt, Enten
    const schilf = [], rosen = [], enten = [];
    for (let u = FLUSS.u0; u < -FLUSS.u0; u += .7) { const m = flussW(u); if (!imDorf(u, m) && R() > .25) continue;
      for (const sg of [-1, 1]) if (R() < .55) { const w = m + sg * (2.5 + R() * .8); if (!aufWeg(u, w, 0)) for (let k = 0; k < 3; k++) schilf.push(mx(u + R() * .5, flussY(u) + .45, w + R() * .3, R() * 6, 1, .8 + R() * .7, 1)); }
      if (R() < .08) rosen.push(mx(u, flussY(u) + .02, m + (R() - .5) * 3, R() * 6, 1, 1, 1)); if (R() < .006) enten.push(mx(u, flussY(u) + .12, m + (R() - .5) * 2, R() * 6, 1, 1, 1)); }
    inst(new THREE.CylinderGeometry(.03, .05, 1.0, 4), mat(0x7a8a3a), schilf); inst(new THREE.CylinderGeometry(.35, .35, .03, 8), mat(0x4f7a3a), rosen);
    inst(new THREE.SphereGeometry(.22, 6, 4), mat(0x8a6a3a), enten);
    if (FLUSS.mesh) { FLUSS.mesh.material.roughness = .12; FLUSS.mesh.material.metalness = .25; FLUSS.mesh.material.color.offsetHSL(0, .06, .04); } }
}

scene.updateMatrixWorld(true);   // 18.10.: Rauch nur Feuer + 10 Kamine nahe der Dorfmitte (jeder Rauch = 10 Sprites = 10 Draw-Calls)
EMITTER = [...EMITTER.filter(e => e.feuer || e.hexe), ...EMITTER.filter(e => !e.feuer && !e.hexe).map(e => ({ e, d: e.g.localToWorld(e.p.clone()).distanceTo(new THREE.Vector3(0, 0, -DORF_MITTE_W)) }))
  .sort((a, b) => a.d - b.d).slice(0, 10).map(x => x.e)];
fertig(c);

// ---- Bewohner-Alltag (17.10.): echte Bewohner nach deutscher Uhrzeit — morgens raus, tagsueber am Beruf, abends am Feuer, nachts drinnen.
// Alle Besucher sehen dasselbe (Uhrzeit + Handle). Hoechstens 12 gleichzeitig; alle Figuren zusammen 7 Draw-Calls (InstancedMesh). Nur echte Bewohner (Followerliste).
function alltagBauen() {
  const MAX = 72, hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const HALLE = LAGE.find(l => l.typ === "langhaus"), NEU = new Set(DATEN.neu || []);
  const ROLLE = new Set([...W_GEB.flatMap(g => (g.leute || []).map(l => l.h)), ...W_GEB.filter(g => g.ober || g.hexe || g.meister).map(g => g.ober || g.hexe || g.meister), ...(DATEN.figuren || []).filter(f => f.typ === "katze" || ["paar", "hauptmann", "falkner", "hirte", "mueller", "turmwaechter", "gelehrter"].includes(f.typ)).map(f => f.handle), ...W_GEB.filter(g => g.typ === "holzturm" && g.wache).map(g => g.wache)]);   // als Katze unterwegs, nicht zusaetzlich als Mensch
  const leute = LAGE.filter(l => l.bewohner.length).flatMap(l => l.bewohner.filter(h => !ROLLE.has(h)).map(h => ({ h, haus: l, z: hash(h) })));
  const seite = p => Math.sign(p.w - flussW(p.u)) || 1, FU = 4.5, FURT = s => ({ u: FU, w: flussW(FU) + s * 3.1 });
  const weg = (a, b) => { const pts = seite(a) === seite(b) ? [a, b] : [a, FURT(seite(a)), FURT(seite(b)), b]; let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].u - pts[i - 1].u, pts[i].w - pts[i - 1].w); return { pts, L }; };
  const amWeg = (wg, s) => { for (let i = 1; i < wg.pts.length; i++) { const a = wg.pts[i - 1], b = wg.pts[i], l = Math.hypot(b.u - a.u, b.w - a.w);
      if (s <= l || i === wg.pts.length - 1) { const f = Math.min(1, s / Math.max(l, 1e-3)); return { u: a.u + (b.u - a.u) * f, w: a.w + (b.w - a.w) * f, r: Math.atan2(b.u - a.u, -(b.w - a.w)) }; } s -= l; } };
  const SITZ = Array.from({ length: MAX }, (_, i) => { const a = (i < 6 ? 40 + 20 * i : -15 - 17 * (i - 6)) * Math.PI / 180, r = i < 6 ? 2.7 : 3.4; return { u: Math.cos(a) * r, w: Math.sin(a) * r }; });
  for (const p of leute) { const b = W_BERUFE[p.h]; p.tuer = { u: p.haus.u + ((p.z >> 4) % 3 - 1) * .6, w: p.haus.w - (p.haus.typ === "langhaus" ? 4.6 : 2.9) };
    const gd = b === "Woodcutter" && W_GEB.find(x => x.typ === "holzfaellerhuette"), dk = /berry gatherer|herbalist/i.test(b || "") && W_DEKO.find(x => x.typ === "beerenbusch");
    const ort = (DATEN.arbeitsorte || {})[p.h], og = ort && W_GEB.find(x => x.id === ort);   // 18.10.: fester Arbeitsplatz (welche Schmiede / welches Feld)
    const istSchmied = /smith/i.test(b || ""), istFarmer = /farmer|shepherd/i.test(b || "");
    const esse = istSchmied && (og && (og.esse || og.essen) ? og : og ? null : W_GEB.find(x => x.typ === "schmiede" && x.esse));   // 18.10. 23 Uhr: eigene Schmiede ohne Esse (Dorf 2) -> dort arbeiten, nicht nach Dorf 1 laufen
    const nr = Object.keys(W_BERUFE).filter(h => (DATEN.arbeitsorte || {})[h] === ort).indexOf(p.h);
    const feld = istFarmer && og && og.typ === "gemeinschaftsfeld" ? og : istFarmer && W_GEB.filter(x => x.typ === "gemeinschaftsfeld").sort((a, c) => Math.hypot(a.u - p.haus.u, a.w - p.haus.w) - Math.hypot(c.u - p.haus.u, c.w - p.haus.w))[0];
    const ep = esse && (esse.essen ? esse.essen[Math.max(0, nr) % esse.essen.length] : esse.esse);
    p.arbeit = esse ? { u: ep.u + .9 + Math.max(0, nr) * .7, w: ep.w + 1.1 + (Math.max(0, nr) % 2) * .8, pose: "axt", t: "t_arbeit" } : feld ? { u: feld.u - 5 + Math.max(0, nr) * 7 + (p.z % 3) * .5, w: feld.w - 2 + (Math.max(0, nr) % 2) * 2.5, pose: "pflueck", t: "t_arbeit" } : gd ? { u: gd.u + 2.4 + (p.z % 3) * 1.1, w: gd.w - 3.4, pose: "axt", t: "t_arbeit" } : dk ? { u: dk.u + 1.0 + (p.z % 2) * .6, w: dk.w - .9, pose: "pflueck", t: "t_arbeit" }
      : og && og.typ === "fischerhuette" ? (() => { const weg_ = Math.sign(og.w - flussW(og.u)) || 1; return { u: og.u - 2.4 + (Math.max(0, nr) % 4) * 1.2, w: og.w + weg_ * (3.0 + Math.floor(Math.max(0, nr) / 4) * 1.1), pose: "pflueck", t: "t_arbeit" }; })()   // 19.10.: Fischer flicken Netze an der Huette
      : og && (og.typ === "mine" || og.typ === "steinbruch") ? { u: og.u - 1.5 + (Math.max(0, nr) % 4) * 1.2, w: og.w + 6.5 + Math.floor(Math.max(0, nr) / 4) * 1.2, pose: "axt", t: "t_arbeit" }   // 19.10. Bergleute/Steinmetze
      : og && og.typ === "schneiderbank" ? { u: og.u, w: og.w - 1.0, pose: "pflueck", t: "t_arbeit" }   // 19.10. Tag 4 P2
      : og && og.typ === "stall_klein" ? { u: og.u + 1.5 + Math.max(0, nr) * 1.1, w: og.w - .5 - (Math.max(0, nr) % 2) * 1.2, pose: "rede", t: "t_arbeit" }
      : og && og.typ === "jaegerhuette" ? { u: og.u + 3, w: og.w - 3, pose: "steh", t: "t_arbeit", jagd: og }   // 19.10.: Jaeger streifen um die Huette (siehe zustand)
      : og ? { u: og.u + 2.5 + Math.max(0, nr) * 1.2, w: og.w - 3.9, pose: istSchmied ? "axt" : "rede", t: "t_arbeit" }
      : HALLE ? { u: HALLE.u + ((p.z % 5) - 2) * 1.5, w: HALLE.w - 5.2, pose: "rede", t: "t_halle" } : { ...p.tuer, pose: "steh", t: "t_arbeit" };
    if (Math.hypot(p.arbeit.u - p.tuer.u, p.arbeit.w - p.tuer.w) > 200) p.tuer = { u: p.arbeit.u + 1.5, w: p.arbeit.w - 1.5 };   // 19.10.: Arbeitsplatz im anderen Dorf -> uebernachtet dort
    p.hin = weg(p.tuer, p.arbeit); p.einzug = NEU.has(p.h) && !b;   // 18.10. 23 Uhr: wer einen Beruf hat, arbeitet gleich (keine Einzugsrunde)
    p.auf = 6.5 + (p.z % 60) / 60; p.feier = Math.min(ZEIT.unter, 18) - .25 + ((p.z >> 6) % 40) / 60; p.schlaf = 22 + ((p.z >> 9) % 50) / 60;
    p.tuch = TUCH[p.z % TUCH.length]; p.kopf = [0xd9b964, 0x3a2a1a, 0x7a4a24, 0xb08a50, p.tuch][(p.z >> 3) % 5];
    const KLEID = [[/smith/i, 0x4a3426, 0x2a1e16], [/farmer|shepherd/i, 0x8a7a3a, 0xd9b964], [/woodcutter/i, 0x5b6b34, 0x7a4a24], [/herbalist/i, 0x5f7a5a, 0x4a5a32], [/berry/i, 0x7a3a4a, 0xb08a50]].find(k => k[0].test(b || ""));
    if (KLEID && CFG.kleidung) { p.tuch = KLEID[1]; p.kopf = KLEID[2]; } }   // 18.10. 22 Uhr: Berufskleidung (Schmied Lederschuerze, Farmer Strohhut, Holzfaeller gruen, Kraeuterkundige salbeigruen)
  // Teile (je ein InstancedMesh): Rumpf, Kopf, Kopfbedeckung, Arme, Beine, Werkzeug, Buendel
  const geo = { rumpf: new THREE.CylinderGeometry(.18, .29, .82, 7), kopf: new THREE.IcosahedronGeometry(.18, 1), hut: new THREE.ConeGeometry(.25, .36, 7),
    arm: new THREE.BoxGeometry(.11, .5, .12).translate(0, -.24, 0), bein: new THREE.BoxGeometry(.16, .72, .18).translate(0, -.36, 0),
    axt: new THREE.BoxGeometry(.07, 1.0, .07).translate(0, -.5, 0), buendel: new THREE.BoxGeometry(.5, .42, .3),
    helm: new THREE.ConeGeometry(.23, .3, 8), speer: new THREE.BoxGeometry(.05, 2.3, .05).translate(0, -.3, 0), fackel: new THREE.BoxGeometry(.06, .6, .06).translate(0, -.2, 0), flamme: new THREE.ConeGeometry(.09, .26, 6) };
  const mk = (g, n, farbe) => { const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ flatShading: true, roughness: .95, color: farbe ?? 0xffffff }), n);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; };
  const IM = { rumpf: mk(geo.rumpf, MAX), kopf: mk(geo.kopf, MAX, PAL.haut), hut: mk(geo.hut, MAX), arm: mk(geo.arm, MAX * 2), bein: mk(geo.bein, MAX * 2, 0x4a3a2a),
    axt: mk(geo.axt, MAX, 0x7b5534), buendel: mk(geo.buendel, MAX, 0xb59a6a), helm: mk(geo.helm, MAX, 0x8a8f96), speer: mk(geo.speer, MAX, 0x6b4a2a), fackel: mk(geo.fackel, MAX, 0x5a3a20),
    flamme: new THREE.InstancedMesh(geo.flamme, new THREE.MeshBasicMaterial({ color: 0xffa040 }), MAX) };
  IM.flamme.frustumCulled = false; scene.add(IM.flamme); const FACKELLICHT = glanz(new THREE.Vector3(0, -50, 0), 0xffa040, 3.2, 0);
  const NULL = new THREE.Matrix4().makeScale(0, 0, 0), slots = [];
  for (let i = 0; i < MAX; i++) { const root = new THREE.Object3D(), ober = new THREE.Object3D(), rumpf = new THREE.Object3D(), kopf = new THREE.Object3D(), hut = new THREE.Object3D(), buendel = new THREE.Object3D();
    root.scale.setScalar(1.45); ober.position.y = .72; rumpf.position.y = .28; kopf.position.y = .9; hut.position.set(0, 1.08, -.02); buendel.position.set(0, .4, -.3);
    root.add(ober); ober.add(rumpf, kopf, hut, buendel);
    const arme = [-1, 1].map(sx => { const a = new THREE.Object3D(); a.position.set(sx * .25, .62, 0); ober.add(a); return a; });
    const beine = [-1, 1].map(sx => { const b = new THREE.Object3D(); b.position.set(sx * .1, .72, 0); root.add(b); return b; });
    const axt = new THREE.Object3D(); axt.position.set(0, -.45, .05); axt.rotation.x = Math.PI; arme[1].add(axt);
    const helm = new THREE.Object3D(); helm.position.set(0, 1.1, 0); ober.add(helm);
    const speer = new THREE.Object3D(); speer.position.set(.04, -.45, .08); arme[1].add(speer);
    const fackel = new THREE.Object3D(); fackel.position.set(.02, -.45, .1); arme[1].add(fackel); const flamme = new THREE.Object3D(); flamme.position.set(0, .2, 0); fackel.add(flamme);
    slots.push({ root, ober, rumpf, kopf, hut, buendel, arme, beine, axt, helm, speer, fackel, flamme, p: null }); }
  for (const im of [IM.rumpf, IM.hut, IM.arm]) im.setColorAt(0, new THREE.Color());   // Farbpuffer anlegen
  let wahl = [], wahlStunde = -1, sichtbar = 0;
  const WACHEN = Object.keys(W_BERUFE).filter(h => /guard|watch|gatekeeper/i.test(W_BERUFE[h]) && !/tower/i.test(W_BERUFE[h]));
  const PALI = W_GEB.find(g => g.typ === "palisade_baustelle" && g.id === "palisade-1");
  function wache(p, s) {   // 18.10.: Wachen patrouillieren innen an der Palisade, Torwaechter am Dorfeingang (Furt), Nachtwache nachts mit Fackel
    const H = s / 3600, rolle = W_BERUFE[p.h], nacht = H < p.auf || H >= p.schlaf, gi = WACHEN.indexOf(p.h);
    const ortW = (DATEN.arbeitsorte || {})[p.h], postW = ortW && W_GEB.find(g => g.id === ortW), dorfW = ortW && DOERFER.find(d => "dorf" + d.nr === ortW);   // 19.10.: Wachen von Dorf 2/3
    if (postW) return { u: postW.u - 1.6, w: postW.w - 1.2, r: Math.PI * .5, pose: "steh", t: "t_wache", speer: true };
    if (dorfW) { const gj = WACHEN.filter(h => (DATEN.arbeitsorte || {})[h] === ortW).indexOf(p.h), R2 = 30, per = 2 * Math.PI * R2 / 1.0, a = ((s / per) * 2 * Math.PI + gj * 2.1) % (2 * Math.PI);
      return { u: dorfW.u + Math.cos(a) * R2 * 1.1, w: dorfW.w + Math.sin(a) * R2 * .9, r: -a, pose: "geh", t: "t_wache", speer: true }; }
    if (/gatekeeper/i.test(rolle)) return nacht ? null : { u: 7.5, w: 4.5, r: Math.PI, pose: "steh", t: "t_wache", speer: true };
    if (!CFG.nurTag && (/night/i.test(rolle) ? !nacht : nacht)) return null;
    const c = PALI ? PALI.c : { u: 0, w: 13 }, R = (PALI ? PALI.r : 30) - 3, a0 = 10 + gi * 17, a1 = a0 + 34, per = 34 * Math.PI / 180 * R / 1.0;
    const z = ((s + gi * 37) % (2 * per)) / per, k = z < 1 ? z : 2 - z, a = (a0 + (a1 - a0) * k) * Math.PI / 180;
    const u = c.u + Math.cos(a) * R, w = c.w + Math.sin(a) * R, dir = z < 1 ? 1 : -1;
    return { u, w, r: Math.atan2(-Math.sin(a) * dir, -Math.cos(a) * dir) + Math.PI / 2 * 0, pose: "geh", t: /night/i.test(rolle) ? "t_nachtwache" : "t_wache", speer: CFG.nurTag || !/night/i.test(rolle), fackel: !CFG.nurTag && /night/i.test(rolle) };
  }
  const zustand = (p, s) => {   // -> { u, w, r, pose, t } oder null (drinnen)
    if (WACHEN.includes(p.h)) return wache(p, s);
    const H = s / 3600, v = 1.15, P = 240, ph = (p.z % 997) / 997 * P;
    if (H < p.auf || H >= p.schlaf + .25) return null;
    if (H >= p.schlaf) { const f = weg(SITZ[p.sitz], p.tuer), x = amWeg(f, (H - p.schlaf) * 3600 * v); return (H - p.schlaf) * 3600 * v > f.L ? null : { ...x, pose: "geh", t: "t_heim" }; }
    if (H >= p.feier) { const TV = W_GEB.find(g => g.typ === "taverne" && g.sitze), gast = TV && p.sitz % 3 === 1 && p.sitz / 3 < TV.sitze.length;   // 18.10.: abends sitzt ein Teil in der Taverne
      const ziel = gast ? TV.sitze[Math.floor(p.sitz / 3)] : SITZ[p.sitz];
      const f = weg(p.arbeit, ziel), el = (H - p.feier) * 3600 * v; if (el < f.L) return { ...amWeg(f, el), pose: "geh", t: gast ? "t_taverne" : "t_feuer" };
      return { ...ziel, r: gast ? ziel.r : Math.atan2(-ziel.u, ziel.w), pose: "sitz", t: gast ? "t_taverne" : "t_feuer" }; }
    const k = ((s + ph) % P) / P;
    if (p.einzug) { const f = weg({ u: 1.2, w: -2.6 }, p.tuer);   // erster Tag: traegt Sachen vom Feuer zur eigenen Huette
      if (k < .5) return { ...amWeg(f, k / .5 * f.L), pose: "geh", t: "t_einzug", buendel: true };
      if (k < .6) return { ...p.tuer, r: 0, pose: "steh", t: "t_einzug" };
      return { ...amWeg({ pts: [...f.pts].reverse(), L: f.L }, (k - .6) / .4 * f.L), pose: "geh", t: "t_einzug" }; }
    if (k < .62 && p.arbeit.jagd) { const J = p.arbeit.jagd, R2 = 13 + (p.z % 5), a = (k / .62) * 6.283 * 2 + (p.z % 360) / 57.3;   // Jaeger: Runde am Waldrand
      return { u: J.u + Math.cos(a) * R2, w: J.w + Math.sin(a) * R2 * .8, r: -a, pose: "geh", t: "t_arbeit" }; }
    if (k < .62) return { ...p.arbeit, r: Math.atan2(.3, -1) + (p.z % 7) * .3, pose: p.arbeit.pose, t: p.arbeit.t };
    const zur = k < .81, el = (zur ? k - .62 : k - .81) / .19 * P * v, f = zur ? { pts: [...p.hin.pts].reverse(), L: p.hin.L } : p.hin;
    if (el >= f.L) return { ...(zur ? p.tuer : p.arbeit), r: 0, pose: "steh", t: zur ? "t_heim" : "t_weg" };
    return { ...amWeg(f, el), pose: "geh", t: zur ? "t_heim" : "t_weg" }; };
  const cl = new THREE.Color();
  function tick(s, t) {
    const stunde = Math.floor(s / 3600);
    if (stunde !== wahlStunde) { wahlStunde = stunde;   // mehr als 12 Bewohner: stuendlich wechselnd, damit jeder mal draussen ist
      const mitBeruf = leute.filter(p => W_BERUFE[p.h]), rest = leute.filter(p => !W_BERUFE[p.h]);   // 18.10.: Berufe (Schmied, Farmer, Holzfaeller) immer draussen
      wahl = leute.length <= MAX ? leute.slice() : [...mitBeruf.slice(0, MAX), ...rest.sort((a, b) => hash(a.h + stunde) - hash(b.h + stunde))].slice(0, MAX);
      wahl.forEach((p, i) => { p.sitz = i; slots[i].p = p; IM.rumpf.setColorAt(i, cl.setHex(p.tuch)); IM.arm.setColorAt(2 * i, cl); IM.arm.setColorAt(2 * i + 1, cl); IM.hut.setColorAt(i, cl.setHex(p.kopf)); });
      for (let i = wahl.length; i < MAX; i++) slots[i].p = null;
      for (const im of [IM.rumpf, IM.arm, IM.hut]) im.instanceColor.needsUpdate = true; }
    sichtbar = 0; let fackelDa = false;
    slots.forEach((sl, i) => { const z = sl.p && zustand(sl.p, s); sl.z = z;
      if (!z) { for (const k of ["rumpf", "kopf", "hut", "axt", "buendel", "helm", "speer", "fackel", "flamme"]) IM[k].setMatrixAt(i, NULL); for (const k of ["arm", "bein"]) { IM[k].setMatrixAt(2 * i, NULL); IM[k].setMatrixAt(2 * i + 1, NULL); } return; }
      sichtbar++; const ph = (sl.p.z % 100) / 16, sitz = z.pose === "sitz";
      let y = hoehe(z.u, z.w); if (Math.abs(z.w - flussW(z.u)) < 3.2) y = Math.max(y, flussY(z.u) - .3);   // Furt: knietief im Bach
      sl.root.position.set(z.u, y - (sitz ? .28 : 0), -z.w); sl.root.rotation.y = z.r || 0;
      sl.ober.rotation.set(0, 0, 0); sl.arme.forEach(a => a.rotation.set(0, 0, 0)); sl.beine.forEach(b => b.rotation.set(0, 0, 0));
      if (z.pose === "geh") { const q = Math.sin(t * 6 + ph); sl.beine[0].rotation.x = .45 * q; sl.beine[1].rotation.x = -.45 * q; sl.arme[0].rotation.x = -.35 * q; sl.arme[1].rotation.x = z.buendel ? -.4 : (z.speer || z.fackel) ? -.25 : .35 * q;
        sl.root.position.y += .03 * Math.abs(q); }
      else if (sitz) { sl.beine.forEach(b => b.rotation.x = -1.45); sl.ober.rotation.x = .18 + .04 * Math.sin(t * 1.4 + ph); sl.arme.forEach(a => a.rotation.x = -1.05 + .08 * Math.sin(t * 1.1 + ph)); }
      else if (z.pose === "axt") { const p = ((t + ph) / 1.3) % 1, a = p < .65 ? -1.1 - 1.7 * weich(p / .65) : -2.8 + 1.7 * ((p - .65) / .35) ** 2; sl.arme.forEach(x => x.rotation.x = a); sl.ober.rotation.x = .12; }
      else if (z.pose === "pflueck") { const q = Math.sin(t * 2.2 + ph); sl.ober.rotation.x = .5 + .08 * q; sl.arme.forEach((a, k) => a.rotation.x = -1.0 - .3 * (k ? q : -q)); }
      else if (z.pose === "rede") { sl.arme[1].rotation.x = -.9 + .35 * Math.sin(t * 2.3 + ph); sl.arme[1].rotation.z = .4; sl.ober.rotation.y = .12 * Math.sin(t * .8 + ph); }
      sl.root.updateMatrixWorld(true);
      IM.rumpf.setMatrixAt(i, sl.rumpf.matrixWorld); IM.kopf.setMatrixAt(i, sl.kopf.matrixWorld); IM.hut.setMatrixAt(i, sl.hut.matrixWorld);
      IM.axt.setMatrixAt(i, z.pose === "axt" ? sl.axt.matrixWorld : NULL); IM.buendel.setMatrixAt(i, z.buendel ? sl.buendel.matrixWorld : NULL);
      const wa = z.speer || z.fackel; IM.helm.setMatrixAt(i, wa ? sl.helm.matrixWorld : NULL); IM.hut.setMatrixAt(i, wa ? NULL : sl.hut.matrixWorld);
      IM.speer.setMatrixAt(i, z.speer ? sl.speer.matrixWorld : NULL); IM.fackel.setMatrixAt(i, z.fackel ? sl.fackel.matrixWorld : NULL); IM.flamme.setMatrixAt(i, z.fackel ? sl.flamme.matrixWorld : NULL);
      if (z.fackel) { FACKELLICHT.position.setFromMatrixPosition(sl.flamme.matrixWorld); FACKELLICHT.material.opacity = .55 + .1 * Math.sin(t * 17); fackelDa = true; }
      for (let k = 0; k < 2; k++) { IM.arm.setMatrixAt(2 * i + k, sl.arme[k].matrixWorld); IM.bein.setMatrixAt(2 * i + k, sl.beine[k].matrixWorld); } });
    for (const im of Object.values(IM)) im.instanceMatrix.needsUpdate = true; if (!fackelDa) FACKELLICHT.material.opacity = 0; }
  // Antippen -> Name + was die Person gerade tut
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tippen(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    let best = null; slots.forEach((sl, i) => { if (!sl.z) return; const p = new THREE.Vector3().setFromMatrixPosition(sl.kopf.matrixWorld), d = ray.ray.distanceToPoint(p);
      if (d < Math.max(.9, K.b / 60) && (!best || d < best.d)) best = { d, sl }; });
    if (!best) return false; const sl = best.sl;
    FIGURSCHILD.d.innerHTML = `<span class="hd">@${esc(sl.p.h)}</span><span class="klein">${esc(TX[sl.z.t] || "")}</span>`; FIGURSCHILD.l.bis = performance.now() + 4000; FIGURSCHILD.l.slot = sl; return true; }
  return { tick, tippen, sichtbar: () => sichtbar, leute: () => leute.map(p => p.h), slots };
}
// ---- Niederschlag (Regen/Schnee): ein Points-Objekt, hoechstens 400 Punkte; bei schwacher Bildrate aus
function niederschlag() {
  if (WETTER !== "regen" && WETTER !== "schnee") return null;
  const n = 400, schnee = WETTER === "schnee", pos = new Float32Array(n * 3), zuf = Array.from({ length: n }, () => [R(), R(), R()]);
  const tc = document.createElement("canvas"); tc.width = tc.height = 32; const g = tc.getContext("2d");
  if (schnee) { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  else { g.strokeStyle = "rgba(220,230,240,.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(17, 2); g.lineTo(15, 30); g.stroke(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: schnee ? 5 : 11, sizeAttenuation: false, map: new THREE.CanvasTexture(tc), transparent: true, depthWrite: false, fog: false, opacity: schnee ? .95 : .55 }));
  pts.frustumCulled = false; pts.renderOrder = 20; scene.add(pts);
  const o = { pts, aus: false, tick(t) { if (o.aus) return; const B = K.b * 1.15, T = K.b * (innerHeight / innerWidth) * 2.3, H = 24, v = schnee ? 1.4 : 16;
    for (let i = 0; i < n; i++) { const [a, b, c2] = zuf[i]; const y = H - ((t * v * (.8 + .4 * a) + c2 * H) % H);
      const x = (a - .5) * B + (schnee ? .5 * Math.sin(t * .7 + i) : 0), zz = (b - .5) * T + y * .45, [ru, rw] = RECHTS(), [vu, vw] = VORN();
      pos[3 * i] = K.u + x * ru + zz * vu; pos[3 * i + 1] = y; pos[3 * i + 2] = -(K.w + x * rw + zz * vw); }
    geo.attributes.position.needsUpdate = true; } };
  return o; }
// Antippen (kurz, ohne Ziehen) -> Bewohner-Figur zeigen
{ let ab = null; renderer.domElement.addEventListener("pointerdown", e => { ab = [e.clientX, e.clientY, performance.now()]; });
  renderer.domElement.addEventListener("pointerup", e => { if (ab && Math.hypot(e.clientX - ab[0], e.clientY - ab[1]) < 8 && performance.now() - ab[2] < 450) ALLTAG.tippen(e.clientX, e.clientY); ab = null; }); }
// ---- Statisches zusammenfassen (wenige Draw-Calls fuers Handy): alle Meshes in Gruppen ausser Feuer/Figur/Wolken
{ const bewegt = new Set(); for (const f of c.FEUER) bewegt.add(f.pl.parent); for (const m of c.MENSCHEN) bewegt.add(m); for (const w of c.WOLKEN) bewegt.add(w.g); for (const g of LEBEN.wurzeln) bewegt.add(g); for (const v of LEBEN.voegel) bewegt.add(v.g);
  const topf = new Map(), weg = new Set(); c.scene.updateMatrixWorld(true);
  const unsichtbar = new Set();
  c.scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.parent === c.scene) return;
    let p = o, sicht = o.visible; while (p.parent && p.parent !== c.scene) { if (bewegt.has(p)) return; p = p.parent; sicht = sicht && p.visible; } if (bewegt.has(p)) return;
    if (!sicht || !p.visible) { unsichtbar.add(p); return; }
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    // 18.10.: nach Zonen zusammenfassen — Dorf in 30-m-Kacheln (Sichtbarkeits-/Feuerschatten-Test greift), Fernwald ohne Schatten
    g.computeBoundingSphere(); const ce = g.boundingSphere.center, fern = Math.hypot(ce.x, -ce.z - DORF_MITTE_W * .6) > ZONE_R;
    const k = o.material.uuid + (fern ? "|F" : `|${Math.floor(ce.x / KACHEL)},${Math.floor(ce.z / KACHEL)}`);
    if (!topf.has(k)) topf.set(k, { m: o.material, g: [], fern }); topf.get(k).g.push(g); weg.add(p); });
  for (const p of weg) c.scene.remove(p); for (const p of unsichtbar) c.scene.remove(p);
  for (const { m, g, fern } of topf.values()) { const n = g.reduce((s, x) => s + x.attributes.position.count, 0), geo = new THREE.BufferGeometry();
    for (const a of ["position", "normal", "uv"]) { const it = a === "uv" ? 2 : 3, arr = new Float32Array(n * it); let o = 0; for (const x of g) { arr.set(x.attributes[a].array, o); o += x.attributes[a].array.length; } geo.setAttribute(a, new THREE.BufferAttribute(arr, it)); }
    const ms = new THREE.Mesh(geo, m); ms.castShadow = !fern; ms.receiveShadow = true; c.scene.add(ms); }
  window.__drawcalls = topf.size; window.__renderinfo = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geo: renderer.info.memory.geometries }); }

// ---- Kamera: Ziehen = verschieben, Zwei Finger / Mausrad = zoomen
// Startansicht (v3): Rahmen um Feuer, Haeuser, Plaetze, Gebaeude; oben 20 % fuer die Kopfleiste, unten 16 % fuer das Suchfeld frei
const IN_DORF1 = p => Math.hypot(p[0], p[1] - 15) < 260;   // 18.10.: Startansicht = Dorf 1 (Dorf 2 liegt im Osten, erreichbar durch Ziehen/Suche)
const RAHMEN = [[0, 0], ...LAGE.map(l => [l.u, l.w]).filter(IN_DORF1), ...W_BP.map(b => [b.u, b.w]), ...W_GEB.map(g => [g.u, g.w]).filter(IN_DORF1), ...VOFFEN.map(v => [v.mitte.u, v.mitte.w]).filter(IN_DORF1)];
const RU = [Math.min(...RAHMEN.map(p => p[0])) - 7, Math.max(...RAHMEN.map(p => p[0])) + 7], RW = [Math.min(...RAHMEN.map(p => p[1])) - 5, Math.max(...RAHMEN.map(p => p[1])) + 9];
const SINE = Math.sin(33 * Math.PI / 180), ASPS = innerHeight / innerWidth, NUTZ = 1 - .20 - .16;
const startB = Math.min(140, Math.max(26, RU[1] - RU[0], (RW[1] - RW[0]) * SINE / (ASPS * NUTZ)));
const K = { b: startB, u: (RU[0] + RU[1]) / 2, w: (RW[0] + RW[1]) / 2 + .02 * startB * ASPS / SINE - .10 * startB * ASPS / Math.sin(31 * Math.PI / 180) * .5, ziel: null };   // Inhalt-Mitte bei ~52 % Bildhoehe
const START = { b: K.b, u: K.u, w: K.w };
const ALLE_U = [0, ...LAGE.map(l => l.u), ...DOERFER.flatMap(d => [d.u - 250, d.u + 250])], B_WEIT = (Math.max(...ALLE_U) - Math.min(...ALLE_U)) * 1.12 + 60;   // 18.10. Fix: weit genug fuer beide Doerfer
const B_MIN = 12, B_MAX = Math.min(Math.max(60, startB * 1.4, B_WEIT), TER * .5);   // nie weiter heraus, als Gelaende da ist
// 19.10. spät: Welt drehen (nur Azimut, Neigung bleibt) — DREH in Grad, weich zum Ziel
let DREH = 0, DREH_ZIEL = 0; const drehRad = () => DREH * Math.PI / 180, VORN = () => [-Math.sin(drehRad()), Math.cos(drehRad())], RECHTS = () => [Math.cos(drehRad()), Math.sin(drehRad())];
let DREH_T = performance.now();
function ansicht() { const jetzt = performance.now(), dt = Math.min(.5, (jetzt - DREH_T) / 1000); DREH_T = jetzt; if (Math.abs(DREH_ZIEL - DREH) > .05) DREH += (DREH_ZIEL - DREH) * Math.min(1, dt * 7); else DREH = DREH_ZIEL;
  klemmen(); const z = K.b, off = .10 * z * (innerHeight / innerWidth) / Math.sin(31 * Math.PI / 180) * .5, [vu, vw] = VORN();
  kamera(c, z, K.u + off * vu, K.w + off * vw, window.__az ?? (-4 + DREH), window.__el ?? 33, window.__zy || 0); }
window.__drehen = g => { DREH_ZIEL = DREH = g; };   // TURM-1910 (nur Pruefung: Orbit)
const zeiger = new Map(); let zieh = null, pinch = null;
const cv = renderer.domElement; cv.style.touchAction = "none";
let drehZieh = null; cv.addEventListener("contextmenu", e => e.preventDefault());
cv.addEventListener("pointerdown", e => { if (e.button === 2) { drehZieh = [e.clientX, DREH_ZIEL]; cv.setPointerCapture?.(e.pointerId); return; }
  zeiger.set(e.pointerId, [e.clientX, e.clientY]); K.ziel = null; if (zeiger.size === 1) zieh = [e.clientX, e.clientY, K.u, K.w]; else { zieh = null; const [a, b] = [...zeiger.values()]; pinch = [Math.hypot(a[0] - b[0], a[1] - b[1]), K.b, Math.atan2(b[1] - a[1], b[0] - a[0]), DREH_ZIEL]; } });
cv.addEventListener("pointermove", e => { if (!zeiger.has(e.pointerId)) return; zeiger.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && zeiger.size === 2) { const [a, b] = [...zeiger.values()]; K.b = Math.min(B_MAX, Math.max(B_MIN, pinch[1] * pinch[0] / Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1]))));
    let dw = Math.atan2(b[1] - a[1], b[0] - a[0]) - pinch[2]; dw = Math.atan2(Math.sin(dw), Math.cos(dw)); if (Math.abs(dw) > .05 || pinch[4]) { pinch[4] = true; DREH_ZIEL = DREH = pinch[3] + dw * 180 / Math.PI; } }
  else if (zieh) { const s = K.b / innerWidth, dx = (e.clientX - zieh[0]) * s, dy = (e.clientY - zieh[1]) * s / Math.sin(33 * Math.PI / 180), [ru, rw] = RECHTS(), [vu, vw] = VORN();
    K.u = zieh[2] - dx * ru + dy * vu; K.w = zieh[3] - dx * rw + dy * vw; klemmen(); } });
window.addEventListener("pointermove", e => { if (drehZieh) DREH_ZIEL = DREH = drehZieh[1] + (e.clientX - drehZieh[0]) * .35; });
window.addEventListener("pointerup", e => { if (e.button === 2) drehZieh = null; });
window.addEventListener("keydown", e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key.toLowerCase(); if (k === "q") DREH_ZIEL -= 22.5; else if (k === "e") DREH_ZIEL += 22.5; });
const los = e => { zeiger.delete(e.pointerId); if (zeiger.size < 2) pinch = null; if (zeiger.size === 0) zieh = null; };
cv.addEventListener("pointerup", los); cv.addEventListener("pointercancel", los);
cv.addEventListener("wheel", e => { e.preventDefault(); K.ziel = null; K.b = Math.min(B_MAX, Math.max(B_MIN, K.b * (1 + Math.sign(e.deltaY) * .1))); }, { passive: false });
function klemmen() { const g = Math.max(maxR + 6, (RU[1] - RU[0]) / 2 + 8, (RW[1] - RW[0]) / 2 + 8); K.u = Math.max(-g, Math.min(g, K.u)); K.w = Math.max(-g * 1.2, Math.min(g * 1.3, K.w));
  // Randschutz: sichtbares Rechteck (Breite b, Tiefe b*ASP/sin) bleibt innerhalb des Gelaendes
  K.b = Math.min(K.b, B_MAX); const hu = K.b / 2, hw = K.b * ASPS / SINE / 2 + 4, off = .10 * K.b * ASPS / Math.sin(31 * Math.PI / 180) * .5, R2 = TER / 2 - 6;
  if (Math.abs(((DREH % 360) + 360) % 360) < .01) { K.u = Math.max(-R2 + hu, Math.min(R2 - hu, K.u)); const wt = Math.max(2 - R2 + hw, Math.min(2 + R2 - hw, K.w + off)); K.w = wt - off; return; }
  const rr = Math.min(R2 * .9, Math.max(hu, hw)), [vu, vw] = VORN(), mu = K.u + off * vu, mw = K.w + off * vw, cu2 = Math.max(-R2 + rr, Math.min(R2 - rr, mu)), cw2 = Math.max(2 - R2 + rr, Math.min(2 + R2 - rr, mw));
  K.u += cu2 - mu; K.w += cw2 - mw; }

// ---- Namensschilder (nur Handle), Suche
const SCH = [], neuSchild = (l, html, art) => { const d = document.createElement("div"); d.className = "schild" + (art ? " " + art : ""); d.innerHTML = html; HUD.schilder.appendChild(d); SCH.push({ l, d }); };
const beruf = h => W_BERUFE[h] ? `<span class="klein">${esc(W_BERUFE[h])}</span>` : "";   // Beruf in eigener Zeile (Schild bleibt schmal)
const PRIO = { an: 100, haus: 60, platz: 45, bau: 35, arbeit: 20 };
for (const l of LAGE) {
  if (l.typ === "langhaus" && l.bewohner.length > 1) { const n = { 0: 3, 1: 2, 2: 4 }[l.var ?? 0], L = 2.9 * n + 1;   // je Bewohner eine Tuer + eigenes Schild
    l.bewohner.forEach((h, i) => { const p = l.g.localToWorld(new THREE.Vector3(-L / 2 + .5 + 2.9 * (i + .5), 2.4 + i * 1.35, l.lok.max.z + .2));
      neuSchild({ u: l.u, w: l.w, dach: p, groesse: l.groesse, bewohner: [h], alle: l.bewohner, prio: PRIO.haus }, `<span class="hd">@${esc(h)}</span>${beruf(h)}`); }); }
  else if (l.typ === "steinhaus_paar") neuSchild({ ...l, prio: PRIO.haus }, `<span class="hd">${l.bewohner.map(h => "@" + esc(h)).join(" &amp; ")}</span><span class="klein">First couple in town</span>`);   // ZUSAGEN-1810
  else if (!l.bewohner.length) neuSchild({ ...l, bewohner: [], prio: PRIO.bau }, `<span>${esc(l.nutzung || TX.leeres_haus)}</span>`, "arbeit");
  else neuSchild({ ...l, prio: PRIO.haus }, l.bewohner.map(h => `<span class="hd">@${esc(h)}</span>${beruf(h)}`).join(""));
}
if (FIG.fass) neuSchild({ u: FIG.fass.u, w: FIG.fass.w, dach: FIG.fass.dach, groesse: 6, bewohner: [FIG.fass.handle], prio: PRIO.haus },
  `<span class="hd">@${esc(FIG.fass.handle)}</span><span class="klein">${esc(FIG.fass.titel || "Town hobo")}</span>`);
if (FIG.katze) { neuSchild({ u: 0, w: 0, dach: new THREE.Vector3(), groesse: 3, bewohner: [], prio: PRIO.haus - 1 }, `<span class="hd">@${esc(FIG.katze.handle)}</span><span class="klein">${esc(FIG.katze.titel || "Village cat")}</span>`);
  FIG.katze.schild = SCH[SCH.length - 1]; }
// ==== ZUSAGEN-1810:SCHILDER (patches/zusagen_1810.py) — Namensschilder der Sonderfiguren und neuen Bauten ====
{ const Z = (u, w, y, html, art, groesse, handles, prio) => neuSchild({ u, w, dach: new THREE.Vector3(u, y, -w), groesse: groesse || 6, bewohner: handles || [], prio: prio ?? PRIO.haus }, html, art);
  const hd = (h, t) => `<span class="hd">@${esc(h)}</span><span class="klein">${esc(t)}</span>`;
  for (const gd of W_GEB) { if (!gd._g) continue; gd._g.updateMatrixWorld(true);   // 19.10. Tag 4 P1: Fischerhuetten, Oberfischer, Jaegerhuetten, Hexe
    if (gd.typ === "fischerhuette") { Z(gd.u, gd.w, hoehe(gd.u, gd.w) + 4.6, `<span class="klein">${esc(gd.schild || "Fishing hut")}</span>`, "arbeit", 6, [], PRIO.arbeit);
      if (gd.ober && gd._g.userData.oberP) { const q = gd._g.localToWorld(gd._g.userData.oberP.clone()); Z(q.x, -q.z, q.y, hd(gd.ober, "Head fisherman"), null, 6, [gd.ober]); } }
    if (gd.typ === "kaserne") {   // Bau-Schild kommt schon aus „wish by“
      for (const q of (gd._g && gd._g.userData.leuteP) || []) { const w3 = gd._g.localToWorld(q.p.clone()); Z(w3.x, -w3.z, w3.y, hd(q.h, q.rolle), null, 6, [q.h]); } }
    if (gd.typ === "fischerei") { Z(gd.u, gd.w, hoehe(gd.u, gd.w) + 5.6, `<span>${esc(gd.schild || "Fishery")}</span>`, "arbeit", 7, [], PRIO.arbeit + 3);
      if (gd.meister && gd._g.userData.meisterP) { const q = gd._g.localToWorld(gd._g.userData.meisterP.clone()); Z(q.x, -q.z, q.y, hd(gd.meister, "Fishery master"), null, 6, [gd.meister]); } }
    if (gd.typ === "hexenhuette") { const q = gd._g.localToWorld(gd._g.userData.hexeP.clone()); Z(q.x, -q.z, q.y, hd(gd.hexe, "Witch of the outskirts"), null, 6, [gd.hexe]);
      const k2 = gd._g.localToWorld(new THREE.Vector3(2.6, 1.0, 1.6)); for (const gl of GLANZ) if (gl.hexe === gd) gl.sp.position.copy(k2); } }
  for (const gd of W_GEB) if (gd.typ === "gasthaus") Z(gd.u, gd.w, hoehe(gd.u, gd.w) + 8.2, `<span>${esc(gd.schild || "Inn")}</span>` + (gd.von ? `<span class="klein">${esc(TX.wunsch_von || "wish by")} @${esc(gd.von)}</span>` : ""), "arbeit", 8, [], PRIO.arbeit + 4);
  for (const gd of W_GEB) if (gd.typ === "stall_klein") Z(gd.u, gd.w, hoehe(gd.u, gd.w) + 4.4, `<span class="klein">${esc(gd.schild || "Stable")}</span>`, "arbeit", 6, [], PRIO.arbeit);
  for (const gd of W_GEB) if (gd.typ === "jaegerhuette") Z(gd.u, gd.w, hoehe(gd.u, gd.w) + 5.2, `<span class="klein">${esc(gd.schild || "Hunters' lodge")}</span>`, "arbeit", 6, [], PRIO.arbeit);
  if (ZUS.hauptmann) { const H = ZUS.hauptmann; Z(H.u, H.w, hoehe(H.u, H.w) + 4.4, hd(H.h, "Captain of the guard"), null, 6, [H.h]); }
  if (ZUS.falke) { const F = ZUS.falke, P = ZUS.pos.falkner; Z(P.u, P.w, hoehe(P.u, P.w) + 4.0, hd(F.h, "Falconer"), null, 6, [F.h]); }
  if (ZUS.hirten) for (const H of ZUS.hirten) Z(H.u, H.w, hoehe(H.u, H.w) + 3.9, hd(H.h, "Shepherd"), null, 6, [H.h]);
  if (ZUS.mueller) { const M = ZUS.mueller; Z(M.u, M.w, hoehe(M.u, M.w) + 4.0, hd(M.h, "Miller"), null, 6, [M.h]); }
  const WS = ZUS.pos.herde; if (WS) Z(WS.u, WS.w, hoehe(WS.u, WS.w) + 3.4, `<span>Pasture</span><span class="klein">sheep &amp; cattle by the river</span>`, "arbeit", 14, [], PRIO.arbeit + 5);
  const MP = ZUS.pos.muehle; if (MP) Z(MP.gd.u, MP.gd.w, hoehe(MP.gd.u, MP.gd.w) + 7.2, `<span>Watermill</span><span class="klein">the wheel turns in the stream</span>`, "arbeit", 9, [], PRIO.arbeit + 5);
  const WH = W_GEB.find(g => g.id === "wachhaus-1"); if (WH) Z(WH.u, WH.w, hoehe(WH.u, WH.w) + 5.4, `<span>Guardhouse</span><span class="klein">${esc(WH.tor || "main gate")}</span>`, "arbeit", 9, [], PRIO.arbeit + 5); }
// ==== /ZUSAGEN-1810:SCHILDER ====
// ==== TURM-1910:SCHILDER (patches/turm_1910.py) ====
if (TURM.pos && TURM.pos.figuren) {
  const T = TURM.pos, hd = (h, t) => `<span class="hd">@${esc(h)}</span><span class="klein">${esc(t)}</span>`;
  neuSchild({ u: T.u, w: T.w, dach: new THREE.Vector3(T.u, hoehe(T.u, T.w) + T.hoehe * .55, -T.w), groesse: 14, bewohner: [], prio: PRIO.platz + 8 }, `<span>Alchemy &amp; Research Tower</span><span class="klein">the supernatural, studied in plain daylight</span>`, "arbeit");
  for (const f of T.figuren) { const o = f.typ === "turmwaechter"; neuSchild({ u: f.u, w: f.w, dach: new THREE.Vector3(f.u, hoehe(f.u, f.w) + 3.4, -f.w), groesse: 6, bewohner: [f.h], prio: o ? PRIO.haus + 5 : PRIO.haus - 4 }, hd(f.h, f.titel)); } }
// ==== /TURM-1910:SCHILDER ====
for (const bp of W_BP) { const y = hoehe(bp.u, bp.w) + 1.6;
  if (bp.fuer_handle) neuSchild({ u: bp.u, w: bp.w, dach: new THREE.Vector3(bp.u, y, -bp.w), groesse: 6, bewohner: [], platz: bp.fuer_handle, prio: PRIO.platz }, `<span class="hd">@${esc(bp.fuer_handle)}</span><span class="klein">cabin coming</span>`, "platz");
 }
for (const gd of W_GEB) if (gd.typ === "holzfaellerhuette") { const hs = Object.keys(W_BERUFE).filter(h => W_BERUFE[h] === "Woodcutter");
  if (hs.length) neuSchild({ u: gd.u, w: gd.w, dach: new THREE.Vector3(gd.u, hoehe(gd.u, gd.w) + 6.2, -gd.w), groesse: 9, bewohner: [], prio: PRIO.arbeit }, `<span class="klein">${esc(gd.schild || "Woodcutters")}</span>` + hs.map(h => `<span class="hd">@${esc(h)}</span>`).join(""), "arbeit"); }
if ((DATEN.unterstand || []).length) { const y = hoehe(-3.6, .9) + 2.6;   // Bewohner ohne eigenes Haus: Unterstand am Feuer
  for (const [i, h] of DATEN.unterstand.entries()) neuSchild({ u: -3.6, w: .9, dach: new THREE.Vector3(-3.6, y + i * .9, -.9), groesse: 8, bewohner: [h], prio: PRIO.haus }, `<span class="hd">@${esc(h)}</span><span class="klein">shelter by the fire</span>`); }
const bauTitel = gd => { const name = gd.name || null, p = gd.prozent ?? Math.round((gd.fortschritt ?? 1) * 100);
  if (!name) return gd.schild || gd.wunsch; return p >= 100 ? `${name} · ${TX.gebaut}` : `${name} · ${fuell(TX.fertig_zu, { p })}`; };
for (const gd of W_GEB) if (gd.typ === "palisade_baustelle" && gd.schildP && (gd.von || gd.name)) neuSchild({ u: gd.mitte.u, w: gd.mitte.w, dach: gd.schildP, groesse: 14, bewohner: [], prio: PRIO.bau }, `<span>${esc(bauTitel(gd))}</span>` + (gd.von ? `<span class="klein">${esc(TX.wunsch_von)} @${esc(gd.von)}</span>` : ""), "arbeit");
for (const gd of W_GEB) if (gd.typ !== "palisade_baustelle" && gd.typ !== "holzfaellerhuette" && gd.schildP && gd.von)
  neuSchild({ u: gd.u, w: gd.w, dach: gd.schildP, groesse: 8, bewohner: [], prio: PRIO.bau }, `<span>${esc(bauTitel(gd))}</span><span class="klein">${esc(TX.wunsch_von)} @${esc(gd.von)}</span>`, "arbeit");
for (const bp of W_BP) if (bp.wunsch) neuSchild({ u: bp.u, w: bp.w, dach: new THREE.Vector3(bp.u, hoehe(bp.u, bp.w) + 2.2, -bp.w), groesse: 7, bewohner: [], prio: PRIO.platz },
  `<span>${esc(bp.wunsch)} · ${esc(TX.geplant)}</span>` + (bp.von ? `<span class="klein">${esc(TX.wunsch_von)} @${esc(bp.von)}</span>` : ""), "platz");
if (RENNEN) { const H = LAGE.find(l => l.typ === "langhaus"), u = H ? H.u + 7 : 4, w = H ? H.w - 6 : 4;   // Wunsch-Tafel am Dorfplatz (HTML, kein 3D)
  neuSchild({ u, w, dach: new THREE.Vector3(u, hoehe(u, w) + 1.2, -w), groesse: 6, bewohner: [], prio: PRIO.bau - 1 },
    `<span class="klein">${esc(TX.rennen_titel)}</span>` + RENNEN.top.slice(0, 3).map((x, i) => `<span>${i + 1}. ${esc(x.text)} · ${+x.likes || 0}♥</span>`).join(""), "tafel"); }
for (const v of W_VIERTEL) if (v.schildP) neuSchild({ u: v.mitte.u, w: v.mitte.w, dach: v.schildP, groesse: 10, bewohner: [], prio: PRIO.platz }, `<span>${esc(TX.rodung)}</span><span class="klein">${esc(TX.rodung_klein)}</span>`, "platz");
for (const d of DOERFER) if (d.schildP) neuSchild({ u: d.u, w: d.w, dach: d.schildP, groesse: 10, bewohner: [], prio: PRIO.bau },
  `<span>${esc(TX["dorf" + d.nr] || "Village " + d.nr)}</span><span class="klein">${esc(TX["dorf" + d.nr + "_klein"] || "new since Day 3")}</span>`, "arbeit");
const FIGURSCHILD = (() => { const d = document.createElement("div"); d.className = "schild an figur"; HUD.schilder.appendChild(d); const s = { l: { u: 0, w: 0, dach: new THREE.Vector3(), bewohner: [], prio: 90, bis: 0 }, d }; SCH.push(s); return s; })();
for (const dk of W_DEKO) if (dk.typ === "beerenbusch") { const hs = Object.keys(W_BERUFE).filter(h => W_BERUFE[h] === "Berry gatherer");
  if (hs.length) neuSchild({ u: dk.u, w: dk.w, dach: new THREE.Vector3(dk.u, hoehe(dk.u, dk.w) + 2.4, -dk.w), groesse: 5, bewohner: [], prio: PRIO.arbeit }, `<span class="klein">${esc(dk.schild || "Berry gatherers")}</span>` + hs.map(h => `<span class="hd">@${esc(h)}</span>`).join(""), "arbeit"); }
window.__zeige = (u, w, b) => { K.ziel = { u, w, b, t0: performance.now(), von: { ...K } }; };
let markiert = null;
function finde(text) {
  const h = text.trim().replace(/^@/, "").toLowerCase(); if (!h) return;
  const s = SCH.find(x => x.l.bewohner.includes(h));   // (Bauplatz-/Arbeitsschilder haben keine Bewohner)
  if (!s) { HUD.meldung.textContent = fuell(DATEN.abgleich_pro_tag ? TX.nicht_da_n : TX.nicht_da, { h, n: DATEN.abgleich_pro_tag }); HUD.meldung.className = "zeigen"; return; }
  markiert = s; const alle = s.l.alle || s.l.bewohner;
  HUD.meldung.textContent = alle.length > 1 ? fuell(TX.geteilt, { alle: alle.map(x => "@" + x).join(", ") }) : fuell(TX.hier, { h }) + (W_BERUFE[h] ? ` · ${W_BERUFE[h]}` : ""); HUD.meldung.className = "zeigen";
  K.ziel = { u: s.l.u, w: s.l.w + .5, b: Math.min(30, Math.max(22, s.l.groesse * 2.6)), t0: performance.now(), von: { ...K } };
  document.activeElement?.blur?.();
}
document.getElementById("form").addEventListener("submit", e => { e.preventDefault(); finde(HUD.suche.value); });
window.__finde = finde;
const v = new THREE.Vector3();
// Schilder ohne Überlappung (17.10.): nach Priorität platzieren (markiert > Häuser > Bauplätze > Bauten > Arbeit, dann Nähe zur Bildmitte),
// je Schild einige Ausweichplätze rund um den Ankerpunkt, ans Bild geklemmt, Kopf-/Suchkarte bleiben frei; kein Platz -> ausblenden.
const RAND = 6, LUFT = 3, KARTEN = [document.getElementById("kopf"), document.getElementById("unten")];
const AUSWEICH = [[0, 0], [0, -1], [-.55, 0], [.55, 0], [-.55, -1], [.55, -1], [0, 1], [0, -2], [-1.1, 0], [1.1, 0], [-.55, 1], [.55, 1]];
const schneidet = (a, b) => a.x < b.x + b.w + LUFT && b.x < a.x + a.w + LUFT && a.y < b.y + b.h + LUFT && b.y < a.y + a.h + LUFT;
window.__schilder = () => SCH.filter(s => s.d.style.display === "block").map(s => { const r = s.d.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, t: s.d.textContent, an: s === markiert }; });
// ---- Namen an/aus (Vorschau 18.10.): aus = beim Ranzoomen keine Namensschilder; die Suche zeigt das gesuchte Haus trotzdem. Zustand im Browser gemerkt.
let NAMENSCHILDER = true; try { NAMENSCHILDER = localStorage.getItem("realm-namen") !== "aus"; } catch (e) {}
{ const k = document.getElementById("namen"); const setz = () => { if (k) { k.textContent = NAMENSCHILDER ? "Names: on" : "Names: off"; k.setAttribute("aria-pressed", String(NAMENSCHILDER)); } };
  setz(); if (k) k.addEventListener("click", () => { NAMENSCHILDER = !NAMENSCHILDER; try { localStorage.setItem("realm-namen", NAMENSCHILDER ? "an" : "aus"); } catch (e) {} setz(); }); }
window.__namen = an => { NAMENSCHILDER = an; };
{ const k = document.getElementById("namen"); if (k) KARTEN.push(k); }
{ const k = document.getElementById("drehen"); if (k) { k.addEventListener("click", () => { DREH_ZIEL = Math.round((DREH_ZIEL + 45) / 45) * 45; }); KARTEN.push(k); } }   // Schilder weichen dem Knopf aus
function schilder() {
  const nah = K.b < 42 && NAMENSCHILDER, W = innerWidth, H = innerHeight, kand = [];
  if (FIGURSCHILD.l.slot?.z) FIGURSCHILD.l.dach.setFromMatrixPosition(FIGURSCHILD.l.slot.kopf.matrixWorld).y += 1.2;
  for (const s of SCH) { const fig = s === FIGURSCHILD, an = s === markiert || fig; v.copy(s.l.dach).project(cam);
    const im = v.z < 1 && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05;
    if (fig ? performance.now() < s.l.bis && im : (nah || an) && (im || an)) { s.px = (v.x + 1) / 2 * W; s.py = (1 - v.y) / 2 * H; s.an = an; kand.push(s); if (s.d.style.display !== "block") s.d.style.display = "block"; s.d.classList.toggle("an", an); }
    else if (s.d.style.display !== "none") { s.d.style.display = "none"; s.letzt = null; } }
  if (FIGURSCHILD.d.style.display === "block") FIGURSCHILD.an = true;
  const belegt = KARTEN.map(k => { const r = k.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  for (const s of kand) { s.w = s.d.offsetWidth; s.h = s.d.offsetHeight; s.rang = (s.an ? PRIO.an : s.l.prio ?? 30) - Math.hypot(s.px - W / 2, s.py - H / 2) / Math.hypot(W, H); }
  kand.sort((a, b) => b.rang - a.rang);
  for (const s of kand) {
    const versuche = s.letzt != null ? [s.letzt, ...AUSWEICH.keys()] : AUSWEICH.keys(); let gut = null;
    for (const i of versuche) { const [fx, fy] = AUSWEICH[i];
      const x = Math.max(RAND, Math.min(W - s.w - RAND, s.px - s.w / 2 + fx * (s.w + LUFT))), y = Math.max(RAND, Math.min(H - s.h - RAND, s.py - s.h - 4 + fy * (s.h + LUFT)));
      const r = { x, y, w: s.w, h: s.h }; if (!belegt.some(b => schneidet(r, b))) { gut = r; s.letzt = i; break; } }
    if (!gut && s.an) { const x = Math.max(RAND, Math.min(W - s.w - RAND, s.px - s.w / 2)), y = Math.max(RAND, Math.min(H - s.h - RAND, s.py - s.h - 4)); gut = { x, y, w: s.w, h: s.h }; }
    if (!gut) { s.d.style.display = "none"; s.letzt = null; continue; }
    belegt.push(gut); s.d.style.transform = `translate(${gut.x}px,${gut.y}px)`; }
}

// ---- Schleife (30 fps reichen; pausiert im Hintergrund)
const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
let letzt = 0;
window.__katze = () => FIG.katze ? { u: FIG.katze.g.position.x, w: -FIG.katze.g.position.z } : null;
function figurenLeben(t) {
  TURM_LEBEN(t);   // TURM-1910
  ZUSAGEN_LEBEN(t);   // ZUSAGEN-1810
  for (const f of FIG.flaggen || []) { f.tuch.rotation.y = .35 * Math.sin(t * 1.3 + f.ph) + .15 * Math.sin(t * 3.1); f.tuch.scale.x = .95 + .05 * Math.sin(t * 4 + f.ph); }
  for (const s of FIG.schaukeln || []) { const z = (t + s.ph) % 40; s.kind.visible = z < 22; s.pendel.rotation.z = (s.kind.visible ? .35 : .12) * Math.sin(t * 1.9); }
  if (FIG.fass) { const fl = FIG.fass.g.userData.flamme; fl.scale.set(1, .8 + .3 * Math.sin(t * 13) + .1 * Math.sin(t * 29), 1); }
  const K_ = FIG.katze; if (!K_ || !K_.weg) return;
  const zt = t % K_.T, W_ = K_.weg; let i = W_.length - 1; while (i > 0 && zt < W_[i].t0) i--;
  const p = W_[i], q = W_[(i + 1) % W_.length], g = K_.g, ud = g.userData, d = zt - p.t0;
  const bodenY = (u, w, pp) => pp.oben ? pp.y : hoehe(u, w);
  if (d < p.ruhe) {   // sitzt / putzt sich / schaut
    const y = bodenY(p.u, p.w, p); g.position.set(p.u, y, -p.w); ud.rumpf.rotation.z = .25; ud.kopf.rotation.y = .5 * Math.sin(t * .9); ud.schwanz.rotation.z = .6 + .35 * Math.sin(t * 2.4);
    ud.beine.forEach(b => b.rotation.z = 0); }
  else { const k = Math.min(1, (d - p.ruhe) / p.lauf), u = p.u + (q.u - p.u) * k, w = p.w + (q.w - p.w) * k;
    const y0 = bodenY(p.u, p.w, p), y1 = bodenY(q.u, q.w, q), boden = hoehe(u, w);
    let y = k < .15 ? y0 + (boden - y0) * (k / .15) + Math.sin(k / .15 * Math.PI) * .6 : k > .85 ? boden + (y1 - boden) * ((k - .85) / .15) + Math.sin((k - .85) / .15 * Math.PI) * .6 : boden;   // Sprung runter/rauf
    g.position.set(u, y, -w); g.rotation.y = Math.atan2(-(q.w - p.w), q.u - p.u); ud.rumpf.rotation.z = 0; ud.kopf.rotation.y = 0;
    ud.schwanz.rotation.z = .9; ud.beine.forEach((b, j) => b.rotation.z = (j % 2 ? 1 : -1) * .5 * Math.sin(t * 14)); }
  if (K_.schild) { K_.schild.l.dach.set(g.position.x, g.position.y + 1.6, g.position.z); K_.schild.l.u = g.position.x; K_.schild.l.w = -g.position.z; } }
function leben(t) {   // Tiere + laufende Bewohner (wie im Reel), leichtgewichtig
  figurenLeben(t);
  for (const r of LEBEN.rehe) { const z = t + r.ph; r.g.userData.hals.rotation.z = -.6 * Math.max(0, Math.sin(z * .9)) ** 2; r.g.position.x = r.u + .25 * Math.sin(z * .23); }
  for (const h of LEBEN.hasen) { const z = t * 1.3 + h.ph, k = Math.floor(z), f = z - k, sprung = f < .35 ? Math.sin(f / .35 * Math.PI) : 0, q = Math.min(1, f / .35);
    const hin = (k % 8) < 4, s = .45 * (hin ? (k % 4) + q : 4 - (k % 4) - q), u = h.u + Math.cos(h.dir) * s, w = h.w + Math.sin(h.dir) * s;
    h.g.position.set(u, hoehe(u, w) + .35 * sprung, -w); h.g.rotation.y = -(hin ? h.dir : h.dir + Math.PI); }
  for (const v of LEBEN.voegel) { const x = -60 + ((t * 7 + 40) % 120), w = -22 + .3 * x + v.dw + 2 * Math.sin(t * .3); v.g.position.set(x + v.dx, 11 + .6 * Math.sin(t * 1.3 + v.ph), -w);
    v.g.children.forEach(f => f.rotation.x = f.userData.s * .55 * Math.sin(t * 8.4 + v.ph)); }
  for (const L of LEBEN.laeufer) { const per = Math.hypot(L.b.u - L.a.u, L.b.w - L.a.w) / L.v, z = ((t + L.ph * 3) % (2 * per)) / per, hin = z < 1, p = hin ? z : 2 - z;
    const u = zz(L.a.u, L.b.u, p), w = zz(L.a.w, L.b.w, p); L.m.position.set(u, hoehe(u, w), -w); L.m.rotation.y = Math.atan2((L.b.u - L.a.u) * (hin ? 1 : -1), -(L.b.w - L.a.w) * (hin ? 1 : -1));
    const m = L.m.userData.m; m.beine.forEach((b, i) => b.rotation.x = (i ? 1 : -1) * .5 * Math.sin(t * 8 + L.ph)); m.arme[0].rotation.x = .35 * Math.sin(t * 8 + L.ph); m.arme[1].rotation.x = -.35 * Math.sin(t * 8 + L.ph); }
}
const FPS = { n: 0 }; window.__fps = () => FPS.n;
let UHR_T = 0, FEUERSCHATTEN = 0; const LEISTUNG = { voll: P.get("leistung") === "voll", n: 0, t0: 0, schwach: 0, runden: 0, letzt: 0 };
window.__wachstum = () => ({ uhr: ZEIT.text(), nacht: +Math.min(.92, nachtGrad(ZEIT.sek() / 3600)).toFixed(2), saison: SAISON.name, monat: SAISON.monat, wetter: WETTER,
  niederschlag: NIED ? (NIED.aus ? "aus" : "an") : "keiner", laeufer_sichtbar: ALLTAG.sichtbar(), fps: +LEISTUNG.letzt.toFixed(1), drawcalls: renderer.info.render.calls });
const NIED = niederschlag();
window.__figuren = () => ALLTAG.slots.filter(sl => sl.z).map(sl => { const q = new THREE.Vector3().setFromMatrixPosition(sl.kopf.matrixWorld).project(cam);
  return { h: sl.p.h, t: sl.z.t, pose: sl.z.pose, x: (q.x + 1) / 2 * innerWidth, y: (1 - q.y) / 2 * innerHeight }; });
function schleife(ts) {
  requestAnimationFrame(schleife); if (document.hidden) { LEISTUNG.t0 = ts; LEISTUNG.n = 0; return; } if (ts - letzt < 33) return; letzt = ts;
  if (K.ziel) { const z = K.ziel, p = Math.min(1, (ts - z.t0) / 1400), e = ease(p); K.u = z.von.u + (z.u - z.von.u) * e; K.w = z.von.w + (z.w - z.von.w) * e;
    K.b = z.von.b + (z.b - z.von.b) * e + Math.sin(p * Math.PI) * 10; if (p >= 1) K.ziel = null; }
  const t = ts / 1000, std = ZEIT.sek() / 3600, ng = Math.min(.92, nachtGrad(std));
  bewegen(c, t, ng, NS * (WETTER === "nebel" ? .8 : 1), 2);   // 18.10.: Feuerschatten (Wuerfel = 6 Durchgaenge) tags gar nicht, nachts jedes 4. Bild neu
  FEUERSCHATTEN = (FEUERSCHATTEN + 1) % 4; for (const f of c.FEUER) { f.pl.shadow.autoUpdate = false; if (ng > .35 && FEUERSCHATTEN === 0 || FPS.n < 2) f.pl.shadow.needsUpdate = true; } leben(t); ALLTAG.tick(tagSek(ZEIT.sek()), t); ansicht(); NIED?.tick(t); renderer.render(c.scene, cam); schilder(); FPS.n++;
  if (ts - (UHR_T || 0) > 10000) { UHR_T = ts; uhrText(); }
  { const f = K.b > 700; if (FERN.an !== f) { FERN.an = f; FERN.teile.forEach(m => m.visible = f); } }   // weite Sicht
  { const e = K.b > 80; if (LOD.stand !== e) { LOD.stand = e; LOD.detail.forEach(m => m.visible = !e); LOD.einfach.forEach(m => m.visible = e); } }   // ferne Viertel: einfach beim Herauszoomen
  LEISTUNG.n++; if (ts - LEISTUNG.t0 > 3000) { const fps = LEISTUNG.n * 1000 / (ts - LEISTUNG.t0); LEISTUNG.t0 = ts; LEISTUNG.n = 0; LEISTUNG.letzt = fps;   // schwache Bildrate: Niederschlag aus
    if (!LEISTUNG.voll && LEISTUNG.runden++ > 0 && fps < 20) { if (++LEISTUNG.schwach >= 2 && NIED && !NIED.aus) { NIED.aus = true; NIED.pts.visible = false; } } else LEISTUNG.schwach = 0; }
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); });
const q = new URLSearchParams(location.search).get("find"); if (q) { HUD.suche.value = q; setTimeout(() => finde(q), 400); }
requestAnimationFrame(schleife);
requestAnimationFrame(() => requestAnimationFrame(() => { window.__bereit = true; }));
