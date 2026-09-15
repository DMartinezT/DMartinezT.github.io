(() => {
  'use strict';
  const graph = window.personalSiteMathNetwork;
  const canvas = document.getElementById('math-background');
  const about = document.getElementById('about');
  const mapSlot = document.querySelector('.about-map');
  const aboutCopy = document.querySelector('.about-copy');
  const cvLink = document.querySelector('.cv-link');
  const header = document.querySelector('.site-header');
  if (!graph || !canvas || !about || !mapSlot) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mix = (a, b, amount) => a + (b - a) * amount;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * value * (value * (value * 6 - 15) + 10);
  const count = graph.nodes.length;
  const mapBounds = {
    left: Math.min(...graph.nodes.map(([x]) => x)),
    right: Math.max(...graph.nodes.map(([x]) => x)),
    top: Math.min(...graph.nodes.map(([, y]) => y)),
    bottom: Math.max(...graph.nodes.map(([, y]) => y)),
  };
  const positions = Array.from({ length: count }, () => [0, 0]);
  let width = 0, height = 0, ratio = 1;
  let field = [], fieldEdges = [], mapRect;
  let blend = 0, target = 0, transition = null;
  let frame = 0, needsMeasure = true, needsResize = true;

  // One stable shuffled grid gives every geographic node a scattered home.
  // Resizing never changes the identities of the nodes or vector pairs.
  let seed = 2709;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const order = Array.from({ length: count }, (_, index) => index);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const offsets = graph.nodes.map(() => [random(), random()]);
  const fieldAngles = graph.vectors.map(() => random() * Math.PI * 2 - Math.PI);

  function resize() {
    width = document.documentElement.clientWidth || window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const columns = Math.max(1, Math.ceil(Math.sqrt(count * width / height)));
    const rows = Math.ceil(count / columns);
    field = order.map((cell, index) => [
      (cell % columns + .15 + offsets[index][0] * .7) * width / columns,
      (Math.floor(cell / columns) + .15 + offsets[index][1] * .7) * height / rows,
    ]);
    // Local neural connections in the scattered state; geographic connections
    // take over during assembly. Both sets always join the same moving nodes.
    const seen = new Set();
    fieldEdges = [];
    field.forEach((a, i) => {
      field.map((b, j) => ({ j, distance: Math.hypot(a[0] - b[0], a[1] - b[1]) }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .forEach(({ j }) => {
          const key = i < j ? `${i}:${j}` : `${j}:${i}`;
          if (!seen.has(key)) { seen.add(key); fieldEdges.push([i, j]); }
        });
    });
    needsResize = false;
  }

  function advance(now) {
    if (!transition) return;
    const elapsed = clamp((now - transition.start) / transition.duration);
    blend = mix(transition.from, transition.to, ease(elapsed));
    if (elapsed === 1) { blend = transition.to; transition = null; }
  }

  function mapDestination(slot) {
    if (width <= 700 || !aboutCopy || !cvLink) return slot;
    const cv = cvLink.getBoundingClientRect();
    const left = aboutCopy.getBoundingClientRect().right + 24;
    const right = Math.min(cv.right, width - 16);
    if (!cv.width || right <= left) return slot;
    // Fit the visible geographic points, excluding the SVG's empty margins.
    // Spain starts just beyond the biography and ends at the CV button's edge.
    const scale = (right - left) / (mapBounds.right - mapBounds.left);
    return {
      left: left - mapBounds.left * scale,
      top: slot.top + slot.height / 2 - (mapBounds.top + mapBounds.bottom) * scale / 2,
      width: graph.width * scale,
      height: graph.height * scale,
    };
  }

  function measure(now) {
    if (needsResize) resize();
    const nextRect = mapSlot.getBoundingClientRect();
    const section = about.getBoundingClientRect();
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const focusLine = headerBottom + (height - headerBottom) * .36;
    const tolerance = target ? 24 : 0;
    // On narrow screens the map follows the biography. Wait until its reserved
    // space is visible, so the particles never gather below the viewport.
    const mapVisible = nextRect.top < height - 40 + tolerance && nextRect.bottom > headerBottom + 24 - tolerance;
    const inAbout = section.top <= focusLine + tolerance && section.bottom > focusLine - tolerance;
    const next = Number(mapVisible && inAbout);
    // Keep the last visible destination when leaving, even after an anchor jump.
    // The particles disperse from where they were, rather than jumping offscreen.
    if (next || !mapRect) mapRect = mapDestination(nextRect);
    if (motion.matches) {
      target = next;
      blend = next;
      transition = null;
    } else if (next !== target) {
      target = next;
      transition = { from: blend, to: next, start: now, duration: 1500 };
    }
    needsMeasure = false;
  }

  function connections(edges, opacity, maxLength) {
    if (opacity < .002) return;
    context.beginPath();
    for (const [i, j] of edges) {
      const a = positions[i], b = positions[j];
      // Do not draw long cross-screen threads while the network rearranges.
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > maxLength) continue;
      context.moveTo(a[0], a[1]);
      context.lineTo(b[0], b[1]);
    }
    context.strokeStyle = `rgba(100,122,139,${opacity})`;
    context.lineWidth = .7;
    context.stroke();
  }

  function arrow(x, y, angle, length) {
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const head = Math.max(2.5, Math.min(4, length * .16));
    context.moveTo(x, y);
    context.lineTo(endX, endY);
    context.moveTo(endX - Math.cos(angle - .5) * head, endY - Math.sin(angle - .5) * head);
    context.lineTo(endX, endY);
    context.lineTo(endX - Math.cos(angle + .5) * head, endY - Math.sin(angle + .5) * head);
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const scale = Math.min(mapRect.width / graph.width, mapRect.height / graph.height);
    const mapX = mapRect.left + (mapRect.width - graph.width * scale) / 2;
    const mapY = mapRect.top + (mapRect.height - graph.height * scale) / 2;
    graph.nodes.forEach(([x, y], index) => {
      positions[index][0] = mix(field[index][0], mapX + x * scale, blend);
      positions[index][1] = mix(field[index][1], mapY + y * scale, blend);
    });

    connections(fieldEdges, .065 * (1 - blend), Math.max(65, Math.sqrt(width * height / count) * 2.2));
    connections(graph.connections, .2 * blend, Math.max(60, 90 * scale));
    context.fillStyle = `rgba(100,122,139,${mix(.12, .38, blend)})`;
    context.beginPath();
    positions.forEach(([x, y], index) => {
      const radius = mix(index % 11 === 0 ? 2 : 1.15, index % 11 === 0 ? 1.7 : .95, blend);
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
    });
    context.fill();

    // The angle between each vector pair is preserved while its shared origin
    // moves and the pair rotates into the geographic network.
    context.strokeStyle = `rgba(155,112,82,${mix(.15, .45, blend)})`;
    context.lineWidth = 1;
    context.beginPath();
    graph.vectors.forEach((vector, index) => {
      const [x, y] = positions[vector.node];
      const turn = Math.atan2(Math.sin(vector.angle - fieldAngles[index]), Math.cos(vector.angle - fieldAngles[index]));
      const angle = fieldAngles[index] + turn * blend;
      const vectorScale = mix(width < 700 ? .72 : 1, scale, blend);
      arrow(x, y, angle, vector.length * vectorScale);
      arrow(x, y, angle + vector.spread, (vector.length - 5) * vectorScale);
      const radius = Math.max(4, 12 * vectorScale);
      context.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      context.arc(x, y, radius, angle, angle + vector.spread);
    });
    context.stroke();
  }

  function render(now) {
    frame = 0;
    if (document.hidden) return;
    advance(now);
    if (needsMeasure) measure(now);
    draw();
    document.documentElement.classList.add('has-math-background');
    if (transition) schedule();
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }

  function refresh() { needsMeasure = true; schedule(); }
  window.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', () => { needsResize = true; refresh(); }, { passive: true });
  window.addEventListener('pageshow', refresh);
  motion.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else refresh();
  });
  // Covers font loading, text resizing and the expanding mobile navigation.
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refresh);
    [about, mapSlot, aboutCopy, header, cvLink].filter(Boolean).forEach(element => observer.observe(element));
  }
  if (document.fonts) document.fonts.ready.then(refresh);
  schedule();
})();
