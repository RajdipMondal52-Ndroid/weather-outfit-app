// Main Application Orchestrator for AuraWear

import { WARDROBE_ITEMS } from './wardrobeData.js';
import { fetchWeather, searchCities, POPULAR_CITIES } from './weatherApi.js';
import { recommendOutfit, generatePackingList } from './outfitEngine.js';

// Application State
const state = {
  city: 'London',
  lat: 51.5074,
  lon: -0.1278,
  weather: null,
  unit: 'C', // 'C' or 'F'
  preferences: {
    style: 'casual',
    gender: 'all',
    sensitivity: 'normal',
    ownedItemIds: null
  },
  currentOutfit: null,
  currentRecommendation: null,
  tripDays: 3,
  audioPlaying: false,
  audioContext: null,
  audioNodes: null
};

// DOM Elements
const elements = {
  citySearchInput: document.getElementById('citySearchInput'),
  autocompleteDropdown: document.getElementById('autocompleteDropdown'),
  geoBtn: document.getElementById('geoBtn'),
  unitToggleBtn: document.getElementById('unitToggleBtn'),
  unitLabel: document.getElementById('unitLabel'),
  ambientAudioBtn: document.getElementById('ambientAudioBtn'),
  wardrobeModalBtn: document.getElementById('wardrobeModalBtn'),
  savedLooksBtn: document.getElementById('savedLooksBtn'),
  saveOutfitBtn: document.getElementById('saveOutfitBtn'),
  copyChecklistBtn: document.getElementById('copyChecklistBtn'),

  // Weather Displays
  locationCityName: document.getElementById('locationCityName'),
  weatherLocalTime: document.getElementById('weatherLocalTime'),
  mainTempDisplay: document.getElementById('mainTempDisplay'),
  weatherIcon: document.getElementById('weatherIcon'),
  weatherConditionText: document.getElementById('weatherConditionText'),
  feelsLikePill: document.getElementById('feelsLikePill'),
  statHumidity: document.getElementById('statHumidity'),
  statWind: document.getElementById('statWind'),
  statPrecip: document.getElementById('statPrecip'),
  statUV: document.getElementById('statUV'),

  // Stylist & Palette
  scoreBadge: document.getElementById('scoreBadge'),
  thermalBandText: document.getElementById('thermalBandText'),
  quickStylistSummary: document.getElementById('quickStylistSummary'),
  paletteName: document.getElementById('paletteName'),
  paletteSwatches: document.getElementById('paletteSwatches'),
  paletteDesc: document.getElementById('paletteDesc'),

  // Selectors
  styleSelector: document.getElementById('styleSelector'),
  genderSelector: document.getElementById('genderSelector'),
  sensitivitySelector: document.getElementById('sensitivitySelector'),

  // Containers
  outfitCardsContainer: document.getElementById('outfitCardsContainer'),
  accessoriesListContainer: document.getElementById('accessoriesListContainer'),
  stylistAdviceContainer: document.getElementById('stylistAdviceContainer'),
  hourlyTimelineScroller: document.getElementById('hourlyTimelineScroller'),
  dailyForecastList: document.getElementById('dailyForecastList'),
  packingListOutput: document.getElementById('packingListOutput'),
  generatePackingBtn: document.getElementById('generatePackingBtn'),

  // Modals
  swapModal: document.getElementById('swapModal'),
  closeSwapModalBtn: document.getElementById('closeSwapModalBtn'),
  swapOptionsContainer: document.getElementById('swapOptionsContainer'),
  swapModalTitle: document.getElementById('swapModalTitle'),

  wardrobeModal: document.getElementById('wardrobeModal'),
  closeWardrobeModalBtn: document.getElementById('closeWardrobeModalBtn'),
  wardrobeManagerContainer: document.getElementById('wardrobeManagerContainer'),
  selectAllClosetBtn: document.getElementById('selectAllClosetBtn'),
  resetClosetBtn: document.getElementById('resetClosetBtn'),

  savedLooksModal: document.getElementById('savedLooksModal'),
  closeSavedModalBtn: document.getElementById('closeSavedModalBtn'),
  savedLooksContainer: document.getElementById('savedLooksContainer'),

  toastContainer: document.getElementById('toastContainer'),
  ambientCanvas: document.getElementById('ambientCanvas')
};

// Unit Conversion Helper
function formatTemp(tempC) {
  if (tempC === undefined || tempC === null) return '--°';
  if (state.unit === 'F') {
    const f = Math.round((tempC * 9) / 5 + 32);
    return `${f}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

function formatSpeed(kmh) {
  if (state.unit === 'F') {
    const mph = Math.round(kmh * 0.621371);
    return `${mph} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

// Toast Helper
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Initialize Application
async function init() {
  loadStoredPreferences();
  setupEventListeners();
  initAmbientCanvas();

  // Try Geolocation first, else default city
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        state.lat = pos.coords.latitude;
        state.lon = pos.coords.longitude;
        state.city = 'My Location';
        await loadWeatherAndRecommend();
      },
      async (err) => {
        console.log('Using default city (London):', err.message);
        await loadWeatherAndRecommend();
      },
      { timeout: 4000 }
    );
  } else {
    await loadWeatherAndRecommend();
  }
}

// Load Weather & Generate Recommendation
async function loadWeatherAndRecommend() {
  elements.locationCityName.textContent = 'Locating...';
  elements.weatherConditionText.textContent = 'Analyzing atmospheric data...';

  state.weather = await fetchWeather(state.lat, state.lon, state.city);
  
  // Set mood on body for theme colors
  document.body.setAttribute('data-mood', state.weather.mood || 'sunny_warm');

  renderWeatherHero();
  updateRecommendation();
  renderHourlyTimeline();
  renderDailyForecast();
  renderTripPackingList();
}

// Render Weather Hero
function renderWeatherHero() {
  const w = state.weather;
  if (!w) return;

  elements.locationCityName.textContent = w.cityName;
  elements.weatherLocalTime.textContent = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  elements.mainTempDisplay.textContent = formatTemp(w.temp);
  elements.weatherIcon.textContent = w.conditionIcon;
  elements.weatherConditionText.textContent = w.condition;
  elements.feelsLikePill.textContent = `Feels like ${formatTemp(w.feelsLike)}`;

  elements.statHumidity.textContent = `${w.humidity}%`;
  elements.statWind.textContent = formatSpeed(w.windSpeed);
  
  const precipProb = (w.hourly && w.hourly[0]) ? w.hourly[0].precipProb : Math.round(w.precipitation * 100);
  elements.statPrecip.textContent = `${precipProb}%`;
  elements.statUV.textContent = `${w.maxUV}`;
}

// Update Outfit Recommendation
function updateRecommendation() {
  if (!state.weather) return;

  const rec = recommendOutfit(state.weather, state.preferences);
  state.currentRecommendation = rec;
  state.currentOutfit = rec.outfit;

  // Render Stylist compatibility & Thermal category
  elements.scoreBadge.textContent = `${rec.comfortScore}% Match`;
  elements.thermalBandText.textContent = rec.tempCategory.badge;

  const summary = `Tailored for ${state.preferences.style} in ${state.weather.cityName}. Effective temp around ${formatTemp(rec.effectiveTemp)} with ${rec.tempCategory.label}.`;
  elements.quickStylistSummary.textContent = summary;

  // Render Palette
  renderPalette(rec.palette);

  // Render Outfit Cards
  renderOutfitCards();

  // Render Accessories
  renderAccessories(rec.outfit.accessories);

  // Render Stylist Advice
  renderStylistAdvice(rec.stylistTips);
}

// Render Color Palette
function renderPalette(palette) {
  elements.paletteName.textContent = palette.name;
  elements.paletteDesc.textContent = palette.desc;
  elements.paletteSwatches.innerHTML = '';

  palette.colors.forEach(hex => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = hex;
    swatch.title = `Color: ${hex} (Click to copy)`;
    swatch.addEventListener('click', () => {
      navigator.clipboard.writeText(hex);
      showToast(`Copied color ${hex} to clipboard!`);
    });
    elements.paletteSwatches.appendChild(swatch);
  });
}

// Render Outfit Cards
function renderOutfitCards() {
  const outfit = state.currentOutfit;
  elements.outfitCardsContainer.innerHTML = '';

  const slots = [
    { key: 'outerwear', label: 'Outerwear / Layer', item: outfit.outerwear, options: outfit.outerwearOptions },
    { key: 'top', label: 'Top / Core Layer', item: outfit.top, options: outfit.topOptions },
    { key: 'bottom', label: 'Bottom / Trousers', item: outfit.bottom, options: outfit.bottomOptions },
    { key: 'footwear', label: 'Footwear / Shoes', item: outfit.footwear, options: outfit.footwearOptions }
  ];

  slots.forEach(slot => {
    // If outerwear is not needed, show a smart "No Outerwear Required" card
    if (slot.key === 'outerwear' && !slot.item) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'outfit-card';
      emptyCard.style.opacity = '0.75';
      emptyCard.innerHTML = `
        <div class="outfit-card-category">
          <span class="cat-pill">Outerwear</span>
          <span style="font-size: 0.72rem; color: var(--accent-primary);">Mild Weather</span>
        </div>
        <div class="outfit-icon-wrap" style="color: var(--text-dim);">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="20" stroke-dasharray="4 4"/><line x1="20" y1="20" x2="44" y2="44"/></svg>
        </div>
        <div class="outfit-info">
          <h3>No Coat Needed</h3>
          <p>The air is warm and comfortable. Save the extra layer for cooler evenings.</p>
        </div>
        <div class="outfit-card-footer">
          <span style="font-size: 0.75rem; color: var(--text-dim);">Warmth: 0/5</span>
          <button class="swap-btn" data-slot="outerwear">Add Layer +</button>
        </div>
      `;
      emptyCard.querySelector('.swap-btn').addEventListener('click', () => openSwapModal('outerwear'));
      elements.outfitCardsContainer.appendChild(emptyCard);
      return;
    }

    const item = slot.item;
    if (!item) return;

    const card = document.createElement('div');
    card.className = 'outfit-card';

    // Warmth dots (1 to 5)
    let warmthDotsHtml = '';
    for (let i = 1; i <= 5; i++) {
      warmthDotsHtml += `<div class="warmth-dot ${i <= item.warmthLevel ? 'active' : ''}"></div>`;
    }

    card.innerHTML = `
      <div class="outfit-card-category">
        <span class="cat-pill">${slot.label.split(' / ')[0]}</span>
        ${item.waterproof ? '<span class="badge-waterproof">💧 Rain Shield</span>' : ''}
      </div>
      <div class="outfit-icon-wrap">
        ${item.icon}
      </div>
      <div class="outfit-info">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
      </div>
      <div class="outfit-card-footer">
        <div class="warmth-indicator">
          <span>Warmth:</span>
          <div class="warmth-dots">${warmthDotsHtml}</div>
        </div>
        <button class="swap-btn" data-slot="${slot.key}">
          <span>Swap</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 10l5 5 5-5"/></svg>
        </button>
      </div>
    `;

    card.querySelector('.swap-btn').addEventListener('click', () => openSwapModal(slot.key));
    elements.outfitCardsContainer.appendChild(card);
  });
}

// Render Accessories
function renderAccessories(accessories) {
  elements.accessoriesListContainer.innerHTML = '';

  if (!accessories || accessories.length === 0) {
    elements.accessoriesListContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-dim);">No special weather gear required today. Travel light!</span>';
    return;
  }

  accessories.forEach(acc => {
    const chip = document.createElement('div');
    chip.className = 'accessory-item-chip';
    chip.innerHTML = `
      ${acc.icon}
      <span>${acc.name}</span>
    `;
    elements.accessoriesListContainer.appendChild(chip);
  });
}

// Render AI Stylist Advice
function renderStylistAdvice(tips) {
  elements.stylistAdviceContainer.innerHTML = '';
  tips.forEach(tip => {
    const card = document.createElement('div');
    card.className = 'advice-card';
    card.innerHTML = `
      <div class="advice-icon">${tip.icon}</div>
      <div class="advice-content">
        <h4>${tip.title}</h4>
        <p>${tip.text}</p>
      </div>
    `;
    elements.stylistAdviceContainer.appendChild(card);
  });
}

// Render 24-Hour Timeline
function renderHourlyTimeline() {
  elements.hourlyTimelineScroller.innerHTML = '';
  const hours = state.weather?.hourly || [];

  hours.forEach(h => {
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.innerHTML = `
      <span class="time">${h.hourLabel}</span>
      <span class="icon">${h.icon}</span>
      <span class="temp">${formatTemp(h.temp)}</span>
      <span class="rain">${h.precipProb > 0 ? h.precipProb + '%' : ''}</span>
    `;
    elements.hourlyTimelineScroller.appendChild(card);
  });
}

// Render 7-Day Forecast
function renderDailyForecast() {
  elements.dailyForecastList.innerHTML = '';
  const days = state.weather?.daily || [];

  days.forEach(d => {
    const row = document.createElement('div');
    row.className = 'forecast-row';
    row.innerHTML = `
      <span class="day">${d.dayName}</span>
      <div class="cond">
        <span>${d.icon}</span>
        <span>${d.label}</span>
      </div>
      <span class="temps">${formatTemp(d.maxTemp)} / ${formatTemp(d.minTemp)}</span>
    `;
    elements.dailyForecastList.appendChild(row);
  });
}

// Render Trip Packing List
function renderTripPackingList() {
  if (!state.weather?.daily) return;
  const result = generatePackingList(state.weather.daily, state.tripDays);
  const { packingList } = result;

  elements.packingListOutput.innerHTML = `
    <div style="font-size: 0.8rem; color: var(--accent-primary); margin-bottom: 6px; font-weight: 600;">
      Trip Climate Range: ${result.tripRange} ${result.anyRain ? '• 🌧️ Rain forecasted' : '• ☀️ Mostly dry'}
    </div>
  `;

  const allItems = [
    ...packingList.tops,
    ...packingList.bottoms,
    ...packingList.outerwear,
    ...packingList.footwear,
    ...packingList.accessories,
    ...packingList.essentials
  ];

  allItems.forEach(item => {
    const row = document.createElement('div');
    row.className = 'packing-item-row';
    row.innerHTML = `
      <span><strong>${item.qty}x</strong> ${item.name}</span>
      <span style="font-size: 0.75rem; color: var(--text-dim);">${item.note}</span>
    `;
    elements.packingListOutput.appendChild(row);
  });
}

// Swap Modal Logic
let activeSwapSlot = null;

function openSwapModal(slotKey) {
  activeSwapSlot = slotKey;
  elements.swapModalTitle.textContent = `Swap ${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`;
  elements.swapOptionsContainer.innerHTML = '';

  // Get all wardrobe items in this category matching gender & style if possible
  const items = WARDROBE_ITEMS.filter(i => {
    if (i.category !== slotKey) return false;
    if (state.preferences.gender !== 'all' && i.gender !== 'unisex' && i.gender !== state.preferences.gender) {
      return false;
    }
    return true;
  });

  items.forEach(item => {
    const isCurrent = state.currentOutfit[slotKey]?.id === item.id;
    const card = document.createElement('div');
    card.className = 'swap-option-card';
    if (isCurrent) card.style.borderColor = 'var(--accent-primary)';

    card.innerHTML = `
      ${item.icon}
      <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">${item.name}</h4>
      <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px;">${item.description}</p>
      <span style="font-size: 0.72rem; color: var(--accent-primary); font-weight: 600;">
        ${isCurrent ? '✓ Currently Wearing' : 'Select This Item'}
      </span>
    `;

    card.addEventListener('click', () => {
      state.currentOutfit[slotKey] = item;
      renderOutfitCards();
      closeModal(elements.swapModal);
      showToast(`Swapped to ${item.name}!`);
    });

    elements.swapOptionsContainer.appendChild(card);
  });

  elements.swapModal.classList.add('open');
}

// Modal helper
function closeModal(modal) {
  modal.classList.remove('open');
}

// Personal Wardrobe Checklist Manager
function openWardrobeManager() {
  elements.wardrobeManagerContainer.innerHTML = '';
  const ownedSet = state.preferences.ownedItemIds ? new Set(state.preferences.ownedItemIds) : null;

  WARDROBE_ITEMS.forEach(item => {
    const isChecked = ownedSet ? ownedSet.has(item.id) : true;
    const label = document.createElement('label');
    label.className = 'wardrobe-item-check';
    label.innerHTML = `
      <input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
      <div>
        <div style="font-weight: 600;">${item.name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: capitalize;">${item.category}</div>
      </div>
    `;

    label.querySelector('input').addEventListener('change', (e) => {
      saveWardrobeSelection();
    });

    elements.wardrobeManagerContainer.appendChild(label);
  });

  elements.wardrobeModal.classList.add('open');
}

function saveWardrobeSelection() {
  const checkboxes = elements.wardrobeManagerContainer.querySelectorAll('input[type="checkbox"]');
  const ids = [];
  checkboxes.forEach(cb => {
    if (cb.checked) ids.push(cb.getAttribute('data-id'));
  });
  state.preferences.ownedItemIds = ids;
  localStorage.setItem('aurawear_owned_items', JSON.stringify(ids));
  updateRecommendation();
}

// Saved Looks Manager
function saveCurrentLook() {
  const saved = JSON.parse(localStorage.getItem('aurawear_saved_looks') || '[]');
  const look = {
    id: Date.now(),
    date: new Date().toLocaleDateString(),
    city: state.weather?.cityName || 'Unknown',
    temp: formatTemp(state.weather?.temp),
    style: state.preferences.style,
    items: [
      state.currentOutfit.outerwear?.name,
      state.currentOutfit.top?.name,
      state.currentOutfit.bottom?.name,
      state.currentOutfit.footwear?.name
    ].filter(Boolean)
  };

  saved.unshift(look);
  localStorage.setItem('aurawear_saved_looks', JSON.stringify(saved));
  showToast('Outfit saved to your Favorites ⭐!');
}

function openSavedLooks() {
  const saved = JSON.parse(localStorage.getItem('aurawear_saved_looks') || '[]');
  elements.savedLooksContainer.innerHTML = '';

  if (saved.length === 0) {
    elements.savedLooksContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted);">No saved outfits yet. Click "Save Look" on any outfit you love!</p>';
  } else {
    saved.forEach(look => {
      const card = document.createElement('div');
      card.className = 'packing-item-row';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'flex-start';
      card.style.gap = '6px';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.82rem; font-weight: 700;">
          <span>${look.city} (${look.temp}) — ${look.style}</span>
          <span style="color: var(--text-dim);">${look.date}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${look.items.join(' • ')}</div>
      `;
      elements.savedLooksContainer.appendChild(card);
    });
  }

  elements.savedLooksModal.classList.add('open');
}

// Copy Checklist to Clipboard
function copyChecklist() {
  const outfit = state.currentOutfit;
  const list = [
    `👗 AuraWear Daily Outfit for ${state.weather?.cityName} (${formatTemp(state.weather?.temp)}, ${state.weather?.condition}):`,
    outfit.outerwear ? `• Outerwear: ${outfit.outerwear.name}` : null,
    outfit.top ? `• Top: ${outfit.top.name}` : null,
    outfit.bottom ? `• Bottom: ${outfit.bottom.name}` : null,
    outfit.footwear ? `• Footwear: ${outfit.footwear.name}` : null,
    outfit.accessories.length > 0 ? `• Accessories: ${outfit.accessories.map(a => a.name).join(', ')}` : null,
    `\nColor Palette: ${state.currentRecommendation?.palette.name}`
  ].filter(Boolean).join('\n');

  navigator.clipboard.writeText(list).then(() => {
    showToast('Outfit checklist copied to clipboard 📋!');
  });
}

// Ambient Audio Synthesizer (Zero External Files, 100% Web Audio API)
function toggleAmbientAudio() {
  if (state.audioPlaying) {
    if (state.audioContext) state.audioContext.close();
    state.audioPlaying = false;
    elements.ambientAudioBtn.innerHTML = '<span>🎵 Sound: Off</span>';
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    state.audioContext = ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink / White noise generator
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.1) * 0.05;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to simulate weather (rain vs wind)
    const filter = ctx.createBiquadFilter();
    const isRain = state.weather?.isRain;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isRain ? 1200 : 600, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(0);
    state.audioPlaying = true;
    elements.ambientAudioBtn.innerHTML = `<span>🔊 Sound: ${isRain ? 'Gentle Rain' : 'Soft Breeze'}</span>`;
  } catch (err) {
    console.warn('Audio synthesis failed:', err);
  }
}

// Ambient Background Particle Canvas
function initAmbientCanvas() {
  const canvas = elements.ambientCanvas;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 15 + 10,
      speedY: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1
    });
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);
    const isRain = state.weather?.isRain;
    const isSnow = state.weather?.isSnow;

    particles.forEach(p => {
      ctx.beginPath();
      if (isRain) {
        ctx.strokeStyle = `rgba(147, 197, 253, ${p.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 2, p.y + p.length);
        ctx.stroke();
        p.y += p.speedY * 2.5;
        p.x -= 0.6;
      } else if (isSnow) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.speedY * 0.6;
        p.x += Math.sin(p.y * 0.02) * 0.8;
      } else {
        // Floating gentle sun dust motes
        ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity * 0.4})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.y -= p.speedY * 0.2;
        p.x += Math.sin(p.y * 0.01) * 0.5;
      }

      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
    });

    requestAnimationFrame(renderParticles);
  }

  requestAnimationFrame(renderParticles);
}

// Setup Event Listeners
function setupEventListeners() {
  // City search input with debounced autocomplete
  let debounceTimer = null;
  elements.citySearchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const val = e.target.value;
    if (!val || val.length < 2) {
      elements.autocompleteDropdown.classList.remove('active');
      return;
    }

    debounceTimer = setTimeout(async () => {
      const results = await searchCities(val);
      renderAutocompleteDropdown(results);
    }, 280);
  });

  elements.citySearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstItem = elements.autocompleteDropdown.querySelector('.autocomplete-item');
      if (firstItem) firstItem.click();
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!elements.citySearchInput.contains(e.target) && !elements.autocompleteDropdown.contains(e.target)) {
      elements.autocompleteDropdown.classList.remove('active');
    }
  });

  // Geolocation button
  elements.geoBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          state.lat = pos.coords.latitude;
          state.lon = pos.coords.longitude;
          state.city = 'Current Location';
          await loadWeatherAndRecommend();
          showToast('Updated to your current location 📍');
        },
        () => showToast('Could not access GPS location. Please check browser permissions.')
      );
    }
  });

  // Unit toggle (°C / °F)
  elements.unitToggleBtn.addEventListener('click', () => {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    elements.unitLabel.textContent = `°${state.unit}`;
    localStorage.setItem('aurawear_unit', state.unit);
    renderWeatherHero();
    updateRecommendation();
    renderHourlyTimeline();
    renderDailyForecast();
    renderTripPackingList();
    showToast(`Switched units to °${state.unit}`);
  });

  // Sound toggle
  elements.ambientAudioBtn.addEventListener('click', toggleAmbientAudio);

  // Preference segmented controls
  elements.styleSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.styleSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.preferences.style = btn.getAttribute('data-style');
      updateRecommendation();
    });
  });

  elements.genderSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.genderSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.preferences.gender = btn.getAttribute('data-gender');
      updateRecommendation();
    });
  });

  elements.sensitivitySelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.sensitivitySelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.preferences.sensitivity = btn.getAttribute('data-sens');
      updateRecommendation();
    });
  });

  // Trip packing generator
  document.querySelectorAll('.trip-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trip-day-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tripDays = parseInt(btn.getAttribute('data-days'), 10);
      renderTripPackingList();
    });
  });

  elements.generatePackingBtn.addEventListener('click', () => {
    renderTripPackingList();
    showToast(`Generated ${state.tripDays}-day trip packing checklist!`);
  });

  // Wardrobe Modal
  elements.wardrobeModalBtn.addEventListener('click', openWardrobeManager);
  elements.closeWardrobeModalBtn.addEventListener('click', () => closeModal(elements.wardrobeModal));
  elements.selectAllClosetBtn.addEventListener('click', () => {
    elements.wardrobeManagerContainer.querySelectorAll('input').forEach(i => (i.checked = true));
    saveWardrobeSelection();
    showToast('All items added to your closet!');
  });
  elements.resetClosetBtn.addEventListener('click', () => {
    state.preferences.ownedItemIds = null;
    localStorage.removeItem('aurawear_owned_items');
    elements.wardrobeManagerContainer.querySelectorAll('input').forEach(i => (i.checked = true));
    updateRecommendation();
    showToast('Reset to default full wardrobe catalog!');
  });

  // Saved Looks Modal
  elements.savedLooksBtn.addEventListener('click', openSavedLooks);
  elements.closeSavedModalBtn.addEventListener('click', () => closeModal(elements.savedLooksModal));
  elements.saveOutfitBtn.addEventListener('click', saveCurrentLook);
  elements.copyChecklistBtn.addEventListener('click', copyChecklist);

  // Swap Modal close
  elements.closeSwapModalBtn.addEventListener('click', () => closeModal(elements.swapModal));

  // Close modals on overlay backdrop click
  [elements.swapModal, elements.wardrobeModal, elements.savedLooksModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });
}

function renderAutocompleteDropdown(results) {
  elements.autocompleteDropdown.innerHTML = '';
  if (results.length === 0) {
    elements.autocompleteDropdown.classList.remove('active');
    return;
  }

  results.forEach(city => {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.innerHTML = `
      <span class="city-name">${city.name}</span>
      <span class="city-country">${city.admin1 ? city.admin1 + ', ' : ''}${city.country}</span>
    `;

    div.addEventListener('click', async () => {
      state.city = `${city.name}`;
      state.lat = city.lat;
      state.lon = city.lon;
      elements.citySearchInput.value = city.name;
      elements.autocompleteDropdown.classList.remove('active');
      await loadWeatherAndRecommend();
      showToast(`Weather loaded for ${city.name} 🌤️`);
    });

    elements.autocompleteDropdown.appendChild(div);
  });

  elements.autocompleteDropdown.classList.add('active');
}

function loadStoredPreferences() {
  const unit = localStorage.getItem('aurawear_unit');
  if (unit) {
    state.unit = unit;
    elements.unitLabel.textContent = `°${unit}`;
  }

  const owned = localStorage.getItem('aurawear_owned_items');
  if (owned) {
    try {
      state.preferences.ownedItemIds = JSON.parse(owned);
    } catch (e) {}
  }
}

// Start
init();
