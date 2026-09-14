import { getTrades } from './storage.js';
import { overviewStats, breakdownBy, breakdownByPositionSize, breakdownByStopLoss, breakdownByDropFromTop, setupWorkedAccuracy } from './stats.js';
import { renderBarList, renderLineChart } from './charts.js';
import { computeAdjustedSeries } from './portfolio.js';
import { EMOTIONS, MARKET_STRUCTURES, MARKET_TRENDS, labelFor } from './constants.js';

function section(title, id, hint) {
  return `
    <div class="panel">
      <h3>${title}</h3>
      ${hint ? `<p class="hint">${hint}</p>` : ''}
      <div id="${id}"></div>
    </div>
  `;
}

function toBarData(breakdown, labelFn) {
  return breakdown.map(b => ({
    group: labelFn ? labelFn(b.group) : b.group,
    value: b.avgPnlPercent,
    sublabel: `${b.count} טריידים · win-rate ${b.winRate.toFixed(0)}%`,
  }));
}

export function renderStatsTab(container) {
  const trades = getTrades();
  const overview = overviewStats(trades);
  const accuracy = setupWorkedAccuracy(trades);

  container.innerHTML = `
    <div class="summary-row">
      <div class="summary-card"><div class="summary-label">סה"כ טריידים</div><div class="summary-value">${overview.totalTrades}</div></div>
      <div class="summary-card"><div class="summary-label">win-rate כללי</div><div class="summary-value">${overview.winRate !== null ? overview.winRate.toFixed(0) + '%' : '—'}</div></div>
      <div class="summary-card"><div class="summary-label">P&L כולל</div><div class="summary-value">$${overview.totalPnl.toFixed(0)}</div></div>
      <div class="summary-card"><div class="summary-label">פתוחים / סגורים</div><div class="summary-value"><span class="ltr-num">${overview.openCount} / ${overview.closedCount}</span></div></div>
    </div>

    ${section('עקומת שווי תיק', 'chart-portfolio')}
    ${section('הצלחה לפי רמת פיבונאצ\'י', 'chart-fib', 'ממוצע P&L% לכל רמת כניסה')}
    ${section('הצלחה לפי מיקום סטופ לוס', 'chart-stop', 'נמוך/בינוני/גבוה = שליש התחתון/אמצעי/עליון מבין כל הטריידים שלך')}
    ${section('הצלחה לפי גודל פוזיציה', 'chart-size', 'האם לקחת מספיק או יותר מדי, לפי שליש התחתון/אמצעי/עליון')}
    ${section('הצלחה לפי מצב רגשי', 'chart-emotion')}
    ${section('הצלחה לפי עמידה בכללים', 'chart-rules')}
    ${section('הצלחה לפי אחוז ירידה מהטופ', 'chart-drop')}
    ${section('הצלחה לפי מבנה שוק', 'chart-structure')}
    ${section('הצלחה לפי מגמת שוק כללית', 'chart-trend')}
    ${accuracy !== null ? section('דיוק ההערכה העצמית (setup_worked)', 'chart-accuracy', `כמה פעמים ההערכה שלך אם ה"סטאפ עבד" תאמה בפועל לתוצאה: ${accuracy.toFixed(0)}%`) : ''}
  `;

  const portfolioSeries = computeAdjustedSeries();
  renderLineChart(container.querySelector('#chart-portfolio'), portfolioSeries.map(s => ({ x: s.date.slice(5), y: s.adjustedValue })));

  renderBarList(container.querySelector('#chart-fib'), toBarData(breakdownBy(trades, 'fibonacci_level')));
  renderBarList(container.querySelector('#chart-stop'), toBarData(breakdownByStopLoss(trades)));
  renderBarList(container.querySelector('#chart-size'), toBarData(breakdownByPositionSize(trades)));
  renderBarList(container.querySelector('#chart-emotion'), toBarData(breakdownBy(trades, 'emotion'), v => labelFor(EMOTIONS, v)));
  renderBarList(container.querySelector('#chart-rules'), toBarData(breakdownBy(trades, 'rule_followed'), v => v === 'yes' ? 'עמד בכללים' : 'לא עמד בכללים'));
  renderBarList(container.querySelector('#chart-drop'), toBarData(breakdownByDropFromTop(trades)));
  renderBarList(container.querySelector('#chart-structure'), toBarData(breakdownBy(trades, 'market_structure'), v => labelFor(MARKET_STRUCTURES, v)));
  renderBarList(container.querySelector('#chart-trend'), toBarData(breakdownBy(trades, 'market_trend'), v => labelFor(MARKET_TRENDS, v)));
}
