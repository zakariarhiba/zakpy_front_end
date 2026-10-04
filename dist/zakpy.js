/* ZAKPY front-end behaviour. Vanilla JS, no dependencies.
   Load it in <head> (no defer) so theme, language and the intro apply before the first paint.
   Opt in with data attributes, see README.md. */
(function () {
  "use strict";
  var root = document.documentElement;
  var scriptEl = document.currentScript;
  var base = scriptEl && scriptEl.src ? scriptEl.src.replace(/[^\/]*$/, "") : "";

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function session(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ---------- Languages: en, fr, ary (Darija, Arabic script, right to left) ---------- */
  var LANGS = {
    en: { lang: "en", dir: "ltr" },
    fr: { lang: "fr", dir: "ltr" },
    ary: { lang: "ar-MA", dir: "rtl" }
  };
  var UI = {
    en: {
      "ui.menu": "Menu", "ui.close": "Close menu", "ui.language": "Language", "ui.skip": "Skip to content",
      "ui.toDark": "Switch to dark mode", "ui.toLight": "Switch to light mode",
      "intro.welcome": "Digital systems with purpose.", "intro.skip": "Tap to skip"
    },
    fr: {
      "ui.menu": "Menu", "ui.close": "Fermer le menu", "ui.language": "Langue", "ui.skip": "Aller au contenu",
      "ui.toDark": "Passer en mode sombre", "ui.toLight": "Passer en mode clair",
      "intro.welcome": "Des systèmes digitaux utiles.", "intro.skip": "Touchez pour passer"
    },
    ary: {
      "ui.menu": "القائمة", "ui.close": "سد القائمة", "ui.language": "اللغة", "ui.skip": "دوز للمحتوى",
      "ui.toDark": "بدل للمود الغامق", "ui.toLight": "بدل للمود الفاتح",
      "intro.welcome": "أنظمة رقمية بمعنى.", "intro.skip": "كليكي باش تعدّي"
    }
  };

  /* Sites add their own text: window.ZAKPY_I18N = { en: {...}, fr: {...}, ary: {...} } (before this script). */
  function t(key, code) {
    var site = window.ZAKPY_I18N || {};
    code = code || current;
    return (site[code] && site[code][key]) || (UI[code] && UI[code][key]) ||
      (site.en && site.en[key]) || (UI.en && UI.en[key]) || key;
  }

  function detectLang() {
    var saved = store("zakpy-lang");
    if (saved && LANGS[saved]) return saved;
    var nav = (navigator.language || "en").toLowerCase();
    if (nav.indexOf("fr") === 0) return "fr";
    if (nav.indexOf("ar") === 0) return "ary";
    return "en";
  }

  var current = detectLang();

  function applyLang(code, persist) {
    if (!LANGS[code]) code = "en";
    current = code;
    root.setAttribute("lang", LANGS[code].lang);
    root.setAttribute("dir", LANGS[code].dir);
    root.setAttribute("data-zakpy-lang", code);
    if (persist) store("zakpy-lang", code);
    if (!document.body) return; // text is applied again on DOMContentLoaded
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    document.querySelectorAll("[data-zakpy-lang-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-zakpy-lang-set") === code);
    });
    syncThemeLabel();
    document.dispatchEvent(new CustomEvent("zakpy:lang", { detail: { lang: code } }));
  }

  /* Language change on click: fade the page out, swap text and direction while hidden, fade back in. */
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  var langTimer = null;
  function switchLang(code) {
    if (code === current) return;
    if (!document.body || (reduceMotion && reduceMotion.matches)) { applyLang(code, true); return; }
    clearTimeout(langTimer);
    root.classList.add("lang-switching");
    langTimer = setTimeout(function () {
      applyLang(code, true);
      setTimeout(function () { root.classList.remove("lang-switching"); }, 30);
    }, 180);
  }

  /* ---------- Theme: data-zakpy-theme-toggle on an icon button ---------- */
  var themeTimer = null;
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme); syncThemeLabel();
  }
  function switchTheme(theme) {
    if (!(reduceMotion && reduceMotion.matches)) {
      root.classList.add("theme-fading"); // colours ease between themes (see 03-base.css)
      clearTimeout(themeTimer);
      themeTimer = setTimeout(function () { root.classList.remove("theme-fading"); }, 450);
    }
    applyTheme(theme);
  }
  function syncThemeLabel() {
    if (!document.body) return;
    var dark = root.getAttribute("data-theme") === "dark";
    document.querySelectorAll("[data-zakpy-theme-toggle]").forEach(function (b) {
      var label = t(dark ? "ui.toLight" : "ui.toDark");
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
      b.setAttribute("aria-pressed", dark);
    });
  }
  var savedTheme = store("zakpy-theme");
  root.setAttribute("data-theme", savedTheme || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  /* ---------- Side drawer (mobile menu) ---------- */
  var drawerOpener = null;
  function drawerParts() {
    var toggle = document.querySelector("[data-zakpy-nav-toggle]");
    if (!toggle) return null;
    var menu = document.getElementById(toggle.getAttribute("aria-controls"));
    return menu ? { toggle: toggle, menu: menu, nav: toggle.closest(".nav") } : null;
  }
  function openDrawer() {
    var d = drawerParts(); if (!d) return;
    if (d.nav && !d.nav.querySelector(".nav__overlay")) {
      var o = document.createElement("div"); o.className = "nav__overlay"; o.setAttribute("data-zakpy-nav-close", "");
      d.nav.insertBefore(o, d.nav.firstChild);
    }
    drawerOpener = d.toggle;
    d.menu.classList.add("is-open");
    document.body.classList.add("nav-open");
    d.toggle.setAttribute("aria-expanded", "true");
    var first = d.menu.querySelector("a, button");
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeDrawer(returnFocus) {
    var d = drawerParts(); if (!d) return;
    d.menu.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    d.toggle.setAttribute("aria-expanded", "false");
    if (returnFocus && drawerOpener) drawerOpener.focus();
  }
  function drawerIsOpen() { var d = drawerParts(); return !!(d && d.menu.classList.contains("is-open")); }

  /* ---------- 3D entry animation (adapted from the Hunter game) ---------- */
  var introTimer = null;
  var INTRO_MS = 2900;
  function introFinish() {
    clearTimeout(introTimer);
    root.classList.remove("intro-play");
    var el = document.querySelector(".intro"); if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function introBuild() {
    var old = document.querySelector(".intro"); if (old) old.parentNode.removeChild(old);
    var el = document.createElement("div");
    el.className = "intro"; el.setAttribute("aria-hidden", "true"); el.setAttribute("lang", "en"); el.setAttribute("dir", "ltr"); /* the intro is always English */
    el.innerHTML =
      '<div class="intro__viewport"><div class="intro__scene">' +
      '<div class="intro__floor"></div><span class="intro__ring"></span><span class="intro__ring intro__ring--2"></span>' +
      '<div class="intro__cube">' +
      '<span class="intro__face intro__face--back"></span><span class="intro__face intro__face--right"></span>' +
      '<span class="intro__face intro__face--left"></span><span class="intro__face intro__face--top"></span>' +
      '<span class="intro__face intro__face--bottom"></span>' +
      '<span class="intro__face intro__face--front"><img src="' + base + 'logo.png" alt="" width="70" height="70"></span>' +
      '</div>' +
      '<span class="intro__door intro__door--left"></span><span class="intro__door intro__door--right"></span><span class="intro__seam"></span>' +
      '</div></div>' +
      '<div class="intro__window"><p class="intro__system">ZAKPY</p><p class="intro__welcome"></p></div>' +
      '<p class="intro__skip"></p>';
    el.querySelector(".intro__welcome").textContent = t("intro.welcome", "en");
    el.querySelector(".intro__skip").textContent = t("intro.skip", "en");
    el.addEventListener("click", introFinish);
    document.body.insertBefore(el, document.body.firstChild);
  }
  function introPlay() {
    if (!document.body) return;
    introBuild();
    root.classList.remove("intro-play");
    void root.offsetWidth; // restart the CSS animations on replay
    root.classList.add("intro-play");
    var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearTimeout(introTimer);
    introTimer = setTimeout(introFinish, reduced ? 1000 : INTRO_MS);
  }
  /* First entry of the browser session on pages that opt in with <html data-zakpy-intro>. */
  var introWanted = root.hasAttribute("data-zakpy-intro") && (!session("zakpy-intro-seen") || /[?&]intro=1/.test(location.search));
  if (introWanted) { root.classList.add("intro-play"); session("zakpy-intro-seen", "1"); }

  /* ---------- Tabs ---------- */
  function selectTab(tab) {
    var list = tab.parentElement;
    list.querySelectorAll('[role="tab"]').forEach(function (x) {
      var on = x === tab;
      x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(x.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target : e.target.parentElement;
    var tt = el.closest("[data-zakpy-theme-toggle]");
    if (tt) {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      switchTheme(next); store("zakpy-theme", next); return;
    }
    var lg = el.closest("[data-zakpy-lang-set]");
    if (lg) { switchLang(lg.getAttribute("data-zakpy-lang-set")); return; }

    if (el.closest("[data-zakpy-nav-toggle]")) { drawerIsOpen() ? closeDrawer(true) : openDrawer(); return; }
    if (el.closest("[data-zakpy-nav-close]")) { closeDrawer(true); return; }
    if (drawerIsOpen() && el.closest(".nav__links a")) closeDrawer(false);

    if (el.closest("[data-zakpy-intro-replay]")) { introPlay(); return; }

    var o = el.closest("[data-zakpy-open]");
    if (o) { var dlg = document.getElementById(o.getAttribute("data-zakpy-open")); if (dlg && dlg.showModal) dlg.showModal(); return; }
    var c = el.closest("[data-zakpy-close]");
    if (c) { var parent = c.closest("dialog"); if (parent) parent.close(); return; }

    var tab = el.closest('.tabs [role="tab"]');
    if (tab) selectTab(tab);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (root.classList.contains("intro-play")) { introFinish(); return; }
      if (drawerIsOpen()) { closeDrawer(true); return; }
    }
    var tab = e.target.closest && e.target.closest('.tabs [role="tab"]');
    if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    var tabs = Array.prototype.slice.call(tab.parentElement.querySelectorAll('[role="tab"]'));
    var rtl = root.getAttribute("dir") === "rtl";
    var step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
    var target = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    target.focus(); selectTab(target); e.preventDefault();
  });

  window.addEventListener("resize", function () { if (window.innerWidth > 832 && drawerIsOpen()) closeDrawer(false); });

  document.addEventListener("DOMContentLoaded", function () {
    applyLang(current, false);
    if (introWanted) introPlay();
  });

  applyLang(current, false); // sets lang and dir right away, before the body exists

  /* Small public API for sites */
  window.Zakpy = { setLang: function (c) { applyLang(c, true); }, getLang: function () { return current; }, playIntro: introPlay, t: t };
})();
