# Localization boundary

EventScope ships one unprefixed route surface in English and Russian through `@nuxtjs/i18n`. English is the deterministic first-visit default. A language change happens in place, without navigation, and the selected locale is restored from the dedicated `eventscope:locale` local-storage key. Missing, unsupported or inaccessible stored values fall back safely to English.

Translation resources live in `i18n/locales`. They cover navigation, document metadata, Explorer controls and result presentation, QR Studio and Library, Reports, Methodology, empty/error/loading states, accessibility labels and the custom calendar. Locale-aware `Intl` formatters handle visible dates and numbers.

Localization is a presentation concern. The following remain locale-neutral:

- normalized `AnalyticsQuery` values, Worker messages and Analytics Core results;
- deterministic dataset generation, IDs and fingerprints;
- QR definitions, validation codes and canonical SVG/PNG output;
- report job contracts, section identifiers and lifecycle states.

UI adapters translate stable codes and format copied values after those boundaries. Switching language therefore does not execute a new analytics query, alter URL-backed filters, reset an editor draft, mutate saved browser data or change a generated artifact.

The bundled sample PDF is a static, backend-owned demonstration artifact. Changing the UI locale does not regenerate or translate it.

The test suite verifies catalog parity, defensive persistence, in-place switching, localized calendar/formatting behavior, unprefixed routing and deterministic QR output across locale changes.
