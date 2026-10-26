// Runs in MAIN world (before page scripts). Defuses popups, popunders, and click-hijacking.
(() => {
  const lists = self.__ADDFREE_DOMAINS__;
  try { delete self.__ADDFREE_DOMAINS__; } catch (e) {}
  if (!lists) return;

  const pageHost = (location.hostname || '').toLowerCase();
  if (pageHost.includes('challenges.cloudflare.com') || pageHost.includes('turnstile') || pageHost.includes('hcaptcha.com') || pageHost.includes('recaptcha')) {
    return;
  }

  const root = document.documentElement;
  // cosmetic.js (isolated world) sets this attribute when extension is disabled or whitelisted
  const isDisabled = () => root && root.hasAttribute('data-addfree-off');

  const adDomains = [...lists.popup, ...lists.display];
  const isAdHost = (host) => {
    host = (host || '').toLowerCase();
    return adDomains.some((d) => host === d || host.endsWith('.' + d));
  };
  const parse = (url) => {
    try { return new URL(url, location.href); } catch (e) { return null; }
  };
  const report = (kind) => {
    window.postMessage({ __addfree: 'blocked', kind }, '*');
  };

  // Movie sites (e.g., movies4u) detect Brave browser to disable download links.
  // Spoof navigator.brave.isBrave() to return false, mimicking standard Chrome.
  try {
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      navigator.brave.isBrave = () => Promise.resolve(false);
    }
  } catch (e) {}

  // Block spam push notification permission prompts
  if (typeof window.Notification === 'function') {
    try {
      window.Notification.requestPermission = () => Promise.resolve('denied');
    } catch (e) {}
  }

  // WebRTC Local / Private IP Leak Protection (Anti-Fingerprinting)
  try {
    const origRTCPC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (origRTCPC && origRTCPC.prototype) {
      const origCreateOffer = origRTCPC.prototype.createOffer;
      if (typeof origCreateOffer === 'function') {
        origRTCPC.prototype.createOffer = function (options) {
          return origCreateOffer.call(this, options).then((offer) => {
            if (offer && offer.sdp) {
              offer.sdp = offer.sdp.replace(/candidate:.+?\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){7})\b[^\r\n]*/gi, '');
            }
            return offer;
          });
        };
      }
    }
  } catch (e) {}

  // In-Browser Crypto Mining Blocker (Web Workers)
  try {
    const origWorker = window.Worker;
    if (typeof origWorker === 'function') {
      window.Worker = function (scriptURL, options) {
        const urlStr = String(scriptURL || '').toLowerCase();
        if (/(?:coinhive|cryptoloot|webminer|monerominer|jsecoin|crypto-loot|deepminer|authedmine|minexmr)/i.test(urlStr)) {
          report('miner-worker');
          throw new Error('Blocked cryptomining worker by AddFree');
        }
        return new origWorker(scriptURL, options);
      };
      window.Worker.prototype = origWorker.prototype;
    }
  } catch (e) {}

  // Fetch & XMLHttpRequest Interceptor for ad & popunder endpoints
  try {
    const origFetch = window.fetch;
    if (typeof origFetch === 'function') {
      window.fetch = function (resource, init) {
        if (!isDisabled()) {
          const urlStr = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
          const u = parse(urlStr);
          if (u && (isAdHost(u.hostname) || /(?:\/popunder|\/ad-tags?|\/track\.php|\/analytics\/collect)/i.test(u.pathname))) {
            report('fetch-ad');
            return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
        }
        return origFetch.call(this, resource, init);
      };
    }
  } catch (e) {}

  try {
    const origXHR = window.XMLHttpRequest;
    if (origXHR && origXHR.prototype) {
      const origOpen = origXHR.prototype.open;
      const origSend = origXHR.prototype.send;
      origXHR.prototype.open = function (method, url, ...rest) {
        this.__addfreeAd = false;
        if (!isDisabled() && typeof url === 'string') {
          const u = parse(url);
          if (u && (isAdHost(u.hostname) || /(?:\/popunder|\/ad-tags?|\/track\.php)/i.test(u.pathname))) {
            this.__addfreeAd = true;
          }
        }
        return origOpen.call(this, method, url, ...rest);
      };
      origXHR.prototype.send = function (...args) {
        if (this.__addfreeAd) {
          report('xhr-ad');
          Object.defineProperty(this, 'readyState', { value: 4 });
          Object.defineProperty(this, 'status', { value: 200 });
          Object.defineProperty(this, 'responseText', { value: '{}' });
          if (typeof this.onload === 'function') this.onload(new Event('load'));
          return;
        }
        return origSend.call(this, ...args);
      };
    }
  } catch (e) {}

  // Anti-adblock scriptlet / global variable spoofing
  const adGlobals = [
    'canRunAds', 'isAdblockActive', 'google_ad_status',
    'adblock', 'adblocker', 'adsBlocked', 'isAdBlockActive',
    'adBlockDetected', 'isAdBlocked'
  ];
  for (const key of adGlobals) {
    try {
      const isPositive = (key === 'canRunAds' || key === 'google_ad_status');
      window[key] = isPositive ? (key === 'google_ad_status' ? 1 : true) : false;
    } catch (e) {}
  }
  const noop = () => {};
  const noopFuncObj = { check: noop, clearEvent: noop, on: noop, onDetected: noop, onNotDetected: (fn) => typeof fn === 'function' && fn() };
  try {
    window.BlockAdBlock = function () { return noopFuncObj; };
    window.BlockAdBlock.prototype = noopFuncObj;
    window.blockAdBlock = noopFuncObj;
    window.fuckAdBlock = noopFuncObj;
    window.FuckAdBlock = function () { return noopFuncObj; };
    window.FuckAdBlock.prototype = noopFuncObj;
    window.babasbm = true;
    window.Snigel = window.Snigel || {};
  } catch (e) {}
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.loaded = true;
  } catch (e) {}

  // Movie / shortener link countdown fast-forward
  // Accelerate 10-15s download countdown delays
  const origSetInterval = window.setInterval;
  const origSetTimeout = window.setTimeout;

  window.setInterval = function (fn, delay, ...args) {
    if (typeof delay === 'number' && delay >= 800 && delay <= 1200 && !isDisabled()) {
      const fnStr = typeof fn === 'function' ? fn.toString() : String(fn);
      if (/count|timer|second|timeleft|wait|download|remain|clock|sec/i.test(fnStr)) {
        delay = 80;
      }
    }
    return origSetInterval.call(this, fn, delay, ...args);
  };

  window.setTimeout = function (fn, delay, ...args) {
    if (typeof delay === 'number' && delay >= 2000 && delay <= 20000 && !isDisabled()) {
      const fnStr = typeof fn === 'function' ? fn.toString() : String(fn);
      if (/count|timer|second|timeleft|wait|download|remain|unlock|reveal/i.test(fnStr)) {
        delay = Math.min(delay, 250);
      }
    }
    return origSetTimeout.call(this, fn, delay, ...args);
  };

  // Anti-adblock bait / honeypot detection bypass
  // Neutralize offscreen bait divs testing display:none or offsetWidth === 0
  const realGCS = window.getComputedStyle;
  window.getComputedStyle = function (el, pseudo) {
    const cs = realGCS.call(this, el, pseudo);
    if (!el || !(el instanceof Element) || isDisabled()) return cs;
    const styleAttr = el.getAttribute('style') || '';
    const isBait = /-(?:999|1000)px|top:\s*-(?:999|9999|10000)px|left:\s*-(?:999|9999|10000)px/i.test(styleAttr);
    if (isBait && cs.display === 'none') {
      return new Proxy(cs, {
        get(target, prop) {
          if (prop === 'display') return 'block';
          if (prop === 'visibility') return 'visible';
          const val = target[prop];
          return typeof val === 'function' ? val.bind(target) : val;
        }
      });
    }
    return cs;
  };

  try {
    const descW = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    const descH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    if (descW && descH && descW.get && descH.get) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get() {
          const val = descW.get.call(this);
          if (val === 0 && !isDisabled()) {
            const s = this.getAttribute('style') || '';
            if (/-(?:999|1000)px|top:\s*-(?:999|9999|10000)px|left:\s*-(?:999|9999|10000)px/i.test(s)) {
              const m = s.match(/width:\s*(\d+)px/);
              return m ? parseInt(m[1], 10) : 300;
            }
          }
          return val;
        },
        configurable: true
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        get() {
          const val = descH.get.call(this);
          if (val === 0 && !isDisabled()) {
            const s = this.getAttribute('style') || '';
            if (/-(?:999|1000)px|top:\s*-(?:999|9999|10000)px|left:\s*-(?:999|9999|10000)px/i.test(s)) {
              const m = s.match(/height:\s*(\d+)px/);
              return m ? parseInt(m[1], 10) : 250;
            }
          }
          return val;
        },
        configurable: true
      });
    }
  } catch (e) {}

  // Last trusted user click timestamp and target
  let lastClick = { time: 0, target: null };
  window.addEventListener('pointerdown', (e) => {
    if (e.isTrusted) lastClick = { time: Date.now(), target: e.target };
  }, true);

  // Allow only 1 window per user gesture; reject ad domains and unprompted cross-origin popups
  let usedGestureAt = 0;
  const shouldBlockOpen = (url) => {
    if (isDisabled()) return false;
    const u = parse(url || 'about:blank');
    if (u && isAdHost(u.hostname)) return true;
    const sinceClick = Date.now() - lastClick.time;
    if (sinceClick > 1000) return true;           // Opened without user click = popunder
    if (usedGestureAt === lastClick.time) return true; // Multiple popups in a single click
    const link = lastClick.target && lastClick.target.closest && lastClick.target.closest('a[href]');
    // Block cross-origin window.open when clicked link was same-origin or non-link element
    if (u && u.origin !== location.origin) {
      if (!link) return true;
      const targetHost = (link.hostname || '').toLowerCase();
      if (targetHost && targetHost !== u.hostname && !u.hostname.endsWith('.' + targetHost)) {
        return true;
      }
    }
    // Block about:blank popunder traps
    if (!url || url === 'about:blank') {
      if (!link || link.target !== '_blank') return true;
    }
    usedGestureAt = lastClick.time;
    return false;
  };

  const realOpen = window.open;
  const fakeWindow = () => {
    // Return dummy window object to satisfy persistent ad scripts
    const noop = () => {};
    return { closed: true, close: noop, focus: noop, blur: noop, postMessage: noop,
      location: { href: '', replace: noop, assign: noop }, document: { write: noop, close: noop } };
  };
  const patchedOpen = function (url, ...rest) {
    if (shouldBlockOpen(url)) { report('popup'); return fakeWindow(); }
    return realOpen.call(this, url, ...rest);
  };
  Object.defineProperty(patchedOpen, 'toString', { value: () => realOpen.toString() });
  try {
    Object.defineProperty(window, 'open', { value: patchedOpen, writable: false, configurable: false });
  } catch (e) {
    window.open = patchedOpen;
  }

  // Prevent location.assign and location.replace ad domain redirects
  try {
    const realAssign = window.location.assign;
    if (typeof realAssign === 'function') {
      window.location.assign = function (url) {
        const u = parse(url);
        if (u && isAdHost(u.hostname) && !isDisabled()) {
          report('redirect');
          return;
        }
        return realAssign.call(this, url);
      };
    }
  } catch (e) {}

  try {
    const realReplace = window.location.replace;
    if (typeof realReplace === 'function') {
      window.location.replace = function (url) {
        const u = parse(url);
        if (u && isAdHost(u.hostname) && !isDisabled()) {
          report('redirect');
          return;
        }
        return realReplace.call(this, url);
      };
    }
  } catch (e) {}

  // Block clicks on ad links and programmatic click-hijacks
  document.addEventListener('click', (e) => {
    if (isDisabled()) return;
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const u = parse(a.href);
    if (u && isAdHost(u.hostname)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      report('link');
    }
  }, true);

  // Block programmatic clicks on synthetic anchor elements
  const isHijackedAnchor = (el) => {
    if (isDisabled() || !(el instanceof HTMLAnchorElement)) return false;
    const u = parse(el.href);
    if (!u) return false;
    if (isAdHost(u.hostname)) return true;
    const external = u.origin !== location.origin;
    const offDom = !el.isConnected || el.target === '_blank';
    return external && offDom && Date.now() - lastClick.time > 1000;
  };

  const realClick = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function () {
    if (isHijackedAnchor(this)) { report('popup'); return; }
    return realClick.call(this);
  };

  const realDispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (event) {
    if (event && event.type === 'click' && isHijackedAnchor(this)) { report('popup'); return false; }
    return realDispatch.call(this, event);
  };
})();
