import {
  TAX_RATE,
  WEALTH_TAX_RATE_TIER1,
  WEALTH_TAX_RATE_TIER2,
  WEALTH_BUNNFRADRAG_COUPLE,
  WEALTH_BUNNFRADRAG_SINGLE,
  WEALTH_TIER2_COUPLE,
  WEALTH_TIER2_SINGLE,
  PRIM_VALUATION_THRESHOLD,
  PRIM_VALUATION_RATE_LOW,
  PRIM_VALUATION_RATE_HIGH,
  SEK_VALUATION_FACTOR,
  AKSJEFOND_RABATT_FACTOR,
  DOKUMENTAVGIFT_RATE,
  DEBT_TO_INCOME_MULTIPLIER,
  OSLO_MAX_LTV,
  WEEKS_PER_YEAR,
  DEBT_RATIO_WARN_THRESHOLD,
  MONTHLY_CF_NEUTRAL_THRESHOLD,
  LOW_RETURN_THRESHOLD,
  AGENT_FEE_RATE,
  ACQUISITION_COST_RATE
} from './config.js';
import { t, fmt, fmtSign, pct } from './i18n.js';

/**
 * Build annuity loan amortization schedule.
 */
export function buildAmortSchedule(principal, annualRate, paymentYears, horizonYears) {
  if (!Number.isFinite(principal) || principal <= 0 || paymentYears <= 0) {
    return { schedule: [], monthlyPayment: 0 };
  }
  const monthlyRate = annualRate / 12;
  const totalMonths = paymentYears * 12;
  const monthlyPayment = annualRate > 0
    ? principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -totalMonths)))
    : principal / totalMonths;
  const schedule = [];
  let balance = principal;
  for (let y = 1; y <= horizonYears; y++) {
    const balanceStart = balance;
    let yI = 0, yP = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0.0001) break;
      const i = balance * monthlyRate;
      const p = Math.min(balance, monthlyPayment - i);
      yI += i; yP += p;
      balance -= p;
    }
    schedule.push({ year: y, balanceStart, interestPaid: yI, principalPaid: yP, balanceEnd: balance });
  }
  return { schedule, monthlyPayment };
}

function bunnfradragFor(civilStatus) {
  return civilStatus === 'single' ? WEALTH_BUNNFRADRAG_SINGLE : WEALTH_BUNNFRADRAG_COUPLE;
}
function tier2CapFor(civilStatus) {
  return civilStatus === 'single' ? WEALTH_TIER2_SINGLE : WEALTH_TIER2_COUPLE;
}

function computeWealthTax(taxableWealth, civilStatus) {
  if (taxableWealth <= 0) return 0;
  const tier1Cap = tier2CapFor(civilStatus) - bunnfradragFor(civilStatus);
  if (taxableWealth <= tier1Cap) return taxableWealth * WEALTH_TAX_RATE_TIER1;
  return tier1Cap * WEALTH_TAX_RATE_TIER1 + (taxableWealth - tier1Cap) * WEALTH_TAX_RATE_TIER2;
}

/**
 * Validate inputs and return warnings/errors (no throw).
 */
export function validateInputs(p) {
  const errors = [];
  const warnings = [];
  if (p.primDebt > p.primVal) errors.push('val_primDebt_exceeds');
  if (p.ltv > 0.85) warnings.push('val_ltv_high');
  if (p.rate < 0.02 || p.rate > 0.12) warnings.push('val_rate_unusual');
  if (p.secVal > 0 && (p.rent * 12) / p.secVal > 0.10) warnings.push('val_yield_high');
  if (p.years > p.loanTerm) warnings.push('val_years_gt_term');
  if (p.osloMode && p.ltv > OSLO_MAX_LTV) warnings.push('val_oslo_ltv');
  return { errors, warnings };
}

/**
 * Core financial computation. Pure function — no DOM access.
 */
export function compute(params) {
  const {
    primVal, primDebt, income, otherAssets, secVal, ltv, rate, loanTerm,
    rent, opex, ownUse, years, appreciation, propType, assetType, osloMode,
    fxRate, brlAmount, iof, spread,
    residency = 'resident',
    civilStatus = 'couple',
    agentFeeRate = AGENT_FEE_RATE,
    acquisitionCostRate = ACQUISITION_COST_RATE
  } = params;

  const isNonResident = residency === 'nonResident';

  const secDebt = secVal * ltv;
  const downPayment = secVal * (1 - ltv);
  const stamp = propType === 'selveier' ? secVal * DOKUMENTAVGIFT_RATE : 0;
  const acquisitionCosts = secVal * acquisitionCostRate;
  const equityNeeded = downPayment + stamp + acquisitionCosts;
  const totalDebt = primDebt + secDebt;
  const debtLimit = income * DEBT_TO_INCOME_MULTIPLIER;
  const debtRoom = debtLimit - primDebt;

  const primBaseLow = Math.min(primVal, PRIM_VALUATION_THRESHOLD) * PRIM_VALUATION_RATE_LOW;
  const primBaseHigh = Math.max(0, primVal - PRIM_VALUATION_THRESHOLD) * PRIM_VALUATION_RATE_HIGH;
  const primBase = primBaseLow + primBaseHigh;
  const secBase = secVal * SEK_VALUATION_FACTOR;
  const otherFactor = assetType === 'fund' ? AKSJEFOND_RABATT_FACTOR : 1.0;
  const otherBase = otherAssets * otherFactor;

  const bunnfradrag = bunnfradragFor(civilStatus);

  let grossWealth, netWealth, taxableWealth, wealthTax;
  let grossWealthNoSec, netWealthNoSec, taxableNoSec, wealthTaxNoSec;

  if (isNonResident) {
    // Non-residents are only taxed on Norway-situated real estate net of NO debt.
    // Primary home + other (global) assets are excluded from NO wealth base.
    grossWealth = secBase;
    netWealth = grossWealth - secDebt;
    taxableWealth = Math.max(0, netWealth - bunnfradrag);
    wealthTax = computeWealthTax(taxableWealth, civilStatus);
    grossWealthNoSec = 0;
    netWealthNoSec = 0;
    taxableNoSec = 0;
    wealthTaxNoSec = 0;
  } else {
    grossWealth = primBase + secBase + otherBase;
    netWealth = grossWealth - totalDebt;
    taxableWealth = Math.max(0, netWealth - bunnfradrag);
    wealthTax = computeWealthTax(taxableWealth, civilStatus);
    grossWealthNoSec = primBase + otherBase;
    netWealthNoSec = grossWealthNoSec - primDebt;
    taxableNoSec = Math.max(0, netWealthNoSec - bunnfradrag);
    wealthTaxNoSec = computeWealthTax(taxableNoSec, civilStatus);
  }
  const wealthTaxDelta = wealthTax - wealthTaxNoSec;

  const rentWeeks = WEEKS_PER_YEAR - ownUse;
  const rentFraction = rentWeeks / WEEKS_PER_YEAR;
  const grossRent = rent * 12 * rentFraction;
  const deductibleOpex = opex * rentFraction;

  const amort = buildAmortSchedule(secDebt, rate, loanTerm, years);
  const yearOne = amort.schedule[0] || { interestPaid: 0, principalPaid: 0, balanceEnd: secDebt };
  const annualInterest = yearOne.interestPaid;
  const annualPrincipal = yearOne.principalPaid;
  const monthlyPayment = amort.monthlyPayment;
  const remainingDebt = amort.schedule.length > 0 ? amort.schedule[amort.schedule.length - 1].balanceEnd : secDebt;

  const taxableProfitOrLossY1 = grossRent - annualInterest - deductibleOpex;
  const rentalTaxY1 = taxableProfitOrLossY1 * TAX_RATE;
  const netCashflow = grossRent - annualInterest - opex - rentalTaxY1;
  const cashflowAfterPrincipal = netCashflow - annualPrincipal;
  const grossYield = secVal > 0 ? grossRent / secVal * 100 : 0;
  const netYield = secVal > 0 ? netCashflow / secVal * 100 : 0;

  let totalRentalIncome = 0;
  let totalInterestPaid = 0;
  let totalRentalTax = 0;
  for (const yr of amort.schedule) {
    const profit = grossRent - yr.interestPaid - deductibleOpex;
    const tax = profit * TAX_RATE;
    const cf = grossRent - yr.interestPaid - opex - tax;
    totalRentalIncome += cf;
    totalInterestPaid += yr.interestPaid;
    totalRentalTax += tax;
  }

  const futureVal = secVal * Math.pow(1 + appreciation, years);
  const costBase = secVal + stamp + acquisitionCosts;
  const gain = futureVal - costBase;
  const cgt = gain > 0 ? gain * TAX_RATE : 0;
  const agentFee = futureVal * agentFeeRate;
  const netProceeds = futureVal - remainingDebt - cgt - agentFee;
  const totalReturn = netProceeds - equityNeeded + totalRentalIncome;
  const annualizedReturn = equityNeeded > 0
    ? (Math.pow(Math.max(0.001, (equityNeeded + totalReturn)) / equityNeeded, 1 / years) - 1) * 100 : 0;

  let breakEvenAppr = null;
  {
    const f = (a) => {
      const fv = secVal * Math.pow(1 + a, years);
      const g = fv - costBase;
      const c2 = g > 0 ? g * TAX_RATE : 0;
      const af = fv * agentFeeRate;
      const np = fv - remainingDebt - c2 - af;
      return np - equityNeeded + totalRentalIncome;
    };
    let lo = -0.10, hi = 0.30;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    breakEvenAppr = (lo + hi) / 2;
  }

  const brlGross = brlAmount * 1000;
  const brlAfterCosts = brlGross * (1 - iof - spread);
  const nokReceived = fxRate ? brlAfterCosts * fxRate : 0;
  const nokReceivedMnok = nokReceived / 1_000_000;
  const totalCostBrl = brlGross - brlAfterCosts;

  const debtOk = totalDebt <= debtLimit;
  const ltvWarning = osloMode && ltv > OSLO_MAX_LTV;

  return {
    primVal, primDebt, income, otherAssets, secVal, ltv, rate, loanTerm, rent, opex, ownUse, years, appreciation,
    residency, civilStatus, isNonResident, bunnfradrag,
    secDebt, downPayment, stamp, acquisitionCosts, equityNeeded, totalDebt, debtLimit, debtRoom,
    primBaseLow, primBaseHigh, primBase, secBase, otherBase, otherFactor,
    grossWealth, netWealth, taxableWealth, wealthTax, wealthTaxNoSec, wealthTaxDelta,
    rentWeeks, rentFraction, grossRent, annualInterest, deductibleOpex,
    taxableRental: Math.max(0, taxableProfitOrLossY1), taxableProfitOrLossY1, rentalTax: rentalTaxY1,
    netCashflow, annualPrincipal, cashflowAfterPrincipal, grossYield, netYield,
    monthlyPayment, schedule: amort.schedule, totalInterestPaid, totalRentalTax,
    futureVal, costBase, gain, cgt, agentFee, agentFeeRate, acquisitionCostRate,
    remainingDebt, netProceeds, totalRentalIncome, totalReturn, annualizedReturn,
    debtOk, ltvWarning, breakEvenAppr,
    brlGross, brlAfterCosts, nokReceived, nokReceivedMnok, totalCostBrl, iof, spread,
    THRESHOLD_COUPLE: WEALTH_BUNNFRADRAG_COUPLE,
    propType, assetType, osloMode, fxRate
  };
}

export function recomputeScenario(base, override) {
  const rate = override.rate ?? base.rate;
  const appr = override.appr ?? base.appreciation;
  const vacExtra = override.vacWeeks ?? 0;
  const apprDrop = override.dropAtSale ?? 0;
  const rentWeeks = Math.max(0, WEEKS_PER_YEAR - base.ownUse - vacExtra);
  const rentFraction = rentWeeks / WEEKS_PER_YEAR;
  const grossRent = base.rent * 12 * rentFraction;
  const deductibleOpex = base.opex * rentFraction;

  const am = buildAmortSchedule(base.secDebt, rate, base.loanTerm, base.years);
  let totalRental = 0;
  for (const yr of am.schedule) {
    const profit = grossRent - yr.interestPaid - deductibleOpex;
    const tax = profit * TAX_RATE;
    totalRental += grossRent - yr.interestPaid - base.opex - tax;
  }
  const remaining = am.schedule.length > 0 ? am.schedule[am.schedule.length - 1].balanceEnd : base.secDebt;
  const yearOneCf = am.schedule[0]
    ? grossRent - am.schedule[0].interestPaid - base.opex - (grossRent - am.schedule[0].interestPaid - deductibleOpex) * TAX_RATE
    : 0;
  let futureVal = base.secVal * Math.pow(1 + appr, base.years);
  futureVal *= (1 + apprDrop);
  const gain = futureVal - base.costBase;
  const cgt = gain > 0 ? gain * TAX_RATE : 0;
  const agentFee = futureVal * (base.agentFeeRate ?? AGENT_FEE_RATE);
  const np = futureVal - remaining - cgt - agentFee;
  const totalReturn = np - base.equityNeeded + totalRental;
  const ann = base.equityNeeded > 0
    ? (Math.pow(Math.max(0.001, base.equityNeeded + totalReturn) / base.equityNeeded, 1 / base.years) - 1) * 100 : 0;
  return { netCf: yearOneCf, totalReturn, ann };
}

export function buildVerdict(c) {
  const items = [];
  let level = 'good';
  const escalate = (l) => {
    if (l === 'bad') level = 'bad';
    else if (l === 'warn' && level === 'good') level = 'warn';
  };

  if (!c.debtOk) {
    escalate('bad');
    items.push({ lv: 'bad', html: t('vd_debt_no').replace('{d}', fmt(c.totalDebt)).replace('{l}', fmt(c.debtLimit)) });
  } else if (c.totalDebt / c.debtLimit > DEBT_RATIO_WARN_THRESHOLD) {
    escalate('warn');
    items.push({ lv: 'warn', html: t('vd_debt_tight').replace('{d}', fmt(c.totalDebt)).replace('{l}', fmt(c.debtLimit)) });
  } else {
    items.push({ lv: 'good', html: t('vd_debt_ok').replace('{r}', fmt(c.debtRoom - c.secDebt)) });
  }

  if (c.ltvWarning) {
    escalate('warn');
    items.push({ lv: 'warn', html: t('vd_oslo') });
  }

  const monthlyCf = c.netCashflow / 12;
  if (monthlyCf > MONTHLY_CF_NEUTRAL_THRESHOLD) {
    items.push({ lv: 'good', html: t('vd_cf_positive').replace('{cf}', fmt(monthlyCf)).replace('{y}', pct(c.netYield)) });
  } else if (Math.abs(monthlyCf) <= MONTHLY_CF_NEUTRAL_THRESHOLD) {
    items.push({ lv: 'warn', html: t('vd_cf_neutral').replace('{cf}', fmtSign(monthlyCf)) });
  } else {
    escalate('warn');
    items.push({ lv: 'warn', html: t('vd_cf_negative').replace('{cf}', fmtSign(monthlyCf)).replace('{ann}', fmt(Math.abs(c.netCashflow))) });
  }

  if (c.wealthTaxDelta < 0.005) {
    items.push({ lv: 'good', html: t('vd_wealth_zero') });
  } else {
    items.push({ lv: 'warn', html: t('vd_wealth_some').replace('{wt}', fmt(c.wealthTaxDelta)) });
  }

  if (c.totalReturn < 0) {
    escalate('bad');
    items.push({ lv: 'bad', html: t('vd_return_neg').replace('{r}', fmt(c.totalReturn)).replace('{y}', c.years) });
  } else if (c.annualizedReturn < LOW_RETURN_THRESHOLD) {
    escalate('warn');
    items.push({ lv: 'warn', html: t('vd_return_low').replace('{a}', pct(c.annualizedReturn)) });
  } else {
    items.push({ lv: 'good', html: t('vd_return_ok').replace('{a}', pct(c.annualizedReturn)).replace('{r}', fmt(c.totalReturn)).replace('{y}', c.years).replace('{e}', fmt(c.equityNeeded)) });
  }

  items.push({ lv: 'good', html: t('vd_breakeven').replace('{b}', pct(c.breakEvenAppr * 100)) });

  return { level, items };
}
