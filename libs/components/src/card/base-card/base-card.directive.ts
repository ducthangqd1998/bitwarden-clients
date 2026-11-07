import { Directive } from "@angular/core";

@Directive({
  host: {
    class:
      "tw-box-border tw-block tw-bg-bg-primary tw-text-fg-heading tw-border tw-border-solid tw-border-border-base tw-rounded-card",
  },
})
export class BaseCardDirective {}
