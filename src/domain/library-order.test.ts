import { describe, expect, it } from "vitest";
import {
  dropZone,
  isSameOrDescendant,
  planDrop,
  sortOrderBetween,
  type TreeItem,
} from "./library-order";

function folder(id: string, parentId: string | null, sortOrder: number): TreeItem {
  return { kind: "folder", id, parentId, sortOrder };
}

function doc(id: string, parentId: string | null, sortOrder: number): TreeItem {
  return { kind: "document", id, parentId, sortOrder };
}

// Drafts (1) ⊃ Chapters (1) ⊃ Old (1); Notes (2) at the top level.
const FOLDERS = [
  folder("drafts", null, 1),
  folder("chapters", "drafts", 1),
  folder("old", "chapters", 1),
  folder("notes", null, 2),
];
// a (1), b (2), c (3) at the top level; d (1) in Drafts.
const DOCUMENTS = [doc("a", null, 1), doc("b", null, 2), doc("c", null, 3), doc("d", "drafts", 1)];

describe("dropZone", () => {
  it.each([
    ["document over a document's top half", "document", "document", 0.4, "before"],
    ["document over a document's bottom half", "document", "document", 0.6, "after"],
    ["document anywhere on a folder", "document", "folder", 0.1, "inside"],
    ["folder over a folder's top quarter", "folder", "folder", 0.2, "before"],
    ["folder over a folder's middle", "folder", "folder", 0.5, "inside"],
    ["folder over a folder's bottom quarter", "folder", "folder", 0.8, "after"],
  ] as const)("%s", (_name, dragged, target, ratio, expected) => {
    expect(dropZone(dragged, target, ratio)).toBe(expected);
  });
});

describe("sortOrderBetween", () => {
  it.each([
    ["between two neighbours", 1, 2, 1.5],
    ["before the first", null, 1, 0],
    ["after the last", 3, null, 4],
    ["in an empty list", null, null, 1],
  ])("%s", (_name, before, after, expected) => {
    expect(sortOrderBetween(before, after)).toBe(expected);
  });
});

describe("isSameOrDescendant", () => {
  it.each([
    ["the folder itself", "drafts", "drafts", true],
    ["a child", "drafts", "chapters", true],
    ["a grandchild", "drafts", "old", true],
    ["a sibling", "drafts", "notes", false],
    ["an ancestor", "old", "drafts", false],
    ["the top level", "drafts", null, false],
  ])("%s", (_name, folderId, candidate, expected) => {
    expect(isSameOrDescendant(FOLDERS, folderId, candidate)).toBe(expected);
  });

  it("stops on a cycle in corrupt data", () => {
    const looped = [folder("x", "y", 1), folder("y", "x", 1)];

    expect(isSameOrDescendant(looped, "z", "x")).toBe(false);
  });
});

describe("planDrop", () => {
  const plan = (dragged: TreeItem, target: Parameters<typeof planDrop>[1]) =>
    planDrop(dragged, target, FOLDERS, DOCUMENTS);

  it("moves to the end of the top level when dropped on the background", () => {
    expect(plan(doc("d", "drafts", 1), { kind: "root" })).toEqual({
      parentId: null,
      sortOrder: null,
    });
  });

  it("reorders a document before another", () => {
    expect(plan(doc("c", null, 3), { kind: "document", id: "b", zone: "before" })).toEqual({
      parentId: null,
      sortOrder: 1.5,
    });
  });

  it("reorders a document after the last one", () => {
    expect(plan(doc("a", null, 1), { kind: "document", id: "c", zone: "after" })).toEqual({
      parentId: null,
      sortOrder: 4,
    });
  });

  it("leaves the dragged item out when finding neighbours", () => {
    // Dropping a after b: b's next neighbour is c (3), not a.
    expect(plan(doc("a", null, 1), { kind: "document", id: "b", zone: "after" })).toEqual({
      parentId: null,
      sortOrder: 2.5,
    });
  });

  it("moves a document next to one in another folder", () => {
    expect(plan(doc("a", null, 1), { kind: "document", id: "d", zone: "before" })).toEqual({
      parentId: "drafts",
      sortOrder: 0,
    });
  });

  it("moves a document into a folder, at the end", () => {
    expect(plan(doc("a", null, 1), { kind: "folder", id: "notes", zone: "inside" })).toEqual({
      parentId: "notes",
      sortOrder: null,
    });
  });

  it("moves a folder into another folder", () => {
    expect(plan(folder("notes", null, 2), { kind: "folder", id: "old", zone: "inside" })).toEqual({
      parentId: "old",
      sortOrder: null,
    });
  });

  it("reorders a folder next to another", () => {
    expect(
      plan(folder("notes", null, 2), { kind: "folder", id: "drafts", zone: "before" }),
    ).toEqual({ parentId: null, sortOrder: 0 });
  });

  it.each([
    ["onto itself", folder("drafts", null, 1), { kind: "folder", id: "drafts", zone: "inside" }],
    [
      "into its child",
      folder("drafts", null, 1),
      { kind: "folder", id: "chapters", zone: "inside" },
    ],
    [
      "into its grandchild",
      folder("drafts", null, 1),
      { kind: "folder", id: "old", zone: "inside" },
    ],
    [
      "next to its own descendant",
      folder("drafts", null, 1),
      { kind: "folder", id: "old", zone: "after" },
    ],
    [
      "a folder next to a document",
      folder("notes", null, 2),
      { kind: "document", id: "a", zone: "after" },
    ],
    [
      "a document inside a document",
      doc("a", null, 1),
      { kind: "document", id: "b", zone: "inside" },
    ],
    ["a document onto itself", doc("a", null, 1), { kind: "document", id: "a", zone: "after" }],
  ] as const)("refuses %s", (_name, dragged, target) => {
    expect(plan(dragged, target)).toBeNull();
  });
});

describe("planDrop with books", () => {
  // Novel is a book; Memoir is a book; Drafts holds Memoir.
  const folders: TreeItem[] = [
    { ...folder("novel", null, 1), bookFormat: "trade-6x9" },
    folder("part", "novel", 1),
    folder("drafts", null, 2),
    { ...folder("memoir", "drafts", 1), bookFormat: "a5" },
    folder("notes", null, 3),
  ];

  it.each([
    ["a book into another book", folder("memoir", "drafts", 1), "part"],
    ["a folder holding a book into a book", folder("drafts", null, 2), "novel"],
  ] as const)("refuses %s", (_name, dragged, targetId) => {
    expect(
      planDrop(dragged, { kind: "folder", id: targetId, zone: "inside" }, folders, []),
    ).toBeNull();
  });

  it("refuses placing a book next to a folder inside another book", () => {
    const target = { kind: "folder", id: "part", zone: "after" } as const;
    expect(planDrop(folder("memoir", "drafts", 1), target, folders, [])).toBeNull();
  });

  it("allows an ordinary folder into a book, and a document anywhere", () => {
    const inside = { kind: "folder", id: "novel", zone: "inside" } as const;
    expect(planDrop(folder("notes", null, 3), inside, folders, [])).toEqual({
      parentId: "novel",
      sortOrder: null,
    });
    expect(planDrop(doc("x", null, 1), inside, folders, [doc("x", null, 1)])).not.toBeNull();
  });
});
