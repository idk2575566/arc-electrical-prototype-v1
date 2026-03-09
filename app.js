const CURRENT_USER = 'K. Jones';
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

const visitHistory = [
  { siteId: 'S-104', siteName: 'Canal View Apartments', engineer: 'A. Reed', visitDate: '2026-03-08', rcdResult: 'Pass', insulation: '2.8', notes: 'No defects. Consumer board labels updated.' },
  { siteId: 'S-101', siteName: 'Riverside Retail Park', engineer: 'L. Patel', visitDate: '2026-03-06', rcdResult: 'Pass', insulation: '3.2', notes: 'Lighting circuit tested. All within thresholds.' }
];

const siteTableBody = document.getElementById('siteTableBody');
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

let activePreset = localStorage.getItem(STORAGE_KEYS.preset) || 'all';

function toStartOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateYMD(date = new Date()) {
  return date.toISOString().slice(0, 10);
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
    return true;
  } catch {
    return false;
  }
}

function updateOfflineState() {
  document.body.classList.toggle('offline', !navigator.onLine);
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

visitForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!navigator.onLine) {
    saveDraft();
    alert('You are offline. Draft saved locally and can be synced when back online.');
    return;
  }

  const formData = new FormData(visitForm);
  const siteId = formData.get('siteId');
  const site = sites.find((s) => s.id === siteId);
  if (!site) return;

  const newEntry = {
    siteId,
    siteName: site.name,
    engineer: formData.get('engineer'),
    visitDate: formData.get('visitDate'),
    rcdResult: formData.get('rcdResult'),
    insulation: formData.get('insulation'),
    ptw: formData.get('ptw'),
    remedial: formData.get('remedial'),
    nextDue: formData.get('nextDue'),
    notes: formData.get('notes')
  };

  visitHistory.push(newEntry);

  site.engineer = newEntry.engineer;
  site.nextDue = newEntry.nextDue;
  site.status = newEntry.remedial === 'Yes' || newEntry.rcdResult === 'Fail' ? 'overdue' : 'completed';

  renderKpis();
  renderManagerPanel();
  renderSites();
  renderHistory();
  showVisitSummary(newEntry);

  visitForm.reset();
  localStorage.removeItem(STORAGE_KEYS.draft);
});

searchInput.addEventListener('input', renderSites);
statusFilter.addEventListener('change', renderSites);
newVisitBtn.addEventListener('click', () => {
  document.getElementById('log').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
mobileQuickLog.addEventListener('click', () => {
  document.getElementById('log').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
window.addEventListener('offline', updateOfflineState);
window.addEventListener('online', updateOfflineState);
restoreDraftBtn.addEventListener('click', restoreDraftToForm);
discardDraftBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEYS.draft);
  draftNotice.classList.add('hidden');
});

(function init() {
  renderKpis();
  renderManagerPanel();
  renderSites();
  renderSiteOptions();
  renderHistory();
  renderPresetState();
  updateOfflineState();

  if (localStorage.getItem(STORAGE_KEYS.draft)) {
    draftNotice.classList.remove('hidden');
  }

  const savedSummary = localStorage.getItem(STORAGE_KEYS.summary);
  if (savedSummary) {
    visitSummary.classList.remove('hidden');
    visitSummary.innerHTML = savedSummary;
  }
})();