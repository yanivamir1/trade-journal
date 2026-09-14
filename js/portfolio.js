import { getPortfolioHistory, addPortfolioEntry, savePortfolioHistory } from './storage.js';
import { renderLineChart } from './charts.js';

// Implements the portfolio_data.json methodology: subtract cumulative net
// deposits/withdrawals so the chart shows pure market movement.
export function computeAdjustedSeries() {
  const records = [...getPortfolioHistory()].sort((a, b) => a.date.localeCompare(b.date));
  let cumNetFlow = 0;
  const series = [];
  for (const r of records) {
    cumNetFlow += Number(r.deposit_withdrawal || 0);
    const rawValue = r.type === 'candle' ? r.close : r.type === 'point' ? r.value : null;
    // Some imported days (e.g. type "empty") carry no observed value — deposit/withdrawal
    // still counts toward cumNetFlow above, but there is nothing to plot for that day.
    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) continue;
    series.push({
      date: r.date,
      type: r.type,
      rawValue,
      cumNetFlow,
      adjustedValue: rawValue - cumNetFlow,
    });
  }
  return series;
}

export function addDailyValue(date, value, depositWithdrawal) {
  addPortfolioEntry({
    date,
    type: 'point',
    value: Number(value),
    deposit_withdrawal: Number(depositWithdrawal) || 0,
  });
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function renderPortfolioTab(container) {
  const series = computeAdjustedSeries();
  const last = series[series.length - 1];

  container.innerHTML = `
    <div class="panel">
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-label">Portfolio Value (adjusted)</div>
          <div class="summary-value">${last ? `$${last.adjustedValue.toFixed(0)}` : '—'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Portfolio Value (raw)</div>
          <div class="summary-value">${last ? `$${last.rawValue.toFixed(0)}` : '—'}</div>
        </div>
      </div>
      <div id="portfolio-chart"></div>
    </div>

    <div class="panel">
      <h3>Add Daily Value</h3>
      <form id="portfolio-form" class="form-grid">
        <label>Date
          <input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}">
        </label>
        <label>Total Portfolio Value ($)
          <input type="number" step="0.01" name="value" required>
        </label>
        <label>Deposit/Withdrawal Today ($, negative for withdrawal)
          <input type="number" step="0.01" name="deposit_withdrawal" value="0">
        </label>
        <button type="submit" class="btn-primary">Save</button>
      </form>
    </div>

    <div class="panel">
      <h3>Import Historical Data</h3>
      <p class="hint">You can import the <code>portfolio_data.json</code> file from the prep folder —
      data stays only in your browser, nothing is uploaded anywhere.</p>
      <input type="file" id="portfolio-import" accept="application/json">
    </div>
  `;

  const chartEl = container.querySelector('#portfolio-chart');
  renderLineChart(chartEl, series.map(s => ({ x: formatDateLabel(s.date), y: s.adjustedValue })));

  container.querySelector('#portfolio-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    addDailyValue(fd.get('date'), fd.get('value'), fd.get('deposit_withdrawal'));
    renderPortfolioTab(container);
  });

  container.querySelector('#portfolio-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const records = Array.isArray(json.records) ? json.records : json;
      const existing = getPortfolioHistory();
      const merged = [...existing.filter(r => !records.some(nr => nr.date === r.date)), ...records];
      merged.sort((a, b) => a.date.localeCompare(b.date));
      savePortfolioHistory(merged);
      renderPortfolioTab(container);
    } catch (err) {
      alert('Invalid file: ' + err.message);
    }
  });
}
