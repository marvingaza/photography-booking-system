const APPS_SCRIPT_URL = 'PASTE_YOUR_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE';

(function () {

  const form = document.getElementById('bookingForm');
  const formCard = document.getElementById('formCard');
  const summaryCard = document.getElementById('summaryCard');
  const summaryList = document.getElementById('summaryList');
  const formErrorBanner = document.getElementById('formErrorBanner');
  const confirmErrorBanner = document.getElementById('confirmErrorBanner');
  const editBtn = document.getElementById('editBtn');
  const confirmBtn = document.getElementById('confirmBtn');
  const reviewBtn = document.getElementById('reviewBtn');

  const fields = ['fullName', 'email', 'contact', 'package', 'customRequest', 'date', 'time', 'location', 'participants'];
  let currentWeather = null; // last resolved weather result object
  let weatherRequestToken = 0;

  // ---------- Package selection ----------

  const packageSelect = form.elements['package'];
  const customRequestWrapper = getFieldWrapper('customRequest');

  packageSelect.addEventListener('change', function () {
    if (packageSelect.value === 'Other / Custom Request') {
      customRequestWrapper.classList.remove('hidden');
    } else {
      customRequestWrapper.classList.add('hidden');
      form.elements['customRequest'].value = '';
      clearFieldError('customRequest');
    }
  });

  // ---------- Live validation ----------
  // (package is a plain <select> now, so every field wires up the same way)

  fields.forEach(function (name) {
    const el = form.elements[name];
    if (!el) return;
    el.addEventListener('blur', function () { validateSingle(name); });
    el.addEventListener('input', function () { clearFieldError(name); });
  });

  function getFieldWrapper(name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function setFieldError(name, message) {
    const wrapper = getFieldWrapper(name);
    if (!wrapper) return;
    wrapper.classList.add('has-error');
    const errEl = wrapper.querySelector('.field-error');
    if (errEl) errEl.textContent = message;
  }

  function clearFieldError(name) {
    const wrapper = getFieldWrapper(name);
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
    const errEl = wrapper.querySelector('.field-error');
    if (errEl) errEl.textContent = '';
  }

  function validateSingle(name) {
    const value = getFieldValue(name);
    const err = Validation.validateField(name, value, collectValues());
    if (err) { setFieldError(name, err); } else { clearFieldError(name); }
    return !err;
  }

  function getFieldValue(name) {
    const el = form.elements[name];
    return el ? el.value : '';
  }

  function collectValues() {
    const values = {};
    fields.forEach(function (name) { values[name] = getFieldValue(name); });
    return values;
  }

  // ---------- Weather triggering ----------

  const dateInput = form.elements['date'];
  const locationInput = form.elements['location'];
  let weatherDebounce;

  function scheduleWeatherCheck() {
    clearTimeout(weatherDebounce);
    weatherDebounce = setTimeout(triggerWeatherCheck, 500);
  }

  dateInput.addEventListener('change', scheduleWeatherCheck);
  locationInput.addEventListener('input', scheduleWeatherCheck);

  async function triggerWeatherCheck() {
    const date = dateInput.value;
    const location = locationInput.value.trim();
    const stateEl = document.getElementById('weatherState');
    const locLabel = document.getElementById('weatherLocLabel');

    if (!date || !location) {
      currentWeather = null;
      locLabel.textContent = 'Enter a date and location to check';
      stateEl.innerHTML = '<p class="weather-placeholder">Weather details will appear here once you\'ve entered a shoot location and session date.</p>';
      return;
    }

    const myToken = ++weatherRequestToken;
    locLabel.textContent = location;
    stateEl.innerHTML = '<div class="weather-loading"><span class="spinner" aria-hidden="true"></span> Checking forecast…</div>';

    let result;
    try {
      result = await Weather.getSessionWeather(location, date);
    } catch (e) {
      result = { state: 'error', reason: 'unexpected' };
    }

    if (myToken !== weatherRequestToken) return; // a newer request superseded this one

    currentWeather = result;
    renderWeather(result, location);
  }

  function renderWeather(result, location) {
    const stateEl = document.getElementById('weatherState');
    const locLabel = document.getElementById('weatherLocLabel');

    if (result.state === 'success') {
      locLabel.textContent = result.locationLabel;
      stateEl.innerHTML =
        '<div class="weather-temp">' + result.tempC + '°C</div>' +
        '<p class="weather-condition">' + escapeHtml(result.condition) + '</p>' +
        '<div class="weather-meta">' +
          '<div><strong>' + (result.humidity !== null ? result.humidity + '%' : '—') + '</strong>Humidity</div>' +
          '<div><strong>' + result.windKmh + ' km/h</strong>Wind</div>' +
        '</div>';
      return;
    }

    if (result.state === 'unavailable') {
      locLabel.textContent = result.locationLabel || location;
      stateEl.innerHTML = '<p class="weather-unavailable">Weather forecast for this date is not currently available. You can still continue with your booking.</p>';
      return;
    }

    // error
    locLabel.textContent = location;
    const reasonMsg = result.reason === 'location_not_found'
      ? 'We couldn\'t find that location. You can still continue with your booking.'
      : 'Weather information is temporarily unavailable. You may continue with your booking.';
    stateEl.innerHTML = '<p class="weather-error">' + reasonMsg + '</p>';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Review Booking ----------

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formErrorBanner.classList.remove('show');

    const values = collectValues();
    const errors = Validation.validateAll(values);

    Object.keys(errors).forEach(function (name) { setFieldError(name, errors[name]); });
    fields.forEach(function (name) { if (!errors[name]) clearFieldError(name); });

    if (Object.keys(errors).length > 0) {
      formErrorBanner.textContent = 'Please fix the highlighted fields before continuing.';
      formErrorBanner.classList.add('show');
      const firstErrorField = getFieldWrapper(Object.keys(errors)[0]);
      if (firstErrorField) firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    showSummary(values);
  });

  function packageDisplayValue(values) {
    if (values.package === 'Other / Custom Request') {
      return 'Custom Request — ' + values.customRequest;
    }
    return values.package;
  }

  function showSummary(values) {
    const rows = [
      ['Full Name', values.fullName],
      ['Email', values.email],
      ['Contact Number', values.contact],
      ['Photography Package', packageDisplayValue(values)],
      ['Session Date', formatDateDisplay(values.date)],
      ['Session Time', formatTimeDisplay(values.time)],
      ['Shoot Location', values.location],
      ['Number of Participants', values.participants]
    ];

    // Weather gets its own rows so Temperature/Condition/Humidity/Wind are each visible,
    // and gracefully collapses to one row when there's nothing real to show.
    if (currentWeather && currentWeather.state === 'success') {
      rows.push(['Temperature', currentWeather.tempC + '°C']);
      rows.push(['Condition', currentWeather.condition]);
      rows.push(['Humidity', currentWeather.humidity !== null ? currentWeather.humidity + '%' : '—']);
      rows.push(['Wind', currentWeather.windKmh + ' km/h']);
    } else if (currentWeather && currentWeather.state === 'unavailable') {
      rows.push(['Weather', 'Not available for this date']);
    } else if (currentWeather && currentWeather.state === 'error') {
      rows.push(['Weather', 'Currently unavailable']);
    } else {
      rows.push(['Weather', 'Not checked']);
    }

    summaryList.innerHTML = '';
    rows.forEach(function (r) {
      const row = document.createElement('div');
      row.className = 'summary-row';
      const dt = document.createElement('dt');
      dt.textContent = r[0];
      const dd = document.createElement('dd');
      dd.textContent = String(r[1]);
      row.appendChild(dt);
      row.appendChild(dd);
      summaryList.appendChild(row);
    });

    formCard.classList.add('hidden');
    summaryCard.classList.remove('hidden');
    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // stash values for confirm step
    summaryCard.dataset.values = JSON.stringify(values);
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + period;
  }

  editBtn.addEventListener('click', function () {
    summaryCard.classList.add('hidden');
    formCard.classList.remove('hidden');
    confirmErrorBanner.classList.remove('show');
  });

  // ---------- Confirm Appointment ----------

  confirmBtn.addEventListener('click', async function () {
    confirmErrorBanner.classList.remove('show');

    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('PASTE_YOUR') === 0) {
      confirmErrorBanner.textContent = 'Configuration required: the Apps Script Web App URL has not been set in js/booking.js yet.';
      confirmErrorBanner.classList.add('show');
      return;
    }

    const values = JSON.parse(summaryCard.dataset.values || '{}');

    const payload = {
      fullName: values.fullName,
      email: values.email,
      contact: values.contact,
      package: values.package,
      customRequest: values.package === 'Other / Custom Request' ? values.customRequest : '',
      date: values.date,
      time: values.time,
      location: values.location,
      participants: values.participants,
      weather: currentWeather && currentWeather.state === 'success' ? {
        tempC: currentWeather.tempC,
        condition: currentWeather.condition,
        humidity: currentWeather.humidity,
        windKmh: currentWeather.windKmh
      } : null
    };

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Confirming…';

    let result;
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        // text/plain avoids a CORS preflight against Apps Script Web Apps,
        // which do not support the OPTIONS method. See README troubleshooting.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      result = await res.json();
    } catch (err) {
      result = { success: false, message: 'Unable to reach the booking server. Please check your connection and try again.' };
    }

    if (result.success) {
      result.booking = {
        package: packageDisplayValue(values),
        date: values.date,
        dateDisplay: formatDateDisplay(values.date),
        time: formatTimeDisplay(values.time),
        location: values.location,
        email: values.email
      };
      sessionStorage.setItem('psb_result', JSON.stringify(result));
      window.location.href = 'confirmation.html';
      return;
    }

    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm Appointment';
    confirmErrorBanner.textContent = result.message || 'We could not confirm your appointment. Please try again.';
    confirmErrorBanner.classList.add('show');
  });

})();