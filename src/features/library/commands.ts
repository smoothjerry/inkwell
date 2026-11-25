import {
  BookOpenText,
  ChartNoAxesColumn,
  FilePlus,
  Focus,
  FolderPlus,
  type LucideIcon,
  Monitor,
  Moon,
  MoveVertical,
  PanelTop,
  Settings,
  Sun,
  TextSelect,
} from "lucide-react";
import { type DimMode, type Theme, useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";
import { useLibraryStore } from "./library-store";

export type Command = {
  id: string;
  title: string;
  /** Extra words that also match this command when filtering. */
  keywords: string;
  Icon: LucideIcon;
  run: () => void;
};

const settings = () => useSettingsStore.getState();
const view = () => useViewStore.getState();

function dimming(mode: DimMode, title: string): Command {
  return {
    id: `dim-${mode}`,
    title,
    keywords: "focus fade dimming",
    Icon: TextSelect,
    run: () => settings().update({ dimMode: mode }),
  };
}

function theme(value: Theme, title: string, Icon: LucideIcon): Command {
  return {
    id: `theme-${value}`,
    title,
    keywords: "appearance color mode",
    Icon,
    run: () => settings().update({ theme: value }),
  };
}

/** The commands offered in the command palette, in display order. */
export const COMMANDS: Command[] = [
  {
    id: "new-document",
    title: "New Document",
    keywords: "create add file",
    Icon: FilePlus,
    run: () => void useLibraryStore.getState().createDocument(null),
  },
  {
    id: "new-folder",
    title: "New Folder",
    keywords: "create add directory",
    Icon: FolderPlus,
    run: () => void useLibraryStore.getState().createFolder(null),
  },
  {
    id: "open-stats",
    title: "Open Stats",
    keywords: "streak progress chart achievements sessions",
    Icon: ChartNoAxesColumn,
    run: () => view().setView("stats"),
  },
  {
    id: "open-settings",
    title: "Open Settings",
    keywords: "preferences goal options",
    Icon: Settings,
    run: () => view().setView("settings"),
  },
  {
    id: "toggle-zen",
    title: "Toggle Zen Mode",
    keywords: "focus distraction free fullscreen",
    Icon: Focus,
    run: () => view().setZen(!view().isZen),
  },
  {
    id: "toggle-toolbar",
    title: "Toggle Toolbar",
    keywords: "formatting format bar show hide",
    Icon: PanelTop,
    run: () => settings().update({ showToolbar: !settings().showToolbar }),
  },
  {
    id: "toggle-paged-view",
    title: "Toggle Paged View",
    keywords: "pages print book layout sheets",
    Icon: BookOpenText,
    run: () => settings().update({ pagedView: !settings().pagedView }),
  },
  {
    id: "toggle-typewriter",
    title: "Toggle Typewriter Scrolling",
    keywords: "focus center caret",
    Icon: MoveVertical,
    run: () => settings().update({ typewriterMode: !settings().typewriterMode }),
  },
  dimming("off", "Dimming: Off"),
  dimming("sentence", "Dimming: Sentence"),
  dimming("paragraph", "Dimming: Paragraph"),
  theme("light", "Theme: Light", Sun),
  theme("dark", "Theme: Dark", Moon),
  theme("system", "Theme: System", Monitor),
];

/** The commands in `commands` whose title or keywords contain the query. An empty query matches all. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const needle = query.trim().toLowerCase();
  return commands.filter((command) =>
    `${command.title} ${command.keywords}`.toLowerCase().includes(needle),
  );
}
