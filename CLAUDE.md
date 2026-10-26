# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AddFree is a Manifest V3 Chrome extension that blocks ads, popups/popunders, click-trap overlays and ad redirects. No bundler — load the folder directly via `chrome://extensions` → Load unpacked. User-facing docs (README.md, popup, source comments) are in Bengali; keep that convention when editing user-visible strings.

## Commands

- Rebuild the domain lists after editing `tools/domains.txt`:
  ```
  node tools/build.js
  ```
  This regenerates both `rules/ad_domains.json` (static declarativeNetRequest ruleset) and `content/domains.js` (shared domain list consumed by content scripts and the service worker). Both files are generated — never edit by hand.
- After rebuilding, hit the reload button on the extension in `chrome://extensions`.
- Manual test page: `http://localhost/AddFree/test/` (via Laragon). The page documents what should and should not appear when the extension is active.

## Architecture

Blocking happens in four cooperating layers; each file maps to one layer:

1. **Network layer** — `rules/ad_domains.json` (generated). Two static DNR rules: `popup` domains are blocked on `main_frame` + subresources (so opening a tab to that domain fails too), `display` domains are blocked only as subresources. Section headers `[popup]` / `[display]` in `tools/domains.txt` drive this split.
2. **Popup layer** — `content/antipopup.js` injected at `document_start` into the MAIN world (needed to patch `window.open` and intercept programmatic clicks before page scripts run).
3. **Cosmetic layer** — `content/cosmetic.js` + `content/cosmetic.css` injected into the isolated world; removes overlays, sticky banners and ad DOM nodes.
4. **Service worker** — `background.js`. Imports the generated `content/domains.js` via `importScripts`. Responsibilities:
   - Toggle the static ruleset and rewrite dynamic `allowAllRequests` rules whenever `enabled`/`whitelist` change (`syncRules`).
   - Close popup/popunder tabs: tracks freshly-opened tabs in a `fresh` Map (10s TTL) via `onCreatedNavigationTarget` + `onCreated`; if the tab navigates to an ad host or gets `ERR_BLOCKED_BY_CLIENT` on main_frame it is closed and focus returned to the opener. If an *existing* tab is redirected into an ad domain, it is sent back via `tabs.goBack` instead of being closed.
   - Per-tab blocked-count badge via `chrome.storage.session`; counts arrive from `declarativeNetRequest.onRuleMatchedDebug` (unpacked only) and from content-script `{type:'blocked'}` messages.
   - `getState` / `setEnabled` / `setWhitelisted` messages back the popup UI.

### Whitelist semantics

Whitelist entries become dynamic `allowAllRequests` rules at priority 100, scoped to `main_frame` of that host — this disables network blocking for that site. The service worker *also* checks `whitelist.includes(host)` in `isProtected()` before closing popup tabs, so a whitelisted site keeps both network blocking *and* popup-tab-closing off.

### Adding or changing ad domains

Only edit `tools/domains.txt`. The build script enforces:
- Each domain must sit under a `[popup]` or `[display]` section header.
- Domain regex: `^[a-z0-9.-]+\.[a-z0-9-]+$` (lowercased). Invalid entries throw.
- Duplicates within a section are deduped.

`isAdHost()` in `background.js` matches on exact host or `.<domain>` suffix — add the registrable domain, not individual subdomains.
