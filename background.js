(() => {
  'use strict';
  const graph = window.personalSiteMathNetwork;
  const canvas = document.getElementById('math-background');
  const about = document.getElementById('about');
  const mapSlot = document.querySelector('.about-map');
  const aboutCopy = document.querySelector('.about-copy');
  const education = document.getElementById('education');
  const symbolSlot = document.querySelector('.education-symbol');
  const educationList = document.querySelector('.education-list');
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
  const cityVectors = graph.cityVectors || [];
  const symbolData = window.personalSiteSymbolNetwork;
  const symbol = symbolData && symbolData.nodes.length === count && education && symbolSlot ? symbolData : null;
  const mapBounds = {
    left: Math.min(...graph.nodes.map(([x]) => x)),
    right: Math.max(...graph.nodes.map(([x]) => x)),
    top: Math.min(...graph.nodes.map(([, y]) => y)),
    bottom: Math.max(...graph.nodes.map(([, y]) => y)),
  };
  const positions = Array.from({ length: count }, () => [0, 0]);
  let width = 0, height = 0, ratio = 1;
  let field = [], fieldEdges = [], mapRect, symbolRect;
  let spainBlend = 0, symbolBlend = 0, target = 'field', transition = null;
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
  // Separate, dot-free origins let the city pairs gather without adding neurons
  // or changing the identities used by the Spain-to-shell transition.
  const cityHomes = cityVectors.map(() => [.15 + random() * .7, .15 + random() * .7]);

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
    const amount = ease(elapsed);
    spainBlend = mix(transition.from[0], transition.to[0], amount);
    symbolBlend = mix(transition.from[1], transition.to[1], amount);
    if (elapsed === 1) {
      [spainBlend, symbolBlend] = transition.to;
      transition = null;
    }
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
    const nextSymbolRect = symbol ? symbolSlot.getBoundingClientRect() : null;
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const focusLine = headerBottom + (height - headerBottom) * .36;
    // On narrow screens the map follows the biography. Wait until its reserved
    // space is visible. The same rule applies to the symbol below education.
    const active = (element, slot, name) => {
      const section = element.getBoundingClientRect();
      const tolerance = target === name ? 24 : 0;
      const visible = slot.top < height - 40 + tolerance && slot.bottom > headerBottom + 24 - tolerance;
      return visible && section.top <= focusLine + tolerance && section.bottom > focusLine - tolerance;
    };
    const next = active(about, nextRect, 'spain') ? 'spain'
      : symbol && active(education, nextSymbolRect, 'symbol') ? 'symbol' : 'field';
    // Keep the last visible destination when leaving, even after an anchor jump.
    // The particles disperse from where they were, rather than jumping offscreen.
    if (next === 'spain' || !mapRect) mapRect = mapDestination(nextRect);
    if (symbol && (next === 'symbol' || !symbolRect)) symbolRect = nextSymbolRect;
    const destination = [Number(next === 'spain'), Number(next === 'symbol')];
    if (motion.matches) {
      target = next;
      [spainBlend, symbolBlend] = destination;
      transition = null;
    } else if (next !== target) {
      target = next;
      transition = { from: [spainBlend, symbolBlend], to: destination, start: now, duration: 1500 };
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
    const blend = spainBlend + symbolBlend;
    const fieldBlend = 1 - blend;
    const scale = Math.min(mapRect.width / graph.width, mapRect.height / graph.height);
    const mapX = mapRect.left + (mapRect.width - graph.width * scale) / 2;
    const mapY = mapRect.top + (mapRect.height - graph.height * scale) / 2;
    const symbolScale = symbol ? Math.min(symbolRect.width / symbol.width, symbolRect.height / symbol.height) : 1;
    const symbolX = symbol ? symbolRect.left + (symbolRect.width - symbol.width * symbolScale) / 2 : 0;
    const symbolY = symbol ? symbolRect.top + (symbolRect.height - symbol.height * symbolScale) / 2 : 0;
    graph.nodes.forEach(([x, y], index) => {
      const [cx, cy] = symbol ? symbol.nodes[index] : [0, 0];
      positions[index][0] = field[index][0] * fieldBlend + (mapX + x * scale) * spainBlend + (symbolX + cx * symbolScale) * symbolBlend;
      positions[index][1] = field[index][1] * fieldBlend + (mapY + y * scale) * spainBlend + (symbolY + cy * symbolScale) * symbolBlend;
    });

    connections(fieldEdges, .065 * (1 - blend), Math.max(65, Math.sqrt(width * height / count) * 2.2));
    connections(graph.connections, .2 * spainBlend, Math.max(60, 90 * scale));
    if (symbol) connections(symbol.connections, .28 * symbolBlend, Math.max(60, 90 * symbolScale));
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
    // Fade the angle pairs away for the shell's clean contours.
    // Spain and the scattered background keep their existing motifs.
    const vectorOpacity = mix(.15, .45, blend) * (1 - symbolBlend);
    if (vectorOpacity < .002) return;
    context.strokeStyle = `rgba(155,112,82,${vectorOpacity})`;
    context.lineWidth = 1;
    context.beginPath();
    graph.vectors.forEach((vector, index) => {
      const [x, y] = positions[vector.node];
      const turn = Math.atan2(Math.sin(vector.angle - fieldAngles[index]), Math.cos(vector.angle - fieldAngles[index]));
      const symbolAngle = symbol ? symbol.vectorAngles[index] : vector.angle;
      const symbolTurn = Math.atan2(Math.sin(symbolAngle - fieldAngles[index]), Math.cos(symbolAngle - fieldAngles[index]));
      const angle = fieldAngles[index] + turn * spainBlend + symbolTurn * symbolBlend;
      const vectorScale = (width < 700 ? .72 : 1) * fieldBlend + scale * spainBlend + symbolScale * .65 * symbolBlend;
      arrow(x, y, angle, vector.length * vectorScale);
      arrow(x, y, angle + vector.spread, (vector.length - 5) * vectorScale);
      const radius = Math.max(4, 12 * vectorScale);
      context.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      context.arc(x, y, radius, angle, angle + vector.spread);
    });
    context.stroke();

    // These two unattached vector pairs belong only to the assembled Spain map.
    // Move them in from the field and fade them out when leaving About me.
    const cityOpacity = .45 * spainBlend;
    if (cityOpacity < .002) return;
    context.strokeStyle = `rgba(155,112,82,${cityOpacity})`;
    context.beginPath();
    cityVectors.forEach((city, index) => {
      const x = mix(cityHomes[index][0] * width, mapX + city.origin[0] * scale, spainBlend);
      const y = mix(cityHomes[index][1] * height, mapY + city.origin[1] * scale, spainBlend);
      const cityScale = mix(width < 700 ? .72 : 1, scale, spainBlend);
      arrow(x, y, city.angle, city.length * cityScale);
      arrow(x, y, city.angle + city.spread, (city.length - 5) * cityScale);
      const radius = Math.max(4, 12 * cityScale);
      context.moveTo(x + Math.cos(city.angle) * radius, y + Math.sin(city.angle) * radius);
      context.arc(x, y, radius, city.angle, city.angle + city.spread);
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
    if (symbol) document.documentElement.classList.add('has-symbol-background');
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
    [about, mapSlot, aboutCopy, education, symbolSlot, educationList, header, cvLink].filter(Boolean).forEach(element => observer.observe(element));
  }
  if (document.fonts) document.fonts.ready.then(refresh);
  schedule();
})();
