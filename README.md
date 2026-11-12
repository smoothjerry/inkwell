# Inkwell

[![CI](https://github.com/smoothjerry/inkwell/actions/workflows/ci.yml/badge.svg)](https://github.com/smoothjerry/inkwell/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

A fast, minimal, local-first desktop word processor with a built-in weekly writing streak.

Set a weekly word-count goal, write, and watch the streak grow. Everything stays on your machine: no account, no network calls.

> **Status:** early development. Milestones M0 to M3 are done: you can organize documents in folders, write in a rich-text editor with Markdown shortcuts, and see word counts, with writing sessions recorded locally. Goals, the streak, and stats arrive in later milestones. See the [design spec](docs/DESIGN_SPEC.md#11-milestones-build-order).

## Stack

- **Shell:** [Tauri 2](https://tauri.app) (Rust)
- **UI:** React 19, TypeScript (strict), Vite
- **Styling:** Tailwind CSS v4, shadcn/ui, Geist Sans and Geist Mono (bundled locally), Lucide icons
- **State:** Zustand
- **Tooling:** pnpm, Biome, Vitest, lefthook, GitHub Actions

## Getting started

Prerequisites:

- [Node.js](https://nodejs.org) 22 or newer
- [pnpm](https://pnpm.io) 12
- [Rust](https://rustup.rs) stable, with `clippy` and `rustfmt`
- The [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS

```bash
pnpm install
pnpm tauri dev
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm tauri dev` | Run the desktop app with hot reload |
| `pnpm tauri build` | Build a release bundle |
| `pnpm dev` | Run only the web UI at `http://localhost:1420` |
| `pnpm biome check` | Lint and check formatting (`pnpm format` to fix) |
| `pnpm typecheck` | Type-check with `tsc` |
| `pnpm test` | Run unit tests with Vitest |

Rust checks run from `src-tauri/`:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## Project layout

```
src/
  app/            App shell, theme handling
  components/ui/  shadcn/ui components
  lib/            Shared helpers
  stores/         Zustand stores
  styles/         Design tokens and global CSS
src-tauri/        Rust shell (Tauri)
docs/             Design spec, architecture, ADRs
```

More folders (`features/`, `domain/`, `lib/db/`) are added as their milestones land. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

- [Design spec](docs/DESIGN_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture decision records](docs/adr/)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
