# 🌤️ AuraWear — Smart Weather & Outfit Stylist

A modern, responsive web application that intelligently recommends what outfit to wear based on real-time weather conditions, temperature, precipitation risk, wind chill, and UV index.

---

## ✨ Features

1. **Live Real-Time Weather Integration**:
   - Free, keyless global weather via Open-Meteo API.
   - Live city search with debounced autocomplete for any city worldwide.
   - 1-click GPS Geolocation detection.
   - Temperature, "feels-like" apparent temperature, wind speed & gusts, humidity, rain chance, and peak UV index.
   - Graceful offline fallback mode so the app works seamlessly even without an internet connection.

2. **Intelligent Layering & Outfit Engine**:
   - **Climate bands**: Freezing Sub-zero (<0°C), Cold (0–10°C), Cool (10–18°C), Mild (18–24°C), Warm (24–30°C), Hot (>30°C).
   - **Precipitation safeguards**: Automatically equips water-resistant boots, packable storm umbrellas, and waterproof shells when rain is expected.
   - **Wind & UV protection**: Recommends windbreakers, structured silhouettes, UV400 polarized sunglasses, and wide-brim sun hats based on live wind and UV index readings.
   - **Day-to-night temperature swing awareness**: Alerts you when mornings/nights differ by >8°C from midday peaks with layer-packing tips.

3. **Personalization & Occasions**:
   - **Occasion styles**: Casual, Smart Casual, Formal / Office, Activewear, Loungewear.
   - **Wardrobe vibe**: Neutral / All, Menswear, Womenswear.
   - **Personal temperature sensitivity**: "I run cold" (+3°C thermal buffer), "Normal", "I run hot" (-3°C breathability priority).
   - **Unit toggle**: Seamless conversion between Celsius (°C) and Fahrenheit (°F).

4. **Interactive Dressing Canvas**:
   - Clean vector icon representations for Outerwear, Tops, Bottoms, Footwear, and Accessories.
   - **Interactive Swap**: Don't like an item? Click **"Swap"** to choose from alternative pieces curated for today's weather.
   - **Weather Palette**: Curated 4-color aesthetic matching the day's mood (click any swatch to copy hex code).
   - **AI Stylist Score & Analysis**: Detailed breakdown explaining the exact thermal science and styling tips.

5. **24-Hour Timeline & Trip Packing Assistant**:
   - Hourly forecast timeline with temperature and precipitation likelihood.
   - Multi-day trip packing checklist generator (3-day weekend, 5-day, or 7-day trip).

6. **Wardrobe & Favorite Outfits**:
   - **"My Closet" Wardrobe Manager**: Check off items you actually own so recommendations only pick pieces in your closet.
   - **Save Look**: Bookmark favorite looks with 1-click.
   - **Copy Checklist**: Copy today's complete outfit to your clipboard for quick packing or dressing.
   - **Native Ambient Weather Audio**: Synthesizes relaxing rain or soft wind breeze sounds using Web Audio API (no external audio files needed).

---

## 🚀 How to Run

Because AuraWear is built with modern ES6 modules, CSS3, and HTML5, you can run it with any local static web server or open it directly in your browser.

### Option 1: Quick PowerShell Local Server (Built into Windows)
Run the following in PowerShell from this directory:
```powershell
python -m http.server 8000
# or with npx serve:
npx serve .
```
Or start a simple PowerShell HTTP listener or launch Edge/Chrome:
```powershell
Start-Process "msedge" "http://localhost:8000"
```

### Option 2: Launch Directly in Microsoft Edge / Google Chrome
You can also launch `index.html` directly in Edge or Chrome:
```powershell
Start-Process "msedge" "C:\Users\monda\.gemini\antigravity\scratch\weather-outfit-app\index.html"
```
*(Note: To enable ES module imports locally without CORS restrictions, running via a local server or Edge with `--allow-file-access-from-files` is recommended).*

---

## 🛠️ Inspecting with Chrome DevTools (`@[plugin:chrome-devtools-plugin]`)

- Open Chrome DevTools (`F12` or `Ctrl + Shift + I`).
- Use the **Device Mode** (`Ctrl + Shift + M`) to test mobile responsiveness.
- Use the **Console** and **Network** tabs to inspect Open-Meteo API requests and see the computed thermal scores and layer selections in real-time.
