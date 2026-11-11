/** A library folder. Timestamps are UTC milliseconds. */
export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** A document without its content, as shown in lists. */
export type DocumentSummary = {
  id: string;
  folderId: string | null;
  title: string;
  wordCount: number;
  pinned: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};
