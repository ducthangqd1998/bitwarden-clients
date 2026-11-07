import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  resource,
  untracked,
} from "@angular/core";
import { firstValueFrom } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { CipherId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherRepromptType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  CipherViewLike,
  CipherViewLikeUtils,
} from "@bitwarden/common/vault/utils/cipher-view-like-utils";
import {
  ButtonModule,
  CalloutModule,
  SpinnerComponent,
  TypographyModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { CipherViewComponent } from "../../cipher-view/cipher-view.component";
import { PasswordRepromptService } from "../../services/password-reprompt.service";

/**
 * Read-only view of one vault item, for the pane beside the item list.
 *
 * Takes the selected list row and loads the full item itself. An item protected by master password
 * re-prompt is neither loaded nor decrypted until the user has passed the prompt, and is locked
 * again whenever another item is selected.
 */
@Component({
  selector: "vault-item-detail-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    CalloutModule,
    CipherViewComponent,
    I18nPipe,
    SpinnerComponent,
    TypographyModule,
  ],
  host: {
    class: "tw-flex tw-h-full tw-min-h-0 tw-flex-col",
    "[attr.role]": "item() ? 'region' : null",
    "[attr.aria-label]": "item()?.name",
  },
  template: `
    @if (item(); as current) {
      <div class="tw-flex tw-items-center tw-gap-3 tw-px-6 tw-pt-4">
        <h2 bitTypography="h3" class="tw-mb-0 tw-min-w-0 tw-flex-1 tw-truncate">
          {{ current.name }}
        </h2>
        <button
          type="button"
          bitButton
          buttonType="secondary"
          id="vault-item-detail-pane_button_edit"
          (click)="edit.emit(current)"
        >
          {{ "edit" | i18n }}
        </button>
      </div>

      <div class="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-px-6 tw-pb-6 tw-pt-4">
        @if (!unlocked()) {
          <bit-callout type="info">
            {{ "passwordConfirmationDesc" | i18n }}
          </bit-callout>
          <button
            type="button"
            bitButton
            buttonType="primary"
            id="vault-item-detail-pane_button_unlock"
            (click)="unlock()"
          >
            {{ "unlock" | i18n }}
          </button>
        } @else if (cipher.error()) {
          <bit-callout type="danger">{{ "unknownCipher" | i18n }}</bit-callout>
        } @else if (cipher.value(); as view) {
          <app-cipher-view [cipher]="view" />
        } @else {
          <div class="tw-flex tw-justify-center tw-pt-6">
            <bit-spinner />
            <span class="tw-sr-only">{{ "loading" | i18n }}</span>
          </div>
        }
      </div>
    } @else {
      <p class="tw-m-auto tw-p-6 tw-text-center tw-text-fg-body-subtle">
        {{ "vaultDetailPaneEmpty" | i18n }}
      </p>
    }
  `,
})
export class VaultItemDetailPaneComponent {
  private readonly accountService = inject(AccountService);
  private readonly cipherService = inject(CipherService);
  private readonly passwordRepromptService = inject(PasswordRepromptService);

  /** The selected row from the item list. Nothing selected shows an empty state. */
  readonly item = input<CipherViewLike | undefined>(undefined);

  /** Emits the item when the user asks to edit it. Editing itself is the host's concern. */
  readonly edit = output<CipherViewLike>();

  private readonly itemId = computed(() => {
    const item = this.item();
    return item == null ? undefined : CipherViewLikeUtils.getId(item);
  });

  /**
   * Whether the item may be shown. Items without re-prompt are open from the start. Items with it
   * stay locked until {@link unlock}, and lock again when a different item is selected, but not
   * when the same item is refreshed after an edit.
   */
  protected readonly unlocked = linkedSignal<string | undefined, boolean>({
    source: this.itemId,
    // Untracked: only a different item may re-lock; a refreshed row for the same item must not.
    computation: () => untracked(() => this.item()?.reprompt === CipherRepromptType.None),
  });

  /**
   * The full item. Loaded only while {@link unlocked}, and again when the list row changes (the row
   * is replaced after an edit), so a protected item is never decrypted ahead of its prompt.
   */
  protected readonly cipher = resource<
    CipherView | undefined,
    { id: CipherId; revision: string } | undefined
  >({
    params: () => {
      const id = this.itemId();
      const item = this.item();
      return id != null && item != null && this.unlocked()
        ? { id, revision: String(item.revisionDate) }
        : undefined;
    },
    loader: async ({ params }) => {
      const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
      const stored = await this.cipherService.get(params.id, userId);
      if (stored == null) {
        throw new Error("Item not found");
      }
      return this.cipherService.decrypt(stored, userId);
    },
  });

  protected async unlock() {
    if (await this.passwordRepromptService.showPasswordPrompt()) {
      this.unlocked.set(true);
    }
  }
}
