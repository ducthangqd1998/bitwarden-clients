import { Component, inject, ElementRef, computed, input, model } from "@angular/core";

import { AriaDisableDirective } from "../a11y";
import { BaseButtonDirective } from "../shared/base-button.directive";
import { ButtonLikeAbstraction } from "../shared/button-like.abstraction";
import { BitwardenIcon } from "../shared/icon";
import { SpinnerComponent, SpinnerSize } from "../spinner";
import { ariaDisableElement } from "../utils";

export type ButtonSize = "default" | "small" | "large";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "button[bitButton], a[bitButton]",
  templateUrl: "button.component.html",
  providers: [{ provide: ButtonLikeAbstraction, useExisting: ButtonComponent }],
  imports: [SpinnerComponent],
  host: {
    "[class]": "classList()",
  },
  hostDirectives: [
    AriaDisableDirective,
    {
      directive: BaseButtonDirective,
      inputs: ["loading", "disabled", "buttonType", "block", "instantSpinner"],
    },
  ],
})
export class ButtonComponent implements ButtonLikeAbstraction {
  private baseButton = inject(BaseButtonDirective);
  private el = inject(ElementRef<HTMLButtonElement>);

  // Expose loading and disabled from base directive for ButtonLikeAbstraction
  readonly loading = this.baseButton.loading;
  readonly disabled = this.baseButton.disabled;

  /**
   * Bitwarden icon displayed **before** the button label.
   * Spacing between the icon and label is handled automatically.
   */
  readonly startIcon = input<BitwardenIcon | undefined>(undefined);

  /**
   * Bitwarden icon (`bwi-*`) displayed **after** the button label.
   * Spacing between the label and icon is handled automatically.
   */
  readonly endIcon = input<BitwardenIcon | undefined>(undefined);
  readonly size = model<ButtonSize>("default");

  readonly startIconClasses = computed(() => {
    return ["bwi", this.startIcon()];
  });

  readonly endIconClasses = computed(() => {
    return ["bwi", this.endIcon()];
  });

  protected readonly spinnerSize = computed<SpinnerSize>(() =>
    this.size() === "small" ? "sm" : "md",
  );

  protected get showLoadingStyle() {
    return this.baseButton.showLoadingStyle;
  }

  protected readonly classList = computed(() => {
    const classes: string[] = [];

    // Add border-radius style
    classes.push("tw-rounded-control");

    // Add block/inline styles
    if (this.baseButton.block()) {
      classes.push("tw-w-full", "tw-block");
    } else {
      classes.push("tw-inline-block");
    }

    // Add size styles (color and disabled styles are applied by BaseButtonDirective)
    classes.push(...getButtonSizeStyles(this.size()));

    return classes.join(" ");
  });

  constructor() {
    ariaDisableElement(this.el.nativeElement, this.baseButton.disabledAttr);
  }
}

const getButtonSizeStyles = (size: ButtonSize): string[] => {
  const buttonSizeStyles: Record<ButtonSize, string[]> = {
    // The padding tokens already take off 1px for the border. This keeps the overall size of the
    // button consistent with icon buttons.
    small: ["tw-pt-control-pad-sm", "tw-pb-control-pad-sm", "tw-px-3", "tw-text-xs/4"],
    default: ["tw-pt-control-pad", "tw-pb-control-pad", "tw-px-4", "tw-text-sm/5"],
    large: ["tw-pt-control-pad-lg", "tw-pb-control-pad-lg", "tw-px-4", "tw-text-base/6"],
  };

  return buttonSizeStyles[size] || buttonSizeStyles.default;
};
