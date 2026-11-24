import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";
import { DocumentStyle } from "./document-style";
import { FindInDocument } from "./find-in-document";
import { FocusDimming } from "./focus-dimming";
import { RichFormatting, RichTextStyle } from "./rich-formatting";
import { SlashCommand } from "./slash-command";
import { TypewriterScroll } from "./typewriter-scroll";

/**
 * The one place the editor's extensions are assembled (DESIGN_SPEC §4.4), so
 * a later move to collaborative editing stays local to this file.
 */
export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    DocumentStyle,
    RichTextStyle,
    // Alignment shortcuts come from the native Format menu (DESIGN_SPEC §7.7).
    TextAlign.extend({ addKeyboardShortcuts: () => ({}) }).configure({
      types: ["heading", "paragraph"],
    }),
    RichFormatting,
    Typography,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: "Start writing, or type / for blocks" }),
    SlashCommand,
    TypewriterScroll,
    FocusDimming,
    FindInDocument,
  ];
}
