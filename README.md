# EventScope

EventScope is a portfolio product concept for exploring event engagement, organizing tracked QR touchpoints, and composing decision-ready reports. The current fictional product story centers on **Northstar Launch**.

## Current status

Phase 7.5 adds a browser-local QR Library to the production-quality, frontend-owned QR Studio:

- typed campaign context and visual configuration kept separate from historical QR facts;
- absolute HTTPS destination validation and immediate matrix-backed SVG preview;
- square, rounded and dot modules with restrained finder, color, gradient and logo controls;
- deterministic contrast, quiet-zone and logo-coverage guidance;
- SVG export from the canonical preview and 1024 × 1024 client-side PNG rasterization;
- create, reopen, update, duplicate, export and confirmed-delete workflows behind a typed `QrRepository`;
- a versioned, defensively validated `LocalStorageQrRepository` with explicit local-only semantics;
- clean separation between user-saved QR codes and immutable scenario QR definitions.

The Explorer continues to provide:

- committed campaign, channel, location, device and UTC date filters serialized into shareable URLs;
- separate draft filters with deliberate Apply and Reset actions;
- a dominant Apache ECharts event/QR timeline and ranked categorical breakdown;
- route-backed drilldown from timeline buckets and additive cross-filtering from breakdown bars;
- optional previous-period summary comparison using Analytics Core comparison results;
- a shareable Breakdown/Funnel/Temporal workspace with a typed page-view → registration → conversion journey;
- a Monday-first weekday × hour heatmap with explicit UTC `[hour, next hour)` semantics;
- deterministic, explainable temporal insights derived only from the returned aggregate;
- exact semantic table alternatives for every chart;
- coherent asynchronous publication of summary, timeline and breakdown results;
- the existing 100K default and explicit 1M showcase profiles.

Browser Back/Forward and direct URL reload restore the committed query. Existing complete results remain visibly marked while a newer query is pending; partial result generations are never mixed. Saved QR assets contain configuration only: Studio editing and persistence never mutate the deterministic analytics dataset or claim scan analytics.

## Architecture boundaries

Nuxt runs in client-rendered mode (`ssr: false`) because EventScope is a data-intensive application shell without server-owned data or an SEO requirement. No server functionality exists solely to justify the framework.

Vue depends on an `AnalyticsGateway`, not Worker protocol details. In this self-contained portfolio demo the gateway uses the Phase 4 Worker, columnar runtime and deterministic local dataset. A production implementation could provide the same boundary through an HTTP analytics API and backend event store; sending one million source events to a browser is not presented as a production SaaS recommendation.

Charts use direct modular Apache ECharts 6 integration—line/bar/heatmap, tooltip, grid, visual scale, legend and canvas modules only. Analytics results are mapped into immutable presentation models before chart options are built; no aggregation happens in the visualization layer. The heatmap is one lazy Gateway/Worker operation that returns all 168 cells. Its small insight rule set is deterministic and thresholded; it is not ML, statistical significance or anomaly detection. No universal indexes, cache, `SharedArrayBuffer`, backend or server-owned analytics were added.

See [Analytics Core](docs/analytics-core.md) for the execution boundary and measure semantics.
See [QR Studio](docs/qr-studio.md) for rendering, validation, export and production boundaries.

## Local development

```bash
nvm use
npm ci
npm run dev
```

Node `>=24.15.0 <25` is required and CI uses Node 24.15.0.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Run `npm run benchmark:analytics` for the separate local 10K/100K/1M diagnostic suite. It has no CI timing threshold and is not a product-performance claim.

CI runs the same application quality gates on pushes and pull requests to `main`.

## Roadmap

QR-to-analytics drilldown, tracked redirect creation, cloud persistence, Reports, anomaly detection, recurring weekday/hour filters and saved views remain separate later concerns.

## Provenance

All campaigns, venues, people, source events, and presentation values are fictional. The repository contains no commercial code or customer data.

## License

MIT
