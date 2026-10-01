// ============================================================
// Theme Manager
// ============================================================
// Handles switching between light (day) and dark (night) modes.
// The preference is saved in localStorage so it persists between visits.
// This is the ONLY thing we use localStorage for — all app data
// lives in Firebase.
// ============================================================

(function () {
  // Check what theme is saved, or use the system preference
  function getTheme() {
    try {
      const saved = localStorage.getItem('quicknotes-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      // localStorage might be blocked in some browsers
    }
    // If nothing saved, check if the user's OS prefers dark mode
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Apply the theme by adding/removing the "dark" class on <html>
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('quicknotes-theme', theme);
    } catch (e) {
      // Ignore if localStorage is unavailable
    }
  }

  // Toggle between light and dark
  function toggleTheme() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply theme immediately (before page renders) to prevent flash
  applyTheme(getTheme());

  // Make toggleTheme available globally so buttons can call it
  window.toggleTheme = toggleTheme;

  // Attach to theme toggle buttons once the page loads
  document.addEventListener('DOMContentLoaded', function () {
    var toggles = document.querySelectorAll('#theme-toggle, #auth-theme-toggle');
    toggles.forEach(function (btn) {
      if (btn) btn.addEventListener('click', toggleTheme);
    });
  });
})();
