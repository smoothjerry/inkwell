import type { JSONContent } from "@tiptap/react";
import { type CSSProperties, useEffect, useState } from "react";
import { toast } from "sonner";
import { fontById, fontFamilyCss } from "@/domain/fonts";
import { useLibraryStore } from "@/features/library";
import { getDocumentContent } from "@/lib/db";
import { useSettingsStore } from "@/stores/settings-store";
import { whenSavesSettle } from "./autosaver";
import { DocumentEditor } from "./document-editor";

const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

function parseContent(raw: string | null): JSONContent {
  if (raw === null) {
    return EMPTY_DOCUMENT;
  }
  try {
    return JSON.parse(raw) as JSONContent;
  } catch (error) {
    console.error(error);
    return EMPTY_DOCUMENT;
  }
}

/** The editor canvas: loads the selected document and shows its editor. */
export function EditorPane() {
  const documentId = useLibraryStore((state) => state.selectedDocumentId);
  const editorFont = useSettingsStore((state) => state.editorFont);
  const editorWidth = useSettingsStore((state) => state.editorWidth);
  const typewriterMode = useSettingsStore((state) => state.typewriterMode);
  const [loaded, setLoaded] = useState<{ id: string; content: JSONContent } | null>(null);

  useEffect(() => {
    if (documentId === null) {
      return;
    }
    let cancelled = false;
    // Wait for the previous document's last save, in case it is this one.
    whenSavesSettle()
      .then(() => getDocumentContent(documentId))
      .then((raw) => {
        if (!cancelled) {
          setLoaded({ id: documentId, content: parseContent(raw) });
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        toast.error("Could not open the document.");
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (documentId === null) {
    return (
      <div className="mx-auto w-full max-w-[68ch] px-8 pt-8">
        <p className="text-muted-foreground">Select or create a document.</p>
      </div>
    );
  }

  if (loaded?.id !== documentId) {
    return null;
  }

  const columnStyle = {
    "--editor-font": fontFamilyCss(fontById(editorFont)),
  } as CSSProperties;

  return (
    <div className="editor-scroll min-h-0 flex-1 overflow-y-auto">
      <div
        className="editor-column"
        style={columnStyle}
        data-font={editorFont}
        data-width={editorWidth}
        data-typewriter={typewriterMode}
      >
        <DocumentEditor key={documentId} documentId={documentId} initialContent={loaded.content} />
      </div>
    </div>
  );
}
