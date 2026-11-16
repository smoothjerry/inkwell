import { useEffect } from "react";
import { useViewStore } from "@/stores/view-store";

/** Esc leaves zen mode, unless something else (a menu, a dialog) used the key. */
export function useZenEscape() {
  const isZen = useViewStore((state) => state.isZen);

  useEffect(() => {
    if (!isZen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        useViewStore.getState().setZen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZen]);
}
