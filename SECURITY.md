# Security Policy

## Supported versions

Inkwell is pre-release. Only the latest commit on `main` receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through GitHub: go to the repository's **Security** tab and choose [**Report a vulnerability**](https://github.com/smoothjerry/inkwell/security/advisories/new).

Include:

- What the issue is and what it affects.
- Steps to reproduce, or a proof of concept.
- The Inkwell version or commit, and your operating system.

You can expect an acknowledgement within 7 days. Once a fix is available, the advisory is published with credit to the reporter unless you ask otherwise.

## Scope notes

Inkwell is local-first: it makes no network calls and stores all data in a SQLite database on your machine. Issues of particular interest include anything that lets document content escape the app sandbox, bypasses the Tauri capability or CSP configuration, or corrupts or loses user data.
