document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const nameParam = urlParams.get('name');

    if (!code && !nameParam) {
        document.body.innerHTML = '<div class="flex items-center justify-center h-screen"><h1 class="text-3xl text-white">No country selected. Return to map.</h1></div>';
        return;
    }

    try {
        let countryName = nameParam;

        // Resolve code to name if needed
        if (!countryName && code) {
            const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
            const data = await res.json();
            countryName = data[0].name.common;
        }

        const aggregatedData = await window.DataAPI.getAggregatedCountryData(countryName);
        if (!aggregatedData) throw new Error("Could not fetch aggregated data");

        populateDashboard(aggregatedData);

        // Hide overlay smoothly
        setTimeout(() => {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            }
        }, 800);

    } catch (err) {
        console.error("Dashboard Init Error:", err);
        document.getElementById('loading-overlay').innerHTML = `
            <span class="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
            <p class="text-white text-xl">Failed to load country data.</p>
            <a href="index.html" class="mt-6 px-6 py-2 bg-emerald-bright rounded-full text-white">Return to Map</a>
        `;
    }
}

// Global truncation helper
function truncateText(text, limit) {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
}

// Photographer Attribution helper
function getAttribution(name) {
    return `<p class="absolute top-4 right-4 text-[10px] bg-black/60 text-white/80 px-3 py-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 font-sans pointer-events-none shadow-lg">Photo by ${name}</p>`;
}

// Number Counter Animation
function animateValue(obj, start, end, duration, formatStr = false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let val = Math.floor(progress * (end - start) + start);
        if (formatStr) {
            obj.innerHTML = val.toLocaleString();
        } else {
            obj.innerHTML = val;
        }
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function formatLargeNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function populateDashboard(data) {
    const { overview, economy, eco, images } = data;

    // 1. Hero
    document.title = `World Explorer | ${overview.name.common}`;
    document.getElementById('hero-title').innerText = overview.name.common;
    document.getElementById('hero-capital').innerText = overview.capital ? overview.capital[0] : 'N/A';
    document.getElementById('hero-region').innerText = overview.region || 'World';
    document.getElementById('hero-pop').innerText = formatLargeNumber(overview.population);

    if (overview.flags && overview.flags.svg) {
        document.querySelector('#hero-flag img').src = overview.flags.svg;
    }

    if (overview.wiki_description) {
        const descEl = document.getElementById('hero-description');
        descEl.innerText = truncateText(overview.wiki_description, 250);
        descEl.classList.remove('hidden');
    }

    if (images.places && images.places.length > 0) {
        document.getElementById('hero-bg').style.backgroundImage = `url('${images.places[0].image_url}')`;
    }

    // 2. Overview Stats
    const areaEl = document.getElementById('stat-area');
    animateValue(areaEl, 0, overview.area, 2000, true);

    const currencyKey = overview.currencies ? Object.keys(overview.currencies)[0] : null;
    document.getElementById('stat-currency').innerHTML = currencyKey
        ? `${overview.currencies[currencyKey].name} <span class="text-emerald-bright font-mono text-xl">(${overview.currencies[currencyKey].symbol || currencyKey})</span>`
        : 'N/A';

    document.getElementById('stat-languages').innerText = overview.languages ? Object.values(overview.languages).join(', ') : 'N/A';

    let borderString = "None";
    if (overview.borders && overview.borders.length > 0) {
        if (window.mapDataMap) {
            const names = overview.borders.map(b => {
                const country = window.mapDataMap.get(b.toLowerCase());
                return country && country.name && country.name.common ? country.name.common : b;
            });
            borderString = names.join(', ');
        } else {
            borderString = overview.borders.join(', ');
        }
    }

    const statBordersEl = document.getElementById('stat-borders');
    statBordersEl.innerText = borderString;
    statBordersEl.classList.remove('text-5xl');
    statBordersEl.classList.add('text-2xl', 'break-words', 'leading-tight');

    // 3. Economy Dashboard
    document.getElementById('eco-gdp-abs').innerText = economy.gdp !== "N/A" && economy.gdp !== null ? `$${formatLargeNumber(economy.gdp)}` : "N/A";
    document.getElementById('eco-gdp').innerText = economy.gdp_growth;
    document.getElementById('eco-pop').innerText = economy.pop_growth;

    const hdiVal = parseFloat(economy.development_index);
    document.getElementById('eco-hdi-val').innerText = isNaN(hdiVal) ? 'N/A' : hdiVal.toFixed(3);

    // Gauge Animation
    setTimeout(() => {
        const circle = document.getElementById('eco-hdi-circle');
        if (circle && !isNaN(hdiVal)) {
            // Circumference of r=42 is ~263.89
            // offset = circumference - (percent * circumference)
            const percent = hdiVal; // HDI is 0 to 1
            const circumference = 263.89;
            circle.style.strokeDashoffset = circumference - (percent * circumference);
        }
    }, 1000);

    // 4. Eco Indicators
    document.getElementById('eco-aqi').innerText = eco.pm25;
    setTimeout(() => {
        const aqiBar = document.getElementById('eco-aqi-bar');
        if (aqiBar && eco.pm25 !== "N/A") {
            // max realistic pm25 is around 300 for calculation
            let pct = (parseFloat(eco.pm25) / 300) * 100;
            if (pct > 100) pct = 100;
            aqiBar.style.width = `${pct}%`;
            if (pct > 50) aqiBar.classList.replace('bg-emerald-bright', 'bg-red-400');
            else if (pct > 25) aqiBar.classList.replace('bg-emerald-bright', 'bg-yellow-400');
        }
    }, 1000);

    document.getElementById('eco-forest').innerText = eco.forest_coverage;
    document.getElementById('eco-carbon').innerText = eco.carbon_emissions;

    // Gallery Renderers
    renderPlaces(images.places || []);
    renderCuisine(images.cuisine || []);
    renderFlora(images.flora || []);
    renderFauna(images.fauna || []);
    renderCulture(images.culture || []);
    renderLandmarks(images.landmarks || []);
}

function renderPlaces(items) {
    const container = document.getElementById('places-container');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="glass-card text-center p-10 w-full snap-center"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">image_not_supported</span><p class="text-slate-500">Visual data unavailable.</p></div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="min-w-[85vw] sm:min-w-[400px] aspect-[4/3] relative group overflow-hidden rounded-[2rem] shadow-floating cursor-pointer snap-center border border-white/5">
            ${getAttribution(item.photographer_name)}
            <img alt="${item.title}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-1000" src="${item.image_url}">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 p-8 w-full pointer-events-none">
                <h4 class="text-white font-heading font-bold text-2xl md:text-3xl mb-2 line-clamp-1">${item.title}</h4>
                <p class="text-slate-300 font-display text-sm line-clamp-2">${truncateText(item.description, 100)}</p>
            </div>
        </div>
    `).join('');
}

function renderCuisine(items) {
    const container = document.getElementById('cuisine-container');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="glass-card text-center p-10 w-full"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">restaurant</span><p class="text-slate-500">Gastronomy data unavailable.</p></div>`;
        return;
    }

    // Duplicate array perfectly for infinite marquee scroll
    const combined = [...items, ...items, ...items];

    container.innerHTML = combined.map(item => `
        <div class="w-[250px] relative group overflow-hidden rounded-[1.5rem] shadow-lg cursor-pointer flex-shrink-0 border border-white/5">
            ${getAttribution(item.photographer_name)}
            <div class="aspect-square relative flex items-end">
                <img alt="${item.title}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="${item.image_url}">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"></div>
                <div class="relative z-10 p-5 pointer-events-none w-full">
                    <h4 class="font-heading font-bold text-xl text-white line-clamp-1 mb-1 shadow-black drop-shadow-md">${item.title}</h4>
                </div>
            </div>
        </div>
    `).join('');
}

function renderFlora(items) {
    const container = document.getElementById('flora-container');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="glass-card text-center p-10 w-full col-span-full"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">local_florist</span><p class="text-slate-500">Botanical data unavailable.</p></div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="glass-card rounded-[2rem] p-4 flex flex-col group hover:-translate-y-2 transition-transform duration-500 shadow-floating relative cursor-pointer">
            ${getAttribution(item.photographer_name)}
            <div class="w-full aspect-square rounded-[1.5rem] overflow-hidden mb-5">
                <img alt="${item.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${item.image_url}">
            </div>
            <div class="px-2 pb-2">
                <h4 class="text-xl font-bold font-heading dark:text-white mb-2 line-clamp-1">${item.title}</h4>
                <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">${truncateText(item.description, 90)}</p>
            </div>
        </div>
    `).join('');
}

function renderFauna(items) {
    const container = document.getElementById('fauna-container');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="glass-card text-center p-10 w-full snap-center"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">pets</span><p class="text-slate-500">Fauna data unavailable.</p></div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="min-w-[85vw] sm:min-w-[320px] aspect-[3/4] relative group overflow-hidden rounded-[2rem] shadow-floating flex-shrink-0 snap-center">
            ${getAttribution(item.photographer_name)}
            <img alt="${item.title}" class="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" src="${item.image_url}">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div class="absolute bottom-0 left-0 p-8 w-full pointer-events-none transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <span class="text-sand-gold font-mono text-[10px] uppercase tracking-widest mb-3 block">Native Wildlife</span>
                <h4 class="text-3xl font-heading font-bold text-white mb-2 line-clamp-1">${item.title}</h4>
            </div>
        </div>
    `).join('');
}

function renderCulture(items) {
    const container = document.getElementById('culture-container');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="glass-card text-center p-10 w-full"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">festival</span><p class="text-slate-500">Cultural data unavailable.</p></div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="masonry-item relative group overflow-hidden rounded-[2rem] shadow-floating bg-black/10 cursor-pointer">
            ${getAttribution(item.photographer_name)}
            <img alt="${item.title}" class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" src="${item.image_url}">
            <div class="absolute inset-0 bg-gradient-to-t from-background-dark/95 via-background-dark/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-8 flex flex-col justify-end pointer-events-none">
                <div class="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span class="bg-emerald-bright/90 w-fit px-3 py-1 rounded-full text-[10px] text-white font-mono mb-4 block shadow-lg uppercase tracking-wider">Tradition</span>
                    <h4 class="text-2xl font-bold font-heading text-white mb-3 tracking-tight">${item.title}</h4>
                    <p class="text-slate-300 text-sm line-clamp-3 leading-relaxed">${truncateText(item.description, 140)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderLandmarks(items) {
    const container = document.getElementById('landmarks-container');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = `<div class="glass-card text-center p-10 w-full col-span-full"><span class="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance</span><p class="text-slate-500">Landmark data unavailable.</p></div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="aspect-square relative group overflow-hidden border border-white/5 rounded-2xl shadow-floating cursor-pointer">
            ${getAttribution(item.photographer_name)}
            <img alt="${item.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${item.image_url}">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
    `).join('');
}
