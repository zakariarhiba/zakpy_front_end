# zakpy-front-end

The ZAKPY style as plain HTML, CSS and JavaScript. Every ZAKPY site and app takes its look from here. No framework, no build tool, no external server (fonts are self-hosted).

Source of truth for colours and fonts is `../brand/`. This repo turns it into ready-to-use components.

## Use it in a site

1. `scripts/build.sh` builds `dist/` (CSS with brand tokens first, JS, fonts, logo).
2. Copy `dist/` into the site (for example `sites/academy/public/zakpy/`), then:

```html
<html lang="en" dir="ltr" data-zakpy-intro>   <!-- data-zakpy-intro = 3D intro on first entry -->
<link rel="stylesheet" href="/zakpy/zakpy.css">
<script src="/site-text.js"></script>          <!-- optional: your own words, see Languages -->
<script src="/zakpy/zakpy.js"></script>        <!-- in head, no defer: theme, language and intro apply before first paint -->
```

Sites hold their own copy so each deploys alone. Never edit the copy, change it here and copy again.

## What is inside

| Path | Content |
|---|---|
| `css/` | Source layers: fonts, semantic tokens (light and dark), base, layout, components, utilities. |
| `js/zakpy.js` | Languages, theme toggle, mobile side drawer, 3D intro, tabs, dialog. Opt in with `data-zakpy-*` attributes. |
| `dist/` | Built output to copy into sites. Committed on purpose. |
| `showcase/index.html` | Living style guide: open it to see every component (serve the folder, for example `python3 -m http.server`). |

Components: button, link with arrow, card, navigation, hero, badge, alert, form fields, table, stat, steps, tabs, dialog, footer. Layout helpers: container, section, stack, cluster, grid, split.

## Languages (English, French, Darija, Arabic)

- Languages: `en`, `fr`, `ary` (Darija) and `ar` (Modern Standard Arabic), both Arabic ones right to left. A site picks its set on `<html data-zakpy-langs="en fr ar">` (default `en fr ary`). Buttons for other languages are hidden, a saved or browser language outside the set falls back to English. On the first visit the language comes from the visitor's browser preferences (the first one in their list that the site offers, otherwise English). A language picked by hand is saved and wins afterwards.
- Put text on elements with `data-i18n="key"` (or `data-i18n-attr="aria-label:key"`). Define the words before the script: `window.ZAKPY_I18N = { en: {...}, fr: {...}, ary: {...} }`. `showcase/i18n.js` is a full example.
- Switcher: buttons with `data-zakpy-lang-set="en|fr|ary|ar"` inside `.lang-switch`. Direction and fonts (Cairo for Arabic) follow automatically.
- Shared interface words (menu, close, theme, intro text) are built in. JS API: `Zakpy.setLang('fr')`.

## Navigation, theme icon, intro

- Mobile menu: three-line button (`.nav__toggle` with `.burger`) opens a side drawer with a slide transition, dimmed overlay, Escape and overlay close, focus handling. On mobile the burger is at the start of the bar and the logo at the end; the drawer opens from the same side as the burger (left in English and French, right in Darija). The language switch and theme toggle are hidden from the bar on mobile and appear at the bottom of the drawer (`.nav__drawer-tools`); on desktop they stay in the bar (`.nav__tools`). Copy the nav markup from `showcase/index.html`.
- Dark mode is an icon button (moon in light mode, sun in dark mode, `.theme-toggle`) with a translated `aria-label`.
- Entry intro: the voxel logo builds itself in the dark on the Hunter grid floor (cubes drop in turn, lime core last with two rings), then the ZAKPY window boots: the welcome line types in with a lime cursor and a segmented boot bar fills (about 3 seconds, tap or Escape skips, shorter with reduced motion; its text is always English). Plays once per browser session on pages with `data-zakpy-intro` on `<html>`. `?intro=1` forces it, `Zakpy.playIntro()` replays it.

## Rules

- Style rules come from `../brand/identity/brand-guide.md` and `frontend-design-system.md`. Red marks the main action, lime only success.
- Light and dark themes through `data-theme`. Right to left through `dir="rtl"` (Academy uses Arabic, font switches to Cairo).
- Use logical CSS properties (`margin-inline-start`, not `margin-left`) so RTL works.
- Status is never colour alone: badges and alerts carry text and a symbol.
- No emojis, no external fonts or scripts, no em dashes in text.
- Visible keyboard focus everywhere. Respect `prefers-reduced-motion`.

## Open points

- Primary button and step badges use `--accent-solid` (`#D32F2F` in light, 4.86:1 with Warm White, AA). Dark theme uses coral with ink text, 6.61:1. The brand red `#E53935` (4.13:1 under light text) is for the logo and accents only, never as a solid fill under normal text. Hover uses `#BE2524` (5.89:1).
- The logo is the transparent PNG (`brand/logos/logo_main_transparent.png`). A vector SVG mark would be sharper at small sizes and is still missing.
- No icon set yet.

## Motion (the ZAKPY game)

Files: `css/09-motion.css`, `js/motion.js` (built into `dist/zakpy.js`). The motion is a small game built from the logo: voxel cubes in the logo's oblique projection (dark red front, lighter red top and side, cream outline, lime core), the Hunter grid floor and rings, the ZAKPY window. Calm: short moves, only transform and opacity. Content is visible without JS; under `prefers-reduced-motion` nothing hides or moves.

| Piece | How to use |
| --- | --- |
| Logo stage | `<div data-zakpy-voxels="logo"></div>`: the mark is built from five voxels dropping onto a grid floor, lime core last with a ring, then a slow ring pulse. Hover lifts a cube, click rebuilds. Use with `.hero--game` (text and stage side by side, stage on top and centred on phones). The logo never mirrors in RTL. |
| Levels | `section.levels[data-zakpy-levels] > .levels__stage > .levels__win > .levels__body > article.level[data-tint]` (red, lime, mist). A game window pinned on screen: title bar with "Level 01/03", one level at a time, XP bar, one voxel collected per level, "Level up" badge, the last level holds (`--hold`, 75vh) so it can be read. The window title is "ZAKPY", or set your own with `data-zakpy-levels-title`. Headings inside with `data-zakpy-type` type in. Works on phones too (tighter window, centred below the sticky navbar, uses `svh`). Plain tinted cards only without JS, with reduced motion or on screens shorter than 460 px. |
| Type | `data-zakpy-reveal="type"` on a heading: types in with a lime block cursor, no layout jump, works in Darija. |
| Spawn | `data-zakpy-reveal` (pop in with a small bounce), `="fade"`, parent `data-zakpy-stagger` (children one after another). |
| Pixels | `data-zakpy-reveal="pixels"`: the block is uncovered cell by cell, a few cells flash red or lime. |
| Keys | Automatic on `.btn`: an extruded edge toward the top right like the logo; hover lifts it a little, click presses it in. |
| HUD | `.hud` label: monospace status line with a small voxel. |
| XP bar | `<html data-zakpy-xp>`: a segmented lime bar at the top fills as the page is read. |
| Header | `.nav` is always sticky at the top, on phones and laptops (owner decision). It gets a soft shadow once the page scrolls. Desktop links get a voxel marker on hover, lime for the current page. |
| API | `Zakpy.motion.refresh(scope)` after inserting content, `.replay(scope)`, `.type(el)`, `.voxels(host, [{x, y, core}])` to draw cubes anywhere. |

Rules: voxels never mirror. Faces where two cubes touch are not drawn (like the logo). Never name a class `.field` (form field). Never animate layout properties or SVG fill with `color-mix` (it flickers).

## Loading overlay

A full-screen overlay with the voxel logo on its grid floor: the four red cubes hop in turn around the plus and the lime core sends a ring each 1.6 s loop. Below, the ZAKPY window with a translated "Loading", a blinking lime cursor and a scanning segment bar. Built by `zakpy.js` (the logo markup is shared with the intro), no markup to copy.

- Automatic: same-site link clicks and plain form submits show it. Hash links, new-tab links, downloads, modifier clicks and `method="dialog"` forms do not. Opt out with `data-zakpy-no-loader` on the element or a parent.
- htmx: put `data-zakpy-loading` on the triggering element (or a parent) and it shows for the length of the request.
- Code: `Zakpy.loading.show()` and `Zakpy.loading.hide()` (counted, so overlapping waits work), or `Zakpy.loading.track(promise)`.
- It only appears if the wait lasts more than about 0.15 s, and once shown it stays at least 0.45 s, so fast pages never flicker. A 30 s safety timer removes it, and the back button restores a clean page.
- Reduced motion: the cube and rings stand still. Accessibility: `role="status"` and `aria-busy` on the page while it shows.
- Text key `ui.loading` can be overridden in `window.ZAKPY_I18N`. The showcase has a "Test the loader" button.

## Icons

47 outline icons in `brand/icons/` (one SVG per file, 24 px grid, 2 px stroke, round ends, `currentColor`). Themes come from the Instagram highlight covers (monitor, chat, heart, calendar, check, home, mail, cloud, star, award, pen, code, lightbulb, book) plus interface icons (palette, type, layout, menu, close, search, arrows, chevrons, plus, external, download, sun, moon, globe, user, lock, settings, bell, info, alert, clock, shield, play, folder, phone) and social networks (whatsapp, instagram, youtube, github, linkedin).

- `scripts/build.sh` builds the sprite (one `<symbol>` per file, id is `i-` plus the file name, so it never collides with a page id) and embeds it in `dist/zakpy.js`, which adds it to the page at load. Nothing else to copy.
- Use: `<svg class="icon" aria-hidden="true"><use href="#i-home"/></svg>`. Sizes `icon--sm`, `icon--lg`, colour `icon--accent` (red) or inherited text colour. Inside `.btn` the size adjusts itself. Add `icon--flip` to arrows so they mirror in Darija.
- An icon alone needs an `aria-label` on its button, never an empty control. With text next to it, keep `aria-hidden="true"`.
- `dist/zakpy-icons.svg` is also written for sites that prefer an external file (`href="zakpy-icons.svg#i-home"`, needs a web server, not `file://`).
- New icon: add one SVG file in `brand/icons/` following the rules in its README, run `scripts/build.sh`, add nothing else (the showcase lists the folder, regenerate its grid).

## Drawer link icons and groups

- Link icons exist only in the side drawer. Put `<svg class="icon nav__icon" aria-hidden="true"><use href="#i-home"/></svg>` before the text inside the link (wrap the text in a `<span>`). `.nav__icon` is hidden on desktop, so the top bar stays text only.
- Group (a route with sub routes): `<li class="nav__group"><button class="nav__group-toggle" type="button" aria-expanded="false" aria-controls="grp-x" data-zakpy-group>icon, text, chevron-down icon with class "icon icon--sm nav__chevron"</button><div class="nav__sub" id="grp-x"><ul><li><a>...</a></li></ul></div></li>`. In the drawer it is an accordion (smooth open, chevron turns). On desktop it is a dropdown under the link, closed by an outside click, Escape or choosing a sub link. Sub links are indented in the drawer. Copy the working example ("Components") from `showcase/index.html`.
- Sprite ids are `i-<name>` on purpose: a plain `menu` id collided with the drawer's own `id="menu"`.

