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
    sublabel: `${b.count} trades · win-rate ${b.winRate.toFixed(0)}%`,
  }));
}

export function renderStatsTab(container) {
  const trades = getTrades();
  const overview = overviewStats(trades);
  const accuracy = setupWorkedAccuracy(trades);

  container.innerHTML = `
    <div class="summary-row">
      <div class="summary-card"><div class="summary-label">Total Trades</div><div class="summary-value">${overview.totalTrades}</div></div>
      <div class="summary-card"><div class="summary-label">Overall Win Rate</div><div class="summary-value">${overview.winRate !== null ? overview.winRate.toFixed(0) + '%' : '—'}</div></div>
      <div class="summary-card"><div class="summary-label">Total P&L</div><div class="summary-value">$${overview.totalPnl.toFixed(0)}</div></div>
      <div class="summary-card"><div class="summary-label">Open / Closed</div><div class="summary-value">${overview.openCount} / ${overview.closedCount}</div></div>
    </div>

    ${section('Portfolio Value Curve', 'chart-portfolio')}
    ${section("Success by Fibonacci Level", 'chart-fib', 'Average P&L% for each entry level')}
    ${section('Success by Stop Loss Placement', 'chart-stop', 'Low/Medium/High = bottom/middle/top third among all your trades')}
    ${section('Success by Position Size', 'chart-size', 'Whether you sized in enough or too much, by bottom/middle/top third')}
    ${section('Success by Emotional State', 'chart-emotion')}
    ${section('Success by Rule-Following', 'chart-rules')}
    ${section('Success by Drop From Top', 'chart-drop')}
    ${section('Success by Market Structure', 'chart-structure')}
    ${section('Success by Overall Market Trend', 'chart-trend')}
    ${accuracy !== null ? section('Self-Assessment Accuracy (setup worked)', 'chart-accuracy', `How often your call on whether "the setup worked" matched the actual outcome: ${accuracy.toFixed(0)}%`) : ''}
  `;

  const portfolioSeries = computeAdjustedSeries();
  renderLineChart(container.querySelector('#chart-portfolio'), portfolioSeries.map(s => ({ x: s.date.slice(5), y: s.adjustedValue })));

  renderBarList(container.querySelector('#chart-fib'), toBarData(breakdownBy(trades, 'fibonacci_level')));
  renderBarList(container.querySelector('#chart-stop'), toBarData(breakdownByStopLoss(trades)));
  renderBarList(container.querySelector('#chart-size'), toBarData(breakdownByPositionSize(trades)));
  renderBarList(container.querySelector('#chart-emotion'), toBarData(breakdownBy(trades, 'emotion'), v => labelFor(EMOTIONS, v)));
  renderBarList(container.querySelector('#chart-rules'), toBarData(breakdownBy(trades, 'rule_followed'), v => v === 'yes' ? 'Followed rules' : 'Broke rules'));
  renderBarList(container.querySelector('#chart-drop'), toBarData(breakdownByDropFromTop(trades)));
  renderBarList(container.querySelector('#chart-structure'), toBarData(breakdownBy(trades, 'market_structure'), v => labelFor(MARKET_STRUCTURES, v)));
  renderBarList(container.querySelector('#chart-trend'), toBarData(breakdownBy(trades, 'market_trend'), v => labelFor(MARKET_TRENDS, v)));
}
