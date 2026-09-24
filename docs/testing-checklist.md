# Testing Checklist

Status key: **PASS** (actually verified in this environment) · **CONFIGURATION REQUIRED** (needs a real deployment/account to test) · **NOT TESTED** · **KNOWN LIMITATION**

## Frontend

| Check | Status | Notes |
|---|---|---|
| No broken navigation between Home / Booking / Confirmation | PASS | Verified by direct navigation in Playwright |
| No duplicate element IDs | PASS | Checked via `grep` across all three HTML files |
| No missing scripts/stylesheets | PASS | All `<script>`/`<link>` paths verified to resolve |
| JS files are syntactically valid | PASS | `node -c` run against all three JS files |
| No console-breaking JS errors | PASS | Found and fixed a real crash (see troubleshooting log #1); re-verified clean after fix |
| Form validation blocks invalid submission | PASS | Empty-form submit screenshot-verified: banner + inline errors on all required fields |
| Package selection UI | PASS | Click-to-select verified, visual "selected" state confirmed |
| Booking summary shows entered data | PASS | Verified all 8 summary rows render correctly from a filled form |
| Edit Booking returns to form with data intact | PASS | Verified all field values persist after Edit |
| Responsive layout (390px mobile) | PASS | Verified home + booking pages, fixed a real horizontal-padding bug (see log #2) |

## API (Open-Meteo)

| Check | Status | Notes |
|---|---|---|
| LOADING state | PASS | Spinner + "Checking forecast…" verified |
| API ERROR state (network unreachable) | PASS | This build sandbox has no outbound network, so every live call naturally exercised this path — verified the booking flow is not blocked by it |
| SUCCESS state (forecast available) | NOT TESTED | Implemented per Open-Meteo's documented response shape; requires an environment with outbound internet to verify live |
| UNAVAILABLE state (date outside forecast range) | NOT TESTED | Same as above — logic implemented (checks whether the date exists in the returned `daily.time` array) but not exercised against a live response |
| No fake/hard-coded weather data | PASS | Code-reviewed: every weather value is read from the API response; no fallback literals |

## Apps Script Backend

| Check | Status | Notes |
|---|---|---|
| Receives POST data | CONFIGURATION REQUIRED | Requires deployment |
| Server-side field validation | CONFIGURATION REQUIRED | Logic written and code-reviewed against the same rules as `validation.js`; not executed |
| Booking reference generation | CONFIGURATION REQUIRED | Logic reviewed; not executed |
| Document/PDF generation | CONFIGURATION REQUIRED | Requires a live Google account + deployment |
| Email delivery with attachment | CONFIGURATION REQUIRED | Requires a live Google account + deployment |
| Structured success/error responses | CONFIGURATION REQUIRED | Response shape code-reviewed against spec |

## Deployment

| Check | Status | Notes |
|---|---|---|
| Relative paths (no absolute /localhost paths) | PASS | All internal links/assets use relative paths |
| No secrets committed | PASS | No API keys required by Open-Meteo; Apps Script URL is a placeholder pending deployment |
| Code.gs included and reviewed | PASS | — |

## Honest summary

Everything that can be verified without a live Google account and without outbound internet access **has been actually executed and verified**, including finding and fixing two real bugs. Everything that requires those two things is clearly marked **CONFIGURATION REQUIRED** or **NOT TESTED** above and in the troubleshooting log — nothing is claimed as working without having been run.

## Round 2 — Rebrand & booking-flow correction pass

| Check | Status | Notes |
|---|---|---|
| Homepage shows LUMA Studio, one hero image, no package section | PASS | Screenshot-verified on desktop and 390px mobile |
| Package dropdown replaces the four radio cards | PASS | Verified selection, and that removing the old Round-1 special-case code didn't reintroduce the crash |
| "Other / Custom Request" reveals/hides/clears the custom field correctly | PASS | Verified reveal on select, hide + value-clear on switching away |
| Custom request required only when "Other" is selected | PASS | Verified both the on-blur and on-submit validation paths |
| Review stays on booking.html (no navigation, no URL change) | PASS | Confirmed via `page.url()` unchanged through review/edit/confirm |
| Edit Booking preserves all values, including package + custom text | PASS | Verified full round-trip |
| Booking Summary shows Contact Number and separate weather rows | PASS | Fixed a real gap — see troubleshooting log #6 |
| Confirmation page shows "Your confirmation has been sent to: &lt;email&gt;" | PASS | Verified with injected mock result |
| Confirmation page no longer shows Participants | PASS | Matches the newer, leaner spec |
| Warm palette contrast (button text, weather condition text, links) | PASS | Deliberately used dark charcoal text on the tan accent button rather than white, to keep contrast comfortably above WCAG AA — checked by rough luminance estimate, not an automated contrast tool |
| No horizontal overflow at 390px on any of the 3 pages | PASS | `scrollWidth - clientWidth === 0` checked programmatically on all three |
| Local `images/camera.jpg` | NOT APPLICABLE — hotlinked | See troubleshooting log #8 and `images/README.md` |
