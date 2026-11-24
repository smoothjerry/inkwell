import "./book-typography.css";
import type { DOMSerializer, Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { BookFormat } from "@/domain/book-formats";
import { textBlockSize } from "@/domain/book-formats";

/** CSS px per point: the paged view draws pages at 96 px per inch. */
export const PX_PER_PT = 96 / 72;

/** The elements a document's text blocks (paragraph, heading, code block) render as. */
const TEXT_BLOCKS = "p, h1, h2, h3, pre";

/** How long one slice of measuring may run before it yields, in ms. */
const SLICE_MS = 8;

/** Top-level blocks measured per layout. */
const BATCH = 16;

/** One text block of a measured top-level block. Lengths are in CSS px. */
export type MeasuredTextBlock = {
  /** From the top of the top-level block's border box. */
  top: number;
  height: number;
  lineHeight: number;
  lines: number;
  isHeading: boolean;
};

/** A measured top-level block of the document. */
export type MeasuredNode = {
  marginTop: number;
  marginBottom: number;
  /** Border-box height. */
  height: number;
  textBlocks: MeasuredTextBlock[];
};

/** Lets other work run between slices. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

/** A computed line height in px; a plain number is a multiple of the font size. */
function lineHeightPx(style: CSSStyleDeclaration): number {
  const value = Number.parseFloat(style.lineHeight);
  return style.lineHeight.endsWith("px") ? value : value * Number.parseFloat(style.fontSize);
}

/**
 * An offscreen box laid out in a format's typography, `width` its text block.
 * One exists per pagination run; `dispose` removes it.
 */
export class MeasuringBox {
  readonly element: HTMLDivElement;
  private readonly serializer: DOMSerializer;

  constructor(format: BookFormat, serializer: DOMSerializer) {
    this.serializer = serializer;
    const width = textBlockSize(format).width * PX_PER_PT;
    const element = document.createElement("div");
    element.className = "book-text";
    element.setAttribute("aria-hidden", "true");
    Object.assign(element.style, {
      position: "absolute",
      top: "0",
      left: "-100000px",
      width: `${width}px`,
      visibility: "hidden",
      contain: "layout style",
    });
    element.style.setProperty("--book-font-size", `${format.fontSize * PX_PER_PT}px`);
    element.style.setProperty("--book-line-height", `${format.lineHeight * PX_PER_PT}px`);
    document.body.append(element);
    this.element = element;
  }

  /** Renders a top-level block into the box and returns its element. */
  render(node: ProseMirrorNode, noIndent: boolean): HTMLElement {
    const element = this.serializer.serializeNode(node) as HTMLElement;
    if (noIndent) {
      element.classList.add("book-no-indent");
    }
    this.element.append(element);
    return element;
  }

  dispose() {
    this.element.remove();
  }
}

/** Reads a rendered top-level block's geometry. Forces layout. */
export function readNode(element: HTMLElement): MeasuredNode {
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  const blocks = textBlockElements(element);
  return {
    marginTop: Number.parseFloat(style.marginTop),
    marginBottom: Number.parseFloat(style.marginBottom),
    height: box.height,
    textBlocks: blocks.map((block) => {
      const rect = block.getBoundingClientRect();
      const lineHeight = lineHeightPx(getComputedStyle(block));
      return {
        top: rect.top - box.top,
        height: rect.height,
        lineHeight,
        lines: Math.max(1, Math.round(rect.height / lineHeight)),
        isHeading: /^H[1-6]$/.test(block.tagName),
      };
    }),
  };
}

/** Text blocks of a rendered top-level block, in document order. */
export function textBlockElements(element: HTMLElement): HTMLElement[] {
  return element.matches(TEXT_BLOCKS)
    ? [element]
    : [...element.querySelectorAll<HTMLElement>(TEXT_BLOCKS)];
}

/**
 * Measures top-level blocks in slices of about `SLICE_MS`, yielding between
 * them so typing and painting are never held up. `measure` is called with
 * each block that still needs measuring; it renders into the box, and the
 * batch is read in one layout.
 */
export async function measureInSlices<T>(
  items: readonly T[],
  render: (item: T) => HTMLElement,
  read: (item: T, element: HTMLElement) => void,
  signal?: AbortSignal,
): Promise<void> {
  let sliceStart = performance.now();
  for (let start = 0; start < items.length; start += BATCH) {
    if (signal?.aborted) {
      throw new DOMException("Pagination was cancelled", "AbortError");
    }
    const batch = items.slice(start, start + BATCH);
    const elements = batch.map(render);
    batch.forEach((item, index) => {
      read(item, elements[index] as HTMLElement);
    });
    if (performance.now() - sliceStart > SLICE_MS) {
      await yieldToMain();
      sliceStart = performance.now();
    }
  }
}
