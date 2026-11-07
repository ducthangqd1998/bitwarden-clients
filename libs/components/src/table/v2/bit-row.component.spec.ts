import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { HoverRevealContainerDirective, HoverRevealDirective } from "../../hover-reveal";

import { BitRowComponent } from "./bit-row.component";

@Component({
  imports: [BitRowComponent, HoverRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bit-row>
      <button type="button" bitHoverReveal>Edit</button>
    </bit-row>
  `,
})
class TestHostComponent {}

@Component({
  imports: [BitRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<bit-row [active]="active()"><span>Cell</span></bit-row>`,
})
class ActiveHostComponent {
  readonly active = signal(false);
}

describe("BitRowComponent", () => {
  it("is a hover reveal container alongside its own row classes", () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const row = fixture.debugElement.query(By.directive(BitRowComponent));

    expect(row.injector.get(HoverRevealContainerDirective, null)).not.toBeNull();
    expect(row.nativeElement.classList).toContain("[--bit-hover-reveal:0]");
    expect(row.nativeElement.classList).toContain("hover:[--bit-hover-reveal:1]");
    expect(row.nativeElement.classList).toContain("tw-grid");
  });

  describe("active", () => {
    const rowOf = (active: boolean) => {
      const fixture = TestBed.createComponent(ActiveHostComponent);
      fixture.componentInstance.active.set(active);
      fixture.detectChanges();
      return fixture.debugElement.query(By.directive(BitRowComponent)).nativeElement as HTMLElement;
    };

    it("tints the row, and keeps the tint under the pointer", () => {
      const row = rowOf(true);

      expect(row.classList).toContain("tw-bg-bg-brand-softer");
      expect(row.classList).toContain("hover:tw-bg-bg-brand-softer");
      expect(row.classList).not.toContain("hover:tw-bg-bg-row-hover");
    });

    it("leaves other rows with the ordinary hover fill and no tint", () => {
      const row = rowOf(false);

      expect(row.classList).not.toContain("tw-bg-bg-brand-softer");
      expect(row.classList).toContain("hover:tw-bg-bg-row-hover");
    });
  });
});
