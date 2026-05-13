import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAmortSchedule, compute, recomputeScenario, validateInputs, buildVerdict } from '../js/compute.js';
import { PRESETS } from '../js/presets.js';

const defaultParams = {
  primVal: 6.4, primDebt: 5.3, income: 2.1, otherAssets: 0.8,
  secVal: 5.0, ltv: 0.80, rate: 0.05, loanTerm: 25,
  rent: 0.018, opex: 0.060, ownUse: 0, years: 10, appreciation: 0.03,
  propType: 'selveier', assetType: 'cash', osloMode: false,
  fxRate: 1.85, brlAmount: 1500, iof: 0.011, spread: 0.018,
  residency: 'resident', civilStatus: 'couple',
  agentFeeRate: 0.02, acquisitionCostRate: 0.015
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
    assert.ok(finalBalance < 0.001);
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

describe('compute — basics', () => {
  it('calculates total debt correctly', () => {
    const c = compute(defaultParams);
    assert.ok(Math.abs(c.totalDebt - (5.3 + 5.0 * 0.80)) < 0.001);
  });

  it('equity includes down payment, dokumentavgift and acquisition costs', () => {
    const c = compute(defaultParams);
    const expected = 5.0 * 0.20 + 5.0 * 0.025 + 5.0 * 0.015;
    assert.ok(Math.abs(c.equityNeeded - expected) < 0.001);
  });

  it('zero dokumentavgift for borettslag', () => {
    const c = compute({ ...defaultParams, propType: 'borettslag' });
    assert.equal(c.stamp, 0);
    assert.ok(Math.abs(c.equityNeeded - (5.0 * 0.20 + 5.0 * 0.015)) < 0.001);
  });

  it('ltvWarning when Oslo and LTV > 60%', () => {
    const c = compute({ ...defaultParams, osloMode: true, ltv: 0.80 });
    assert.equal(c.ltvWarning, true);
  });

  it('no CGT when appreciation is negative', () => {
    const c = compute({ ...defaultParams, appreciation: -0.02 });
    assert.equal(c.cgt, 0);
    assert.ok(c.gain < 0);
  });
});

describe('compute — D1 wealth (residency + civilStatus)', () => {
  it('couple uses 3.8M bunnfradrag', () => {
    const c = compute(defaultParams);
    assert.equal(c.bunnfradrag, 3.8);
  });

  it('single uses 1.9M bunnfradrag', () => {
    const c = compute({ ...defaultParams, civilStatus: 'single' });
    assert.equal(c.bunnfradrag, 1.9);
  });

  it('non-resident excludes primary home and other assets from wealth base', () => {
    const c = compute({ ...defaultParams, residency: 'nonResident', primVal: 15, otherAssets: 5 });
    // gross wealth = sec only (5.0 * 1.0 = 5.0); net = 5.0 - 4.0 (secDebt) = 1.0; below 3.8M bunnfradrag → 0
    assert.equal(c.grossWealth, 5.0);
    assert.equal(c.wealthTax, 0);
  });

  it('non-resident with large property pays wealth tax above bunnfradrag', () => {
    const c = compute({ ...defaultParams, residency: 'nonResident', secVal: 10, ltv: 0 });
    // gross = 10, net = 10, taxable = 10 - 3.8 = 6.2, tax = 6.2 * 1% = 0.062
    assert.ok(Math.abs(c.wealthTax - 0.062) < 0.001);
  });

  it('couple tier-2 transitions correctly at 43M', () => {
    const c = compute({ ...defaultParams, primDebt: 0, primVal: 0, secVal: 50, ltv: 0, otherAssets: 0 });
    // net wealth = 50; taxable = 50 - 3.8 = 46.2; tier1cap = 43 - 3.8 = 39.2
    // tax = 39.2 * 0.01 + (46.2 - 39.2) * 0.011 = 0.392 + 0.077 = 0.469
    assert.ok(Math.abs(c.wealthTax - 0.469) < 0.002);
  });

  it('wealth tax delta zero when below threshold', () => {
    const c = compute({ ...defaultParams, primDebt: 8.0, otherAssets: 0 });
    assert.ok(c.wealthTaxDelta < 0.001);
  });
});

describe('compute — D2 transaction costs', () => {
  it('agent fee reduces netProceeds', () => {
    const withFee = compute(defaultParams);
    const noFee = compute({ ...defaultParams, agentFeeRate: 0 });
    assert.ok(noFee.netProceeds > withFee.netProceeds);
    assert.ok(Math.abs(noFee.netProceeds - withFee.netProceeds - withFee.agentFee) < 0.001);
  });

  it('zero appreciation: total return is worse with agent fee than without', () => {
    const withFee = compute({ ...defaultParams, appreciation: 0 });
    const noFee = compute({ ...defaultParams, appreciation: 0, agentFeeRate: 0 });
    assert.ok(withFee.totalReturn < noFee.totalReturn);
  });

  it('cost base includes acquisition costs', () => {
    const c = compute(defaultParams);
    const expected = 5.0 + 5.0 * 0.025 + 5.0 * 0.015;
    assert.ok(Math.abs(c.costBase - expected) < 0.001);
  });
});

describe('recomputeScenario', () => {
  it('base matches compute results', () => {
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

  it('high vacancy reduces total return vs base', () => {
    const c = compute(defaultParams);
    const base = recomputeScenario(c, {});
    const vac = recomputeScenario(c, { vacWeeks: 10 });
    assert.ok(vac.totalReturn < base.totalReturn);
  });
});

describe('validateInputs (D4)', () => {
  it('primDebt > primVal is an error', () => {
    const v = validateInputs({ ...defaultParams, primDebt: 10, primVal: 6 });
    assert.ok(v.errors.includes('val_primDebt_exceeds'));
  });

  it('ltv 0.95 produces warning', () => {
    const v = validateInputs({ ...defaultParams, ltv: 0.95 });
    assert.ok(v.warnings.includes('val_ltv_high'));
  });

  it('happy path has no errors/warnings', () => {
    const v = validateInputs(defaultParams);
    assert.equal(v.errors.length, 0);
    assert.equal(v.warnings.length, 0);
  });
});

describe('buildVerdict (D5)', () => {
  it('returns bad when totalReturn is negative', () => {
    const c = compute({ ...defaultParams, appreciation: -0.05, years: 5 });
    const vd = buildVerdict(c);
    assert.equal(vd.level, 'bad');
  });
});

describe('PRESETS', () => {
  it('every preset computes without throwing and has positive equityNeeded', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const inputs = {
        ...p.inputs,
        ltv: p.inputs.ltv / 100,
        rate: p.inputs.rate / 100,
        appreciation: p.inputs.appreciation / 100,
        rent: p.inputs.rent / 1000,
        opex: p.inputs.opex / 1000,
        iof: p.inputs.iof / 100,
        spread: p.inputs.spread / 100,
        fxRate: 1.85
      };
      const c = compute(inputs);
      assert.ok(c.equityNeeded > 0, `${key}: equityNeeded should be > 0`);
    }
  });
});
