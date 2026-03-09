# Arc Electrical Prototype (UI-only)

Static front-end prototype for an electrician compliance workflow dashboard.

## What this includes

- **Dashboard KPIs**: due checks, overdue checks, completed this week
- **Site register table**: status chips, search, status filter
- **Visit logging form**: compliance-focused fields (PTW, RCD result, insulation, remedial, next due)
- **Recent submissions/history**: updates in-memory after form submit
- **Responsive layout**: optimized for desktop/tablet/mobile

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

## Deploy (Vercel static)

This folder is ready to deploy as a static site (no build step required).
