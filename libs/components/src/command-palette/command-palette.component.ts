import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { BrnCommandImports } from "@spartan-ng/brain/command";

import { BitwardenIcon } from "../shared/icon";

export interface CommandPaletteItem {
  /** Unique identifier emitted when the item is chosen. */
  readonly value: string;
  /** Localized text shown to the user and matched against the search query. */
  readonly label: string;
  /** Secondary text under the label. It is searched too. */
  readonly description?: string;
  /** Optional heading the item is listed under. Groups appear in the order of their first item. */
  readonly group?: string;
  readonly icon?: BitwardenIcon;
}

interface CommandPaletteGroup {
  readonly label: string | undefined;
  readonly items: readonly CommandPaletteItem[];
}

/**
 * A searchable list of commands or items, navigated with the keyboard.
 *
 * Wraps a headless primitive; the primitive is an implementation detail and is not part of the
 * public API.
 */
@Component({
  selector: "bit-command-palette",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrnCommandImports],
  host: { class: "tw-block" },
  template: `
    <div
      brnCommand
      [filter]="matches"
      [search]="query()"
      (searchChange)="query.set($event)"
      (keydown.enter)="$event.preventDefault()"
      class="tw-flex tw-w-full tw-flex-col tw-overflow-hidden tw-rounded-panel tw-border tw-border-solid tw-border-border-base tw-bg-bg-primary tw-shadow-overlay"
    >
      <input
        brnCommandInput
        [placeholder]="placeholder()"
        [attr.aria-label]="label()"
        class="tw-w-full tw-rounded-t-panel tw-border-0 tw-border-b tw-border-solid tw-border-border-base tw-bg-transparent tw-px-4 tw-py-3 tw-text-base tw-text-fg-body placeholder:tw-text-fg-body-subtle focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:-tw-outline-offset-2 focus-visible:tw-outline-border-focus"
      />
      <div brnCommandList class="tw-max-h-80 tw-overflow-y-auto tw-p-1">
        @for (group of groups(); track group.label) {
          <div brnCommandGroup [attr.aria-label]="group.label">
            @if (group.label) {
              <div
                role="presentation"
                class="tw-px-3 tw-pb-1 tw-pt-2 tw-text-xs tw-font-medium tw-text-fg-body-subtle"
              >
                {{ group.label }}
              </div>
            }
            @for (item of group.items; track item.value) {
              <button
                type="button"
                brnCommandItem
                [value]="searchText(item)"
                (selected)="selected.emit(item.value)"
                class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-border-0 tw-bg-transparent tw-px-3 tw-py-2 tw-text-start tw-text-sm tw-text-fg-body aria-selected:tw-bg-bg-hover"
              >
                @if (item.icon) {
                  <i [class]="['bwi', 'bwi-fw', item.icon]" aria-hidden="true"></i>
                }
                <span class="tw-flex tw-min-w-0 tw-flex-col">
                  <span class="tw-truncate">{{ item.label }}</span>
                  @if (item.description) {
                    <span class="tw-truncate tw-text-xs tw-text-fg-body">{{
                      item.description
                    }}</span>
                  }
                </span>
              </button>
            }
          </div>
        }
        @if (groups().length === 0) {
          <div class="tw-p-4 tw-text-center tw-text-sm tw-text-fg-body-subtle" role="status">
            {{ emptyText() }}
          </div>
        }
      </div>
    </div>
  `,
})
export class CommandPaletteComponent {
  /** Accessible name of the search field. */
  readonly label = input.required<string>();

  readonly placeholder = input("");

  /** Message shown when no item matches the search query. */
  readonly emptyText = input("");

  readonly items = input<readonly CommandPaletteItem[]>([]);

  /**
   * Shows at most this many matches per group, so a long list (a whole vault) does not put
   * thousands of rows in the DOM. Typing narrows the matches, then the cap applies to what is left.
   */
  readonly maxResultsPerGroup = input<number | undefined>(undefined);

  /** Emits the `value` of the chosen item. */
  readonly selected = output<string>();

  protected readonly query = signal("");

  /**
   * The primitive filters on the `value` it is given, so it is given the label. It also uses its
   * own verdict to reset the active item when the query changes, so both filters must agree.
   */
  protected readonly matches = (label: string, search: string) =>
    label.toLowerCase().includes(search.trim().toLowerCase());

  /** What the search matches: the label, and the description when there is one. */
  protected readonly searchText = (item: CommandPaletteItem) =>
    item.description ? `${item.label} ${item.description}` : item.label;

  protected readonly groups = computed<readonly CommandPaletteGroup[]>(() => {
    const matching = this.items().filter((item) =>
      this.matches(this.searchText(item), this.query()),
    );

    const byGroup = new Map<string | undefined, CommandPaletteItem[]>();
    for (const item of matching) {
      byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item]);
    }

    const max = this.maxResultsPerGroup();
    return [...byGroup].map(([label, items]) => ({
      label,
      items: max === undefined ? items : items.slice(0, max),
    }));
  });
}
