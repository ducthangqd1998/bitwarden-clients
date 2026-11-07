import { GlobalPositionStrategy } from "@angular/cdk/overlay";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { DIALOG_DATA, DialogRef, DialogService } from "../dialog";

import { CommandPaletteComponent, CommandPaletteItem } from "./command-palette.component";

export interface CommandPaletteDialogParams {
  /** Accessible name of the search field. */
  readonly label: string;
  readonly placeholder: string;
  /** Message shown when nothing matches. */
  readonly emptyText: string;
  readonly items: readonly CommandPaletteItem[];
  readonly maxResultsPerGroup?: number;
}

/**
 * A command palette in a dialog, opened near the top of the page. Closes with the `value` of the
 * chosen item, or with `undefined` when dismissed (Escape or a click outside).
 */
@Component({
  selector: "bit-command-palette-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommandPaletteComponent],
  template: `
    <bit-command-palette
      class="tw-block tw-w-75vw tw-max-w-xl"
      [label]="params.label"
      [placeholder]="params.placeholder"
      [emptyText]="params.emptyText"
      [items]="params.items"
      [maxResultsPerGroup]="params.maxResultsPerGroup"
      (selected)="dialogRef.close($event)"
    />
  `,
})
export class CommandPaletteDialogComponent {
  protected readonly params = inject<CommandPaletteDialogParams>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<string | undefined>>(DialogRef);

  static open(
    dialogService: DialogService,
    params: CommandPaletteDialogParams,
  ): DialogRef<string | undefined, CommandPaletteDialogComponent> {
    return dialogService.open<
      string | undefined,
      CommandPaletteDialogParams,
      CommandPaletteDialogComponent
    >(CommandPaletteDialogComponent, {
      data: params,
      positionStrategy: new GlobalPositionStrategy().top("12vh").centerHorizontally(),
    });
  }
}
