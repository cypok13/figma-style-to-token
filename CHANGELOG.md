# Changelog

All notable changes to Styles to Variables will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.2] - 2026-05-21

### Fixed
- Plugin UI no longer triggers 36 CSP violations during load (Figma review request ID 1897436). Root cause: Figma's plugin runtime preloads `https://static.figma.com/webfont/1/Inter-*.woff` font faces into the plugin iframe, and our manifest's `allowedDomains: ["none"]` blocked the request at the network-access layer while CSP `default-src 'none'` blocked it again at the CSP layer.
- `manifest.json`: `networkAccess.allowedDomains` is now `["https://static.figma.com"]` with a `reasoning` field; `manifest.dev.json` mirrored.
- `ui.html` CSP: `font-src` now includes `'self' data: https://static.figma.com` (replacing the previous fallback to `default-src 'none'`).
- `ui.html`: all `font-family` declarations reduced to `system-ui, sans-serif` (defense in depth — avoids any non-generic font resolution path).

### Added
- `dev/csp-smoke-test.js`: Playwright-based CSP smoke test (`mcr.microsoft.com/playwright:v1.60.0-noble`). Runs in CI/dev to catch CSP violations in `ui.html` itself.

### Notes for future submissions
- The smoke test cannot reproduce Figma-runtime-injected resources (like the Inter preload). Always verify in **Figma Desktop DevTools** before submitting — this is the only surface where host-injected requests are visible.
- v1.0.1's hypothesis that the violation came from `'Inter'` in our CSS was wrong; it came from Figma's own preload.

### Reviewer error (verbatim from request 1897436)
> Loading the font '<URL>' violates the following Content Security Policy directive: "default-src 'none'". Note that 'font-src' was not explicitly set, so 'default-src' is used as a fallback. The action has been blocked.

## [1.0.1] - 2026-05-12

### Fixed
- CSP: removed `'Inter'` from font-family stacks; Figma's plugin sandbox CSP (`default-src 'none'`) was rejecting the implicit font load (36 violations during review).
- API: published the async-API migration (`figma.getLocalPaintStylesAsync` and siblings) — required by `documentAccess: dynamic-page`. Local code was already migrated (commit `efe1a95`, 2026-04-03) but never published.
- Console: removed all `console.*` calls from production paths. User-facing errors continue via `figma.ui.postMessage`.

### Added
- Pre-flight plan check: detects single-mode Variable quota (Starter / Free plan) at scan time and shows a dedicated modal instead of failing mid-run during Semantic collection build.

### Notes
- `editorType` remains `["figma"]` — plugin writes Variables, which is incompatible with Dev Mode (BUG-11 reviewed, no change).
- `figma.skipInvisibleInstanceChildren = false` retained — required to bind tokens on hidden component states (BUG-12 reviewed, no change).
- `event.source` guard on UI message listener intentionally omitted: Figma Desktop's Electron bridge delivers an unpredictable source reference; the `pluginMessage` wrapper is the only reliable filter and the plugin sandbox iframe is already origin-isolated (BUG-06 reviewed, no change).

## [1.0.0] - 2026-04-01

### Added
- Convert paint styles to base color variables (Primitives collection)
- Semantic variable collection with light/dark mode aliases
- Component variable collection with role-based reference tokens
- Dark mode support via shade mirror aliases (1000-N rule)
- Invariant dark tokens (foreground/black, foreground/white, base/white)
- Automatic node rebinding to semantic variables
- Sandbox mode for safe testing without modifying the document
- Statistics dashboard with conversion results
- Built-by attribution link to notjustsasha.com
