import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAmortSchedule, compute, recomputeScenario } from '../js/compute.js';

const defaultParams = {
  primVal: 6.4, primDebt: 5.3, income: 2.1, otherAssets: 0.8,
  secVal: 5.0, ltv: 0.80, rate: 0.05, loanTerm: 25,
  rent: 0.018, opex: 0.060, ownUse: 0, years: 10, appreciation: 0.03,
  propType: 'selveier', assetType: 'cash', osloMode: false,
  fxRate: 1.85, brlAmount: 1500, iof: 0.011, spread: 0.018
};

describe('buildAmortSchedule', () => {
  it('returns empty schedule for zero principal', () => {
    const { schedule, monthlyPayment } = buildAmortSchedule(0, 0.05, 25, 10);
    assert.equal(schedule.length, 0);
    assert.equal(monthlyPayment, 0);
  });

  it('balance approaches zero at full term', () => {
    const { schedule } = buildAmortSchedule(4.0, 0.05, 25, 25);
    const finalBalance = schedule[schedule.length - 1].balanceEnd;
    assert.ok(finalBalance < 0.001, `Expected near-zero balance, got ${finalBalance}`);
  });

  it('produces correct number of years', () => {
    const { schedule } = buildAmortSchedule(4.0, 0.05, 25, 10);
    assert.equal(schedule.length, 10);
  });

  it('interest decreases over time (annuity property)', () => {
    const { schedule } = buildAmortSchedule(4.0, 0.05, 25, 10);
    assert.ok(schedule[0].interestPaid > schedule[9].interestPaid);
  });
});

describe('compute', () => {
  it('calculates total debt correctly', () => {
    const c = compute(defaultParams);
    const expectedDebt = 5.3 + 5.0 * 0.80;
    assert.ok(Math.abs(c.totalDebt - expectedDebt) < 0.001);
  });

  it('calculates equity needed with dokumentavgift for selveier', () => {
    const c = compute(defaultParams);
    const expectedEquity = 5.0 * 0.20 + 5.0 * 0.025;
    assert.ok(Math.abs(c.equityNeeded - expectedEquity) < 0.001);
  });

  it('returns zero dokumentavgift for borettslag', () => {
    const c = compute({ ...defaultParams, propType: 'borettslag' });
    assert.equal(c.stamp, 0);
    assert.ok(Math.abs(c.equityNeeded - 5.0 * 0.20) < 0.001);
  });

  it('sets ltvWarning when Oslo and LTV > 60%', () => {
    const c = compute({ ...defaultParams, osloMode: true, ltv: 0.80 });
    assert.equal(c.ltvWarning, true);
  });

  it('no ltvWarning when Oslo and LTV <= 60%', () => {
    const c = compute({ ...defaultParams, osloMode: true, ltv: 0.60 });
    assert.equal(c.ltvWarning, false);
  });

  it('returns zero CGT when appreciation is negative', () => {
    const c = compute({ ...defaultParams, appreciation: -0.02 });
    assert.equal(c.cgt, 0);
    assert.ok(c.gain < 0);
  });

  it('zero LTV means no debt on property', () => {
    const c = compute({ ...defaultParams, ltv: 0 });
    assert.equal(c.secDebt, 0);
    assert.equal(c.monthlyPayment, 0);
    assert.equal(c.annualInterest, 0);
  });

  it('wealth tax delta is zero when net wealth is below threshold', () => {
    const c = compute({ ...defaultParams, primDebt: 8.0, otherAssets: 0 });
    assert.ok(c.wealthTaxDelta < 0.001);
  });

  it('break-even appreciation is reasonable', () => {
    const c = compute(defaultParams);
    assert.ok(c.breakEvenAppr > -0.10 && c.breakEvenAppr < 0.20);
  });
});

describe('recomputeScenario', () => {
  it('base scenario matches compute results', () => {
    const c = compute(defaultParams);
    const s = recomputeScenario(c, {});
    assert.ok(Math.abs(s.totalReturn - c.totalReturn) < 0.01);
  });

  it('higher rates reduce total return', () => {
    const c = compute(defaultParams);
    const base = recomputeScenario(c, {});
    const stressed = recomputeScenario(c, { rate: c.rate + 0.02 });
    assert.ok(stressed.totalReturn < base.totalReturn);
  });
});
