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
      "ui.loading": "Loading", "intro.welcome": "Digital systems with purpose.", "intro.skip": "Tap to skip"
    },
    fr: {
      "ui.menu": "Menu", "ui.close": "Fermer le menu", "ui.language": "Langue", "ui.skip": "Aller au contenu",
      "ui.toDark": "Passer en mode sombre", "ui.toLight": "Passer en mode clair",
      "ui.loading": "Chargement", "intro.welcome": "Des systèmes digitaux utiles.", "intro.skip": "Touchez pour passer"
    },
    ary: {
      "ui.menu": "القائمة", "ui.close": "سد القائمة", "ui.language": "اللغة", "ui.skip": "دوز للمحتوى",
      "ui.toDark": "بدل للمود الغامق", "ui.toLight": "بدل للمود الفاتح",
      "ui.loading": "كيتحمّل", "intro.welcome": "أنظمة رقمية بمعنى.", "intro.skip": "كليكي باش تعدّي"
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

  /* Language change on click: swap at once, then let the new text fade in so the change is felt, not jarring. */
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  var langTimer = null;
  function switchLang(code) {
    if (code === current) return;
    applyLang(code, true);
    if (reduceMotion && reduceMotion.matches) return;
    clearTimeout(langTimer);
    document.querySelectorAll("[data-i18n]").forEach(function (el, i) { el.style.setProperty("--i", Math.min(i * 8, 280)); }); // gentle top-to-bottom stagger
    root.classList.remove("lang-changed");
    void root.offsetWidth; // restart the animation if the user switches again quickly
    root.classList.add("lang-changed");
    langTimer = setTimeout(function () { root.classList.remove("lang-changed"); }, 900);
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

  function closeGroups(except) {
    document.querySelectorAll("[data-zakpy-group]").forEach(function (g) { if (g !== except) g.setAttribute("aria-expanded", "false"); });
  }

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

  /* ---------- Loading overlay: the Hunter logo cube, looping, while a page or a query is pending ----------
     Automatic for same-site links and plain form submits. For htmx put data-zakpy-loading on the element
     (or a parent). In code: Zakpy.loading.show() / hide() / track(promise). Opt out with data-zakpy-no-loader.
     It only appears if the wait lasts more than a moment, and stays at least 450 ms once shown (no flicker). */
  var loaderEl = null, loadCount = 0, loadShowTimer = null, loadHideTimer = null, loadSafety = null, loadShownAt = 0;
  function loaderBuild() {
    if (loaderEl || !document.body) return loaderEl;
    var faces = "";
    ["front", "back"].forEach(function (f) { faces += '<span class="loader__face loader__face--logo loader__face--' + f + '"><img src="' + base + 'logo.png" alt="" width="50" height="50"></span>'; });
    ["right", "left", "top", "bottom"].forEach(function (f) { faces += '<span class="loader__face loader__face--' + f + '"></span>'; });
    var el = document.createElement("div");
    el.className = "loader"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
    el.innerHTML = '<div class="loader__stage" aria-hidden="true"><div class="loader__floor"></div><span class="loader__ring"></span>' +
      '<span class="loader__ring loader__ring--2"></span><div class="loader__cube">' + faces + '</div></div>' +
      '<div class="loader__window"><p class="loader__system">ZAKPY</p><p class="loader__text"></p><span class="loader__bar" aria-hidden="true"></span></div>';
    document.body.appendChild(el);
    loaderEl = el;
    return el;
  }
  function loaderReveal() {
    var el = loaderBuild(); if (!el) return;
    el.querySelector(".loader__text").textContent = t("ui.loading");
    void el.offsetWidth;
    el.classList.add("is-on");
    root.setAttribute("aria-busy", "true");
    loadShownAt = Date.now();
  }
  function loaderShow(delay) {
    loadCount++;
    if (loadCount > 1) return;
    clearTimeout(loadHideTimer);
    if (loadShownAt) return; // still on screen from the previous wait
    loadShowTimer = setTimeout(loaderReveal, delay == null ? 150 : delay);
    clearTimeout(loadSafety);
    loadSafety = setTimeout(loaderReset, 30000); // never leave the page covered (for example after a download link)
  }
  function loaderHide() {
    if (loadCount > 0) loadCount--;
    if (loadCount > 0) return;
    clearTimeout(loadShowTimer); clearTimeout(loadSafety);
    if (!loadShownAt) return;
    clearTimeout(loadHideTimer);
    loadHideTimer = setTimeout(loaderOff, Math.max(0, 450 - (Date.now() - loadShownAt)));
  }
  function loaderOff() {
    if (loaderEl) loaderEl.classList.remove("is-on");
    loadShownAt = 0; root.removeAttribute("aria-busy");
  }
  function loaderReset() { loadCount = 0; clearTimeout(loadShowTimer); clearTimeout(loadHideTimer); loaderOff(); }
  function loaderTrack(promise) {
    loaderShow(200);
    var done = function () { loaderHide(); };
    Promise.resolve(promise).then(done, done);
    return promise;
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) loaderReset(); }); // back button restores the page from cache

  var htmxBusy = typeof WeakSet === "function" ? new WeakSet() : null;
  document.addEventListener("htmx:beforeRequest", function (e) {
    var elt = e.detail && e.detail.elt;
    if (!htmxBusy || !elt || !elt.closest || !elt.closest("[data-zakpy-loading]") || elt.closest("[data-zakpy-no-loader]")) return;
    htmxBusy.add(elt); loaderShow(200);
  });
  document.addEventListener("htmx:afterRequest", function (e) {
    var elt = e.detail && e.detail.elt;
    if (htmxBusy && elt && htmxBusy.has(elt)) { htmxBusy.delete(elt); loaderHide(); }
  });

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

    /* Groups (links with sub routes): dropdown on desktop, accordion in the drawer */
    var gt = el.closest("[data-zakpy-group]");
    var desktop = window.innerWidth > 832;
    if (gt) {
      var opening = gt.getAttribute("aria-expanded") !== "true";
      if (desktop) closeGroups(gt);
      gt.setAttribute("aria-expanded", opening);
      return;
    }
    if (desktop && !el.closest(".nav__group") || (desktop && el.closest(".nav__sub a"))) closeGroups();

    if (el.closest("[data-zakpy-nav-toggle]")) { drawerIsOpen() ? closeDrawer(true) : openDrawer(); return; }
    if (el.closest("[data-zakpy-nav-close]")) { closeDrawer(true); return; }
    if (drawerIsOpen() && el.closest(".nav__links a")) closeDrawer(false);

    if (el.closest("[data-zakpy-intro-replay]")) { introPlay(); return; }

    var o = el.closest("[data-zakpy-open]");
    if (o) { var dlg = document.getElementById(o.getAttribute("data-zakpy-open")); if (dlg && dlg.showModal) dlg.showModal(); return; }
    var c = el.closest("[data-zakpy-close]");
    if (c) { var parent = c.closest("dialog"); if (parent) parent.close(); return; }

    var tab = el.closest('.tabs [role="tab"]');
    if (tab) { selectTab(tab); return; }

    var demo = el.closest("[data-zakpy-loader-demo]");
    if (demo) { loaderTrack(new Promise(function (r) { setTimeout(r, 2500); })); return; }

    var a = el.closest("a[href]");
    if (a && !e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) &&
        (!a.target || a.target === "_self") && !a.hasAttribute("download") && !a.closest("[data-zakpy-no-loader]")) {
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      var samePage = url.pathname === location.pathname && url.search === location.search;
      if ((url.protocol === "http:" || url.protocol === "https:") && url.origin === location.origin && !(samePage && url.hash)) loaderShow(120);
    }
  });
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (e.defaultPrevented || !f || !f.method || f.method.toLowerCase() === "dialog" || (f.target && f.target !== "_self") || f.closest("[data-zakpy-no-loader]")) return;
    loaderShow(120);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (root.classList.contains("intro-play")) { introFinish(); return; }
      if (drawerIsOpen()) { closeDrawer(true); return; }
      var openGroup = document.querySelector('[data-zakpy-group][aria-expanded="true"]');
      if (openGroup && window.innerWidth > 832) { closeGroups(); openGroup.focus(); return; }
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
  window.Zakpy = { setLang: function (c) { applyLang(c, true); }, getLang: function () { return current; }, playIntro: introPlay, loading: { show: loaderShow, hide: loaderHide, track: loaderTrack }, t: t };
})();

;(function () {
  var sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
<symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></symbol>
<symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></symbol>
<symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5a1 1 0 011-1h14v13H6a2 2 0 00-2 2zM4 19a2 2 0 002 2h13v-4"/></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></symbol>
<symbol id="i-chat" viewBox="0 0 24 24"><path d="M5 4h14a1 1 0 011 1v10a1 1 0 01-1 1H9l-5 4V5a1 1 0 011-1z"/></symbol>
<symbol id="i-check-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
<symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-cloud" viewBox="0 0 24 24"><path d="M7 18a4 4 0 01-.5-8A5.5 5.5 0 0117 8.5 4.8 4.8 0 0117.5 18z"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></symbol>
<symbol id="i-external" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"/></symbol>
<symbol id="i-github" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></symbol>
<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></symbol>
<symbol id="i-instagram" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/></symbol>
<symbol id="i-layout" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></symbol>
<symbol id="i-lightbulb" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/></symbol>
<symbol id="i-linkedin" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></symbol>
<symbol id="i-monitor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></symbol>
<symbol id="i-palette" viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.6-2.2-.5-1.4.3-2.8 1.9-2.8H18a3 3 0 003-3c0-5-4-10-9-10z"/><path d="M7.5 11v.01M10 7v.01M15 7.5v.01"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A15 15 0 014 5a1 1 0 011-1z"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol>
<symbol id="i-settings" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.8z"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
<symbol id="i-type" viewBox="0 0 24 24"><path d="M5 7V5h14v2M12 5v14M9 19h6"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></symbol>
<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M4 20l1.3-4A8.5 8.5 0 1112 20.5a8.5 8.5 0 01-4-1z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4 4 0 01-2-2l.8-1-1-2z"/></symbol>
<symbol id="i-youtube" viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/></symbol>
</svg>
`;
  function add() { if (document.getElementById("zakpy-sprite")) return; var d = document.createElement("div"); d.id = "zakpy-sprite"; d.hidden = true; d.innerHTML = sprite; document.body.insertBefore(d, document.body.firstChild); }
  if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
})();
