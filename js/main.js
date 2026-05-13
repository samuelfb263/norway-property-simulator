import { setLang as setI18nLang, getLang, t, nFmt } from './i18n.js';
import { FX_API_PRIMARY, FX_API_FALLBACK, FALLBACK_FX_RATE } from './config.js';
import { compute, buildVerdict, validateInputs } from './compute.js';
import {
  renderVerdict, renderMetrics, renderWealth, renderRental, renderSale,
  renderBrazil, renderCashflow, renderChart, renderScenarios, renderVerified,
  renderValidation, updateFxBox
} from './render.js';
import {
  serializeInputs, toUrlHash, fromUrlHash,
  saveScenario, loadScenario, deleteScenario, listScenarios
} from './state.js';
import { PRESETS } from './presets.js';
import { startTour, maybeAutoStartTour } from './tour.js';

let propType = 'selveier';
let assetType = 'cash';
let osloMode = false;
let residency = 'resident';
let civilStatus = 'couple';
let fxRate = null;
let fxSource = '';
let chartInstance = null;
let hashTimer = null;
let suppressHash = false;

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
    agentFeeRate: +document.getElementById('agentFeeRate').value / 100,
    acquisitionCostRate: +document.getElementById('acquisitionCostRate').value / 100,
    propType, assetType, osloMode, residency, civilStatus, fxRate
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
  setVal('agentFeeRate', nFmt(c.agentFeeRate * 100, 1) + '%');
  setVal('acquisitionCostRate', nFmt(c.acquisitionCostRate * 100, 1) + '%');
}

function scheduleHashPush(params) {
  if (suppressHash) return;
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const h = toUrlHash(params);
    if (h) history.replaceState(null, '', '#' + h);
  }, 300);
}

function update() {
  const params = readInputs();
  const c = compute(params);
  const v = validateInputs(params);

  updateSliderDisplays(c);

  const osloNote = document.getElementById('oslo-note');
  if (c.ltvWarning) { osloNote.style.display = 'block'; osloNote.innerHTML = t('osloNote'); }
  else osloNote.style.display = 'none';

  const vd = buildVerdict(c);
  renderVerdict(vd);
  renderValidation(v);
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

  scheduleHashPush(params);
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
    if (val !== key) {
      if (el.tagName === 'OPTION') el.textContent = val;
      else el.innerHTML = val;
    }
  });
  renderVerified();
  refreshScenarioSelect();
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

function setResidency(r) {
  residency = r;
  document.getElementById('res-resident').classList.toggle('active', r === 'resident');
  document.getElementById('res-nonResident').classList.toggle('active', r === 'nonResident');
  update();
}

function setCivilStatus(s) {
  civilStatus = s;
  document.getElementById('civ-couple').classList.toggle('active', s === 'couple');
  document.getElementById('civ-single').classList.toggle('active', s === 'single');
  update();
}

function applyInputs(obj) {
  if (!obj) return;
  suppressHash = true;
  const setSlider = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };
  // unit-adjusted sliders (compute uses MNOK + decimals)
  setSlider('primVal', obj.primVal);
  setSlider('primDebt', obj.primDebt);
  setSlider('income', obj.income);
  setSlider('otherAssets', obj.otherAssets);
  setSlider('secVal', obj.secVal);
  if (obj.ltv !== undefined) setSlider('ltv', obj.ltv > 1 ? obj.ltv : obj.ltv * 100);
  if (obj.rate !== undefined) setSlider('rate', obj.rate > 1 ? obj.rate : obj.rate * 100);
  setSlider('loanTerm', obj.loanTerm);
  if (obj.rent !== undefined) setSlider('rent', obj.rent < 1 ? Math.round(obj.rent * 1000) : obj.rent);
  if (obj.opex !== undefined) setSlider('opex', obj.opex < 1 ? Math.round(obj.opex * 1000) : obj.opex);
  setSlider('ownUse', obj.ownUse);
  setSlider('years', obj.years);
  if (obj.appreciation !== undefined) setSlider('appreciation', obj.appreciation > 1 || obj.appreciation < -1 ? obj.appreciation : obj.appreciation * 100);
  setSlider('brlAmount', obj.brlAmount);
  if (obj.iof !== undefined) setSlider('iof', obj.iof > 1 ? obj.iof : obj.iof * 100);
  if (obj.spread !== undefined) setSlider('spread', obj.spread > 1 ? obj.spread : obj.spread * 100);
  if (obj.agentFeeRate !== undefined) setSlider('agentFeeRate', obj.agentFeeRate > 1 ? obj.agentFeeRate : obj.agentFeeRate * 100);
  if (obj.acquisitionCostRate !== undefined) setSlider('acquisitionCostRate', obj.acquisitionCostRate > 1 ? obj.acquisitionCostRate : obj.acquisitionCostRate * 100);
  if (obj.propType) setPropType(obj.propType);
  if (obj.assetType) setAssetType(obj.assetType);
  if (obj.osloMode !== undefined) setLocation(obj.osloMode ? 'oslo' : 'other');
  if (obj.residency) setResidency(obj.residency);
  if (obj.civilStatus) setCivilStatus(obj.civilStatus);
  suppressHash = false;
  update();
}

function refreshScenarioSelect() {
  const sel = document.getElementById('scenario-select');
  if (!sel) return;
  const names = listScenarios();
  sel.innerHTML = '<option value="">' + (names.length === 0 ? '—' : '—') + '</option>'
    + names.map(n => `<option value="${n}">${n}</option>`).join('');
}

function flashCopied() {
  const m = document.getElementById('link-copied-msg');
  if (!m) return;
  m.style.display = 'inline';
  setTimeout(() => { m.style.display = 'none'; }, 1500);
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
document.getElementById('res-resident').addEventListener('click', () => setResidency('resident'));
document.getElementById('res-nonResident').addEventListener('click', () => setResidency('nonResident'));
document.getElementById('civ-couple').addEventListener('click', () => setCivilStatus('couple'));
document.getElementById('civ-single').addEventListener('click', () => setCivilStatus('single'));
document.querySelector('.btn[data-i18n="print"]').addEventListener('click', () => window.print());

document.getElementById('preset-select').addEventListener('change', (e) => {
  const key = e.target.value;
  if (key && PRESETS[key]) applyInputs(PRESETS[key].inputs);
  e.target.value = '';
});

document.getElementById('btn-save').addEventListener('click', () => {
  const name = prompt(t('scenario_name_prompt'));
  if (!name) return;
  saveScenario(name.trim(), readInputs());
  refreshScenarioSelect();
});

document.getElementById('scenario-select').addEventListener('change', (e) => {
  const name = e.target.value;
  if (!name) return;
  const obj = loadScenario(name);
  if (obj) applyInputs(obj);
});

document.getElementById('btn-delete').addEventListener('click', () => {
  const sel = document.getElementById('scenario-select');
  const name = sel.value;
  if (!name) return;
  if (!confirm(t('scenario_confirm_delete'))) return;
  deleteScenario(name);
  refreshScenarioSelect();
});

document.getElementById('btn-copy-link').addEventListener('click', async () => {
  const h = toUrlHash(readInputs());
  const url = location.origin + location.pathname + '#' + h;
  try {
    await navigator.clipboard.writeText(url);
    flashCopied();
  } catch {
    history.replaceState(null, '', '#' + h);
    flashCopied();
  }
});

document.getElementById('btn-tour').addEventListener('click', () => startTour());

// Initialize: hydrate from URL hash if present
const hashState = fromUrlHash(location.hash);
setLang('pt');
if (hashState) applyInputs(hashState);
refreshScenarioSelect();
fetchFx();
maybeAutoStartTour();
