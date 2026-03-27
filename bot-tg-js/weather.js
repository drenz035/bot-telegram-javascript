// weather.js
// ─────────────────────────────────────────────
//  OpenWeatherMap API wrapper
//  Docs: https://openweathermap.org/current
// ─────────────────────────────────────────────

const axios = require('axios');

const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Weather condition → emoji mapping
const CONDITIONS = {
  Thunderstorm: '⛈️',
  Drizzle:      '🌦️',
  Rain:         '🌧️',
  Snow:         '❄️',
  Mist:         '🌫️',
  Smoke:        '🌫️',
  Haze:         '🌫️',
  Fog:          '🌫️',
  Clear:        '☀️',
  Clouds:       '☁️',
};

/**
 * Fetch current weather for a city.
 * @param {string} city
 * @returns {Promise<object>} formatted weather data
 */
async function getWeather(city) {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_openweathermap_key_here') {
    throw new Error('WEATHER_API_KEY not configured');
  }

  const response = await axios.get(BASE_URL, {
    params: {
      q:     city,
      appid: apiKey,
      units: 'metric',
      lang:  'pt_br',
    },
    timeout: 5000,
  });

  const d          = response.data;
  const mainCond   = d.weather?.[0]?.main;
  const emoji      = CONDITIONS[mainCond] ?? '🌡️';
  const desc       = d.weather?.[0]?.description ?? 'Desconhecido';
  const capitalDesc = desc.charAt(0).toUpperCase() + desc.slice(1);

  return {
    city:       d.name ?? 'Desconhecida',
    country:    d.sys?.country ?? 'XX',
    emoji,
    description: capitalDesc,
    temp:        Math.round(d.main?.temp ?? 0),
    feelsLike:   Math.round(d.main?.feels_like ?? 0),
    tempMin:     Math.round(d.main?.temp_min ?? 0),
    tempMax:     Math.round(d.main?.temp_max ?? 0),
    humidity:    d.main?.humidity ?? 0,
    windSpeed:   d.wind?.speed ?? 0,
    visibility:  d.visibility ? Math.round(d.visibility / 1000) : null,
    cloudiness:  d.clouds?.all ?? 0,
  };
}

module.exports = { getWeather };
