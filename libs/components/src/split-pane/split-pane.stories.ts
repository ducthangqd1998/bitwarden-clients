import { Meta, StoryObj, moduleMetadata } from "@storybook/angular";

import { SplitPaneComponent } from "./split-pane.component";

export default {
  title: "Component Library/Split Pane",
  component: SplitPaneComponent,
  decorators: [moduleMetadata({ imports: [SplitPaneComponent] })],
  args: {
    label: "Resize panes",
    startSize: 40,
    minStartSize: 15,
    minEndSize: 30,
  },
  render: (args) => ({
    props: args,
    template: /*html*/ `
      <div class="tw-flex tw-h-64 tw-border tw-border-solid tw-border-border-base">
        <bit-split-pane
          class="tw-w-full"
          [label]="label"
          [startSize]="startSize"
          [minStartSize]="minStartSize"
          [minEndSize]="minEndSize"
        >
          <div slot="start" class="tw-h-full tw-bg-bg-secondary tw-p-4 tw-text-fg-body">
            Start pane
          </div>
          <div slot="end" class="tw-h-full tw-p-4 tw-text-fg-body">End pane</div>
        </bit-split-pane>
      </div>
    `,
  }),
} as Meta<SplitPaneComponent>;

type Story = StoryObj<SplitPaneComponent>;

export const Default: Story = {};

export const NarrowStartPane: Story = {
  args: { startSize: 25, minStartSize: 20, minEndSize: 50 },
};
