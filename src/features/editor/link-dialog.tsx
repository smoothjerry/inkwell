import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeUrl } from "@/domain/link-url";
import { useLinkDialogStore } from "./link-dialog-store";

type LinkDialogProps = {
  editor: Editor;
};

/** Sets, changes, or removes the link at the selection. */
function applyLink(editor: Editor, value: string) {
  const href = normalizeUrl(value);
  const chain = editor.chain().focus().extendMarkRange("link");
  if (href === "") {
    chain.unsetLink().run();
  } else if (editor.state.selection.empty && !editor.isActive("link")) {
    // Nothing to link: insert the address itself, linked.
    chain
      .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
      .run();
  } else {
    chain.setLink({ href }).run();
  }
}

/**
 * Format ▸ Link… and the toolbar's link button (DESIGN_SPEC §7.11). An empty
 * address removes the link.
 */
export function LinkDialog({ editor }: LinkDialogProps) {
  const isOpen = useLinkDialogStore((state) => state.isOpen);
  const close = useLinkDialogStore((state) => state.close);
  const currentHref = isOpen
    ? ((editor.getAttributes("link").href as string | undefined) ?? "")
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-sm text-[13px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          editor.commands.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Link</DialogTitle>
          <DialogDescription>Leave the address empty to remove the link.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("href");
            applyLink(editor, typeof value === "string" ? value : "");
            close();
          }}
        >
          <input
            name="href"
            defaultValue={currentHref}
            placeholder="example.com"
            aria-label="Link address"
            className="h-8 w-full cursor-text rounded-md border bg-transparent px-2 outline-none select-text focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">{currentHref === "" ? "Add Link" : "Update Link"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
