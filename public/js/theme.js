// js/theme.js
(function () {
    // 1. Check local storage for user preference
    const savedTheme = localStorage.getItem('theme');

    // 2. Determine initial theme. Default to dark for the Stitch layout.
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) || !savedTheme;

    // 3. Immediately apply the class to the HTML element to prevent Flash of Unstyled Content (FOUC)
    if (prefersDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    }

    // 4. Attach toggle function to the global window object so buttons can call it
    window.toggleTheme = function () {
        const isDark = document.documentElement.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }

        // Save user preference globally
        localStorage.setItem('theme', newTheme);

        // Update all toggle icons on the page
        updateThemeIcons(newTheme);

        // Dispatch an event so other scripts (like charts) can update purely based on theme change
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
    };

    // Helper: Update the Google Material Icon based on current theme
    function updateThemeIcons(theme) {
        const toggles = document.querySelectorAll('.theme-toggle-icon');
        toggles.forEach(icon => {
            // If dark mode, show a sun icon (to toggle light mode). If light mode, show moon icon.
            icon.innerText = theme === 'dark' ? 'light_mode' : 'dark_mode';
        });
    }

    // Run on complete DOM load to make sure icons injected into HTML get the right state
    window.addEventListener('DOMContentLoaded', () => {
        const isDark = document.documentElement.classList.contains('dark');
        updateThemeIcons(isDark ? 'dark' : 'light');
    });
})();
