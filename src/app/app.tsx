import { useEffect } from "react";
import { Toaster } from "sonner";
import { EditorPane, subscribeToSessionWrites, WordCountStatus } from "@/features/editor";
import { LibrarySidebar, useLibraryStore } from "@/features/library";
import { SettingsView } from "@/features/settings";
import { StreakBadge, TodayRing, useProgressStore, WeekProgress } from "@/features/stats";
import { closeStaleSessions } from "@/lib/db";
import { useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";
import { SidebarNav } from "./sidebar-nav";
import { useCloseFlush } from "./use-close-flush";
import { useTheme } from "./use-theme";

/** Application shell: library sidebar, editor canvas, and status bar. */
export function App() {
  useTheme();
  useCloseFlush();
  const theme = useSettingsStore((state) => state.theme);
  const view = useViewStore((state) => state.view);

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
    <div className="grid h-full grid-cols-[var(--sidebar-width)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_var(--status-bar-height)]">
      <LibrarySidebar footer={<SidebarNav />} />

      <main className="flex min-h-0 min-w-0 flex-col bg-background">
        <div className="h-10 shrink-0" data-tauri-drag-region />
        {view === "settings" ? <SettingsView /> : <EditorPane />}
      </main>

      <footer className="col-span-2 flex items-center gap-1 border-t bg-background px-2">
        <WeekProgress />
        <StreakBadge />
        <TodayRing />
        <div className="ml-auto">
          <WordCountStatus />
        </div>
      </footer>

      <Toaster theme={theme} position="bottom-right" />
    </div>
  );
}
