import { t, getLang, nFmt, fmt, fmtK, fmtSign, pct, locale, getVerified } from './i18n.js';
import { recomputeScenario } from './compute.js';

function row(label, val, cls = '') {
  return `<div class="breakdown-row ${cls}"><span class="lbl">${label}</span><span class="val">${val}</span></div>`;
}

export function renderVerdict(vd) {
  const verdictEl = document.getElementById('verdict');
  verdictEl.classList.remove('good', 'warn', 'bad');
  verdictEl.classList.add(vd.level);
  document.getElementById('verdict-light').textContent = vd.level === 'good' ? '✓' : vd.level === 'warn' ? '!' : '✗';
  document.getElementById('verdict-headline').textContent =
    vd.level === 'good' ? t('vd_good_head') : vd.level === 'warn' ? t('vd_warn_head') : t('vd_bad_head');
  document.getElementById('verdict-sub').textContent = t('vd_sub_year').replace('{y}', document.getElementById('years').value);
  document.getElementById('verdict-list').innerHTML =
    vd.items.map(it => `<li class="${it.lv}">${it.html}</li>`).join('');
}

export function renderMetrics(c) {
  const lang = getLang();
  document.getElementById('summary-metrics').innerHTML = `
    <div class="metric ${c.debtOk ? 'good' : 'bad'}">
      <div class="metric-label">${t('m_metric_debt')}</div>
      <div class="metric-val">${fmt(c.totalDebt)}</div>
      <div class="metric-sub">${t('m_limit')}: ${fmt(c.debtLimit)}</div>
    </div>
    <div class="metric">
      <div class="metric-label">${t('m_metric_equity')}</div>
      <div class="metric-val">${fmt(c.equityNeeded)}</div>
      <div class="metric-sub">${c.propType === 'selveier' ? t('m_dokavg') + ' ' + fmt(c.stamp) : t('m_no_dokavg')}</div>
    </div>
    <div class="metric ${c.netCashflow >= 0 ? 'good' : 'warn'}">
      <div class="metric-label">${t('m_metric_cf')}</div>
      <div class="metric-val">${fmtSign(c.netCashflow / 12)}</div>
      <div class="metric-sub">${t('m_yield')} ${pct(c.netYield)}</div>
    </div>
    <div class="metric ${c.wealthTaxDelta < 0.005 ? 'good' : 'warn'}">
      <div class="metric-label">${t('m_metric_wealth')}</div>
      <div class="metric-val">${c.wealthTaxDelta < 0.005 ? t('zero') : fmt(c.wealthTaxDelta)}</div>
      <div class="metric-sub">Δ ${t('m_metric_wealth').toLowerCase()}</div>
    </div>
    <div class="metric ${c.totalReturn >= 0 ? 'good' : 'bad'}">
      <div class="metric-label">${t('m_metric_gain')} ${c.years}${lang === 'pt' ? 'a' : 'y'}</div>
      <div class="metric-val">${fmtSign(c.totalReturn)}</div>
      <div class="metric-sub">${t('m_annualized')}: ${pct(c.annualizedReturn)}</div>
    </div>
  `;
}

export function renderWealth(c) {
  const wealthRows = [];
  wealthRows.push(row(t('w_prim_low'), '+' + fmt(c.primBaseLow)));
  if (c.primVal > 10) wealthRows.push(row(t('w_prim_high'), '+' + fmt(c.primBaseHigh)));
  wealthRows.push(row(t('w_sec'), '+' + fmt(c.secBase)));
  wealthRows.push(row(c.assetType === 'fund' ? t('w_other_fund') : t('w_other_cash'), '+' + fmt(c.otherBase)));
  wealthRows.push(row(t('w_debt'), '−' + fmt(c.totalDebt)));
  wealthRows.push('<div class="divider"></div>');
  wealthRows.push(row(t('w_net'), fmt(c.netWealth), 'total'));
  wealthRows.push(row(t('w_threshold'), fmt(c.THRESHOLD_COUPLE)));
  wealthRows.push(row(t('w_taxable'), fmt(c.taxableWealth), c.taxableWealth === 0 ? 'pos' : 'neg'));
  wealthRows.push(row(t('w_tax'), c.wealthTax === 0 ? t('zero') : fmt(c.wealthTax), c.wealthTax === 0 ? 'pos total' : 'neg total'));
  wealthRows.push('<div class="divider"></div>');
  wealthRows.push(row(t('w_delta_label'), c.wealthTaxDelta === 0 ? t('zero') : '+' + fmt(c.wealthTaxDelta), c.wealthTaxDelta === 0 ? 'pos total' : 'neg total'));
  document.getElementById('wealth-breakdown').innerHTML = wealthRows.join('');
}

export function renderRental(c) {
  document.getElementById('rental-breakdown').innerHTML = `
    ${row(t('r_weeks'), Math.round(c.rentWeeks) + ' (' + Math.round(c.rentFraction * 100) + '%)')}
    ${row(t('r_gross_m'), '+' + fmtK(c.grossRent / 12))}
    ${row(t('r_gross_y'), '+' + fmtK(c.grossRent))}
    ${row(t('r_interest'), '−' + fmtK(c.annualInterest))}
    ${row(t('r_opex'), '−' + fmtK(c.opex))}
    <div class="divider"></div>
    ${row(t('r_taxable'), fmtK(c.taxableRental))}
    ${row(t('r_tax'), '−' + fmtK(c.rentalTax))}
    <div class="divider"></div>
    ${row(t('r_net_y'), fmtSign(c.netCashflow), c.netCashflow >= 0 ? 'pos total' : 'neg total')}
    ${row(t('r_net_m'), fmtSign(c.netCashflow / 12), c.netCashflow >= 0 ? 'pos' : 'neg')}
    ${row(t('r_after'), fmtSign(c.cashflowAfterPrincipal), c.cashflowAfterPrincipal >= 0 ? 'pos' : 'neg')}
    <div class="divider"></div>
    ${row(t('r_grossY'), pct(c.grossYield))}
    ${row(t('r_netY'), pct(c.netYield))}
  `;
}

export function renderSale(c) {
  document.getElementById('sale-breakdown').innerHTML = `
    ${row(t('s_current'), fmt(c.secVal))}
    ${row(t('s_appr'), pct(c.appreciation * 100))}
    ${row(t('s_future') + ' ' + c.years + ' ' + t('years_unit'), fmt(c.futureVal))}
    <div class="divider"></div>
    ${row(t('s_cost') + (c.propType === 'selveier' ? ' (incl. dokumentavgift 2,5%)' : ' (' + t('opt_borettslag') + ')'), fmt(c.costBase))}
    ${row(t('s_gain'), fmtSign(c.gain))}
    ${row(t('s_cgt'), '−' + fmt(c.cgt))}
    ${row(t('s_remaining'), '−' + fmt(c.remainingDebt))}
    ${row(t('s_proceeds'), fmt(c.netProceeds), 'total')}
    <div class="divider"></div>
    ${row(t('s_rental_total') + ' (' + c.years + ' ' + t('years_unit') + ')', fmtSign(c.totalRentalIncome))}
    ${row(t('s_total'), fmtSign(c.totalReturn), c.totalReturn >= 0 ? 'pos total' : 'neg total')}
    ${row(t('s_ann'), pct(c.annualizedReturn))}
  `;
}

export function renderBrazil(c) {
  const lang = getLang();
  document.getElementById('brazil-breakdown').innerHTML = `
    ${row(t('br_sent'), c.brlGross.toLocaleString(locale()) + ' BRL')}
    ${row(t('br_iof') + ' (' + pct(c.iof * 100, 2) + ')', '−' + (c.brlGross * c.iof).toLocaleString(locale(), { maximumFractionDigits: 0 }) + ' BRL')}
    ${row(t('br_spread') + ' (' + pct(c.spread * 100) + ')', '−' + (c.brlGross * c.spread).toLocaleString(locale(), { maximumFractionDigits: 0 }) + ' BRL')}
    ${row(t('br_lost'), '−' + c.totalCostBrl.toLocaleString(locale(), { maximumFractionDigits: 0 }) + ' BRL', 'neg')}
    <div class="divider"></div>
    ${row(t('br_net_brl'), c.brlAfterCosts.toLocaleString(locale(), { maximumFractionDigits: 0 }) + ' BRL')}
    ${row(t('br_rate'), '1 BRL = ' + nFmt(c.fxRate ? c.fxRate * (1 - c.iof - c.spread) : 0, 4) + ' NOK')}
    ${row(t('br_nok'), fmt(c.nokReceivedMnok), 'total')}
    <div class="divider"></div>
    ${row(t('br_needed'), fmt(c.equityNeeded))}
    ${row(c.nokReceivedMnok >= c.equityNeeded ? t('br_ok') : t('br_short'),
        c.nokReceivedMnok >= c.equityNeeded
          ? '+' + fmt(c.nokReceivedMnok - c.equityNeeded)
          : '−' + fmt(c.equityNeeded - c.nokReceivedMnok),
        c.nokReceivedMnok >= c.equityNeeded ? 'pos total' : 'neg total')}
  `;
}

export function renderCashflow(c) {
  const lang = getLang();
  const rows = [];
  rows.push(`<tr class="purchase">
    <td>0</td><td>${t('cf_purchase')}</td>
    <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
    <td class="v-neg">${fmtSign(-c.equityNeeded)}</td>
    <td class="v-neg">${fmtSign(-c.equityNeeded)}</td>
    <td class="v-neg">${fmtSign(-c.equityNeeded)}</td>
    <td>${fmt(c.secDebt)}</td>
  </tr>`);

  let cumulative = -c.equityNeeded;
  for (let y = 1; y <= c.years; y++) {
    const yr = c.schedule[y - 1];
    const profit = c.grossRent - yr.interestPaid - c.deductibleOpex;
    const tax = profit * 0.22;
    const isLast = (y === c.years);
    let saleProceeds = 0;
    if (isLast) saleProceeds = c.netProceeds;
    const yearNet = c.grossRent - yr.interestPaid - yr.principalPaid - c.opex - tax - c.wealthTaxDelta + saleProceeds;
    cumulative += yearNet;
    rows.push(`<tr class="${isLast ? 'sale' : ''}">
      <td>${y}</td><td>${isLast ? t('cf_sale') : t('cf_hold')}</td>
      <td class="v-pos">${fmtSign(c.grossRent)}</td>
      <td class="v-neg">${fmtSign(-yr.interestPaid)}</td>
      <td class="v-neg">${fmtSign(-yr.principalPaid)}</td>
      <td class="v-neg">${fmtSign(-c.opex)}</td>
      <td class="${tax > 0 ? 'v-neg' : 'v-pos'}">${fmtSign(-tax)}</td>
      <td class="${c.wealthTaxDelta > 0 ? 'v-neg' : 'v-pos'}">${fmtSign(-c.wealthTaxDelta)}</td>
      <td class="${saleProceeds > 0 ? 'v-pos' : ''}">${isLast ? fmtSign(saleProceeds) : '—'}</td>
      <td class="${yearNet >= 0 ? 'v-pos' : 'v-neg'}">${fmtSign(yearNet)}</td>
      <td class="${cumulative >= 0 ? 'v-pos' : 'v-neg'}">${fmtSign(cumulative)}</td>
      <td>${fmt(yr.balanceEnd)}</td>
    </tr>`);
  }
  rows.push(`<tr class="total">
    <td colspan="9">${t('cf_total')}</td>
    <td>${fmtSign(c.totalReturn)}</td>
    <td>${fmtSign(cumulative)}</td>
    <td>—</td>
  </tr>`);

  const head = `<thead><tr>
    <th>${t('cf_col_year')}</th>
    <th>${t('cf_col_event')}</th>
    <th>${t('cf_col_rent')}</th>
    <th>${t('cf_col_interest')}</th>
    <th>${t('cf_col_principal')}</th>
    <th>${t('cf_col_opex')}</th>
    <th>${t('cf_col_tax')}</th>
    <th>${t('cf_col_wt')}</th>
    <th>${t('cf_col_capital')}</th>
    <th>${t('cf_col_net')}</th>
    <th>${t('cf_col_cum')}</th>
    <th>${t('cf_col_balance')}</th>
  </tr></thead>`;
  document.getElementById('cashflow-table').innerHTML = head + '<tbody>' + rows.join('') + '</tbody>';

  const totalCredit = c.totalRentalTax < 0 ? -c.totalRentalTax : 0;
  const totalTaxPaid = c.totalRentalTax > 0 ? c.totalRentalTax : 0;
  document.getElementById('cashflow-summary').innerHTML = `
    <div class="cf-summary-grid">
      <div class="cf-stat">
        <div class="cf-stat-lbl">${t('cf_stat_payment')}</div>
        <div class="cf-stat-val">${fmt(c.monthlyPayment)}/${lang === 'pt' ? 'mês' : 'mo'}</div>
      </div>
      <div class="cf-stat">
        <div class="cf-stat-lbl">${t('cf_stat_total_int')}</div>
        <div class="cf-stat-val">${fmt(c.totalInterestPaid)}</div>
      </div>
      <div class="cf-stat">
        <div class="cf-stat-lbl">${totalTaxPaid > 0 ? t('cf_stat_total_tax') : t('cf_stat_total_credit')}</div>
        <div class="cf-stat-val" style="color: ${totalTaxPaid > 0 ? '#A32D2D' : '#0F6E56'}">
          ${totalTaxPaid > 0 ? '−' + fmt(totalTaxPaid) : '+' + fmt(totalCredit)}
        </div>
      </div>
      <div class="cf-stat">
        <div class="cf-stat-lbl">${t('cf_stat_irr')}</div>
        <div class="cf-stat-val" style="color: ${c.annualizedReturn >= 0 ? '#0F6E56' : '#A32D2D'}">${pct(c.annualizedReturn)}</div>
      </div>
    </div>
  `;
}

export function renderChart(c, chartInstance) {
  const labels = [];
  const valueData = [], debtData = [], cashData = [], equityData = [];
  let cumCash = -c.equityNeeded;
  for (let y = 0; y <= c.years; y++) {
    labels.push(y);
    const v = c.secVal * Math.pow(1 + c.appreciation, y);
    const d = y === 0 ? c.secDebt : (c.schedule[y - 1] ? c.schedule[y - 1].balanceEnd : 0);
    if (y > 0) {
      const yr = c.schedule[y - 1];
      const profit = c.grossRent - yr.interestPaid - c.deductibleOpex;
      const tax = profit * 0.22;
      const cf = c.grossRent - yr.interestPaid - c.opex - tax - c.wealthTaxDelta;
      cumCash += cf;
    }
    valueData.push(+v.toFixed(3));
    debtData.push(+d.toFixed(3));
    cashData.push(+cumCash.toFixed(3));
    equityData.push(+(v - d + cumCash).toFixed(3));
  }
  const datasets = [];
  if (document.getElementById('ck-value').checked) datasets.push({ label: t('ck_value'), data: valueData, borderColor: '#534AB7', tension: 0.2, fill: false });
  if (document.getElementById('ck-debt').checked) datasets.push({ label: t('ck_debt'), data: debtData, borderColor: '#A32D2D', tension: 0.2, fill: false });
  if (document.getElementById('ck-cash').checked) datasets.push({ label: t('ck_cash'), data: cashData, borderColor: '#BA7517', tension: 0.2, fill: false });
  if (document.getElementById('ck-equity').checked) datasets.push({ label: t('ck_equity'), data: equityData, borderColor: '#0F6E56', backgroundColor: 'rgba(15,110,86,0.15)', tension: 0.2, fill: true });
  const ctx = document.getElementById('timeline-chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  const newChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 } } },
        tooltip: { callbacks: { label: (cx) => `${cx.dataset.label}: ${nFmt(cx.parsed.y, 2)} MNOK` } }
      },
      scales: {
        x: { title: { display: true, text: t('ch_year') } },
        y: { title: { display: true, text: t('ch_value') + ' (MNOK)' }, ticks: { callback: v => nFmt(v, 1) } }
      }
    }
  });
  return newChart;
}

export function renderScenarios(c) {
  const scenarios = [
    { id: 'base', label: t('sc_base'), opts: {} },
    { id: 'rates', label: t('sc_rates'), opts: { rate: c.rate + 0.02 } },
    { id: 'flat', label: t('sc_flat'), opts: { appr: 0 } },
    { id: 'down', label: t('sc_down'), opts: { dropAtSale: -0.20 } },
    { id: 'vacancy', label: t('sc_vacancy'), opts: { vacWeeks: 12 } },
    { id: 'double', label: t('sc_double'), opts: { rate: c.rate + 0.01, dropAtSale: -0.10 } },
    { id: 'best', label: t('sc_best'), opts: { rate: Math.max(0.02, c.rate - 0.01), appr: c.appreciation + 0.02 } }
  ];
  const rows = scenarios.map(s => {
    const r = recomputeScenario(c, s.opts);
    return { ...s, ...r };
  });

  const head = `
    <thead><tr>
      <th>${t('sc_col_label')}</th>
      <th>${t('sc_col_cf')}</th>
      <th>${t('sc_col_total')}</th>
      <th>${t('sc_col_ann')}</th>
    </tr></thead>
  `;
  const body = '<tbody>' + rows.map(r => `
    <tr class="${r.id === 'base' ? 'base' : ''}">
      <td>${r.label}</td>
      <td class="${r.netCf >= 0 ? 'v-pos' : 'v-neg'}">${fmtSign(r.netCf / 12)}</td>
      <td class="${r.totalReturn >= 0 ? 'v-pos' : 'v-neg'}">${fmtSign(r.totalReturn)}</td>
      <td class="${r.ann >= 0 ? 'v-pos' : 'v-neg'}">${pct(r.ann)}</td>
    </tr>
  `).join('') + '</tbody>';
  document.getElementById('scen-table').innerHTML = head + body;

  document.getElementById('breakeven-note').innerHTML =
    t('vd_breakeven').replace('{b}', pct(c.breakEvenAppr * 100));
}

export function renderVerified() {
  const list = getVerified().map(v => `<li>${v.html}</li>`).join('');
  document.getElementById('verified-list').innerHTML = list;
}

export function updateFxBox(fxRate, fxSource) {
  const fxBox = document.getElementById('fx-box');
  if (!fxBox) return;
  if (fxRate === null) {
    fxBox.innerHTML = `<span>${t('fx_loading')}</span>`;
    return;
  }
  const rateStr = nFmt(fxRate, 4);
  fxBox.innerHTML = `
    <span><strong>1 BRL = ${rateStr} NOK</strong> <small>(${t('fx_source')} ${fxSource})</small></span>
    <span><small>${t('fx_label')}</small></span>
  `;
}
