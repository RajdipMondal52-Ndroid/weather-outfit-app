// Outfit Recommendation Engine

import { WARDROBE_ITEMS, COLOR_PALETTES } from './wardrobeData.js';

export function recommendOutfit(weather, prefs = {}) {
  const {
    style = 'casual',
    gender = 'all',
    sensitivity = 'normal',
    ownedItemIds = null
  } = prefs;

  // Temperature sensitivity adjustment:
  // "runs cold" means user feels colder -> treat effective temp as lower
  // "runs hot" means user feels warmer -> treat effective temp as higher
  let sensitivityOffset = 0;
  if (sensitivity === 'runs_cold') sensitivityOffset = -3;
  if (sensitivity === 'runs_hot') sensitivityOffset = +3;

  const effectiveTemp = (weather.feelsLike !== undefined ? weather.feelsLike : weather.temp) + sensitivityOffset;
  const isRainy = weather.isRain || (weather.precipitation > 0.1);
  const isSnowy = weather.isSnow;
  const isHighWind = weather.windSpeed > 24;
  const isHighUV = (weather.maxUV >= 5);
  const isHumid = weather.humidity > 70;

  // Filter pool by owned items if specified
  let pool = WARDROBE_ITEMS;
  if (ownedItemIds && ownedItemIds.length > 0) {
    const ownedSet = new Set(ownedItemIds);
    pool = WARDROBE_ITEMS.filter(item => ownedSet.has(item.id));
    if (pool.length === 0) pool = WARDROBE_ITEMS; // fallback if empty
  }

  // Filter helper
  function findBestItem(category, criteria = {}) {
    const candidates = pool.filter(item => {
      if (item.category !== category) return false;
      
      // Gender filter
      if (gender !== 'all' && item.gender !== 'unisex' && item.gender !== gender) {
        return false;
      }

      // Check temperature range
      const [minT, maxT] = item.tempRange;
      const tempMatches = effectiveTemp >= (minT - 3) && effectiveTemp <= (maxT + 3);

      return tempMatches;
    });

    if (candidates.length === 0) {
      // Relax temperature constraint if no direct matches
      const relaxed = pool.filter(item => item.category === category);
      return relaxed.length > 0 ? relaxed[0] : null;
    }

    // Score candidates based on style, rain, wind
    const scored = candidates.map(item => {
      let score = 0;
      // Style match bonus
      if (item.styles.includes(style)) score += 5;
      
      // Rain protection
      if (isRainy && item.waterproof) score += 8;
      if (!isRainy && item.waterproof && effectiveTemp > 18) score -= 2; // don't overdress in plastic raincoat if sunny

      // Wind protection
      if (isHighWind && item.windproof) score += 4;

      // Distance to ideal temp midpoint
      const mid = (item.tempRange[0] + item.tempRange[1]) / 2;
      score -= Math.abs(effectiveTemp - mid) * 0.4;

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
  }

  // Determine which layers are needed based on temperature
  // Outerwear: Needed if effectiveTemp < 18°C or if it's raining/snowing/windy
  let outerwearNeeded = effectiveTemp < 18 || (isRainy && effectiveTemp < 22) || (isHighWind && effectiveTemp < 19);
  
  const topList = findBestItem('top');
  const bottomList = findBestItem('bottom');
  const footwearList = findBestItem('footwear');
  const outerwearList = outerwearNeeded ? findBestItem('outerwear') : [];
  const headwearList = findBestItem('headwear');
  const accessoryList = pool.filter(i => i.category === 'accessories');

  // Specific accessory logic:
  const selectedAccessories = [];

  // Umbrella logic:
  const hasRainRisk = isRainy || (weather.hourly && weather.hourly.some(h => h.precipProb > 35));
  if (hasRainRisk) {
    const umbrella = accessoryList.find(i => i.id === 'compact-windproof-umbrella');
    if (umbrella) selectedAccessories.push(umbrella);
  }

  // Sunglasses logic:
  if (isHighUV || (!isRainy && weather.isDay && effectiveTemp > 14)) {
    const shades = accessoryList.find(i => i.id === 'polarized-sunglasses');
    if (shades) selectedAccessories.push(shades);
  }

  // Scarf & Gloves for freezing weather:
  if (effectiveTemp < 4) {
    const scarf = accessoryList.find(i => i.id === 'cashmere-scarf');
    const gloves = accessoryList.find(i => i.id === 'touchscreen-gloves');
    if (scarf && !selectedAccessories.includes(scarf)) selectedAccessories.push(scarf);
    if (gloves && !selectedAccessories.includes(gloves)) selectedAccessories.push(gloves);
  }

  // Day to night temperature swing check
  let tempSwing = 0;
  if (weather.daily && weather.daily[0]) {
    tempSwing = weather.daily[0].maxTemp - weather.daily[0].minTemp;
  }
  if (tempSwing > 8 && !outerwearNeeded && effectiveTemp > 17 && effectiveTemp < 25) {
    const tote = accessoryList.find(i => i.id === 'canvas-tote-bag');
    if (tote && !selectedAccessories.includes(tote)) selectedAccessories.push(tote);
  }

  // Headwear selection:
  let selectedHeadwear = null;
  if (effectiveTemp < 7) {
    selectedHeadwear = headwearList.find(i => i.id === 'wool-ribbed-beanie') || headwearList[0];
  } else if (isHighUV && effectiveTemp > 24) {
    selectedHeadwear = headwearList.find(i => i.id === 'wide-brim-straw-hat') || headwearList[0];
  } else if (isHighUV || effectiveTemp > 20) {
    selectedHeadwear = headwearList.find(i => i.id === 'baseball-cap') || headwearList[0];
  }

  // Final outfit selections with fallback alternatives
  const currentOutfit = {
    outerwear: outerwearList[0] || null,
    outerwearOptions: outerwearList,
    top: topList[0] || pool.find(i => i.category === 'top'),
    topOptions: topList,
    bottom: bottomList[0] || pool.find(i => i.category === 'bottom'),
    bottomOptions: bottomList,
    footwear: footwearList[0] || pool.find(i => i.category === 'footwear'),
    footwearOptions: footwearList,
    headwear: selectedHeadwear,
    headwearOptions: headwearList,
    accessories: selectedAccessories
  };

  // Generate Stylist Advice and Breakdown
  const stylistTips = generateStylistAdvice({
    weather,
    effectiveTemp,
    isRainy,
    isSnowy,
    isHighWind,
    isHighUV,
    isHumid,
    tempSwing,
    style,
    sensitivity
  });

  // Calculate Comfort Rating (out of 100)
  let comfortScore = 95;
  if (isRainy && currentOutfit.footwear && !currentOutfit.footwear.waterproof) comfortScore -= 12;
  if (isRainy && !selectedAccessories.some(a => a.id === 'compact-windproof-umbrella')) comfortScore -= 10;
  if (effectiveTemp < 5 && !currentOutfit.outerwear) comfortScore -= 25;
  if (effectiveTemp > 28 && currentOutfit.top && currentOutfit.top.warmthLevel > 2) comfortScore -= 15;
  comfortScore = Math.max(72, Math.min(99, comfortScore));

  // Determine Palette
  let paletteKey = 'mild_spring';
  if (isSnowy || effectiveTemp < 5) paletteKey = 'cold_crisp';
  else if (isRainy) paletteKey = 'rainy_mist';
  else if (effectiveTemp > 26) paletteKey = 'hot_summer';
  else if (effectiveTemp > 18) paletteKey = 'sunny_warm';

  return {
    outfit: currentOutfit,
    effectiveTemp,
    comfortScore,
    palette: COLOR_PALETTES[paletteKey] || COLOR_PALETTES.mild_spring,
    stylistTips,
    tempCategory: getTempCategory(effectiveTemp)
  };
}

function getTempCategory(t) {
  if (t < 0) return { label: 'Freezing Sub-Zero', badge: '❄️ Extreme Cold', color: 'text-blue-400' };
  if (t < 10) return { label: 'Brisk & Chilly', badge: '🧥 Heavy Layers', color: 'text-cyan-400' };
  if (t < 18) return { label: 'Cool & Crisp', badge: '🍂 Light Jacket', color: 'text-amber-400' };
  if (t < 24) return { label: 'Mild & Pleasant', badge: '✨ Perfect Weather', color: 'text-emerald-400' };
  if (t < 30) return { label: 'Warm & Balmy', badge: '☀️ Breathable Cuts', color: 'text-orange-400' };
  return { label: 'Hot & Searing', badge: '🔥 High Heat Alert', color: 'text-rose-500' };
}

function generateStylistAdvice({ weather, effectiveTemp, isRainy, isSnowy, isHighWind, isHighUV, isHumid, tempSwing, style, sensitivity }) {
  const tips = [];

  // Thermal advice
  if (effectiveTemp < 0) {
    tips.push({
      icon: '❄️',
      title: 'Deep Freeze Layering',
      text: 'Insulate your core! Wear a thermal base layer, keep extremities (ears, fingers) covered, and zip parkas past your chin to prevent wind chills.'
    });
  } else if (effectiveTemp < 10) {
    tips.push({
      icon: '🧣',
      title: 'Brisk Temperature',
      text: `With feels-like temperature around ${effectiveTemp}°C, structured wool or a warm puffer will keep you snug while looking sharp.`
    });
  } else if (effectiveTemp < 18) {
    tips.push({
      icon: '🧥',
      title: 'Transitional Dressing',
      text: 'Mild morning chill turns comfortable in the sun. A versatile outer layer (trench coat, bomber, or leather jacket) is your MVP.'
    });
  } else if (effectiveTemp > 28) {
    tips.push({
      icon: '🪭',
      title: 'Beat the Heat',
      text: 'Stick to unrestrictive, loose weaves like 100% linen and cotton. Avoid heavy synthetics that trap sweat and humidity.'
    });
  }

  // Rain advice
  if (isRainy) {
    tips.push({
      icon: '☔',
      title: 'Rain Protection',
      text: 'Showers are active or incoming. Leave raw suede shoes at home and opt for treated leather or water-resistant footwear and a storm umbrella.'
    });
  }

  // High wind advice
  if (isHighWind) {
    tips.push({
      icon: '💨',
      title: `Gusts up to ${weather.windGusts || weather.windSpeed} km/h`,
      text: 'Strong winds can turn mild air crisp and catch loose hats or fluttering dresses. Choose structured jackets and fitted silhouettes.'
    });
  }

  // UV Alert
  if (isHighUV) {
    tips.push({
      icon: '☀️',
      title: `High UV Index (${weather.maxUV})`,
      text: 'UV radiation peaks between 11 AM and 3 PM. Remember sunglasses with UV400 lenses and SPF 30+ sunscreen on exposed skin.'
    });
  }

  // Daily Swing Advice
  if (tempSwing > 8) {
    tips.push({
      icon: '🔄',
      title: `${tempSwing}°C Day-to-Night Swing`,
      text: 'Noticeable gap between daily high and low. Dressing in peelable layers lets you transition seamlessly without sweating or shivering.'
    });
  }

  // Personal sensitivity note
  if (sensitivity === 'runs_cold') {
    tips.push({
      icon: '🌡️',
      title: 'Personalized: Runs Cold',
      text: 'We factored in +3°C extra warmth buffer so your recommendation keeps you thoroughly cozy.'
    });
  } else if (sensitivity === 'runs_hot') {
    tips.push({
      icon: '🌬️',
      title: 'Personalized: Runs Warm',
      text: 'We prioritized lighter, high-airflow garments to keep you from overheating on the move.'
    });
  }

  return tips;
}

// Generate Trip Packing List
export function generatePackingList(dailyForecast, days = 3) {
  const selectedDays = dailyForecast.slice(0, days);
  const minTemp = Math.min(...selectedDays.map(d => d.minTemp));
  const maxTemp = Math.max(...selectedDays.map(d => d.maxTemp));
  const anyRain = selectedDays.some(d => d.rainProb > 30);
  const anyHighUV = selectedDays.some(d => d.uvMax >= 5);

  const packingList = {
    essentials: [
      { name: 'Underwear & Socks', qty: days + 1, note: 'Always pack 1 extra day backup' },
      { name: 'Sleepwear / Pajamas', qty: 1, note: 'Light cotton set' }
    ],
    tops: [
      { name: maxTemp > 22 ? 'Short-Sleeve Tees / Linen Shirts' : 'Tees / Long Sleeves', qty: days, note: 'Day-to-day base tops' }
    ],
    bottoms: [
      { name: 'Versatile Trousers / Jeans', qty: Math.min(2, days), note: 'Pairs with all selected tops' }
    ],
    outerwear: [],
    footwear: [
      { name: anyRain ? 'Waterproof Chelsea Boots / GORE-TEX' : 'Comfortable Walking Sneakers', qty: 1, note: 'Wear on journey to save luggage space' }
    ],
    accessories: []
  };

  if (maxTemp > 24) {
    packingList.bottoms.push({ name: 'Chino / Linen Shorts or Skirt', qty: 1, note: 'For warm sunny days' });
  }

  if (minTemp < 15 || anyRain) {
    packingList.outerwear.push({
      name: anyRain ? 'Packable Rain Jacket / Trench Coat' : 'Light Bomber or Denim Jacket',
      qty: 1,
      note: 'Crucial for morning/evening shifts'
    });
  }

  if (minTemp < 5) {
    packingList.outerwear.push({ name: 'Heavy Down Parka / Overcoat', qty: 1, note: 'For winter temperatures' });
    packingList.accessories.push({ name: 'Beanie, Scarf & Thermal Gloves', qty: 1, note: 'Frost protection' });
  }

  if (anyRain) {
    packingList.accessories.push({ name: 'Travel Compact Umbrella', qty: 1, note: 'Fits easily in daypack' });
  }

  if (anyHighUV) {
    packingList.accessories.push({ name: 'UV Sunglasses & Sunscreen 50ml', qty: 1, note: 'TSA-friendly travel size' });
  }

  return {
    tripRange: `${minTemp}°C to ${maxTemp}°C`,
    anyRain,
    packingList
  };
}
