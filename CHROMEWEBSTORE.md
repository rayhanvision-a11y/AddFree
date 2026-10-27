# Chrome Web Store Listing — AddFree - Ad Blocker

> Last Updated: 2026-10-27

## Store Listing

**Extension Name** [REQUIRED]
AddFree - Ad Blocker

**Short Description** [REQUIRED]
<!-- Max 132 characters -->
Blocks annoying ads, popups, redirects, cookie banners, and trackers across all websites for a clean browsing experience.

**Detailed Description** [REQUIRED]
<!-- Max 16,000 characters -->
AddFree is a fast, lightweight, and modern Manifest V3 ad and tracker blocker designed to provide an interruption-free web experience without slowing down your browser.

Key Features:
- Powerful Ad & Popup Blocking: Neutralizes pre-roll/mid-roll video ads, invasive popups, popunders, and deceptive click-trap overlays.
- Clean URLs & Tracking Protection: Automatically strips UTM parameters and tracking tags (fbclid, gclid, etc.) from links to protect your privacy.
- Cookie Consent Banner Dismissal: Automatically dismisses annoying GDPR/Cookie banners and restores full page scrolling.
- Video Ad Fast-Forward & Auto-Skip: Smoothly fast-forwards and skips streaming video ads while muted.
- Anti-Adblock Defuser: Seamlessly bypasses "Disable AdBlock" detection walls on download and streaming sites.
- Custom Element Blocker: Right-click any annoying banner or element and select "AddFree: Block this element" to hide it permanently.
- Per-Site Whitelist: Easily toggle AddFree on or off for trusted websites with a single click in the popup menu.
- Privacy-Focused & Lightweight: Operates locally using Chrome's native Declarative Net Request engine with zero background tracking.

How to Use:
1. Install AddFree from the Chrome Web Store.
2. Pin the AddFree shield icon to your browser toolbar for quick access.
3. Browse normally! AddFree works automatically in the background.
4. Click the AddFree icon to view blocked ad counts, customize features, or whitelist the current website.

Privacy & Security:
AddFree respects your privacy. No personal data, browsing history, or search queries are ever collected, logged, or sent to external servers. All filter operations and settings are kept strictly on your local device.

Support & Feedback:
If you encounter any issues, broken websites, or have suggestions, please open an issue on our GitHub repository:
https://github.com/rayhanvision-a11y/AddFree/issues

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Blocks advertisements, invasive popups, trackers, and cookie banners to provide a clean and secure browsing experience.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | 🟡 Needs creation | store-assets/screenshot-1-popup.png |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | 🟡 Needs creation | store-assets/screenshot-2-element-picker.png |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | 🟡 Needs creation | store-assets/screenshot-3-rules-manager.png |
| Small Promo Tile [RECOMMENDED] | 440×280 PNG | 🟡 Needs creation | store-assets/promo-small.png |
| Marquee Promo Tile | 1400×560 PNG | ⬜ Optional | store-assets/promo-marquee.png |

### Screenshot Notes
- **Screenshot 1**: AddFree popup active on a popular webpage showing blocked counts and feature toggle switches.
- **Screenshot 2**: The Element Picker / "Block this element" HUD in action, demonstrating removing a banner.
- **Screenshot 3**: The Custom Rules Manager tab inside the popup showing user rules and backup/restore controls.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `declarativeNetRequest` | permissions | Required to block network requests to known ad networks, popup domains, and strip tracking query parameters using native Chrome blocking rules. |
| `storage` | permissions | Required to store user preferences (enable/disable state, whitelist list, custom user element rules, and filter update timestamp) locally on the device. |
| `tabs` | permissions | Required to read current tab URL when user opens popup or context menu to determine whitelist status, and to close popup/redirect tabs that open ad domains. |
| `webNavigation` | permissions | Required to detect navigation events, intercept popup/popunder windows created by click traps, and close them before they load ad content. |
| `alarms` | permissions | Required to schedule periodic updates of ad blocking rule lists in the background without keeping a persistent service worker running. |
| `contextMenus` | permissions | Required to provide the 'AddFree: Block this element' option when right-clicking annoying web elements. |
| `<all_urls>` | host_permissions | Required to apply ad blocking rules, cosmetic element hiding, and anti-popup protection across all websites the user visits. |

> **Note on declarativeNetRequestFeedback**: This permission has been removed for the production Chrome Web Store build, as it is only valid for unpacked development.

---

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

AddFree does NOT collect, store, transmit, or sell any personal data, user activity, browsing history, or website content.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
https://rayhanvision-a11y.github.io/AddFree/privacy.html
(or https://github.com/rayhanvision-a11y/AddFree/blob/main/PRIVACY.md)

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

---

## Developer Info

**Publisher Name** [REQUIRED]
Rayhan Vision

**Contact Email** [REQUIRED]
(Your registered developer email)

**Support URL** [RECOMMENDED]
https://github.com/rayhanvision-a11y/AddFree/issues

**Homepage URL** [RECOMMENDED]
https://github.com/rayhanvision-a11y/AddFree

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-10-27 | Initial release for Chrome Web Store. DeclarativeNetRequest ad blocking, anti-popup engine, element picker, and tracking URL stripper. | Ready for packaging |

---

## Review Notes

### Important Explanations for Reviewer:
1. **Host Permissions (`<all_urls>`)**: As a general-purpose ad, popup, and tracker blocker, AddFree must be capable of inspecting network requests and injecting cosmetic cleanup styles on arbitrary web pages browsed by the user.
2. **Dynamic Rule Updates**: AddFree downloads a plain-text domain blocklist from GitHub to update DNR rules dynamically. No remotely hosted executable JavaScript is loaded or executed at runtime. All executable code is bundled within the extension package in strict compliance with Chrome Web Store policies.
3. **Debug Permissions**: `declarativeNetRequestFeedback` is excluded from production manifest.
