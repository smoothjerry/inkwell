# Inkwell

[![CI](https://github.com/smoothjerry/inkwell/actions/workflows/ci.yml/badge.svg)](https://github.com/smoothjerry/inkwell/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

A fast, minimal, local-first desktop word processor with a built-in weekly writing streak.

Set a weekly word-count goal, write, and watch the streak grow. Everything stays on your machine: no account, no network calls.

> **Status:** feature-complete, not yet released. All milestones, M0 to M9, are done: you can organize and search documents, write in a rich-text editor with Markdown shortcuts and focus modes, set a weekly word goal, keep a streak, review your stats and achievements, and import and export your writing, all saved locally. There are no published installers yet; see [Releasing](#releasing) for how they are built. See the [design spec](docs/DESIGN_SPEC.md#11-milestones-build-order).

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
| `pnpm install:local` | Build the app and install it in `/Applications` (macOS) |
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

### Using Inkwell day to day (macOS)

`pnpm install:local` builds a release copy of Inkwell and puts it in `/Applications`, where it opens like any other app. It takes a few minutes.

Once it is installed, every `git pull` that merges changes rebuilds and reinstalls it in the background (a lefthook `post-merge` hook). The result is logged in `~/Library/Logs/inkwell-install.log`. Quit and reopen Inkwell to pick up the new version. A `git pull --rebase` does not trigger the hook; run `pnpm install:local` yourself after one.

The installed app and `pnpm tauri dev` keep separate data. Release builds use `inkwell.db` and debug builds use `inkwell-dev.db`, both in the app's data folder, so testing never touches your real writing.

### Releasing

1. Set the new version, for example `0.1.0`, in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`, and merge that to `main`.
2. Tag the merge commit and push the tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. The Release workflow (`.github/workflows/release.yml`) builds installers for macOS (universal), Windows, and Linux and attaches them to a draft release. It fails if the tag does not match the version in `tauri.conf.json`.
4. Check the draft on GitHub's Releases page, then publish it.

The builds are not signed. On macOS, right-click the app and choose Open the first time; on Windows, choose More info, then Run anyway. A pull request that changes `release.yml` runs the same builds without making a release, and keeps the installers on the workflow run.

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
