# Fonts

Every font bundled with Inkwell (DESIGN_SPEC §7.11), with its licence. Each one was checked against its package's `metadata.json` and `LICENSE` when it was added. All are under the [SIL Open Font License 1.1](https://openfontlicense.org), which allows bundling them with software. Each package's `LICENSE` file holds its copyright notice and the licence text.

Only the Latin and Latin Extended subsets are bundled (see `src/styles/fonts.css`).

| Font | Group | Package | Styles | Licence |
|---|---|---|---|---|
| Newsreader | Serif | `@fontsource-variable/newsreader` | Variable, upright and italic | OFL 1.1 |
| EB Garamond | Serif | `@fontsource-variable/eb-garamond` | Variable, upright and italic | OFL 1.1 |
| Libre Baskerville | Serif | `@fontsource-variable/libre-baskerville` | Variable, upright and italic | OFL 1.1 |
| Crimson Pro | Serif | `@fontsource-variable/crimson-pro` | Variable, upright and italic | OFL 1.1 |
| Literata | Serif | `@fontsource-variable/literata` | Variable, upright and italic | OFL 1.1 |
| Lora | Serif | `@fontsource-variable/lora` | Variable, upright and italic | OFL 1.1 |
| Source Serif 4 | Serif | `@fontsource-variable/source-serif-4` | Variable, upright and italic | OFL 1.1 |
| Cormorant Garamond | Serif | `@fontsource-variable/cormorant-garamond` | Variable, upright and italic | OFL 1.1 |
| Geist | Sans | `geist` | Variable, upright | OFL 1.1 |
| Inter | Sans | `@fontsource-variable/inter` | Variable, upright and italic | OFL 1.1 |
| IBM Plex Sans | Sans | `@fontsource-variable/ibm-plex-sans` | Variable, upright and italic | OFL 1.1 |
| Work Sans | Sans | `@fontsource-variable/work-sans` | Variable, upright and italic | OFL 1.1 |
| Atkinson Hyperlegible | Sans | `@fontsource/atkinson-hyperlegible` | 400 and 700, upright and italic | OFL 1.1 |
| Geist Mono | Mono | `geist` | Variable, upright | OFL 1.1 |
| JetBrains Mono | Mono | `@fontsource-variable/jetbrains-mono` | Variable, upright and italic | OFL 1.1 |
| IBM Plex Mono | Mono | `@fontsource/ibm-plex-mono` | 400 and 700, upright and italic | OFL 1.1 |
| Courier Prime | Typewriter | `@fontsource/courier-prime` | 400 and 700, upright and italic | OFL 1.1 |
| Cutive Mono | Typewriter | `@fontsource/cutive-mono` | 400, upright only | OFL 1.1 |
| Caveat | Handwriting | `@fontsource-variable/caveat` | Variable, upright only | OFL 1.1 |
| Patrick Hand | Handwriting | `@fontsource/patrick-hand` | 400, upright only | OFL 1.1 |

Fonts without an italic are slanted by the browser when italic is used.

## Adding a font

1. Check that the font is under the OFL (or another licence that allows bundling).
2. Add its `@fontsource` package, preferring `@fontsource-variable`.
3. Copy its Latin and Latin Extended `@font-face` rules into `src/styles/fonts.css`.
4. Add it to `FONTS` in `src/domain/fonts.ts` and to the table above.
