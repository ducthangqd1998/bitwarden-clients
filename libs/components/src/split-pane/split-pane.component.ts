import { Directionality } from "@angular/cdk/bidi";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  viewChild,
} from "@angular/core";
import {
  BrnResizableGroup,
  BrnResizableHandle,
  BrnResizablePanel,
} from "@spartan-ng/brain/resizable";

/**
 * Two panes side by side with a draggable, keyboard-operable divider between them.
 *
 * The parent decides the height. Project content with `slot="start"` and `slot="end"`.
 *
 * Wraps a headless primitive; the primitive is an implementation detail and is not part of the
 * public API.
 */
@Component({
  selector: "bit-split-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrnResizableGroup, BrnResizablePanel, BrnResizableHandle],
  host: { class: "tw-flex" },
  template: `
    <div
      #group="brnResizableGroup"
      brnResizableGroup
      direction="horizontal"
      class="tw-flex tw-min-w-0 tw-flex-1"
      [layout]="layout()"
      (layoutChange)="startSize.set($event[0])"
    >
      <div
        brnResizablePanel
        class="tw-min-w-0"
        [defaultSize]="startSize()"
        [minSize]="minStartSize()"
        [maxSize]="maxStartSize()"
      >
        <ng-content select="[slot=start]" />
      </div>
      <div
        #handle
        brnResizeHandle
        (mousedown)="handle.focus()"
        (touchstart)="group.startResize(0, $event)"
        class="tw-relative tw-w-px tw-shrink-0 tw-cursor-col-resize tw-bg-border-base before:tw-absolute before:-tw-inset-x-1 before:tw-inset-y-0 [@media(pointer:coarse)]:before:-tw-inset-x-3 tw-touch-none hover:tw-bg-border-brand focus-visible:tw-bg-border-brand focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-border-focus"
        [attr.aria-label]="label()"
        [attr.aria-valuenow]="valueNow()"
        [attr.aria-valuemin]="minStartSize()"
        [attr.aria-valuemax]="maxStartSize()"
      ></div>
      <div
        brnResizablePanel
        class="tw-min-w-0"
        [defaultSize]="100 - startSize()"
        [minSize]="minEndSize()"
        [maxSize]="100 - minStartSize()"
      >
        <ng-content select="[slot=end]" />
      </div>
    </div>
  `,
})
export class SplitPaneComponent {
  /** Accessible name of the divider, for example "Resize item list". */
  readonly label = input.required<string>();

  /** Width of the start pane as a percentage of the total (0-100). */
  readonly startSize = model(40);

  /** Smallest width the start pane can be dragged to, as a percentage. */
  readonly minStartSize = input(15);

  /** Smallest width the end pane can be dragged to, as a percentage. */
  readonly minEndSize = input(30);

  protected readonly layout = computed(() => [this.startSize(), 100 - this.startSize()]);

  protected readonly maxStartSize = computed(() => 100 - this.minEndSize());

  protected readonly valueNow = computed(() => Math.round(this.startSize()));

  private readonly directionality = inject(Directionality);
  private readonly handle = viewChild.required<ElementRef<HTMLElement>>("handle");

  constructor() {
    afterNextRender(() => {
      // The primitive moves the divider with ArrowRight regardless of the page direction. The
      // capture phase on the divider itself runs before the primitive's own handler, so in a
      // right-to-left page this one takes the arrow keys and the primitive never sees them.
      this.handle().nativeElement.addEventListener(
        "keydown",
        (event) => this.onHandleKeydown(event),
        { capture: true },
      );
    });
  }

  private onHandleKeydown(event: KeyboardEvent) {
    if (
      this.directionality.valueSignal() !== "rtl" ||
      (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    // The start pane is on the right, so the arrow that points away from it makes it larger.
    const step = event.shiftKey ? 10 : 1;
    const delta = event.key === "ArrowLeft" ? step : -step;
    this.startSize.set(
      Math.min(this.maxStartSize(), Math.max(this.minStartSize(), this.startSize() + delta)),
    );
  }
}
