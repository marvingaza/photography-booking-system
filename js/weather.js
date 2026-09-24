const Weather = (function () {

  const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

  // Minimal WMO weather code -> human label map (Open-Meteo uses WMO codes)
  const WMO_LABELS = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
  };

  function describeCode(code) {
    return WMO_LABELS[code] || 'Weather data available';
  }

  async function geocodeLocation(query) {
    const url = GEOCODE_URL + '?name=' + encodeURIComponent(query) + '&count=1&language=en&format=json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('geocoding_failed');
    const data = await res.json();
    if (!data.results || !data.results.length) throw new Error('location_not_found');
    const r = data.results[0];
    return {
      lat: r.latitude,
      lon: r.longitude,
      label: [r.name, r.admin1, r.country].filter(Boolean).join(', ')
    };
  }

  async function fetchForecast(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      daily: 'weathercode,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,windspeed_10m_max',
      timezone: 'auto',
      forecast_days: '16'
    });
    const url = FORECAST_URL + '?' + params.toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error('forecast_failed');
    return res.json();
  }

  /**
   * Main entry point.
   * @param {string} locationQuery - free-text location entered by the user
   * @param {string} dateStr - "YYYY-MM-DD" session date
   * @returns {Promise<object>} one of:
   *   { state: 'success', locationLabel, tempC, condition, humidity, windKmh }
   *   { state: 'unavailable', locationLabel }
   *   { state: 'error', reason }
   */
  async function getSessionWeather(locationQuery, dateStr) {
    let geo;
    try {
      geo = await geocodeLocation(locationQuery);
    } catch (err) {
      return { state: 'error', reason: err.message === 'location_not_found' ? 'location_not_found' : 'network' };
    }

    let forecast;
    try {
      forecast = await fetchForecast(geo.lat, geo.lon);
    } catch (err) {
      return { state: 'error', reason: 'network' };
    }

    if (!forecast.daily || !forecast.daily.time) {
      return { state: 'error', reason: 'malformed_response' };
    }

    const idx = forecast.daily.time.indexOf(dateStr);
    if (idx === -1) {
      return { state: 'unavailable', locationLabel: geo.label };
    }

    const tMax = forecast.daily.temperature_2m_max[idx];
    const tMin = forecast.daily.temperature_2m_min[idx];
    const code = forecast.daily.weathercode[idx];
    const humidity = forecast.daily.relative_humidity_2m_mean
      ? forecast.daily.relative_humidity_2m_mean[idx]
      : null;
    const wind = forecast.daily.windspeed_10m_max[idx];

    return {
      state: 'success',
      locationLabel: geo.label,
      tempC: Math.round((tMax + tMin) / 2),
      condition: describeCode(code),
      humidity: humidity !== null ? Math.round(humidity) : null,
      windKmh: Math.round(wind)
    };
  }

  return { getSessionWeather };
})();