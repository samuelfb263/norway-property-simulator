// Full input bundles. Values match the sliders' raw units
// (rent/opex in KNOK, rates in %, LTV in %).
export const PRESETS = {
  oslo_studio: {
    labelKey: 'preset_oslo_studio',
    inputs: {
      primVal: 6.4, primDebt: 5.3, income: 2.1, otherAssets: 0.8,
      secVal: 3.5, ltv: 60, rate: 5.0, loanTerm: 25,
      rent: 16, opex: 45, ownUse: 0,
      years: 10, appreciation: 3.0,
      brlAmount: 1200, iof: 1.1, spread: 1.8,
      propType: 'selveier', assetType: 'cash', osloMode: true,
      residency: 'resident', civilStatus: 'couple'
    }
  },
  bergen_2br: {
    labelKey: 'preset_bergen_2br',
    inputs: {
      primVal: 6.4, primDebt: 5.3, income: 2.1, otherAssets: 0.8,
      secVal: 5.5, ltv: 80, rate: 5.0, loanTerm: 25,
      rent: 22, opex: 65, ownUse: 0,
      years: 10, appreciation: 3.0,
      brlAmount: 1500, iof: 1.1, spread: 1.8,
      propType: 'selveier', assetType: 'cash', osloMode: false,
      residency: 'resident', civilStatus: 'couple'
    }
  },
  cabin_trysil: {
    labelKey: 'preset_cabin_trysil',
    inputs: {
      primVal: 6.4, primDebt: 5.3, income: 2.1, otherAssets: 0.8,
      secVal: 3.0, ltv: 70, rate: 5.0, loanTerm: 20,
      rent: 14, opex: 55, ownUse: 8,
      years: 15, appreciation: 2.0,
      brlAmount: 1000, iof: 1.1, spread: 1.8,
      propType: 'selveier', assetType: 'cash', osloMode: false,
      residency: 'resident', civilStatus: 'couple'
    }
  },
  nonresident: {
    labelKey: 'preset_nonresident',
    inputs: {
      primVal: 0, primDebt: 0, income: 0.5, otherAssets: 0,
      secVal: 5.5, ltv: 60, rate: 5.5, loanTerm: 20,
      rent: 22, opex: 70, ownUse: 0,
      years: 10, appreciation: 3.0,
      brlAmount: 2500, iof: 1.1, spread: 1.8,
      propType: 'selveier', assetType: 'cash', osloMode: false,
      residency: 'nonResident', civilStatus: 'couple'
    }
  }
};
