import { Directionality } from "@angular/cdk/bidi";
import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { EMPTY } from "rxjs";

import { SplitPaneComponent } from "./split-pane.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SplitPaneComponent],
  template: `
    <bit-split-pane label="Resize list" [(startSize)]="startSize">
      <div slot="start" id="start-content">List</div>
      <div slot="end" id="end-content">Detail</div>
    </bit-split-pane>
  `,
})
class TestHostComponent {
  readonly startSize = signal(40);
}

describe("SplitPaneComponent", () => {
  let fixture: ComponentFixture<TestHostComponent>;

  const handle = () => fixture.debugElement.query(By.css("[role=separator]"));

  const press = (key: string, init: KeyboardEventInit = {}) => {
    handle().nativeElement.dispatchEvent(new KeyboardEvent("keydown", { key, ...init }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it("projects content into the start and end panes", () => {
    const panels = fixture.debugElement.queryAll(By.css("[data-panel]"));

    expect(panels).toHaveLength(2);
    expect(panels[0].nativeElement.querySelector("#start-content")).not.toBeNull();
    expect(panels[1].nativeElement.querySelector("#end-content")).not.toBeNull();
  });

  it("describes the divider as a labelled, focusable separator with its value range", () => {
    const attributes = handle().attributes;

    expect(attributes["aria-label"]).toBe("Resize list");
    expect(attributes["aria-orientation"]).toBe("vertical");
    expect(attributes["aria-valuenow"]).toBe("40");
    expect(attributes["aria-valuemin"]).toBe("15");
    expect(attributes["aria-valuemax"]).toBe("70");
    expect(attributes["tabindex"]).toBe("0");
  });

  it("focuses the divider when it is pressed with the mouse, so arrow keys work right after", () => {
    handle().nativeElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(document.activeElement).toBe(handle().nativeElement);
  });

  it("starts a resize when the divider is touched, and ends it when the finger lifts", () => {
    const touch = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(touch, "touches", { value: [{ clientX: 100, clientY: 0 }] });

    handle().nativeElement.dispatchEvent(touch);
    expect(document.body.style.cursor).toBe("ew-resize");
    expect(touch.defaultPrevented).toBe(true);

    document.dispatchEvent(new Event("touchend"));
    expect(document.body.style.cursor).toBe("default");
  });

  it("grows the start pane with ArrowRight and updates the bound size", () => {
    press("ArrowRight");

    expect(fixture.componentInstance.startSize()).toBe(41);
    expect(handle().attributes["aria-valuenow"]).toBe("41");
  });

  it("moves in steps of 10 when Shift is held", () => {
    press("ArrowLeft", { shiftKey: true });

    expect(fixture.componentInstance.startSize()).toBe(30);
  });

  it("jumps to the limits with Home and End", () => {
    press("Home");
    expect(fixture.componentInstance.startSize()).toBe(15);

    press("End");
    expect(fixture.componentInstance.startSize()).toBe(70);
  });

  it("never goes below the minimum start size", () => {
    press("Home");
    press("ArrowLeft");

    expect(fixture.componentInstance.startSize()).toBe(15);
  });

  it("applies a start size set by the parent", () => {
    fixture.componentInstance.startSize.set(55);
    fixture.detectChanges();

    expect(handle().attributes["aria-valuenow"]).toBe("55");
  });
});

describe("SplitPaneComponent in a right-to-left page", () => {
  let fixture: ComponentFixture<TestHostComponent>;

  const handle = () => fixture.debugElement.query(By.css("[role=separator]"));

  const press = (key: string, init: KeyboardEventInit = {}) => {
    handle().nativeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: {
            value: "rtl",
            valueSignal: signal("rtl"),
            change: EMPTY,
            ngOnDestroy: (): void => undefined,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it("grows the start pane with ArrowLeft, since the start pane is on the right", () => {
    press("ArrowLeft");

    expect(fixture.componentInstance.startSize()).toBe(41);
  });

  it("shrinks the start pane with ArrowRight", () => {
    press("ArrowRight");

    expect(fixture.componentInstance.startSize()).toBe(39);
  });

  it("moves in steps of 10 when Shift is held", () => {
    press("ArrowLeft", { shiftKey: true });

    expect(fixture.componentInstance.startSize()).toBe(50);
  });

  it("never leaves the allowed range", () => {
    press("Home");
    press("ArrowRight");
    expect(fixture.componentInstance.startSize()).toBe(15);

    press("End");
    press("ArrowLeft");
    expect(fixture.componentInstance.startSize()).toBe(70);
  });

  it("keeps Home and End as they are", () => {
    press("End");

    expect(fixture.componentInstance.startSize()).toBe(70);
  });
});
