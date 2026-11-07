import {
  AfterContentChecked,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";

import { ItemActionComponent } from "./item-action.component";
import { ItemGroupComponent } from "./item-group.component";

export type ItemSize = "base" | "lg";

/**
 * Padding per `size`, keyed by edge. Shared with `bit-item-content` so the two components can never
 * drift apart. Spelled out rather than composed from a scale, since Tailwind only emits classes it
 * can find as complete strings.
 */
export const ITEM_PADDING: Record<ItemSize, Record<"leading" | "trailing" | "vertical", string>> = {
  base: { leading: "tw-ps-3", trailing: "tw-pe-3", vertical: "tw-py-2" },
  lg: { leading: "tw-ps-4", trailing: "tw-pe-4", vertical: "tw-py-3" },
};

/** Icon buttons and compact mode tighten the trailing edge regardless of `size`. */
export const ITEM_END_SLOT_TRAILING_OVERRIDES =
  "[&:has(>button[bitIconButton]:last-child,>*:last-child_button[bitIconButton])]:tw-pe-2 bit-compact:!tw-pe-2";

@Component({
  selector: "bit-item",
  imports: [ItemActionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "item.component.html",
  host: {
    "[class]": "hostClasses()",
    "[attr.role]": "role",
    "(focusin)": "onFocusIn($event.target)",
    "(focusout)": "onFocusOut()",
  },
})
export class ItemComponent implements AfterContentChecked {
  readonly size = input<ItemSize>("base");

  /**
   * Marks the item as the current selection, for lists where choosing an item shows it elsewhere
   * (for example in a detail pane). Visual only: put `aria-current` or `aria-selected` on the
   * interactive element, as the pattern in use requires.
   */
  readonly selected = input(false, { transform: booleanAttribute });

  /** Standalone items may already be wrapped in a consumer's own list, so only claim `listitem` inside a group. */
  protected readonly role = inject(ItemGroupComponent, { optional: true }) ? "listitem" : null;

  readonly endSlot = viewChild<ElementRef<HTMLDivElement>>("endSlot");

  /** Public so `bit-item-content` can yield its trailing padding when this slot is populated. */
  readonly endSlotHasChildren = signal(false);

  /** The bit-item end slot is always right-most when present, so it always owns trailing padding. */
  protected readonly endSlotPaddingClass = computed(
    () => `${ITEM_PADDING[this.size()].trailing} ${ITEM_END_SLOT_TRAILING_OVERRIDES}`,
  );

  /**
   * We have `:focus-within` and `:focus-visible` but no `:focus-visible-within`
   */
  protected readonly focusVisibleWithin = signal(false);

  protected readonly hostClasses = computed(() => {
    const base =
      "tw-flex tw-rounded-lg tw-gap-3 tw-justify-between tw-overflow-hidden [&:has([data-item-main-content]_button:hover,[data-item-main-content]_a:hover)]:tw-cursor-pointer [&:has([data-item-main-content]_button:enabled:hover,[data-item-main-content]_a:hover,[data-item-main-content]_button:enabled:focus-visible,[data-item-main-content]_a:focus-visible)]:tw-bg-bg-row-hover tw-text-fg-heading tw-border-solid tw-min-h-9";

    // Surface and border colour are chosen here, not layered on `base`: two competing utilities
    // are resolved by stylesheet order, not by their order in the class list.
    const surface = this.selected()
      ? "tw-bg-bg-brand-softer tw-border-border-brand"
      : "tw-bg-bg-primary tw-border-border-base";

    const structural =
      "tw-border bit-compact:tw-rounded-none bit-compact:last-of-type:tw-rounded-b-lg bit-compact:first-of-type:tw-rounded-t-lg tw-mb-1.5 bit-compact:tw-mb-0 bit-compact:[&+&]:tw-border-t-0";

    const focus = this.focusVisibleWithin()
      ? "tw-z-10 tw-outline-none tw-ring-1 tw-border-border-focus tw-ring-border-focus bit-compact:tw-ring-inset bit-compact:tw-ring-2"
      : "";

    return `${base} ${surface} ${structural} ${focus}`.trim();
  });

  ngAfterContentChecked(): void {
    this.endSlotHasChildren.set((this.endSlot()?.nativeElement.childElementCount ?? 0) > 0);
  }

  protected onFocusIn(target: EventTarget) {
    this.focusVisibleWithin.set((target as HTMLElement).matches("[data-fvw-target]:focus-visible"));
  }

  protected onFocusOut() {
    this.focusVisibleWithin.set(false);
  }
}
