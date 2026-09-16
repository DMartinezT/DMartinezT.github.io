// A geographic graph: Natural Earth coordinates determine both the silhouette
// and placement of neural nodes and vector pairs. No runtime dependencies.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const base = new URL('../', import.meta.url);
const geo = JSON.parse(readFileSync(new URL('data/spain.geojson', base), 'utf8'));
let seed = 1997;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const fmt = n => Number(n.toFixed(2));
const nodeColor = '#647a8b', vectorColor = '#9b7052';
const projected = geo.geometry.coordinates.map(polygon => {
  const isCanary = polygon[0][0][1] < 32;
  // Canary Islands use a clearly separated inset; mainland/Balearics share a projection.
  return polygon.map(ring => ring.map(([lon, lat]) => isCanary
    ? [100 + (lon + 18.3) * 44, 620 - (lat - 27.5) * 53]
    : [70 + (lon + 9.5) * 49, 80 + (43.9 - lat) * 64]));
});
const rings = projected.map(p => p[0]);
function insideRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const contains = point => projected.some(p => insideRing(point, p[0]) && !p.slice(1).some(hole => insideRing(point, hole)));
const outline = projected.flat().map(ring => ring.map(([x,y], i) => `${i ? 'L' : 'M'}${fmt(x)},${fmt(y)}`).join('') + 'Z').join('');
const nodes = [];
// Vertical layers suggest a neural network while preserving the geographic boundary.
for (let x = 74; x < 770; x += 22) {
  for (let y = 72; y < 650; y += 23) {
    const point = [x + (random() - .5) * 10, y + (random() - .5) * 11];
    if (contains(point)) nodes.push(point);
  }
}
// Sample the real coast as nodes too, so Spain remains legible at subtle opacity.
for (const ring of rings) {
  let distance = 0;
  for (let i = 1; i < ring.length; i++) {
    distance += Math.hypot(ring[i][0] - ring[i-1][0], ring[i][1] - ring[i-1][1]);
    if (distance > 19) { nodes.push(ring[i]); distance = 0; }
  }
}
const lines = [], connections = [], seen = new Set();
nodes.forEach((a, i) => {
  const nearest = nodes.map((b, j) => ({b,j,d:Math.hypot(a[0]-b[0],a[1]-b[1])}))
    .filter(({j,d}) => j !== i && d > 7 && d < 44).sort((a,b) => a.d-b.d).slice(0,3);
  nearest.forEach(({b,j}) => {
    const key = [i,j].sort((a,b)=>a-b).join('-');
    if (seen.has(key) || !contains([(a[0]+b[0])/2,(a[1]+b[1])/2])) return;
    seen.add(key);
    connections.push([i, j]);
    lines.push(`<path d="M${fmt(a[0])},${fmt(a[1])}L${fmt(b[0])},${fmt(b[1])}"/>`);
  });
});
const vectors = [], vectorData = [], origins = [];
for (let i = 0; i < nodes.length; i++) {
  const [x,y] = nodes[i];
  if (y > 555 || origins.some(p=>Math.hypot(p[0]-x,p[1]-y)<70) || random() > .23) continue;
  const angle = -1.2 + random() * 3.8;
  const spread = .52 + random() * .7;
  const length = 31 + random() * 12;
  const a = [x + Math.cos(angle) * length, y + Math.sin(angle) * length];
  const b = [x + Math.cos(angle+spread) * (length-5), y + Math.sin(angle+spread) * (length-5)];
  if (!contains(a) || !contains(b)) continue;
  origins.push([x,y]);
  vectorData.push({ node: i, angle, spread, length });
  const r = 12;
  const arc = `M${fmt(x+Math.cos(angle)*r)},${fmt(y+Math.sin(angle)*r)}A${r},${r} 0 0 1 ${fmt(x+Math.cos(angle+spread)*r)},${fmt(y+Math.sin(angle+spread)*r)}`;
  vectors.push(`<g><path marker-end="url(#arrow)" d="M${fmt(x)},${fmt(y)}L${fmt(a[0])},${fmt(a[1])}M${fmt(x)},${fmt(y)}L${fmt(b[0])},${fmt(b[1])}"/><path d="${arc}" opacity=".8"/><circle cx="${fmt(x)}" cy="${fmt(y)}" r="2" fill="${vectorColor}" stroke="none"/></g>`);
}
const dots = nodes.map(([x,y],i)=>`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${i%11===0 ? 2.2 : 1.35}"/>`).join('');
// Schematic North African city markers, east of the Canary inset. Keep these
// independent of the neural graph: one vector pair per city, without any dots.
const cityVectors = [
  { name: 'Ceuta', origin: [333, 615], angle: -1.05, spread: .9, length: 35 },
  { name: 'Melilla', origin: [452, 638], angle: -1.2, spread: .95, length: 35 },
];
const citySymbols = cityVectors.map(({ name, origin: [x, y], angle, spread, length }) => {
  const a = [x + Math.cos(angle) * length, y + Math.sin(angle) * length];
  const b = [x + Math.cos(angle + spread) * (length - 5), y + Math.sin(angle + spread) * (length - 5)];
  const r = 12;
  const arc = `M${fmt(x + Math.cos(angle) * r)},${fmt(y + Math.sin(angle) * r)}A${r},${r} 0 0 1 ${fmt(x + Math.cos(angle + spread) * r)},${fmt(y + Math.sin(angle + spread) * r)}`;
  return `<g data-city="${name}"><title>${name}</title><path marker-end="url(#arrow)" d="M${x},${y}L${fmt(a[0])},${fmt(a[1])}M${x},${y}L${fmt(b[0])},${fmt(b[1])}"/><path d="${arc}" opacity=".8"/></g>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 700" fill="none">
<title>Spain, in neural connections and Hilbert-space angles</title>
<desc>Geographic network of Spain including the Balearic Islands and a Canary Islands inset. Ceuta and Melilla are schematic vector-angle pairs below the mainland, with no neural nodes. Copper pairs of directed vectors share an origin and an angle arc.</desc>
<defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0L4,2.5L0,5" stroke="${vectorColor}" stroke-width=".8"/></marker></defs>
<path d="${outline}" fill="${nodeColor}" fill-opacity=".015" stroke="${nodeColor}" stroke-opacity=".18" stroke-width=".85"/>
<g stroke="${nodeColor}" stroke-width=".7" opacity=".28">${lines.join('')}</g>
<g fill="${nodeColor}" opacity=".5">${dots}</g>
<g stroke="${vectorColor}" stroke-width="1.15" opacity=".6">${vectors.join('')}${citySymbols}</g>
<path d="M83,568L83,651L306,651" stroke="${nodeColor}" opacity=".18" stroke-dasharray="3 5"/>
</svg>`;
mkdirSync(new URL('assets/', base), { recursive: true });
writeFileSync(new URL('assets/spain-network.svg', base), svg);
// A classic script also works when index.html is opened directly with file://.
// Both the static fallback and animated background use these exact points.
const graph = { width: 800, height: 700, nodes, connections, vectors: vectorData, cityVectors };
writeFileSync(new URL('assets/math-network.js', base), `// Generated by scripts/generate-map.mjs; source: Natural Earth (public domain).\nwindow.personalSiteMathNetwork = ${JSON.stringify(graph)};\n`);
console.log(`Generated ${nodes.length} geographic nodes, ${lines.length} connections, ${vectors.length} network vector pairs and ${cityVectors.length} dot-free city pairs at ${fileURLToPath(new URL('assets/spain-network.svg', base))}`);
