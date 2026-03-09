const sites = [
  { id: 'S-101', name: 'Riverside Retail Park', client: 'Halcyon Estates', engineer: 'L. Patel', nextDue: '2026-03-11', status: 'due' },
  { id: 'S-102', name: 'St. Mark\'s School', client: 'City Education Trust', engineer: 'K. Jones', nextDue: '2026-03-05', status: 'overdue' },
  { id: 'S-103', name: 'Northpoint Offices', client: 'Vantage Group', engineer: 'M. Clarke', nextDue: '2026-03-14', status: 'due' },
  { id: 'S-104', name: 'Canal View Apartments', client: 'Urban Nest', engineer: 'A. Reed', nextDue: '2026-03-08', status: 'completed' },
  { id: 'S-105', name: 'Alder Manufacturing', client: 'Alder Industries', engineer: 'S. Khan', nextDue: '2026-03-01', status: 'overdue' }
];

const visitHistory = [
  { siteId: 'S-104', siteName: 'Canal View Apartments', engineer: 'A. Reed', visitDate: '2026-03-08', rcdResult: 'Pass', insulation: '2.8', notes: 'No defects. Consumer board labels updated.' },
  { siteId: 'S-101', siteName: 'Riverside Retail Park', engineer: 'L. Patel', visitDate: '2026-03-06', rcdResult: 'Pass', insulation: '3.2', notes: 'Lighting circuit tested. All within thresholds.' }
];

const siteTableBody = document.getElementById('siteTableBody');
const kpiGrid = document.getElementById('dashboard');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const siteSelect = document.getElementById('siteSelect');
const visitForm = document.getElementById('visitForm');
const historyList = document.getElementById('historyList');
const newVisitBtn = document.getElementById('newVisitBtn');

function renderKpis() {
  const due = sites.filter((s) => s.status === 'due').length;
  const overdue = sites.filter((s) => s.status === 'overdue').length;
  const completed = visitHistory.filter((v) => {
    const d = new Date(v.visitDate);
    const now = new Date('2026-03-09');
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now;
  }).length;

  kpiGrid.innerHTML = `
    <article class="kpi-card due"><div class="label">Due checks</div><div class="value">${due}</div></article>
    <article class="kpi-card overdue"><div class="label">Overdue checks</div><div class="value">${overdue}</div></article>
    <article class="kpi-card completed"><div class="label">Completed this week</div><div class="value">${completed}</div></article>
  `;
}

function statusChip(status) {
  const map = {
    due: 'status-due',
    overdue: 'status-overdue',
    completed: 'status-completed'
  };
  return `<span class="status-chip ${map[status] || 'status-due'}">${status}</span>`;
}

function renderSites() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;
  const filtered = sites.filter((site) => {
    const searchable = `${site.name} ${site.client} ${site.engineer}`.toLowerCase();
    const matchesQuery = searchable.includes(query);
    const matchesFilter = filter === 'all' || site.status === filter;
    return matchesQuery && matchesFilter;
  });

  siteTableBody.innerHTML = filtered
    .map(
      (site) => `
      <tr>
        <td>${site.name}</td>
        <td>${site.client}</td>
        <td>${site.engineer}</td>
        <td>${site.nextDue}</td>
        <td>${statusChip(site.status)}</td>
      </tr>
    `
    )
    .join('');
}

function renderSiteOptions() {
  siteSelect.innerHTML = '<option value="">Select site...</option>' +
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

visitForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(visitForm);
  const siteId = formData.get('siteId');
  const site = sites.find((s) => s.id === siteId);
  if (!site) return;

  visitHistory.push({
    siteId,
    siteName: site.name,
    engineer: formData.get('engineer'),
    visitDate: formData.get('visitDate'),
    rcdResult: formData.get('rcdResult'),
    insulation: formData.get('insulation'),
    notes: formData.get('notes')
  });

  site.engineer = formData.get('engineer');
  site.nextDue = formData.get('nextDue');
  site.status = formData.get('remedial') === 'Yes' || formData.get('rcdResult') === 'Fail' ? 'overdue' : 'completed';

  renderKpis();
  renderSites();
  renderHistory();
  visitForm.reset();
});

searchInput.addEventListener('input', renderSites);
statusFilter.addEventListener('change', renderSites);
newVisitBtn.addEventListener('click', () => {
  document.getElementById('log').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

renderKpis();
renderSites();
renderSiteOptions();
renderHistory();