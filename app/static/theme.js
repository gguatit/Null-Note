(function () {
  const THEME_KEY = "nullnote_theme";
  const SETTINGS_KEY = "nullnote_ui_settings";

  function getStoredSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function inferTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }

    const settings = getStoredSettings();
    if (typeof settings.darkMode === "boolean") {
      return settings.darkMode ? "dark" : "light";
    }

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyThemeSync(btn, mode) {
    const moonIcon = btn.querySelector(".icon-moon");
    const sunIcon = btn.querySelector(".icon-sun");
    if (moonIcon && sunIcon) {
      moonIcon.style.display = mode === "dark" ? "none" : "";
      sunIcon.style.display = mode === "dark" ? "" : "none";
    }
    btn.title = mode === "dark" ? "라이트 모드 전환" : "다크 모드 전환";
  }

  function applyTheme(mode) {
    document.body.classList.toggle("dark-mode", mode === "dark");
    document.documentElement.setAttribute("data-theme", mode);
    document.querySelectorAll("[id='themeToggleBtn']").forEach(function (btn) {
      applyThemeSync(btn, mode);
    });
  }

  function setTheme(mode) {
    const next = mode === "dark" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);

    const settings = getStoredSettings();
    settings.darkMode = next === "dark";
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    applyTheme(next);
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function getTheme() {
    return inferTheme();
  }

  window.NullNoteTheme = {
    getTheme,
    setTheme,
    toggleTheme,
    applyTheme,
  };

  if (document.body) {
    applyTheme(getTheme());
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      applyTheme(getTheme());
    });
  }
})();