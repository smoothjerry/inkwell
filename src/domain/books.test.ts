import { describe, expect, it } from "vitest";
import {
  type BookDocument,
  type BookFolder,
  canMarkAsBook,
  containingBook,
  nestedBooks,
  readingOrder,
  wouldNestBooks,
} from "./books";

function folder(id: string, parentId: string | null, extra: Partial<BookFolder> = {}): BookFolder {
  return { id, parentId, name: id, sortOrder: 1, updatedAt: 0, bookFormat: null, ...extra };
}

function doc(id: string, folderId: string | null, extra: Partial<BookDocument> = {}): BookDocument {
  return { id, folderId, title: id, sortOrder: 1, updatedAt: 0, ...extra };
}

// library ─ novel (book) ─ part1 ─ deep
//         └ drafts ─ ideas
const FOLDERS = [
  folder("novel", null, { bookFormat: "trade-6x9" }),
  folder("part1", "novel"),
  folder("deep", "part1"),
  folder("drafts", null),
  folder("ideas", "drafts"),
];

describe("containingBook", () => {
  it("finds the book a folder is in, at any depth", () => {
    expect(containingBook("novel", FOLDERS)).toBe("novel");
    expect(containingBook("deep", FOLDERS)).toBe("novel");
  });

  it("gives null outside any book, and at the top level", () => {
    expect(containingBook("ideas", FOLDERS)).toBeNull();
    expect(containingBook(null, FOLDERS)).toBeNull();
  });
});

describe("canMarkAsBook", () => {
  it("allows an ordinary folder with no book above or below", () => {
    expect(canMarkAsBook("drafts", FOLDERS)).toBe(true);
    expect(canMarkAsBook("ideas", FOLDERS)).toBe(true);
  });

  it("allows a book to change its format", () => {
    expect(canMarkAsBook("novel", FOLDERS)).toBe(true);
  });

  it("refuses a folder inside a book", () => {
    expect(canMarkAsBook("deep", FOLDERS)).toBe(false);
  });

  it("refuses a folder that has a book inside it", () => {
    const folders = [...FOLDERS, folder("series", null)];
    const withSeries = folders.map((f) => (f.id === "novel" ? { ...f, parentId: "series" } : f));
    expect(canMarkAsBook("series", withSeries)).toBe(false);
  });
});

describe("wouldNestBooks", () => {
  it("refuses moving a book into another book", () => {
    const folders = [...FOLDERS, folder("memoir", null, { bookFormat: "a5" })];
    expect(wouldNestBooks("memoir", "part1", folders)).toBe(true);
  });

  it("refuses moving a folder that holds a book into a book", () => {
    const folders = [
      ...FOLDERS,
      folder("shelf", null),
      folder("memoir", "shelf", { bookFormat: "a5" }),
    ];
    expect(wouldNestBooks("shelf", "novel", folders)).toBe(true);
  });

  it("allows an ordinary folder into a book, and a book out to the top level", () => {
    expect(wouldNestBooks("drafts", "novel", FOLDERS)).toBe(false);
    expect(wouldNestBooks("novel", "drafts", FOLDERS)).toBe(false);
    expect(wouldNestBooks("novel", null, FOLDERS)).toBe(false);
  });
});

describe("nestedBooks", () => {
  it("lists only the inner book of a nested pair", () => {
    const folders = FOLDERS.map((f) => (f.id === "deep" ? { ...f, bookFormat: "a5" } : f));
    expect(nestedBooks(folders)).toEqual(["deep"]);
    expect(nestedBooks(FOLDERS)).toEqual([]);
  });
});

describe("readingOrder", () => {
  const folders = [
    folder("book", null, { bookFormat: "trade-6x9" }),
    folder("part2", "book", { sortOrder: 2 }),
    folder("part1", "book", { sortOrder: 1 }),
    folder("scenes", "part1", { sortOrder: 1 }),
  ];
  const documents = [
    doc("epilogue", "book", { sortOrder: 9 }),
    doc("afterword", "book", { sortOrder: 10 }),
    doc("ch2", "part1", { sortOrder: 2 }),
    doc("ch1", "part1", { sortOrder: 1 }),
    doc("scene-a", "scenes", { sortOrder: 1 }),
    doc("ch3", "part2", { sortOrder: 1 }),
    doc("cut", "part2", { sortOrder: 2, deletedAt: 123 }),
    doc("elsewhere", null),
  ];

  it("walks parts first, depth-first in manual order, then the book's own documents", () => {
    expect(readingOrder("book", folders, documents)).toEqual([
      "scene-a",
      "ch1",
      "ch2",
      "ch3",
      "epilogue",
      "afterword",
    ]);
  });

  it("breaks a tie in sort order by title, as the sidebar does", () => {
    const tied = [
      doc("b", "book", { title: "Chapter 10" }),
      doc("a", "book", { title: "Chapter 2" }),
    ];
    expect(readingOrder("book", [folders[0] as BookFolder], tied)).toEqual(["a", "b"]);
  });

  it("gives an empty book no chapters", () => {
    expect(readingOrder("book", folders, [])).toEqual([]);
  });
});
