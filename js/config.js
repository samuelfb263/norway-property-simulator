// Norwegian tax system constants (2026)
export const TAX_RATE = 0.22;
export const WEALTH_TAX_RATE_TIER1 = 0.01;
export const WEALTH_TAX_RATE_TIER2 = 0.011;
export const WEALTH_BUNNFRADRAG_COUPLE = 3.8;
export const WEALTH_TIER2_COUPLE = 21.5 * 2;
export const PRIM_VALUATION_THRESHOLD = 10;
export const PRIM_VALUATION_RATE_LOW = 0.25;
export const PRIM_VALUATION_RATE_HIGH = 0.70;
export const SEK_VALUATION_FACTOR = 1.0;
export const AKSJEFOND_RABATT_FACTOR = 0.80;
export const DOKUMENTAVGIFT_RATE = 0.025;
export const DEBT_TO_INCOME_MULTIPLIER = 5;
export const OSLO_MAX_LTV = 0.60;
export const WEEKS_PER_YEAR = 52;
export const FALLBACK_FX_RATE = 1.85;
export const DEBT_RATIO_WARN_THRESHOLD = 0.92;
export const MONTHLY_CF_NEUTRAL_THRESHOLD = 0.003;
export const LOW_RETURN_THRESHOLD = 4;

export const FX_API_PRIMARY = 'https://api.frankfurter.app/latest?from=BRL&to=NOK';
export const FX_API_FALLBACK = 'https://open.er-api.com/v6/latest/BRL';
