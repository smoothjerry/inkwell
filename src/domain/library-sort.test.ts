import { describe, expect, it } from "vitest";
import { type LibrarySort, sortLibraryItems } from "./library-sort";

type Item = { id: string; title: string; sortOrder: number; updatedAt: number };

const ITEMS: Item[] = [
  { id: "a", title: "Chapter 10", sortOrder: 2, updatedAt: 100 },
  { id: "b", title: "chapter 2", sortOrder: 3, updatedAt: 300 },
  { id: "c", title: "Appendix", sortOrder: 1, updatedAt: 200 },
];

const titles = (mode: LibrarySort, items: Item[] = ITEMS) =>
  sortLibraryItems(items, mode, (item) => item.title).map((item) => item.title);

describe("sortLibraryItems", () => {
  it.each([
    ["manual follows the drag-and-drop order", "manual", ["Appendix", "Chapter 10", "chapter 2"]],
    ["updated puts the newest first", "updated", ["chapter 2", "Appendix", "Chapter 10"]],
    [
      "title ignores case and orders numbers naturally",
      "title",
      ["Appendix", "chapter 2", "Chapter 10"],
    ],
  ] as const)("%s", (_name, mode, expected) => {
    expect(titles(mode)).toEqual(expected);
  });

  it("breaks ties by title, then by id", () => {
    const tied: Item[] = [
      { id: "z", title: "Same", sortOrder: 1, updatedAt: 1 },
      { id: "y", title: "Same", sortOrder: 1, updatedAt: 1 },
      { id: "x", title: "Earlier", sortOrder: 1, updatedAt: 1 },
    ];

    for (const mode of ["manual", "updated", "title"] as const) {
      expect(sortLibraryItems(tied, mode, (item) => item.title).map((item) => item.id)).toEqual([
        "x",
        "y",
        "z",
      ]);
    }
  });

  it("does not change the list it is given", () => {
    const items = [...ITEMS];

    sortLibraryItems(items, "title", (item) => item.title);

    expect(items).toEqual(ITEMS);
  });
});
