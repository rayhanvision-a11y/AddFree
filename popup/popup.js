const $ = (id) => document.getElementById(id);
let tab = null;
let state = null;

const send = (msg) => new Promise((resolve) => {
  try {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(res);
      }
    });
  } catch (err) {
    resolve(null);
  }
});

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return 'Updated: ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function render() {
  if (!state) return;
  $('host').textContent = state.supported ? state.host : 'Unsupported page';
  $('count').textContent = state.count || 0;
  $('total').textContent = state.total || 0;
  $('global').checked = !!state.enabled;

  const siteActive = state.enabled && !state.whitelisted;
  $('site').checked = siteActive;
  $('site').disabled = !state.enabled || !state.supported;

  const statusBadge = $('statusBadge');
  if (!state.supported) {
    statusBadge.textContent = 'Unsupported';
    statusBadge.className = 'status-badge disabled';
  } else if (!state.enabled || state.whitelisted) {
    statusBadge.textContent = 'Disabled';
    statusBadge.className = 'status-badge disabled';
  } else {
    statusBadge.textContent = 'Protected';
    statusBadge.className = 'status-badge';
  }

  $('social').checked = !!state.blockSocialBadges;
  $('videoSkip').checked = state.videoSkip !== false;
  $('blockCookies').checked = state.blockCookies !== false;
  $('cleanUrls').checked = state.cleanUrls !== false;

  $('pickerBtn').disabled = !state.enabled || !state.supported;

  if (state.totalRules) {
    $('rulesCount').textContent = `${state.totalRules} active ad filters`;
  }
  if (state.lastFilterUpdate) {
    $('lastUpdated').textContent = formatDate(state.lastFilterUpdate);
  }

  const updateBanner = $('updateBanner');
  if (updateBanner) {
    if (state.updateAvailable) {
      $('newVer').textContent = state.updateAvailable;
      updateBanner.hidden = false;
    } else {
      updateBanner.hidden = true;
    }
  }

  const note = $('note');
  note.hidden = true;
  if (!state.enabled) {
    note.textContent = 'AddFree is disabled globally.';
    note.hidden = false;
  } else if (state.changed) {
    note.textContent = 'Reload the page to apply changes.';
    note.hidden = false;
  }
}

async function renderManager() {
  const data = (await send({ type: 'getDashboardData' })) || {};
  const wlList = $('wlList');
  const cfList = $('cfList');
  if (!wlList || !cfList) return;

  // Whitelist
  const wl = (data && data.whitelist) || [];
  $('wlCount').textContent = wl.length;
  if (wl.length === 0) {
    wlList.innerHTML = '<p class="empty-hint">No sites whitelisted yet.</p>';
  } else {
    wlList.innerHTML = '';
    for (const host of wl) {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `<span>${host}</span><button type="button" class="item-del-btn" title="Remove from whitelist">✕</button>`;
      row.querySelector('button').addEventListener('click', async () => {
        await send({ type: 'removeWhitelist', host });
        renderManager();
        refresh();
      });
      wlList.appendChild(row);
    }
  }

  // Custom filters
  const cf = (data && data.customFilters) || {};
  const hosts = Object.keys(cf);
  let totalCf = 0;
  for (const h of hosts) totalCf += (cf[h] && cf[h].length) || 0;
  $('cfCount').textContent = totalCf;

  if (totalCf === 0) {
    cfList.innerHTML = '<p class="empty-hint">No elements blocked yet.</p>';
  } else {
    cfList.innerHTML = '';
    for (const h of hosts) {
      for (const sel of (cf[h] || [])) {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `<span title="${h}: ${sel}">${h}: <code>${sel}</code></span><button type="button" class="item-del-btn" title="Remove block rule">✕</button>`;
        row.querySelector('button').addEventListener('click', async () => {
          await send({ type: 'removeCustomFilter', host: h, selector: sel });
          renderManager();
        });
        cfList.appendChild(row);
      }
    }
  }
}

async function refresh(changed = false) {
  const tabId = tab ? tab.id : null;
  const res = await send({ type: 'getState', tabId });
  state = res || {
    host: '—',
    supported: false,
    enabled: true,
    whitelisted: false,
    count: 0,
    total: 0
  };
  state.changed = changed;
  render();
}

// Tab navigation
$('tabShield').addEventListener('click', () => {
  $('tabShield').classList.add('active');
  $('tabRules').classList.remove('active');
  $('viewShield').hidden = false;
  $('viewRules').hidden = true;
});
$('tabRules').addEventListener('click', () => {
  $('tabRules').classList.add('active');
  $('tabShield').classList.remove('active');
  $('viewShield').hidden = true;
  $('viewRules').hidden = false;
  renderManager();
});

// Toggles
$('global').addEventListener('change', async (e) => {
  await send({ type: 'setEnabled', value: e.target.checked });
  refresh(true);
});

$('site').addEventListener('change', async (e) => {
  await send({ type: 'setWhitelisted', host: state.host, value: !e.target.checked });
  refresh(true);
});

$('social').addEventListener('change', async (e) => {
  await send({ type: 'setBlockSocialBadges', value: e.target.checked });
  refresh(false);
});

$('videoSkip').addEventListener('change', async (e) => {
  await send({ type: 'setSetting', key: 'videoSkip', value: e.target.checked });
  refresh(false);
});

$('blockCookies').addEventListener('change', async (e) => {
  await send({ type: 'setSetting', key: 'blockCookies', value: e.target.checked });
  refresh(false);
});

$('cleanUrls').addEventListener('change', async (e) => {
  await send({ type: 'setSetting', key: 'cleanUrls', value: e.target.checked });
  refresh(false);
});

// Element picker
$('pickerBtn').addEventListener('click', async () => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'startElementPicker' });
    window.close();
  } catch (e) {
    const note = $('note');
    note.textContent = 'Reload the page to start the element picker.';
    note.hidden = false;
  }
});

// Filter update
$('updateBtn').addEventListener('click', async () => {
  const btnTxt = $('updateTxt');
  btnTxt.textContent = 'Checking...';
  $('updateBtn').disabled = true;
  const res = await send({ type: 'updateFilters' });
  $('updateBtn').disabled = false;
  btnTxt.textContent = 'Update Filters';
  const note = $('note');
  if (res && res.success) {
    if (res.updateAvailable) {
      note.textContent = `Synced ${res.count} rules from GitHub! New v${res.updateAvailable} is ready to download.`;
    } else {
      note.textContent = `Synced ${res.count} ad rules from GitHub! You are up to date.`;
    }
    note.hidden = false;
  } else {
    note.textContent = res && res.error ? `Sync notice: ${res.error}` : 'Filter check complete.';
    note.hidden = false;
  }
  refresh();
});

// Export settings
$('exportBtn').addEventListener('click', async () => {
  const data = await send({ type: 'getDashboardData' });
  const jsonStr = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(jsonStr);
    const mNote = $('managerNote');
    mNote.textContent = 'Settings copied to clipboard!';
    mNote.hidden = false;
    setTimeout(() => { mNote.hidden = true; }, 3000);
  } catch (err) {
    alert(jsonStr);
  }
});

// Import settings
$('importBtn').addEventListener('click', async () => {
  const raw = prompt('Paste your exported JSON settings here:');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const res = await send({ type: 'importSettings', data });
    if (res && res.ok) {
      renderManager();
      refresh(true);
      const mNote = $('managerNote');
      mNote.textContent = 'Settings successfully restored!';
      mNote.hidden = false;
      setTimeout(() => { mNote.hidden = true; }, 3000);
    }
  } catch (e) {
    alert('Invalid JSON format!');
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => {
  tab = t;
  refresh();
});
