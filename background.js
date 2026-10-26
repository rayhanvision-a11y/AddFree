// Service worker: blocked count/badge, closing popup tabs, whitelisting, and rules management.
importScripts('content/domains.js');

const lists = self.__ADDFREE_DOMAINS__;
const adDomains = [...lists.popup, ...lists.display];
const RULESET_ID = 'ad_domains';
const RULESET_TRACKING = 'tracking_params';

let allAdDomains = [...adDomains];

async function refreshAdDomains() {
  const { remoteDomains = [] } = await chrome.storage.local.get('remoteDomains');
  allAdDomains = [...new Set([...adDomains, ...remoteDomains])];
}
refreshAdDomains();

const isAdHost = (host) => {
  host = (host || '').toLowerCase();
  return allAdDomains.some((d) => host === d || host.endsWith('.' + d));
};
const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
};
const isWebUrl = (url) => /^https?:/.test(url || '');

async function getSettings() {
  const {
    enabled = true,
    whitelist = [],
    blockSocialBadges = false,
    videoSkip = true,
    blockCookies = true,
    cleanUrls = true
  } = await chrome.storage.local.get([
    'enabled',
    'whitelist',
    'blockSocialBadges',
    'videoSkip',
    'blockCookies',
    'cleanUrls'
  ]);
  return { enabled, whitelist, blockSocialBadges, videoSkip, blockCookies, cleanUrls };
}

// ---------- Whitelist & global on/off ----------

const DYNAMIC_BLOCK_RULE_ID = 50000;

async function syncRules() {
  const {
    enabled = true,
    whitelist = [],
    remoteDomains = [],
    cleanUrls = true
  } = await chrome.storage.local.get(['enabled', 'whitelist', 'remoteDomains', 'cleanUrls']);

  const enableRulesetIds = [];
  const disableRulesetIds = [];

  if (enabled) {
    enableRulesetIds.push(RULESET_ID);
    if (cleanUrls !== false) enableRulesetIds.push(RULESET_TRACKING);
    else disableRulesetIds.push(RULESET_TRACKING);
  } else {
    disableRulesetIds.push(RULESET_ID, RULESET_TRACKING);
  }

  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds, disableRulesetIds });
  } catch (e) {}

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = whitelist.map((host, i) => ({
    id: i + 1,
    priority: 100,
    action: { type: 'allowAllRequests' },
    condition: { requestDomains: [host], resourceTypes: ['main_frame'] }
  }));

  if (enabled && remoteDomains.length > 0) {
    addRules.push({
      id: DYNAMIC_BLOCK_RULE_ID,
      priority: 1,
      action: { type: 'block' },
      condition: {
        requestDomains: remoteDomains,
        resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'xmlhttprequest', 'media', 'font', 'ping', 'websocket', 'other']
      }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// ---------- Remote Filter & Updates Sync (GitHub) ----------
const GITHUB_REPO_RAW = 'https://raw.githubusercontent.com/rayhanvision-a11y/AddFree/main';
const REMOTE_FILTER_URL = `${GITHUB_REPO_RAW}/tools/domains.txt`;
const REMOTE_MANIFEST_URL = `${GITHUB_REPO_RAW}/manifest.json`;

async function syncRemoteFilterList() {
  try {
    const res = await fetch(REMOTE_FILTER_URL, { cache: 'no-cache' });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const text = await res.text();
    const domains = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, '').trim().toLowerCase();
      if (line && /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(line)) {
        if (!domains.includes(line)) domains.push(line);
      }
    }
    const lastUpdate = Date.now();
    await chrome.storage.local.set({ remoteDomains: domains, lastFilterUpdate: lastUpdate });
    await refreshAdDomains();
    await syncRules();

    // Also check for newer extension version released on GitHub
    let updateAvailable = null;
    try {
      const vRes = await fetch(REMOTE_MANIFEST_URL, { cache: 'no-cache' });
      if (vRes.ok) {
        const remoteManifest = await vRes.json();
        const currentVersion = chrome.runtime.getManifest().version;
        if (remoteManifest && remoteManifest.version && remoteManifest.version !== currentVersion) {
          updateAvailable = remoteManifest.version;
          await chrome.storage.local.set({ updateAvailable });
        } else {
          await chrome.storage.local.remove('updateAvailable');
        }
      }
    } catch (ve) {}

    return { success: true, count: domains.length, lastUpdate, updateAvailable };
  } catch (err) {
    return { success: false, error: err.message || 'Offline' };
  }
}

function setupContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'addfree_block_element',
        title: 'AddFree: Block this element',
        contexts: ['all']
      });
    });
  } catch (e) {}
}

try {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'addfree_block_element' && tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'contextMenuBlockElement' }).catch(() => {});
    }
  });
} catch (e) {}

try {
  // Check and sync from GitHub every 6 hours
  chrome.alarms.create('check_remote_filter_update', { periodInMinutes: 360 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'check_remote_filter_update') syncRemoteFilterList();
  });
} catch (e) {}

chrome.runtime.onInstalled.addListener(async (details) => {
  const s = await getSettings();
  await chrome.storage.local.set(s);
  await refreshAdDomains();
  await syncRules();
  setupContextMenu();
  // Auto-fetch latest rules from GitHub right after installation or update
  syncRemoteFilterList();
});
chrome.runtime.onStartup.addListener(async () => {
  await refreshAdDomains();
  await syncRules();
  setupContextMenu();
  // Background check on browser start
  syncRemoteFilterList();
});

// Primary tab origin hostname for whitelist check
const tabHosts = {};
async function isProtected(tabId) {
  const { enabled, whitelist } = await getSettings();
  if (!enabled) return false;
  let host = tabHosts[tabId];
  if (host === undefined) {
    try { host = hostOf((await chrome.tabs.get(tabId)).url); } catch (e) { return false; }
  }
  return !whitelist.includes(host);
}

// ---------- Blocked count and badge ----------

async function addBlocked(tabId, n = 1) {
  if (tabId == null || tabId < 0) return;
  const key = 'count_' + tabId;
  const data = await chrome.storage.session.get([key, 'total']);
  const count = (data[key] || 0) + n;
  await chrome.storage.session.set({ [key]: count, total: (data.total || 0) + n });
  chrome.action.setBadgeBackgroundColor({ color: '#d93025', tabId }).catch(() => {});
  chrome.action.setBadgeText({ text: count > 999 ? '999+' : String(count), tabId }).catch(() => {});
}

async function resetCount(tabId) {
  await chrome.storage.session.remove('count_' + tabId);
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
}

// Network-level blocked requests (debug listener for development)
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    if (info.rule.rulesetId === RULESET_ID) addBlocked(info.request.tabId);
  });
}

chrome.webNavigation.onCommitted.addListener((d) => {
  if (d.frameId !== 0) return;
  tabHosts[d.tabId] = hostOf(d.url);
  // Reset badge count on new page navigation
  if (d.transitionType !== 'auto_subframe') resetCount(d.tabId);
});

// ---------- Popup / popunder tab prevention ----------

// Track recently opened tabs: { opener, at }
const fresh = new Map();

chrome.webNavigation.onCreatedNavigationTarget.addListener(async (d) => {
  fresh.set(d.tabId, { opener: d.sourceTabId, at: Date.now() });
  if (isAdHost(hostOf(d.url)) && (await isProtected(d.sourceTabId))) closeAdTab(d.tabId, d.sourceTabId);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId == null) return;
  fresh.set(tab.id, { opener: tab.openerTabId, at: Date.now() });
});

// Close ad tabs or navigate back if redirected to an ad domain
chrome.webNavigation.onBeforeNavigate.addListener(async (d) => {
  if (d.frameId !== 0) return;
  const f = fresh.get(d.tabId);
  if (f && Date.now() - f.at <= 10000) {
    if (isAdHost(hostOf(d.url)) && (await isProtected(f.opener))) closeAdTab(d.tabId, f.opener);
    return;
  }
  // Prevent existing tab from redirecting to ad domain by navigating back
  if (isAdHost(hostOf(d.url)) && (await isProtected(d.tabId))) {
    try {
      await chrome.tabs.goBack(d.tabId);
      addBlocked(d.tabId);
    } catch (e) {}
  }
});

// On blocked main_frame error: close if new tab, navigate back if existing
chrome.webNavigation.onErrorOccurred.addListener(async (d) => {
  if (d.frameId !== 0 || d.error !== 'net::ERR_BLOCKED_BY_CLIENT') return;
  if (!isAdHost(hostOf(d.url))) return;
  const f = fresh.get(d.tabId);
  if (f && Date.now() - f.at < 10000) return closeAdTab(d.tabId, f.opener);
  try {
    await chrome.tabs.goBack(d.tabId);
    addBlocked(d.tabId);
  } catch (e) {}
});

async function closeAdTab(tabId, openerId) {
  fresh.delete(tabId);
  try {
    await chrome.tabs.remove(tabId);
    if (openerId != null) await chrome.tabs.update(openerId, { active: true });
  } catch (e) {}
  addBlocked(openerId);
}

chrome.tabs.onRemoved.addListener((tabId) => {
  fresh.delete(tabId);
  delete tabHosts[tabId];
  chrome.storage.session.remove('count_' + tabId);
});

// ---------- Content script and popup messaging ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'blocked') {
    addBlocked(sender.tab && sender.tab.id, msg.count || 1);
    return;
  }
  if (msg.type === 'getState') {
    (async () => {
      try {
        let tab = null;
        if (msg.tabId != null && typeof msg.tabId === 'number' && msg.tabId >= 0) {
          try { tab = await chrome.tabs.get(msg.tabId); } catch (e) {}
        }
        const host = tab ? hostOf(tab.url) : '';
        const s = await getSettings();
        const { lastFilterUpdate = 0, remoteDomains = [], updateAvailable = null } = await chrome.storage.local.get(['lastFilterUpdate', 'remoteDomains', 'updateAvailable']);
        let count = 0;
        let total = 0;
        if (msg.tabId != null) {
          const data = await chrome.storage.session.get(['count_' + msg.tabId, 'total']);
          count = data['count_' + msg.tabId] || 0;
          total = data.total || 0;
        }
        sendResponse({
          host,
          supported: tab ? isWebUrl(tab.url) : false,
          enabled: s.enabled,
          whitelisted: s.whitelist.includes(host),
          count,
          total,
          blockSocialBadges: s.blockSocialBadges,
          videoSkip: s.videoSkip,
          blockCookies: s.blockCookies,
          cleanUrls: s.cleanUrls,
          lastFilterUpdate,
          updateAvailable,
          version: chrome.runtime.getManifest().version,
          totalRules: adDomains.length + remoteDomains.length
        });
      } catch (err) {
        sendResponse({
          host: '',
          supported: false,
          enabled: true,
          whitelisted: false,
          count: 0,
          total: 0,
          totalRules: adDomains.length
        });
      }
    })();
    return true;
  }
  if (msg.type === 'setEnabled' || msg.type === 'setWhitelisted') {
    (async () => {
      try {
        const s = await getSettings();
        if (msg.type === 'setEnabled') s.enabled = msg.value;
        else {
          s.whitelist = s.whitelist.filter((h) => h !== msg.host);
          if (msg.value) s.whitelist.push(msg.host);
        }
        await chrome.storage.local.set(s);
        await syncRules();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (msg.type === 'setSetting') {
    (async () => {
      try {
        await chrome.storage.local.set({ [msg.key]: msg.value });
        if (msg.key === 'cleanUrls' || msg.key === 'enabled') {
          await syncRules();
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (msg.type === 'setBlockSocialBadges') {
    (async () => {
      try {
        await chrome.storage.local.set({ blockSocialBadges: msg.value });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (msg.type === 'updateFilters') {
    (async () => {
      try {
        const res = await syncRemoteFilterList();
        sendResponse(res);
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
  if (msg.type === 'getDashboardData') {
    (async () => {
      try {
        const { customFilters = {}, whitelist = [] } = await chrome.storage.local.get(['customFilters', 'whitelist']);
        sendResponse({ customFilters: customFilters || {}, whitelist: whitelist || [] });
      } catch (e) {
        sendResponse({ customFilters: {}, whitelist: [] });
      }
    })();
    return true;
  }
  if (msg.type === 'removeCustomFilter') {
    (async () => {
      try {
        const { customFilters = {} } = await chrome.storage.local.get('customFilters');
        if (customFilters[msg.host]) {
          customFilters[msg.host] = customFilters[msg.host].filter((s) => s !== msg.selector);
          if (customFilters[msg.host].length === 0) delete customFilters[msg.host];
          await chrome.storage.local.set({ customFilters });
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (msg.type === 'removeWhitelist') {
    (async () => {
      try {
        const { whitelist = [] } = await chrome.storage.local.get('whitelist');
        const updated = whitelist.filter((h) => h !== msg.host);
        await chrome.storage.local.set({ whitelist: updated });
        await syncRules();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (msg.type === 'importSettings') {
    (async () => {
      try {
        if (msg.data && typeof msg.data === 'object') {
          await chrome.storage.local.set(msg.data);
          await refreshAdDomains();
          await syncRules();
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'Invalid data' });
        }
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});
