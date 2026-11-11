import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";
import { SlashCommand } from "./slash-command";

/**
 * The one place the editor's extensions are assembled (DESIGN_SPEC §4.4), so
 * a later move to collaborative editing stays local to this file.
 */
export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
      underline: false,
    }),
    Typography,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: "Start writing, or type / for blocks" }),
    SlashCommand,
  ];
}
