import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listRecentSessions, type RecentSession } from "@/lib/db";
import { ActivityHeatmap } from "./activity-heatmap";
import { KpiTiles } from "./kpi-tiles";
import { useProgressStore } from "./progress-store";
import { StatsSection } from "./stats-section";
import { WeeklyChart } from "./weekly-chart";

const RECENT_SESSIONS = 20;

/** The Stats view (DESIGN_SPEC §7.5). Loaded on demand; see ./index.ts. */
export function StatsView() {
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  // Sessions may have ended since the last refresh.
  useEffect(() => {
    void useProgressStore.getState().refresh();
    listRecentSessions(RECENT_SESSIONS)
      .then(setRecentSessions)
      .catch((error: unknown) => {
        console.error(error);
        toast.error("Could not load recent sessions.");
      });
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 pt-2 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <KpiTiles recentSessions={recentSessions} />
        <StatsSection title="Last 12 weeks">
          <WeeklyChart />
        </StatsSection>
        <StatsSection title="Activity">
          <ActivityHeatmap />
        </StatsSection>
      </div>
    </div>
  );
}
