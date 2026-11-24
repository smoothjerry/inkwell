import { invoke, isTauri } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { flushPendingWork } from "@/features/editor";
import type { Command } from "@/features/library";
import { useUpdateStore } from "@/stores/update-store";
import { useViewStore } from "@/stores/view-store";

/**
 * Saves pending work, as quitting does, then restarts into the new build.
 * If an edit could not be saved, the save-error toast is showing and the app
 * stays open.
 */
export async function relaunchToUpdate() {
  if (!(await flushPendingWork())) {
    return;
  }
  try {
    await invoke("relaunch");
  } catch (error: unknown) {
    console.error(error);
    toast.error("Could not relaunch Inkwell.");
  }
}

/** The palette entry offered while an update is waiting. */
export const RELAUNCH_COMMAND: Command = {
  id: "relaunch-to-update",
  title: "Relaunch to Update",
  keywords: "restart update new version build",
  Icon: RefreshCw,
  run: () => void relaunchToUpdate(),
};

/**
 * Asks Rust whether a newer build has replaced the running one, and records
 * it. Resolves true if one is waiting.
 */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const token = await invoke<string | null>("installed_update");
    if (token !== null) {
      useUpdateStore.getState().setWaiting(token);
    }
  } catch (error: unknown) {
    console.error(error);
  }
  return useUpdateStore.getState().waitingToken !== null;
}

function checkOnFocus() {
  void checkForUpdate();
}

/**
 * The update notice (DESIGN_SPEC §7.12). Checks when the window gains focus,
 * and at no other time, then shows a persistent toast once per new build.
 * In zen mode the toast waits until zen mode ends.
 */
export function useUpdateNotice() {
  const waitingToken = useUpdateStore((state) => state.waitingToken);
  const dismissedToken = useUpdateStore((state) => state.dismissedToken);
  const isZen = useViewStore((state) => state.isZen);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }
    window.addEventListener("focus", checkOnFocus);
    return () => window.removeEventListener("focus", checkOnFocus);
  }, []);

  useEffect(() => {
    if (waitingToken === null || waitingToken === dismissedToken || isZen) {
      return;
    }
    // Each showing gets a new toast id: sonner can drop a toast shown again
    // under an id it has already dismissed.
    let isHiding = false;
    const id = toast("Inkwell has been updated.", {
      duration: Number.POSITIVE_INFINITY,
      closeButton: true,
      action: {
        label: "Relaunch",
        onClick: (event) => {
          // Keep the notice up in case the save fails and the app stays open.
          event.preventDefault();
          void relaunchToUpdate();
        },
      },
      // Sonner also calls this when the toast is hidden below (zen mode, a
      // newer build), which is not the writer closing it.
      onDismiss: () => {
        if (!isHiding) {
          useUpdateStore.getState().dismiss(waitingToken);
        }
      },
    });
    return () => {
      isHiding = true;
      toast.dismiss(id);
    };
  }, [waitingToken, dismissedToken, isZen]);
}
