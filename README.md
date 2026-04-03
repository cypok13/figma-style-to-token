# Styles to Variables

> Figma plugin — converts Paint Styles into a 3-tier variable system and rebinds all component nodes automatically.

## What it does

Takes every Paint Style in your Figma file and builds a structured COLOR variable system with three tiers: raw Primitives, Semantic role tokens, and Component-level reference tokens. After creating the collections, the plugin rebinds every node in the file — replacing style references with variable bindings automatically. No manual remapping needed.

## How it works

### Phase 1 — Primitives

Every Paint Style becomes a raw COLOR variable in a `Primitives` collection. Style names are normalized: leading utility segments (`colors`, `palette`, `styles`) are stripped, and colors that don't follow a `Group/Shade` pattern are auto-classified by hue (Red, Orange, Yellow, Green, Teal, Blue, Purple, Pink, Neutral) and lightness into a numeric shade (50–900).

### Phase 2 — Semantic

A `Semantic` collection is created with `Light` and `Dark` modes.

- **Light mode** — each Semantic token aliases its Primitive counterpart.
- **Dark mode** — derived automatically via shade mirroring: `Brand/600` → `Brand/400` using the `1000 - N` rule. When no mirror exists, the dark value is computed via OKLCH inversion. Named invariants override the math for specific tokens (e.g. `foreground/black` always stays `#000000`).

### Phase 3 — Component

A `Component` collection holds `{base}/{role}` reference tokens, each aliasing the corresponding Semantic token. One extra level of indirection above Semantic — enables per-component theming without touching Primitives.

### Phase 4 — Rebind

The plugin traverses every node. For each fill, stroke, or effect referencing a Paint Style, it resolves the matching Semantic or Component variable and binds it using `setBoundVariableForPaint`.

## Results

On a real-world file:

| Primitives | Semantic | Component | Nodes rebound |
|------------|----------|-----------|---------------|
| 166 | 107 | 67 | 4,814 |

## Installation

[Install on Figma Community](https://www.figma.com/community/plugin/figma-style-to-token)

To run locally: clone this repo, open Figma → Plugins → Development → Import plugin from manifest, select `manifest.json`. No build step — the plugin runs directly in the Figma sandbox. Edit `code.js` and `ui.html` directly.

## Contributing

Issues and PRs welcome.

## Author

Built by [Alexander Krasnov](https://notjustsasha.com?utm_source=github&utm_medium=readme&utm_campaign=styles-to-variables) · [@notjustsasha](https://x.com/notjustsasha)
