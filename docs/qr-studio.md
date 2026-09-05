# QR Studio architecture

## Boundary

Phase 7 is a local editor and export surface. `QrStudioDraft` is intentionally separate from the scenario's immutable `QRCodeDefinition`; changing a campaign, destination or design never adds or rewrites analytical events. The stable draft identity and campaign/channel/location IDs leave a clean seam for a later QR ID → AnalyticsQuery connection, but Phase 7 does not implement that connection.

In a production system the frontend would own visual configuration, preview, local guidance and explicit export actions. A backend would normally own authorization, persistence, tracked short-URL creation, redirect resolution and scan/event ingestion. EventScope encodes the configured HTTPS destination directly and does not pretend to create a tracked redirect.

## Rendering pipeline

```text
QrStudioDraft
  → pure validation
  → qrcode-generator matrix
  → EventScope SVG renderer
  → SVG preview / SVG Blob / client-side PNG rasterization
```

`qrcode-generator` is a small MIT matrix encoder with no runtime dependencies. EventScope uses only its auto-version, byte-mode matrix API with `H` error correction. The dependency does not own editor state, SVG, visual styling or export.

The canonical SVG is deterministic: it uses no timestamps or random IDs, and its optional gradient ID is derived from the gradient configuration. The browser displays that exact SVG string through an encoded image data URI. SVG export wraps the same string in a Blob; PNG export loads that SVG into an image and draws it once to a 1024 × 1024 canvas. Source image URLs are revoked in `finally` blocks; download URLs are revoked through an explicit next-task cleanup so the browser can first claim the download. No second QR renderer exists.

User destinations are encoded into the matrix but never interpolated into SVG or HTML. The only user-facing SVG text—the accessible title—is XML-escaped. Colors are accepted only as six-digit hex values, and the logo is a fixed built-in EventScope mark; there is no remote image fetching or raw SVG injection.

## Validation and guidance

`validateQrDefinition` is pure and returns typed issues. It requires an absolute HTTPS URL, a quiet zone of at least two modules, valid opaque colors and a logo no larger than 20% of matrix width. A four-module quiet zone is recommended. The default center mark occupies 16%.

Contrast uses sRGB relative luminance and `(lighter + 0.05) / (darker + 0.05)`. For gradients, the lower endpoint-to-background ratio is reported. Ratios below 3:1 are errors; ratios below 4.5:1 are cautions. These deterministic checks are transparent design guidance, not scanner certification.

Invalid drafts leave every editor control available but pause preview generation and disable export. Destination whitespace is trimmed on blur; otherwise valid URLs are not normalized or rewritten.

## Deliberately deferred

- backend redirect and URL-shortening services;
- persistence, authentication and saved-asset CRUD;
- QR analytics integration and scan ingestion;
- remote or uploaded logos;
- camera scanning, batch generation and dynamic redirects;
- report, PDF and presentation generation.
