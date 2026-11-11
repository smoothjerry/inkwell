import { type Editor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Heading1, Heading2, Italic, Link, type LucideIcon, TextQuote } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type BubbleToolbarProps = {
  editor: Editor;
};

function normalizeUrl(value: string): string {
  const url = value.trim();
  return url === "" || /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

/** Formatting toolbar shown above a text selection. */
export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  // null = showing the buttons; a string = editing the link URL.
  const [linkDraft, setLinkDraft] = useState<string | null>(null);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      link: editor.isActive("link"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      quote: editor.isActive("blockquote"),
    }),
  });

  const buttons: { label: string; Icon: LucideIcon; isActive: boolean; run: () => void }[] = [
    {
      label: "Bold",
      Icon: Bold,
      isActive: active.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      Icon: Italic,
      isActive: active.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Link",
      Icon: Link,
      isActive: active.link,
      run: () => setLinkDraft((editor.getAttributes("link").href as string | undefined) ?? ""),
    },
    {
      label: "Heading 1",
      Icon: Heading1,
      isActive: active.h1,
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      Icon: Heading2,
      isActive: active.h2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Quote",
      Icon: TextQuote,
      isActive: active.quote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  function applyLink(value: string) {
    const href = normalizeUrl(value);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href === "") {
      chain.unsetLink().run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkDraft(null);
  }

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-[13px] shadow-overlay"
    >
      {linkDraft === null ? (
        buttons.map(({ label, Icon, isActive, run }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "bg-accent text-foreground",
            )}
            // Keep the text selection when a button is pressed.
            onMouseDown={(event) => event.preventDefault()}
            onClick={run}
          >
            <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        ))
      ) : (
        <input
          // biome-ignore lint/a11y/noAutofocus: the field appears on request, replacing the buttons.
          autoFocus
          defaultValue={linkDraft}
          placeholder="Paste a link, or leave empty to remove"
          aria-label="Link URL"
          className="h-7 w-72 cursor-text rounded-md bg-transparent px-2 outline-none select-text"
          onBlur={() => setLinkDraft(null)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyLink(event.currentTarget.value);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setLinkDraft(null);
              editor.commands.focus();
            }
          }}
        />
      )}
    </BubbleMenu>
  );
}
