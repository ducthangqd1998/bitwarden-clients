# Visual style: flat, clean SaaS

Status: **implemented on a spike branch and run against a real Vaultwarden, not merged; needs Design review before merge.** Decisions made 2026-11-07: light sidebar, 6px controls and tags, flat style replaces the current look for the whole new vault (everything behind `VFO1Foundation`), and **a black, white and gray palette with no blue** (see section 12).
Scope: the new vault (`VFO1Foundation`) first. Tokens live in `libs/components`, so browser and desktop can adopt later.

Companion docs: [ui-direction.md](./ui-direction.md) (layout), [ux-guidelines.md](./ux-guidelines.md) (interaction and a11y).
Preview: Storybook, **Prototypes / Flat SaaS style**, stories `Current` and `FlatSaas` (same screen, same real components).

## 1. Target look

Taken from the three reference screenshots (a CRM-style SaaS app):

- App background is a very light gray. The content sits in a **white panel** with a 1px light border, rounded corners and no shadow.
- Sidebar has **no fill and no divider** of its own: it is the gray background. Active item is a soft gray rounded row, not a color.
- **Small, calm type.** About 14px body, 12px labels and column headers, medium weight for titles and numbers, dark-gray text instead of black.
- **Thin everything.** 1px light borders, 16px stroke icons, hairline row dividers, no shadows on cards.
- **Compact density.** About 36px table rows, 32px controls.
- Tags are **pastel**: soft tinted background, darker text of the same hue, small radius (about 6px), not pills.
- Overlays (command menu) are white, 1px border, about 12px radius, grouped with small gray group labels, icon per row, key hints on the right.
- ~~Charts and accents use soft pastels; one clear primary color for actions.~~ Replaced on 2026-11-07: the palette is neutral (black, white, gray). The primary action is near-black in light and near-white in dark. Only status colors (success, warning, danger) keep a hue.

## 2. Where we are (measured in Storybook on 2026-11-07)

| Thing                             | Today                                                     | Target                                          |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Button radius                     | 12px (`tw-rounded-xl`), 32px high, 12px text (small size) | 6px                                             |
| Icon button, form field container | `tw-rounded-xl` (12px)                                    | 6px                                             |
| Badge                             | pill (`tw-rounded-full`)                                  | 6px                                             |
| Chips                             | `tw-rounded-md` (6px)                                     | keep                                            |
| Menu, dialog                      | `tw-rounded-xl`, `border-light`, `shadow-lg`              | 12px, keep border, softer shadow                |
| Command palette                   | 8px                                                       | 12px                                            |
| Side nav (VFO1)                   | navy (`brand-950`), white text                            | light, no fill (option, see 5)                  |
| Content panel                     | white, light border, `rounded-tl-xl` (corner next to nav) | white, light border, all corners rounded, inset |
| Base font                         | Inter, 16px, 150% line height                             | 14px in app chrome (done, see section 12)       |
| Shadows, radius                   | not tokenized (Tailwind defaults)                         | tokenized                                       |

Already in the repo and worth reusing:

- Color tokens are CSS variables (`--color-bg-*`, `--color-fg-*`, `--color-border-*`), with `.theme_light` and `.theme_dark`.
- Nav palette is switchable through `data-nav-version` (`default` remaps the nav tokens back to the original palette), so a light nav is a token change, not a component change.
- `bit-compact:` variant and `CompactModeService` already exist for density.
- Desktop puts a `vfo1` class on `app-root` for VFO1-only styling (CL-1232). Whether web does the same was not verified.
- The UI Foundation team is already restyling (recent tickets: `bit-item` styles, scrollbars, token renames). Coordinate before changing the same files.

## 3. What the prototype shows

`FlatSaas` is only a scoped override on top of the real components: radius 12px to 6px for controls, badges from pill to 6px, palette to 12px, light sidebar, 36px rows. Measured: button 12px to 6px, badge 9999px to 6px, palette 8px to 12px.

It proves the direction is reachable with tokens plus small component edits. It does **not** change any shipped component.

## 4. Token proposal

Add radius and shadow tokens so one scope can remap them. Defaults equal today's values, so merging them changes nothing.

| Token (Tailwind class)                    | Default (today)     | Flat style                     |
| ----------------------------------------- | ------------------- | ------------------------------ |
| `--radius-control` (`tw-rounded-control`) | 0.75rem             | 0.375rem                       |
| `--radius-tag` (`tw-rounded-tag`)         | 9999px              | 0.375rem                       |
| `--radius-card` (`tw-rounded-card`)       | 0.75rem             | 0.5rem                         |
| `--radius-panel` (`tw-rounded-panel`)     | 0.75rem             | 0.75rem                        |
| `--shadow-overlay` (`tw-shadow-overlay`)  | current `shadow-lg` | `0 8px 24px rgb(0 0 0 / 0.08)` |

Colors already exist; the flat style mostly **chooses lighter ones**:

- Shell: `bg-bg-tertiary` (gray-050). Panel: `bg-bg-primary`.
- Panel, card and table lines: `border-border-light`. Inputs keep `border-border-base`.
- Headings `fg-heading`, body `fg-body`, labels and headers `fg-body-subtle`.
- Hover and active rows: `bg-bg-hover`.
- Tags: the existing soft families (`bg-*-soft` with `fg-*-strong`), radius from `--radius-tag`.

Do not copy from the references:

- **Low-contrast focus rings.** Keep the 2px high-contrast ring (`border-focus`).
- **Light-gray-on-white text below 4.5:1.** Body and labels must pass WCAG AA in light and dark.

## 5. Sidebar color (decided: light)

VFO1 today uses a navy side nav. The reference uses a light one. Both are token-only.

| Option       | Change                                                          | Trade-off                                                                 |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A. Keep navy | none                                                            | Strong brand, but heavier than the target look                            |
| B. Light nav | new nav token set (for example `data-nav-version="vfo1-light"`) | Matches the reference; needs a dark-mode pair and a check of nav contrast |

**Decided: B.** Implemented as nav token overrides under `html.vfo1.theme_light`. The `default` nav is untouched. Dark theme first kept its own slate nav tokens; since the neutral palette (section 12) the dark nav is near-black, darker than the content panel.

## 6. Component specs (flat style)

| Component                               | Change                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `bit-button`                            | radius `control`, no shadow, 32px, 14px text for default size; primary stays solid brand, secondary is white with 1px border |
| `bit-icon-button`, `bit-form-field`     | radius `control`; field height 32px; 1px border                                                                              |
| `bit-badge`, chips                      | radius `tag`; soft tinted background, same-hue text, 12px medium                                                             |
| `bit-item`                              | radius `control`, border `border-light`, `selected` state (added)                                                            |
| `bit-table-v2`                          | no outer box shadow; header 12px subtle; row 36px; hairline `border-light` dividers; hover `bg-hover`                        |
| `bit-tabs`                              | underline style, 2px `border-focus` color under active tab, 14px                                                             |
| `bit-nav-item`                          | radius `control`; active `bg-hover` + heading text (light nav)                                                               |
| `bit-menu`, `bit-popover`, `bit-dialog` | radius `panel`, 1px `border-light`, `shadow-overlay`                                                                         |
| `bit-command-palette`                   | radius `panel`, group labels 12px subtle, icon tile per row, `bit-kbd` hint on the right                                     |
| Card and KPI                            | radius `card`, 1px `border-light`, no shadow, label 14px, value about 28px medium                                            |
| Toast, callout                          | radius `control`, soft tinted background                                                                                     |

## 7. How to ship it without a big-bang diff

1. **Tokens first, zero visual change.** Add the radius, shadow and row-height variables with today's values, and switch components from `tw-rounded-xl` to the new classes. Chromatic should show no diff. This is the safe, reviewable PR.
2. **Scope.** A single scope (VFO1 class or data attribute on the app root) remaps the tokens to the flat values. Extension and desktop outside VFO1 stay as they are.
3. **Enable per area**, one PR each (see phases).
4. **Review at each step:** Storybook screenshots light and dark, contrast check, Design sign-off, Figma reference.

## 8. Phases

| Phase | Work                                                                | Exit criteria                                                    |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0     | This prototype and doc                                              | Design reviews `Current` vs `FlatSaas`; answers section 5 and 10 |
| 1     | Radius, shadow, row-height tokens; components switched to them      | No Chromatic diff; lint, types, tests pass                       |
| 2     | Shell and nav: inset rounded panel on all corners, light nav option | Layout stories updated; web VFO1 only                            |
| 3     | Controls: button, icon button, field, select, checkbox              | Flat values under scope; focus ring unchanged                    |
| 4     | Data: table-v2, badge, chips, tabs, item (`selected`)               | Table row 36px under scope; a11y checks                          |
| 5     | Overlays: menu, popover, dialog, command palette                    | Soft shadow, 12px radius; focus management unchanged             |
| 6     | Dark mode and a11y audit; Chromatic baseline; rollout with the flag | WCAG AA in both modes; Design sign-off                           |

## 9. Risks

- **Ownership.** UI Foundation and Design own these files; changes need their agreement and Figma.
- **Contrast.** Flat styles drift toward faint borders and gray text. Verify against WCAG AA in every theme.
- **Density and i18n.** Smaller controls and 14px text leave less room for long translations; test long strings and RTL.
- **Shared library.** Browser and desktop use the same components. Without a scope they would change too.
- **Chromatic noise.** Phase 1 must be diff-free, or reviewers cannot tell intended changes from accidental ones.
- **Prototype limits.** It overrides radius and sidebar on top of today's components. It does not cover dark mode, focus states, density of real tables, or the real side nav component.

## 10. Open questions

1. ~~Light or navy sidebar?~~ Light (decided).
2. ~~Control and tag radius?~~ 6px for both, cards 8px, panels 12px (decided).
3. ~~Is 14px the app-chrome body size, and is 36px the default row height?~~ 14px root (body 14px, titles 24px) and 44px rows in the vault (decided and built; 36px did not fit two-line rows).
4. ~~Default or setting?~~ Default for the whole new vault, no setting (decided).
5. ~~How does web scope VFO1-only styles?~~ A `vfo1` class on `<html>`, set by `AppComponent` (built).

## 11. Implementation status (2026-11-07)

Done, on branch `spike/spartan-brain-command-palette`, nothing merged:

**Phase 1, tokens with no visual change**

- `--radius-control`, `--radius-tag`, `--radius-card`, `--radius-panel` in `:root` (`tw-theme.css`), mapped to `tw-rounded-control|tag|card|panel` in `tailwind.config.base.js`. Defaults equal the old values.
- 20 hard-coded radii switched to the tokens: button, icon button, field container, toggle, nav item and logo (control); card, accordion, callout, form control card, file dropzone (card); menu, popover, dialog, table, bulk bar (panel); badge (tag).
- Checked in Storybook with the flat scope off: button 12px, badge 9999px, nav navy, `<html>` unchanged. Full `libs/components` Jest run passed (881 tests) before the scope was added.
- The command palette, a new component, moved from 8px to the 12px panel radius on purpose.

**Phase 2, the flat scope**

- Web sets `vfo1` on `<html>` when `VFO1Foundation` is on (`apps/web/src/app/app.component.ts`), next to the theme class, so overlays are covered too.
- `html.vfo1` remaps radius: control and tag 6px, card 8px, panel 12px.
- `html.vfo1.theme_light` remaps the nav tokens to a light nav (text gray-700 on gray-050).
- `bit-layout` adds a 1px `border-light` hairline between nav and main, only under `html.vfo1`. Desktop is unaffected.
- Contrast measured: nav text 9.81:1, on hover 8.82:1, nav section headings 4.51:1 (at the AA limit), subtle text on white 4.76:1. Panel borders are 1.19:1 on purpose; they are decoration, and input borders are unchanged.

**Phase 3, controls** (tokens in `tw-theme.css`, classes in `tailwind.config.base.js`; defaults are today's values)

- `--size-control-sm|control|control-lg`, `--pad-control-sm|control|control-lg`, `--text-icon-control`. Used by `bit-button` (padding), `bit-icon-button` (size and glyph) and the field container (min height). The button padding used arbitrary `calc()` values; it now uses the tokens.
- Measured in Storybook, default then flat: button 40 to 32px (small 32 to 28px), icon button 40 to 32px with a 24 to 20px glyph, field 40 to 32px, all with 12 to 6px radius.

**Phase 4, data**

- Vault tables (`vault-items-table`, shared folders, my folders) read `--row-height-px` when they are created: 56 by default, 44 flat (it was 48 at this step, lowered to 44 once the root font became 14px; see section 12). Not the 36px of the reference because every row has two lines (name and subtitle).
- Under `html.vfo1.theme_light`, `--color-border-base` is gray-100, so cards, items, popovers and table rows get hairline borders. The real side nav (VFO1 version) was checked with the light tokens.
- Four more tokens, defaults equal to the old colors, remapped under `html.vfo1.theme_light`:
  - `--color-bg-row-hover` (blue tint to neutral `bg-hover`): table rows, menu items, `bit-item` hover. Selected items and selected rows keep their brand tint, so hover and selected stay distinguishable.
  - `--color-fg-table-header` (body to subtle gray): table header labels.
  - `--color-fg-tab-active` and `--color-tab-indicator` (brand to heading color): active tab text and underline. Tabs already used an underline.
- Verified with the `ui-ux` probe on four stories (vault items table, tabs, item, menu), default against flat, 1280px: the set of findings is identical, so flat adds none. Table also run in dark: identical. Contrast: body text on hover fill 6.82:1, heading 16.04:1, table header 4.51:1 (at the AA limit), active tab 17.83:1.
- The probe's remaining findings exist unchanged in the default build: console error from the story's i18n mock, focus indicator measured as 1.00:1, Tailwind internal variables reported as unresolved, no headings or landmarks in a story, and a "verify" note on the selected item (the cue sits on the parent `bit-item`; it is a 1px brand border against a hairline gray one).

**Search and select heights**

- Measured in Storybook, default then flat: `bit-search` 40 to 32px, `bit-multi-select` 40 to 32px, `bit-select` 40 to **36** to 32px. The select was 4px taller than the other fields in the flat build because ng-select pads the value 7px above and below. That padding (`--pad-select-value`, 7px, 5px flat) and the 11px inner radius (now `--radius-control` minus the border) are tokens; the compiled `bw.theme.css` was regenerated with `sass`, and its diff is those two lines.

**Overlay shadow and nav active item**

- `--shadow-overlay` (`tw-shadow-overlay`): default is Tailwind's `shadow-lg`, so menus and dialogs look the same; flat is `0 8px 24px rgb(0 0 0 / 0.08)`. Used by menu, dialog and the command palette. Popovers keep their smaller shadow.
- The VFO1 nav item already gives the active item a background (it remaps `--color-nav-bg-brand` to the `-soft` token), so with the light nav tokens it gets a soft gray fill without any component change.

**Review sweep with the `ui-ux` probe (2026-11-07)**

- 97 components (one story each), default build against the flat build, both at 375px and 1280px in light, plus 1280px in dark: **flat adds no finding of any kind that the default build does not already have.**
- Spot checks by eye on the flat build: vault table, item, badge, dialog, menu, form field (light), vault table and form field (dark).
- Probe findings that exist in both builds and were left alone: focus indicator measured at 2.98:1 in the decryption failure dialog, focus indicators measured at 1.00:1 on several controls, headings and landmarks missing from stories, Tailwind internal variables reported as unresolved. The two dark-mode text contrast findings were looked at and are not defects: `copy-click` renders a disabled field (dimmed on purpose, and disabled controls are exempt), and `toggle-group` reads clearly in the screenshot (the 1.00:1 is a probe misreading).
- Dark runs: the probe reports `light` for many stories because it reads the page body, which Storybook leaves white outside the story frame; the screenshots show the dark theme applied. The dark-mode `THEME_FLASH` and `THEME_MISMATCH` notes on one dialog story come from how the probe was made to force dark.
- Not covered: hover states (the probe does not hover), the real vault page with the detail pane (needs a backend), 375px in dark, and any page that has no story.
- 12 hard-coded `tw-rounded-xl` radii remain in app and feature code (billing dialogs, report cards, empty states, desktop settings, browser health intro). They stay at 12px, which equals the panel radius; owning teams can move them to `tw-rounded-card` or `tw-rounded-panel`.

Not done yet:

- Chromatic baseline.
- Desktop and browser keep the old look; `html.vfo1` is web only.
- The web `AppComponent` change has no unit test (the component has about twenty injected dependencies). It has been run in a live app since (section 12).

## 12. Real-app pass (2026-11-07, later the same day)

Everything above was first checked in Storybook. This pass was built into the self-hosted web bundle and checked in a real browser against a local Vaultwarden 1.37.5 (see [vaultwarden.md](./vaultwarden.md)), with a throwaway account and fake items. It was prompted by the first real screenshot, where the earlier token work was too subtle to see.

**Shell and type** (`tw-theme.css`, `bit-layout`)

- `bit-layout` draws `<main>` as an inset panel: 8px margin (none on the nav side), `--radius-panel`, 1px `border-light`, on a frame in the nav's own color. Only under `html.vfo1` and only when the nav has a column. Measured: panel at 7px from the top, 10.5px radius (`--radius-panel` is 0.75rem, so 12px only at a 16px root), white on `#fafafa` in light, `#171717` on `#0a0a0a` in dark.
- `html.vfo1` sets the root font to 87.5% for `(pointer: fine)`, so body text is 14px and the rem-based spacing and icons shrink with it. Touch keeps 16px because input text under 16px makes iOS zoom. It is a percentage, so the user's own browser font size still counts.
- `--text-xs` and `--text-sm` are tokens (Tailwind `xs` and `sm`), lifted under the flat scope so the smallest text stays at 11.4px. `--text-3xl` gives page titles 24px (1.7143rem at the compact root).
- Row height 44px, down from 48 (`--row-height-px`).

**Palette: black, white, gray** (decided after seeing the dark theme: the blue slate was disliked, and so was blue in general)

- `html.vfo1` replaces the gray scale with neutral grays (`#fafafa` to `#0a0a0a`) and maps the `brand`, `purple`, `teal` and `coral` palette steps onto the same grays, so components that read the palette directly (icon tiles, avatars through tokens, the Reports illustrations) follow.
- Per theme, the semantic brand tokens (`bg-brand*`, `fg-brand*`, `border-brand*`, avatar brand) are near-black in light and near-white in dark. Legacy RGB tokens (`primary-*`, `secondary-*`, `background-*`, `text-main|muted|code|contrast`, `hover-default`) are neutral too.
- Dark theme: content panel `#171717`, frame and nav `#0a0a0a`, hover is white at 5%.
- Status colors (success, warning, danger) keep their hues on purpose. The Settings danger zone is still red.
- Links (`bitLink` types `primary` and `default`) stay underlined under `html.vfo1`, since there is no brand color left to tell a link from text.
- New tokens, defaults equal to the old colors: `--color-bg-toggle-active` and `--color-fg-toggle-active` (the selected toggle is a soft gray in light, a near-white pill in dark). Measured toggle contrast: 16.61:1 light, 17.93:1 dark.
- Not changeable from CSS: the **avatar color** is stored in the account as a hex value and drawn inline, which is also what colors the "My vault" nav tile. Set it in Settings, My account, Customize, with a custom color. The palette in that dialog has no gray.

**Narrow widths** (found by looking at the real page at 375px)

- `bit-layout` clears the siderail: when its column collapses to 0px the siderail still renders and floated over the start of `<main>`. `<main>` now gets `padding-inline-start` of the siderail width plus 1rem, only for the VFO1 nav.
- The vault toolbar slot wraps (`tw-flex-wrap`), so Quick find, Import and Add stack instead of clipping the last button.
- `bit-accordion`: the trigger wraps and the text column has a 10rem minimum, so the end slot (the onboarding "2 of 3 complete" badge) drops below the text instead of squeezing it to a sliver and overlapping it. This changes a shared component for every user of it.

**What was checked**

- `npm run test:types` exit 0 (it found one real strict-null error in `vault-item-detail-pane`, fixed). Jest: `libs/components` 896, `libs/vault` 2317, `apps/web` vault, layouts and app 529, desktop 971 (1 skipped), browser 5341. Two browser suites failed once with a 5s hook timeout while a build ran at the same time and passed when run alone (265 tests). ESLint on the 60 changed ts and html files and Prettier on all changed files: clean.
- Screenshots of vault, My folders, Reports, Send, Trash, Archive, Generator, Settings and the palette, at 1440px in light and dark, and at 375px for the main pages. No horizontal overflow and no console error on any of them. Measured at 1440px: 14px body, 24px titles, no text under 11px.
- Not run: the `ui-ux` probe and axe against the real page. The vault locks on reload, so the probe cannot reach an unlocked page; overflow, text size and target size were measured with a script in the unlocked session instead. Contrast was calculated by hand for a few pairs only.

**Known gaps**

- Checkboxes (21x21px) and the name buttons in table rows (21px high) are under 24px at the compact root. They rely on the WCAG 2.5.8 spacing exception (rows are 44px apart), which was reasoned from sizes and not checked with a tool.
- The dark theme frame is darker than the panel on purpose. Design has not seen it.
- Pages that were not opened: organizations, collections, attachments, the admin console, and anything behind a plan.
- The fork's `VFO1Foundation` flag is forced on in `feature-flag.enum.ts`, so this look cannot be turned off from the server.
