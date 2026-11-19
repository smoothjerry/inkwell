import { isTauri } from "@tauri-apps/api/core";
import { error as logError, warn as logWarn } from "@tauri-apps/plugin-log";

/** One line of text for a console call's arguments; errors keep their stack. */
function describe(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        // WebKit's stack has only the frames, so put the message first.
        const header = `${arg.name}: ${arg.message}`;
        if (!arg.stack) {
          return header;
        }
        return arg.stack.startsWith(header) ? arg.stack : `${header}\n${arg.stack}`;
      }
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

/**
 * Sends `console.warn` and `console.error`, and errors nothing caught, to the
 * log file as well as the console (DESIGN_SPEC §10.2). The app reports
 * problems through the console, so every existing report is covered. Call
 * once at startup; outside the Tauri app it does nothing.
 */
export function forwardLogsToFile() {
  if (!isTauri()) {
    return;
  }
  const writers = { warn: logWarn, error: logError } as const;
  for (const level of ["warn", "error"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      // A failed write is dropped: reporting it here would loop.
      writers[level](describe(args)).catch(() => undefined);
    };
  }

  window.addEventListener("error", (event) => {
    console.error("Uncaught error:", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });
}
