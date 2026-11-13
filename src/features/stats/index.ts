import { lazy } from "react";

export { useProgressStore } from "./progress-store";
export { StreakBadge } from "./streak-badge";
export { TodayRing } from "./today-ring";
export { WeekProgress } from "./week-progress";

/** The Stats view and its chart library load only when the view is first opened (§9). */
export const StatsView = lazy(() =>
  import("./stats-view").then((module) => ({ default: module.StatsView })),
);
