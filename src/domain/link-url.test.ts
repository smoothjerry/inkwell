import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./link-url";

describe("normalizeUrl", () => {
  it("adds https:// to an address without a scheme", () => {
    expect(normalizeUrl(" example.com/page ")).toBe("https://example.com/page");
  });

  it("keeps an address that has a scheme", () => {
    expect(normalizeUrl("mailto:me@example.com")).toBe("mailto:me@example.com");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("keeps an empty address empty", () => {
    expect(normalizeUrl("  ")).toBe("");
  });
});
