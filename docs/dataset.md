# Deterministic dataset

EventScope uses a fictional, seeded scenario rather than customer data. The canonical generator owns event creation; Vue and the Explorer never synthesize or aggregate raw facts.

## Reproducibility

The scenario version, seed, profile and ordered event records form the dataset fingerprint. The current `northstar-behavior-v2` scenario retains the default seed `eventscope-reference-2026` and the exact 320, 10K, 100K and 1M profile sizes.

| Profile     |    Events | Fingerprint    |
| ----------- | --------: | -------------- |
| Test        |       320 | `es2-f233d447` |
| Development |    10,000 | `es2-0b946418` |
| Standard    |   100,000 | `es2-e91f0cc3` |
| Showcase    | 1,000,000 | `es2-903683f5` |

Repeating the same scenario, seed and profile returns the same ordered records and fingerprint. Any intentional change to campaign assignment, channel mix, device mix or conversion likelihood must update this versioned evidence.

## Campaign stories

- **Aurora Field Sessions** is a mobile-first field program with strong physical and social discovery.
- **Waypoint Community Tour** is community-led: social, physical and email carry the audience while paid media stays small.
- **Orbit Partner Preview** has a desktop-leaning, partner-heavy audience and the strongest conversion quality.
- **Northstar Launch** remains the largest launch story, including its fixed launch spike, Harbor Hall strength and post-date mobile Safari conversion issue.
- **Skyline Product Forum** is desktop and paid-media heavy, with intentionally weaker conversion efficiency.
- **Horizon Learning Series** is a steady email-and-web program with healthy conversion quality.

These are deterministic product-demo patterns, not statistical claims. Development coverage tests require every campaign to have useful session, conversion and QR evidence; Analytics Core tests prove that every campaign produces visible query results and that the narratives remain distinguishable.

## Date interpretation

The calendar presents English inclusive UTC dates. Explorer converts an inclusive UI range to an Analytics Core half-open range: `[start 00:00 UTC, day-after-end 00:00 UTC)`. Presets, route serialization and reload restoration continue to use this same boundary, including month, year and leap-day transitions.
