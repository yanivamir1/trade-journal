export const FIBONACCI_LEVELS = [
  { value: '30', label: '30' },
  { value: '50', label: '50' },
  { value: '60', label: '60' },
  { value: '70', label: '70' },
];

export const EMOTIONS = [
  { value: 'fear_greed', label: 'Fear/Greed' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'mild_fomo', label: 'Mild FOMO' },
];

export const UPHILL_DURATIONS = [
  { value: '1_year', label: '1 year' },
  { value: '2_years', label: '2 years' },
  { value: '3_years', label: '3 years' },
  { value: 'longer', label: 'Longer' },
];

export const MARKET_STRUCTURES = [
  { value: 'clear_uptrend', label: 'Clear uptrend' },
  { value: 'uptrend_retest', label: 'Uptrend with retest' },
  { value: 'uptrend_big_correction', label: 'Uptrend with big correction' },
  { value: 'sideways', label: 'Sideways' },
  { value: 'downtrend', label: 'Downtrend' },
];

export const MARKET_TRENDS = [
  { value: 'uptrend', label: 'Uptrend' },
  { value: 'downtrend', label: 'Downtrend' },
  { value: 'sideways', label: 'Sideways' },
];

export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function labelFor(options, value) {
  const found = options.find(o => o.value === value);
  return found ? found.label : value;
}
