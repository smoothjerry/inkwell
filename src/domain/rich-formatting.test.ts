import { describe, expect, it } from "vitest";
import {
  isHighlight,
  isTextColor,
  markValue,
  runFontSize,
  stepFontSize,
  stepIndent,
} from "./rich-formatting";

describe("colour names", () => {
  it("accepts only names on the palettes", () => {
    expect(isTextColor("red")).toBe(true);
    expect(isTextColor("#ff0000")).toBe(false);
    expect(isHighlight("yellow")).toBe(true);
    expect(isHighlight("orange")).toBe(false);
    expect(isHighlight(null)).toBe(false);
  });
});

describe("stepIndent", () => {
  it("steps in and out", () => {
    expect(stepIndent(0, 1)).toBe(1);
    expect(stepIndent(3, -1)).toBe(2);
  });

  it("stays within 0 to 5", () => {
    expect(stepIndent(5, 1)).toBe(5);
    expect(stepIndent(0, -1)).toBe(0);
  });

  it.each([[null], [2.5], [9], ["2"]])("treats %s as no indent", (indent) => {
    expect(stepIndent(indent, 1)).toBe(1);
  });
});

describe("stepFontSize", () => {
  it("moves to the next step", () => {
    expect(stepFontSize(13, 1)).toBe(14);
    expect(stepFontSize(14, 1)).toBe(16);
    expect(stepFontSize(13, -1)).toBe(12);
  });

  it("goes from a size between steps to the nearest step that way", () => {
    expect(stepFontSize(15, 1)).toBe(16);
    expect(stepFontSize(15, -1)).toBe(14);
  });

  it("stays at the ends", () => {
    expect(stepFontSize(72, 1)).toBe(72);
    expect(stepFontSize(8, -1)).toBe(8);
  });
});

describe("runFontSize", () => {
  it("uses the mark's size, else the document's", () => {
    expect(runFontSize(20, 13)).toBe(20);
    expect(runFontSize(null, 13)).toBe(13);
    expect(runFontSize(200, 13)).toBe(13);
  });
});

describe("markValue", () => {
  it("removes the mark when the document's own value is chosen", () => {
    expect(markValue("lora", "lora")).toBeNull();
    expect(markValue(13, 13)).toBeNull();
  });

  it("keeps a value that differs from the document's", () => {
    expect(markValue("inter", "lora")).toBe("inter");
    expect(markValue(18, 13)).toBe(18);
  });
});
