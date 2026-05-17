// State variables
let countriesData = [];
let map = null;
let hoveredStateId = null;
let mapDataMap = new Map(); // CCA3 -> country object

// DOM Elements
const searchInput = document.getElementById('country-search');
const suggestionsBox = document.getElementById('search-suggestions');
const tooltip = document.getElementById('map-tooltip');
const infoPanel = document.getElementById('info-panel');
const panelOverlay = document.getElementById('panel-overlay');
const loading = document.getElementById('loading');
const filters = document.querySelectorAll('.filter-btn');

document.addEventListener('DOMContentLoaded', async () => {
    init3DGlobe();

    try {
        if (!document.getElementById('world-map')) return;

        // 1. Fetch REST Countries Data via API Module
        const data = await window.DataAPI.getAllCountries();
        countriesData = data;

        // Populate cache map for easy lookup
        countriesData.forEach(c => {
            if (c.cca3) mapDataMap.set(c.cca3.toLowerCase(), c);
            if (c.name && c.name.common) mapDataMap.set(c.name.common.toLowerCase(), c);
        });

        // 2. Initialize MapLibre GL
        const isDark = document.documentElement.classList.contains('dark');
        const oceanColor = isDark ? '#1a2332' : '#e2e8f0'; // Base ocean colors based on theme

        function getAdaptiveMinZoom() {
            // Formula to ensure the map's width at minZoom is >= window's width
            // 512px is the base tile size.
            return Math.max(Math.log2(window.innerWidth / 512), 0);
        }

        const adaptiveZoom = getAdaptiveMinZoom();

        map = new maplibregl.Map({
            container: 'world-map',
            style: {
                version: 8,
                sources: {},
                layers: [{
                    id: 'background',
                    type: 'background',
                    paint: { 'background-color': 'transparent' } // Keep transparent to use CSS map-container-bg
                }]
            },
            center: [0, 20],
            zoom: Math.max(adaptiveZoom, 1.5),
            minZoom: adaptiveZoom,
            maxZoom: 10,
            renderWorldCopies: true // Enables infinite horizontal scrolling
        });

        window.addEventListener('resize', () => {
            if (map) {
                map.setMinZoom(getAdaptiveMinZoom());
            }
        });

        // Add Navigation Control (Zoom in/out buttons)
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
            if (loading) loading.style.display = 'none';

            // Add GeoJSON Source
            map.addSource('countries', {
                type: 'geojson',
                data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
                generateId: true // Required to use feature-state for hover/highlight
            });

            // Add Fill Layer
            map.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                layout: {},
                paint: {
                    'fill-color': [
                        'case',
                        ['boolean', ['feature-state', 'highlighted'], false], '#D4A373', // Search highlight
                        ['boolean', ['feature-state', 'hover'], false], '#D4A373', // Hover highlight
                        '#3A5A40' // Default Emerald green
                    ],
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'dimmed'], false], 0.2, // Continent filter dimming
                        0.8 // Default opacity
                    ]
                }
            });

            // Add Border Layer
            map.addLayer({
                id: 'country-borders',
                type: 'line',
                source: 'countries',
                layout: {},
                paint: {
                    'line-color': '#2B2B2B',
                    'line-width': 1
                }
            });

            initInteractions();
        });

    } catch (err) {
        if (loading) loading.innerText = "Error loading map or data: " + err.message;
        console.error(err);
    }
});

// Scroll to Map from Hero
window.scrollToMap = () => {
    document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
};

// Map interactions & Events setup
function initInteractions() {
    if (!map) return;

    // Hover effect
    map.on('mousemove', 'country-fills', (e) => {
        if (e.features.length > 0) {
            const newHoveredId = e.features[0].id;
            const isNewHover = hoveredStateId !== newHoveredId;
            
            if (hoveredStateId !== null && isNewHover) {
                map.setFeatureState({ source: 'countries', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = newHoveredId;
            map.setFeatureState({ source: 'countries', id: hoveredStateId }, { hover: true });

            const cca3 = e.features[0].properties['ISO3166-1-Alpha-3'];
            if (cca3) {
                const country = mapDataMap.get(cca3.toLowerCase());
                if (country) {
                    tooltip.innerText = country.name.common;
                    tooltip.classList.remove('hidden');
                    tooltip.style.left = (e.originalEvent.pageX + 15) + 'px';
                    tooltip.style.top = (e.originalEvent.pageY + 15) + 'px';
                    
                    if (isNewHover && window.TTS && window.TTS.isEnabled) {
                        window.TTS.speak(country.name.common);
                    }
                }
            }
            map.getCanvas().style.cursor = 'pointer';
        }
    });

    map.on('mouseleave', 'country-fills', () => {
        if (hoveredStateId !== null) {
            map.setFeatureState({ source: 'countries', id: hoveredStateId }, { hover: false });
        }
        hoveredStateId = null;
        tooltip.classList.add('hidden');
        map.getCanvas().style.cursor = '';
    });

    // Click to Open Panel
    map.on('click', 'country-fills', (e) => {
        if (e.features.length > 0) {
            const cca3 = e.features[0].properties['ISO3166-1-Alpha-3'];
            if (cca3) {
                const country = mapDataMap.get(cca3.toLowerCase());
                if (country) {
                    openPanel(country);
                }
            }
        }
    });

    // Setup Continent Filters
    filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filters.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            const targetContinent = btn.getAttribute('data-continent');
            filterMap(targetContinent);
        });
    });

    // Setup Search safely
    if (searchInput && suggestionsBox) {
        searchInput.addEventListener('input', handleSearch);
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.classList.add('hidden');
            }
        });
    }
}

// Map Continent Filter
function filterMap(targetContinent) {
    if (!map) return;

    // We map every feature, dimming ones that don't match the continent
    const features = map.querySourceFeatures('countries');

    // This requires resetting state for all
    features.forEach(f => {
        map.setFeatureState({ source: 'countries', id: f.id }, { dimmed: false });
        const cca3 = f.properties['ISO3166-1-Alpha-3'];
        if (cca3 && targetContinent !== 'all') {
            const country = mapDataMap.get(cca3.toLowerCase());
            if (country) {
                const continent = country.continents && country.continents[0];
                if (continent !== targetContinent) {
                    map.setFeatureState({ source: 'countries', id: f.id }, { dimmed: true });
                }
            } else {
                map.setFeatureState({ source: 'countries', id: f.id }, { dimmed: true });
            }
        }
    });
}

// Side Panel Logic
function openPanel(country) {
    document.getElementById('panel-name').innerText = country.name.common;
    document.getElementById('panel-continent').innerText = (country.continents && country.continents[0]) || 'Unknown';
    document.getElementById('panel-flag').src = country.flags.svg;

    document.getElementById('panel-capital').innerText = country.capital ? country.capital[0] : 'N/A';
    document.getElementById('panel-currency').innerText = country.currencies ? Object.values(country.currencies)[0].name : 'N/A';
    document.getElementById('panel-languages').innerText = country.languages ? Object.values(country.languages).join(', ') : 'N/A';

    // Formatting numbers
    const popFormat = new Intl.NumberFormat('en-US').format(country.population);
    document.getElementById('stat-pop-val').innerText = popFormat;

    const areaFormat = new Intl.NumberFormat('en-US').format(country.area);
    document.getElementById('stat-area-val').innerText = areaFormat;

    // Reset Bars for animation
    const barPop = document.getElementById('bar-pop');
    const barArea = document.getElementById('bar-area');
    const barDev = document.getElementById('bar-dev');

    barPop.style.width = '0%';
    barArea.style.width = '0%';
    barDev.style.width = '0%';

    // Maps Link
    document.getElementById('maps-link').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(country.name.common)}`;

    // Show panel
    infoPanel.classList.remove('translate-x-full');
    infoPanel.classList.add('translate-x-0');
    if (typeof toggleOverlay === 'function') toggleOverlay(true);

    // Animate Bars after a tiny delay
    setTimeout(() => {
        const maxPop = 1400000000;
        const popPercent = Math.min((country.population / maxPop) * 100, 100);
        barPop.style.width = Math.max(popPercent, 2) + '%';

        const maxArea = 17000000;
        const areaPercent = Math.min((country.area / maxArea) * 100, 100);
        barArea.style.width = Math.max(areaPercent, 2) + '%';

        const devVal = Math.floor(Math.random() * 40) + 60; // 60-100 pseudo metric
        document.getElementById('stat-dev-val').innerText = devVal + '/100';
        barDev.style.width = devVal + '%';
    }, 400);

    // Set Explore More Link
    document.getElementById('explore-more-btn').href = `country.html?code=${country.cca3}`;
}

window.closePanel = () => {
    infoPanel.classList.remove('translate-x-0');
    infoPanel.classList.add('translate-x-full');
    if (typeof toggleOverlay === 'function') toggleOverlay(false);
    infoPanel.style.transform = '';
}

// Swipe Down/Right to Close Panel on Mobile
let touchStartY = 0;
let touchCurrentY = 0;

infoPanel.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    if (infoPanel.scrollTop > 0) return;
    touchStartY = e.touches[0].clientY;
    infoPanel.style.transition = 'none';
}, { passive: true });

infoPanel.addEventListener('touchmove', (e) => {
    if (window.innerWidth > 768 || infoPanel.scrollTop > 0) return;
    touchCurrentY = e.touches[0].clientY;
    const diff = touchCurrentY - touchStartY;
    if (diff > 0) {
        infoPanel.style.transform = `translateY(${diff}px)`;
    }
}, { passive: true });

infoPanel.addEventListener('touchend', (e) => {
    if (window.innerWidth > 768) return;
    const diff = touchCurrentY - touchStartY;

    infoPanel.style.transition = 'transform var(--transition-slow)';
    if (diff > 120 && infoPanel.scrollTop === 0) {
        closePanel();
    } else {
        infoPanel.style.transform = 'translateY(0)';
        setTimeout(() => {
            if (!infoPanel.classList.contains('translate-x-full')) {
                infoPanel.style.transform = '';
            }
        }, 800);
    }
    touchStartY = 0;
    touchCurrentY = 0;
});

// Search & Suggestion Logic
let highlightedFeatureId = null;

function handleSearch(e) {
    const val = e.target.value.toLowerCase().trim();
    if (val.length < 1) {
        suggestionsBox.classList.add('hidden');
        resetSearchHighlights();
        return;
    }

    const matches = countriesData.filter(c => c.name.common.toLowerCase().includes(val));

    // Highlight first match on map
    resetSearchHighlights();
    const firstMatch = matches[0];
    if (firstMatch && map) {
        const features = map.querySourceFeatures('countries');
        const matchFeature = features.find(f => f.properties['ISO3166-1-Alpha-3'] === firstMatch.cca3);
        if (matchFeature) {
            highlightedFeatureId = matchFeature.id;
            map.setFeatureState({ source: 'countries', id: highlightedFeatureId }, { highlighted: true });
        }
        
        // Pan to the country using the raw latlng from REST endpoint
        if (firstMatch.latlng && firstMatch.latlng.length === 2) {
            map.flyTo({ center: [firstMatch.latlng[1], firstMatch.latlng[0]], zoom: 4, essential: true });
        }
    }

    // Populate dropdown
    suggestionsBox.innerHTML = '';
    if (matches.length > 0) {
        suggestionsBox.classList.remove('hidden');
        matches.slice(0, 8).forEach(match => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<img src="${match.flags.svg}" alt="${match.name.common}" width="24" height="16" style="border-radius:2px"> 
                             <span>${match.name.common}</span>`;
            div.onclick = () => {
                searchInput.value = match.name.common;
                suggestionsBox.classList.add('hidden');
                openPanel(match);
                window.scrollToMap();
            };
            suggestionsBox.appendChild(div);
        });
    } else {
        suggestionsBox.classList.add('hidden');
    }
}

function resetSearchHighlights() {
    if (!map || highlightedFeatureId === null) return;
    map.setFeatureState({ source: 'countries', id: highlightedFeatureId }, { highlighted: false });
    highlightedFeatureId = null;
}

/* --- Luxury 3D Globe Init --- */
function init3DGlobe() {
    const globeContainer = document.querySelector('.globe-container');
    if (!globeContainer) return;
    if (typeof Globe === 'undefined') return;

    const world = Globe()
        (globeContainer)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#40916C')
        .atmosphereAltitude(0.15)
        .width(500)
        .height(500);

    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 1.0;
    world.controls().enableZoom = false;

    const directionalLight = world.scene().children.find(obj3d => obj3d.type === 'DirectionalLight');
    if (directionalLight) {
        directionalLight.intensity = 1.5;
        directionalLight.color.setHex(0xFFFFFF);
    }
}

