# Analytics Core

EventScope Phase 3 keeps analytical semantics independent from its delivery mechanism:

```text
Generated immutable dataset
        ↓
Pure TypeScript Analytics Core
        ↓
Nuxt composable adapter
        ↓
Vue presentation
```

The core applies UTC half-open ranges (`[start, end)`), AND across filter dimensions, and OR within a dimension. It returns raw numeric summary, breakdown, time-series, funnel, and comparison results with normalized queries and dataset identity metadata.

Conversions are distinct converted sessions. Conversion rate divides those sessions by eligible sessions containing a matching page view or QR scan; the event-type filter cannot turn a conversion-only query into an automatic 100% rate.

The implementation intentionally performs straightforward event scans and exact `Set`-based distinct counts. It has no Vue/Nuxt imports, worker protocol, index, cache, pre-aggregation, or chart dependency. Phase 4 can benchmark and replace these internals without changing the public analytical contracts.

Run `npm run benchmark:analytics` for a local diagnostic baseline across the 10,000-event dataset. Timings are informational only and have no CI threshold or product-performance meaning.
