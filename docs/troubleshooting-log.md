# Troubleshooting Log

This log records real problems found while building and testing this project — nothing here is fabricated. Each entry was found through actual execution (Node syntax checks, headless-browser rendering with Playwright, and manual flow walkthroughs) in the development container.

---

### 1. Review Booking button did nothing on first test

**Problem:** Clicking "Review Booking" on an empty form produced no visible validation errors and no summary screen — the button appeared completely unresponsive.

**Cause:** In `js/booking.js`, the live-validation wiring loop ran `form.elements[name].addEventListener(...)` for every field, including `package`. Because four radio inputs share `name="package"`, `form.elements['package']` returns a `RadioNodeList`, not a single element. `RadioNodeList` does not implement `addEventListener`, so the call threw `TypeError: el.addEventListener is not a function`. Since this happened inside a synchronous top-level IIFE, the exception halted the rest of the script — meaning the form's `submit` listener (defined later in the same file) never got attached at all.

**Fix:** Skip `package` in that wiring loop (it already has its own click handlers on the option cards) so the loop completes and the rest of the script — including the submit handler — runs.

**Result:** Verified with Playwright: submitting an empty form now shows the red error banner and inline field errors on every required field; a fully valid submission now correctly opens the Booking Summary.

---

### 2. Navigation and page-header content touched the screen edge on mobile

**Problem:** At a 390px mobile viewport, the "Book a Session" nav link and the booking page's `<h1>` sat flush against the right edge of the screen with no breathing room, instead of respecting the site's 24px side padding.

**Cause:** Several elements carry two classes at once, e.g. `<nav class="nav container">` and `<div class="container page-header">`. `.container` sets `padding: 0 24px`. But `.nav` (and separately `.page-header`, `.confirm-wrap`) also declared padding using the shorthand form, e.g. `padding: 18px 0`. Because `.nav` and `.container` are both single-class selectors of equal CSS specificity, and `.nav` appears later in the stylesheet, its shorthand `padding: 18px 0` won outright — completely replacing `.container`'s `0 24px` horizontal padding with `0`, not just adding vertical padding on top of it.

**Fix:** Changed the competing rules (`.nav`, `.page-header`, `.confirm-wrap`) to set `padding-top` / `padding-bottom` individually instead of the shorthand `padding: Ypx 0` form, so they no longer zero out the horizontal padding inherited from `.container`.

**Result:** Verified with a computed-style check in Playwright — `paddingLeft`/`paddingRight` are now `24px` on all three affected elements at mobile width, and a full-page mobile screenshot confirms visible margin around all header/nav content.

---

### 3. Google Apps Script email/PDF delivery — not independently testable in this environment

**Category:** Known limitation, not a bug.

**Detail:** `Code.gs` cannot be executed or unit-tested inside this build environment — Apps Script only runs inside a deployed Google Apps Script project tied to a real Google account, which this environment does not have access to. The script was written directly against Google's documented `DocumentApp`, `DriveApp`, and `MailApp` APIs and structured to mirror the client-side validation rules, but the full send flow (Doc creation → PDF export → email delivery) has **not been executed end-to-end**.

**Status:** `NOT TESTED — requires deployment`. See README.md for exact deployment and first-authorization steps. After deploying, submit one real booking end-to-end and confirm the email arrives with the PDF attached before relying on this in production or for grading demos.

---

### 4. Weather API states depend on network access

**Category:** Environment limitation, not a bug.

**Detail:** This build container has no outbound network access, so live calls to Open-Meteo's geocoding and forecast endpoints could not succeed during testing here. This was actually useful: it exercised the **API ERROR** state path exactly as a real network failure would, and confirmed the booking flow correctly continues without blocking. The **LOADING**, **UNAVAILABLE** (date outside the ~16-day forecast window), and **SUCCESS** states are implemented per Open-Meteo's documented response shape but should be spot-checked once deployed somewhere with outbound internet access (e.g. Vercel/Netlify), using both a near-term date (should return SUCCESS) and a date more than 16 days out (should return UNAVAILABLE).

**Status:** LOADING / API ERROR — verified. SUCCESS / UNAVAILABLE — implemented against documented API shape, `NOT TESTED` live due to sandboxed network.

---

## Summary table

| # | Issue | Category | Status |
|---|-------|----------|--------|
| 1 | `RadioNodeList.addEventListener` crash blocked all form submission | JavaScript bug | Fixed & verified |
| 2 | Nav/header content flush to screen edge on mobile | CSS specificity bug | Fixed & verified |
| 3 | Apps Script email/PDF send | Environment limitation | Not tested — requires deployment |
| 4 | Weather SUCCESS/UNAVAILABLE states | Environment limitation | Implemented, not tested live (no outbound network in build sandbox) |

---

## Round 2 — Rebrand to LUMA Studio + booking-flow corrections

A second pass applied a rebrand (Hollow & Frame → LUMA Studio), a full palette swap (dark Midnight Navy/Plum Violet → light warm minimal), a simplified single-hero homepage, and a package-dropdown-with-custom-request replacing the four package cards. This section covers what was actually found while making those changes — it does not repeat Round 1 issues, which remain fixed.

### 5. Package dropdown accidentally simplified away a real fix from Round 1

**Problem/observation:** Round 1 fixed a crash by special-casing `package` out of the generic field-wiring loop (because it used to be a `RadioNodeList`). Switching the package UI to a single `<select>` element made that special-case unnecessary — but it was worth re-checking, not just deleting, in case something else depended on it.

**Verification:** Re-ran the full validation suite after removing the special-case. `form.elements['package']` is now a plain element, `addEventListener` works on it directly, and no crash reappeared — confirmed via a clean Playwright pass with zero console/page errors. Net effect: less code than Round 1, not more, since the workaround is no longer needed.

**Result:** Fixed & verified. Also simplified `getFieldValue()` the same way (no more package special-case there either).

### 6. Booking Summary was missing "Contact Number" and combined all weather into one line

**Problem:** Comparing the existing `showSummary()` output against the new spec's exact field list (Full Name, Email, **Contact Number**, Photography Package, Session Date, Session Time, Shoot Location, Number of Participants, then separate Temperature/Condition/Humidity/Wind) turned up two real gaps: Contact Number was collected by the form but never shown in the review step, and weather was collapsed into a single "24°C, Partly Cloudy" string instead of separate rows.

**Cause:** The original summary row list was written against an earlier, less detailed version of the spec and never revisited.

**Fix:** Added a Contact Number row, and split weather into four individual rows (Temperature / Condition / Humidity / Wind) when a live forecast is available, falling back to a single explanatory "Weather" row when it isn't (not checked yet / unavailable for that date / temporarily down) — so the summary never shows blank or fabricated values.

**Result:** Verified with a full form fill (including selecting "Other / Custom Request" and checking the resulting label reads "Custom Request — <the typed text>") — all 8 base rows plus the weather row(s) render correctly. Screenshot-checked.

### 7. Minor hardening: switched summary/confirmation rendering from `innerHTML` to DOM text nodes

**Observation, not a bug found in the wild:** While rewriting `showSummary()` and the confirmation-page script to add the new rows, both were still building rows via string concatenation into `innerHTML`. Since these values come from the customer's own form input (not an external source), this wasn't an active exploit path, but building DOM nodes with `textContent` instead is a small, free hardening step taken while the code was already open for changes — not a rewrite for its own sake.

### 8. Homepage hero image can't be saved locally in this build environment

**Category:** Environment limitation, not a bug.

**Detail:** The correction spec asks for `images/camera.jpg` as a local file. This build environment's file-system tools have no outbound network access, so there was no way to download an actual image binary and write it to disk here. A real, verified Unsplash photo URL is used directly in `index.html` instead (confirmed reachable by fetching the source page, not guessed from memory). `images/README.md` explains this and gives the one-line change to swap in a genuinely local file later.

**Status:** Working as a hotlink (will render correctly once deployed, where normal internet access exists) — `NOT TESTED` for the local-file path specifically, since that requires a step this environment can't perform.

### Round 2 summary table

| # | Issue | Category | Status |
|---|-------|----------|--------|
| 5 | Package special-case removal after switching to `<select>` | Code simplification | Verified safe, no regression |
| 6 | Booking Summary missing Contact Number; weather collapsed to one line | Spec-gap bug | Fixed & verified |
| 7 | Summary/confirmation used `innerHTML` instead of text nodes | Minor hardening | Done, low-risk to begin with |
| 8 | `images/camera.jpg` can't be saved locally in this sandbox | Environment limitation | Hotlinked instead, documented |
