# Architecture

## Project Theme

**Photography Session Booking and Confirmation System** — a three-page static website (Home, Booking, Confirmation) for a fictional studio, **LUMA Studio**. The homepage is deliberately minimal (one hero photo, one call to action — no package cards or marketing filler). The booking page is where the real work happens: a form with a package dropdown (including an "Other / Custom Request" option), live weather context for the chosen date/location, an in-page review step, and a submission to Google Apps Script that generates and emails a PDF confirmation.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML5 / CSS3 / vanilla JavaScript (no framework, no build step) |
| External API | [Open-Meteo](https://open-meteo.com/) — free, keyless geocoding + weather forecast API |
| Backend automation | Google Apps Script, deployed as a Web App |
| Document generation | Google Docs (`DocumentApp`) exported to PDF via Drive |
| Email delivery | Gmail (`MailApp`) |
| Hosting | Static hosting — Vercel or Netlify |

## Why no frontend framework

The assignment scope is a 3-page booking flow with form state that only needs to survive one page navigation (Booking → Confirmation). Plain JS with `sessionStorage` for that one handoff keeps the project simple to explain, debug, and deploy as static files — which is also a deployment requirement (Vercel/Netlify, public GitHub repo).

## Page responsibilities

- **`index.html`** — minimal landing page: header, one hero image and headline, one "Book a Session" call to action, footer. No package listing, no form logic — its only job is to get the customer to Booking.
- **`booking.html`** — the core page. Contains the form, the weather card, and the summary/review state (shown/hidden by JS, not a separate page) so the "don't submit without reviewing" requirement doesn't need a fourth page.
- **`confirmation.html`** — reads the result of the last booking attempt from `sessionStorage` (set by `booking.js` right before navigating here) and renders one of three states: success, failure, or "no booking found" (direct visit).

## JS module boundaries

- **`js/validation.js`** — pure functions, no DOM access. Field-by-field and whole-form validation rules, reused by `booking.js` for both live (on-blur) and full-form (on-submit) validation.
- **`js/weather.js`** — pure async functions wrapping the two Open-Meteo endpoints (geocoding, forecast). Returns a plain result object (`{state: 'success'|'unavailable'|'error', ...}`) with no DOM access, so it's independently testable.
- **`js/booking.js`** — the only module that touches the DOM on the booking page. Owns form wiring, triggers weather checks, renders the summary, and performs the Apps Script `fetch()` call.

## Backend (`Code.gs`)

Single-file Apps Script project exposing `doPost(e)` (the real endpoint used by the frontend) and `doGet(e)` (a simple health check so visiting the Web App URL in a browser confirms the deployment is live). See `README.md` for deployment steps and `docs/data-flow.md` for the full request lifecycle.
