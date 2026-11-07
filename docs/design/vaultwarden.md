# Running this web vault on Vaultwarden

Tested 2026-11-07 against **Vaultwarden 1.37.5** (it bundles web vault `2026.10.1` and reports server version `2026.6.0`), in Docker on a laptop, with a throwaway account and fake items. This repo's `apps/web` is also `2026.10.1`, and the upstream tag `web-v2026.10.1` has every file this work builds on (`vault-next`, table v2, `VFO1Foundation`).

## Verified in a real browser against that server

Registering, logging in, adding items, listing them, the new layout, selecting an item, the URL carrying the selection, lock and unlock after a reload, the quick find (Ctrl+K and the toolbar button), search by username, and the narrow layout. 15 checks, no HTTP error from the server during the session. Screenshots and the script were kept outside the repo.

Later the same day the restyled bundle was also opened page by page (vault, My folders, Reports, Send, Trash, Archive, Generator, Settings) in light and dark, at 1440px and 375px: no console error and no horizontal overflow. That checked how the pages look, not that their features work.

Not verified: organizations, collections, attachments, sending a Send, two-step login, passkeys, import and export, emergency access, what the reports find, the browser's own handling of Ctrl+K in its address bar, and anything on the real production instance.

## What it took

1. **Build** the self-hosted bundle: `cd apps/web && npm run build:oss:selfhost:prod` (output in `apps/web/build/`). It needs a lot of memory and took 4 to 24 minutes depending on machine load; repeat builds on an idle machine took about 4 minutes. Run it from `apps/web`: from `apps/` the script is not found. Because the folder is mounted read-only into the container, a rebuild shows up on the next page load without restarting Vaultwarden.
2. **Serve it** with Vaultwarden through `WEB_VAULT_FOLDER`, mounted read-only.
3. **HTTPS is required.** The production bundle refuses any server URL that is not `https://` (`api.service.ts`, `!isDev()`), `localhost` included. For a local test, give Vaultwarden a self-signed certificate (`ROCKET_TLS`) and open `https://localhost:<port>`. Your Cloudflare tunnel already provides HTTPS.
4. **The flag cannot come from the server.** Vaultwarden 1.37.5 accepts only a fixed list in `EXPERIMENTAL_CLIENT_FEATURE_FLAGS` and rejects `vfo1-foundation` ("Unrecognized experimental client feature flags"). This fork therefore sets `FeatureFlag.VFO1Foundation` to `TRUE` in `libs/common/src/enums/feature-flag.enum.ts`. Without that change the new layout never shows on Vaultwarden.

```bash
docker run -d --name vw-ui-test -p 127.0.0.1:8082:80 \
  -e WEB_VAULT_ENABLED=true -e WEB_VAULT_FOLDER=/web-vault \
  -e DOMAIN=https://localhost:8082 -e SIGNUPS_ALLOWED=true \
  -e 'ROCKET_TLS={certs="/ssl/cert.pem",key="/ssl/key.pem"}' \
  -v "$(pwd)/apps/web/build:/web-vault:ro" -v /path/to/certs:/ssl:ro \
  -v vw-ui-test-data:/data vaultwarden/server:latest
```

Bind to `127.0.0.1`: with `-p 8082:80` the container listens on every network interface and signups are open.

## Corrections to the earlier test brief

- **Option B over plain http does not work** (point 3 above).
- **`EXPERIMENTAL_CLIENT_FEATURE_FLAGS=vfo1-foundation` is not accepted** (point 4).
- **Port 8080** may already be taken; it was here, by an unrelated process.
- **The `kubectl port-forward` option points the UI at production data.** Use the Docker instance for UI work, with fake data.
- **Option A (dev server), read from the code but not run:**
  - Use `npm run build:oss:selfhost:watch`. The plain `build:oss:watch` uses the `development` config, which sends notifications straight to port 61840 and serves HTTPS with a development certificate.
  - `proxyApi` ending in `/api` is right: webpack strips `/api` from the request and appends what is left to the target's path.
  - Add `proxyIcons` (`http://localhost:8000/icons`) or icons fail.
  - The dev server allows `http` because `isDev()` is true there.

## Things seen that are not bugs here

- Reloading the page locks the vault. After unlocking, the browser returns to the same URL, so the `selected` parameter and the open item come back.
- New accounts get Bitwarden's own onboarding dialogs ("Welcome", "Bitwarden has a new look") with links to bitwarden.com. They can cover the page in automated tests, and the "Get started with your vault" card shows for new accounts only.
- The avatar color is account data, not theme. A purple "My vault" tile in an otherwise gray UI is the account's avatar color; change it in Settings, My account, Customize.

## Before using it on the real instance

- Vaultwarden's own web vault is built from a patched copy (`bw_web_builds`); this build is not. The core flows above worked unpatched, but what the patches change was not examined.
- The fork is on upstream `main`; Vaultwarden bundles the released `2026.10.1`. Staying close to that tag keeps the client and the server's API in step. Newer clients may call endpoints Vaultwarden does not have yet.
- Back up the database first. Vaultwarden says the same.
- The bundle has `VFO1Foundation` on and cannot be turned off from the server.
