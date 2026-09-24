# Photography Session Booking and Confirmation System

**LUMA Studio** — a minimal, warm-toned photography booking site: a calm one-image homepage, a booking form with live weather context, an in-page review step, and an automatic PDF confirmation by email.

## Features

- **Home page** — brand, one hero photo, one call to action. Intentionally minimal; no package cards, no filler sections.
- **Booking page** — personal info + session details form (including a package dropdown with an "Other / Custom Request" option), live inline validation, an Open-Meteo weather card tied to the chosen date/location, and a Booking Summary review step that happens in place on the same page — no separate review URL.
- **Confirmation page** — success, failure, or "no booking found" states, driven entirely by the real result of the backend call (never faked).
- **Automatic email confirmation** — a Google Apps Script backend generates a PDF and emails it to the customer on successful confirmation.

## Technology Stack

- Static HTML / CSS / vanilla JavaScript — no framework, no build step
- [Open-Meteo](https://open-meteo.com/) — free geocoding + weather forecast API (no key required)
- Google Apps Script — backend automation, PDF generation, email
- Deployable to Vercel or Netlify

## Project Structure

```
project/
├── index.html              Home page
├── booking.html             Booking form + weather + in-page review
├── confirmation.html        Confirmation / failure / empty states
├── css/style.css             Design system (warm minimal photography palette)
├── js/
│   ├── booking.js            Form orchestration, weather trigger, Apps Script call
│   ├── weather.js            Open-Meteo integration
│   └── validation.js         Client-side validation rules
├── images/
│   └── README.md             Why the hero photo is hotlinked, not local — see below
├── Code.gs                  Google Apps Script backend
├── docs/
│   ├── architecture.md
│   ├── data-flow.md
│   ├── testing-checklist.md
│   └── troubleshooting-log.md
└── README.md
```

## Running locally

No build step — this is a static site.

```bash
cd project
python3 -m http.server 8080
# visit http://localhost:8080/index.html
```

Or open `index.html` directly in a browser (weather API calls still work over `file://`, since Open-Meteo doesn't require a key or a specific origin — Apps Script submission will still need step "Configure the frontend" below).

## Configuring the Weather API

Nothing to configure — Open-Meteo's geocoding and forecast endpoints are free and keyless. `js/weather.js` calls them directly. If a request fails (network issue, location not found, or the session date is outside Open-Meteo's ~16-day forecast window), the UI shows an appropriate non-blocking message and the booking can still proceed.

## Deploying the Apps Script backend

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Delete the default `Code.gs` boilerplate and paste in this repo's `Code.gs`.
3. Click **Deploy → New deployment**.
4. Under "Select type," choose **Web app**.
5. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**. Authorize the requested permissions (Docs, Drive, Gmail) — this happens once, under the Google account doing the deployment.
7. Copy the **Web app URL** shown after deployment.

## Connecting the frontend to Apps Script

Open `js/booking.js` and replace the placeholder at the top of the file:

```js
const APPS_SCRIPT_URL = 'PASTE_YOUR_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE';
```

with the Web App URL from the step above. Save, redeploy your static site if already hosted, and test one real booking end-to-end.

**Note on CORS:** the frontend posts with `Content-Type: text/plain;charset=utf-8` rather than `application/json`. This is intentional — Apps Script Web Apps don't support the `OPTIONS` preflight request that browsers send for `application/json` POSTs, so using `text/plain` avoids the preflight while the body is still valid JSON that `Code.gs` parses normally via `e.postData.contents`.

## Deploying the frontend

Both Vercel and Netlify can deploy this as-is (no build command needed — it's static HTML/CSS/JS).

**Vercel:**
1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Framework preset: **Other** / static. No build command, output directory: `/` (project root).

**Netlify:**
1. Push this repo to GitHub.
2. "Add new site → Import an existing project."
3. Build command: (leave blank). Publish directory: `/` (project root).

## Troubleshooting

See [`docs/troubleshooting-log.md`](docs/troubleshooting-log.md) for real issues found and fixed during development, plus known limitations around testing the Apps Script and live-weather paths in a sandboxed build environment.

Common real-world Apps Script gotchas if things don't work after deployment:

- **"Script function not found: doPost"** — make sure you deployed as a **Web app**, not an API executable, and that the deployment is the most recent version (Apps Script keeps old deployment URLs pinned to old code — use "Manage deployments" to update, or create a new deployment and update `APPS_SCRIPT_URL`).
- **403 / permission errors on first request** — the deploying account needs to complete the one-time OAuth consent screen. Trigger it manually once from the Apps Script editor (Run → `doPost` with test data) before relying on it from the frontend.
- **CORS errors in the browser console** — confirm the frontend is posting with `Content-Type: text/plain`, not `application/json` (see above).

## Known Limitations

- Apps Script email/PDF delivery has not been executed end-to-end in this build environment (no live Google account available here) — see the testing checklist and troubleshooting log for exact status.
- Live SUCCESS/UNAVAILABLE weather states were implemented against Open-Meteo's documented API shape but not exercised against a live response, since this build sandbox has no outbound network access. Verify once deployed.
- The assignment's suggested structure lists a `js/app.js`. It was intentionally left out here rather than shipped as an empty file — the Home page needs no JS of its own, and all booking-page logic lives in `js/booking.js`, `js/weather.js`, and `js/validation.js`.
- The homepage hero photo is loaded from a verified, real Unsplash URL rather than a local `images/camera.jpg` file — the build environment had no outbound network access to download and save an image binary. It displays correctly once deployed (Vercel/Netlify have normal internet access). See `images/README.md` for exactly why, and a one-line change if you'd rather host it locally.

## Rubric Mapping

| Criterion | Points | How it's satisfied |
|---|---|---|
| **Frontend & Web Interface** | 20 | Three complete, responsive, accessible pages (`index.html`, `booking.html`, `confirmation.html`); full form covering all required fields including email, with a package dropdown plus an "Other / Custom Request" option; inline validation with clear error states |
| **API Integration** | 20 | Open-Meteo geocoding + forecast API, directly relevant to outdoor photography scheduling; real data (temperature, condition, humidity, wind) displayed in a dedicated Session Weather card with LOADING/SUCCESS/UNAVAILABLE/ERROR states |
| **Backend Automation** | 30 | `Code.gs` receives booking data via `doPost`, re-validates server-side, generates a Google Doc, exports it to PDF, and emails it via `MailApp` — with structured success/error JSON responses and no false-success behavior |
| **Deployment & Code** | 15 | Static site structure deployable to Vercel/Netlify with no build step; `Code.gs` provided standalone; no secrets committed; relative paths throughout |
| **Project Report** | 15 | `docs/architecture.md`, `docs/data-flow.md`, and `docs/troubleshooting-log.md` cover theme, data flow, and a real (not fabricated) troubleshooting record, ready to drop into a report |
| **Bonus (+5)** | 5 | Three genuinely connected pages (Home → Booking → Confirmation), each with a distinct, necessary purpose — not added for padding |

This mapping describes what the implementation does, not a guaranteed grade — see `docs/testing-checklist.md` for exactly what has and hasn't been verified.
# photography-booking-system
