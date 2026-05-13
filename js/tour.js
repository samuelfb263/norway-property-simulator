import { t } from './i18n.js';

const TOUR_KEY = 'imovel.tour.completed.v1';
const STEPS = [
  { selector: '[data-tour-step="1"]', key: 'tour_step_1' },
  { selector: '[data-tour-step="2"]', key: 'tour_step_2' },
  { selector: '[data-tour-step="3"]', key: 'tour_step_3' },
  { selector: '[data-tour-step="4"]', key: 'tour_step_4' },
  { selector: '[data-tour-step="5"]', key: 'tour_step_5' },
  { selector: '[data-tour-step="6"]', key: 'tour_step_6' },
  { selector: '[data-tour-step="7"]', key: 'tour_step_7' }
];

let overlay = null;
let popover = null;
let idx = 0;

function ensureNodes() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  popover = document.createElement('div');
  popover.className = 'tour-popover';
  document.body.appendChild(overlay);
  document.body.appendChild(popover);
  overlay.addEventListener('click', endTour);
}

function positionPopover(target) {
  const rect = target.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 12;
  const left = Math.max(16, Math.min(rect.left + window.scrollX, window.innerWidth - 380));
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function render() {
  const step = STEPS[idx];
  const target = document.querySelector(step.selector);
  if (!target) { next(); return; }
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  target.classList.add('tour-highlight');
  popover.innerHTML = `
    <div class="tour-body">${t(step.key)}</div>
    <div class="tour-actions">
      <button class="btn btn-ghost" data-act="skip">${t('tour_skip')}</button>
      <span class="tour-count">${idx + 1} / ${STEPS.length}</span>
      ${idx > 0 ? `<button class="btn btn-ghost" data-act="prev">${t('tour_prev')}</button>` : ''}
      <button class="btn" data-act="next">${idx === STEPS.length - 1 ? t('tour_done') : t('tour_next')}</button>
    </div>
  `;
  popover.querySelector('[data-act="skip"]').onclick = endTour;
  popover.querySelector('[data-act="next"]').onclick = next;
  const prev = popover.querySelector('[data-act="prev"]');
  if (prev) prev.onclick = () => { idx--; render(); };
  positionPopover(target);
}

function next() {
  if (idx >= STEPS.length - 1) { endTour(); return; }
  idx++;
  render();
}

function endTour() {
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  if (overlay) { overlay.remove(); overlay = null; }
  if (popover) { popover.remove(); popover = null; }
  try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
}

export function startTour() {
  idx = 0;
  ensureNodes();
  render();
}

export function maybeAutoStartTour() {
  try {
    if (localStorage.getItem(TOUR_KEY) === '1') return;
  } catch {}
  if (location.hash && location.hash.length > 1) return;
  setTimeout(startTour, 600);
}
