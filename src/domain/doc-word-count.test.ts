import { type Node, Schema } from "@tiptap/pm/model";
import { describe, expect, it, vi } from "vitest";
import { countDocumentWords } from "./doc-word-count";
import { countWords } from "./word-count";

// Spy on countWords to see how many blocks each count actually recounts.
vi.mock("./word-count", async (importOriginal) => {
  const original = await importOriginal<typeof import("./word-count")>();
  return { countWords: vi.fn(original.countWords) };
});

// A small schema with the block shapes the editor uses.
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: { group: "block", content: "inline*" },
    code_block: { group: "block", content: "text*", code: true },
    horizontal_rule: { group: "block" },
    bullet_list: { group: "block", content: "list_item+" },
    list_item: { content: "paragraph block*" },
    hard_break: { group: "inline", inline: true, leafText: () => "\n" },
    text: { group: "inline" },
  },
});

const text = (value: string) => schema.text(value);
const p = (...content: Node[]) => schema.node("paragraph", null, content);
const doc = (...blocks: Node[]) => schema.node("doc", null, blocks);

/** The full-text count the cache must always agree with. */
const plainCount = (node: Node) => countWords(node.textBetween(0, node.content.size, "\n"));

describe("countDocumentWords", () => {
  it.each([
    ["an empty document", doc(p())],
    [
      "paragraphs and a heading",
      doc(schema.node("heading", null, [text("A title")]), p(text("Two words."))),
    ],
    [
      "nested lists",
      doc(
        schema.node("bullet_list", null, [
          schema.node("list_item", null, [
            p(text("outer item")),
            schema.node("bullet_list", null, [schema.node("list_item", null, [p(text("inner"))])]),
          ]),
        ]),
      ),
    ],
    [
      "a line break between words",
      doc(p(text("before"), schema.node("hard_break"), text("after"))),
    ],
    ["a code block", doc(schema.node("code_block", null, [text("const x = 1;")]))],
    ["a divider", doc(p(text("one")), schema.node("horizontal_rule"), p(text("two")))],
    ["emoji and CJK", doc(p(text("Good morning 🌅")), p(text("私は学生です")))],
  ])("matches the full-text count for %s", (_name, node) => {
    expect(countDocumentWords(node)).toBe(plainCount(node));
  });

  it("recounts only the block that changed", () => {
    const blocks = Array.from({ length: 50 }, (_, index) => p(text(`Paragraph ${index} here.`)));
    const before = doc(...blocks);
    countDocumentWords(before);
    vi.mocked(countWords).mockClear();

    // Replace one block, as an edit would; the others are the same objects.
    const after = before.replace(
      before.child(0).nodeSize,
      before.child(0).nodeSize + before.child(1).nodeSize,
      doc(p(text("A changed paragraph with more words."))).slice(0),
    );

    expect(countDocumentWords(after)).toBe(plainCount(after));
    // One call for the changed block, one for plainCount's check.
    expect(vi.mocked(countWords)).toHaveBeenCalledTimes(2);
  });
});
