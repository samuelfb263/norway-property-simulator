# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Norway property investment simulator for Brazilian investors. Models Norwegian wealth tax (formuesskatt 2026), capital gains, rental income, annuity loan amortization, and Brazil→Norway capital transfer costs. Bilingual (PT-BR / EN).

## Commands

```bash
npm run dev          # Local dev server at http://localhost:8765 (requires npx/serve)
npm test             # Run unit tests (node --test tests/compute.test.js)
docker compose up -d # Serve via nginx at http://localhost:8080
```

No build step — vanilla ES modules served directly. Chart.js loaded via CDN.

## Architecture

The app follows a strict data-flow: **DOM inputs → compute(params) → render(result) → DOM output**.

- **`js/config.js`** — All Norwegian tax constants and thresholds (2026 rates). When tax rules change, update only this file.
- **`js/i18n.js`** — Translation strings for PT-BR and EN, plus number/currency formatting helpers (`fmt`, `fmtK`, `pct`, etc.). Module-scoped `currentLang` state.
- **`js/compute.js`** — Pure financial engine with zero DOM access. `compute(params)` takes a plain object and returns ~50 computed values. `recomputeScenario()` runs stress-test variants. `buildVerdict()` produces the traffic-light recommendation. This is the only testable module.
- **`js/render.js`** — DOM rendering functions. Each tab has its own render function. `renderChart()` returns the Chart.js instance (caller must track it for destroy/recreate).
- **`js/main.js`** — Orchestrator. Owns UI state (`propType`, `assetType`, `osloMode`, `fxRate`), reads DOM inputs via `readInputs()`, wires all event listeners, and calls compute→render on every change.

Key design constraint: `compute()` must stay pure (no `document` access) so it remains testable with Node's built-in test runner.

## Units Convention

All monetary values flow through the system in **MNOK** (millions of NOK). Sliders that display KNOK or percentages are converted at the boundary (`main.js:readInputs()`). The formatting helpers in `i18n.js` handle display conversion back to KNOK when values are < 1 MNOK.

## Deployment

The `Dockerfile` copies static files into `nginx:alpine`. The `nginx.conf` includes HTTPS/certbot integration instructions in comments for reverse-proxy setup behind the user's existing nginx.
