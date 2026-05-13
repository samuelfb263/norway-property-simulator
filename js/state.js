const STORAGE_KEY = 'imovel.scenarios.v1';

// Short keys for URL hash to keep it compact.
const SHORT = {
  primVal: 'pv', primDebt: 'pd', income: 'in', otherAssets: 'oa',
  secVal: 'sv', ltv: 'lt', rate: 'rt', loanTerm: 'tm',
  rent: 'rn', opex: 'ox', ownUse: 'ou',
  years: 'yr', appreciation: 'ap',
  brlAmount: 'br', iof: 'io', spread: 'sp',
  propType: 'pt', assetType: 'at', osloMode: 'om',
  residency: 'rs', civilStatus: 'cs',
  agentFeeRate: 'af', acquisitionCostRate: 'ac'
};
const LONG = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [v, k]));

export function serializeInputs(inputs) {
  const out = {};
  for (const k of Object.keys(SHORT)) {
    if (inputs[k] !== undefined && inputs[k] !== null) out[k] = inputs[k];
  }
  return out;
}

export function deserializeInputs(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const k of Object.keys(SHORT)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export function toUrlHash(inputs) {
  const obj = serializeInputs(inputs);
  const short = {};
  for (const [k, v] of Object.entries(obj)) short[SHORT[k]] = v;
  const json = JSON.stringify(short);
  try {
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
}

export function fromUrlHash(hash) {
  if (!hash) return null;
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!cleaned) return null;
  try {
    const json = decodeURIComponent(escape(atob(cleaned)));
    const short = JSON.parse(json);
    const long = {};
    for (const [k, v] of Object.entries(short)) {
      if (LONG[k]) long[LONG[k]] = v;
    }
    return long;
  } catch {
    return null;
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeStore(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

export function saveScenario(name, inputs) {
  if (!name) return false;
  const store = readStore();
  store[name] = serializeInputs(inputs);
  writeStore(store);
  return true;
}

export function loadScenario(name) {
  const store = readStore();
  return store[name] ? deserializeInputs(store[name]) : null;
}

export function deleteScenario(name) {
  const store = readStore();
  if (store[name]) {
    delete store[name];
    writeStore(store);
    return true;
  }
  return false;
}

export function listScenarios() {
  return Object.keys(readStore()).sort();
}
