import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from "@angular/core";
import { takeUntilDestroyed, toObservable, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
  combineLatest,
  filter,
  firstValueFrom,
  lastValueFrom,
  map,
  shareReplay,
  switchMap,
  take,
} from "rxjs";

import { CollectionService } from "@bitwarden/admin-console/common";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import {
  CollectionData,
  CollectionDetailsResponse,
} from "@bitwarden/common/admin-console/models/collections";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CipherId, CollectionId, OrganizationId } from "@bitwarden/common/types/guid";
import { CipherArchiveService } from "@bitwarden/common/vault/abstractions/cipher-archive.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { FolderService } from "@bitwarden/common/vault/abstractions/folder/folder.service.abstraction";
import { CipherType } from "@bitwarden/common/vault/enums";
import { RestrictedItemTypesService } from "@bitwarden/common/vault/services/restricted-item-types.service";
import {
  CipherViewLike,
  CipherViewLikeUtils,
} from "@bitwarden/common/vault/utils/cipher-view-like-utils";
import { filterOutNullish } from "@bitwarden/common/vault/utils/observable-utilities";
import {
  BitKbdComponent,
  ButtonModule,
  CalloutModule,
  CommandPaletteDialogComponent,
  CommandPaletteItem,
  DialogService,
  IconTileComponent,
  isAtOrLargerThanBreakpointSignal,
  LinkModule,
  PopoverModule,
  SplitPaneComponent,
} from "@bitwarden/components";
import { isGuid } from "@bitwarden/guid";
import { importQueryParamsForVault } from "@bitwarden/importer-ui";
import { PolicyType } from "@bitwarden/sdk-internal";
import { I18nPipe, safeProvider } from "@bitwarden/ui-common";
import {
  AddEditFolderDialogComponent,
  AddItemDialogComponent,
  AddItemDialogResult,
  ASSIGN_COLLECTIONS_DIALOG,
  BULK_DELETE_DIALOG,
  CipherRowMenuHandlers,
  CipherRowMenuService,
  COLLECTION_DIALOG,
  CollectionOptionsMenuComponent,
  copyPresentation$,
  DecryptionFailureDialogComponent,
  DEFAULT_COPY_PRESENTATION,
  DefaultCipherFormConfigService,
  MyFolderBreadcrumbsComponent,
  MyFolderMenuComponent,
  NewCipherMenuComponent,
  CardGridComponent,
  VaultBreadcrumbsComponent,
  VaultItemDetailPaneComponent,
  VaultItemsTableComponent,
  VaultItemsTableRowAction,
  VaultNavService,
  VaultOrganizationUserNotificationsComponent,
  VaultBatchActionComponent,
  VaultBatchBarService,
  VaultRemountOnDirective,
  ALL_ITEMS_SCOPE,
  cipherInScope,
  collectionInScope,
  collectionMenuTargetForScope,
  folderNameForScope,
  hasMultipleVaults,
  importStartedFrom,
  organizationNameForScope,
  organizationInScope,
  organizationVaultPage,
  OrganizationVaultPage,
  resolveVaultScope,
  routeVaultScope,
  scopedFolderId,
  sharedFoldersCommands,
  vaultScopeHeaderTile,
  vaultScopeTitle,
  scopedSharedFolderId,
  scopeKey,
  MY_ITEMS_ROUTE,
  sharedFolderNameForScope,
  VaultScope,
  VaultScopeType,
  defaultUserCollectionId,
  DefaultVaultItemsTransferService,
  VaultItemsTransferService,
  CoachmarkComponent,
  CoachmarkService,
} from "@bitwarden/vault";

import {
  CollectionDialogAction,
  openCollectionDialog,
} from "../../admin-console/organizations/shared/components/collection-dialog";
import { HeaderModule } from "../../layouts/header/header.module";
import { ImportDialogComponent } from "../../tools/import/import-dialog.component";
import { AssignCollectionsWebDialogAdapter } from "../components/assign-collections/assign-collections-web-dialog.adapter";
import { WebVaultItemActionsService } from "../services/vault-item-actions.service";
import { WebVaultPromptService } from "../services/web-vault-prompt.service";
import { ItemDeepLink, ItemDeepLinkAction, itemDeepLinkFrom } from "../utils/item-deep-link";

import { BulkDeleteDialogWebAdapter } from "./bulk-action-dialogs/bulk-delete-dialog-web.adapter";
import { CollectionWebDialogAdapter } from "./shared-folders/collection-web-dialog.adapter";
import { VaultBannersComponent } from "./vault-banners/vault-banners.component";
import { VaultOnboardingComponent } from "./vault-onboarding/vault-onboarding.component";

/**
 * What the quick find offers besides the user's items. A choice comes back from the palette as
 * `<kind>:<payload>`, see {@link VaultNextComponent.openQuickFind}.
 */
const QUICK_FIND_CREATE = [
  { type: CipherType.Login, labelKey: "typeLogin", icon: "bwi-globe" },
  { type: CipherType.Card, labelKey: "typeCard", icon: "bwi-credit-card" },
  { type: CipherType.Identity, labelKey: "typeIdentity", icon: "bwi-id-card" },
  { type: CipherType.SecureNote, labelKey: "typeSecureNote", icon: "bwi-sticky-note" },
] as const;

const QUICK_FIND_GO_TO = [
  { route: "/tools/generator", labelKey: "generator", icon: "bwi-generate" },
  { route: "/reports", labelKey: "reports", icon: "bwi-file-text" },
  { route: "/settings/account", labelKey: "settings", icon: "bwi-cog" },
] as const;

/** Query parameter holding the item shown in the detail pane, so a reload or a link brings it back. */
const SELECTED_ITEM_PARAM = "selected";

/** Rows the quick find shows per group; typing narrows what is shown. */
const QUICK_FIND_MAX_RESULTS = 8;

function selectionScopeDetail(scope: VaultScope): string {
  if (scope.type === VaultScopeType.Organization) {
    return scope.organizationId;
  }
  if (scope.type === VaultScopeType.Folder) {
    return scope.folderId;
  }
  return "";
}

/**
 * The web individual vault built on the shared {@link VaultItemsTableComponent}, which owns its own
 * search, filter chips, and sorting — so this page has no filter sidebar.
 *
 * Every side-nav destination renders this one component, scoped by the `:vaultId` route segment —
 * see `VaultScope`.
 */
@Component({
  selector: "app-vault-next",
  templateUrl: "./vault-next.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "tw-flex tw-flex-col tw-h-full tw-min-h-0",
    "(document:keydown)": "onDocumentKeydown($event)",
  },
  imports: [
    BitKbdComponent,
    ButtonModule,
    CalloutModule,
    CoachmarkComponent,
    I18nPipe,
    HeaderModule,
    LinkModule,
    RouterLink,
    NewCipherMenuComponent,
    PopoverModule,
    VaultBannersComponent,
    VaultBatchActionComponent,
    VaultBreadcrumbsComponent,
    MyFolderBreadcrumbsComponent,
    MyFolderMenuComponent,
    CollectionOptionsMenuComponent,
    IconTileComponent,
    NgTemplateOutlet,
    SplitPaneComponent,
    VaultItemDetailPaneComponent,
    VaultItemsTableComponent,
    VaultOnboardingComponent,
    VaultOrganizationUserNotificationsComponent,
    VaultRemountOnDirective,
    CardGridComponent,
  ],
  providers: [
    safeProvider({ provide: DefaultCipherFormConfigService, useAngularDecorators: true }),
    safeProvider({ provide: WebVaultItemActionsService, useAngularDecorators: true }),
    safeProvider({ provide: WebVaultPromptService, useAngularDecorators: true }),
    safeProvider({
      provide: VaultItemsTransferService,
      useClass: DefaultVaultItemsTransferService,
      useAngularDecorators: true,
    }),
    VaultBatchBarService,
    safeProvider({
      provide: ASSIGN_COLLECTIONS_DIALOG,
      useClass: AssignCollectionsWebDialogAdapter,
      useAngularDecorators: true,
    }),
    safeProvider({
      provide: BULK_DELETE_DIALOG,
      useClass: BulkDeleteDialogWebAdapter,
      useAngularDecorators: true,
    }),
    safeProvider({
      provide: COLLECTION_DIALOG,
      useClass: CollectionWebDialogAdapter,
      useAngularDecorators: true,
    }),
  ],
})
export class VaultNextComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly cipherRowMenuService = inject(CipherRowMenuService);
  private readonly cipherService = inject(CipherService);
  private readonly collectionService = inject(CollectionService);
  private readonly configService = inject(ConfigService);
  private readonly dialogService = inject(DialogService);
  private readonly folderService = inject(FolderService);
  private readonly itemActions = inject(WebVaultItemActionsService);
  private readonly organizationService = inject(OrganizationService);
  private readonly restrictedItemTypesService = inject(RestrictedItemTypesService);
  private readonly vaultNavService = inject(VaultNavService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly cipherArchiveService = inject(CipherArchiveService);
  private readonly i18nService = inject(I18nService);
  private readonly batchBarService = inject(VaultBatchBarService);
  private readonly router = inject(Router);
  private readonly policyService = inject(PolicyService);
  private readonly webVaultPromptService = inject(WebVaultPromptService);
  private readonly userId$ = this.accountService.activeAccount$.pipe(getUserId);

  protected readonly coachmarkService = inject(CoachmarkService);

  protected readonly importCoachmarkOpen = computed(
    () => this.coachmarkService.activeStepId() === "importData",
  );

  /**
   * Onboarding prompts are the page's to start. {@link WebVaultPromptService} sequences them so
   * only one shows at a time.
   */
  ngOnInit(): void {
    void this.webVaultPromptService.conditionallyPromptUser();
  }

  private readonly routeParams = toSignal(this.activatedRoute.paramMap);

  private readonly routeData = toSignal(this.activatedRoute.data);

  private readonly routeScope = computed(() =>
    routeVaultScope(this.routeParams(), this.routeData()),
  );

  private readonly vaultNav = toSignal(
    this.userId$.pipe(switchMap((userId) => this.vaultNavService.viewModel$(userId))),
  );

  /**
   * The vault the side nav has scoped this page to, and the shared folder within it the URL has
   * drilled into. `vaultScopeGuard` has already turned away any segment that names no vault, so an
   * unresolvable one here means the guard was bypassed — show everything rather than an empty page.
   */
  protected readonly vaultScope = computed(
    () => resolveVaultScope(this.routeScope(), this.vaultNav()) ?? ALL_ITEMS_SCOPE,
  );

  protected readonly defaultCollectionId = computed(() => {
    const scope = this.vaultScope();
    if (scope.type !== VaultScopeType.Organization) {
      return undefined;
    }
    return defaultUserCollectionId(scope.organizationId, this.vaultNav());
  });

  /** Only a shared folder trails a breadcrumb; every other page reads as a plain title. */
  protected readonly showBreadcrumbs = computed(
    () =>
      organizationVaultPage(this.vaultScope(), this.vaultNav()) ===
      OrganizationVaultPage.SharedFolder,
  );

  protected readonly headerTile = computed(() =>
    vaultScopeHeaderTile(this.vaultScope(), this.vaultNav()),
  );

  protected readonly parsedVaultScope = computed(() => this.routeScope() ?? ALL_ITEMS_SCOPE);

  /**
   * The scope key the vault table's filter state belongs to. Keyed off the parsed scope rather
   * than {@link vaultScope}, which resolves a second time as the nav loads.
   */
  protected readonly filterScopeKey = computed(() => scopeKey(this.parsedVaultScope()));

  protected readonly collectionSelected = computed(() => {
    const seg = scopedSharedFolderId(this.parsedVaultScope());
    return seg != null && seg !== MY_ITEMS_ROUTE;
  });

  /**
   * Every item the user can see, in every state. Which of trashed, archived, and active items a
   * page shows is the scope's call — see {@link cipherInScope} — so this narrows by nothing but
   * the restricted item types, which no scope may show.
   */
  private readonly allCiphers$ = this.userId$.pipe(
    switchMap((userId) =>
      combineLatest([
        // Emits null until the first decrypt completes. Reads the with-partials stream so
        // PAM-gated rows stay listed — a member has to see the item to request access to it.
        this.cipherService.cipherListViewsIncludingRestricted$(userId).pipe(filterOutNullish()),
        this.restrictedItemTypesService.restricted$,
      ]),
    ),
    map(([ciphers, restricted]) =>
      ciphers.filter(
        (cipher) => !this.restrictedItemTypesService.isCipherRestricted(cipher, restricted),
      ),
    ),
    shareReplay({ refCount: true, bufferSize: 1 }),
  );

  /**
   * The items that could not be decrypted. `cipherListViews$` drops them, so they reach the page
   * only through here — see {@link ciphers} and {@link showDecryptionFailureDialog}.
   */
  private readonly failedCiphers$ = this.userId$.pipe(
    switchMap((userId) => this.cipherService.failedToDecryptCiphers$(userId)),
    filterOutNullish(),
    shareReplay({ refCount: true, bufferSize: 1 }),
  );

  /** `undefined` until the ciphers stream first emits, which is what drives {@link loading}. */
  private readonly loadedCiphers = toSignal(this.allCiphers$);

  private readonly allCiphers = computed<CipherViewLike[]>(() => this.loadedCiphers() ?? []);

  private readonly failedCiphers = toSignal(this.failedCiphers$, { initialValue: [] });

  /**
   * Opens once per visit, and names only the failures the page in view can show — the same
   * `cipherInScope` narrowing {@link ciphers} applies.
   */
  private readonly showDecryptionFailureDialog = combineLatest([
    this.failedCiphers$,
    toObservable(this.vaultScope),
  ])
    .pipe(
      map(([ciphers, scope]) => ciphers.filter((cipher) => cipherInScope(cipher, scope))),
      filter((ciphers) => ciphers.length > 0),
      take(1),
      takeUntilDestroyed(),
    )
    .subscribe((ciphers) =>
      DecryptionFailureDialogComponent.open(this.dialogService, {
        cipherIds: ciphers.map((cipher) => cipher.id as CipherId),
      }),
    );

  /**
   * Every item in the account's active vaults. The banners and onboarding speak to the account as
   * a whole rather than to the page, so they read this instead of the scoped rows — an empty My
   * vault should not make an account that has organization items look brand new.
   */
  protected readonly activeCiphers = computed<CipherViewLike[]>(() =>
    this.allCiphers().filter((cipher) => cipherInScope(cipher, ALL_ITEMS_SCOPE)),
  );

  /**
   * The rows for the table: {@link allCiphers} plus {@link failedCiphers}, narrowed to the scope.
   *
   * A failed item still carries its organization, collections, and deleted date — none of which
   * needed decrypting — so `cipherInScope` places it without any special case. It is left out of
   * {@link activeCiphers}, which the banners and onboarding read.
   */
  protected readonly ciphers = computed<CipherViewLike[]>(() => {
    const scope = this.vaultScope();
    return [...this.failedCiphers(), ...this.allCiphers()].filter((cipher) =>
      cipherInScope(cipher, scope),
    );
  });

  protected readonly loading = computed(() => this.loadedCiphers() === undefined);

  protected readonly folders = toSignal(
    this.userId$.pipe(
      switchMap((userId) => this.folderService.folderViews$(userId)),
      // `folderViews$` appends a "no folder" pseudo-folder with an empty id. The table has its own
      // NO_FOLDER sentinel for that option, so passing it through would duplicate it and defeat the
      // table's own "user has no folders" check.
      map((folders) => folders.filter((folder) => folder.id != null && folder.id !== "")),
    ),
    { initialValue: [] },
  );

  protected readonly collections = toSignal(
    this.userId$.pipe(switchMap((userId) => this.collectionService.decryptedCollections$(userId))),
    { initialValue: [] },
  );

  protected readonly organizations = toSignal(
    this.userId$.pipe(switchMap((userId) => this.organizationService.memberOrganizations$(userId))),
    { initialValue: [] },
  );

  /**
   * The collections the table resolves its Shared folders column and chip from, and the card grid
   * derives its tree from. The chip lists whatever this holds rather than deriving its options from
   * the rows, so a scoped page has to narrow it or it offers folders none of its items could be in.
   *
   * Narrowed to the vault only, never to the shared folder in view: an item belongs to as many
   * shared folders as it was assigned to, so a row in the folder being viewed may live in others
   * too — narrowing this would drop those from its Shared folders column and leave the chip unable
   * to offer them. The breadcrumb tree needs the whole vault for the same reason: the folder it
   * drills into has to be findable in the tree.
   *
   * The unscoped {@link collections} still back the row actions, which assign an item to any
   * collection the user can reach — not just the ones this page shows.
   */
  protected readonly scopedCollections = computed(() => {
    const scope = this.vaultScope();
    return this.collections().filter((collection) => collectionInScope(collection, scope));
  });

  /** The organizations the table names its Vault column and chip from — see {@link scopedCollections}. */
  protected readonly scopedOrganizations = computed(() => {
    const scope = this.vaultScope();
    return this.organizations().filter((organization) => organizationInScope(organization, scope));
  });

  /** Scopes the table's search index to the organization, for an organization vault. */
  protected readonly scopedOrganizationId = computed(() => {
    const scope = this.vaultScope();
    return scope.type === VaultScopeType.Organization ? scope.organizationId : undefined;
  });

  /**
   * The shared folder the scope has drilled into, prefilled onto a new item — `undefined` unless
   * it names an actual collection rather than the {@link MY_ITEMS_ROUTE} sentinel, which
   * `resolveVaultScope` has yet to resolve to an id while the nav is still loading.
   */
  protected readonly scopedCollectionId = computed(() => {
    const collectionId = scopedSharedFolderId(this.vaultScope());
    return collectionId != null && isGuid(collectionId)
      ? (collectionId as CollectionId)
      : undefined;
  });

  private readonly collectionMenuTarget = computed(() =>
    collectionMenuTargetForScope(this.vaultScope(), this.scopedCollections(), this.organizations()),
  );

  protected readonly currentCollection = computed(() => this.collectionMenuTarget()?.collection);

  protected readonly currentOrganization = computed(
    () => this.collectionMenuTarget()?.organization,
  );

  /**
   * The vault-scope display-name facts {@link EmptyVaultComponent} needs for its copy, relayed
   * through `vault-items-table` untouched — the table itself has no notion of vault scope.
   *
   * Gated by {@link showItemCreation}: Trash and Archive are not vaults an "Add item" message
   * makes sense for, even for an account these facts would otherwise resolve non-empty for.
   */
  protected readonly emptyVaultOrganizationName = computed(() =>
    this.showItemCreation()
      ? organizationNameForScope(this.vaultScope(), this.vaultNav())
      : undefined,
  );

  protected readonly hasMultipleVaults = computed(
    () => this.showItemCreation() && hasMultipleVaults(this.vaultNav()),
  );

  protected readonly emptySharedFolderName = computed(() =>
    this.showItemCreation()
      ? sharedFolderNameForScope(this.vaultScope(), this.scopedCollections())
      : undefined,
  );

  protected readonly emptyFolderName = computed(() =>
    this.showItemCreation() ? folderNameForScope(this.vaultScope(), this.folders()) : undefined,
  );

  protected readonly scopedFolderId = computed(() => scopedFolderId(this.vaultScope()));

  protected readonly canCreateCollections = computed(() => {
    const scope = this.vaultScope();

    // The "Add item" menu offers a "New collection" action only for organization vaults or when viewing all their items
    if (scope.type !== VaultScopeType.Organization && scope.type !== VaultScopeType.AllItems) {
      return false;
    }

    return this.organizations()?.some((o) => o.canCreateNewCollections && !o.isProviderUser);
  });

  /**
   * Whether the page offers the toolbar's Import and New item actions. New items cannot be created
   * with a trashed or archived status and would "disappear" after creation on those views.
   */
  protected readonly showItemCreation = computed(() => {
    const { type } = this.vaultScope();
    return type !== VaultScopeType.Trash && type !== VaultScopeType.Archive;
  });

  private readonly subscriptionEndedMessaging = toSignal(
    this.userId$.pipe(
      switchMap((userId) => this.cipherArchiveService.showSubscriptionEndedMessaging$(userId)),
      take(1),
    ),
    { initialValue: false },
  );

  protected readonly showSubscriptionEndedMessaging = computed(
    () => this.vaultScope().type === VaultScopeType.Archive && this.subscriptionEndedMessaging(),
  );

  protected readonly title = computed(
    () =>
      vaultScopeTitle(this.vaultScope(), this.i18nService, this.vaultNav()) ??
      folderNameForScope(this.vaultScope(), this.folders()),
  );

  private readonly configureBatchBar = effect(() => {
    const collections = this.collections();
    const hasCiphers = this.ciphers().length > 0;
    const scope = this.vaultScope();
    const inTrash = scope.type === VaultScopeType.Trash;
    const scopedCollectionId =
      scope.type === VaultScopeType.Organization ? scope.collectionId : undefined;
    const activeCollectionId = collections.find((c) => c.id === scopedCollectionId)?.id;
    untracked(() =>
      this.batchBarService.setConfig({
        isOrgVault: false,
        allCollections: collections,
        hasCiphers,
        inTrash,
        activeCollectionId,
      }),
    );
  });

  /** Used to ensure the selection is cleared when the side nav rescopes the page */
  private readonly lastScopeKey = signal<string | undefined>(undefined);

  private readonly clearSelectionOnScopeChange = effect(() => {
    // `resolveVaultScope` builds a fresh object each run, so compare by value, not reference.
    const scope = this.vaultScope();
    const key = `${scope.type}:${selectionScopeDetail(scope)}`;
    untracked(() => {
      if (this.lastScopeKey() !== undefined && this.lastScopeKey() !== key) {
        this.batchBarService.clearSelection();
      }
      this.lastScopeKey.set(key);
    });
  });

  protected readonly copyPresentation = toSignal(copyPresentation$(), {
    initialValue: DEFAULT_COPY_PRESENTATION,
  });

  private readonly rowMenuHandlers = computed<CipherRowMenuHandlers<CipherViewLike>>(() => ({
    edit: (item) => this.itemActions.edit(item),
    clone: (item) => this.itemActions.clone(item),
    assignToCollections: (item) => this.itemActions.assignToCollections(item, this.collections()),
  }));

  protected readonly rowActions = computed<VaultItemsTableRowAction<CipherViewLike>[]>(() =>
    this.cipherRowMenuService.getRowActions<CipherViewLike>(
      this.collections(),
      this.rowMenuHandlers(),
    ),
  );

  /** Whether the `OrganizationDataOwnership` policy applies to the active user. */
  protected readonly orgRequiresDataOwnership = toSignal(
    this.userId$.pipe(
      switchMap((userId) =>
        this.policyService.policyAppliesToUser$(PolicyType.OrganizationDataOwnership, userId),
      ),
    ),
    { initialValue: false },
  );

  /** The account's active My vault items, for the Vault chip's My vault count on an org page. */
  protected readonly myVaultItemCount = computed(
    () => this.activeCiphers().filter((cipher) => cipher.organizationId == null).length,
  );

  /**
   * Whether the viewport is wide enough for the detail pane beside the item list. Narrower, the page
   * keeps opening items in the dialog.
   */
  protected readonly detailPaneEnabled = isAtOrLargerThanBreakpointSignal("lg");

  /** The item list's width in the split layout, as a percentage of the page. */
  protected readonly listPaneSize = signal(45);

  protected readonly selectedItemId = signal<CipherId | undefined>(undefined);

  /**
   * The item shown in the detail pane. Read back from {@link ciphers} rather than stored, so it
   * follows edits to the item and empties when the item leaves the current scope.
   */
  protected readonly selectedItem = computed(() => {
    const id = this.selectedItemId();
    return id == null
      ? undefined
      : this.ciphers().find((cipher) => CipherViewLikeUtils.getId(cipher) === id);
  });

  /**
   * Clicking an item's name shows it in the detail pane when there is room for one. Otherwise it
   * opens the read-only view, matching the legacy vault — the dialog offers its own Edit toggle from
   * there, while the `edit` row action goes straight to the form. An item that failed to decrypt
   * always takes the dialog path, which is what reports the failure.
   *
   * Bound as an input, so it must be a stable reference rather than a method: a new function on each
   * change detection pass would churn the table's name column.
   */
  protected readonly itemAction = (item: CipherViewLike): void | Promise<void> => {
    if (!this.detailPaneEnabled() || CipherViewLikeUtils.decryptionFailure(item)) {
      return this.itemActions.view(item);
    }
    const id = CipherViewLikeUtils.getId(item);
    this.selectedItemId.set(id);
    void this.writeSelectionToUrl(id);
  };

  private readonly quickFindOpen = signal(false);

  /**
   * Everything the quick find can jump to: every active item by name first, since finding one is what it is mostly for, then the commands. Only
   * names go in, the same ones the list shows, and items that failed to decrypt are left out.
   */
  protected readonly quickFindItems = computed<CommandPaletteItem[]>(() => {
    const t = (key: string) => this.i18nService.t(key);

    const create = this.showItemCreation()
      ? QUICK_FIND_CREATE.map(({ type, labelKey, icon }) => ({
          value: `create:${type}`,
          label: t(labelKey),
          group: t("addItem"),
          icon,
        }))
      : [];

    const goTo = QUICK_FIND_GO_TO.map(({ route, labelKey, icon }) => ({
      value: `go:${route}`,
      label: t(labelKey),
      group: t("goTo"),
      icon,
    }));

    const items = this.activeCiphers().flatMap((cipher) => {
      const id = CipherViewLikeUtils.getId(cipher);
      if (id == null || CipherViewLikeUtils.decryptionFailure(cipher)) {
        return [];
      }
      const type = CipherViewLikeUtils.getType(cipher);
      return [
        {
          value: `item:${id}`,
          label: cipher.name,
          description: CipherViewLikeUtils.subtitle(cipher, this.i18nService),
          group: t("items"),
          icon: QUICK_FIND_CREATE.find((entry) => entry.type === type)?.icon ?? "bwi-globe",
        },
      ];
    });

    return [...items, ...create, ...goTo];
  });

  /** Opens the quick find on Cmd/Ctrl+K. Other modifiers are left to the browser. */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (
      !(event.metaKey || event.ctrlKey) ||
      event.altKey ||
      event.shiftKey ||
      event.key.toLowerCase() !== "k"
    ) {
      return;
    }
    event.preventDefault();
    void this.openQuickFind();
  }

  /** Searches items and commands in a palette, then does what was chosen. */
  protected async openQuickFind(): Promise<void> {
    // Not on top of the item dialog, and not twice.
    if (this.quickFindOpen() || this.itemActions.itemDialogOpen()) {
      return;
    }

    this.quickFindOpen.set(true);
    try {
      const dialog = CommandPaletteDialogComponent.open(this.dialogService, {
        label: this.i18nService.t("quickFind"),
        placeholder: this.i18nService.t("quickFindPlaceholder"),
        emptyText: this.i18nService.t("noResultsFound"),
        items: this.quickFindItems(),
        maxResultsPerGroup: QUICK_FIND_MAX_RESULTS,
      });
      const choice = await lastValueFrom(dialog.closed);
      if (choice != null) {
        await this.runQuickFindChoice(choice);
      }
    } finally {
      this.quickFindOpen.set(false);
    }
  }

  private async runQuickFindChoice(choice: string): Promise<void> {
    const separator = choice.indexOf(":");
    const kind = choice.slice(0, separator);
    const payload = choice.slice(separator + 1);

    if (kind === "create") {
      const entry = QUICK_FIND_CREATE.find((e) => String(e.type) === payload);
      if (entry != null) {
        await this.addCipher(entry.type);
      }
    } else if (kind === "go") {
      await this.router.navigate([payload]);
    } else if (kind === "item") {
      const item = this.activeCiphers().find((c) => CipherViewLikeUtils.getId(c) === payload);
      if (item == null) {
        return;
      }
      // The pane only shows items of the page's current scope; any other item opens in the dialog.
      const inScope = this.ciphers().some((c) => CipherViewLikeUtils.getId(c) === payload);
      await (inScope ? this.itemAction(item) : this.itemActions.view(item));
    }
  }

  /** Edit stays in the dialog; the pane is read-only. */
  protected readonly editSelectedItem = (item: CipherViewLike) => this.itemActions.edit(item);

  private readonly queryParams = toSignal(this.activatedRoute.queryParamMap);

  /** The selection last read from the URL, so only a change of it, not other parameters, counts. */
  private readonly selectionInUrl = signal<CipherId | undefined>(undefined);

  /**
   * Takes the selection from the URL when the URL changes it: the page opens on a link, the back
   * button, or a navigation that drops the parameter. A table filter changing some other parameter
   * must not touch the selection, which is why only a change of this one counts.
   */
  private readonly selectionFromUrl = effect(() => {
    const param = this.queryParams()?.get(SELECTED_ITEM_PARAM);
    const fromUrl = param != null && isGuid(param) ? (param as CipherId) : undefined;
    if (fromUrl === untracked(this.selectionInUrl)) {
      return;
    }
    untracked(() => {
      this.selectionInUrl.set(fromUrl);
      this.selectedItemId.set(fromUrl);
    });
  });

  /** Forgets a selection that is not in the page: the item is gone, or is outside the scope. */
  private readonly dropMissingSelection = effect(() => {
    if (this.loading() || this.selectedItemId() == null || this.selectedItem() != null) {
      return;
    }
    untracked(() => {
      this.selectedItemId.set(undefined);
      void this.writeSelectionToUrl(undefined);
    });
  });

  /** Puts the selection on the URL without adding history entries or touching other parameters. */
  private async writeSelectionToUrl(id: CipherId | undefined): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [SELECTED_ITEM_PARAM]: id ?? null },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  /** The item the URL asks the page to open, if any — see {@link itemDeepLinkFrom}. */
  private readonly itemDeepLink = computed(() => itemDeepLinkFrom(this.queryParams()));

  /** The `<cipherId>:<action>` of the deep link last dispatched, so it is dispatched only once. */
  private readonly dispatchedDeepLink = signal<string | undefined>(undefined);

  /**
   * Opens the item named by the deep link on the URL — see {@link itemDeepLinkFrom}.
   *
   * The dispatch waits for the items to decrypt: `WebVaultItemActionsService` reads the item from
   * storage, and an item that has not loaded yet reads the same as one that does not exist.
   *
   * It also holds while a dialog is open, because `VaultItemDialogComponent` writes these same
   * params each time the user toggles view and edit — and it dispatches each link once, because
   * the params the dialog leaves behind would otherwise reopen it.
   */
  private readonly openDeepLinkedItem = effect(() => {
    const link = this.itemDeepLink();
    const loading = this.loading();
    const dialogOpen = this.itemActions.itemDialogOpen();

    untracked(() => {
      if (link == null) {
        this.dispatchedDeepLink.set(undefined);
        return;
      }

      if (loading || dialogOpen) {
        return;
      }

      const dispatched = `${link.cipherId}:${link.action}`;
      if (this.dispatchedDeepLink() === dispatched) {
        return;
      }
      this.dispatchedDeepLink.set(dispatched);

      void this.dispatchDeepLink(link);
    });
  });

  private async dispatchDeepLink(link: ItemDeepLink): Promise<void> {
    if (this.failedCiphers().some((cipher) => cipher.id === link.cipherId)) {
      await this.itemActions.showDecryptionFailure(link.cipherId);
      return;
    }

    switch (link.action) {
      case ItemDeepLinkAction.Edit:
        await this.itemActions.editById(link.cipherId);
        break;
      case ItemDeepLinkAction.Clone:
        await this.itemActions.cloneById(link.cipherId);
        break;
      case ItemDeepLinkAction.ShowFailedToDecrypt:
        await this.itemActions.showDecryptionFailure(link.cipherId);
        break;
      case ItemDeepLinkAction.View:
        await this.itemActions.viewById(link.cipherId);
        break;
    }
  }

  /** Handles `vault-new-cipher-menu`'s `cipherAdded`, emitted by its legacy per-type dropdown. */
  protected async addCipher(cipherType: CipherType): Promise<void> {
    await this.itemActions.add(cipherType, {
      organizationId: this.scopedOrganizationId(),
      collectionId: this.scopedCollectionId(),
      folderId: this.scopedFolderId(),
    });
  }

  /**
   * Handles `vault-new-cipher-menu`'s `onAddItemDialog`, which it only emits once
   * `PM32009NewItemTypes` is on.
   */
  protected async openAddItemDialog(eventOrigin: "empty" | "toolbar"): Promise<void> {
    let toolbarOptions = {};
    // The empty state should only give the user options that allow them to populate that
    // empty state. Therefore folders and shared folders should only be included when the dialog
    // is opened from the toolbar.
    if (eventOrigin === "toolbar") {
      toolbarOptions = {
        canCreateFolder: true,
        canCreateCollection: this.canCreateCollections(),
      };
    }

    const dialogRef = AddItemDialogComponent.open(this.dialogService, {
      canCreateCipher: true,
      canCreateSshKey: true,
      canCreateFolder: false,
      canCreateCollection: false,
      ...toolbarOptions,
    });
    const result = await firstValueFrom(dialogRef.closed);
    if (result == null) {
      return;
    }

    if (result.result === AddItemDialogResult.Cipher) {
      await this.itemActions.add(result.cipherType, {
        organizationId: this.scopedOrganizationId(),
        collectionId: this.scopedCollectionId(),
        folderId: this.scopedFolderId(),
      });
    } else if (result.result === AddItemDialogResult.Folder) {
      this.addFolder();
    } else if (result.result === AddItemDialogResult.Collection) {
      await this.addCollection();
    }
  }

  /** Handles `vault-new-cipher-menu`'s `folderAdded`, emitted by its legacy dropdown. */
  protected addFolder(): void {
    AddEditFolderDialogComponent.open(this.dialogService);
  }

  /** Handles `vault-new-cipher-menu`'s `collectionAdded`, emitted by its legacy dropdown. */
  protected async addCollection(): Promise<void> {
    const eligibleOrganizations = this.organizations()
      .filter((o) => o.canCreateNewCollections && !o.isProviderUser)
      .sort(Utils.getSortFunction(this.i18nService, "name"));
    if (eligibleOrganizations.length === 0) {
      return;
    }

    const defaultOrganizationId =
      eligibleOrganizations.find((o) => o.id === this.scopedOrganizationId())?.id ??
      eligibleOrganizations[0].id;

    const dialogRef = openCollectionDialog(this.dialogService, {
      data: {
        organizationId: defaultOrganizationId,
        parentCollectionId: this.scopedCollectionId(),
        showOrgSelector: true,
        limitNestedCollections: true,
      },
    });
    const result = await firstValueFrom(dialogRef.closed);
    if (result?.action !== CollectionDialogAction.Saved) {
      return;
    }

    if (result.collection) {
      const userId = await firstValueFrom(this.userId$);
      await this.collectionService.upsert(
        new CollectionData(result.collection as CollectionDetailsResponse),
        userId,
      );
    }
  }

  private readonly lastViewedFolder = signal<
    { organizationId: OrganizationId; collectionId: CollectionId } | undefined
  >(undefined);

  private readonly navigateAwayIfFolderVanishes = effect(() => {
    const collection = this.currentCollection();
    const organizationId = this.scopedOrganizationId();
    const collectionId = this.scopedCollectionId();

    untracked(() => {
      if (collection != null) {
        this.lastViewedFolder.set(
          organizationId != null && collectionId != null
            ? { organizationId, collectionId }
            : undefined,
        );
        return;
      }

      const last = this.lastViewedFolder();
      if (
        last != null &&
        last.organizationId === organizationId &&
        last.collectionId === collectionId
      ) {
        this.lastViewedFolder.set(undefined);
        void this.router.navigate(sharedFoldersCommands(organizationId), { replaceUrl: true });
      }
    });
  });

  protected async openImport(): Promise<void> {
    if (await this.configService.getFeatureFlag(FeatureFlag.ImportUpgrade)) {
      const queryParams = importQueryParamsForVault(
        this.scopedOrganizationId(),
        this.scopedCollectionId(),
        importStartedFrom(this.parsedVaultScope(), this.vaultNav()),
      );
      await (queryParams == null
        ? this.router.navigate(["/tools/import"])
        : this.router.navigate(["/tools/import"], { queryParams }));
      return;
    }

    ImportDialogComponent.open(
      this.dialogService,
      this.scopedOrganizationId(),
      this.scopedCollectionId(),
    );
  }
}
