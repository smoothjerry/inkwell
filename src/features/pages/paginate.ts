import { DOMSerializer, Node as ProseMirrorNode, type Schema } from "@tiptap/pm/model";
import { getSchema, type JSONContent } from "@tiptap/react";
import { type BookFormat, textBlockSize } from "@/domain/book-formats";
import { type MeasuredBlock, type PageStart, packPages } from "@/domain/pagination";
import { createEditorExtensions } from "@/features/editor";
import {
  type MeasuredNode,
  MeasuringBox,
  measureInSlices,
  PX_PER_PT,
  readNode,
  textBlockElements,
  yieldToMain,
} from "./measure-blocks";

/** A document's pages in one format (DESIGN_SPEC §7.9). */
export type Pagination = {
  count: number;
  /**
   * Where pages 2 onwards start, as document positions: before the page's
   * first block when it starts with one, else at the first character of its
   * first line. The paged view draws its page gaps here.
   */
  breaks: number[];
  /** Each page's used height in CSS px; the paged view fills the rest of the page. */
  pageHeights: number[];
};

/** Measurements are kept per format and block, so an edit re-measures only what changed. */
const measured = new Map<string, MeasuredNode>();
const MAX_MEASURED = 50_000;

let schema: Schema | undefined;
let serializer: DOMSerializer | undefined;

function editorSchema(): { schema: Schema; serializer: DOMSerializer } {
  schema ??= getSchema(createEditorExtensions());
  serializer ??= DOMSerializer.fromSchema(schema);
  return { schema, serializer };
}

/** Waits for the format's faces, so nothing is measured in a fallback font. */
async function loadFonts(format: BookFormat) {
  const size = `${format.fontSize * PX_PER_PT}px "Newsreader Variable"`;
  await Promise.all(
    [
      size,
      `italic ${size}`,
      `600 ${size}`,
      `${size.replace("Newsreader Variable", "Geist Mono")}`,
    ].map((font) => document.fonts.load(font)),
  );
}

type TopLevel = {
  node: ProseMirrorNode;
  /** Document position of the node. */
  pos: number;
  /** A paragraph that opens the document or follows a heading has no first-line indent. */
  noIndent: boolean;
  key: string;
  element?: HTMLElement;
};

/** Document positions of a top-level node's text blocks, in order. */
function textBlockPositions(item: TopLevel): number[] {
  if (item.node.isTextblock) {
    return [item.pos];
  }
  const positions: number[] = [];
  item.node.descendants((child, offset) => {
    if (child.isTextblock) {
      positions.push(item.pos + 1 + offset);
      return false;
    }
    return true;
  });
  return positions;
}

/**
 * The offset, within a rendered text block, of the first character on line
 * `line` (0-based). Hard breaks count as one character, as in the document.
 */
function lineStartOffset(element: HTMLElement, line: number, lineHeight: number): number {
  const threshold = element.getBoundingClientRect().top + (line - 0.5) * lineHeight;
  const segments: { node: Node; start: number; length: number }[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let total = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length =
      node.nodeType === Node.TEXT_NODE
        ? (node.nodeValue ?? "").length
        : node.nodeName === "BR"
          ? 1
          : 0;
    if (length > 0) {
      segments.push({ node, start: total, length });
      total += length;
    }
  }

  const topOf = (offset: number): number => {
    const segment = segments.findLast((candidate) => candidate.start <= offset);
    if (!segment) {
      return Number.POSITIVE_INFINITY;
    }
    if (segment.node.nodeType !== Node.TEXT_NODE) {
      return (segment.node as Element).getBoundingClientRect().top;
    }
    const range = document.createRange();
    const local = offset - segment.start;
    range.setStart(segment.node, local);
    range.setEnd(segment.node, Math.min(local + 1, segment.length));
    // WebKit gives a line's first character an extra zero-width rect at the
    // end of the line before; the last rect is where the character is drawn.
    const rects = range.getClientRects();
    return rects[rects.length - 1]?.top ?? range.getBoundingClientRect().top;
  };

  let low = 0;
  let high = total;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (topOf(middle) >= threshold) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}

type Owner = { item: TopLevel; index: number; pos: number; lineHeight: number };

/**
 * The position before a block, moved out of any parent it opens (a list
 * item, a quote), so a page that starts with it starts at a block boundary
 * and the block keeps its first-line indent and list marker.
 */
function blockStart(doc: ProseMirrorNode, pos: number): number {
  const resolved = doc.resolve(pos);
  let start = pos;
  for (let depth = resolved.depth; depth > 0 && resolved.index(depth) === 0; depth -= 1) {
    start = resolved.before(depth);
  }
  return start;
}

/**
 * The document position where a page starts: before its first block when
 * the page starts with one, else the first character of its first line.
 */
function breakPosition(
  page: PageStart,
  owners: Owner[],
  box: MeasuringBox,
  doc: ProseMirrorNode,
): number {
  const owner = owners[page.block];
  if (!owner) {
    return doc.content.size;
  }
  if (page.line === 0) {
    return blockStart(doc, owner.pos);
  }
  owner.item.element ??= box.render(owner.item.node, owner.item.noIndent);
  const element = textBlockElements(owner.item.element)[owner.index];
  return element
    ? owner.pos + 1 + lineStartOffset(element, page.line, owner.lineHeight)
    : owner.pos + 1;
}

/**
 * Paginates a document in a print format. It lays each top-level block out
 * in the format's typography (book-typography.css) in short slices, packs
 * the measured lines into pages (domain/pagination.ts), and finds where each
 * page's first line starts. Blocks measured before, in this format, are not
 * measured again.
 */
export async function paginate(
  content: JSONContent | ProseMirrorNode,
  format: BookFormat,
  signal?: AbortSignal,
): Promise<Pagination> {
  await loadFonts(format);
  const { schema, serializer } = editorSchema();
  // The paged view passes its live document; serializing works by type
  // name, so a document from the editor's own schema serializes the same.
  const doc: ProseMirrorNode =
    content instanceof ProseMirrorNode ? content : schema.nodeFromJSON(content);

  const items: TopLevel[] = [];
  let previousType: string | null = null;
  doc.forEach((node, offset) => {
    const noIndent =
      node.type.name === "paragraph" && (previousType === null || previousType === "heading");
    items.push({ node, pos: offset, noIndent, key: "" });
    previousType = node.type.name;
  });

  // Keys first, in slices: stringifying 50k words is itself work.
  let sliceStart = performance.now();
  for (const item of items) {
    item.key = `${format.id}|${item.noIndent ? 1 : 0}|${JSON.stringify(item.node.toJSON())}`;
    if (performance.now() - sliceStart > 8) {
      await yieldToMain();
      sliceStart = performance.now();
    }
  }

  const box = new MeasuringBox(format, serializer);
  try {
    const missing = items.filter((item) => !measured.has(item.key));
    await measureInSlices(
      missing,
      (item) => {
        item.element = box.render(item.node, item.noIndent);
        return item.element;
      },
      (item, element) => {
        measured.set(item.key, readNode(element));
      },
      signal,
    );
    if (measured.size > MAX_MEASURED) {
      measured.clear();
    }

    // Flatten to text blocks, with the space above each.
    const blocks: MeasuredBlock[] = [];
    const owners: Owner[] = [];
    let pendingGap = 0;
    let previousMarginBottom: number | null = null;
    for (const item of items) {
      const node = measured.get(item.key) ?? readNode(box.render(item.node, item.noIndent));
      const collapsed =
        previousMarginBottom === null ? 0 : Math.max(previousMarginBottom, node.marginTop);
      const positions = textBlockPositions(item);
      let bottom = 0;
      node.textBlocks.forEach((block, index) => {
        blocks.push({
          gapBefore: index === 0 ? pendingGap + collapsed + block.top : block.top - bottom,
          lineHeight: block.lineHeight,
          lines: block.lines,
          keepWithNext: block.isHeading,
          splittable: !block.isHeading,
        });
        owners.push({
          item,
          index,
          pos: positions[index] ?? item.pos,
          lineHeight: block.lineHeight,
        });
        bottom = block.top + block.height;
      });
      pendingGap =
        node.textBlocks.length === 0 ? pendingGap + collapsed + node.height : node.height - bottom;
      previousMarginBottom = node.marginBottom;
    }

    const pageHeight = textBlockSize(format).height * PX_PER_PT;
    const pages = packPages(blocks, pageHeight);
    // A page that starts mid-paragraph needs its line's first character, which
    // takes layout; that is done in slices too.
    const breaks: number[] = [];
    sliceStart = performance.now();
    for (const page of pages.slice(1)) {
      breaks.push(breakPosition(page, owners, box, doc));
      if (performance.now() - sliceStart > 8) {
        if (signal?.aborted) {
          throw new DOMException("Pagination was cancelled", "AbortError");
        }
        await yieldToMain();
        sliceStart = performance.now();
      }
    }
    return { count: pages.length, breaks, pageHeights: pages.map((page) => page.height) };
  } finally {
    box.dispose();
  }
}

/** Finished and running paginations, newest last. Each holds only a count and positions. */
const results = new Map<string, Promise<Pagination>>();
const MAX_RESULTS = 1000;

/**
 * Paginates a stored document, caching the result per document, format, and
 * `updatedAt` (DESIGN_SPEC §7.9), so a count asked for twice, or by the
 * status bar and the Page Counts dialog at once, is computed once.
 * `loadContent` is called only when there is no result yet. A run is shared,
 * so it is never cancelled; a caller that no longer wants it ignores it.
 * A failed run is not kept.
 */
export function paginateDocument(
  documentId: string,
  updatedAt: number,
  loadContent: () => Promise<JSONContent>,
  format: BookFormat,
): Promise<Pagination> {
  const key = `${documentId}|${format.id}|${updatedAt}`;
  const cached = results.get(key);
  if (cached) {
    return cached;
  }
  const result = loadContent().then((content) => paginate(content, format));
  results.set(key, result);
  result.catch(() => results.delete(key));
  if (results.size > MAX_RESULTS) {
    const oldest = results.keys().next().value;
    if (oldest !== undefined) {
      results.delete(oldest);
    }
  }
  return result;
}
