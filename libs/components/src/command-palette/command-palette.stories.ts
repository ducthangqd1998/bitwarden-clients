import { Meta, StoryObj } from "@storybook/angular";

import { CommandPaletteComponent, CommandPaletteItem } from "./command-palette.component";

const items: CommandPaletteItem[] = [
  { value: "new-login", label: "New login", group: "Create", icon: "bwi-globe" },
  { value: "new-note", label: "New secure note", group: "Create", icon: "bwi-sticky-note" },
  { value: "generator", label: "Open generator", group: "Go to", icon: "bwi-generate" },
  { value: "reports", label: "Open reports", group: "Go to", icon: "bwi-file-text" },
  { value: "settings", label: "Open settings", group: "Go to", icon: "bwi-cog" },
  { value: "lock", label: "Lock vault" },
];

export default {
  title: "Component Library/Command Palette",
  component: CommandPaletteComponent,
  args: {
    label: "Search commands",
    placeholder: "Type a command or search",
    emptyText: "No results",
    items,
  },
} as Meta<CommandPaletteComponent>;

type Story = StoryObj<CommandPaletteComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { items: [] },
};
