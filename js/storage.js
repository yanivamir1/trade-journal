const KEYS = {
  trades: 'tj.trades',
  portfolio: 'tj.portfolio',
  settings: 'tj.settings',
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getTrades() {
  return readJson(KEYS.trades, []);
}

export function saveTrades(trades) {
  writeJson(KEYS.trades, trades);
}

export function addTrade(trade) {
  const trades = getTrades();
  trades.push(trade);
  saveTrades(trades);
  return trade;
}

export function updateTrade(id, patch) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return null;
  trades[idx] = { ...trades[idx], ...patch };
  saveTrades(trades);
  return trades[idx];
}

export function deleteTrade(id) {
  saveTrades(getTrades().filter(t => t.id !== id));
}

export function getPortfolioHistory() {
  return readJson(KEYS.portfolio, []);
}

export function savePortfolioHistory(records) {
  writeJson(KEYS.portfolio, records);
}

export function addPortfolioEntry(entry) {
  const records = getPortfolioHistory();
  const withoutSameDate = records.filter(r => r.date !== entry.date);
  withoutSameDate.push(entry);
  withoutSameDate.sort((a, b) => a.date.localeCompare(b.date));
  savePortfolioHistory(withoutSameDate);
}

export function getSettings() {
  return readJson(KEYS.settings, { finnhubApiKey: '', theme: 'system' });
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
}

export function saveSettings(settings) {
  writeJson(KEYS.settings, settings);
}

export function exportAllData() {
  return {
    schema_version: '1.0',
    exported_at: new Date().toISOString(),
    trades: getTrades(),
    portfolio: getPortfolioHistory(),
  };
}

export function importAppBackup(data) {
  if (Array.isArray(data.trades)) saveTrades(data.trades);
  if (Array.isArray(data.portfolio)) savePortfolioHistory(data.portfolio);
}

export function makeId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
