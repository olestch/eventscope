# EventScope

EventScope is a portfolio product concept for exploring event engagement, organizing tracked QR touchpoints, and composing decision-ready reports. The current fictional product story centers on **Northstar Launch**.

## Current status

Phase 2 establishes the source-data semantics behind the Nuxt 3 application shell:

- explicit campaign, channel, source, location, asset, QR, event, report, and analytics contract modules;
- an inspectable reference catalog with six campaigns and 36 tracked assets;
- seeded, versioned synthetic session journeys in fixed UTC time;
- exact profiles of 320 test events and 10,000 development events;
- deterministic fingerprints and structured integrity validation;
- tested scenario patterns for launch traffic, location strength, device conversion friction, channel quality, and time distribution.

The Explorer reads catalog and dataset metadata through a provider boundary. Its displayed metrics and SVG timeline remain a clearly named Phase 1 presentation snapshot until the Analytics Core exists; Vue components do not perform ad hoc aggregation.

## Architecture boundaries

Nuxt runs in client-rendered mode (`ssr: false`) because EventScope is a data-intensive application shell without server-owned data or an SEO requirement. No server functionality exists solely to justify the framework.

Phase 2 deliberately uses readable in-memory event records and pure deterministic functions. Analytics execution, aggregation, Web Workers, typed-array storage, indexes, caches, chart libraries, real QR rendering, exports, backend services, and million-event benchmarks are deferred.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

CI runs the same application quality gates on pushes and pull requests to `main`.

## Roadmap

The next phase can implement Analytics Core execution against the stable query/result contracts. Storage and worker optimizations remain later, benchmark-driven work.

## Provenance

All campaigns, venues, people, source events, and presentation values are fictional. The repository contains no commercial code or customer data.

## License

MIT
