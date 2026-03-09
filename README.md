# Arc Electrical Prototype (Supabase-enabled)

Static front-end prototype for an electrician compliance workflow dashboard, now wired to Supabase for real visit log read/write.

## What this includes

- **Dashboard KPIs**: due checks, overdue checks, completed this week
- **Manager confidence panel**: at-risk this week, missed in last 7 days, next 14-day workload forecast
- **Site register table**:
  - Search + status filter
  - **Saved view presets** (All, Today, Overdue only, My jobs) persisted in localStorage
  - **Traffic-light urgency chips** with stronger priority sorting (overdue days + severity + critical indicators)
- **One-tap mobile logging UX**:
  - Sticky mobile CTA for quick log entry
  - Condensed first-step form fields
  - Advanced checks in a collapsible section
- **Offline draft mode**:
  - Auto-saves in-progress visit form to localStorage
  - Restorable draft banner on return
  - Offline submit path stores draft for later sync
- **Evidence-ready output**:
  - Post-submit visit summary card
  - Print-friendly layout (`window.print`)
  - Downloadable summary HTML
- **Recent submissions/history**:
  - Hydrates from Supabase `visit_logs` on load (latest 50)
  - Falls back to seeded local history when offline/unavailable
- **Connection status indicator** in log panel:
  - `Connected` / `Offline` / `Save failed`

## Tech

- Plain HTML/CSS/JavaScript
- Supabase JS client via CDN (`@supabase/supabase-js@2`)

## Supabase setup

This prototype is pre-configured with:

- URL: `https://nejgobfkcxumpujzhsjm.supabase.co`
- Publishable key: `sb_publishable_V1K5b5RRF2iuWvZcwA77sA_M4kASI-p`

Expected table: `visit_logs`

### Required columns

- `site_name` (text)
- `client_name` (text)
- `engineer_name` (text)
- `visit_date` (date)
- `permit_to_work` (text)
- `rcd_result` (text)
- `insulation_result` (numeric/text)
- `remedial_required` (text)
- `next_due_date` (date)
- `notes` (text)
- `status` (text)
- `created_by` (text)

## Field mapping (form → `visit_logs`)

- `siteId` → resolved against site register, persisted as `site_name`
- `site.client` → `client_name`
- `engineer` → `engineer_name`
- `visitDate` → `visit_date`
- `ptw` → `permit_to_work`
- `rcdResult` → `rcd_result`
- `insulation` → `insulation_result`
- `remedial` → `remedial_required`
- `nextDue` → `next_due_date`
- `notes` → `notes`
- derived (`remedial === Yes` or `rcdResult === Fail`) → `status` (`overdue` else `completed`)
- current user constant (`K. Jones`) → `created_by`

## Run locally

### Option 1: Open directly
Open `index.html` in your browser.

### Option 2: Serve via lightweight static server
From this folder:

```bash
python3 -m http.server 8080
```

Then visit: `http://localhost:8080`

## Notes

- When online, history and new submissions use Supabase.
- Local UX behavior remains intact (presets, urgency, manager panel, summary export, draft recovery).
- If a save fails, user draft is retained locally and status changes to **Save failed**.

## Deploy (Vercel static)

This folder is ready to deploy as a static site (no build step required).
