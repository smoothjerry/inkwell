import type { Editor, Range } from "@tiptap/react";
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  type LucideIcon,
  Minus,
  Pilcrow,
  TextQuote,
} from "lucide-react";

export type SlashItem = {
  title: string;
  /** Extra words that also match this item when filtering. */
  keywords: string;
  Icon: LucideIcon;
  /** Replaces the typed "/query" (`range`) with this block. */
  run: (editor: Editor, range: Range) => void;
};

const ITEMS: SlashItem[] = [
  {
    title: "Text",
    keywords: "paragraph plain",
    Icon: Pilcrow,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    keywords: "h1 title",
    Icon: Heading1,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    keywords: "h2 subtitle",
    Icon: Heading2,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    keywords: "h3",
    Icon: Heading3,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    keywords: "unordered ul",
    Icon: List,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    keywords: "ordered ol",
    Icon: ListOrdered,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    keywords: "todo checkbox checklist",
    Icon: ListTodo,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    keywords: "blockquote",
    Icon: TextQuote,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    keywords: "pre snippet",
    Icon: Code,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    keywords: "horizontal rule hr line",
    Icon: Minus,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const needle = query.trim().toLowerCase();
  return ITEMS.filter((item) => `${item.title} ${item.keywords}`.toLowerCase().includes(needle));
}
