const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// points: [{x: label(string), y: number}], drawn as a responsive area/line chart.
export function renderLineChart(container, rawPoints, { color = cssVar('--accent', '#35508F'), height = 220 } = {}) {
  container.innerHTML = '';
  const points = rawPoints.filter(p => typeof p.y === 'number' && !Number.isNaN(p.y));
  if (!points.length) {
    container.innerHTML = '<div class="empty-state">No portfolio value data yet</div>';
    return;
  }

  const width = container.clientWidth || 600;
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };
  const values = points.map(p => p.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xAt = (i) => padding.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v) => padding.top + plotH - ((v - min) / range) * plotH;

  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height, class: 'line-chart' });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.y)}`).join(' ');
  const areaPath = `${linePath} L ${xAt(points.length - 1)} ${padding.top + plotH} L ${xAt(0)} ${padding.top + plotH} Z`;

  svg.appendChild(el('path', { d: areaPath, fill: color, opacity: '0.12', stroke: 'none' }));
  svg.appendChild(el('path', { d: linePath, fill: 'none', stroke: color, 'stroke-width': '2' }));

  const zeroed = min < 0 && max > 0;
  if (zeroed) {
    const y0 = yAt(0);
    svg.appendChild(el('line', { x1: padding.left, x2: width - padding.right, y1: y0, y2: y0, stroke: cssVar('--text-dim', '#7A776F'), 'stroke-opacity': '0.5', 'stroke-dasharray': '4 4', 'stroke-width': '1' }));
  }

  const label = (p, i, anchor) => {
    const t = el('text', { x: xAt(i), y: height - 6, 'font-size': '11', fill: cssVar('--text-dim', '#7A776F'), 'text-anchor': anchor });
    t.textContent = p.x;
    return t;
  };

  // Space out however many date labels fit without overlapping (roughly one per 70px).
  const maxLabels = Math.max(2, Math.floor(plotW / 70));
  const lastIdx = points.length - 1;
  const step = Math.max(1, Math.round(lastIdx / (maxLabels - 1)));
  const tickIndexes = [];
  for (let i = 0; i <= lastIdx; i += step) tickIndexes.push(i);
  if (tickIndexes[tickIndexes.length - 1] !== lastIdx) tickIndexes.push(lastIdx);

  tickIndexes.forEach((i) => {
    const anchor = i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle';
    svg.appendChild(label(points[i], i, anchor));
  });

  container.appendChild(svg);
}

// data: [{group, value, sublabel}], rendered as a horizontal bar list (HTML/CSS, not SVG).
export function renderBarList(container, data, { valueSuffix = '%', color = cssVar('--accent', '#35508F') } = {}) {
  container.innerHTML = '';
  if (!data.length) {
    container.innerHTML = '<div class="empty-state">Not enough closed trades for this breakdown yet</div>';
    return;
  }
  const negativeColor = cssVar('--negative', '#B23B2E');
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1);
  for (const d of data) {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const pct = Math.min(100, (Math.abs(d.value) / maxAbs) * 100);
    const negative = d.value < 0;
    row.innerHTML = `
      <div class="bar-row-label">${d.group}${d.sublabel ? `<span class="bar-row-sub">${d.sublabel}</span>` : ''}</div>
      <div class="bar-row-track">
        <div class="bar-row-fill" style="width:${pct}%; background:${negative ? negativeColor : color}"></div>
      </div>
      <div class="bar-row-value">${d.value.toFixed(1)}${valueSuffix}</div>
    `;
    container.appendChild(row);
  }
}
