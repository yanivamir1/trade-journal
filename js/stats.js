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

// A trade added to more than once (averaging in) carries one "lot" per buy-in,
// each with its own price/size and the fibonacci/emotion/etc. decision made at
// that time. Trades saved before this feature (or imported legacy trades) have
// no `lots` array — treat them as a single implicit lot from their top-level fields.
export function tradeLots(trade) {
  if (Array.isArray(trade.lots) && trade.lots.length) return trade.lots;
  return [{
    date: trade.trade_date,
    price: trade.entry_price,
    size: trade.position_size,
    fibonacci_level: trade.fibonacci_level,
    drop_from_top_pct: trade.drop_from_top_pct,
    emotion: trade.emotion,
    planned_stop_loss_pct: trade.planned_stop_loss_pct,
    pe_ratio: trade.pe_ratio,
    weekly_atr: trade.weekly_atr,
    daily_atr: trade.daily_atr,
    demand_zone_quality: trade.demand_zone_quality,
    uphill_shape_rating: trade.uphill_shape_rating,
    uphill_duration: trade.uphill_duration,
    market_structure: trade.market_structure,
    market_trend: trade.market_trend,
    chart_shape: trade.chart_shape,
    rule_followed: trade.rule_followed,
  }];
}

// One entry per lot/buy-in, each carrying its own entry price and decision
// fields, with P&L computed against the trade's (shared) exit price. This is
// what the "success by ..." breakdowns group by, so averaging two buy-ins made
// under different fibonacci levels/emotions into one blended price doesn't
// blur which decision actually worked.
export function deriveTradeLegs(trade) {
  const hasExit = trade.exit_price !== null && trade.exit_price !== undefined && trade.exit_price !== '';
  const status = hasExit ? 'closed' : 'open';
  return tradeLots(trade).map((lot) => {
    let pnlPercent = null;
    let pnl = null;
    if (hasExit && lot.price) {
      pnlPercent = ((trade.exit_price - lot.price) / lot.price) * 100;
      pnl = (lot.size * pnlPercent) / 100;
    }
    return {
      ...trade,
      ...lot,
      entry_price: lot.price,
      position_size: lot.size,
      trade_date: lot.date || trade.trade_date,
      status,
      pnl,
      pnl_percent: pnlPercent,
    };
  });
}

export function deriveAllLegs(trades) {
  return trades.flatMap(deriveTradeLegs);
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
  if (nums.length < 3) return () => 'All';
  const t1 = nums[Math.floor(nums.length / 3)];
  const t2 = nums[Math.floor((2 * nums.length) / 3)];
  return (v) => {
    if (v === null || v === undefined) return null;
    if (v <= t1) return 'Low';
    if (v <= t2) return 'Medium';
    return 'High';
  };
}

// מקבץ לפי שדה (או פונקציית bucket) ברמת ה-lot/buy-in, ומחשב win-rate/P&L ממוצע לכל קבוצה.
export function breakdownBy(trades, fieldOrFn) {
  const closed = deriveAllLegs(trades).filter(t => t.status === 'closed');
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
  const closed = deriveAllLegs(trades).filter(t => t.status === 'closed');
  const bucket = tertileBucketer(closed.map(t => t.position_size));
  return breakdownBy(trades, (t) => bucket(t.position_size));
}

export function breakdownByStopLoss(trades) {
  const closed = deriveAllLegs(trades).filter(t => t.status === 'closed');
  const bucket = tertileBucketer(closed.map(t => t.planned_stop_loss_pct));
  return breakdownBy(trades, (t) => bucket(t.planned_stop_loss_pct));
}

export function breakdownByDropFromTop(trades) {
  const closed = deriveAllLegs(trades).filter(t => t.status === 'closed');
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
