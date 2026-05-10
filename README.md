# Norway Property Investment Simulator

Financial simulator for Brazilian investors evaluating secondary property (sekundærbolig) investment in Norway. Models Norwegian wealth tax (formuesskatt), capital gains, rental income, loan amortization, and Brazil-to-Norway capital transfer costs.

## Quick Start

```bash
npx serve . -p 8765
# Open http://localhost:8765
```

Or simply open `index.html` in a browser (needs a local server for ES modules).

## Architecture

```
index.html          → Clean markup, no inline JS/CSS
css/style.css       → All styles
js/config.js        → Tax constants and thresholds (2026)
js/i18n.js          → Bilingual translations (PT-BR / EN) + formatting
js/compute.js       → Pure financial engine (no DOM access)
js/render.js        → DOM rendering functions
js/main.js          → Event wiring and initialization
tests/              → Unit tests for compute engine
```

Key design decisions:
- **ES Modules** — no bundler needed, works natively in modern browsers
- **Chart.js via CDN** — single external dependency
- **`compute()` is pure** — takes params object, returns result; enables testing
- **Node test runner** — zero dependencies for tests

## Running Tests

```bash
npm test
# or: node --test tests/compute.test.js
```

## Docker Deployment

```bash
docker compose up -d
# Available at http://localhost:8080
```

### HTTPS with nginx reverse proxy

The container serves on port 80. For HTTPS, use your host nginx as a reverse proxy with certbot:

1. Point your domain's DNS to your server
2. Configure host nginx to proxy to `localhost:8080`
3. Run `certbot --nginx -d your-domain.com`

See `nginx.conf` comments for the full configuration template.

## Tax Model (Norway 2026)

- Wealth tax: 1.0% (up to 21.5M per person), 1.1% above
- Bunnfradrag: 3.8 MNOK (couple)
- CGT: 22% flat on sekundærbolig
- Rental income: 22% on profit
- Debt-to-income cap: 5× (utlånsforskriften)
- Oslo LTV cap: 60% for sekundærbolig
- Dokumentavgift: 2.5% (selveier only)

## License

MIT
