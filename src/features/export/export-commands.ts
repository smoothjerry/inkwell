import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { type Command, useLibraryStore } from "@/features/library";
import { useViewStore } from "@/stores/view-store";
import { importMarkdownFiles } from "./import-markdown";

/** Opens the export dialog for the open document. */
export function requestExport() {
  const { selectedDocumentId } = useLibraryStore.getState();
  if (selectedDocumentId === null) {
    toast("Open a document to export it.");
    return;
  }
  useViewStore.getState().setExportDocumentId(selectedDocumentId);
}

/** Import and export entries for the command palette. */
export const EXPORT_COMMANDS: Command[] = [
  {
    id: "export-document",
    title: "Export Document…",
    keywords: "save download markdown word docx html pdf text print",
    Icon: Download,
    run: requestExport,
  },
  {
    id: "import-markdown",
    title: "Import Markdown…",
    keywords: "open load file md",
    Icon: Upload,
    run: () => void importMarkdownFiles(),
  },
];
