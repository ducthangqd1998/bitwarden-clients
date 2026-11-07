# UI direction: three-pane vault

Status: **draft proposal, built on a spike branch and run against a real Vaultwarden**; not approved or merged. Date: 2026-11-07.
Scope: web vault first (`apps/web`). Shared pieces go in `libs/components` / `libs/vault` so browser and desktop can adopt later.

Companion docs: [ux-guidelines.md](./ux-guidelines.md) (interaction and a11y rules), [../ai/skills-inventory.md](../ai/skills-inventory.md) (which agent skill to use at each step).

## 1. Context (verified in the repo)

| Fact                                                                                                                                                                                                       | Where                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Angular 21.2, CDK 21.2                                                                                                                                                                                     | `package.json`                                                                                                  |
| Tailwind **3.4.18**, prefix `tw-`, preflight off in libs (on in web), theme through CSS variables                                                                                                          | `libs/components/tailwind.config.base.js`, `libs/components/src/tw-theme.css`                                   |
| In-house design system `bit-*` (~60 components, Storybook)                                                                                                                                                 | `libs/components/src`                                                                                           |
| A redesign is already underway behind `FeatureFlag.VFO1Foundation` (default `false`)                                                                                                                       | `libs/common/src/enums/feature-flag.enum.ts`, `apps/web/src/app/vault/individual-vault/vault-routing.module.ts` |
| New vault page `VaultNextComponent` replaces the legacy `VaultComponent` (1793 lines, 25% filter column + table)                                                                                           | `apps/web/src/app/vault/individual-vault/vault-next.component.*`                                                |
| Building blocks already exist: table v2 (virtual scroll), card grid, nav sections, breadcrumbs, icon tile, coachmarks, hover-reveal, copy-click, TOTP countdown, add-item grid, row context-menu directive | `libs/components/src/table/v2`, `libs/vault/src/components/*`                                                   |
| Not found in `libs/components`: command palette, hover card, resizable panes                                                                                                                               | directory listing, no deep grep                                                                                 |

Conclusion: do **not** start a parallel UI. Extend the VFO1 work.

## 2. Goals and non-goals

Goals

- Faster scan-and-act on items: find, copy, open, edit with minimal clicks and no full-page navigation.
- Keyboard-first: quick find, list navigation, copy shortcuts.
- Visual calm and density closer to 1Password: sidebar for scope, compact list, rich detail pane.
- Stay inside the existing token system so every theme and dark mode keeps working.

Non-goals

- No change to encryption, SDK or vault-data handling (repo rule: no new crypto logic here).
- No new design system next to `bit-*`.
- No Tailwind 4 migration as a side effect of this work.
- Browser extension popup layout is out of scope (too narrow for three panes).

## 3. Spartan UI decision

Spartan UI has two layers: **brain** (`@spartan-ng/brain`, unstyled accessible primitives, prefix `brn`, from npm) and **helm** (shadcn-style styled components, prefix `hlm`, copied into the repo).

Facts checked on 2026-11-07: `@spartan-ng/brain@1.9.0`, MIT, peers `@angular/* >=21 <23`, `@angular/cdk >=21 <23`, **`tailwindcss >=4`**, `tw-animate-css`, `clsx`, `luxon`. Spartan docs say it requires Tailwind v4. The docs page read did not mention a class prefix.

| Option                                             | Verdict          | Why                                                                                                                                                                                                                     |
| -------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Adopt helm wholesale                            | **No**           | Needs Tailwind 4; unprefixed shadcn tokens collide with ours (shadcn `bg-background` vs our `tw-bg-background`); duplicates button/dialog/menu/table/tooltip/toast we already ship; forks look and a11y across clients. |
| B. Brain only, styled as `bit-*` with `tw-` tokens | **Recommended**  | Gets tested keyboard/ARIA behaviour for the gaps; no new look; helm not copied. Needs a peer-dependency override for Tailwind (see risks).                                                                              |
| C. No Spartan, build gaps on CDK                   | Fallback         | Use if the spike shows the peer override is unacceptable. Cost: more custom a11y code.                                                                                                                                  |
| D. Migrate repo to Tailwind 4 first                | Separate project | Touches every client and the prefix and token rules. Only then is helm realistic.                                                                                                                                       |

Rules if B is chosen:

- Wrap brain behind a `bit-*` facade (`CODE_STYLE.md`: wrap third-party deps, never expose them in the public API).
- Spartan imports live only inside `libs/components`; apps never import `@spartan-ng/*`.
- Style with `tw-` semantic tokens only. No arbitrary values, no raw colors.

## 4. Target layout

```
┌ Sidebar ─────────┬ Item list ──────────────┬ Detail pane ───────────────┐
│ Quick find ⌘K    │ sort · filter · + New   │ [icon] Title            ⋯  │
│ Favorites        │ ▸ [icon] Title   user   │ Username     [copy]        │
│ Vaults / orgs    │ ▸ [icon] Title   user   │ Password ••••• [reveal][copy]│
│ Collections      │   compact rows,         │ One-time code  ◔ 123 456   │
│ Folders          │   virtual scroll        │ Websites · Notes · History │
│ Security (reports)│                        │ Edit · Share · Archive     │
└──────────────────┴─────────────────────────┴────────────────────────────┘
```

Behaviour

- Sidebar chooses scope (all items, favorites, vault, collection, folder). Reuse `bit-nav-*` and `vault-nav-section`.
- List shows one row per item: icon, title, subtitle (username or masked card number), org badge. Single click selects and fills the detail pane; double click or Enter opens edit.
- Detail pane is read-first. Each field is a row with hover/focus-revealed actions (`hover-reveal`, `copy-click`, `totp-countdown`).
- Panes are resizable with a keyboard-operable splitter; widths persist per user.
- Below the `md` breakpoint: list and detail become a master-detail stack (list, then detail with a back button).
- Existing item dialogs (`vault-item-dialog`) stay for create and edit in phase 1; inline edit is a later phase.

## 5. Component map

| Need                                     | Status                                                   | Plan                                                                  |
| ---------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Sidebar nav, sections, groups            | exists (`bit-nav-*`)                                     | reuse                                                                 |
| Item list with selection, virtual scroll | exists (table v2, `vault-items-table`)                   | add single-select + listbox semantics, compact row variant            |
| Row context menu                         | exists (`vault-items-table-row-context-menu.directive`)  | keep; promote to `libs/components` only if a second consumer appears  |
| Detail pane                              | none yet: item click opens a dialog (`itemActions.view`) | embed `app-cipher-view` (`libs/vault/src/cipher-view`) in a pane      |
| Field row with reveal/copy               | exists pieces                                            | compose into `vault-field-row` in `libs/vault`                        |
| Command palette (⌘K)                     | spiked (`bit-command-palette`, no overlay/shortcut yet)  | wrap in `DialogService`, add `Cmd/Ctrl+K`                             |
| Hover card preview                       | missing                                                  | optional, brain hover-card wrapped                                    |
| Resizable panes                          | spiked (`bit-split-pane`, two panes, no touch/RTL keys)  | RTL arrow keys and touch not handled by brain; decide before shipping |

## 6. Phases

Each phase ships behind `VFO1Foundation`. Per `libs/components/CONTRIBUTING.md`, changes to `libs/components` go in a **standalone PR** with Design sign-off, Figma reference and Storybook coverage for every state.

0. **Spike (1-2 days, throwaway branch).** Install brain, add the Tailwind peer override, wrap one component (command), render in Storybook. Exit: install, `npm run test:types`, `npm run lint`, Storybook and `lint:dep-ownership` all pass; bundle delta measured. **Go/no-go for option B.** _Result 2026-11-07: go. Install works (root `tailwindcss` override absorbs the peer), Jest and Storybook run, lint/types/dep-ownership pass. Side effect: Tailwind 3 and about 50 build packages lose their `dev` flag in `package-lock.json` because brain is a production dependency._
1. **Primitives PR(s) in `libs/components`:** `bit-command-palette`, `bit-split-pane`, compact list-row variant. Stories with play functions for hover, focus, open.
2. **Three-pane shell in `VaultNextComponent`:** layout, selection state as signals, URL carries selected item id.
3. **Detail pane content:** reuse `libs/vault/src/cipher-view`; field rows; per-type sections.
4. **Quick find and shortcuts** (see UX guidelines), analytics-free.
5. **Polish and rollout:** a11y audit, perf trace on 5k-item vault, Design review, flag ramp.

## 7. Risks

- **Peer dependency:** brain declares `tailwindcss >=4`; the repo overrides `tailwindcss` to 3.4.x. Expect `ERESOLVE`; needs an `overrides` entry and dep-ownership review. Brain is unstyled, so runtime is likely fine, but prove it in the spike.
- **Security UX:** secrets must stay masked by default, never appear in `aria-live`, logs or error messages (root rules). Selecting an item must not decrypt more than the item needs.
- **Performance:** keep table v2 virtual scrolling; do not render detail for unselected rows.
- **A11y:** three-pane focus order, listbox roving tabindex, splitter keyboard support. WCAG 2.2 AA.
- **i18n/RTL:** logical properties only; all strings through `I18nPipe`, `en` locale only.
- **Process:** `libs/components` changes need `@bitwarden/team-ui-foundation` awareness and Design sign-off.

## 8. Open questions

1. Is a three-pane layout acceptable to Design, or is a two-pane (list + slide-over) closer to the Figma?
2. Is the Tailwind peer override acceptable to platform owners, or is option C the only route?
3. Does this replace or extend the card grid on `VaultNextComponent`?
4. Should desktop adopt the same shell (shared `libs/vault` components)?

## 10. Implementation status (2026-11-07)

Built on the spike branch; nothing merged.

- `bit-command-palette` (cap on rows per group), `bit-command-palette-dialog` (opens near the top of the page, closes with the chosen value), `bit-split-pane`, `bit-item` `selected`, and `vault-item-detail-pane` with master password re-prompt kept.
- `VaultNextComponent` shows the split layout from the `lg` breakpoint: list on the left, item on the right, behind `VFO1Foundation`.
- **Quick find:** Cmd/Ctrl+K, or the Quick find button in the table toolbar, opens the palette. It offers Add item (login, card, identity, secure note), Go to (generator, reports, settings) and every active item by name. Choosing an item shows it in the pane when it is in the page's scope and opens the item dialog otherwise. Only item names are put in the palette, the same ones the list shows; items that failed to decrypt are left out.
- A bug found while checking it in a browser: pressing Enter in the palette closed the dialog, and focus went back to the button that opened it while the key was still down, which activated the button and reopened the dialog. The palette now prevents the default of Enter.

- **Selected item in the URL:** the pane's item lives in the `selected` query parameter, replacing the history entry and merging with other parameters. A reload, a link and the back button restore it. A selection whose item is not on the page (deleted, or outside the current scope) is dropped and the parameter cleared. Only a change of this parameter counts, so a table filter writing its own parameter cannot wipe a selection the URL has not caught up with.
- **Palette search:** items carry their subtitle (the same text the table shows) as a second line, and the search matches it as well as the name.
- **`bit-split-pane`:** touch drag (the primitive already supported it, the divider just never started it), a larger touch target on coarse pointers, and arrow keys that follow the page direction in right-to-left pages.
- **Table:** `bit-table-v2` has an `activeRow` input and `bit-row` an `active` input, so the row shown in the pane is tinted across its whole width. Tinting the name cell did not work: `bit-cell` is `display: contents`, so its background is never painted. Found by looking at the story, not by the tests.

Run since against a real Vaultwarden (15 checks, see [vaultwarden.md](./vaultwarden.md)): selecting an item, the URL carrying it, lock and unlock after a reload, Quick find from Ctrl+K and from the button, search by username, and the narrow layout. The visual treatment of the shell, type and palette is in [visual-style.md](./visual-style.md) section 12.

- **Narrow widths:** below the point where the nav column collapses, the siderail used to float over `<main>`. `bit-layout` now clears it. The vault toolbar wraps instead of clipping its last button.
- **Shell:** `<main>` is an inset rounded panel on a frame in the nav color, which is the look of the three-pane references. Page padding, banner offsets and the siderail clearance are tied together in `bit-layout` and `bit-banner`; change them together.

Not done: Ctrl+K was only tried in headless Chromium. Whether a desktop browser or an extension takes it before the page does has not been tested in a browser with its own UI; `preventDefault` is called on the keydown, which stops it for shortcuts that are not reserved. The detail pane is read-only and edits go through the dialog.
