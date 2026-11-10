# ADR 0001: Tauri 2, React, and Tiptap

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Inkwell is a desktop word processor that must start in under a second, feel instant while typing, ship as a small installer, and store everything locally. It needs a rich-text editor with Markdown shortcuts and a path to real-time collaboration later, without a rewrite.

## Decision

- **Shell: Tauri 2.** A Rust shell around the system webview. macOS is the primary target; Windows and Linux are built in CI.
- **UI: React 19 + Vite + TypeScript (strict).** No Next.js, because there is no server.
- **Editor: Tiptap 3 (ProseMirror).** Documents are stored as Tiptap JSON.
- **Styling: Tailwind CSS v4 + shadcn/ui (Radix)**, with Geist fonts, Lucide icons, and Motion.
- **State: Zustand.** Navigation is a `view` enum in a store; there is no router.
- **Split of work:** Rust stays thin (lifecycle, plugins, migrations, menu, dialogs). All product logic is TypeScript, with pure logic in `src/domain/`.

## Consequences

- Small binaries and real filesystem access, with the web ecosystem for UI and editing.
- The system webview differs per OS (WebKit, WebView2, WebKitGTK), so rendering and API support must be checked on all three.
- Tiptap has a supported path to Yjs collaboration. The editor extensions are built in one factory so that swap stays local.
- Contributors need both a Node and a Rust toolchain.

## Alternatives considered

- **Electron:** mature, with one consistent Chromium, but much larger installers and higher memory use.
- **Native (Swift/AppKit):** best macOS feel, but no cross-platform path and no comparable editor ecosystem.
- **Lexical or plain ProseMirror:** viable editors; Tiptap gives the most complete extension set and collaboration story for the least custom code.
