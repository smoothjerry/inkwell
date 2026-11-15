import { Suspense, useEffect } from "react";
import { Toaster } from "sonner";
import { EditorPane, subscribeToSessionWrites, WordCountStatus } from "@/features/editor";
import { LibrarySidebar, useLibraryStore } from "@/features/library";
import { OnboardingDialog } from "@/features/onboarding";
import { SettingsView } from "@/features/settings";
import {
  StatsView,
  StreakBadge,
  TodayRing,
  useProgressStore,
  WeekProgress,
  ZenProgressLine,
} from "@/features/stats";
import { closeStaleSessions } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";
import { SidebarNav } from "./sidebar-nav";
import { useCloseFlush } from "./use-close-flush";
import { useTheme } from "./use-theme";
import { useZenEscape } from "./use-zen-escape";

/** Application shell: library sidebar, editor canvas, and status bar. */
export function App() {
  useTheme();
  useCloseFlush();
  const theme = useSettingsStore((state) => state.theme);
  const view = useViewStore((state) => state.view);
  const isZen = useViewStore((state) => state.isZen);
  useZenEscape();

  useEffect(() => {
    void useLibraryStore.getState().load();
    closeStaleSessions().catch((error: unknown) => console.error(error));
    // Progress needs the goal settings, so it loads after them.
    void useSettingsStore
      .getState()
      .load()
      .then(() => useProgressStore.getState().refresh());

    // Recompute progress whenever the session's words are saved.
    return subscribeToSessionWrites(() => void useProgressStore.getState().refresh());
  }, []);

  return (
    <div
      className={cn(
        "grid h-full",
        isZen
          ? "grid-cols-1 grid-rows-1"
          : "grid-cols-[var(--sidebar-width)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_var(--status-bar-height)]",
      )}
    >
      {/* `contents` keeps the sidebar a direct grid item outside zen mode. */}
      <div className={isZen ? "zen-edge zen-edge-left" : "contents"}>
        <LibrarySidebar footer={<SidebarNav />} />
      </div>

      <main className="flex min-h-0 min-w-0 flex-col bg-background">
        <div className="h-10 shrink-0" data-tauri-drag-region />
        {view === "editor" && <EditorPane />}
        {view === "settings" && <SettingsView />}
        {view === "stats" && (
          <Suspense fallback={null}>
            <StatsView />
          </Suspense>
        )}
      </main>

      <footer
        className={cn(
          "flex items-center gap-1 border-t bg-background px-2",
          isZen ? "zen-edge zen-edge-bottom" : "col-span-2",
        )}
      >
        <WeekProgress />
        <StreakBadge />
        <TodayRing />
        <div className="ml-auto">
          <WordCountStatus />
        </div>
      </footer>

      {isZen && <ZenProgressLine />}
      <OnboardingDialog />
      <Toaster theme={theme} position="bottom-right" />
    </div>
  );
}
