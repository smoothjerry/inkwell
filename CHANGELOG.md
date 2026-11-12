# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Project scaffold (M0): Tauri 2, React 19, Vite, and strict TypeScript.
- Tailwind CSS v4, shadcn/ui, and locally bundled Geist fonts.
- Light, dark, and system themes driven by design tokens.
- Empty application shell window (sidebar, canvas, status bar regions).
- Tooling: Biome, Vitest, lefthook, and a GitHub Actions CI workflow.
- Project docs: README, contributing guide, architecture overview, and ADRs.
- Local SQLite database with the initial schema migration (M1).
- Library sidebar: nested folders and documents, with create, inline rename, move, and pinning.
- Trash: move to trash, restore, empty, and automatic purge after 30 days.
- Rich-text editor (M2): headings, lists, task lists, quotes, code blocks, dividers, and links, with Markdown shortcuts and smart typography.
- Selection toolbar and a slash menu for inserting blocks.
- Autosave, with pending edits flushed when the window loses focus or closes.
- Editable document title, and editor font (sans, serif, mono) and width settings.
- Writing sessions (M3): recorded automatically, ending after 10 idle minutes, at local midnight, or when the app closes.
- Status bar shows the document's word count and reading time, and the selection's word count.
- Unit tests for word counting and session rules.
- Weekly goal and streak (M4): a progress bar, streak count, and optional "today" ring in the status bar.
- Settings view: weekly goal, daily target, week start, theme, editor font and width, celebrations, and session idle time.
- First-launch setup and a Welcome document.
- A short celebration when the weekly goal is reached.
- Unit tests for week and streak rules.

### Changed

- The theme is now saved between launches. The theme, font, and width switches moved from the status bar to Settings.
