import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Polyfill btoa/atob for Node if not present
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
}

const { serializeInputs, deserializeInputs, toUrlHash, fromUrlHash } = await import('../js/state.js');

const sample = {
  primVal: 6.4, primDebt: 5.3, income: 2.1, otherAssets: 0.8,
  secVal: 5.0, ltv: 0.8, rate: 0.05, loanTerm: 25,
  rent: 0.018, opex: 0.060, ownUse: 0, years: 10, appreciation: 0.03,
  brlAmount: 1500, iof: 0.011, spread: 0.018,
  propType: 'selveier', assetType: 'cash', osloMode: false,
  residency: 'resident', civilStatus: 'couple',
  agentFeeRate: 0.02, acquisitionCostRate: 0.015
};

describe('state.js', () => {
  it('serialize → deserialize round-trips known fields', () => {
    const round = deserializeInputs(serializeInputs(sample));
    for (const k of Object.keys(sample)) {
      assert.equal(round[k], sample[k], `${k} mismatch`);
    }
  });

  it('URL hash round-trips', () => {
    const h = toUrlHash(sample);
    assert.ok(h.length > 0);
    const back = fromUrlHash('#' + h);
    for (const k of Object.keys(sample)) {
      assert.equal(back[k], sample[k], `${k} mismatch`);
    }
  });

  it('fromUrlHash returns null on empty or invalid', () => {
    assert.equal(fromUrlHash(''), null);
    assert.equal(fromUrlHash('#not-base64!!!'), null);
  });

  it('deserialize ignores unknown fields (forward-compat)', () => {
    const obj = deserializeInputs({ ...sample, unknownField: 'xyz', another: 42 });
    assert.equal(obj.unknownField, undefined);
    assert.equal(obj.primVal, sample.primVal);
  });
});
