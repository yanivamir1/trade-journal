export const EMOTIONS = [
  { value: 'fear_greed', label: 'פחד/חמדנות' },
  { value: 'calculated', label: 'מחושב' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'mild_fomo', label: 'FOMO קל' },
];

export const UPHILL_DURATIONS = [
  { value: '1_year', label: 'שנה' },
  { value: '2_years', label: 'שנתיים' },
  { value: '3_years', label: '3 שנים' },
  { value: 'longer', label: 'יותר' },
];

export const MARKET_STRUCTURES = [
  { value: 'clear_uptrend', label: 'מגמת עלייה ברורה' },
  { value: 'uptrend_retest', label: 'עלייה עם רה-טסט' },
  { value: 'uptrend_big_correction', label: 'עלייה עם תיקון גדול' },
  { value: 'sideways', label: 'דשדוש' },
  { value: 'downtrend', label: 'מגמת ירידה' },
];

export const MARKET_TRENDS = [
  { value: 'uptrend', label: 'עולה' },
  { value: 'downtrend', label: 'יורד' },
  { value: 'sideways', label: 'דשדוש' },
];

export const YES_NO = [
  { value: 'yes', label: 'כן' },
  { value: 'no', label: 'לא' },
];

export function labelFor(options, value) {
  const found = options.find(o => o.value === value);
  return found ? found.label : value;
}
