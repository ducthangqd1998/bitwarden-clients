import { ChangeDetectionStrategy, Component, input, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { mock } from "jest-mock-extended";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { mockAccountServiceWith } from "@bitwarden/common/spec";
import { CipherId, UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherRepromptType } from "@bitwarden/common/vault/enums";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { CipherViewLike } from "@bitwarden/common/vault/utils/cipher-view-like-utils";

import { CipherViewComponent } from "../../cipher-view/cipher-view.component";
import { PasswordRepromptService } from "../../services/password-reprompt.service";

import { VaultItemDetailPaneComponent } from "./vault-item-detail-pane.component";

@Component({
  selector: "app-cipher-view",
  template: `<div id="stub-cipher-view">{{ cipher().name }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubCipherViewComponent {
  readonly cipher = input.required<CipherView>();
}

@Component({
  imports: [VaultItemDetailPaneComponent],
  template: `<vault-item-detail-pane [item]="item()" (edit)="edited = $event" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestHostComponent {
  readonly item = signal<CipherViewLike | undefined>(undefined);
  edited?: CipherViewLike;
}

const userId = "user-1" as UserId;

const row = (id: string, name: string, reprompt: CipherRepromptType, revision = "r1") =>
  ({
    id: id as CipherId,
    name,
    reprompt,
    revisionDate: revision,
  }) as unknown as CipherViewLike;

describe("VaultItemDetailPaneComponent", () => {
  let fixture: ComponentFixture<TestHostComponent>;
  const cipherService = mock<CipherService>();
  const passwordRepromptService = mock<PasswordRepromptService>();

  const text = () => fixture.nativeElement.textContent as string;
  const stub = () => fixture.debugElement.query(By.css("#stub-cipher-view"));

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const select = async (item: CipherViewLike | undefined) => {
    fixture.componentInstance.item.set(item);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    // A plain object: a `mock<T>()` proxy has a `then`, so resolving a promise with one never settles.
    cipherService.get.mockResolvedValue({} as Cipher);
    cipherService.decrypt.mockImplementation(
      async () => ({ name: "Decrypted item" }) as unknown as CipherView,
    );

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: CipherService, useValue: cipherService },
        { provide: PasswordRepromptService, useValue: passwordRepromptService },
        { provide: AccountService, useValue: mockAccountServiceWith(userId) },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    })
      .overrideComponent(VaultItemDetailPaneComponent, {
        remove: { imports: [CipherViewComponent] },
        add: { imports: [StubCipherViewComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it("shows an empty state when nothing is selected", () => {
    expect(text()).toContain("vaultDetailPaneEmpty");
    expect(cipherService.get).not.toHaveBeenCalled();
  });

  it("loads and shows an item that has no re-prompt", async () => {
    await select(row("a", "Plain", CipherRepromptType.None));

    expect(cipherService.get).toHaveBeenCalledWith("a", userId);
    expect(stub().nativeElement.textContent).toContain("Decrypted item");
    expect(passwordRepromptService.showPasswordPrompt).not.toHaveBeenCalled();
  });

  describe("an item protected by re-prompt", () => {
    const protectedRow = () => row("p", "Protected", CipherRepromptType.Password);

    it("is neither loaded nor decrypted before the prompt is passed", async () => {
      await select(protectedRow());

      expect(cipherService.get).not.toHaveBeenCalled();
      expect(cipherService.decrypt).not.toHaveBeenCalled();
      expect(stub()).toBeNull();
      expect(text()).toContain("passwordConfirmationDesc");
    });

    it("stays locked when the prompt is cancelled", async () => {
      passwordRepromptService.showPasswordPrompt.mockResolvedValue(false);
      await select(protectedRow());

      fixture.debugElement
        .query(By.css("#vault-item-detail-pane_button_unlock"))
        .nativeElement.click();
      await settle();

      expect(cipherService.decrypt).not.toHaveBeenCalled();
      expect(stub()).toBeNull();
    });

    it("loads the item after the prompt is passed", async () => {
      passwordRepromptService.showPasswordPrompt.mockResolvedValue(true);
      await select(protectedRow());

      fixture.debugElement
        .query(By.css("#vault-item-detail-pane_button_unlock"))
        .nativeElement.click();
      await settle();
      await settle();

      expect(cipherService.decrypt).toHaveBeenCalledTimes(1);
      expect(stub().nativeElement.textContent).toContain("Decrypted item");
    });

    it("locks again when another item is selected and then this one is selected again", async () => {
      passwordRepromptService.showPasswordPrompt.mockResolvedValue(true);
      await select(protectedRow());
      fixture.debugElement
        .query(By.css("#vault-item-detail-pane_button_unlock"))
        .nativeElement.click();
      await settle();
      await settle();
      expect(stub()).not.toBeNull();

      await select(row("a", "Plain", CipherRepromptType.None));
      await select(protectedRow());

      expect(stub()).toBeNull();
      expect(text()).toContain("passwordConfirmationDesc");
    });

    it("stays unlocked and reloads when the same item's row is refreshed after an edit", async () => {
      passwordRepromptService.showPasswordPrompt.mockResolvedValue(true);
      await select(protectedRow());
      fixture.debugElement
        .query(By.css("#vault-item-detail-pane_button_unlock"))
        .nativeElement.click();
      await settle();
      await settle();
      cipherService.get.mockClear();

      await select(row("p", "Protected", CipherRepromptType.Password, "r2"));
      await settle();

      expect(passwordRepromptService.showPasswordPrompt).toHaveBeenCalledTimes(1);
      expect(cipherService.get).toHaveBeenCalledTimes(1);
      expect(stub()).not.toBeNull();
    });
  });

  it("shows an error when the item cannot be found", async () => {
    cipherService.get.mockResolvedValue(undefined as never);

    await select(row("gone", "Gone", CipherRepromptType.None));

    expect(text()).toContain("unknownCipher");
    expect(stub()).toBeNull();
  });

  it("emits the item when Edit is pressed", async () => {
    const item = row("a", "Plain", CipherRepromptType.None);
    await select(item);

    fixture.debugElement.query(By.css("#vault-item-detail-pane_button_edit")).nativeElement.click();

    expect(fixture.componentInstance.edited).toBe(item);
  });
});
