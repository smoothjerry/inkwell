import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { importMarkdownFiles, requestExport } from "@/features/export";
import { usePaletteStore } from "@/features/library";
import { DIM_MODES, useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";

/** Runs a native menu action. The names match the ids in src-tauri/src/menu.rs. */
function runMenuAction(action: string) {
  const settings = useSettingsStore.getState();
  const view = useViewStore.getState();

  switch (action) {
    case "palette": {
      const palette = usePaletteStore.getState();
      palette.setOpen(!palette.isOpen);
      break;
    }
    case "import":
      void importMarkdownFiles();
      break;
    case "export":
      requestExport();
      break;
    case "zen":
      view.setZen(!view.isZen);
      break;
    case "typewriter":
      settings.update({ typewriterMode: !settings.typewriterMode });
      break;
    case "dim-off":
      settings.update({ dimMode: "off" });
      break;
    case "dim-sentence":
      settings.update({ dimMode: "sentence" });
      break;
    case "dim-paragraph":
      settings.update({ dimMode: "paragraph" });
      break;
    case "dim-cycle": {
      const next = DIM_MODES[(DIM_MODES.indexOf(settings.dimMode) + 1) % DIM_MODES.length];
      settings.update({ dimMode: next });
      break;
    }
  }
}

/** Listens for native menu items (and their keyboard shortcuts). */
export function useMenuEvents() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }
    let stopListening: (() => void) | undefined;
    let unmounted = false;
    void listen<string>("menu", (event) => runMenuAction(event.payload)).then((unlisten) => {
      if (unmounted) {
        unlisten();
      } else {
        stopListening = unlisten;
      }
    });
    return () => {
      unmounted = true;
      stopListening?.();
    };
  }, []);
}
