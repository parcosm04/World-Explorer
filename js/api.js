/**
 * Centered API Management Module for World Explorer
 * Handles all external data fetching, normalization, and client-side caching.
 */

const API_CACHE_PREFIX = 'world_explorer_cache_v9_';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

const DataAPI = {
    getCache(key) {
        const cachedStr = sessionStorage.getItem(API_CACHE_PREFIX + key);
        if (cachedStr) {
            try {
                const cached = JSON.parse(cachedStr);
                if (Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
                    return cached.data;
                } else {
                    sessionStorage.removeItem(API_CACHE_PREFIX + key);
                }
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    setCache(key, data) {
        try {
            const cacheObj = {
                timestamp: Date.now(),
                data: data
            };
            sessionStorage.setItem(API_CACHE_PREFIX + key, JSON.stringify(cacheObj));
        } catch (e) {
            console.warn('Session storage is full or unavailable. Data will not be cached.', e);
        }
    },

    // 1. Unified Country Data (Backend Aggregator)
    async getAggregatedCountryData(countryName) {
        if (!countryName) return null;

        const cacheKey = `agg_${countryName.toLowerCase()}`;
        const cached = this.getCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`http://localhost:3000/api/country/${encodeURIComponent(countryName)}`);
            if (!response.ok) throw new Error('Failed to fetch aggregated country data from backend');
            const data = await response.json();

            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching from backend aggregator:', error);
            return null;
        }
    },

    // 2. RestCountries API (All for Map)
    async getAllCountries() {
        const cacheKey = `all_countries_core`;
        const cached = this.getCache(cacheKey);
        if (cached) return cached;

        try {
            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca3,flags,capital,currencies,languages,population,area,continents,latlng');
            if (!res.ok) throw new Error('Failed to fetch all countries');
            const data = await res.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching all countries:', error);
            return [];
        }
    }
};

window.DataAPI = DataAPI;
