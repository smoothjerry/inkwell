import { useEffect } from "react";
import { useProgressStore } from "./progress-store";

/** The Stats view (DESIGN_SPEC §7.5). Loaded on demand; see ./index.ts. */
export function StatsView() {
  // Sessions may have ended since the last refresh.
  useEffect(() => {
    void useProgressStore.getState().refresh();
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 pt-2 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
      </div>
    </div>
  );
}
