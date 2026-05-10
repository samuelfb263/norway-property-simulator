import { setLang as setI18nLang, getLang, t, nFmt } from './i18n.js';
import { FX_API_PRIMARY, FX_API_FALLBACK, FALLBACK_FX_RATE } from './config.js';
import { compute, buildVerdict } from './compute.js';
import {
  renderVerdict, renderMetrics, renderWealth, renderRental, renderSale,
  renderBrazil, renderCashflow, renderChart, renderScenarios, renderVerified, updateFxBox
} from './render.js';

let propType = 'selveier';
let assetType = 'cash';
let osloMode = false;
let fxRate = null;
let fxSource = '';
let chartInstance = null;

function readInputs() {
  return {
    primVal: +document.getElementById('primVal').value,
    primDebt: +document.getElementById('primDebt').value,
    income: +document.getElementById('income').value,
    otherAssets: +document.getElementById('otherAssets').value,
    secVal: +document.getElementById('secVal').value,
    ltv: +document.getElementById('ltv').value / 100,
    rate: +document.getElementById('rate').value / 100,
    loanTerm: +document.getElementById('loanTerm').value,
    rent: +document.getElementById('rent').value / 1000,
    opex: +document.getElementById('opex').value / 1000,
    ownUse: +document.getElementById('ownUse').value,
    years: +document.getElementById('years').value,
    appreciation: +document.getElementById('appreciation').value / 100,
    brlAmount: +document.getElementById('brlAmount').value,
    iof: +document.getElementById('iof').value / 100,
    spread: +document.getElementById('spread').value / 100,
    propType,
    assetType,
    osloMode,
    fxRate
  };
}

function updateSliderDisplays(c) {
  const lang = getLang();
  const setVal = (id, txt) => { const el = document.getElementById(id + '-out'); if (el) el.textContent = txt; };
  setVal('primVal', nFmt(c.primVal, 1) + ' MNOK');
  setVal('primDebt', nFmt(c.primDebt, 1) + ' MNOK');
  setVal('income', nFmt(c.income, 1) + ' MNOK');
  setVal('otherAssets', nFmt(c.otherAssets, 1) + ' MNOK');
  setVal('secVal', nFmt(c.secVal, 1) + ' MNOK');
  setVal('ltv', Math.round(c.ltv * 100) + '%');
  setVal('rate', nFmt(c.rate * 100, 1) + '%');
  setVal('loanTerm', c.loanTerm + ' ' + (c.loanTerm === 1 ? t('year_unit') : t('years_unit')));
  setVal('rent', Math.round(c.rent * 1000) + ' KNOK');
  setVal('opex', Math.round(c.opex * 1000) + ' KNOK');
  setVal('ownUse', c.ownUse + ' ' + (c.ownUse === 1 ? t('week') : t('weeks')));
  setVal('years', c.years + ' ' + (c.years === 1 ? t('year_unit') : t('years_unit')));
  setVal('appreciation', nFmt(c.appreciation * 100, 1) + '%');
  setVal('brlAmount', (+document.getElementById('brlAmount').value).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US') + 'k BRL');
  setVal('iof', nFmt(c.iof * 100, 2) + '%');
  setVal('spread', nFmt(c.spread * 100, 1) + '%');
}

function update() {
  const params = readInputs();
  const c = compute(params);

  updateSliderDisplays(c);

  const osloNote = document.getElementById('oslo-note');
  if (c.ltvWarning) { osloNote.style.display = 'block'; osloNote.innerHTML = t('osloNote'); }
  else osloNote.style.display = 'none';

  const vd = buildVerdict(c);
  renderVerdict(vd);
  renderMetrics(c);
  renderWealth(c);
  renderRental(c);
  renderSale(c);
  renderBrazil(c);

  if (document.getElementById('tab-chart').classList.contains('active')) {
    chartInstance = renderChart(c, chartInstance);
  }
  if (document.getElementById('tab-scenarios').classList.contains('active')) renderScenarios(c);
  if (document.getElementById('tab-cashflow').classList.contains('active')) renderCashflow(c);
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const params = readInputs();
  const c = compute(params);
  if (name === 'chart') chartInstance = renderChart(c, chartInstance);
  if (name === 'scenarios') renderScenarios(c);
  if (name === 'cashflow') renderCashflow(c);
  if (name === 'brazil') updateFxBox(fxRate, fxSource);
}

function setLang(l) {
  setI18nLang(l);
  document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en';
  document.getElementById('lang-pt').classList.toggle('active', l === 'pt');
  document.getElementById('lang-en').classList.toggle('active', l === 'en');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== key) el.innerHTML = val;
  });
  renderVerified();
  update();
}

function setPropType(p) {
  propType = p;
  document.getElementById('propType-selveier').classList.toggle('active', p === 'selveier');
  document.getElementById('propType-borettslag').classList.toggle('active', p === 'borettslag');
  update();
}

function setAssetType(a) {
  assetType = a;
  document.getElementById('assetType-cash').classList.toggle('active', a === 'cash');
  document.getElementById('assetType-fund').classList.toggle('active', a === 'fund');
  update();
}

function setLocation(l) {
  osloMode = (l === 'oslo');
  document.getElementById('loc-other').classList.toggle('active', !osloMode);
  document.getElementById('loc-oslo').classList.toggle('active', osloMode);
  update();
}

async function fetchFx() {
  try {
    const res = await fetch(FX_API_PRIMARY);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    fxRate = data.rates.NOK;
    fxSource = 'frankfurter.app (ECB)';
  } catch (e) {
    try {
      const r2 = await fetch(FX_API_FALLBACK);
      const d2 = await r2.json();
      fxRate = d2.rates.NOK;
      fxSource = 'open.er-api.com';
    } catch (e2) {
      fxRate = FALLBACK_FX_RATE;
      fxSource = 'fallback';
    }
  }
  updateFxBox(fxRate, fxSource);
  update();
}

// Event wiring
document.querySelectorAll('input[type=range]').forEach(el => el.addEventListener('input', update));
document.querySelectorAll('#chart-toggles input').forEach(el => el.addEventListener('change', () => {
  const params = readInputs();
  const c = compute(params);
  chartInstance = renderChart(c, chartInstance);
}));

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('lang-pt').addEventListener('click', () => setLang('pt'));
document.getElementById('lang-en').addEventListener('click', () => setLang('en'));
document.getElementById('propType-selveier').addEventListener('click', () => setPropType('selveier'));
document.getElementById('propType-borettslag').addEventListener('click', () => setPropType('borettslag'));
document.getElementById('assetType-cash').addEventListener('click', () => setAssetType('cash'));
document.getElementById('assetType-fund').addEventListener('click', () => setAssetType('fund'));
document.getElementById('loc-other').addEventListener('click', () => setLocation('other'));
document.getElementById('loc-oslo').addEventListener('click', () => setLocation('oslo'));
document.querySelector('.btn[data-i18n="print"]').addEventListener('click', () => window.print());

// Initialize
setLang('pt');
fetchFx();
