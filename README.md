# EventScope

EventScope is a portfolio product concept for exploring event engagement, organizing tracked QR touchpoints, and composing decision-ready reports. The current fictional product story centers on **Northstar Launch**.

## Current status

Phase 3 adds a real, framework-independent Analytics Core behind the Nuxt 3 application shell:

- deterministic filtering across every source-backed event dimension;
- exact event, session, visitor, conversion, conversion-rate, and QR-scan measures;
- categorical breakdowns, continuous UTC time buckets, ordered session funnels, and period comparisons;
- stable normalized queries, result metadata, and typed request errors;
- the seeded 320-event test and 10,000-event development profiles from Phase 2;
- scenario-level assertions proving launch, location, device, and channel stories through real queries.

The Explorer reads its summary, daily timeline, and location contribution from the Analytics Core through a small composable adapter. QR-library scan cards remain presentation-only examples and are isolated accordingly.

## Architecture boundaries

Nuxt runs in client-rendered mode (`ssr: false`) because EventScope is a data-intensive application shell without server-owned data or an SEO requirement. No server functionality exists solely to justify the framework.

The engine deliberately uses readable event scans and exact `Set` operations. Web Workers, typed-array storage, indexes, caches, chart libraries, real QR rendering, exports, backend services, and million-event datasets are deferred.

See [Analytics Core](docs/analytics-core.md) for the execution boundary and measure semantics.

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

Run `npm run benchmark:analytics` for a local 10K diagnostic baseline. It has no CI timing threshold and is not a product-performance claim.

CI runs the same application quality gates on pushes and pull requests to `main`.

## Roadmap

Phase 4 can benchmark and optimize storage/execution internals without changing the analytical semantics established here.

## Provenance

All campaigns, venues, people, source events, and presentation values are fictional. The repository contains no commercial code or customer data.

## License

MIT
