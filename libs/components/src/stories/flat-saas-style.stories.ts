import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Meta, StoryObj, applicationConfig, moduleMetadata } from "@storybook/angular";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { GlobalStateProvider } from "@bitwarden/state";

import { BadgeModule } from "../badge";
import { ButtonModule } from "../button";
import { CommandPaletteComponent, CommandPaletteItem } from "../command-palette";
import { IconComponent } from "../icon";
import { BitKbdComponent } from "../kbd";
import { I18nMockService, StorybookGlobalStateProvider } from "../utils";

/**
 * One screen, built only from theme tokens and real components. `Current` renders it as shipped;
 * `FlatSaas` puts `vfo1` on <html>, which is exactly what the web client does when the
 * VFO1Foundation flag is on (see "VFO1 FLAT STYLE" in tw-theme.css). Nothing else differs.
 */
@Component({
  selector: "flat-saas-preview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeModule, ButtonModule, CommandPaletteComponent, IconComponent, BitKbdComponent],
  template: `
    <div class="tw-flex tw-bg-bg-tertiary tw-text-fg-body">
      <aside
        class="tw-flex tw-w-56 tw-shrink-0 tw-flex-col tw-gap-0.5 tw-bg-bg-nav tw-p-3 tw-text-fg-nav"
      >
        <div class="tw-mb-3 tw-flex tw-items-center tw-gap-2 tw-px-2 tw-py-1.5 tw-font-medium">
          <bit-icon name="bwi-shield" />
          Vault
        </div>

        @for (entry of nav; track entry.label) {
          <button
            type="button"
            class="tw-flex tw-w-full tw-items-center tw-gap-2 tw-rounded-control tw-border-0 tw-px-2 tw-py-1.5 tw-text-start tw-text-sm tw-text-fg-nav hover:tw-bg-bg-nav-hover"
            [class]="entry.active ? 'tw-bg-bg-nav-hover tw-font-medium' : 'tw-bg-transparent'"
          >
            <bit-icon [name]="entry.icon" />
            {{ entry.label }}
          </button>
        }
      </aside>

      <main
        class="tw-m-2 tw-flex-1 tw-rounded-panel tw-border tw-border-solid tw-border-border-light tw-bg-bg-primary"
      >
        <div class="tw-flex tw-items-center tw-gap-2 tw-px-5 tw-pb-2 tw-pt-4">
          <h2 class="tw-m-0 tw-flex-1 tw-text-lg tw-font-medium tw-text-fg-heading">All items</h2>
          <button type="button" bitButton buttonType="secondary" size="small">Import</button>
          <button type="button" bitButton buttonType="primary" size="small">New item</button>
        </div>

        <div
          class="tw-flex tw-gap-4 tw-border-0 tw-border-b tw-border-solid tw-border-border-light tw-px-5 tw-text-sm"
        >
          <span
            class="tw-border-0 tw-border-b-2 tw-border-solid tw-border-border-focus tw-pb-2 tw-font-medium tw-text-fg-heading"
            >Overview</span
          >
          <span class="tw-pb-2 tw-text-fg-body-subtle">Security</span>
          <span class="tw-pb-2 tw-text-fg-body-subtle">Activity</span>
        </div>

        <div class="tw-grid tw-grid-cols-3 tw-gap-3 tw-p-5">
          @for (card of stats; track card.label) {
            <div class="tw-rounded-card tw-border tw-border-solid tw-border-border-light tw-p-4">
              <div class="tw-text-sm tw-text-fg-body">{{ card.label }}</div>
              <div class="tw-mt-4 tw-text-3xl tw-font-medium tw-text-fg-heading">
                {{ card.value }}
              </div>
            </div>
          }
        </div>

        <div class="tw-flex tw-gap-5 tw-px-5 tw-pb-5">
          <table class="tw-w-full tw-flex-1 tw-border-collapse tw-text-sm">
            <thead>
              <tr class="tw-text-start tw-text-xs tw-text-fg-body-subtle">
                <th
                  class="tw-border-0 tw-border-b tw-border-solid tw-border-border-light tw-py-2 tw-text-start tw-font-normal"
                >
                  Name
                </th>
                <th
                  class="tw-border-0 tw-border-b tw-border-solid tw-border-border-light tw-py-2 tw-text-start tw-font-normal"
                >
                  Type
                </th>
                <th
                  class="tw-border-0 tw-border-b tw-border-solid tw-border-border-light tw-py-2 tw-text-start tw-font-normal"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.name) {
                <tr class="tw-h-10">
                  <td
                    class="tw-border-0 tw-border-b tw-border-solid tw-border-border-light tw-text-fg-heading"
                  >
                    {{ row.name }}
                  </td>
                  <td class="tw-border-0 tw-border-b tw-border-solid tw-border-border-light">
                    {{ row.type }}
                  </td>
                  <td class="tw-border-0 tw-border-b tw-border-solid tw-border-border-light">
                    <span bitBadge [variant]="row.variant">{{ row.status }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <div class="tw-w-72 tw-shrink-0">
            <bit-command-palette
              label="Quick find"
              placeholder="Type anything..."
              emptyText="No results"
              [items]="commands"
            />
            <div class="tw-mt-2 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-fg-body-subtle">
              Open quick find <bit-kbd [keys]="['modifier', 'K']" />
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
})
class FlatSaasPreviewComponent {
  protected readonly nav = [
    { label: "All items", icon: "bwi-list" as const, active: true },
    { label: "Favorites", icon: "bwi-star" as const, active: false },
    { label: "Generator", icon: "bwi-generate" as const, active: false },
    { label: "Reports", icon: "bwi-file-text" as const, active: false },
    { label: "Settings", icon: "bwi-cog" as const, active: false },
  ];

  protected readonly stats = [
    { label: "Items", value: "128" },
    { label: "Weak passwords", value: "7" },
    { label: "Shared", value: "24" },
  ];

  protected readonly rows = [
    { name: "Example Mail", type: "Login", status: "Strong", variant: "success" as const },
    { name: "Example Bank", type: "Login", status: "Reused", variant: "warning" as const },
    { name: "Example Cloud", type: "Login", status: "Weak", variant: "danger" as const },
    { name: "Example Card", type: "Card", status: "Shared", variant: "accent-primary" as const },
  ];

  protected readonly commands: CommandPaletteItem[] = [
    { value: "new-login", label: "New login", group: "Create", icon: "bwi-globe" },
    { value: "new-note", label: "New secure note", group: "Create", icon: "bwi-sticky-note" },
    { value: "generator", label: "Open generator", group: "Go to", icon: "bwi-generate" },
    { value: "reports", label: "Open reports", group: "Go to", icon: "bwi-file-text" },
  ];
}

/**
 * Sets the class the web client sets on <html> when the VFO1Foundation flag is on, and removes it
 * when the story ends so it cannot leak into the next story.
 */
const withVfo1 = () => {
  document.documentElement.classList.add("vfo1");
  return () => document.documentElement.classList.remove("vfo1");
};

export default {
  title: "Prototypes/Flat SaaS style",
  decorators: [
    moduleMetadata({
      imports: [FlatSaasPreviewComponent],
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

export const Current: Story = {
  render: () => ({ template: `<flat-saas-preview />` }),
};

export const FlatSaas: Story = {
  beforeEach: withVfo1,
  render: () => ({ template: `<flat-saas-preview />` }),
};
