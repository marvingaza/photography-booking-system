# Data Process Flow

## End-to-end flow

```
Customer
   │
   ▼
Booking Form (booking.html)
   │  fills personal info + session details
   ▼
Client-side Validation (js/validation.js)
   │  blocks submission until all fields pass
   ▼
Weather API — Open-Meteo (js/weather.js)
   │  geocode location → fetch forecast → match session date
   ▼
Weather Result
   │  SUCCESS / UNAVAILABLE / ERROR — booking can continue in every case
   ▼
Booking Summary (review state, still on booking.html)
   │  customer reviews all entered data + weather before committing
   ▼
Confirm Appointment
   │  POST JSON payload to Apps Script Web App
   ▼
Google Apps Script (Code.gs)
   │  doPost(e) — server-side validation (never trusts the client alone)
   ▼
Document Generation
   │  DocumentApp builds a formatted confirmation document
   ▼
PDF Export
   │  Doc exported via Drive as application/pdf, intermediate Doc trashed
   ▼
Email (MailApp)
   │  PDF attached, sent to the customer's submitted email address
   ▼
Structured JSON Response
   │  { success, bookingReference, message } or { success:false, message }
   ▼
Frontend (js/booking.js)
   │  stores result in sessionStorage, redirects to confirmation.html
   ▼
Confirmation Page (confirmation.html)
   │  renders SUCCESS state with reference + details, or FAILURE state
   ▼
Customer
```

## Why this shape

- **Weather is informational, never a gate.** If Open-Meteo is unreachable, times out, or has no forecast for the chosen date, the booking flow is explicitly allowed to continue — this is enforced both in the UI copy and in the fact that `weather` is an optional field in the payload sent to Apps Script.
- **Validation happens twice.** Client-side validation (`js/validation.js`) is for immediate feedback and a good UX. Server-side validation (inside `Code.gs`'s `validateBooking()`) is the actual trust boundary, since a request could reach the Apps Script endpoint directly, bypassing the browser entirely.
- **The confirmation page never fabricates success.** `confirmation.html` reads a `psb_result` object out of `sessionStorage` that was set only after the Apps Script response was received. If Apps Script returns `success: false`, or the page is opened with no result at all (e.g. a direct visit), the page shows a failure or empty state — it does not render a fake "confirmed" screen.
