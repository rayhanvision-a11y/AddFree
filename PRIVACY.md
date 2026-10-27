# Privacy Policy for AddFree - Ad Blocker

**Effective Date:** October 27, 2026

**AddFree** ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy describes our practices regarding the information processed by the AddFree Chrome Extension.

---

### 1. Zero Data Collection & Zero Telemetry
AddFree operates under a strict **Zero-Data Collection Policy**:
- We do **NOT** collect, log, transmit, or monitor your personal information, names, email addresses, or account credentials.
- We do **NOT** collect, track, or record your browsing history, visited URLs, or search queries.
- We do **NOT** sell, rent, monetize, or trade any user data to third parties, advertisers, or data brokers.
- We do **NOT** use tracking cookies, analytics SDKs, or third-party diagnostic services.

---

### 2. Permissions & Data Handling
The extension requests only the minimum browser permissions necessary to block advertisements, popups, and trackers:

- **`declarativeNetRequest`**: Used exclusively to block network requests directed to known advertising networks, popup domains, and to strip tracking URL query parameters (e.g., `utm_*`, `fbclid`, `gclid`). Rule matching is processed natively by the Google Chrome browser engine on your local machine.
- **`storage`**: Used exclusively to save your personal preferences (such as whitelist domains, toggle states, custom element rules, and filter update timestamps) locally on your device via `chrome.storage.local`. None of this information is transmitted off your device.
- **`tabs` and `webNavigation`**: Used locally by the background service worker to identify if the current tab host matches your whitelist, and to intercept and close malicious popup/popunder tabs before they load ad domains.
- **`contextMenus`**: Used to present the "AddFree: Block this element" right-click option so you can select and remove annoying visual elements on web pages.
- **`alarms`**: Used to periodically trigger filter list updates in the background.
- **`host_permissions: ["<all_urls>"]`**: Required solely because advertisements and popups can appear on any web page. This permission allows the extension to inject cosmetic hiding styles and run anti-popup scriptlets locally across websites you visit.

---

### 3. Network Communication & Filter Updates
The extension contacts GitHub (`raw.githubusercontent.com`) exclusively for:
1. Downloading the updated plain-text ad domain list to ensure effective blocking.
2. Checking if a newer extension release is available on GitHub.

These requests are standard HTTPS GET requests that do not transmit any identifier, fingerprint, or personal information.

---

### 4. Children’s Privacy
AddFree does not knowingly collect or solicit any personal information from children under the age of 13.

---

### 5. Changes to This Policy
If we update this Privacy Policy, the revised version will be posted in this repository along with an updated effective date.

---

### 6. Contact & Support
If you have questions or feedback regarding this Privacy Policy, please reach out via GitHub Issues:
https://github.com/rayhanvision-a11y/AddFree/issues
