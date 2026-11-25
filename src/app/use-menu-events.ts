import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { runFormatMenuAction, useDocumentStyleStore, useFindStore } from "@/features/editor";
import { importMarkdownFiles, requestExport } from "@/features/export";
import { useLibraryStore, usePaletteStore } from "@/features/library";
import { DIM_MODES, useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";
import { syncMenuChecks } from "./use-menu-checks";

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
    case "new-document":
      void useLibraryStore.getState().createDocument(null);
      break;
    case "new-folder":
      void useLibraryStore.getState().createFolder(null);
      break;
    // Like the sidebar links: choosing the open view returns to the editor.
    case "stats":
      view.setView(view.view === "stats" ? "editor" : "stats");
      break;
    case "settings":
      view.setView(view.view === "settings" ? "editor" : "settings");
      break;
    // The bar lives in the editor, so find needs the editor view and a document.
    case "find":
      if (view.view === "editor" && useLibraryStore.getState().selectedDocumentId !== null) {
        useFindStore.getState().open();
      }
      break;
    case "document-style":
      if (view.view === "editor" && useLibraryStore.getState().selectedDocumentId !== null) {
        useDocumentStyleStore.getState().open();
      }
      break;
    case "import":
      void importMarkdownFiles();
      break;
    case "export":
      requestExport();
      break;
    case "sidebar":
      settings.update({ sidebarCollapsed: !settings.sidebarCollapsed });
      break;
    case "zen":
      view.setZen(!view.isZen);
      break;
    case "toolbar":
      settings.update({ showToolbar: !settings.showToolbar });
      break;
    case "paged":
      settings.update({ pagedView: !settings.pagedView });
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
    default:
      if (action.startsWith("format-")) {
        runFormatMenuAction(action.slice("format-".length));
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
    void listen<string>("menu", (event) => {
      runMenuAction(event.payload);
      // A clicked check item has flipped itself; put every mark back in step.
      syncMenuChecks(true);
    }).then((unlisten) => {
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
