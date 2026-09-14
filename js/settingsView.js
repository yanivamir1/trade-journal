import { getSettings, saveSettings, getTrades, saveTrades, exportAllData, importAppBackup, makeId } from './storage.js';

function normalizeLegacyTrade(raw) {
  return {
    id: makeId(),
    symbol: raw.symbol,
    trade_date: raw.trade_date,
    entry_price: Number(raw.entry_price),
    position_size: Number(raw.position_size),
    fibonacci_level: raw.fibonacci_level ?? null,
    drop_from_top_pct: raw.drop_from_top_pct ?? null,
    emotion: raw.emotion ?? null,
    planned_stop_loss_pct: raw.planned_stop_loss_pct ?? null,
    pe_ratio: raw.pe_ratio ?? null,
    weekly_atr: raw.weekly_atr ?? null,
    daily_atr: raw.daily_atr ?? null,
    demand_zone_quality: raw.demand_zone_quality ?? null,
    uphill_shape_rating: raw.uphill_shape_rating ?? null,
    uphill_duration: raw.uphill_duration ?? null,
    market_structure: raw.market_structure ?? null,
    market_trend: raw.market_trend ?? null,
    chart_shape: raw.chart_shape ?? null,
    rule_followed: raw.rule_followed ?? null,
    screenshot: raw.screenshot ?? null,
    exit_price: raw.exit_price ?? null,
    exit_date: raw.exit_date ?? null,
    setup_worked: raw.setup_worked ?? null,
    created_at: new Date().toISOString(),
  };
}

export function renderSettingsTab(container) {
  const settings = getSettings();

  container.innerHTML = `
    <div class="panel">
      <h3>מפתח API (Finnhub)</h3>
      <p class="hint">נדרש כדי שכפתור ה-Live Price יעבוד. חינמי, נרשמים ב-finnhub.io/register.</p>
      <form id="api-key-form" class="form-grid">
        <label>מפתח
          <input type="text" name="finnhubApiKey" value="${settings.finnhubApiKey || ''}" placeholder="המפתח שלך">
        </label>
        <button type="submit" class="btn-primary">שמור</button>
      </form>
    </div>

    <div class="panel">
      <h3>ייבוא טריידים מהיסטוריה</h3>
      <p class="hint">קובץ JSON של טריידים (לדוגמה קובץ מיובא מ-trade_journal_example.xlsx).
      הנתונים נשמרים רק בדפדפן שלך.</p>
      <input type="file" id="import-trades" accept="application/json">
    </div>

    <div class="panel">
      <h3>גיבוי ושחזור</h3>
      <p class="hint">גיבוי מלא של כל הטריידים ושווי התיק לקובץ JSON, ושחזור ממנו במכשיר אחר —
      זה גם הדרך הידנית לסנכרן בין הטלפון למחשב עד שיתווסף סנכרון אוטומטי בענן.</p>
      <div class="btn-row">
        <button id="export-btn" class="btn-secondary">ייצוא לקובץ</button>
        <label class="btn-secondary file-label">ייבוא מקובץ
          <input type="file" id="import-backup" accept="application/json" hidden>
        </label>
      </div>
    </div>

    <div class="panel">
      <h3>מחיקת נתונים</h3>
      <button id="reset-btn" class="btn-danger">מחק הכל</button>
    </div>
  `;

  container.querySelector('#api-key-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    saveSettings({ ...settings, finnhubApiKey: fd.get('finnhubApiKey').trim() });
    alert('נשמר');
  });

  container.querySelector('#import-trades').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const list = Array.isArray(json) ? json : [json];
      const normalized = list.map(normalizeLegacyTrade);
      saveTrades([...getTrades(), ...normalized]);
      alert(`יובאו ${normalized.length} טריידים`);
    } catch (err) {
      alert('קובץ לא תקין: ' + err.message);
    }
  });

  container.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportAllData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  container.querySelector('#import-backup').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      importAppBackup(json);
      alert('שוחזר בהצלחה');
    } catch (err) {
      alert('קובץ לא תקין: ' + err.message);
    }
  });

  container.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('בטוח? כל הטריידים ושווי התיק יימחקו מהמכשיר הזה.')) {
      saveTrades([]);
      localStorage.removeItem('tj.portfolio');
      alert('נמחק');
    }
  });
}
