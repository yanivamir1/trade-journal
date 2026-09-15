import { getSettings, saveSettings, getTrades, saveTrades, exportAllData, importAppBackup, makeId, applyTheme } from './storage.js';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

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

  const theme = settings.theme || 'system';

  container.innerHTML = `
    <div class="panel">
      <h3>Appearance</h3>
      <p class="hint">System follows your device's light/dark setting.</p>
      <div class="theme-row">
        ${THEME_OPTIONS.map(o => `<button type="button" class="theme-btn ${o.value === theme ? 'theme-btn-active' : ''}" data-theme-option="${o.value}">${o.label}</button>`).join('')}
      </div>
    </div>

    <div class="panel">
      <h3>API Key (Finnhub)</h3>
      <p class="hint">Required for the Live Price button to work. Free, sign up at finnhub.io/register.</p>
      <form id="api-key-form" class="form-grid">
        <label>Key
          <input type="text" name="finnhubApiKey" value="${settings.finnhubApiKey || ''}" placeholder="Your key">
        </label>
        <button type="submit" class="btn-primary">Save</button>
      </form>
    </div>

    <div class="panel">
      <h3>Import Historical Trades</h3>
      <p class="hint">A JSON file of trades (e.g. a file converted from trade_journal_example.xlsx).
      Data stays only in your browser.</p>
      <input type="file" id="import-trades" accept="application/json">
    </div>

    <div class="panel">
      <h3>Backup &amp; Restore</h3>
      <p class="hint">Full backup of all trades and portfolio value to a JSON file, and restore from it
      on another device — this is also the manual way to sync between your phone and computer until
      automatic cloud sync is added.</p>
      <div class="btn-row">
        <button id="export-btn" class="btn-secondary">Export to File</button>
        <label class="btn-secondary file-label">Import from File
          <input type="file" id="import-backup" accept="application/json" hidden>
        </label>
      </div>
    </div>

    <div class="panel">
      <h3>Delete Data</h3>
      <button id="reset-btn" class="btn-danger">Delete Everything</button>
    </div>
  `;

  container.querySelectorAll('[data-theme-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTheme = btn.dataset.themeOption;
      saveSettings({ ...settings, theme: nextTheme });
      applyTheme(nextTheme);
      renderSettingsTab(container);
    });
  });

  container.querySelector('#api-key-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    saveSettings({ ...settings, finnhubApiKey: fd.get('finnhubApiKey').trim() });
    alert('Saved');
  });

  container.querySelector('#import-trades').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const list = Array.isArray(json) ? json : [json];
      const normalized = list.map(normalizeLegacyTrade);
      saveTrades([...getTrades(), ...normalized]);
      alert(`Imported ${normalized.length} trades`);
    } catch (err) {
      alert('Invalid file: ' + err.message);
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
      alert('Restored successfully');
    } catch (err) {
      alert('Invalid file: ' + err.message);
    }
  });

  container.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('Are you sure? All trades and portfolio value will be deleted from this device.')) {
      saveTrades([]);
      localStorage.removeItem('tj.portfolio');
      alert('Deleted');
    }
  });
}
