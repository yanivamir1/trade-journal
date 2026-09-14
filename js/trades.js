import { getTrades, addTrade, updateTrade, makeId, getSettings } from './storage.js';
import { deriveAll } from './stats.js';
import { openModal, closeModal } from './modal.js';
import { getLivePriceBundle, errorMessage } from './finnhub.js';
import { EMOTIONS, UPHILL_DURATIONS, MARKET_STRUCTURES, MARKET_TRENDS, YES_NO, labelFor } from './constants.js';

function optionsHtml(options, selected) {
  return `<option value="">—</option>` + options
    .map(o => `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`)
    .join('');
}

function liveFieldsHtml(idPrefix, atrNote) {
  return `
    <div class="live-price-row">
      <button type="button" class="btn-secondary" data-live-price="${idPrefix}">📡 Live Price</button>
      <span class="live-price-status" data-live-status="${idPrefix}"></span>
    </div>
  `;
}

function wireLivePrice(box, idPrefix, symbolInputName, priceInputName, peInputName) {
  const btn = box.querySelector(`[data-live-price="${idPrefix}"]`);
  const status = box.querySelector(`[data-live-status="${idPrefix}"]`);
  btn.addEventListener('click', async () => {
    const symbolInput = box.querySelector(`[name="${symbolInputName}"]`);
    const symbol = symbolInput.value.trim();
    if (!symbol) { status.textContent = 'הזן/י טיקר קודם'; return; }
    const { finnhubApiKey } = getSettings();
    if (!finnhubApiKey) { status.textContent = 'חסר מפתח Finnhub — הגדר/י בהגדרות'; return; }
    btn.disabled = true;
    status.textContent = 'טוען...';
    try {
      const data = await getLivePriceBundle(symbol, finnhubApiKey);
      box.querySelector(`[name="${priceInputName}"]`).value = data.price;
      if (peInputName && data.peRatio) box.querySelector(`[name="${peInputName}"]`).value = data.peRatio.toFixed(2);
      status.textContent = `מחיר: $${data.price} · P/E: ${data.peRatio ? data.peRatio.toFixed(1) : '—'} · ATR: אין ב-Finnhub החינמי, יש להזין ידנית`;
    } catch (err) {
      status.textContent = errorMessage(err);
    } finally {
      btn.disabled = false;
    }
  });
}

function addTradeFormHtml() {
  return `
    <h3>הוספת טרייד</h3>
    <form id="add-trade-form" class="form-grid">
      <label>טיקר
        <input type="text" name="symbol" required autocapitalize="characters" placeholder="לדוגמה: AAPL">
      </label>
      ${liveFieldsHtml('add')}
      <label>תאריך כניסה
        <input type="date" name="trade_date" required value="${new Date().toISOString().slice(0, 10)}">
      </label>
      <label>מחיר כניסה
        <input type="number" step="0.0001" name="entry_price" required>
      </label>
      <label>גודל פוזיציה ($) *חובה*
        <input type="number" step="0.01" name="position_size" required>
      </label>
      <label>רמת פיבונאצ'י
        <input type="text" name="fibonacci_level" placeholder="לדוגמה: 50">
      </label>
      <label>אחוז ירידה מהטופ (%)
        <input type="number" step="0.01" name="drop_from_top_pct">
      </label>
      <label>מצב רגשי
        <select name="emotion">${optionsHtml(EMOTIONS)}</select>
      </label>
      <label>סטופ לוס מתוכנן (%)
        <input type="number" step="0.01" name="planned_stop_loss_pct">
      </label>
      <label>מכפיל רווח P/E
        <input type="number" step="0.01" name="pe_ratio">
      </label>
      <label>ATR שבועי (ידני — לא זמין ב-Finnhub חינמי)
        <input type="number" step="0.01" name="weekly_atr">
      </label>
      <label>ATR יומי (ידני)
        <input type="number" step="0.01" name="daily_atr">
      </label>
      <label>איכות אזור ביקוש (1-3)
        <input type="number" min="1" max="3" name="demand_zone_quality">
      </label>
      <label>דירוג צורת עלייה (1-3)
        <input type="number" min="1" max="3" name="uphill_shape_rating">
      </label>
      <label>משך מגמת עלייה
        <select name="uphill_duration">${optionsHtml(UPHILL_DURATIONS)}</select>
      </label>
      <label>מבנה שוק
        <select name="market_structure">${optionsHtml(MARKET_STRUCTURES)}</select>
      </label>
      <label>מגמת שוק כללית
        <select name="market_trend">${optionsHtml(MARKET_TRENDS)}</select>
      </label>
      <label>צורת גרף
        <input type="text" name="chart_shape" placeholder="לדוגמה: breakout">
      </label>
      <label>עמידה בכללים שלי
        <select name="rule_followed">${optionsHtml(YES_NO)}</select>
      </label>
      <label>צילום מסך (קישור)
        <input type="url" name="screenshot" placeholder="https://...">
      </label>
      <button type="submit" class="btn-primary">שמור טרייד</button>
    </form>
  `;
}

function sellFormHtml(trade) {
  return `
    <h3>סגירת טרייד — ${trade.symbol}</h3>
    <form id="sell-trade-form" class="form-grid">
      <input type="hidden" name="symbol" value="${trade.symbol}">
      ${liveFieldsHtml('sell')}
      <label>מחיר יציאה
        <input type="number" step="0.0001" name="exit_price" required>
      </label>
      <label>תאריך יציאה
        <input type="date" name="exit_date" required value="${new Date().toISOString().slice(0, 10)}">
      </label>
      <label>הסטאפ עבד?
        <select name="setup_worked">${optionsHtml(YES_NO)}</select>
      </label>
      <button type="submit" class="btn-primary">סגור טרייד</button>
    </form>
  `;
}

export function openAddTradeModal(onSaved) {
  const box = openModal(addTradeFormHtml());
  wireLivePrice(box, 'add', 'symbol', 'entry_price', 'pe_ratio');
  box.querySelector('#add-trade-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const trade = {
      id: makeId(),
      symbol: fd.get('symbol').trim().toUpperCase(),
      trade_date: fd.get('trade_date'),
      entry_price: Number(fd.get('entry_price')),
      position_size: Number(fd.get('position_size')),
      fibonacci_level: fd.get('fibonacci_level') || null,
      drop_from_top_pct: fd.get('drop_from_top_pct') ? Number(fd.get('drop_from_top_pct')) : null,
      emotion: fd.get('emotion') || null,
      planned_stop_loss_pct: fd.get('planned_stop_loss_pct') ? Number(fd.get('planned_stop_loss_pct')) : null,
      pe_ratio: fd.get('pe_ratio') ? Number(fd.get('pe_ratio')) : null,
      weekly_atr: fd.get('weekly_atr') ? Number(fd.get('weekly_atr')) : null,
      daily_atr: fd.get('daily_atr') ? Number(fd.get('daily_atr')) : null,
      demand_zone_quality: fd.get('demand_zone_quality') ? Number(fd.get('demand_zone_quality')) : null,
      uphill_shape_rating: fd.get('uphill_shape_rating') ? Number(fd.get('uphill_shape_rating')) : null,
      uphill_duration: fd.get('uphill_duration') || null,
      market_structure: fd.get('market_structure') || null,
      market_trend: fd.get('market_trend') || null,
      chart_shape: fd.get('chart_shape') || null,
      rule_followed: fd.get('rule_followed') || null,
      screenshot: fd.get('screenshot') || null,
      exit_price: null,
      exit_date: null,
      setup_worked: null,
      created_at: new Date().toISOString(),
    };
    addTrade(trade);
    closeModal();
    onSaved();
  });
}

function openSellModal(trade, onSaved) {
  const box = openModal(sellFormHtml(trade));
  wireLivePrice(box, 'sell', 'symbol', 'exit_price', null);
  box.querySelector('#sell-trade-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    updateTrade(trade.id, {
      exit_price: Number(fd.get('exit_price')),
      exit_date: fd.get('exit_date'),
      setup_worked: fd.get('setup_worked') || null,
    });
    closeModal();
    onSaved();
  });
}

function tradeCardHtml(trade) {
  const pnlBadge = trade.status === 'closed'
    ? `<span class="badge ${trade.pnl >= 0 ? 'badge-positive' : 'badge-negative'}">${trade.pnl >= 0 ? '+' : ''}${trade.pnl_percent.toFixed(1)}%</span>`
    : `<span class="badge badge-open">פתוח</span>`;
  return `
    <div class="trade-card">
      <div class="trade-card-main">
        <div class="trade-symbol">${trade.symbol}</div>
        <div class="trade-meta">גודל פוזיציה: $${Number(trade.position_size).toFixed(0)} · כניסה: $${Number(trade.entry_price).toFixed(2)}</div>
        <div class="trade-meta">${trade.trade_date}${trade.emotion ? ' · ' + labelFor(EMOTIONS, trade.emotion) : ''}</div>
      </div>
      <div class="trade-card-side">
        ${pnlBadge}
        ${trade.status === 'open' ? `<button class="btn-sell" data-sell-id="${trade.id}">Sell</button>` : ''}
      </div>
    </div>
  `;
}

export function renderTradesTab(container) {
  let filter = 'open';

  function draw() {
    const trades = deriveAll(getTrades()).sort((a, b) => b.trade_date.localeCompare(a.trade_date));
    const filtered = trades.filter(t => t.status === filter);
    container.innerHTML = `
      <div class="tabs-row">
        <button class="chip ${filter === 'open' ? 'chip-active' : ''}" data-filter="open">פתוחים</button>
        <button class="chip ${filter === 'closed' ? 'chip-active' : ''}" data-filter="closed">סגורים</button>
      </div>
      <div class="trade-list">
        ${filtered.length ? filtered.map(tradeCardHtml).join('') : '<div class="empty-state">אין טריידים כאן עדיין</div>'}
      </div>
      <button id="add-trade-btn" class="fab">+ Add Trade</button>
    `;

    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => { filter = btn.dataset.filter; draw(); });
    });
    container.querySelectorAll('[data-sell-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const trade = trades.find(t => t.id === btn.dataset.sellId);
        openSellModal(trade, draw);
      });
    });
    container.querySelector('#add-trade-btn').addEventListener('click', () => openAddTradeModal(draw));
  }

  draw();
}
