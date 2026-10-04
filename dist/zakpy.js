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
      "ui.loading": "Loading", "ui.level": "Level", "ui.levelUp": "Level up", "intro.welcome": "Digital systems with purpose.", "intro.skip": "Tap to skip"
    },
    fr: {
      "ui.menu": "Menu", "ui.close": "Fermer le menu", "ui.language": "Langue", "ui.skip": "Aller au contenu",
      "ui.toDark": "Passer en mode sombre", "ui.toLight": "Passer en mode clair",
      "ui.loading": "Chargement", "ui.level": "Niveau", "ui.levelUp": "Niveau suivant", "intro.welcome": "Des systèmes digitaux utiles.", "intro.skip": "Touchez pour passer"
    },
    ary: {
      "ui.menu": "القائمة", "ui.close": "سد القائمة", "ui.language": "اللغة", "ui.skip": "دوز للمحتوى",
      "ui.toDark": "بدل للمود الغامق", "ui.toLight": "بدل للمود الفاتح",
      "ui.loading": "كيتحمّل", "ui.level": "المستوى", "ui.levelUp": "طلعتي مستوى", "intro.welcome": "أنظمة رقمية بمعنى.", "intro.skip": "كليكي باش تعدّي"
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

  /* ---------- The voxel logo, shared by the intro and the loader ----------
     Five cubes drawn like the mark (oblique projection, depth 0.47 toward the top right). All back faces come
     before all fronts, and no face is drawn where two cubes touch, exactly like the logo. */
  var VD = 0.47, VB = "0 0 " + (1 + VD) + " " + (1 + VD);
  var VF = {
    t: "0," + VD + " " + VD + ",0 " + (1 + VD) + ",0 1," + VD,
    s: "1," + VD + " " + (1 + VD) + ",0 " + (1 + VD) + ",1 1," + (1 + VD),
    f: "0," + VD + " 1," + VD + " 1," + (1 + VD) + " 0," + (1 + VD)
  };
  var LOGO_CUBES = [[1, 2, 0], [0, 1, 0], [1, 0, 0], [2, 1, 0], [1, 1, 1]]; // x, y, core; order = build order (around the plus, core last)
  function voxLogo() {
    function has(x, y) { return LOGO_CUBES.some(function (c) { return c[0] === x && c[1] === y; }); }
    var backs = "", fronts = "";
    LOGO_CUBES.forEach(function (c, i) {
      var open = '<svg class="vox' + (c[2] ? " is-core" : "") + '" style="--x:' + c[0] + ";--y:" + c[1] + ";--i:" + i + '" viewBox="' + VB + '" aria-hidden="true" focusable="false">';
      var faces = (has(c[0], c[1] - 1) ? "" : '<polygon class="t" points="' + VF.t + '"/>') + (has(c[0] + 1, c[1]) ? "" : '<polygon class="s" points="' + VF.s + '"/>');
      backs += open + faces + "</svg>";
      fronts += open + '<polygon class="f" points="' + VF.f + '"/></svg>';
    });
    return '<div class="vstage__floor"></div><span class="vstage__ring"></span><span class="vstage__ring vstage__ring--2"></span><div class="vstage__cubes">' + backs + fronts + "</div>";
  }
  function segs(n) { var h = ""; for (var i = 0; i < n; i++) h += '<i style="--s:' + i + '"></i>'; return h; }

  /* ---------- Entry intro: the logo builds itself in the dark, the ZAKPY window boots ---------- */
  var introTimer = null, introTyping = null;
  var INTRO_MS = 3000;
  function introFinish() {
    clearTimeout(introTimer); clearInterval(introTyping);
    root.classList.remove("intro-play");
    var el = document.querySelector(".intro"); if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function introBuild() {
    var old = document.querySelector(".intro"); if (old) old.parentNode.removeChild(old);
    var el = document.createElement("div");
    el.className = "intro"; el.setAttribute("aria-hidden", "true"); el.setAttribute("lang", "en"); el.setAttribute("dir", "ltr"); /* the intro is always English */
    el.innerHTML =
      '<p class="intro__boot">&gt; boot zakpy</p>' +
      '<div class="vstage intro__logo">' + voxLogo() + "</div>" +
      '<div class="intro__window"><p class="intro__system">ZAKPY</p><p class="intro__welcome"><span class="intro__typed"></span><span class="intro__cur"></span></p>' +
      '<span class="intro__bar">' + segs(12) + "</span></div>" +
      '<p class="intro__skip"></p>';
    el.querySelector(".intro__skip").textContent = t("intro.skip", "en");
    el.addEventListener("click", introFinish);
    document.body.insertBefore(el, document.body.firstChild);
    // The welcome line types in once the window is open.
    var text = t("intro.welcome", "en"), typed = el.querySelector(".intro__typed"), n = 0;
    clearInterval(introTyping);
    setTimeout(function () {
      introTyping = setInterval(function () { n++; typed.textContent = text.slice(0, n); if (n >= text.length) clearInterval(introTyping); }, 20);
    }, 1400);
  }
  function introPlay() {
    if (!document.body) return;
    introBuild();
    root.classList.remove("intro-play");
    void root.offsetWidth; // restart the CSS animations on replay
    root.classList.add("intro-play");
    var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearTimeout(introTimer);
    if (reduced) { var ty = document.querySelector(".intro__typed"); clearInterval(introTyping); if (ty) ty.textContent = t("intro.welcome", "en"); }
    introTimer = setTimeout(introFinish, reduced ? 1000 : INTRO_MS);
  }
  /* First entry of the browser session on pages that opt in with <html data-zakpy-intro>. */
  var introWanted = root.hasAttribute("data-zakpy-intro") && (!session("zakpy-intro-seen") || /[?&]intro=1/.test(location.search));
  if (introWanted) { root.classList.add("intro-play"); session("zakpy-intro-seen", "1"); }

  /* ---------- Loading overlay: the voxel logo, cubes hopping around the plus, while a page or a query is pending ----------
     Automatic for same-site links and plain form submits. For htmx put data-zakpy-loading on the element
     (or a parent). In code: Zakpy.loading.show() / hide() / track(promise). Opt out with data-zakpy-no-loader.
     It only appears if the wait lasts more than a moment, and stays at least 450 ms once shown (no flicker). */
  var loaderEl = null, loadCount = 0, loadShowTimer = null, loadHideTimer = null, loadSafety = null, loadShownAt = 0;
  function loaderBuild() {
    if (loaderEl || !document.body) return loaderEl;
    var el = document.createElement("div");
    el.className = "loader"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
    el.innerHTML = '<div class="vstage loader__logo" aria-hidden="true">' + voxLogo() + "</div>" +
      '<div class="loader__window"><p class="loader__system">ZAKPY</p><p class="loader__text"><span class="loader__label"></span><span class="loader__cur" aria-hidden="true"></span></p>' +
      '<span class="loader__bar" aria-hidden="true">' + segs(10) + "</span></div>";
    document.body.appendChild(el);
    loaderEl = el;
    return el;
  }
  function loaderReveal() {
    var el = loaderBuild(); if (!el) return;
    el.querySelector(".loader__label").textContent = t("ui.loading");
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

/* ZAKPY motion layer: the ZAKPY game. Vanilla JS, no dependencies. Built into dist/zakpy.js after zakpy.js.
   Voxels drawn like the logo, a logo that builds itself, levels with XP, headings that type in, keys that press.
   Opt in with data attributes, see README.md "Motion". Without JS or with reduced motion the content simply shows. */
;(function () {
  "use strict";
  var root = document.documentElement;
  var mq = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = !!(mq && mq.matches);
  var canIO = "IntersectionObserver" in window;
  if (!reduced && canIO) root.classList.add("motion");
  var active = root.classList.contains("motion");
  var SVGNS = "http://www.w3.org/2000/svg";

  function tr(key, fallback) { var z = window.Zakpy; var v = z && z.t ? z.t(key) : key; return v === key ? fallback : v; }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* ---------- Voxels: the logo's cube, in its oblique projection (depth 0.47 toward the top right) ----------
     Each cube is two SVGs: its back faces (top and side) and its front. All backs are drawn before all fronts,
     so the fronts hide what the logo hides, exactly like the mark. */
  var D = 0.47;
  var FACES = {
    t: "0," + D + " " + D + ",0 " + (1 + D) + ",0 1," + D,
    s: "1," + D + " " + (1 + D) + ",0 " + (1 + D) + ",1 1," + (1 + D),
    f: "0," + D + " 1," + D + " 1," + (1 + D) + " 0," + (1 + D)
  };
  function voxSvg(parts, extra) {
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + (1 + D) + " " + (1 + D));
    svg.setAttribute("class", "vox " + (extra || ""));
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    parts.forEach(function (p) {
      var poly = document.createElementNS(SVGNS, "polygon");
      poly.setAttribute("points", FACES[p]); poly.setAttribute("class", p);
      svg.appendChild(poly);
    });
    return svg;
  }
  // cubes: [{x, y, core}] in cube units. Returns [{back, front}] in the same order.
  // Like the logo, a face is not drawn where two cubes touch: no top face under a cube, no side face beside one.
  function buildVoxels(host, cubes) {
    var backs = document.createDocumentFragment(), fronts = document.createDocumentFragment(), out = [];
    function at(x, y) { return cubes.some(function (o) { return Math.abs(o.x - x) < 0.01 && Math.abs(o.y - y) < 0.01; }); }
    cubes.forEach(function (c) {
      var extra = c.core ? "is-core" : "", faces = [];
      if (c.solo || !at(c.x, c.y - 1)) faces.push("t");
      if (c.solo || !at(c.x + 1, c.y)) faces.push("s");
      var b = voxSvg(faces, extra), f = voxSvg(["f"], extra);
      [b, f].forEach(function (el) { el.style.setProperty("--x", c.x); el.style.setProperty("--y", c.y); });
      backs.appendChild(b); fronts.appendChild(f);
      out.push({ back: b, front: f });
    });
    host.appendChild(backs); host.appendChild(fronts);
    return out;
  }
  function both(v, fn) { fn(v.back); fn(v.front); }
  function drop(v, delay) {
    both(v, function (el) {
      el.classList.remove("is-wait", "is-drop"); void el.getBoundingClientRect();
      el.style.setProperty("--vd", delay + "ms"); el.classList.add("is-drop");
      el.addEventListener("animationend", function done() { el.classList.remove("is-drop"); el.removeEventListener("animationend", done); });
    });
  }

  /* ---------- The logo stage: [data-zakpy-voxels="logo"] builds the mark cube by cube, lime core last ---------- */
  var LOGO = [{ x: 1, y: 2 }, { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1, core: true }]; // drop order
  function initStage(stage) {
    if (stage.__zv) return;
    stage.classList.add("vstage");
    stage.setAttribute("role", "img");
    if (!stage.getAttribute("aria-label")) stage.setAttribute("aria-label", "ZAKPY");
    stage.innerHTML = '<div class="vstage__floor"></div><span class="vstage__ring"></span><div class="vstage__cubes"></div>';
    var cubes = buildVoxels(stage.querySelector(".vstage__cubes"), LOGO);
    var ring = stage.querySelector(".vstage__ring");
    stage.__zv = cubes;
    cubes.forEach(function (v) { // hover lifts the whole cube, back and front together
      v.front.addEventListener("pointerenter", function () { if (stage.classList.contains("is-idle")) both(v, function (el) { el.style.setProperty("--lift", "-6px"); }); });
      v.front.addEventListener("pointerleave", function () { both(v, function (el) { el.style.removeProperty("--lift"); }); });
    });
    function build() {
      stage.classList.remove("is-idle");
      var delays = [0, 150, 300, 450, 780];
      cubes.forEach(function (v, i) { drop(v, delays[i]); });
      setTimeout(function () { ring.classList.remove("is-on"); void ring.offsetWidth; ring.classList.add("is-on"); }, 780 + 450);
      setTimeout(function () { stage.classList.add("is-idle"); }, 780 + 700);
    }
    stage.addEventListener("click", function () { if (active && stage.classList.contains("is-idle")) build(); });
    if (active) { cubes.forEach(function (v) { both(v, function (el) { el.classList.add("is-wait"); }); }); whenIntroDone(build); }
    else stage.classList.add("is-idle");
  }

  /* ---------- Type: headings type in with a lime block cursor; the rest keeps its space so nothing moves ---------- */
  function type(el, done) {
    var text = el.__ztext || (el.__ztext = el.textContent.replace(/\s+/g, " ").trim());
    if (!text) { if (done) done(); return; }
    var token = el.__ztoken = {};
    var step = Math.max(14, Math.min(34, 900 / text.length)), i = 0, last = 0;
    el.setAttribute("aria-label", text);
    var a = document.createElement("span"), cur = document.createElement("span"), b = document.createElement("span");
    [a, cur, b].forEach(function (s) { s.setAttribute("aria-hidden", "true"); });
    cur.className = "zt-cur"; b.className = "zt-rest";
    el.textContent = ""; el.appendChild(a); el.appendChild(cur); el.appendChild(b);
    b.textContent = text;
    function frame(now) {
      if (el.__ztoken !== token) return; // cancelled by a language switch
      if (now - last >= step) {
        last = now;
        i = Math.min(text.length, i + 1);
        a.textContent = text.slice(0, i); b.textContent = text.slice(i);
      }
      if (i < text.length) { requestAnimationFrame(frame); return; }
      setTimeout(function () {
        if (el.__ztoken !== token) return;
        el.textContent = text; el.removeAttribute("aria-label"); if (done) done();
      }, 1100);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Pixel uncover: a grid of cells over the block, gone in a scattered order ---------- */
  function addPixels(el) {
    if (el.__zpx) return;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var cell = r.width < 360 ? 24 : 40;
    var cols = Math.max(4, Math.min(18, Math.round(r.width / cell)));
    var rows = Math.max(3, Math.min(14, Math.round(r.height / cell)));
    var cover = "", up = el.parentElement;
    while (up && up !== root) { // nearest real background, so the cells match what is behind
      var bg = getComputedStyle(up).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") { cover = bg; break; }
      up = up.parentElement;
    }
    var grid = document.createElement("div");
    grid.className = "zpx"; grid.setAttribute("aria-hidden", "true");
    grid.style.setProperty("--cols", cols);
    if (cover) grid.style.setProperty("--px-cover", cover);
    var html = "", total = cols * rows;
    for (var i = 0; i < total; i++) {
      var accent = Math.random() < 0.08 ? pick(["c-red", "c-lime", "c-face"]) : "";
      var col = i % cols, row = Math.floor(i / cols);
      var delay = Math.round((col / cols) * 300 + (row / rows) * 200 + Math.random() * 360 + (accent ? 240 : 0));
      html += '<i class="' + accent + '" style="--pd:' + delay + 'ms"></i>';
    }
    grid.innerHTML = html;
    el.appendChild(grid);
    el.classList.add("has-px");
    el.__zpx = grid;
  }
  function dropPixels(el) {
    var g = el.__zpx; if (!g) return;
    el.__zpx = null;
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); el.classList.remove("has-px"); }, 1400);
  }

  /* ---------- Spawn reveal ---------- */
  var io = null;
  function prepare(scope) {
    scope.querySelectorAll("[data-zakpy-stagger]").forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (child, i) {
        if (!child.hasAttribute("data-zakpy-reveal")) child.setAttribute("data-zakpy-reveal", "");
        child.style.setProperty("--d", Math.min(i, 8) * 80 + "ms");
      });
    });
    scope.querySelectorAll('[data-zakpy-reveal="pixels"]').forEach(function (el) { if (!el.classList.contains("is-in")) addPixels(el); });
  }
  function reveal(el) {
    var kind = el.getAttribute("data-zakpy-reveal");
    el.classList.add("is-in");
    if (kind === "type") type(el);
    if (kind === "pixels") dropPixels(el);
  }
  function observe(scope) {
    if (!active || !io) return;
    prepare(scope);
    scope.querySelectorAll("[data-zakpy-reveal]").forEach(function (el) { if (!el.classList.contains("is-in")) io.observe(el); });
  }
  function startReveals() {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    observe(document);
    setTimeout(function () { // safety net: whatever is on screen after a few seconds is shown
      document.querySelectorAll("[data-zakpy-reveal]:not(.is-in)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      });
    }, 4000);
  }
  function replay(scope) {
    scope = scope || document;
    scope.querySelectorAll("[data-zakpy-reveal]").forEach(function (el) {
      el.classList.remove("is-in");
      if (el.getAttribute("data-zakpy-reveal") === "pixels") addPixels(el);
    });
    void root.offsetWidth;
    observe(scope);
  }
  function whenIntroDone(fn) {
    if (!root.classList.contains("intro-play")) { fn(); return; }
    var mo = new MutationObserver(function () {
      if (!root.classList.contains("intro-play")) { mo.disconnect(); setTimeout(fn, 150); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  }
  // A language switch rewrites the text: stop running typing, forget cached text.
  document.addEventListener("zakpy:lang", function () {
    document.querySelectorAll('[data-zakpy-reveal="type"], [data-zakpy-type]').forEach(function (el) {
      el.__ztoken = null; el.__ztext = null; el.removeAttribute("aria-label");
    });
  });

  /* ---------- Levels: the game window, one level at a time, XP fills, a cube is collected per level ---------- */
  function initLevels(sec) {
    var levels = Array.prototype.slice.call(sec.querySelectorAll(".level"));
    var win = sec.querySelector(".levels__win"), body = sec.querySelector(".levels__body");
    if (!win || !body || levels.length < 2) return;
    var n = levels.length, current = -1, pinned = false, XP = 14;
    sec.style.setProperty("--n", n);

    var bar = document.createElement("div");
    bar.className = "levels__bar"; bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<span>ZAKPY</span><span class="levels__lv"></span>';
    win.insertBefore(bar, win.firstChild);
    var xp = document.createElement("div");
    xp.className = "levels__xp"; xp.setAttribute("aria-hidden", "true");
    for (var k = 0; k < XP; k++) xp.appendChild(document.createElement("i"));
    win.appendChild(xp);
    var stack = document.createElement("div");
    stack.className = "levels__stack"; stack.setAttribute("aria-hidden", "true");
    body.appendChild(stack);
    var flash = document.createElement("span");
    flash.className = "levels__flash"; flash.setAttribute("aria-hidden", "true");
    win.appendChild(flash);
    var lv = bar.querySelector(".levels__lv"), segs = xp.children, stackCubes = [];

    function pad(v) { return (v < 10 ? "0" : "") + v; }
    function label() { lv.textContent = tr("ui.level", "Level") + " " + pad(current + 1) + "/" + pad(n); }
    function buildStack() { // one cube per level, stacked bottom up, the last one is the lime core
      stack.innerHTML = "";
      var cubes = [];
      for (var c = 0; c < n; c++) cubes.push({ x: 0, y: (n - 1 - c) + 0.47, core: c === n - 1 });
      cubes.forEach(function (cb) { cb.solo = true; }); // shown one by one, so each keeps all its faces
      stackCubes = buildVoxels(stack, cubes);
      stackCubes.forEach(function (v) { both(v, function (el) { el.classList.add("is-wait"); }); });
    }
    function setLevel(i) {
      if (i === current) return;
      var up = i > current && current !== -1;
      current = i;
      levels.forEach(function (c, k) { c.classList.toggle("is-active", k === i); c.setAttribute("aria-hidden", k === i ? "false" : "true"); });
      win.setAttribute("data-tint", levels[i].getAttribute("data-tint") || "mist");
      label();
      stackCubes.forEach(function (v, k) {
        var shown = !v.back.classList.contains("is-wait");
        if (k <= i && !shown) drop(v, 160);
        if (k > i && shown) both(v, function (el) { el.classList.remove("is-drop"); el.classList.add("is-wait"); });
      });
      if (up && !reduced) { flash.textContent = tr("ui.levelUp", "Level up"); flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on"); }
      var head = levels[i].querySelector("[data-zakpy-type]");
      if (head && !reduced) type(head);
    }
    function canPin() { return active && window.innerWidth >= 300 && window.innerHeight >= 460; } // phones too, owner decision
    function setPinned(on) {
      if (on === pinned) return;
      pinned = on;
      sec.classList.toggle("is-pinned", on);
      if (on) { buildStack(); current = -1; update(); }
      else levels.forEach(function (c) { c.classList.remove("is-active"); c.removeAttribute("aria-hidden"); });
    }
    function update() { // on every scroll event: one rect read, classes change only when needed
      if (!pinned) return;
      var r = sec.getBoundingClientRect(), span = r.height - window.innerHeight;
      var hold = parseFloat(getComputedStyle(sec).getPropertyValue("--hold")) / 100 * window.innerHeight || 0;
      var raw = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      var p = Math.min(1, raw / Math.max(0.01, 1 - hold / span)); // levels play out first, then the last one holds while you read
      setLevel(Math.min(n - 1, Math.floor(p * n * 0.999)));
      var on = Math.round(p * XP);
      for (var s = 0; s < XP; s++) segs[s].classList.toggle("is-on", s < on);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", function () { setPinned(canPin()); update(); });
    document.addEventListener("zakpy:lang", function () { if (pinned && current >= 0) label(); });
    setPinned(canPin());
  }

  /* ---------- Scroll XP bar: html[data-zakpy-xp] ---------- */
  function initXp() {
    if (!root.hasAttribute("data-zakpy-xp")) return;
    var bar = document.createElement("div"), N = 24;
    bar.className = "xpbar"; bar.setAttribute("aria-hidden", "true");
    for (var i = 0; i < N; i++) bar.appendChild(document.createElement("i"));
    document.body.appendChild(bar);
    var segs = bar.children, lastOn = -1;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var on = max > 0 ? Math.round((window.pageYOffset / max) * N) : 0;
      if (on === lastOn) return;
      lastOn = on;
      for (var s = 0; s < N; s++) segs[s].classList.toggle("is-on", s < on);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Header: always visible (sticky) on every screen; gets a soft shadow once the page scrolls ---------- */
  function initHeader() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    function update() { nav.classList.toggle("is-scrolled", window.pageYOffset > 8); }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target : e.target.parentElement;
    var r = el && el.closest("[data-zakpy-reveal-replay]");
    if (r) replay(document.getElementById(r.getAttribute("data-zakpy-reveal-replay")) || document);
  });

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('[data-zakpy-voxels="logo"]').forEach(initStage);
    document.querySelectorAll("[data-zakpy-levels]").forEach(initLevels);
    initHeader();
    initXp();
    if (active) { prepare(document); whenIntroDone(startReveals); }
  });

  window.Zakpy = window.Zakpy || {};
  window.Zakpy.motion = {
    refresh: function (scope) { observe(scope || document); },
    replay: replay, type: type, reduced: reduced,
    voxels: function (host, cubes) { return buildVoxels(host, cubes); }
  };
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
