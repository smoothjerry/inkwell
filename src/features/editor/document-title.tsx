import { useLibraryStore } from "@/features/library";

type DocumentTitleProps = {
  documentId: string;
  /** Called when Enter is pressed, to move on to the document body. */
  onEnter: () => void;
};

/** The large editable title above the editor. Saves on blur or Enter. */
export function DocumentTitle({ documentId, onEnter }: DocumentTitleProps) {
  const title = useLibraryStore(
    (state) => state.documents.find((doc) => doc.id === documentId)?.title ?? "",
  );

  function commit(value: string) {
    const next = value.trim() || "Untitled";
    if (next !== title) {
      void useLibraryStore.getState().renameDocument(documentId, next);
    }
  }

  return (
    <input
      // Remount when the stored title changes (for example a sidebar rename).
      key={title}
      defaultValue={title}
      placeholder="Untitled"
      aria-label="Document title"
      className="editor-title"
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}
