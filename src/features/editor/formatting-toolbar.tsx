import { type Editor, useEditorState } from "@tiptap/react";
import {
  Baseline,
  Bold,
  Highlighter,
  Italic,
  Link,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  ListTodo,
  Redo2,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Underline,
  Undo2,
} from "lucide-react";
import { type FocusEvent, type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { HIGHLIGHTS, TEXT_COLORS } from "@/domain/rich-formatting";
import { FontPicker } from "@/features/settings";
import { useSettingsStore } from "@/stores/settings-store";
import { ColorPicker } from "./color-picker";
import { applyFormatAction } from "./format-actions";
import { ParagraphStylePicker } from "./paragraph-style-picker";
import { chooseFont, chooseFontSize } from "./rich-formatting";
import { SizePicker } from "./size-picker";
import { ToolbarButton } from "./toolbar-button";
import { ToolbarOverflowMenu } from "./toolbar-overflow-menu";
import { getToolbarState, TOOLBAR_GROUPS, type ToolbarGroup } from "./toolbar-state";

/** Width kept for the ⋯ button, with its gap, in px. */
const OVERFLOW_BUTTON_WIDTH = 36;

type FormattingToolbarProps = {
  editor: Editor;
};

/** The toolbar's controls that take keyboard focus, in order, skipping hidden groups. */
function focusableControls(toolbar: HTMLElement): HTMLButtonElement[] {
  return [...toolbar.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")].filter(
    (button) => button.getClientRects().length > 0,
  );
}

/**
 * Puts only the control at `index` in the tab order. Every other button,
 * disabled or hidden ones too, is taken out, so one that is enabled or shown
 * later does not add a second tab stop.
 */
function setTabStop(toolbar: HTMLElement, index: number) {
  for (const button of toolbar.querySelectorAll("button")) {
    button.tabIndex = -1;
  }
  const control = focusableControls(toolbar)[index];
  if (control) {
    control.tabIndex = 0;
  }
}

/**
 * The formatting toolbar (DESIGN_SPEC §7.11): one tab stop, with arrow keys
 * between controls (a roving tabindex) and Esc back to the document. Groups
 * that do not fit move into the ⋯ menu from the right.
 */
export function FormattingToolbar({ editor }: FormattingToolbarProps) {
  const editorFont = useSettingsStore((state) => state.editorFont);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => getToolbarState(editor, editorFont),
  });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const groupWidths = useRef<number[] | null>(null);
  const activeControl = useRef(0);
  const [visibleCount, setVisibleCount] = useState<number>(TOOLBAR_GROUPS.length);

  const apply = (action: string) => applyFormatAction(editor, action);
  // After a menu choice, focus returns to the document rather than the button.
  const returnToDocument = (event: Event) => {
    event.preventDefault();
    editor.commands.focus();
  };

  // Measures each group once, while all are shown, then fits them to the width.
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) {
      return;
    }
    const groups = [...toolbar.querySelectorAll<HTMLElement>("[data-toolbar-group]")];
    groupWidths.current ??= groups.map((group) => group.getBoundingClientRect().width);

    const fitGroups = () => {
      const widths = groupWidths.current ?? [];
      const style = getComputedStyle(toolbar);
      const available =
        toolbar.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      let used = 0;
      let count = 0;
      for (const [index, width] of widths.entries()) {
        const reserve = index < widths.length - 1 ? OVERFLOW_BUTTON_WIDTH : 0;
        if (used + width + reserve > available) {
          break;
        }
        used += width;
        count += 1;
      }
      setVisibleCount(count);
    };
    fitGroups();
    const observer = new ResizeObserver(fitGroups);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  // Exactly one control is in the tab order: the one last focused.
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) {
      return;
    }
    const count = focusableControls(toolbar).length;
    activeControl.current = Math.min(activeControl.current, Math.max(count - 1, 0));
    setTabStop(toolbar, activeControl.current);
  });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const toolbar = toolbarRef.current;
    // Keys pressed inside an open menu bubble here through the React tree; leave them be.
    if (
      !toolbar ||
      !(event.target instanceof HTMLButtonElement) ||
      !toolbar.contains(event.target)
    ) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      editor.commands.focus();
      return;
    }
    const controls = focusableControls(toolbar);
    const current = controls.indexOf(event.target);
    const next = {
      ArrowRight: (current + 1) % controls.length,
      ArrowLeft: (current - 1 + controls.length) % controls.length,
      Home: 0,
      End: controls.length - 1,
    }[event.key];
    if (next !== undefined && current !== -1) {
      event.preventDefault();
      controls[next]?.focus();
    }
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    const toolbar = toolbarRef.current;
    if (toolbar && event.target instanceof HTMLButtonElement) {
      const index = focusableControls(toolbar).indexOf(event.target);
      if (index !== -1 && index !== activeControl.current) {
        activeControl.current = index;
        setTabStop(toolbar, index);
      }
    }
  }

  function renderGroup(id: ToolbarGroup) {
    switch (id) {
      case "history":
        return (
          <>
            <ToolbarButton
              label="Undo"
              Icon={Undo2}
              disabled={!state.canUndo}
              onClick={() => apply("undo")}
            />
            <ToolbarButton
              label="Redo"
              Icon={Redo2}
              disabled={!state.canRedo}
              onClick={() => apply("redo")}
            />
          </>
        );
      case "style":
        return (
          <ParagraphStylePicker
            value={state.paragraphStyle}
            onChange={(style) => apply(`style-${style}`)}
            onCloseAutoFocus={returnToDocument}
          />
        );
      case "font":
        return (
          <FontPicker
            label="Font"
            value={state.fontId}
            onChange={(fontId) => chooseFont(editor, fontId)}
            compact
            onCloseAutoFocus={returnToDocument}
          />
        );
      case "size":
        return (
          <SizePicker
            value={state.fontSize}
            onChange={(size) => chooseFontSize(editor, size)}
            onCloseAutoFocus={returnToDocument}
          />
        );
      case "marks":
        return (
          <>
            <ToolbarButton
              label="Bold"
              Icon={Bold}
              isActive={state.bold}
              onClick={() => apply("bold")}
            />
            <ToolbarButton
              label="Italic"
              Icon={Italic}
              isActive={state.italic}
              onClick={() => apply("italic")}
            />
            <ToolbarButton
              label="Underline"
              Icon={Underline}
              isActive={state.underline}
              onClick={() => apply("underline")}
            />
            <ToolbarButton
              label="Strikethrough"
              Icon={Strikethrough}
              isActive={state.strike}
              onClick={() => apply("strike")}
            />
          </>
        );
      case "colors":
        return (
          <>
            <ColorPicker
              label="Text colour"
              Icon={Baseline}
              options={TEXT_COLORS}
              tokenPrefix="text"
              noneLabel="Default"
              value={state.textColor}
              onChange={(name) => apply(name === null ? "color-default" : `color-${name}`)}
              onCloseAutoFocus={returnToDocument}
            />
            <ColorPicker
              label="Highlight"
              Icon={Highlighter}
              options={HIGHLIGHTS}
              tokenPrefix="highlight"
              noneLabel="None"
              value={state.highlight}
              onChange={(name) => apply(name === null ? "highlight-none" : `highlight-${name}`)}
              onCloseAutoFocus={returnToDocument}
            />
          </>
        );
      case "link":
        return (
          <ToolbarButton
            label="Link"
            Icon={Link}
            isActive={state.link}
            onClick={() => apply("link")}
          />
        );
      case "align":
        return (
          <>
            <ToolbarButton
              label="Align left"
              Icon={TextAlignStart}
              isActive={state.alignment === "left"}
              onClick={() => apply("align-left")}
            />
            <ToolbarButton
              label="Align centre"
              Icon={TextAlignCenter}
              isActive={state.alignment === "center"}
              onClick={() => apply("align-center")}
            />
            <ToolbarButton
              label="Align right"
              Icon={TextAlignEnd}
              isActive={state.alignment === "right"}
              onClick={() => apply("align-right")}
            />
            <ToolbarButton
              label="Justify"
              Icon={TextAlignJustify}
              isActive={state.alignment === "justify"}
              onClick={() => apply("align-justify")}
            />
          </>
        );
      case "lists":
        return (
          <>
            <ToolbarButton
              label="Bulleted list"
              Icon={List}
              isActive={state.list === "bullet"}
              onClick={() => apply("list-bullet")}
            />
            <ToolbarButton
              label="Numbered list"
              Icon={ListOrdered}
              isActive={state.list === "numbered"}
              onClick={() => apply("list-numbered")}
            />
            <ToolbarButton
              label="Task list"
              Icon={ListTodo}
              isActive={state.list === "task"}
              onClick={() => apply("list-task")}
            />
          </>
        );
      case "indent":
        return (
          <>
            <ToolbarButton
              label="Outdent"
              Icon={ListIndentDecrease}
              onClick={() => apply("outdent")}
            />
            <ToolbarButton
              label="Indent"
              Icon={ListIndentIncrease}
              onClick={() => apply("indent")}
            />
          </>
        );
    }
  }

  const hiddenGroups = TOOLBAR_GROUPS.slice(visibleCount);

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Formatting"
      className="flex h-9 shrink-0 items-center border-b bg-background px-2 text-[13px]"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
    >
      {TOOLBAR_GROUPS.map((id, index) => (
        <div
          key={id}
          data-toolbar-group={id}
          hidden={index >= visibleCount}
          className="flex shrink-0 items-center gap-0.5 pr-1.5 not-first:border-l not-first:pl-1.5"
        >
          {renderGroup(id)}
        </div>
      ))}
      {hiddenGroups.length > 0 && (
        <div className="ml-auto flex shrink-0 items-center">
          <ToolbarOverflowMenu
            groups={hiddenGroups}
            state={state}
            apply={apply}
            onFont={(fontId) => chooseFont(editor, fontId)}
            onSize={(size) => chooseFontSize(editor, size)}
            onCloseAutoFocus={returnToDocument}
          />
        </div>
      )}
    </div>
  );
}
