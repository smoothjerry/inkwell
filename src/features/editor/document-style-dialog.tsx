import { type Editor, useEditorState } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LINE_SPACINGS,
  type LineSpacing,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  resolveDocumentStyle,
} from "@/domain/document-style";
import type { FontId } from "@/domain/fonts";
import { FontPicker, NumberField, SegmentedControl } from "@/features/settings";
import { useSettingsStore } from "@/stores/settings-store";
import { getDocumentStyle, setDocumentStyle } from "./document-style";
import { useDocumentStyleStore } from "./document-style-store";

const SPACING_LABELS: Record<LineSpacing, string> = {
  1: "1.0",
  1.15: "1.15",
  1.5: "1.5",
  2: "2.0",
};
const SPACING_OPTIONS = LINE_SPACINGS.map((spacing) => SPACING_LABELS[spacing]);

type DocumentStyleDialogProps = {
  editor: Editor;
};

/**
 * Format ▸ Document Style… (DESIGN_SPEC §7.11). Each change applies at once,
 * as its own undoable step; "Use defaults" clears the document's choices.
 */
export function DocumentStyleDialog({ editor }: DocumentStyleDialogProps) {
  const isOpen = useDocumentStyleStore((state) => state.isOpen);
  const close = useDocumentStyleStore((state) => state.close);
  const attrs = useEditorState({ editor, selector: ({ editor }) => getDocumentStyle(editor) });
  const editorFont = useSettingsStore((state) => state.editorFont);
  const style = resolveDocumentStyle(attrs, editorFont);
  const hasOwnStyle =
    attrs.fontId !== null || attrs.fontSize !== null || attrs.lineSpacing !== null;

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
          <DialogTitle>Document Style</DialogTitle>
          <DialogDescription>
            This document's font, size, and line spacing. Changes apply as you make them.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span>Font</span>
            <FontPicker
              label="Document font"
              value={style.font.id as FontId}
              onChange={(fontId) => setDocumentStyle(editor, { fontId })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Size (pt)</span>
            <NumberField
              label="Document font size"
              value={style.fontSize}
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              onChange={(fontSize) => setDocumentStyle(editor, { fontSize })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Line spacing</span>
            <SegmentedControl
              label="Line spacing"
              options={SPACING_OPTIONS}
              value={SPACING_LABELS[style.lineSpacing]}
              onChange={(label) =>
                setDocumentStyle(editor, {
                  lineSpacing: LINE_SPACINGS[SPACING_OPTIONS.indexOf(label)] ?? null,
                })
              }
            />
          </div>
        </div>
        <div className="flex justify-between">
          <Button
            variant="ghost"
            disabled={!hasOwnStyle}
            onClick={() =>
              setDocumentStyle(editor, { fontId: null, fontSize: null, lineSpacing: null })
            }
          >
            Use defaults
          </Button>
          <Button variant="outline" onClick={close}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
