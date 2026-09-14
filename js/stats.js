export function deriveTrade(trade) {
  const hasExit = trade.exit_price !== null && trade.exit_price !== undefined && trade.exit_price !== '';
  const status = hasExit ? 'closed' : 'open';
  let pnlPercent = null;
  let pnl = null;
  if (hasExit && trade.entry_price) {
    pnlPercent = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100;
    pnl = (trade.position_size * pnlPercent) / 100;
  }
  return { ...trade, status, pnl, pnl_percent: pnlPercent };
}

export function deriveAll(trades) {
  return trades.map(deriveTrade);
}

export function overviewStats(trades) {
  const derived = deriveAll(trades);
  const closed = derived.filter(t => t.status === 'closed');
  const open = derived.filter(t => t.status === 'open');
  const wins = closed.filter(t => t.pnl > 0);
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
  return {
    totalTrades: derived.length,
    openCount: open.length,
    closedCount: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    totalPnl,
  };
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tertileBucketer(values) {
  const nums = values.filter(v => typeof v === 'number').sort((a, b) => a - b);
  if (nums.length < 3) return () => 'הכל';
  const t1 = nums[Math.floor(nums.length / 3)];
  const t2 = nums[Math.floor((2 * nums.length) / 3)];
  return (v) => {
    if (v === null || v === undefined) return null;
    if (v <= t1) return 'נמוך';
    if (v <= t2) return 'בינוני';
    return 'גבוה';
  };
}

// מקבץ טריידים סגורים לפי שדה (או פונקציית bucket), ומחשב win-rate/P&L ממוצע לכל קבוצה.
export function breakdownBy(trades, fieldOrFn) {
  const closed = deriveAll(trades).filter(t => t.status === 'closed');
  const getKey = typeof fieldOrFn === 'function' ? fieldOrFn : (t) => t[fieldOrFn];
  const groups = new Map();
  for (const t of closed) {
    const key = getKey(t);
    if (key === null || key === undefined || key === '') continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const result = [];
  for (const [key, group] of groups) {
    const wins = group.filter(t => t.pnl > 0);
    const avgPnlPercent = group.reduce((s, t) => s + (t.pnl_percent || 0), 0) / group.length;
    result.push({
      group: String(key),
      count: group.length,
      winRate: (wins.length / group.length) * 100,
      avgPnlPercent,
      totalPnl: group.reduce((s, t) => s + (t.pnl || 0), 0),
    });
  }
  result.sort((a, b) => b.count - a.count);
  return result;
}

export function breakdownByPositionSize(trades) {
  const closed = deriveAll(trades).filter(t => t.status === 'closed');
  const bucket = tertileBucketer(closed.map(t => t.position_size));
  return breakdownBy(trades, (t) => bucket(t.position_size));
}

export function breakdownByStopLoss(trades) {
  const closed = deriveAll(trades).filter(t => t.status === 'closed');
  const bucket = tertileBucketer(closed.map(t => t.planned_stop_loss_pct));
  return breakdownBy(trades, (t) => bucket(t.planned_stop_loss_pct));
}

export function breakdownByDropFromTop(trades) {
  const closed = deriveAll(trades).filter(t => t.status === 'closed');
  const bucket = tertileBucketer(closed.map(t => t.drop_from_top_pct));
  return breakdownBy(trades, (t) => bucket(t.drop_from_top_pct));
}

export function setupWorkedAccuracy(trades) {
  const closed = deriveAll(trades).filter(t => t.status === 'closed' && t.setup_worked);
  if (!closed.length) return null;
  const correct = closed.filter(t => (t.setup_worked === 'yes') === (t.pnl > 0));
  return (correct.length / closed.length) * 100;
}

export const medianOf = median;
