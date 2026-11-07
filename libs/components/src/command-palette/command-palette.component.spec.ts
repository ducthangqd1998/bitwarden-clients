import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { CommandPaletteComponent, CommandPaletteItem } from "./command-palette.component";

const items: CommandPaletteItem[] = [
  { value: "new-login", label: "New login", group: "Create" },
  { value: "new-note", label: "New secure note", group: "Create" },
  { value: "generator", label: "Open generator", group: "Go to" },
  { value: "lock", label: "Lock vault" },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommandPaletteComponent],
  template: `<bit-command-palette
    label="Search commands"
    emptyText="No results"
    [items]="items"
    (selected)="chosen = $event"
  />`,
})
class TestHostComponent {
  items = items;
  chosen?: string;
}

describe("CommandPaletteComponent", () => {
  let fixture: ComponentFixture<TestHostComponent>;

  const labels = () =>
    fixture.debugElement
      .queryAll(By.css("[role=option]"))
      .map((option) => option.nativeElement.textContent.trim());

  const type = (text: string) => {
    const input: HTMLInputElement = fixture.debugElement.query(By.css("input")).nativeElement;
    input.value = text;
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
  };

  beforeEach(() => {
    // jsdom does not implement scrollIntoView, which the primitive calls on the active item.
    Element.prototype.scrollIntoView = jest.fn();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it("lists every item when the query is empty", () => {
    expect(labels()).toEqual(["New login", "New secure note", "Open generator", "Lock vault"]);
  });

  it("filters by label, ignoring case", () => {
    type("NEW");

    expect(labels()).toEqual(["New login", "New secure note"]);
  });

  it("drops groups that have no matching item", () => {
    type("generator");

    const groups = fixture.debugElement.queryAll(By.css("[role=group]"));
    expect(groups).toHaveLength(1);
    expect(groups[0].attributes["aria-label"]).toBe("Go to");
  });

  it("shows the empty text when nothing matches", () => {
    type("zzz");

    expect(labels()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain("No results");
  });

  it("emits the value of a clicked item", () => {
    fixture.debugElement.queryAll(By.css("[role=option]"))[2].nativeElement.click();

    expect(fixture.componentInstance.chosen).toBe("generator");
  });

  it("emits the active item's value when Enter is pressed", () => {
    type("lock");

    fixture.debugElement
      .query(By.css("[brncommand]"))
      .nativeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(fixture.componentInstance.chosen).toBe("lock");
  });

  it("chooses with Enter pressed in the search field, and keeps Enter from activating anything else", () => {
    type("lock");

    // The key a user presses goes through the field. If its default were not prevented, the
    // button that opened a dialog holding the palette would be activated again once focus
    // returns to it, reopening the dialog.
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    fixture.debugElement.query(By.css("input")).nativeElement.dispatchEvent(enter);

    expect(fixture.componentInstance.chosen).toBe("lock");
    expect(enter.defaultPrevented).toBe(true);
  });
});
