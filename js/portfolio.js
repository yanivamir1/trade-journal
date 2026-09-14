import { getPortfolioHistory, addPortfolioEntry, savePortfolioHistory } from './storage.js';
import { renderLineChart } from './charts.js';

// מיישם את המתודולוגיה מ-portfolio_data.json: ניטרול הפקדות/משיכות מצטבר,
// כדי שהגרף יראה רק תנועת שוק אמיתית ולא כסף שנכנס/יצא מהתיק.
export function computeAdjustedSeries() {
  const records = [...getPortfolioHistory()].sort((a, b) => a.date.localeCompare(b.date));
  let cumNetFlow = 0;
  return records.map(r => {
    cumNetFlow += Number(r.deposit_withdrawal || 0);
    const rawValue = r.type === 'candle' ? r.close : r.value;
    return {
      date: r.date,
      type: r.type,
      rawValue,
      cumNetFlow,
      adjustedValue: rawValue - cumNetFlow,
    };
  });
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
          <div class="summary-label">שווי תיק (מתואם)</div>
          <div class="summary-value">${last ? `$${last.adjustedValue.toFixed(0)}` : '—'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">שווי תיק (גולמי)</div>
          <div class="summary-value">${last ? `$${last.rawValue.toFixed(0)}` : '—'}</div>
        </div>
      </div>
      <div id="portfolio-chart"></div>
    </div>

    <div class="panel">
      <h3>הוספת שווי יומי</h3>
      <form id="portfolio-form" class="form-grid">
        <label>תאריך
          <input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}">
        </label>
        <label>שווי תיק כולל ($)
          <input type="number" step="0.01" name="value" required>
        </label>
        <label>הפקדה/משיכה היום ($, שלילי למשיכה)
          <input type="number" step="0.01" name="deposit_withdrawal" value="0">
        </label>
        <button type="submit" class="btn-primary">שמור</button>
      </form>
    </div>

    <div class="panel">
      <h3>ייבוא נתוני עבר</h3>
      <p class="hint">אפשר לייבא את הקובץ <code>portfolio_data.json</code> מתיקיית ההכנה — הנתונים
      נשמרים רק בדפדפן שלך, לא עולים לשום שרת.</p>
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
      alert('קובץ לא תקין: ' + err.message);
    }
  });
}
