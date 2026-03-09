const CURRENT_USER = 'K. Jones';
const SUPABASE_URL = 'https://nejgobfkcxumpujzhsjm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_V1K5b5RRF2iuWvZcwA77sA_M4kASI-p';

const STORAGE_KEYS = {
  preset: 'arc:viewPreset',
  draft: 'arc:visitDraft',
  summary: 'arc:lastSummary'
};

const sites = [
  { id: 'S-101', name: 'Riverside Retail Park', client: 'Halcyon Estates', engineer: 'L. Patel', nextDue: '2026-03-11', status: 'due', severity: 'medium', critical: false },
  { id: 'S-102', name: "St. Mark's School", client: 'City Education Trust', engineer: 'K. Jones', nextDue: '2026-03-05', status: 'overdue', severity: 'high', critical: true },
  { id: 'S-103', name: 'Northpoint Offices', client: 'Vantage Group', engineer: 'M. Clarke', nextDue: '2026-03-14', status: 'due', severity: 'low', critical: false },
  { id: 'S-104', name: 'Canal View Apartments', client: 'Urban Nest', engineer: 'A. Reed', nextDue: '2026-03-08', status: 'completed', severity: 'medium', critical: false },
  { id: 'S-105', name: 'Alder Manufacturing', client: 'Alder Industries', engineer: 'S. Khan', nextDue: '2026-03-01', status: 'overdue', severity: 'high', critical: false }
];

const seededVisitHistory = [
  { siteId: 'S-104', siteName: 'Canal View Apartments', clientName: 'Urban Nest', engineer: 'A. Reed', visitDate: '2026-03-08', rcdResult: 'Pass', insulation: '2.8', ptw: 'Yes', remedial: 'No', nextDue: '2026-09-08', notes: 'No defects. Consumer board labels updated.', status: 'completed', createdBy: 'A. Reed' },
  { siteId: 'S-101', siteName: 'Riverside Retail Park', clientName: 'Halcyon Estates', engineer: 'L. Patel', visitDate: '2026-03-06', rcdResult: 'Pass', insulation: '3.2', ptw: 'Yes', remedial: 'No', nextDue: '2026-09-06', notes: 'Lighting circuit tested. All within thresholds.', status: 'completed', createdBy: 'L. Patel' }
];

const visitHistory = [...seededVisitHistory];

const siteTableBody = document.getElementById('siteTableBody');
const siteCards = document.getElementById('siteCards');
const kpiGrid = document.getElementById('dashboard');
const managerPanel = document.getElementById('managerPanel');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const siteSelect = document.getElementById('siteSelect');
const visitForm = document.getElementById('visitForm');
const historyList = document.getElementById('historyList');
const visitSummary = document.getElementById('visitSummary');
const newVisitBtn = document.getElementById('newVisitBtn');
const mobileQuickLog = document.getElementById('mobileQuickLog');
const presetRow = document.getElementById('presetRow');
const draftNotice = document.getElementById('draftNotice');
const restoreDraftBtn = document.getElementById('restoreDraftBtn');
const discardDraftBtn = document.getElementById('discardDraftBtn');
const connectionStatus = document.getElementById('connectionStatus');
const formFeedback = document.getElementById('formFeedback');
const lastActionMessage = document.getElementById('lastActionMessage');
const toastRegion = document.getElementById('toastRegion');

let activePreset = localStorage.getItem(STORAGE_KEYS.preset) || 'all';
let supabaseClient = null;

const REQUIRED_FIELDS = {
  siteId: 'Select a site.',
  visitDate: 'Visit date is required.',
  engineer: 'Engineer name is required.'
};

function toStartOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateYMD(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function setConnectionStatus(state, label) {
  if (!connectionStatus) return;
  connectionStatus.textContent = label;
  connectionStatus.dataset.state = state;
}

function setLastAction(type, message) {
  if (!lastActionMessage) return;
  lastActionMessage.classList.remove('success', 'error', 'info');
  if (type) lastActionMessage.classList.add(type);
  lastActionMessage.textContent = `Last action: ${message}`;
}

function showToast(type, message) {
  if (!toastRegion) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type || 'info'}`;
  toast.textContent = message;
  toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function getFieldWrap(field) {
  return field?.closest('label') || field?.parentElement;
}

function removeFieldMessages(field) {
  const wrap = getFieldWrap(field);
  if (!wrap) return;
  wrap.querySelectorAll('.field-error, .field-valid-icon').forEach((node) => node.remove());
}

function clearValidationErrors() {
  if (formFeedback) {
    formFeedback.classList.add('hidden');
    formFeedback.innerHTML = '';
  }

  visitForm.querySelectorAll('.field-error, .field-valid-icon').forEach((node) => node.remove());
  visitForm.querySelectorAll('.field-invalid, .field-valid').forEach((node) => {
    node.classList.remove('field-invalid', 'field-valid');
  });
}

function setFieldError(fieldName, message) {
  const field = visitForm.elements[fieldName];
  if (!field) return;
  removeFieldMessages(field);
  field.classList.remove('field-valid');
  field.classList.add('field-invalid');
  const err = document.createElement('div');
  err.className = 'field-error';
  err.textContent = message;
  field.insertAdjacentElement('afterend', err);
}

function setFieldValid(fieldName) {
  const field = visitForm.elements[fieldName];
  if (!field) return;
  removeFieldMessages(field);
  field.classList.remove('field-invalid');
  field.classList.add('field-valid');
  const tick = document.createElement('span');
  tick.className = 'field-valid-icon';
  tick.textContent = '✓';
  tick.setAttribute('aria-hidden', 'true');
  field.insertAdjacentElement('afterend', tick);
}

function validateSingleRequiredField(fieldName, message) {
  const field = visitForm.elements[fieldName];
  if (!field) return true;
  const value = String(field.value || '').trim();
  if (!value) {
    setFieldError(fieldName, message);
    return false;
  }
  setFieldValid(fieldName);
  return true;
}

function validateVisitForm() {
  const errors = [];

  Object.entries(REQUIRED_FIELDS).forEach(([name, message]) => {
    const valid = validateSingleRequiredField(name, message);
    if (!valid) errors.push({ name, message });
  });

  if (errors.length && formFeedback) {
    formFeedback.classList.remove('hidden');
    formFeedback.innerHTML = '<strong>Please complete highlighted required fields</strong>';
  }

  return errors;
}

function refreshRequiredValidationUI() {
  Object.entries(REQUIRED_FIELDS).forEach(([name, message]) => {
    const value = String(visitForm.elements[name]?.value || '').trim();
    if (value) setFieldValid(name);
    else {
      const field = visitForm.elements[name];
      if (field) {
        removeFieldMessages(field);
        field.classList.remove('field-invalid', 'field-valid');
      }
    }
  });
}

function tryInitSupabase() {
  try {
    if (!window.supabase || !window.supabase.createClient) {
      setConnectionStatus('offline', 'Offline');
      return null;
    }
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    setConnectionStatus('connected', navigator.onLine ? 'Connected' : 'Offline');
    return client;
  } catch (err) {
    console.error('Supabase initialization failed:', err);
    setConnectionStatus('offline', 'Offline');
    return null;
  }
}

function normalizeYesNo(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'Yes') return true;
  if (value === 'No') return false;
  return null;
}

function inferStatus({ remedial, rcdResult }) {
  return normalizeYesNo(remedial) === true || rcdResult === 'Fail' ? 'overdue' : 'completed';
}

function mapRowToEntry(row) {
  const site = sites.find((s) => s.name === row.site_name);
  return {
    siteId: site?.id || row.site_name,
    siteName: row.site_name,
    clientName: row.client_name,
    engineer: row.engineer_name,
    visitDate: row.visit_date,
    rcdResult: row.rcd_result,
    insulation: row.insulation_result,
    ptw: normalizeYesNo(row.permit_to_work) === true ? 'Yes' : 'No',
    remedial: normalizeYesNo(row.remedial_required) === true ? 'Yes' : 'No',
    nextDue: row.next_due_date,
    notes: row.notes,
    status: row.status || inferStatus({ remedial: row.remedial_required, rcdResult: row.rcd_result }),
    createdBy: row.created_by || CURRENT_USER
  };
}

function mapFormToSupabasePayload(formData, site) {
  const remedial = normalizeYesNo(formData.get('remedial'));
  const permitToWork = normalizeYesNo(formData.get('ptw'));
  const rcdResult = formData.get('rcdResult') || null;
  const insulation = String(formData.get('insulation') || '').trim() || null;
  const nextDueDate = formData.get('nextDue') || null;

  return {
    site_name: site.name,
    client_name: site.client,
    engineer_name: String(formData.get('engineer') || '').trim(),
    visit_date: formData.get('visitDate'),
    permit_to_work: permitToWork,
    rcd_result: rcdResult,
    insulation_result: insulation,
    remedial_required: remedial,
    next_due_date: nextDueDate,
    notes: formData.get('notes') || '',
    status: inferStatus({ remedial, rcdResult }),
    created_by: CURRENT_USER
  };
}

async function hydrateFromSupabase() {
  if (!supabaseClient || !navigator.onLine) {
    renderHistory();
    return;
  }

  setConnectionStatus('syncing', 'Syncing…');
  const { data, error } = await supabaseClient
    .from('visit_logs')
    .select('site_name, client_name, engineer_name, visit_date, permit_to_work, rcd_result, insulation_result, remedial_required, next_due_date, notes, status, created_by')
    .order('visit_date', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to load visit logs:', error);
    setConnectionStatus('offline', 'Offline');
    renderHistory();
    return;
  }

  const mapped = data.map(mapRowToEntry).reverse();
  visitHistory.splice(0, visitHistory.length, ...(mapped.length ? mapped : seededVisitHistory));

  const latestBySite = new Map();
  [...mapped].reverse().forEach((entry) => {
    if (!latestBySite.has(entry.siteName)) latestBySite.set(entry.siteName, entry);
  });

  sites.forEach((site) => {
    const latest = latestBySite.get(site.name);
    if (!latest) return;
    site.engineer = latest.engineer || site.engineer;
    site.nextDue = latest.nextDue || site.nextDue;
    site.status = latest.status || site.status;
  });

  setConnectionStatus('connected', 'Connected');
  renderKpis();
  renderManagerPanel();
  renderSites();
  renderHistory();
}

// Traffic-light urgency calculation: combines overdue days + severity + critical indicators.
function getUrgency(site) {
  const today = toStartOfDay(dateYMD());
  const due = toStartOfDay(site.nextDue);
  const overdueDays = Math.max(0, Math.floor((today - due) / 86400000));
  const severityScore = { low: 1, medium: 2, high: 3 }[site.severity] || 1;
  const criticalBonus = site.critical ? 5 : 0;
  const statusWeight = site.status === 'overdue' ? 4 : site.status === 'due' ? 2 : 0;
  const score = overdueDays * 2 + severityScore + criticalBonus + statusWeight;

  if (score >= 12) return { label: 'Red', className: 'urgency-red', score, overdueDays };
  if (score >= 6) return { label: 'Amber', className: 'urgency-amber', score, overdueDays };
  return { label: 'Green', className: 'urgency-green', score, overdueDays };
}

function renderKpis() {
  const due = sites.filter((s) => s.status === 'due').length;
  const overdue = sites.filter((s) => s.status === 'overdue').length;
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const completed = visitHistory.filter((v) => {
    const d = new Date(v.visitDate);
    return d >= weekAgo && d <= now;
  }).length;

  kpiGrid.innerHTML = `
    <article class="kpi-card due"><div class="label">Due checks</div><div class="value">${due}</div></article>
    <article class="kpi-card overdue"><div class="label">Overdue checks</div><div class="value">${overdue}</div></article>
    <article class="kpi-card completed"><div class="label">Completed this week</div><div class="value">${completed}</div></article>
  `;
}

// Manager confidence panel with forward-looking workload and recent miss rate.
function renderManagerPanel() {
  const today = toStartOfDay(dateYMD());
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);
  const in14 = new Date(today);
  in14.setDate(today.getDate() + 14);
  const days7Ago = new Date(today);
  days7Ago.setDate(today.getDate() - 7);

  const atRisk = sites.filter((s) => {
    const u = getUrgency(s);
    const due = toStartOfDay(s.nextDue);
    return due <= in7 && (u.label !== 'Green' || s.status === 'overdue');
  }).length;

  const missed = sites.filter((s) => {
    const due = toStartOfDay(s.nextDue);
    return due >= days7Ago && due <= today && s.status === 'overdue';
  }).length;

  const upcoming = sites.filter((s) => {
    const due = toStartOfDay(s.nextDue);
    return due > today && due <= in14;
  }).length;

  managerPanel.innerHTML = `
    <div class="panel-head"><h3>Manager Confidence Panel</h3></div>
    <div class="manager-grid">
      <article class="manager-card"><div class="label">At risk this week</div><div class="metric">${atRisk}</div></article>
      <article class="manager-card"><div class="label">Missed in last 7 days</div><div class="metric">${missed}</div></article>
      <article class="manager-card"><div class="label">Next 14-day workload</div><div class="metric">${upcoming}</div></article>
    </div>
  `;
}

function statusChip(status) {
  const map = { due: 'status-due', overdue: 'status-overdue', completed: 'status-completed' };
  return `<span class="status-chip ${map[status] || 'status-due'}">${status}</span>`;
}

function applyPreset(filtered) {
  const todayStr = dateYMD();
  if (activePreset === 'today') return filtered.filter((s) => s.nextDue === todayStr);
  if (activePreset === 'overdue') return filtered.filter((s) => s.status === 'overdue');
  if (activePreset === 'mine') return filtered.filter((s) => s.engineer === CURRENT_USER);
  return filtered;
}

function renderSites() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;

  let filtered = sites.filter((site) => {
    const searchable = `${site.name} ${site.client} ${site.engineer}`.toLowerCase();
    const matchesQuery = searchable.includes(query);
    const matchesFilter = filter === 'all' || site.status === filter;
    return matchesQuery && matchesFilter;
  });

  filtered = applyPreset(filtered)
    .slice()
    .sort((a, b) => getUrgency(b).score - getUrgency(a).score || a.nextDue.localeCompare(b.nextDue));

  if (!filtered.length) {
    siteTableBody.innerHTML = '<tr><td colspan="6">No sites match current filters.</td></tr>';
    siteCards.innerHTML = '<article class="site-card"><div class="meta">No sites match current filters.</div></article>';
    return;
  }

  siteTableBody.innerHTML = filtered
    .map((site) => {
      const urgency = getUrgency(site);
      const detail = urgency.overdueDays ? ` (${urgency.overdueDays}d overdue)` : '';
      return `
      <tr>
        <td>${site.name}${site.critical ? ' ⚠️' : ''}</td>
        <td>${site.client}</td>
        <td>${site.engineer}</td>
        <td>${site.nextDue}</td>
        <td><span class="urgency-chip ${urgency.className}">${urgency.label}${detail}</span></td>
        <td>${statusChip(site.status)}</td>
      </tr>
    `;
    })
    .join('');

  siteCards.innerHTML = filtered
    .map((site) => {
      const urgency = getUrgency(site);
      const detail = urgency.overdueDays ? `${urgency.overdueDays}d overdue` : 'On schedule';
      return `
      <article class="site-card">
        <div class="site-card-header">
          <div>
            <h4>${site.name}${site.critical ? ' ⚠️' : ''}</h4>
            <div class="meta">${site.client}</div>
          </div>
          ${statusChip(site.status)}
        </div>
        <div class="site-card-grid">
          <div><span class="label">Engineer</span>${site.engineer}</div>
          <div><span class="label">Due date</span>${site.nextDue}</div>
          <div><span class="label">Urgency</span><span class="urgency-chip ${urgency.className}">${urgency.label}</span></div>
          <div><span class="label">Priority detail</span>${detail}</div>
        </div>
        <div class="site-card-actions">
          <button class="btn btn-ghost" data-action="view" data-site-id="${site.id}">View</button>
          <button class="btn btn-primary" data-action="log" data-site-id="${site.id}">Log Visit</button>
        </div>
      </article>
    `;
    })
    .join('');
}

function renderSiteOptions() {
  siteSelect.innerHTML =
    '<option value="">Select site...</option>' +
    sites.map((s) => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
}

function renderHistory() {
  historyList.innerHTML = visitHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
      <article class="history-item">
        <strong>${entry.siteName} · ${entry.visitDate}</strong>
        <div class="history-meta">Engineer: ${entry.engineer} · RCD: ${entry.rcdResult} · Insulation: ${entry.insulation} MΩ</div>
        <div class="history-meta">${entry.notes || 'No notes added.'}</div>
      </article>
    `
    )
    .join('');
}

function renderPresetState() {
  presetRow.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === activePreset);
  });
}

// Offline draft mode: save in-progress form data and restore if user returns later.
function saveDraft() {
  const payload = Object.fromEntries(new FormData(visitForm).entries());
  const hasData = Object.values(payload).some((v) => String(v || '').trim().length > 0);
  if (!hasData) return;
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify({ ts: Date.now(), payload }));
}

function restoreDraftToForm() {
  const raw = localStorage.getItem(STORAGE_KEYS.draft);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    Object.entries(parsed.payload || {}).forEach(([name, value]) => {
      const field = visitForm.elements[name];
      if (field) field.value = value;
    });
    draftNotice.classList.add('hidden');
    refreshRequiredValidationUI();
    return true;
  } catch {
    return false;
  }
}

function updateOfflineState() {
  const offline = !navigator.onLine;
  document.body.classList.toggle('offline', offline);
  if (offline) {
    setConnectionStatus('offline', 'Offline');
  } else if (supabaseClient) {
    setConnectionStatus('connected', 'Connected');
  }
}

// Evidence-ready summary card with print + downloadable HTML file.
function showVisitSummary(entry) {
  visitSummary.classList.remove('hidden');
  visitSummary.innerHTML = `
    <div class="panel-head"><h3>Visit Summary Card</h3></div>
    <article class="summary-card" id="summaryCard">
      <div class="summary-grid">
        <div><strong>Site:</strong> ${entry.siteName}</div>
        <div><strong>Date:</strong> ${entry.visitDate}</div>
        <div><strong>Engineer:</strong> ${entry.engineer}</div>
        <div><strong>RCD:</strong> ${entry.rcdResult}</div>
        <div><strong>Insulation:</strong> ${entry.insulation} MΩ</div>
        <div><strong>PTW:</strong> ${entry.ptw}</div>
        <div><strong>Remedial:</strong> ${entry.remedial}</div>
        <div><strong>Next due:</strong> ${entry.nextDue}</div>
      </div>
      <p><strong>Notes:</strong> ${entry.notes || 'No notes.'}</p>
    </article>
    <div class="summary-actions">
      <button id="printSummaryBtn" class="btn btn-primary">Print summary</button>
      <button id="downloadSummaryBtn" class="btn btn-ghost">Download HTML</button>
    </div>
  `;

  localStorage.setItem(STORAGE_KEYS.summary, visitSummary.innerHTML);

  document.getElementById('printSummaryBtn').addEventListener('click', () => window.print());
  document.getElementById('downloadSummaryBtn').addEventListener('click', () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Visit Summary</title></head><body>${document.getElementById('summaryCard').outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visit-summary-${entry.siteId}-${entry.visitDate}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

visitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearValidationErrors();

  const formData = new FormData(visitForm);
  const validationErrors = validateVisitForm();
  if (validationErrors.length) {
    setLastAction('error', 'Please complete highlighted required fields before saving.');
    showToast('error', 'Please complete highlighted required fields.');
    return;
  }

  const siteId = formData.get('siteId');
  const site = sites.find((s) => s.id === siteId);
  if (!site) {
    setFieldError('siteId', 'Select a valid site.');
    if (formFeedback) {
      formFeedback.classList.remove('hidden');
      formFeedback.textContent = 'Selected site is invalid. Choose a site from the list.';
    }
    setLastAction('error', 'Validation failed. Invalid site selected.');
    showToast('error', 'Selected site is invalid.');
    return;
  }

  const payload = mapFormToSupabasePayload(formData, site);

  if (!navigator.onLine || !supabaseClient) {
    saveDraft();
    setConnectionStatus('offline', 'Offline');
    setLastAction('info', 'You are offline. Your draft is saved locally and ready to restore later.');
    showToast('info', 'You are offline — draft saved locally.');
    return;
  }

  setConnectionStatus('syncing', 'Syncing…');
  const { data, error } = await supabaseClient.from('visit_logs').insert(payload).select().single();

  if (error) {
    console.error('Failed to save visit log:', error);
    setConnectionStatus('save-failed', 'Save failed');
    saveDraft();

    const providerMessage = error.message || error.details || 'Unknown provider error';
    const policyBlocked = error.code === '42501' || error.status === 401 || error.status === 403 || /policy|row-level security/i.test(providerMessage);
    const message = policyBlocked ? `DB policy blocked write: ${providerMessage}` : `Save failed: ${providerMessage}`;

    if (formFeedback) {
      formFeedback.classList.remove('hidden');
      formFeedback.textContent = message;
    }

    setLastAction('error', `We could not save this visit. ${message}`);
    showToast('error', 'We could not save your visit. Your draft is kept locally.');
    return;
  }

  const newEntry = mapRowToEntry(data || payload);
  newEntry.siteId = site.id;
  newEntry.siteName = site.name;

  visitHistory.push(newEntry);
  site.engineer = newEntry.engineer;
  site.nextDue = newEntry.nextDue;
  site.status = newEntry.status;

  renderKpis();
  renderManagerPanel();
  renderSites();
  renderHistory();
  showVisitSummary(newEntry);

  visitForm.reset();
  clearValidationErrors();
  refreshRequiredValidationUI();
  localStorage.removeItem(STORAGE_KEYS.draft);
  setConnectionStatus('connected', 'Connected');
  setLastAction('success', `Visit saved for ${site.name} on ${newEntry.visitDate}.`);
  showToast('success', 'Visit saved successfully.');
});

searchInput.addEventListener('input', renderSites);
statusFilter.addEventListener('change', renderSites);
function scrollToLog(siteId) {
  if (siteId) siteSelect.value = siteId;
  document.getElementById('log').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

newVisitBtn.addEventListener('click', () => {
  scrollToLog();
});
mobileQuickLog.addEventListener('click', () => {
  scrollToLog();
});

siteCards.addEventListener('click', (e) => {
  const actionBtn = e.target.closest('[data-action][data-site-id]');
  if (!actionBtn) return;

  const siteId = actionBtn.dataset.siteId;
  const site = sites.find((s) => s.id === siteId);
  if (!site) return;

  if (actionBtn.dataset.action === 'view') {
    searchInput.value = site.name;
    renderSites();
    document.getElementById('sites').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (actionBtn.dataset.action === 'log') {
    scrollToLog(siteId);
  }
});

presetRow.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-preset]');
  if (!btn) return;
  activePreset = btn.dataset.preset;
  localStorage.setItem(STORAGE_KEYS.preset, activePreset);
  renderPresetState();
  renderSites();
});

visitForm.addEventListener('input', saveDraft);
visitForm.addEventListener('input', (e) => {
  const name = e.target?.name;
  if (!name || !REQUIRED_FIELDS[name]) return;
  validateSingleRequiredField(name, REQUIRED_FIELDS[name]);
  if (formFeedback && formFeedback.classList.contains('hidden') === false) {
    const hasErrors = Object.keys(REQUIRED_FIELDS).some((fieldName) => !String(visitForm.elements[fieldName]?.value || '').trim());
    if (!hasErrors) {
      formFeedback.classList.add('hidden');
      formFeedback.innerHTML = '';
    }
  }
});
visitForm.addEventListener('change', (e) => {
  const name = e.target?.name;
  if (!name || !REQUIRED_FIELDS[name]) return;
  validateSingleRequiredField(name, REQUIRED_FIELDS[name]);
});
window.addEventListener('offline', updateOfflineState);
window.addEventListener('online', async () => {
  updateOfflineState();
  await hydrateFromSupabase();
});
restoreDraftBtn.addEventListener('click', () => {
  const restored = restoreDraftToForm();
  if (restored) {
    setLastAction('info', 'Draft restored from local storage.');
    showToast('info', 'Draft restored.');
  }
});
discardDraftBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEYS.draft);
  draftNotice.classList.add('hidden');
  setLastAction('info', 'Draft discarded.');
});

(async function init() {
  renderKpis();
  renderManagerPanel();
  renderSites();
  renderSiteOptions();
  renderHistory();
  renderPresetState();
  updateOfflineState();
  setLastAction('info', 'Ready to save a new visit.');

  if (localStorage.getItem(STORAGE_KEYS.draft)) {
    draftNotice.classList.remove('hidden');
  }

  refreshRequiredValidationUI();

  const savedSummary = localStorage.getItem(STORAGE_KEYS.summary);
  if (savedSummary) {
    visitSummary.classList.remove('hidden');
    visitSummary.innerHTML = savedSummary;
  }

  supabaseClient = tryInitSupabase();
  await hydrateFromSupabase();
})();
