import { countWords } from "@/domain/word-count";
import { createDocument, renameDocument, saveDocumentContent } from "@/lib/db";

type Block =
  | { type: "heading" | "paragraph"; text: string }
  | { type: "bulletList"; items: string[] };

const BLOCKS: Block[] = [
  {
    type: "paragraph",
    text: "Inkwell is a quiet place to write. Everything you write stays on this computer.",
  },
  { type: "heading", text: "Writing" },
  {
    type: "paragraph",
    text: "Just start typing. Formatting works with Markdown shortcuts at the start of a line:",
  },
  {
    type: "bulletList",
    items: [
      "# and a space for a heading (## and ### for smaller ones)",
      "- and a space for a bullet list, 1. for a numbered list",
      "> and a space for a quote",
      "--- for a divider",
      "**bold** and _italic_ around words",
    ],
  },
  {
    type: "paragraph",
    text: "Type / on a line to pick a block from a menu, or select text for a small toolbar.",
  },
  { type: "heading", text: "Your streak" },
  {
    type: "bulletList",
    items: [
      "You set a weekly word goal. Reach it and the week counts toward your streak.",
      "Only new words count. Deleting never takes words away, and pasted text counts too.",
      "A week in progress never breaks the streak; you have until the week ends.",
      "A daily target is optional and only fills the ring for today.",
    ],
  },
  {
    type: "paragraph",
    text: "Your progress is always at the bottom of the window. You can change your goal in Settings.",
  },
];

function textNode(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function toNode(block: Block) {
  if (block.type === "bulletList") {
    return {
      type: "bulletList",
      content: block.items.map((item) => ({ type: "listItem", content: [textNode(item)] })),
    };
  }
  if (block.type === "heading") {
    return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: block.text }] };
  }
  return textNode(block.text);
}

/** Creates the "Welcome" document shown after onboarding and returns its id. */
export async function createWelcomeDocument(): Promise<string> {
  const content = JSON.stringify({ type: "doc", content: BLOCKS.map(toNode) });
  const plainText = BLOCKS.flatMap((block) =>
    block.type === "bulletList" ? block.items : [block.text],
  ).join("\n");

  const id = await createDocument(null);
  await renameDocument(id, "Welcome");
  await saveDocumentContent(id, content, plainText, countWords(plainText));
  return id;
}
