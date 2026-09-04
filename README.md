# EventScope

EventScope is a portfolio product concept for exploring event engagement, organizing tracked QR touchpoints, and composing decision-ready reports. The current fictional product story centers on **Northstar Launch**.

## Current status

Phase 4 adds a large-dataset execution layer behind the stable Phase 3 analytical semantics:

- deterministic 320, 10K, 100K and 1M dataset profiles using one scenario model;
- a dictionary-encoded columnar runtime with equivalent summary, breakdown, time-series, funnel and comparison results;
- generation, storage and analytical execution inside a dedicated browser Worker;
- a typed asynchronous protocol with correlation IDs, logical supersession and failure recovery;
- benchmark-driven storage evidence without CI timing thresholds or marketing claims;
- scenario-level assertions at 10K, 100K and the local 1M benchmark scale.

Explorer defaults to the measured 100K profile and exposes an honest 1M showcase option. Existing results stay visible while a new query/profile is pending. QR-library scan cards remain presentation-only examples and are isolated accordingly.

## Architecture boundaries

Nuxt runs in client-rendered mode (`ssr: false`) because EventScope is a data-intensive application shell without server-owned data or an SEO requirement. No server functionality exists solely to justify the framework.

Readable event records remain the domain/correctness model. Runtime execution compiles dedicated typed columns inside the Worker; numeric encodings never reach Vue. No universal indexes, cache, `SharedArrayBuffer`, server functionality or third-party data engine was added.

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

Phase 5 can expand Explorer interaction and visualization while reusing the Worker execution boundary established here.

## Provenance

All campaigns, venues, people, source events, and presentation values are fictional. The repository contains no commercial code or customer data.

## License

MIT
