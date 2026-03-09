# Arc Electrical Prototype (UI-only)

Static front-end prototype for an electrician compliance workflow dashboard.

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
- **Recent submissions/history**: updates in-memory after form submit
- **Responsive dark visual style** across desktop/tablet/mobile

## Tech

- Plain HTML/CSS/JavaScript
- No backend, no auth, no external APIs

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

- Data is in-memory for this prototype.
- UI preferences and drafts are persisted in browser localStorage.
- Summary card printing hides non-essential panels for cleaner output.

## Deploy (Vercel static)

This folder is ready to deploy as a static site (no build step required).
