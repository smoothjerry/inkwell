# Agent working agreement

Read `docs/DESIGN_SPEC.md` first. It is the build brief; follow its decisions.

## Rules

- Build one milestone (spec §11) per PR. Keep PRs small and reviewable.
- Make targeted edits. Do not rewrite files wholesale.
- Do not introduce a new abstraction without a second concrete use.
- Unit-test everything in `src/domain/`: word count, session splitting, week bucketing (including week-start changes), streak math, and achievements.
- Summarize each change in under 5 lines.

## Conventions (spec §10.2)

- TypeScript strict, no `any`, named exports, one component per file.
- Files are `kebab-case.tsx`; components are `PascalCase`.
- Feature folders own their components, hooks, and store slices. Import across features only through a feature's `index.ts`.
- `src/domain/` is pure: no React or Tauri imports.
- Database access only through `src/lib/db` repositories. No SQL in components.
- Rust stays thin: `thiserror` for errors; commands return `Result<T, String>`.
- Branches are `feat/…` or `fix/…`. Commits follow Conventional Commits.

## Commands

- `pnpm tauri dev`: run the app.
- `pnpm biome check`: lint and format check (`pnpm format` to fix).
- `pnpm typecheck`: `tsc --noEmit`.
- `pnpm test`: Vitest.
- In `src-tauri/`: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`.

All of these must pass before a commit.

## Notes

- Design tokens live in `src/styles/tokens.css`. The dark values appear in two blocks; change both.
- shadcn/ui components are copied into `src/components/ui/`. Add more with `pnpm dlx shadcn@latest add <name>`.
- Biome does not check Markdown files (see `biome.json`).
