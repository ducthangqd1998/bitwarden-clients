import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { mock } from "jest-mock-extended";

import { DIALOG_DATA, DialogRef } from "../dialog";

import {
  CommandPaletteDialogComponent,
  CommandPaletteDialogParams,
} from "./command-palette-dialog.component";

const params: CommandPaletteDialogParams = {
  label: "Quick find",
  placeholder: "Search",
  emptyText: "No results",
  maxResultsPerGroup: 2,
  items: [
    { value: "a1", label: "Alpha one", group: "Items" },
    { value: "a2", label: "Alpha two", group: "Items" },
    { value: "a3", label: "Alpha three", group: "Items" },
    { value: "go", label: "Go home", group: "Go to" },
  ],
};

describe("CommandPaletteDialogComponent", () => {
  let fixture: ComponentFixture<CommandPaletteDialogComponent>;
  const dialogRef = mock<DialogRef<string | undefined>>();

  const labels = () =>
    fixture.debugElement
      .queryAll(By.css("[role=option]"))
      .map((option) => option.nativeElement.textContent.trim());

  beforeEach(() => {
    // jsdom does not implement scrollIntoView, which the primitive calls on the active item.
    Element.prototype.scrollIntoView = jest.fn();
    dialogRef.close.mockClear();

    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: params },
        { provide: DialogRef, useValue: dialogRef },
      ],
    });

    fixture = TestBed.createComponent(CommandPaletteDialogComponent);
    fixture.detectChanges();
  });

  it("shows at most the configured number of matches in each group", () => {
    expect(labels()).toEqual(["Alpha one", "Alpha two", "Go home"]);
  });

  it("caps what is left after the query narrows the matches", () => {
    const input: HTMLInputElement = fixture.debugElement.query(By.css("input")).nativeElement;
    input.value = "alpha";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();

    expect(labels()).toEqual(["Alpha one", "Alpha two"]);
  });

  it("closes with the value of the chosen item", () => {
    fixture.debugElement.queryAll(By.css("[role=option]"))[2].nativeElement.click();

    expect(dialogRef.close).toHaveBeenCalledWith("go");
  });
});

describe("CommandPaletteDialogComponent with descriptions", () => {
  let fixture: ComponentFixture<CommandPaletteDialogComponent>;

  const descriptionParams: CommandPaletteDialogParams = {
    label: "Quick find",
    placeholder: "Search",
    emptyText: "No results",
    items: [
      { value: "m", label: "Example Mail", description: "alice@example.com", group: "Items" },
      { value: "b", label: "Example Bank", description: "bob", group: "Items" },
    ],
  };

  const type = (text: string) => {
    const input: HTMLInputElement = fixture.debugElement.query(By.css("input")).nativeElement;
    input.value = text;
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
  };

  const shown = () =>
    fixture.debugElement.queryAll(By.css("[role=option]")).map((option) =>
      Array.from<HTMLElement>(option.nativeElement.querySelectorAll("span.tw-truncate"))
        .map((line) => line.textContent?.trim())
        .join(" / "),
    );

  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: descriptionParams },
        { provide: DialogRef, useValue: mock<DialogRef<string | undefined>>() },
      ],
    });

    fixture = TestBed.createComponent(CommandPaletteDialogComponent);
    fixture.detectChanges();
  });

  it("shows the description under the label", () => {
    expect(shown()).toEqual(["Example Mail / alice@example.com", "Example Bank / bob"]);
  });

  it("finds an item by its description", () => {
    type("alice");

    expect(shown()).toEqual(["Example Mail / alice@example.com"]);
  });

  it("still finds an item by its label", () => {
    type("bank");

    expect(shown()).toEqual(["Example Bank / bob"]);
  });
});
