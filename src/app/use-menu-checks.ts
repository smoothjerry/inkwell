import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";

let lastSent = "";

/**
 * Sends the View modes to the native menu so its check marks match
 * (`set_menu_checks` in src-tauri/src/menu.rs). Repeats are skipped unless
 * `force` is set: macOS flips a check item itself when it is clicked, so
 * after a menu action the marks are sent again even if nothing changed.
 */
export function syncMenuChecks(force = false) {
  if (!isTauri()) {
    return;
  }
  const settings = useSettingsStore.getState();
  const state = {
    sidebar: !settings.sidebarCollapsed,
    zen: useViewStore.getState().isZen,
    toolbar: settings.showToolbar,
    typewriter: settings.typewriterMode,
    dimMode: settings.dimMode,
  };
  const key = JSON.stringify(state);
  if (key === lastSent && !force) {
    return;
  }
  lastSent = key;
  invoke("set_menu_checks", { state }).catch((error: unknown) => console.error(error));
}

/** Keeps the native View menu's check marks in step with the app's modes. */
export function useMenuChecks() {
  useEffect(() => {
    syncMenuChecks(true);
    const stopSettings = useSettingsStore.subscribe(() => syncMenuChecks());
    const stopView = useViewStore.subscribe(() => syncMenuChecks());
    return () => {
      stopSettings();
      stopView();
    };
  }, []);
}
