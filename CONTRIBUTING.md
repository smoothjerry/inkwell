# Contributing to Inkwell

Thanks for your interest. Inkwell is built milestone by milestone from the [design spec](docs/DESIGN_SPEC.md); please read it before proposing larger changes.

## Setup

See [Getting started](README.md#getting-started). `pnpm install` also installs the git hooks (lefthook).

## Workflow

1. Branch from `main`: `feat/<topic>` or `fix/<topic>`.
2. Keep pull requests small and focused. One milestone or one fix per PR.
3. Make sure the checks pass locally (below). CI must be green before merge.
4. PRs are squash-merged.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat(editor): add slash menu
fix(streak): count the in-progress week only when met
docs: add ADR for backups
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`.

## Checks

```bash
pnpm biome check
pnpm typecheck
pnpm test
```

```bash
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

The pre-commit hook runs Biome on staged files, the typecheck, and `cargo fmt --check`.

## Code conventions

- TypeScript is strict; no `any`. Use named exports.
- One component per file. Files are `kebab-case.tsx`; components are `PascalCase`.
- Feature folders (`src/features/<name>/`) own their components, hooks, and store slices. Import across features only through a feature's `index.ts`.
- Pure logic lives in `src/domain/` with no React or Tauri imports, and is unit-tested.
- Database access goes through `src/lib/db` repositories. No SQL in components.
- Show user-facing failures as toasts; log details with `console.error`.
- Rust stays thin. Use `thiserror` for error types; commands return `Result<T, String>`.

## Reporting bugs and security issues

Open a GitHub issue for bugs and feature requests. For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
