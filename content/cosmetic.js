// Runs in isolated world. Removes ad elements, overlays, click-traps, and notifies background service worker.
(() => {
  const lists = self.__ADDFREE_DOMAINS__;
  if (!lists) return;
  const pageHost = (location.hostname || '').toLowerCase();
  if (pageHost.includes('challenges.cloudflare.com') || pageHost.includes('turnstile') || pageHost.includes('hcaptcha.com') || pageHost.includes('recaptcha')) {
    return;
  }

  const root = document.documentElement;
  const adDomains = [...lists.popup, ...lists.display];

  const isAdHost = (host) => {
    host = (host || '').toLowerCase();
    return adDomains.some((d) => host === d || host.endsWith('.' + d));
  };
  const hostOf = (url) => {
    try { return new URL(url, location.href).hostname; } catch (e) { return ''; }
  };

  let pending = 0;
  let flushTimer = null;
  const count = (n = 1) => {
    pending += n;
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const n = pending;
      pending = 0;
      try { chrome.runtime.sendMessage({ type: 'blocked', count: n }); } catch (e) {}
    }, 500);
  };

  // Handle blocked event forwarded from MAIN world (antipopup.js)
  window.addEventListener('message', (e) => {
    if (e.source === window && e.data && e.data.__addfree === 'blocked') count();
  });

  const removeEl = (el) => {
    if (!el || el.__addfreeRemoved) return;
    el.__addfreeRemoved = true;
    el.remove();
    count();
  };

  const RICH = 'video, input, textarea, select, button, form, canvas, [contenteditable]';

  // Movie site trick: full-page transparent overlay over player triggering popup on first click
  const isClickTrapOverlay = (el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const z = parseInt(cs.zIndex, 10);
    if (!(z >= 100)) return false;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (r.width < vw * 0.6 || r.height < vh * 0.6) return false;
    if (el.querySelector(RICH) || el.matches(RICH)) return false;
    // Do not touch non-ad iframes (such as embedded video players)
    for (const f of el.querySelectorAll('iframe')) {
      if (!isAdHost(hostOf(f.src))) return false;
    }
    const text = (el.innerText || '').trim();
    if (text.length > 40) return false;

    const transparentBg = (/rgba\(.*,\s*0\)$|transparent/.test(cs.backgroundColor) || !cs.backgroundColor) &&
      (!cs.backgroundImage || cs.backgroundImage === 'none' || /data:image\/gif;base64,R0lGODlhAQAB/i.test(cs.backgroundImage));
    const transparent = parseFloat(cs.opacity) < 0.1 || (transparentBg && !el.querySelector('img, svg'));
    const links = [el.matches('a[href]') ? el : null, ...el.querySelectorAll('a[href]')].filter(Boolean);
    const externalLink = links.some((a) => {
      const h = hostOf(a.href);
      return isAdHost(h) || (h && h !== location.hostname);
    });
    return transparent || externalLink;
  };

  // Fixed/sticky bottom banner containing exclusively ads
  const isStickyAd = (el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
    if (el.querySelector(RICH)) return false;
    return !!el.querySelector('iframe') &&
      [...el.querySelectorAll('iframe')].every((f) => isAdHost(hostOf(f.src)) || !f.src || f.src === 'about:blank') &&
      (el.innerText || '').trim().length < 40;
  };

  // Anti-adblock wall: "Download Links Disabled / Please disable AdBlock" cards.
  // Remove the warning card and unhide original obscured download links.
  const WALL_RE = /\b(ad[\s-]?block(?:er|ing)?)\b|download links? (?:are |may )?(?:not )?(?:disabled|work)|disabl(?:e|ing) (?:your )?ad[\s-]?block|turn off ad[\s-]?block/i;
  const WALL_MAX_TEXT = 2500;

  const unhideInline = (el) => {
    if (!el || !(el instanceof HTMLElement)) return;
    const s = el.style;
    if (s.display === 'none') s.display = '';
    if (s.visibility === 'hidden') s.visibility = '';
    if (s.opacity === '0') s.opacity = '';
    el.removeAttribute('hidden');
    if (el.classList) {
      ['hidden', 'd-none', 'is-hidden', 'invisible'].forEach((c) => el.classList.remove(c));
    }
  };

  const PROTECTED_WALL = 'main, article, nav, header, footer, [contenteditable]';

  const unhideAround = (el) => {
    // Unhide siblings and containers around warning card to reveal true download buttons
    let scope = el.parentElement;
    for (let i = 0; i < 3 && scope && scope.parentElement && scope !== document.body; i++) {
      scope = scope.parentElement;
    }
    scope = scope || document.body;
    const sel = '[style*="display:none"],[style*="display: none"],[style*="visibility:hidden"],[style*="visibility: hidden"],[hidden],.hidden,.d-none,.is-hidden,.invisible';
    for (const h of scope.querySelectorAll(sel)) {
      if (h === el || el.contains(h) || h.contains(el)) continue;
      unhideInline(h);
    }
    // Unhide links hidden via CSS sibling combinators (~ or +)
    let sib = el.nextElementSibling;
    while (sib) {
      if (sib.matches && (sib.matches('[class*="download"], [class*="link"], [id*="download"]') || getComputedStyle(sib).display === 'none')) {
        sib.style.setProperty('display', 'block', 'important');
      }
      sib = sib.nextElementSibling;
    }
    // Ensure download/links containers within scope are displayed
    for (const d of scope.querySelectorAll('[class*="download-links"], [class*="downloads-btns"]')) {
      d.style.setProperty('display', 'block', 'important');
    }
  };

  const scanAdblockWalls = () => {
    if (!document.body) return;
    // Fast prefilter: verify if body contains anti-adblock warning keywords
    const bodyText = document.body.innerText || '';
    if (!WALL_RE.test(bodyText)) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (el) => {
        if (el.__addfreeRemoved) return NodeFilter.FILTER_REJECT;
        if (el.matches(PROTECTED_WALL) || el.matches('video, audio, canvas')) return NodeFilter.FILTER_SKIP;
        if (el.matches('input, textarea, select')) return NodeFilter.FILTER_SKIP;
        const t = el.innerText || '';
        if (!t || t.length > WALL_MAX_TEXT) return NodeFilter.FILTER_SKIP;
        return WALL_RE.test(t) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const hits = [];
    let n;
    while ((n = walker.nextNode())) hits.push(n);
    // Target innermost warning cards, excluding high-level ancestor containers
    const inner = hits.filter((h) => !hits.some((o) => o !== h && h.contains(o)));
    for (const el of inner) {
      // Traverse upwards while parent container remains dominated by warning text
      let target = el;
      for (let i = 0; i < 8 && target.parentElement; i++) {
        const p = target.parentElement;
        if (p === document.body || p === root || p.matches(PROTECTED_WALL) || p.querySelector('video, audio, canvas')) break;
        const pt = (p.innerText || '');
        if (pt.length > WALL_MAX_TEXT) break;
        // Stop ascending once parent container is no longer warning-dominated
        if (!WALL_RE.test(pt)) break;
        target = p;
      }
      target.classList.add('hide-popup');
      unhideAround(target);
      removeEl(target);
    }
  };

  const scanNode = (node) => {
    if (!(node instanceof Element)) return;

    for (const f of [node, ...node.querySelectorAll('iframe, script[src], img, a[href]')]) {
      if (f.tagName === 'IFRAME' && isAdHost(hostOf(f.src))) removeEl(f);
      else if (f.tagName === 'SCRIPT' && isAdHost(hostOf(f.src))) f.remove();
      else if (f.tagName === 'IMG' && isAdHost(hostOf(f.src))) removeEl(f.closest('a') || f);
      else if (f.tagName === 'A' && isAdHost(hostOf(f.href))) removeEl(f);
    }
  };

  // Sample top-most viewport points to detect full-page click-traps efficiently
  const scanOverlays = () => {
    if (!document.body) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const points = [
      [0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75],
      [0.5, 0.03], [0.5, 0.97]
    ];
    const checked = new Set();
    let removed = false;
    for (const [px, py] of points) {
      for (const el of document.elementsFromPoint(vw * px, vh * py)) {
        if (el === document.body || el === root) break;
        if (checked.has(el) || el.__addfreeRemoved) continue;
        checked.add(el);
        if (isClickTrapOverlay(el) || isStickyAd(el)) { removeEl(el); removed = true; break; }
      }
    }
    if (removed) {
      root.setAttribute('data-addfree-unlock', '');
      setTimeout(scanOverlays, 100); // Check for stacked secondary overlay layers
    }
  };

  let observer = null;
  let scanTimer = null;
  const queued = new Set();
  const scheduleScan = () => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      // Process overlays first, followed by ad elements and anti-adblock walls
      scanOverlays();
      scanAdblockWalls();
      for (const n of queued) scanNode(n);
      queued.clear();
    }, 250);
  };

  const start = () => {
    root.removeAttribute('data-addfree-off');
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) if (n.nodeType === 1) queued.add(n);
        if (m.type === 'attributes') queued.add(m.target);
      }
      scheduleScan();
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'style'] });
    const initial = () => { scanOverlays(); scanAdblockWalls(); scanNode(document.body || root); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initial, { once: true });
    else initial();
    // Handle delayed or asynchronously injected ad banners
    setTimeout(() => { scanOverlays(); scanAdblockWalls(); }, 2000);
    setTimeout(() => { scanOverlays(); scanAdblockWalls(); }, 5000);
  };

  const stop = () => {
    root.setAttribute('data-addfree-off', '');
    if (observer) observer.disconnect();
    observer = null;
  };

  // Resolve top frame hostname for consistent whitelisting inside iframes
  let siteHost = location.hostname;
  try { siteHost = window.top.location.hostname; } catch (e) {
    if (location.ancestorOrigins && location.ancestorOrigins.length) {
      siteHost = hostOf(location.ancestorOrigins[location.ancestorOrigins.length - 1]);
    }
  }
  siteHost = siteHost.replace(/^www\./, '');

  // ---------- Custom Filters (User-blocked elements via picker) ----------
  const applyCustomFilters = () => {
    chrome.storage.local.get('customFilters', (data) => {
      const filters = (data.customFilters && data.customFilters[siteHost]) || [];
      let style = document.getElementById('__addfree_custom_filters');
      if (!filters.length) {
        if (style) style.remove();
        return;
      }
      if (!style) {
        style = document.createElement('style');
        style.id = '__addfree_custom_filters';
        (document.head || root).appendChild(style);
      }
      style.textContent = filters.map((s) => `${s} { display: none !important; }`).join('\n');
    });
  };

  const applySocialSetting = (blockSocial) => {
    if (blockSocial) root.setAttribute('data-addfree-hide-social', '');
    else root.removeAttribute('data-addfree-hide-social');
  };

  // Defuse video player click-hijack: direct play() call when clicking play overlay
  document.addEventListener('click', (e) => {
    const video = e.target && e.target.closest && (e.target.closest('.player, .video-player, [class*="jwplayer"]') || e.target.tagName === 'VIDEO');
    if (video && !root.hasAttribute('data-addfree-off')) {
      const v = video.querySelector ? video.querySelector('video') : (video.tagName === 'VIDEO' ? video : null);
      if (v && v.paused) {
        v.play().catch(() => {});
      }
    }
  }, true);

  // ---------- Element Picker / Zapper Mode ----------
  let pickerActive = false;
  let hoveredEl = null;
  let hudEl = null;

  const getSelector = (el) => {
    if (!el || el === document.body || el === root) return null;
    if (el.id && !/^\d|[^\w-]/.test(el.id)) return '#' + CSS.escape(el.id);
    const tag = el.tagName.toLowerCase();
    const classes = [...el.classList].filter((c) => !/^__addfree/.test(c) && !/^(hidden|d-none|is-hidden)$/.test(c));
    if (classes.length) {
      return tag + '.' + classes.map((c) => CSS.escape(c)).slice(0, 2).join('.');
    }
    return tag;
  };

  const cleanupPicker = () => {
    if (!pickerActive) return;
    pickerActive = false;
    if (hoveredEl) {
      hoveredEl.style.outline = '';
      hoveredEl.style.cursor = '';
      hoveredEl = null;
    }
    if (hudEl) {
      hudEl.remove();
      hudEl = null;
    }
    document.removeEventListener('pointerover', onPickerOver, true);
    document.removeEventListener('click', onPickerClick, true);
    document.removeEventListener('keydown', onPickerKey, true);
  };

  const onPickerOver = (e) => {
    if (!pickerActive) return;
    const target = e.target;
    if (target === hudEl || (hudEl && hudEl.contains(target)) || target === root || target === document.body) return;
    if (hoveredEl && hoveredEl !== target) {
      hoveredEl.style.outline = '';
      hoveredEl.style.cursor = '';
    }
    hoveredEl = target;
    hoveredEl.style.outline = '3px dashed #ef4444';
    hoveredEl.style.cursor = 'crosshair';
  };

  const onPickerClick = async (e) => {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = hoveredEl;
    cleanupPicker();
    if (!target) return;

    const sel = getSelector(target);
    if (!sel) return;

    removeEl(target);
    const { customFilters = {} } = await chrome.storage.local.get('customFilters');
    customFilters[siteHost] = customFilters[siteHost] || [];
    if (!customFilters[siteHost].includes(sel)) {
      customFilters[siteHost].push(sel);
      await chrome.storage.local.set({ customFilters });
    }
    applyCustomFilters();
  };

  const onPickerKey = (e) => {
    if (e.key === 'Escape') cleanupPicker();
  };

  const startElementPicker = () => {
    if (pickerActive) return;
    pickerActive = true;
    hudEl = document.createElement('div');
    hudEl.id = '__addfree_picker_hud';
    hudEl.textContent = '🎯 Click any element or ad to block it (Esc to cancel)';
    hudEl.style.cssText = `
      position: fixed !important;
      top: 14px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      background: #1e293b !important;
      color: #fff !important;
      font: 600 13px system-ui, sans-serif !important;
      padding: 9px 18px !important;
      border-radius: 999px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
      border: 1px solid rgba(255,255,255,0.2) !important;
      pointer-events: none !important;
    `;
    (document.body || root).appendChild(hudEl);
    document.addEventListener('pointerover', onPickerOver, true);
    document.addEventListener('click', onPickerClick, true);
    document.addEventListener('keydown', onPickerKey, true);
  };

  let lastContextEl = null;
  document.addEventListener('contextmenu', (e) => {
    lastContextEl = e.target;
  }, true);

  const showToast = (text) => {
    const t = document.createElement('div');
    t.textContent = text;
    t.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      background: #0f766e !important;
      color: #fff !important;
      font: 600 13px system-ui, sans-serif !important;
      padding: 9px 18px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
      pointer-events: none !important;
    `;
    (document.body || root).appendChild(t);
    setTimeout(() => t.remove(), 2600);
  };

  // ---------- Video Ad Fast-Forwarder & Auto-Skipper (YouTube & Streaming) ----------
  let videoSkipEnabled = true;
  const skipVideoAds = () => {
    if (!videoSkipEnabled || root.hasAttribute('data-addfree-off')) return;

    // 1. YouTube specific
    const ytAdPlaying = document.querySelector('.ad-showing, .ad-interrupting, .video-ads .ytp-ad-player-overlay');
    if (ytAdPlaying) {
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        if (!v.paused) {
          try {
            v.muted = true;
            v.playbackRate = 16.0;
            if (Number.isFinite(v.duration) && v.duration > 0) {
              v.currentTime = v.duration - 0.1;
            }
          } catch (e) {}
        }
      }
      count();
    }

    // Skip buttons auto-click
    const skipBtns = document.querySelectorAll(`
      .ytp-ad-skip-button,
      .ytp-ad-skip-button-modern,
      .ytp-skip-ad-button,
      .videoAdUiSkipButton,
      button[id*="skip" i],
      .ytp-ad-overlay-close-button,
      .ytp-ad-image-overlay button
    `);
    for (const b of skipBtns) {
      if (b.offsetParent !== null) {
        try { b.click(); count(); } catch (e) {}
      }
    }

    // YouTube anti-adblock dialog auto-close
    const ytDialog = document.querySelector('tp-yt-paper-dialog:has(#feedback), ytd-enforcement-message-view-model');
    if (ytDialog) {
      ytDialog.remove();
      const v = document.querySelector('video');
      if (v && v.paused) v.play().catch(() => {});
    }

    // Generic HTML5 video players on movie/streaming sites
    const genAdVideos = document.querySelectorAll('.jw-flag-ads video, [class*="ad-container"] video, [class*="preroll"] video');
    for (const gv of genAdVideos) {
      if (!gv.paused) {
        try {
          gv.muted = true;
          gv.playbackRate = 16.0;
          if (Number.isFinite(gv.duration) && gv.duration > 0) gv.currentTime = gv.duration;
        } catch (e) {}
      }
    }
  };

  setInterval(skipVideoAds, 500);

  // ---------- Client-side URL Tracking Cleaner ----------
  const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_cid', 'utm_reader', 'utm_name', 'utm_brand', 'utm_social',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid',
    'mc_eid', '_hsenc', '_hsmi', 'mkt_tok', 'yclid',
    'wickedid', 'rb_clickid', 'twclid', 'igshid', 'si', '_openstat',
    'sc_src', 'sc_llid', 'sc_lid', 'sc_customer', 'trk_contact', 'trk_msg'
  ];

  const cleanUrl = (urlStr) => {
    try {
      const u = new URL(urlStr, location.href);
      let changed = false;
      for (const p of TRACKING_PARAMS) {
        if (u.searchParams.has(p)) {
          u.searchParams.delete(p);
          changed = true;
        }
      }
      return changed ? u.toString() : urlStr;
    } catch (e) {
      return urlStr;
    }
  };

  document.addEventListener('click', (e) => {
    if (root.hasAttribute('data-addfree-off')) return;
    const a = e.target.closest('a[href]');
    if (a && a.href && /^https?:/.test(a.href)) {
      const cleaned = cleanUrl(a.href);
      if (cleaned !== a.href) a.href = cleaned;
    }
  }, true);

  try {
    if (location.search && !root.hasAttribute('data-addfree-off')) {
      const cleaned = cleanUrl(location.href);
      if (cleaned !== location.href) {
        history.replaceState(history.state, '', cleaned);
      }
    }
  } catch (e) {}

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'startElementPicker') {
      startElementPicker();
      sendResponse({ ok: true });
    } else if (msg.type === 'contextMenuBlockElement') {
      if (lastContextEl && lastContextEl !== document.body && lastContextEl !== root) {
        const sel = getSelector(lastContextEl);
        if (sel) {
          chrome.storage.local.get('customFilters', async ({ customFilters = {} }) => {
            customFilters[siteHost] = customFilters[siteHost] || [];
            if (!customFilters[siteHost].includes(sel)) {
              customFilters[siteHost].push(sel);
              await chrome.storage.local.set({ customFilters });
            }
            applyCustomFilters();
            removeEl(lastContextEl);
            showToast(`Element blocked: ${sel}`);
          });
        }
      } else {
        startElementPicker();
      }
      sendResponse({ ok: true });
    }
  });

  const apply = ({ enabled = true, whitelist = [], blockSocialBadges = false, videoSkip = true }) => {
    const off = !enabled || whitelist.includes(siteHost);
    videoSkipEnabled = !!videoSkip;
    applySocialSetting(blockSocialBadges);
    applyCustomFilters();
    if (off) stop();
    else if (!observer) start();
  };

  chrome.storage.local.get(['enabled', 'whitelist', 'blockSocialBadges', 'videoSkip'], apply);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.customFilters) applyCustomFilters();
    if (changes.blockSocialBadges) applySocialSetting(changes.blockSocialBadges.newValue);
    if (changes.videoSkip) videoSkipEnabled = !!changes.videoSkip.newValue;
    if (changes.enabled || changes.whitelist) {
      chrome.storage.local.get(['enabled', 'whitelist', 'blockSocialBadges', 'videoSkip'], apply);
    }
  });
})();
