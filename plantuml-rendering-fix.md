# Fix: PlantUML diagrams not rendering on Android

Status: complete
Date: 2026-11-21

## Root cause addendum (2026-11-21)

The render-path rework below was correct but not sufficient: diagrams (and every
other URI-based expo-image in the app) stayed blank with no `onLoad`/`onError`
because of an upstream incompatibility between Expo SDK 57 modules and
React Native 0.87:

- RN 0.87 moved `Props::rawProps` initialization from the `Props` constructor
  into `ConcreteComponentDescriptor::cloneProps`, which Expo's Android view
  component descriptor overrides, so the props diff dispatched to Java view
  managers was always empty. Every Expo view received no props: expo-image
  never saw its `source` and silently rendered nothing.
- Upstream fix: expo/expo commit `812e177` (PR #49503), released in
  expo-modules-core 58.0.0 (SDK 58). It was never backported to the 57.x line.
- This project runs expo ~57.0.26 with react-native 0.87.1, so the fix is
  backported in `patches/expo-modules-core@57.0.20.patch` (adds
  `shadowNodeProps->initializeDynamicProps(...)` to
  `AndroidExpoViewComponentDescriptor::cloneProps`).

Verified live on the emulator with a fresh debug build: the PlantUML SVG data
URI renders (pixel-verified diagram content where previously the area was
blank), fetch status mapping works (200 + 400 paths), and no rebuild of the JS
is required for future changes to the render path.

## Initial prompt

> i tried opening this puml @resource/test/email-v2-architecture.puml in the
> turnstone on the android phone, but the puml is not being rendered, i tried
> also using custom puml.ai-box.lan but the image is not appearing. test and
> fix it. we should see the rendered svg image in the app whan we open .puml
> file, or get the error message if the puml is not correct

## Diagnosis

The test file's source was pushed through the app's exact URL-encoding
pipeline (deflateRaw + PlantUML alphabet from `plantumlUrlUtil`) and fetched
from both servers, before touching any code:

| Test                                                          | Result                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| Encoded URL of the file at `https://www.plantuml.com/plantuml` | HTTP 200, valid PNG and SVG (112 KB / 37 KB)                |
| Encoded URL of the file at `http://puml.ai-box.lan`            | HTTP 200, valid PNG and SVG                                 |
| Same URL at `https://puml.ai-box.lan`                          | TLS failure: self-signed certificate                       |
| Invalid puml syntax at both servers                            | HTTP 400, body is a rendered "syntax error" image          |

So the encoding and both servers were fine. Every failure was app-side:

1. **Release builds blocked `http://`.** The debug and debugOptimized
   manifest overlays set `android:usesCleartextTraffic="true"`, but the main
   (release) manifest never did, and `android/` is prebuild-generated with no
   plugin setting it. Native image loading (Glide/OkHttp) enforces the
   cleartext policy, so `http://puml.ai-box.lan` silently failed on a release
   APK. This was the "custom server, image not appearing" case.
2. **No HTTP handling in the render path.** `usePlantumlDiagramSource` handed
   the diagram URL straight to `expo-image`. Unreachable server, TLS failure,
   cleartext block, and server errors all collapsed into one generic
   `onError`; the PlantUML server's distinct signals (400 for bad syntax,
   5xx, DNS/TLS errors) were invisible.
3. **Self-signed HTTPS needed a hidden toggle.** `https://puml.ai-box.lan`
   only worked when "Custom render server" AND "Trust self-signed
   certificates" were both enabled (the one path that fetched via
   `react-native-blob-util` with `trusty`); every other combination failed
   with no explanation.
4. **PNG only.** The URL hardcoded `/png/`; the request was to render SVG
   (verified: the installed `expo-image` bundles `androidsvg-aar` plus a
   Glide `SVGModule` and a base64 data-URI loader, so SVG data URIs render on
   Android).

## Changes

| File                                             | Change                                                                                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui-component/plantuml/use-plantuml-diagram-source.ts` | Reworked. The app now always fetches the diagram itself via `react-native-blob-util` (native; web keeps the direct-URL mode) and maps the HTTP status to a `PlantumlDiagramResult` union: 200 renders, 400 renders PlantUML's error image plus a notice, other statuses and network failures produce specific messages. Certificate verification is skipped only when the user enabled the trust-self-signed toggle. The LRU cache is kept, keyed by URL + trust mode. |
| `src/util/plantuml-url-util.ts`                  | `resolveDiagramUrl` now requests `/svg/`. New `resolveDiagramDataUri` sniffs the base64 payload (PNG magic vs anything else) and builds the right `data:` URI.                                                                |
| `src/util/constant.ts`                           | Added `plantuml.pngBase64Prefix`, `pngDataUriPrefix`, `svgDataUriPrefix`.                                                                                                                 |
| `src/lib/insecure-fetch.ts` (+ `.web.ts`)        | Replaced `loadBase64` with `loadBase64Response` returning `{ base64, status }` without throwing on 4xx; added `isBase64FetchSupported` (false on web, which drives the web direct-URL fallback). |
| `src/ui-component/plantuml/plantuml-view.tsx`    | Rendered mode now shows: a spinner while fetching, the failure message per kind, and for invalid sources the PlantUML error image with a notice above it. Image-decode failures keep the generic message. |
| `src/ui-component/markdown/markdown-plantuml.tsx`| Adapted to the new result union: pending/failed fall back to the code fence, otherwise the image renders.                                                                                  |
| `plugins/with-cleartext-traffic.ts` (new)        | Config plugin setting `android:usesCleartextTraffic="true"` on the application element, so release builds behave like debug ones for `http://` LAN servers (and the existing `ws://localhost` SSH relay). Registered in `app.json`. |
| `src/util/plantuml-url-util.contract.yaml`       | Kept all original terms (expectations moved from `/png/` to `/svg/`), added encode vectors verified against the live servers, unwrapped-source encode, empty-source encode, and data-URI sniffing terms. |

## Zoom and pan for rendered diagrams (2026-11-21)

The rendered diagram was pinch-zoomable in theory, but in practice the
`ImagePreview` sat inside the page's vertical `ScrollView`, which stole every
pan gesture once zoomed (and raced the pinch), and the inline frame caps at
70% of the window height, so large diagrams stayed unreadable.

| File                                                        | Change                                                                                                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui-component/file-preview/zoomable-image.tsx` (new)     | Shared zoom/pan image component: focal-point pinch (zooms towards the fingers, 1x to 8x), pan clamped to the real contained image bounds, double-tap to zoom/reset, optional single-tap callback, and an `onZoomChange(isZoomed)` notification. Reset when `uri` changes. |
| `src/ui-component/file-preview/fullscreen-image-viewer.tsx` (new) | Fullscreen dark viewer modal (own `GestureHandlerRootView`, translucent status/navigation bars, close `IconButton`, hardware back closes) wrapping `ZoomableImage`.          |
| `src/ui-component/file-preview/image-preview.tsx`            | Rewritten on top of `ZoomableImage` (same inline frame sizing). New `isExpandable` prop: single tap opens the fullscreen viewer; `onZoomChange` forwarded.                   |
| `src/ui-component/plantuml/plantuml-view.tsx`                | The page `ScrollView` sets `scrollEnabled={!isDiagramZoomed}`: while the diagram is zoomed, pan owns the touch instead of the page scroll (pull-to-refresh pauses too).      |
| `src/ui-component/code-viewer/file-viewer.tsx`               | Same scroll-coordination for image/SVG file previews, also expandable.                                                                                                      |
| `src/ui-component/markdown/markdown-plantuml.tsx`            | Inline markdown diagrams are expandable to fullscreen as well.                                                                                                              |

JS-only change: reload the dev client (no APK rebuild needed).

- Pinch the rendered diagram: it zooms towards the fingers; drag to pan the
  zoomed image (page scrolling resumes after zooming back out).
- Double-tap: zoom to 2.5x / back to fit.
- Single-tap the diagram: fullscreen viewer; pinch/pan there, close with the
  X button or hardware back.

## Verification (2026-11-21)


- Contract suite: 665 tests in 50 files, all passing (`pnpm test:contract`).
- Smoke suite: 60 tests in 11 files, all passing (`pnpm test:smoke`).
- Typecheck: no errors in changed files. The 14 `expo-router` route errors
  are pre-existing on a clean tree (stale expo route typegen, regenerate by
  running metro).
- Lint: prettier + jsonsort pass; eslint is intentionally skipped project-wide
  (typescript-eslint cannot load TypeScript 7, as noted in `release.yml`).
- `pnpm prebuild-android` produces a main manifest containing
  `android:usesCleartextTraffic="true"` exactly once.
- End-to-end simulation of the new pipeline against the live servers:

| Scenario                                                | Pipeline result                                    |
| ------------------------------------------------------- | -------------------------------------------------- |
| The file at `https://www.plantuml.com/plantuml`          | `image`, SVG data URI decodes to `<svg ...`         |
| The file at `http://puml.ai-box.lan`                     | `image`, SVG data URI                               |
| Invalid puml at both servers                             | `invalid-source` + error image                      |
| Unreachable server                                       | `failed`: "Could not reach the PlantUML server..."  |
| `https://puml.ai-box.lan` without trust-self-signed      | `failed`: "Could not reach the PlantUML server..."  |
| `https://puml.ai-box.lan` with trusty (toggle on)        | `image`, SVG data URI                               |

## To test on the phone

Rebuild the APK (both the JS bundle and the manifest changed):

```sh
pnpm android-rebuild        # debug
# or
pnpm android-release        # release APK
```

Then open `resource/test/email-v2-architecture.puml`:

- Default server: diagram renders (SVG), pinch-zoomable.
- Custom server `http://puml.ai-box.lan`: works in release builds now that
  cleartext is allowed.
- Custom server `https://puml.ai-box.lan`: enable Settings, File view,
  "Trust self-signed certificates" (the endpoint uses a self-signed cert).
- A .puml file with syntax errors: shows "The PlantUML source contains
  errors." above PlantUML's own error image.
- Server down / wrong URL: "Could not reach the PlantUML server. Check the
  server URL in settings."
