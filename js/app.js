import { renderTradesTab } from './trades.js';
import { renderPortfolioTab } from './portfolio.js';
import { renderStatsTab } from './statsView.js';
import { renderSettingsTab } from './settingsView.js';
import { getSettings, saveSettings } from './storage.js';

const DEFAULT_FINNHUB_KEY = 'dagrii1r01qomfflj180dagrii1r01qomfflj18g';

const TABS = {
  trades: { label: 'Trades', render: renderTradesTab },
  portfolio: { label: 'Portfolio', render: renderPortfolioTab },
  stats: { label: 'Stats', render: renderStatsTab },
  settings: { label: 'Settings', render: renderSettingsTab },
};

function ensureDefaultApiKey() {
  const settings = getSettings();
  if (!settings.finnhubApiKey) {
    saveSettings({ ...settings, finnhubApiKey: DEFAULT_FINNHUB_KEY });
  }
}

function init() {
  ensureDefaultApiKey();

  const content = document.getElementById('tab-content');
  const nav = document.getElementById('nav');

  let activeTab = 'trades';

  function drawNav() {
    nav.innerHTML = Object.entries(TABS)
      .map(([key, tab]) => `<button class="nav-item ${key === activeTab ? 'nav-item-active' : ''}" data-tab="${key}">${tab.label}</button>`)
      .join('');
    nav.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        draw();
      });
    });
  }

  function draw() {
    drawNav();
    content.innerHTML = '';
    TABS[activeTab].render(content);
  }

  draw();
}

document.addEventListener('DOMContentLoaded', init);
