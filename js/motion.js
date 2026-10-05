
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
    bar.innerHTML = '<span></span><span class="levels__lv"></span>';
    bar.firstChild.textContent = sec.getAttribute("data-zakpy-levels-title") || "ZAKPY"; // window title, a site can set its own
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
