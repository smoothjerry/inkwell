import { useEffect } from "react";
import { Toaster } from "sonner";
import { EditorPane } from "@/features/editor";
import { LibrarySidebar, useLibraryStore } from "@/features/library";
import { useThemeStore } from "@/stores/theme-store";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./use-theme";

/** Application shell: library sidebar, editor canvas, and status bar. */
export function App() {
  useTheme();
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    void useLibraryStore.getState().load();
  }, []);

  return (
    <div className="grid h-full grid-cols-[var(--sidebar-width)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_var(--status-bar-height)]">
      <LibrarySidebar />

      <main className="flex min-h-0 min-w-0 flex-col bg-background">
        <div className="h-10 shrink-0" data-tauri-drag-region />
        <EditorPane />
      </main>

      <footer className="col-span-2 flex items-center justify-end border-t bg-background px-2">
        <ThemeToggle />
      </footer>

      <Toaster theme={theme} position="bottom-right" />
    </div>
  );
}
