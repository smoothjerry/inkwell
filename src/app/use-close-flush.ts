import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { flushPendingWork } from "@/features/editor";

/**
 * Never lose text (DESIGN_SPEC §4.3): saves pending work when the page
 * unloads or the window is closed.
 *
 * This must stay the only close-requested listener. Tauri closes the window
 * as soon as any one listener finishes, so two would race.
 */
export function useCloseFlush() {
  useEffect(() => {
    const flush = () => void flushPendingWork();
    window.addEventListener("beforeunload", flush);

    let stopListening: (() => void) | undefined;
    let unmounted = false;
    if (isTauri()) {
      // The window closes only after this handler's promise resolves.
      void getCurrentWindow()
        .onCloseRequested(() => flushPendingWork())
        .then((unlisten) => {
          if (unmounted) {
            unlisten();
          } else {
            stopListening = unlisten;
          }
        });
    }

    return () => {
      unmounted = true;
      window.removeEventListener("beforeunload", flush);
      stopListening?.();
    };
  }, []);
}
