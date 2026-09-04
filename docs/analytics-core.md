# Analytics execution architecture

EventScope keeps domain meaning separate from runtime execution:

```text
Explorer route + committed query
        ↓
Analytics Gateway
        ↓
Deterministic EventDataset semantics
        ↓
Phase 3 reference Analytics Core
        ↓
Compiled columnar AnalyticsStorage
        ↓
Equivalent runtime Analytics Core
        ↓
Web Worker adapter + typed protocol
        ↓
Worker-backed gateway implementation
        ↓
Vue presentation
```

Both engines apply the same UTC half-open ranges (`[start, end)`), filter rules, exact distinct counts, conversion eligibility, breakdown ordering, time buckets, funnels and comparisons. Small-fixture differential tests keep the readable reference engine as the semantic oracle.

## Gateway and deployment boundary

The Explorer depends on the promise-based `AnalyticsGateway` contract. Dataset initialization, queries and typed results cross that boundary; presentation components do not know about `postMessage`, correlation IDs or Worker protocol messages.

The portfolio/demo deployment is intentionally self-contained:

```text
Vue Explorer → Analytics Gateway → Web Worker → columnar runtime → local deterministic dataset
```

A production-oriented deployment can keep the UI contract and replace its implementation:

```text
Vue Explorer → Analytics Gateway → HTTP Analytics API → backend analytics service → event store / warehouse
```

The local Worker demonstrates main-thread isolation, typed asynchronous communication, stale-response protection and large-data execution. It is not a recommendation to ship one million raw event records to browsers in a production analytics SaaS.

## Explorer query and visualization boundary

The URL owns committed Explorer state: profile, inclusive UTC dates, campaign/channel/location/device filters, breakdown and measure. A separate draft state changes only when the user applies it. Parsing validates catalog IDs, clamps dates to the fixed reference period, removes duplicates and serializes arrays in stable order. The inclusive UI end date is converted to the Analytics Core's exclusive next-day boundary.

One Explorer coordinator issues summary, adaptive time-series and breakdown requests for a monotonically increasing query generation. It publishes only a complete result set from the current generation. Previous complete results may remain visible with an explicit pending label, but partial generations are never combined.

Aggregated results are converted into immutable timeline and breakdown view models. Direct modular Apache ECharts renders a canvas line chart and horizontal bars; semantic HTML tables contain the same exact values. ECharts owns no analytical aggregation or filtering. The selected modules provide responsive resizing, precise tooltips and a future path to Phase 6 interactions without a Vue-specific wrapper; the Apache-2.0 license is compatible with the repository.

## Storage decision

Reference object records remain the public domain representation. The Worker compiles them into internal columns: `Float64Array` timestamps, `Uint16Array` dictionary codes for categorical dimensions, and `Uint32Array` session/visitor identities. Dictionaries translate query values and breakdown keys without exposing numeric codes to Vue.

The fixed-width columns use 40 bytes per event: approximately 3.81 MiB at 100K and 38.15 MiB at 1M, plus small dictionaries. Compilation also verifies chronological ordering within each session; only a non-chronological input receives a corrective row-order column for reference-equivalent funnels. Generated profiles do not need or retain that column. No universal indexes or preaggregations were added because plain columnar scans meet the measured query target. `SharedArrayBuffer` is intentionally avoided; storage is generated and retained inside one Worker.

The 1M generation path temporarily creates readable event objects before compilation. Repeated local Node measurements observed roughly 286–416 MiB of heap growth during that stage; this is approximate, GC-sensitive and runtime-specific. The source dataset falls out of scope after Worker initialization, and reinitialization drops the previous engine/storage reference before generating its replacement.

## Worker lifecycle and cancellation

The Worker owns generation, integrity validation, compiled storage and execution. It sends only coarse real progress stages, dataset metadata, results and typed errors:

```text
uninitialized → generating → compiling → ready → querying → ready
```

Every request and response has a numeric correlation ID and a discriminated type. Starting a newer request of the same family rejects the older client promise; a late response is ignored. This is logical supersession, not cooperative interruption of an already-running synchronous Worker scan. Initialization/reset invalidates every older request. A runtime failure can recreate and reinitialize the Worker.

## Local benchmark evidence

The storage choice was based on the Phase 3 object-record engine measured before optimization. Representative p50 values from Windows x64 / Node 24.15.0 were:

| Profile | Representation    |     Summary |   Breakdown |  Time series |
| ------- | ----------------- | ----------: | ----------: | -----------: |
| 10K     | reference objects |    11.04 ms |    64.54 ms |    107.57 ms |
| 10K     | columnar runtime  |     1.79 ms |     3.58 ms |      6.32 ms |
| 100K    | reference objects |   146.89 ms |   714.38 ms |  1,113.89 ms |
| 100K    | columnar runtime  |    13.33 ms |    37.92 ms |     41.87 ms |
| 1M      | reference objects | 1,733.92 ms | 8,315.28 ms | 14,662.35 ms |
| 1M      | columnar runtime  |   341.85 ms |   747.57 ms |    769.83 ms |

These are engineering diagnostics from one machine, not portable product-performance claims. The separate benchmark uses one warmup and five measured query iterations at 10K/100K, three at 1M, and reports p50/p95 plus generation, compilation and environment metadata. It also checks scenario direction at every selected scale.

Run `npm run benchmark:analytics` for the columnar 10K/100K/1M suite. Set `EVENTSCOPE_BENCH_ENGINE=reference` and select smaller profiles with `EVENTSCOPE_BENCH_PROFILES` when reproducing the before baseline. Benchmarks are deliberately excluded from normal CI.

Generation remains seeded and uses the same scenario logic for every profile. Session generation now streams into the event collection, and fingerprinting incrementally applies the existing stable hash rather than constructing one giant serialized string. Full integrity validation remains enabled for all generated profiles.
