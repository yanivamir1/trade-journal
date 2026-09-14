// מבוסס על STOCK-PRICE-FEATURE.md (getStockPrice) + הרחבה ל-P/E דרך /stock/metric.
// ATR אינו זמין בתוכנית Finnhub החינמית (candle/indicator endpoints חסומים) —
// נבדק בפועל ב-14.9.26. לכן weeklyAtr/dailyAtr תמיד null כאן; המשתמש ממלא ידנית.

const BASE = 'https://finnhub.io/api/v1';

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw { code: 'network' };
  }
  if (res.status === 401) throw { code: 'invalid_key' };
  if (res.status === 429) throw { code: 'rate_limited' };
  if (!res.ok) throw { code: 'server_error' };
  return res.json();
}

export async function getQuote(ticker, apiKey) {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) throw { code: 'empty' };
  const data = await fetchJson(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`);
  if (!data.c || data.c === 0) throw { code: 'not_found', symbol };
  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    open: data.o,
    high: data.h,
    low: data.l,
    previousClose: data.pc,
    updatedAt: new Date(data.t * 1000),
  };
}

export async function getPE(ticker, apiKey) {
  const symbol = ticker.trim().toUpperCase();
  const data = await fetchJson(`${BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`);
  const m = data.metric || {};
  const pe = m.peTTM ?? m.peExclExtraTTM ?? m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? null;
  return pe;
}

// weeklyAtr/dailyAtr נשארים null בכוונה — ראו הערה למעלה.
export async function getLivePriceBundle(ticker, apiKey) {
  const [quote, pe] = await Promise.all([
    getQuote(ticker, apiKey),
    getPE(ticker, apiKey).catch(() => null),
  ]);
  return {
    ...quote,
    peRatio: pe,
    weeklyAtr: null,
    dailyAtr: null,
    atrAvailable: false,
  };
}

export function errorMessage(err) {
  const messages = {
    empty: '',
    not_found: `No stock found for ${err.symbol || ''}`,
    invalid_key: 'Invalid API key',
    rate_limited: 'Too many requests, try again shortly',
    network: 'No internet connection',
    server_error: 'Server error, try again',
  };
  return messages[err.code] || 'Unknown error';
}
