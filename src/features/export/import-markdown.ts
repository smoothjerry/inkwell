import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { countWords } from "@/domain/word-count";
import { useLibraryStore } from "@/features/library";
import { createDocument, renameDocument, saveDocumentContent } from "@/lib/db";
import { toPlainText } from "./html";
import { fromMarkdown } from "./markdown";

/** "/notes/My Draft.md" → "My Draft". */
function titleFromPath(path: string): string {
  const fileName = path.split(/[\\/]/).pop() ?? "";
  return fileName.replace(/\.[^.]+$/, "").trim() || "Untitled";
}

/**
 * Asks for one or more Markdown files and makes a document from each
 * (DESIGN_SPEC §7.6). They go in the folder of the open document, or at the
 * top level when no document is open. The last one imported is opened.
 */
export async function importMarkdownFiles(): Promise<void> {
  const picked = await open({
    multiple: true,
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });
  if (picked === null) {
    return; // Cancelled.
  }
  const paths = Array.isArray(picked) ? picked : [picked];

  const library = useLibraryStore.getState();
  const folderId =
    library.documents.find((doc) => doc.id === library.selectedDocumentId)?.folderId ?? null;

  let lastId: string | null = null;
  let failed = 0;
  for (const path of paths) {
    try {
      const content = fromMarkdown(await readTextFile(path));
      const plainText = toPlainText(content);
      const id = await createDocument(folderId);
      await renameDocument(id, titleFromPath(path));
      await saveDocumentContent(id, JSON.stringify(content), plainText, countWords(plainText));
      lastId = id;
    } catch (error) {
      console.error(error);
      failed += 1;
    }
  }

  await useLibraryStore.getState().load();
  if (lastId !== null) {
    useLibraryStore.getState().selectDocument(lastId);
  }

  const imported = paths.length - failed;
  if (imported > 0) {
    toast.success(`Imported ${imported} ${imported === 1 ? "document" : "documents"}.`);
  }
  if (failed > 0) {
    toast.error(`Could not import ${failed} ${failed === 1 ? "file" : "files"}.`);
  }
}
