# Styles to Variables

> Figma plugin — converts Paint Styles into a 3-tier variable system and rebinds all component nodes automatically.

## What it does

Takes every Paint Style in your Figma file and converts it into a structured COLOR variable system with three tiers: raw Primitives, Semantic role tokens, and Component-level reference tokens. After building the variable collections, the plugin rebinds every node in the file — automatically replacing style references with variable bindings using `setBoundVariableForPaint`.

## How it works

### Phase 1 — Primitives

Every Paint Style becomes a raw COLOR variable in a `Primitives` collection under a single `Value` mode. Style names are normalized: leading utility segments (`colors`, `palette`, `styles`) are stripped, and colors that don't already follow a `Group/Shade` pattern are auto-classified by hue (Red, Orange, Yellow, Green, Teal, Blue, Purple, Pink, Neutral) and lightness into a numeric shade (50–900). A `primsByName` lookup map is built for use in subsequent phases.

### Phase 2 — Semantic

A `Semantic` collection is created with two modes: `Light` and `Dark`.

- **Light mode** — each Semantic token is a `VARIABLE_ALIAS` pointing to its Primitive counterpart.
- **Dark mode** — derived automatically via shade mirroring: `Brand/600` → `Brand/400` using the `1000 - N` rule. When no mirror Primitive exists, the dark value is computed via OKLCH color space inversion (preserving hue and chroma, inverting lightness). A set of named invariants overrides the math for specific tokens (e.g. `foreground/black` always stays `#000000`).

### Phase 3 — Component

A `Component` collection holds `{base}/{role}` reference tokens. Each Component variable is a `VARIABLE_ALIAS` pointing to the corresponding Semantic token — one level of indirection above Semantic, enabling per-component theming without touching Primitives.

### Phase 4 — Rebind

The plugin traverses every node in the file. For each fill, stroke, or effect that references a Paint Style, it resolves the matching Semantic (or Component) variable via a `role|styleId` lookup and calls `setBoundVariableForPaint` to replace the style binding with a variable binding. Scope options control which node types are included.

## Results (Untitled UI FREE)

| Primitives | Semantic | Component | Nodes rebound |
|------------|----------|-----------|---------------|
| 166 | 107 | 67 | 4,814 |

## Installation

Coming soon to Figma Community.

To run locally: clone this repo, open Figma → Plugins → Development → Import plugin from manifest, select `manifest.json`. No build step needed — the plugin runs directly in the Figma sandbox.

## Contributing

Issues and PRs welcome. Plugin code runs in the Figma plugin sandbox — no build step needed, edit `code.js` and `ui.html` directly.

## Author

Built by [Alexander Krasnov](https://notjustsasha.com?utm_source=github&utm_medium=readme&utm_campaign=styles-to-variables) · [@notjustsasha](https://x.com/notjustsasha)
