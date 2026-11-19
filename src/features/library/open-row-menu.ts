import type { KeyboardEvent } from "react";

/**
 * Opens a tree row's right-click menu from the keyboard (DESIGN_SPEC §8):
 * Shift+F10, or the Menu key where there is one. Macs have no Menu key, and
 * the browser does not turn Shift+F10 into a right-click there, so this
 * sends the row the right-click itself, positioned just below it.
 * Returns whether the key was handled.
 */
export function openRowMenuFromKeyboard(event: KeyboardEvent<HTMLElement>): boolean {
  const isMenuKey = event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
  if (!isMenuKey) {
    return false;
  }
  event.preventDefault();
  const row = event.currentTarget.getBoundingClientRect();
  event.currentTarget.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: row.left + 16,
      clientY: row.bottom,
    }),
  );
  return true;
}
