import { type CSSProperties, Suspense, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { EditorPane, subscribeToSessionWrites, WordCountStatus } from "@/features/editor";
import { EXPORT_COMMANDS, ExportDialog } from "@/features/export";
import { CommandPalette, LibrarySidebar, useLibraryStore } from "@/features/library";
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
import { runBackup } from "./run-backup";
import { SidebarNav } from "./sidebar-nav";
import { SidebarResizer } from "./sidebar-resizer";
import { useCloseFlush } from "./use-close-flush";
import { useMenuChecks } from "./use-menu-checks";
import { useMenuEvents } from "./use-menu-events";
import { useTheme } from "./use-theme";
import { useZenEscape } from "./use-zen-escape";

/** How long after start-up the backup check runs. */
const BACKUP_DELAY_MS = 5000;

/** Application shell: library sidebar, editor canvas, and status bar. */
export function App() {
  useTheme();
  useCloseFlush();
  const theme = useSettingsStore((state) => state.theme);
  const view = useViewStore((state) => state.view);
  const isZen = useViewStore((state) => state.isZen);
  const isSidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const savedSidebarWidth = useSettingsStore((state) => state.sidebarWidth);
  // The width while the edge is being dragged; it is saved when the drag ends.
  const [draftSidebarWidth, setDraftSidebarWidth] = useState<number | null>(null);
  const sidebarWidth = draftSidebarWidth ?? savedSidebarWidth;
  const shellStyle = { "--sidebar-width": `${sidebarWidth}px` } as CSSProperties;
  useZenEscape();
  useMenuEvents();
  useMenuChecks();

  useEffect(() => {
    void useLibraryStore.getState().load();
    closeStaleSessions().catch((error: unknown) => console.error(error));
    // Progress needs the goal settings, so it loads after them.
    void useSettingsStore
      .getState()
      .load()
      .then(() => useProgressStore.getState().refresh());

    // Back up once the app has settled, so start-up is not slowed (DESIGN_SPEC §4.3).
    const backupTimer = setTimeout(() => {
      runBackup().catch((error: unknown) => console.error("Backup failed:", error));
    }, BACKUP_DELAY_MS);

    // Recompute progress whenever the session's words are saved.
    const stopProgress = subscribeToSessionWrites(() => void useProgressStore.getState().refresh());
    return () => {
      clearTimeout(backupTimer);
      stopProgress();
    };
  }, []);

  return (
    <div
      className={cn(
        "grid h-full",
        isZen
          ? "grid-cols-1 grid-rows-1"
          : isSidebarCollapsed
            ? "grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_var(--status-bar-height)]"
            : "grid-cols-[var(--sidebar-width)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_var(--status-bar-height)]",
      )}
      style={shellStyle}
    >
      {/* `contents` keeps the sidebar a direct grid item outside zen mode. */}
      <div
        className={isZen ? "zen-edge zen-edge-left" : isSidebarCollapsed ? "hidden" : "contents"}
      >
        <LibrarySidebar footer={<SidebarNav />} />
      </div>

      <main className="relative flex min-h-0 min-w-0 flex-col bg-background">
        {!isZen && !isSidebarCollapsed && (
          <SidebarResizer
            width={sidebarWidth}
            onResize={setDraftSidebarWidth}
            onCommit={(width) => {
              setDraftSidebarWidth(null);
              if (width !== savedSidebarWidth) {
                useSettingsStore.getState().update({ sidebarWidth: width });
              }
            }}
          />
        )}
        <div className="h-10 shrink-0" data-tauri-drag-region />
        {view === "editor" && (
          <Suspense fallback={null}>
            <EditorPane />
          </Suspense>
        )}
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
          isZen ? "zen-edge zen-edge-bottom" : !isSidebarCollapsed && "col-span-2",
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
      <CommandPalette extraCommands={EXPORT_COMMANDS} />
      <ExportDialog />
      <OnboardingDialog />
      <Toaster theme={theme} position="bottom-right" />
    </div>
  );
}
