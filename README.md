# EventScope

EventScope is a portfolio product concept for exploring event engagement, organizing tracked QR touchpoints, and composing decision-ready reports. The current fictional product story centers on **Northstar Launch**.

## Current status

Phase 6A deepens the focused Explorer into a visualization-led analytical workflow:

- committed campaign, channel, location, device and UTC date filters serialized into shareable URLs;
- separate draft filters with deliberate Apply and Reset actions;
- a dominant Apache ECharts event/QR timeline and ranked categorical breakdown;
- route-backed drilldown from timeline buckets and additive cross-filtering from breakdown bars;
- optional previous-period summary comparison using Analytics Core comparison results;
- a shareable Breakdown/Funnel workspace with a typed page-view → registration → conversion journey;
- exact semantic table alternatives for every chart;
- coherent asynchronous publication of summary, timeline and breakdown results;
- the existing 100K default and explicit 1M showcase profiles.

Browser Back/Forward and direct URL reload restore the committed query. Existing complete results remain visibly marked while a newer query is pending; partial result generations are never mixed. QR-library scan cards remain presentation-only examples and are isolated accordingly.

## Architecture boundaries

Nuxt runs in client-rendered mode (`ssr: false`) because EventScope is a data-intensive application shell without server-owned data or an SEO requirement. No server functionality exists solely to justify the framework.

Vue depends on an `AnalyticsGateway`, not Worker protocol details. In this self-contained portfolio demo the gateway uses the Phase 4 Worker, columnar runtime and deterministic local dataset. A production implementation could provide the same boundary through an HTTP analytics API and backend event store; sending one million source events to a browser is not presented as a production SaaS recommendation.

Charts use direct modular Apache ECharts 6 integration—line/bar, tooltip, grid, legend and canvas modules only. Analytics results are mapped into immutable presentation models before chart options are built; no aggregation happens in the visualization layer. No universal indexes, cache, `SharedArrayBuffer`, backend or server-owned analytics were added.

See [Analytics Core](docs/analytics-core.md) for the execution boundary and measure semantics.

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

Phase 6B can add a day/hour heatmap and other deliberately scoped exploration depth. Anomaly detection, custom comparison ranges, saved views, QR Studio and Reports remain separate later concerns.

## Provenance

All campaigns, venues, people, source events, and presentation values are fictional. The repository contains no commercial code or customer data.

## License

MIT
