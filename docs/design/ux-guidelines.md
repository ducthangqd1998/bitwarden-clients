# UI/UX guidelines for vault screens

Applies to new and redesigned screens in `apps/web` and shared UI in `libs/components` / `libs/vault`. It condenses rules already in the repo and adds the interaction model proposed in [ui-direction.md](./ui-direction.md). Where this file and repo rules disagree, repo rules win:
`.claude/CLAUDE.md`, `.claude/rules/*.md`, `libs/components/CODE_STYLE.md`.

Items marked **(proposal)** are not yet agreed with Design.

## 1. Principles

1. **Reuse before build.** Look in `libs/components/src` and `libs/vault/src/components` first. New primitives only after a second consumer exists.
2. **Calm and dense.** Compact rows, restrained color, one primary action per region.
3. **Secure by default.** Sensitive values masked until the user reveals them; never in logs, errors, `aria-live` or URLs.
4. **Keyboard first, pointer friendly.** Every action reachable without a mouse.
5. **Same product everywhere.** Match sibling screens (spacing, headers, empty states) before inventing.
6. **Predictable state.** The URL reflects scope and selected item; refresh restores it.

## 2. Layout and density

- Page chrome: `bit-layout`, `app-header`, `bit-nav-*` (see `vault-next.component.html`).
- Lay out with flex/grid; components respond to their container, not the viewport.
- Use logical directions (`tw-ms-*`, `tw-ps-*`, `start`/`end`), never left/right.
- Prefer `rem` so zoom works. No unexplained `!important`.
- Breakpoints: three panes from `lg`; master-detail stack below `md` **(proposal)**.
- List row height compact (44 px in the flat style, two lines with icon), target size at least 24x24 CSS px (WCAG 2.2 target size minimum). Under the flat style the root font is 14px on pointer devices (16px on touch), so a `1.5rem` target is 21px: check small controls against the 24px minimum or the spacing exception, not by the rem value.

## 3. Color, type, theming

- Tailwind classes always carry `tw-`. No arbitrary values (`tw-[12px]`), no raw palette (`tw-bg-gray-100`).
- Prefer the **new semantic tokens** defined in `tailwind.config.base.js` (marked "New semantic" there): `tw-bg-bg-*`, `tw-text-fg-*`, `tw-border-border-*`. Legacy tokens (`tw-text-main`, `tw-bg-background-alt`) stay only for existing code.
- Check `tailwind.config.base.js` before adding a token; new tokens need theme CSS in `tw-theme.css` for every theme.
- No dark-mode-specific styles; tokens already adapt.
- The flat style is **black, white and gray**: no brand blue, and the accent families (purple, teal, coral) fold into gray. Only status colors (success, warning, danger) keep a hue. Do not hard-code a color in a component; an inline hex (as the avatar color is) cannot follow the theme.
- With no brand color to mark a link, `bitLink` stays underlined in the flat style. Do not rely on color alone to tell an interactive text from plain text.
- Type: 14px body and 24px page titles at the compact root. Keep text at 11px or more, and input text at 16px on touch.
- Sensitive text uses the `fg-sensitive` token and monospace where it aids reading (`tw-font-mono`).

## 4. Item list

- One row: icon, title, subtitle, optional badges (org, shared, attachment). Truncate with ellipsis and expose full text via accessible name.
- Selection: single select, highlighted with `bg-hover` token; selected row shows a persistent (not hover-only) indicator.
- ARIA: `listbox`/`option` or grid pattern per ARIA APG; roving tabindex; `aria-selected`. Do not use `aria-label` to repeat visible text.
- Sort and filter controls above the list; active filters visible as chips.
- Bulk actions appear only when multi-select is active (existing batch bar).
- Virtualized for large vaults (table v2). Never render all rows.

## 5. Detail pane

- Read-first. Header: icon, title, item menu. Sections per cipher type (reuse `libs/vault/src/cipher-view`).
- Field row = label, value, actions. Actions (copy, reveal, open) appear on hover **and** focus-within, and stay reachable for touch.
- Passwords masked; reveal is per-field and auto-hides after a timeout **(proposal: 30 s)**.
- TOTP shows countdown ring plus the code; announce only on user request, not every tick.
- Copy gives immediate feedback (toast or inline state change). Reuse the existing clipboard clearing behavior; do not add new clipboard logic.
- Empty detail pane (nothing selected) shows guidance, not a blank area.

## 6. Interaction and keyboard

| Action                          | Shortcut **(proposal)**       |
| ------------------------------- | ----------------------------- |
| Quick find                      | `Cmd/Ctrl+K`                  |
| Move in list                    | `Up` / `Down`, `Home` / `End` |
| Open edit                       | `Enter`                       |
| Copy password                   | `Cmd/Ctrl+Shift+C`            |
| Copy username                   | `Cmd/Ctrl+Shift+U`            |
| Close overlay / clear selection | `Esc`                         |

- Shortcuts must not collide with browser or screen-reader defaults; verify on macOS and Windows before approval.
- Show shortcuts in menus and tooltips; document in `bit-kbd`.
- Overlays: move focus in on open, trap where the pattern requires, restore on close (CDK focus utilities).
- Use `focus-visible:` for focus styles.

## 7. States

Every list and pane defines these, each with a Storybook story:

| State                           | Treatment                                            |
| ------------------------------- | ---------------------------------------------------- |
| Loading                         | skeleton (`bit-skeleton`), no layout jump            |
| Empty (vault / filter / folder) | `bit-status-lockup` with a next action               |
| Error                           | inline message with retry; no vault data in the text |
| Decryption failure              | existing decryption-failure dialog                   |
| Disabled / read-only            | explain why (permissions, policy)                    |
| Offline / stale                 | non-blocking banner **(proposal)**                   |

## 8. Motion

Short (under 200 ms), purposeful (selection, pane open). Respect `prefers-reduced-motion`; no motion is required to understand state.

## 9. Accessibility (WCAG 2.2 AA)

- Native elements first; ARIA only to fill gaps. Check ARIA APG for each pattern.
- Contrast: text 4.5:1, UI components 3:1, in every theme.
- Accessible names for icon-only buttons through `bit-icon-button` `label`.
- Do not rely on color alone for state (selected, error, shared).
- Announce async results (copy, save) with `LiveAnnouncer`, never secrets.
- Test with keyboard only and one screen reader before review.

## 10. i18n

All user-visible strings (labels, ARIA, toasts, validation) via `I18nPipe` / `I18nService.t()`. Add keys to `en` only, in every consuming app's `messages.json`. Allow 40% text expansion; test RTL.

## 11. Component API and Storybook (libs/components)

- Small API, slots for varied content, data inputs for fixed content; no proxy-CSS inputs.
- Standalone, OnPush, `input()`/`output()`, `host: {}`, `readonly` fields.
- Stories for each visual state and variant; play functions for hover, focus, open.
- Standalone PR, Design sign-off, Figma reference, breaking changes called out.

## 12. Review checklist

- [ ] Reused an existing component, or justified a new one
- [ ] All classes `tw-` prefixed, semantic tokens, no arbitrary values
- [ ] Works in light, dark and every theme without extra styles
- [ ] Logical properties, `rem`, container-based layout
- [ ] Keyboard path for every action; focus managed
- [ ] Loading, empty, error states with stories
- [ ] No secrets in DOM text when masked, logs, aria-live or errors
- [ ] Strings localized; `en` keys added in each consuming app
- [ ] `npm run lint:fix`, `npm run prettier`, `npm run test:types`, scoped `npm test` pass
- [ ] Behind the feature flag with a rollback path

## 13. Skills for UI work

See [../ai/skills-inventory.md](../ai/skills-inventory.md). Short version: `figma-to-angular` to build from a design, `writing-client-code` for conventions, `web-design-guidelines` for a static a11y audit, `web-perf` for Lighthouse, `run` plus the `chrome-devtools-*` MCP servers in `.mcp.json` to verify in the real app.
