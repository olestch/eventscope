# EventScope

EventScope is an event-intelligence studio for exploring engagement, connecting deterministic Scenario QR identities to analytics, designing browser-local QR assets and composing asynchronous report jobs. It is a fictional, self-contained portfolio product built without customer data or commercial source code.

Its pure TypeScript reference semantics are differentially tested against a columnar runtime that executes deterministic datasets of up to one million events in a Web Worker. The same application shell demonstrates canonical QR rendering, typed report jobs and a persistent English/Russian UI.

## Product areas

- **Explorer** — URL-backed filters, summary metrics, previous-period comparison, timeline and categorical drilldown, an ordered session funnel, and a UTC weekday × hour heatmap with explainable aggregate insights.
- **QR Studio** — deterministic matrix-backed SVG rendering, readability guidance, a versioned local repository, saved-asset CRUD, and SVG/PNG export through one canonical renderer.
- **Reports** — a typed asynchronous job workflow that reuses Explorer's normalized analytical scope and demonstrates queued, processing, ready, failed and retry states.
- **Methodology** — an in-product account of semantic choices and the boundary between demonstrated frontend behavior and production-owned services.

## Technology

Nuxt 3, Vue 3, TypeScript, `@nuxtjs/i18n`, SCSS, Apache ECharts 6, Web Workers, TypedArrays, Vitest and Vue Test Utils. The application uses client rendering (`ssr: false`): it is a data-intensive application shell with no server-owned data or SEO requirement, so no server functionality exists solely to justify Nuxt.

## Technical highlights

- A pure TypeScript Analytics Core defines filtering, distinct counts, conversion eligibility, adaptive UTC bucketing, funnels, comparisons and continuous temporal results independently of Nuxt, Vue, Workers and charts.
- A typed `AnalyticsGateway` separates Vue from Worker protocol details. The Worker owns deterministic generation, columnar compilation and analytics execution.
- The URL is the canonical committed Explorer query; draft controls apply deliberately and Back, Forward or reload restore the same analytical question.
- A generation coordinator publishes related results atomically. Superseded responses cannot mix old summary, timeline, breakdown, funnel or heatmap data with a newer query.
- Direct modular ECharts imports are loaded only when a chart mounts. Every chart has an exact semantic table alternative, and presentation models perform no raw-event aggregation.
- QR preview, Library export, SVG download and PNG rasterization all consume the same deterministic SVG renderer.
- Saved QR configuration and immutable Scenario QR analytics identities are intentionally different domain concepts.
- English and Russian share one unprefixed route surface. Locale preference is restored locally; dates, numbers and accessibility labels are localized at the presentation boundary while analytics queries, QR artifacts and report contracts remain language-neutral.

## Architecture

```text
Explorer route + controls
          │ normalized AnalyticsQuery
          ▼
Vue presentation ──► AnalyticsGateway ──► Web Worker
                                              │
                         deterministic dataset + columnar storage
                                              │
                                              ▼
                                   pure Analytics Core runtime
```

```text
QR Studio draft ──► validation ──► QR matrix ──► canonical SVG
                                                       ├─ preview
                                                       ├─ SVG export
                                                       └─ PNG rasterization

Saved QR ──► typed QrRepository ──► versioned browser localStorage
Scenario QR ──► deterministic catalog identity ──► Explorer filter
```

Reports place the same normalized `AnalyticsQuery` inside a typed request:

```text
Reports UI ──► ReportsGateway ──► asynchronous job contract
```

The included adapter is deterministic and session-only. A production adapter would call a backend report service; it would not move report generation into Vue.

## Demo and production boundary

| Demonstrated locally                                         | Production-owned boundary                                 |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Seeded fictional event generation and fingerprints           | Authenticated event ingestion and durable storage         |
| Worker-backed analytics over 100K or 1M events               | Analytics API and warehouse/event store                   |
| Browser-local saved QR configuration                         | Accounts, shared persistence and cloud sync               |
| Direct HTTPS QR destination and Scenario QR analytics        | Tracked redirects, scan ingestion and attribution service |
| Session-only report jobs and one clearly labelled sample PDF | Backend rendering, protected storage and signed delivery  |
| Deterministic temporal rules over aggregates                 | Statistical anomaly detection or forecasting              |
| Browser-local English/Russian UI preference                  | Localized backend content where explicitly supported      |

The 1M profile is an explicit showcase of the local architecture, not a recommendation to ship one million source events to a production browser client.

Localization applies to application presentation. User-authored values and generated or backend-owned artifacts are not automatically translated.

## Analytics semantics

- Engine ranges are UTC half-open intervals: `[start, end)`. The calendar presents inclusive UTC dates and converts the selected end day to the next exclusive midnight.
- Filters are OR within one dimension and AND across dimensions.
- Sessions and visitors are counted distinctly. Conversions are deduplicated by eligible session; conversion rate divides converted sessions by eligible page-view/QR sessions.
- Funnels evaluate ordered events within a session. Previous-period comparison uses the equal-duration interval immediately before the primary range; a zero baseline yields no percentage delta.
- Temporal results always contain the complete Monday-first 7 × 24 topology, including explicit zero cells.

## Performance evidence

`npm run benchmark:analytics` runs a local diagnostic over the 10K development, 100K standard and 1M showcase profiles. It records generation, compilation, analytical-column size and warm-query p50/p95 for summary, filtered and QR-filtered queries, breakdown, timeline, temporal heatmap, funnel and comparison. The suite has no CI timing threshold because results vary by hardware and runtime; the measurements are engineering evidence, not portable performance claims.

The fixed-width analytical columns use 40 bytes per event: approximately 3.81 MiB at 100K and 38.15 MiB at 1M, plus small dictionaries. The chart runtime is a separate lazy chunk; the production build reports it independently from initial route code.

One Windows x64 / Node 24.15.0 run generated the 1M dataset in about 5.36 s, compiled it in 1.01 s and observed approximately 255 MiB of heap growth during generation. Warm-query p50 values were 395 ms for summary, 30 ms for QR-filtered summary, 807 ms for breakdown, 797 ms for time series, 612 ms for funnel and 1.13 s for the complete 168-cell heatmap. Treat these figures as a reproducible local snapshot, not a product SLA.

Detailed runtime decisions and reproducible historical measurements are in [docs/analytics-core.md](docs/analytics-core.md).

## Run locally

Node `>=24.15.0 <25` is required; CI uses Node 24.15.0.

```bash
nvm use
npm ci
npm run dev
```

Open the URL printed by Nuxt. The default Explorer loads the standard 100K profile; choose **Showcase · 1M events** deliberately from the dataset control.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run benchmark:analytics
git diff --check
```

Vitest covers domain semantics, differential reference/runtime behavior, Worker and Gateway lifecycle, stale-response protection, route restoration, presentation models, QR persistence/rendering/export, Reports jobs, translation-catalog parity, locale persistence and language-neutral domain output. CI runs the non-benchmark application gates for pushes and pull requests to `main`.

## Code tour

- [`domain/analytics`](domain/analytics) — semantic contracts, reference engine, columnar storage and equivalent runtime.
- [`workers`](workers) and [`services/analytics`](services/analytics) — typed protocol, lifecycle and application gateway.
- [`features/explorer`](features/explorer) — route normalization, result coordination and presentation models.
- [`features/qr`](features/qr), [`domain/qr`](domain/qr) and [`services/qr`](services/qr) — QR domain, canonical rendering, local repository and exports.
- [`domain/reports`](domain/reports) and [`services/reports`](services/reports) — asynchronous report contracts and deterministic demo adapter.
- [`i18n`](i18n), [`plugins/locale.client.ts`](plugins/locale.client.ts) and [`docs/localization.md`](docs/localization.md) — bilingual presentation resources, local preference restore and the locale-neutral domain boundary.
- [`docs`](docs) — dataset, analytics, QR and reporting architecture notes.

## Screenshots

The strongest portfolio captures are the Explorer timeline at 100K, the 1M temporal heatmap, QR Studio with Center Mark enabled, the local QR Library, and a ready report job. Capture them from a production build at desktop and mobile widths so route state, local-only labels and responsive behavior remain visible; no static screenshots are committed to avoid presenting stale UI.

## Provenance

All campaigns, venues, people, source events and presentation values are fictional. The repository contains no customer data, secrets, private URLs or commercial code.

## License

MIT
