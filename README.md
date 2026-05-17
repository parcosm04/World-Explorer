# 🌍 World Explorer

A stunning, interactive web application that allows users to explore countries around the globe. Featuring a beautifully crafted, Apple-inspired monochromatic UI with glassmorphism effects, World Explorer provides deep insights into every country—ranging from economic metrics to air quality, Wikipedia summaries, and high-quality photography.

## ✨ Features

- **Interactive 3D Globe & Map**: Seamlessly navigate the world with custom map integrations and a responsive 3D globe.
- **Comprehensive Country Data**: Automatically aggregates and caches real-time data on:
  - Economy (GDP, Development Index, Population Growth from World Bank API)
  - Environment & Air Quality (OpenAQ API)
  - General Info (REST Countries API & Wikipedia Summaries)
- **Stunning Imagery**: Intelligent, context-aware image fetching using the Unsplash API and Wikipedia Commons (with a built-in image proxy to bypass hotlink restrictions).
- **Text-to-Speech (TTS)**: Listen to country descriptions with built-in TTS capabilities.
- **Premium UI/UX**: 
  - Apple-style monochromatic light palette
  - Fluid typography scaling across all devices
  - Glassmorphism UI panels and smooth micro-animations
  - Fully responsive CSS Grid and Flexbox layouts
- **Performance Optimized**: Built-in backend caching (`node-cache`) to ensure fast load times and minimize external API calls.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript
- **Backend**: Node.js, Express.js
- **Dependencies**: 
  - `axios` for robust API fetching
  - `cors` for cross-origin requests
  - `dotenv` for environment variable management
  - `node-cache` for efficient caching

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- An [Unsplash Developer API Key](https://unsplash.com/developers).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/parcosm04/World-Explorer.git
   cd World-Explorer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Unsplash Access Key:
   ```env
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
   ```

4. **Start the local server:**
   ```bash
   node server.js
   ```

5. **Open the app:**
   Open your browser and navigate to `http://localhost:3000`.

## 📂 Project Structure

```text
World-Explorer/
├── css/
│   ├── style.css       # Core design system and layout
│   └── country.css     # Styling for individual country pages
├── js/
│   ├── api.js          # Handles fetching data from the backend
│   ├── map.js          # Interactive map logic
│   ├── country.js      # Populates country data dynamically
│   ├── tts.js          # Text-to-speech functionality
│   ├── theme.js        # UI theme controls
│   └── particles.json  # Particle animation config
├── index.html          # Homepage / Main Globe View
├── country.html        # Detailed Country View page
├── map.html            # 2D Map Explorer
├── server.js           # Express Backend with API aggregation & caching
└── world.svg           # Scalable Vector Graphics map asset
```

## 📜 License
This project is open-source and available under the ISC License.