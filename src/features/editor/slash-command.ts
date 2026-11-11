import { Extension } from "@tiptap/react";
import { Suggestion, type SuggestionProps } from "@tiptap/suggestion";
import { filterSlashItems, type SlashItem } from "./slash-items";
import { useSlashMenuStore } from "./slash-menu-store";

function show(props: SuggestionProps<SlashItem, SlashItem>) {
  useSlashMenuStore.setState({
    isOpen: true,
    items: props.items,
    selectedIndex: 0,
    anchor: props.clientRect?.() ?? null,
    pick: (item) => props.command(item),
  });
}

/** Typing "/" opens a menu of blocks to insert (DESIGN_SPEC §7.3). */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => ({
          onStart: show,
          onUpdate: show,
          onExit: () => useSlashMenuStore.setState({ isOpen: false }),
          onKeyDown: ({ event }) => {
            const { isOpen, items, selectedIndex, pick } = useSlashMenuStore.getState();
            if (!isOpen || items.length === 0) {
              return false;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              const step = event.key === "ArrowDown" ? 1 : -1;
              useSlashMenuStore.setState({
                selectedIndex: (selectedIndex + step + items.length) % items.length,
              });
              return true;
            }
            if (event.key === "Enter") {
              const item = items[selectedIndex];
              if (item) {
                pick(item);
              }
              return true;
            }
            return false;
          },
        }),
      }),
    ];
  },
});
