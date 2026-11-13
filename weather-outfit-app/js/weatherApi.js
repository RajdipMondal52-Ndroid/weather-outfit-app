// Weather API Service using Open-Meteo (Free, No API Key required)

export const WMO_CODES = {
  0: { label: 'Clear Sky', icon: '☀️', mood: 'sunny_warm', isRain: false, isSnow: false },
  1: { label: 'Mainly Clear', icon: '🌤️', mood: 'sunny_warm', isRain: false, isSnow: false },
  2: { label: 'Partly Cloudy', icon: '⛅', mood: 'mild_spring', isRain: false, isSnow: false },
  3: { label: 'Overcast', icon: '☁️', mood: 'rainy_mist', isRain: false, isSnow: false },
  45: { label: 'Foggy', icon: '🌫️', mood: 'rainy_mist', isRain: false, isSnow: false },
  48: { label: 'Depositing Rime Fog', icon: '🌫️', mood: 'cold_crisp', isRain: false, isSnow: false },
  51: { label: 'Light Drizzle', icon: '🌦️', mood: 'rainy_mist', isRain: true, isSnow: false },
  53: { label: 'Moderate Drizzle', icon: '🌧️', mood: 'rainy_mist', isRain: true, isSnow: false },
  55: { label: 'Dense Drizzle', icon: '🌧️', mood: 'rainy_mist', isRain: true, isSnow: false },
  61: { label: 'Slight Rain', icon: '🌦️', mood: 'rainy_mist', isRain: true, isSnow: false },
  63: { label: 'Moderate Rain', icon: '🌧️', mood: 'rainy_mist', isRain: true, isSnow: false },
  65: { label: 'Heavy Rain', icon: '⛈️', mood: 'rainy_mist', isRain: true, isSnow: false },
  71: { label: 'Slight Snow', icon: '🌨️', mood: 'cold_crisp', isRain: false, isSnow: true },
  73: { label: 'Moderate Snow', icon: '❄️', mood: 'cold_crisp', isRain: false, isSnow: true },
  75: { label: 'Heavy Snow', icon: '❄️', mood: 'cold_crisp', isRain: false, isSnow: true },
  77: { label: 'Snow Grains', icon: '❄️', mood: 'cold_crisp', isRain: false, isSnow: true },
  80: { label: 'Slight Rain Showers', icon: '🌦️', mood: 'rainy_mist', isRain: true, isSnow: false },
  81: { label: 'Moderate Rain Showers', icon: '🌧️', mood: 'rainy_mist', isRain: true, isSnow: false },
  82: { label: 'Violent Rain Showers', icon: '⛈️', mood: 'rainy_mist', isRain: true, isSnow: false },
  85: { label: 'Slight Snow Showers', icon: '🌨️', mood: 'cold_crisp', isRain: false, isSnow: true },
  86: { label: 'Heavy Snow Showers', icon: '❄️', mood: 'cold_crisp', isRain: false, isSnow: true },
  95: { label: 'Thunderstorm', icon: '⛈️', mood: 'rainy_mist', isRain: true, isSnow: false },
  96: { label: 'Thunderstorm with Hail', icon: '⛈️', mood: 'cold_crisp', isRain: true, isSnow: true },
  99: { label: 'Heavy Thunderstorm with Hail', icon: '⛈️', mood: 'cold_crisp', isRain: true, isSnow: true }
};

export const POPULAR_CITIES = [
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lon: -21.9426 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 }
];

export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map(item => ({
      name: item.name,
      admin1: item.admin1 || '',
      country: item.country || '',
      lat: item.latitude,
      lon: item.longitude
    }));
  } catch (err) {
    console.warn('Geocoding search failed, falling back to local list:', err);
    return POPULAR_CITIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  }
}

export async function fetchWeather(lat, lon, cityName = 'Current Location') {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,precipitation_probability_max&timezone=auto`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.statusText}`);
    const data = await res.json();

    const current = data.current || {};
    const code = current.weather_code || 0;
    const weatherInfo = WMO_CODES[code] || { label: 'Partly Cloudy', icon: '⛅', mood: 'mild_spring', isRain: false, isSnow: false };

    // Format hourly (next 24 hours)
    const hourlyTimes = data.hourly?.time || [];
    const currentHourIndex = hourlyTimes.findIndex(t => new Date(t).getHours() === new Date().getHours()) || 0;
    const startIndex = Math.max(0, currentHourIndex);
    
    const next24Hours = [];
    for (let i = startIndex; i < Math.min(startIndex + 24, hourlyTimes.length); i++) {
      const hCode = data.hourly.weather_code[i] || 0;
      const hInfo = WMO_CODES[hCode] || { label: 'Fair', icon: '🌤️' };
      next24Hours.push({
        time: hourlyTimes[i],
        hourLabel: new Date(hourlyTimes[i]).toLocaleTimeString([], { hour: 'numeric' }),
        temp: Math.round(data.hourly.temperature_2m[i]),
        feelsLike: Math.round(data.hourly.apparent_temperature[i]),
        precipProb: data.hourly.precipitation_probability[i] || 0,
        uvIndex: data.hourly.uv_index[i] || 0,
        code: hCode,
        label: hInfo.label,
        icon: hInfo.icon
      });
    }

    // Format 7-day daily forecast
    const dailyForecast = [];
    const dailyTimes = data.daily?.time || [];
    for (let i = 0; i < dailyTimes.length; i++) {
      const dCode = data.daily.weather_code[i] || 0;
      const dInfo = WMO_CODES[dCode] || { label: 'Fair', icon: '🌤️' };
      const dDate = new Date(dailyTimes[i]);
      dailyForecast.push({
        date: dailyTimes[i],
        dayName: i === 0 ? 'Today' : dDate.toLocaleDateString([], { weekday: 'short' }),
        maxTemp: Math.round(data.daily.temperature_2m_max[i]),
        minTemp: Math.round(data.daily.temperature_2m_min[i]),
        maxFeelsLike: Math.round(data.daily.apparent_temperature_max[i]),
        minFeelsLike: Math.round(data.daily.apparent_temperature_min[i]),
        uvMax: data.daily.uv_index_max[i] || 0,
        rainProb: data.daily.precipitation_probability_max[i] || 0,
        code: dCode,
        label: dInfo.label,
        icon: dInfo.icon
      });
    }

    // Find peak UV in next 8 hours
    const nextHoursSlice = next24Hours.slice(0, 8);
    const maxDayUV = Math.max(...nextHoursSlice.map(h => h.uvIndex), 0);

    return {
      cityName,
      lat,
      lon,
      temp: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m || 50,
      windSpeed: Math.round(current.wind_speed_10m || 0),
      windGusts: Math.round(current.wind_gusts_10m || 0),
      precipitation: current.precipitation || 0,
      isDay: current.is_day === 1,
      weatherCode: code,
      condition: weatherInfo.label,
      conditionIcon: weatherInfo.icon,
      mood: weatherInfo.mood,
      isRain: weatherInfo.isRain || (current.rain > 0.2) || (current.showers > 0.2),
      isSnow: weatherInfo.isSnow || (current.snowfall > 0),
      maxUV: maxDayUV,
      hourly: next24Hours,
      daily: dailyForecast
    };
  } catch (err) {
    console.warn('Live API request failed or offline, using fallback:', err);
    return getMockFallbackWeather(cityName, lat, lon);
  }
}

export function getMockFallbackWeather(cityName = 'New York', lat = 40.71, lon = -74.00) {
  const hours = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    const isPeak = t.getHours() >= 12 && t.getHours() <= 16;
    hours.push({
      time: t.toISOString(),
      hourLabel: t.toLocaleTimeString([], { hour: 'numeric' }),
      temp: isPeak ? 19 : 14,
      feelsLike: isPeak ? 18 : 12,
      precipProb: i > 14 ? 45 : 10,
      uvIndex: isPeak ? 5 : 1,
      code: i > 14 ? 61 : 2,
      label: i > 14 ? 'Light Rain' : 'Partly Cloudy',
      icon: i > 14 ? '🌦️' : '⛅'
    });
  }

  return {
    cityName,
    lat,
    lon,
    temp: 16,
    feelsLike: 14,
    humidity: 62,
    windSpeed: 18,
    windGusts: 26,
    precipitation: 0.2,
    isDay: true,
    weatherCode: 2,
    condition: 'Partly Cloudy',
    conditionIcon: '⛅',
    mood: 'mild_spring',
    isRain: false,
    isSnow: false,
    maxUV: 5,
    hourly: hours,
    daily: [
      { dayName: 'Today', maxTemp: 19, minTemp: 11, rainProb: 45, icon: '🌦️', label: 'Passing Showers' },
      { dayName: 'Tomorrow', maxTemp: 22, minTemp: 13, rainProb: 15, icon: '☀️', label: 'Sunny' },
      { dayName: 'Thu', maxTemp: 17, minTemp: 9, rainProb: 60, icon: '🌧️', label: 'Rainy' },
      { dayName: 'Fri', maxTemp: 15, minTemp: 8, rainProb: 20, icon: '⛅', label: 'Crisp & Clear' },
      { dayName: 'Sat', maxTemp: 18, minTemp: 10, rainProb: 10, icon: '🌤️', label: 'Pleasant' }
    ]
  };
}
