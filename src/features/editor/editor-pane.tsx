import type { JSONContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLibraryStore } from "@/features/library";
import { getDocumentContent } from "@/lib/db";
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
  const [loaded, setLoaded] = useState<{ id: string; content: JSONContent } | null>(null);

  useEffect(() => {
    if (documentId === null) {
      return;
    }
    let cancelled = false;
    getDocumentContent(documentId)
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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="editor-column">
        <DocumentEditor key={documentId} documentId={documentId} initialContent={loaded.content} />
      </div>
    </div>
  );
}
