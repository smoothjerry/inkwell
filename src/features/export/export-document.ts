import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import { type ResolvedDocumentStyle, resolveDocumentStyle } from "@/domain/document-style";
import { flushAutosaves } from "@/features/editor";
import { useLibraryStore } from "@/features/library";
import { getDocumentContent } from "@/lib/db";
import { useSettingsStore } from "@/stores/settings-store";
import { toDocx } from "./docx";

export const EXPORT_FORMATS = [
  { id: "markdown", label: "Markdown", extension: "md" },
  { id: "docx", label: "Word document", extension: "docx" },
  { id: "html", label: "HTML", extension: "html" },
  { id: "text", label: "Plain text", extension: "txt" },
  { id: "pdf", label: "PDF", extension: "pdf" },
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number]["id"];

/** Characters that are not allowed in file names on at least one platform. */
function toFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";
}

/** The document's own font, size, and line spacing, else the setting and defaults (§7.11). */
function documentStyleOf(content: JSONContent): ResolvedDocumentStyle {
  const attrs = content.attrs ?? {};
  return resolveDocumentStyle(
    {
      fontId: attrs.fontId ?? null,
      fontSize: attrs.fontSize ?? null,
      lineSpacing: attrs.lineSpacing ?? null,
    },
    useSettingsStore.getState().editorFont,
  );
}

/**
 * Exports a document. For PDF this opens the print dialog; for the other
 * formats it asks where to save and writes the file. Markdown and plain text
 * hold the body only (the title is the file name); HTML, Word, and PDF start
 * with the title as a heading.
 */
export async function exportDocument(documentId: string, formatId: ExportFormat): Promise<void> {
  const format = EXPORT_FORMATS.find((candidate) => candidate.id === formatId);
  const title = useLibraryStore.getState().documents.find((doc) => doc.id === documentId)?.title;
  if (!format || title === undefined) {
    return;
  }

  try {
    // Include edits that have not been autosaved yet.
    await flushAutosaves();
    const raw = await getDocumentContent(documentId);
    if (raw === null) {
      throw new Error(`Document ${documentId} not found`);
    }
    const content = JSON.parse(raw) as JSONContent;
    const style = documentStyleOf(content);

    if (format.id === "pdf") {
      const { printDocument } = await import("./print-document");
      printDocument(title, content, style);
      return;
    }

    const path = await save({
      defaultPath: `${toFileName(title)}.${format.extension}`,
      filters: [{ name: format.label, extensions: [format.extension] }],
    });
    if (path === null) {
      return; // Cancelled.
    }

    if (format.id === "docx") {
      await writeFile(path, await toDocx(title, content, style));
    } else {
      // The converters and their Tiptap schema load only when first used (§9).
      const [{ toMarkdown }, { toPlainText, toStandaloneHtml }] = await Promise.all([
        import("./markdown"),
        import("./html"),
      ]);
      const text =
        format.id === "markdown"
          ? toMarkdown(content)
          : format.id === "html"
            ? toStandaloneHtml(title, content, style)
            : toPlainText(content);
      await writeTextFile(path, text);
    }
    toast.success(`Exported “${title}” as ${format.label}.`);
  } catch (error) {
    console.error(error);
    toast.error(`Could not export “${title}”.`);
  }
}
