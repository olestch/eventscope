# EventScope

EventScope is a portfolio product concept for exploring event engagement, organizing trackable QR touchpoints, and composing decision-ready reports. Phase 1 delivers a polished application shell around one coherent fictional campaign: **Northstar Launch**.

## Why Nuxt

The project uses Nuxt 3 as an application framework for file-based routing, layouts, conventions, and a scalable Vue structure. It runs with `ssr: false` because this phase models a data-intensive, authenticated-style workspace and has no server-owned data or SEO requirement. No server feature was added simply to justify the framework.

## Phase 1 includes

- Responsive desktop, tablet, and mobile application shell
- Explorer workspace with query context, filter chips, summary signals, an accessible SVG timeline mockup, and contextual insight
- QR library, creation shell, and reusable asset detail/editor
- Report library, builder shell, and on-screen report preview
- Methodology and provenance notes
- Typed, deterministic demo data with fixed dates and validated relationships
- Keyboard focus treatment, mobile navigation focus handling, reduced-motion support, and accessible chart data
- Reusable loading, empty, error, and no-results presentation states

## Intentionally not implemented

The analytical engine, anomaly detection, live data, backend services, authentication, real QR generation, file export, PDF/PPTX generation, persistence, and production-scale performance architecture belong to later phases. The interface does not make performance claims.

## Technology

- Nuxt 3
- Vue 3 and TypeScript
- SCSS design tokens and responsive styles
- Vitest and Vue Test Utils
- ESLint and Prettier

Pinia is intentionally absent: Phase 1 has no cross-route mutable domain state that justifies a store.

## Local development

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:3000` by default.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

## Data and provenance

Northstar Launch, its venues, metrics, people, QR assets, and reports are fictional and deterministic. This repository contains no commercial code or customer data.

## License

MIT
