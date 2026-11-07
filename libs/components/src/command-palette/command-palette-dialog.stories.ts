import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { Meta, StoryObj, applicationConfig, moduleMetadata } from "@storybook/angular";
import { findByRole, userEvent } from "storybook/test";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { GlobalStateProvider } from "@bitwarden/state";

import { ButtonModule } from "../button";
import { DialogModule, DialogService } from "../dialog";
import { I18nMockService, StorybookGlobalStateProvider } from "../utils";

import { CommandPaletteDialogComponent } from "./command-palette-dialog.component";
import { CommandPaletteItem } from "./command-palette.component";

const items: CommandPaletteItem[] = [
  { value: "create:1", label: "Login", group: "Add item", icon: "bwi-globe" },
  { value: "create:3", label: "Card", group: "Add item", icon: "bwi-credit-card" },
  { value: "go:/tools/generator", label: "Generator", group: "Go to", icon: "bwi-generate" },
  { value: "go:/reports", label: "Reports", group: "Go to", icon: "bwi-file-text" },
  { value: "item:1", label: "Example Mail", group: "Items", icon: "bwi-globe" },
  { value: "item:2", label: "Example Bank", group: "Items", icon: "bwi-globe" },
  { value: "item:3", label: "Example Cloud", group: "Items", icon: "bwi-globe" },
];

@Component({
  selector: "story-open-palette",
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" bitButton (click)="open()">Quick find</button>`,
})
class OpenPaletteComponent {
  private readonly dialogService = inject(DialogService);

  protected open() {
    CommandPaletteDialogComponent.open(this.dialogService, {
      label: "Quick find",
      placeholder: "Search items and commands",
      emptyText: "No results",
      items,
      maxResultsPerGroup: 8,
    });
  }
}

export default {
  title: "Component Library/Command Palette/Dialog",
  decorators: [
    moduleMetadata({
      imports: [DialogModule, OpenPaletteComponent, RouterTestingModule],
      providers: [
        {
          provide: I18nService,
          useFactory: () => new I18nMockService({ loading: "Loading", close: "Close" }),
        },
      ],
    }),
    applicationConfig({
      providers: [
        provideAnimations(),
        { provide: GlobalStateProvider, useClass: StorybookGlobalStateProvider },
      ],
    }),
  ],
} as Meta;

type Story = StoryObj;

export const Closed: Story = {
  render: () => ({ template: `<story-open-palette />` }),
};

/** The palette open on its own, as it appears after Cmd/Ctrl+K. */
export const Open: Story = {
  render: () => ({ template: `<story-open-palette />` }),
  play: async ({ canvasElement }) => {
    await userEvent.click(await findByRole(canvasElement, "button"));
  },
};
