import { RouterTestingModule } from "@angular/router/testing";
import { Meta, StoryObj, applicationConfig, moduleMetadata } from "@storybook/angular";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { GlobalStateProvider } from "@bitwarden/state";

import { IconButtonModule } from "../icon-button";
import { ItemModule } from "../item";
import { TypographyModule } from "../typography";
import { I18nMockService, StorybookGlobalStateProvider } from "../utils";

import { SplitPaneComponent } from "./split-pane.component";

interface DemoItem {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly website: string;
  readonly icon: string;
}

/** Fake data only. Nothing here is a real credential. */
const items: DemoItem[] = [
  {
    id: "1",
    name: "Example Mail",
    username: "demo.user@example.com",
    website: "mail.example.com",
    icon: "bwi-globe",
  },
  {
    id: "2",
    name: "Example Bank",
    username: "demo.user",
    website: "bank.example.com",
    icon: "bwi-globe",
  },
  {
    id: "3",
    name: "Example Cloud",
    username: "demo.user@example.org",
    website: "cloud.example.org",
    icon: "bwi-globe",
  },
  {
    id: "4",
    name: "Example Shop",
    username: "demo.shopper",
    website: "shop.example.net",
    icon: "bwi-globe",
  },
  {
    id: "5",
    name: "Example Forum",
    username: "demo_poster",
    website: "forum.example.net",
    icon: "bwi-globe",
  },
];

/**
 * Throwaway prototype for Design review of the three-pane vault layout (the sidebar is the
 * existing side nav and is not drawn here). Not a component; delete once the real layout lands.
 */
export default {
  title: "Prototypes/Vault master-detail",
  decorators: [
    moduleMetadata({
      imports: [
        SplitPaneComponent,
        ItemModule,
        IconButtonModule,
        TypographyModule,
        RouterTestingModule,
      ],
      providers: [
        {
          provide: I18nService,
          useFactory: () =>
            new I18nMockService({
              loading: "Loading",
              toggleSideNavigation: "Toggle side navigation",
              skipToContent: "Skip to content",
              submenu: "submenu",
              toggleCollapse: "toggle collapse",
              sideNavigation: "Side navigation",
              skipLink: "Skip link",
            }),
        },
      ],
    }),
    applicationConfig({
      providers: [{ provide: GlobalStateProvider, useClass: StorybookGlobalStateProvider }],
    }),
  ],
} as Meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => ({
    props: { items, selected: items[0], revealed: false },
    template: /*html*/ `
      <div class="tw-flex tw-h-96 tw-border tw-border-solid tw-border-border-base">
        <bit-split-pane
          class="tw-w-full"
          label="Resize item list"
          [startSize]="35"
          [minStartSize]="20"
          [minEndSize]="40"
        >
          <div slot="start" class="tw-h-full tw-overflow-y-auto tw-bg-bg-secondary tw-p-2">
            <bit-item-group>
              @for (item of items; track item.id) {
                <bit-item [selected]="selected === item">
                  <button
                    type="button"
                    bit-item-content
                    [attr.aria-current]="selected === item ? 'true' : null"
                    (click)="selected = item; revealed = false"
                  >
                    <i
                      slot="start"
                      class="bwi tw-text-2xl tw-text-fg-body-subtle"
                      [class]="item.icon"
                      aria-hidden="true"
                    ></i>
                    {{ item.name }}
                    <span slot="secondary">{{ item.username }}</span>
                  </button>
                </bit-item>
              }
            </bit-item-group>
          </div>

          <div slot="end" class="tw-h-full tw-overflow-y-auto tw-p-6">
            <div class="tw-mb-4 tw-flex tw-items-center tw-gap-3">
              <i
                class="bwi bwi-globe tw-text-3xl tw-text-fg-body-subtle"
                aria-hidden="true"
              ></i>
              <h2 bitTypography="h2" class="tw-mb-0">{{ selected.name }}</h2>
              <button
                type="button"
                bitIconButton="bwi-ellipsis-v"
                size="small"
                label="More options"
                class="tw-ms-auto"
              ></button>
            </div>

            <div class="tw-group tw-flex tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-border-muted tw-py-3">
              <div class="tw-min-w-0">
                <div bitTypography="helper" class="tw-text-fg-body-subtle">Username</div>
                <div bitTypography="body1" class="tw-truncate tw-text-fg-body">{{ selected.username }}</div>
              </div>
              <div class="tw-flex tw-opacity-0 group-focus-within:tw-opacity-100 group-hover:tw-opacity-100">
                <button type="button" bitIconButton="bwi-clone" size="small" label="Copy username"></button>
              </div>
            </div>

            <div class="tw-group tw-flex tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-border-muted tw-py-3">
              <div class="tw-min-w-0">
                <div bitTypography="helper" class="tw-text-fg-body-subtle">Password</div>
                <div bitTypography="body1" class="tw-truncate tw-font-mono tw-text-fg-sensitive">
                  {{ revealed ? "example-only-password" : "••••••••••••" }}
                </div>
              </div>
              <div class="tw-flex tw-opacity-0 group-focus-within:tw-opacity-100 group-hover:tw-opacity-100">
                <button
                  type="button"
                  [bitIconButton]="revealed ? 'bwi-eye-slash' : 'bwi-eye'"
                  size="small"
                  [label]="revealed ? 'Hide password' : 'Reveal password'"
                  (click)="revealed = !revealed"
                ></button>
                <button type="button" bitIconButton="bwi-clone" size="small" label="Copy password"></button>
              </div>
            </div>

            <div class="tw-group tw-flex tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-border-muted tw-py-3">
              <div class="tw-min-w-0">
                <div bitTypography="helper" class="tw-text-fg-body-subtle">Website</div>
                <div bitTypography="body1" class="tw-truncate tw-text-fg-body">{{ selected.website }}</div>
              </div>
              <div class="tw-flex tw-opacity-0 group-focus-within:tw-opacity-100 group-hover:tw-opacity-100">
                <button type="button" bitIconButton="bwi-external-link" size="small" label="Open website"></button>
              </div>
            </div>
          </div>
        </bit-split-pane>
      </div>
    `,
  }),
};
