import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLibraryStore } from "@/features/library";
import { useViewStore } from "@/stores/view-store";
import { EXPORT_FORMATS, exportDocument } from "./export-document";

/** Lists the export formats for the document named in the view store's `exportDocumentId`. */
export function ExportDialog() {
  const documentId = useViewStore((state) => state.exportDocumentId);
  const setExportDocumentId = useViewStore((state) => state.setExportDocumentId);
  const title = useLibraryStore(
    (state) => state.documents.find((doc) => doc.id === documentId)?.title,
  );

  return (
    <Dialog
      open={documentId !== null && title !== undefined}
      onOpenChange={(isOpen) => !isOpen && setExportDocumentId(null)}
    >
      <DialogContent className="max-w-sm text-[13px]">
        <DialogHeader>
          <DialogTitle>Export “{title}”</DialogTitle>
          <DialogDescription>
            Choose a format. PDF opens the print dialog, where you can save as PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {EXPORT_FORMATS.map((format) => (
            <Button
              key={format.id}
              variant="outline"
              className="justify-between"
              onClick={() => {
                setExportDocumentId(null);
                if (documentId !== null) {
                  void exportDocument(documentId, format.id);
                }
              }}
            >
              {format.label}
              <span className="font-mono text-[12px] text-muted-foreground">
                .{format.extension}
              </span>
            </Button>
          ))}
        </div>
        {/* DESIGN_SPEC §7.11: say what Markdown cannot hold. */}
        <p className="text-muted-foreground">
          Markdown keeps text and structure only: underline, alignment, indents, colour, highlight,
          fonts, and sizes are left out.
        </p>
      </DialogContent>
    </Dialog>
  );
}
