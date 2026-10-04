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

## Languages (English, French, Darija)

- Three languages: `en`, `fr` and `ary` (Darija, Arabic script, right to left). Default comes from the browser, the choice is saved.
- Put text on elements with `data-i18n="key"` (or `data-i18n-attr="aria-label:key"`). Define the words before the script: `window.ZAKPY_I18N = { en: {...}, fr: {...}, ary: {...} }`. `showcase/i18n.js` is a full example.
- Switcher: buttons with `data-zakpy-lang-set="en|fr|ary"` inside `.lang-switch`. Direction and fonts (Cairo for Arabic) follow automatically.
- Shared interface words (menu, close, theme, intro text) are built in. JS API: `Zakpy.setLang('fr')`.

## Navigation, theme icon, intro

- Mobile menu: three-line button (`.nav__toggle` with `.burger`) opens a side drawer with a slide transition, dimmed overlay, Escape and overlay close, focus handling. On mobile the burger is at the start of the bar and the logo at the end; the drawer opens from the same side as the burger (left in English and French, right in Darija). The language switch and theme toggle are hidden from the bar on mobile and appear at the bottom of the drawer (`.nav__drawer-tools`); on desktop they stay in the bar (`.nav__tools`). Copy the nav markup from `showcase/index.html`.
- Dark mode is an icon button (moon in light mode, sun in dark mode, `.theme-toggle`) with a translated `aria-label`.
- 3D intro: ported from the Hunter game (pure CSS 3D, about 3 seconds, tap or Escape skips, shorter with reduced motion; its text is always English). Plays once per browser session on pages with `data-zakpy-intro` on `<html>`. `?intro=1` forces it, `Zakpy.playIntro()` replays it.

## Rules

- Style rules come from `../brand/identity/brand-guide.md` and `frontend-design-system.md`. Red marks the main action, lime only success.
- Light and dark themes through `data-theme`. Right to left through `dir="rtl"` (Academy uses Arabic, font switches to Cairo).
- Use logical CSS properties (`margin-inline-start`, not `margin-left`) so RTL works.
- Status is never colour alone: badges and alerts carry text and a symbol.
- No emojis, no external fonts or scripts, no em dashes in text.
- Visible keyboard focus everywhere. Respect `prefers-reduced-motion`.

## Open points

- Primary button text contrast is 4.13:1 (Warm White on `#E53935`), under the 4.5:1 AA minimum for normal text. The brand guide asks for red buttons, so it is kept. Fix options: darker red for the button background, or larger bold text. Decision for the owner.
- The logo is the transparent PNG (`brand/logos/logo_main_transparent.png`). A vector SVG mark would be sharper at small sizes and is still missing.
- No icon set yet.

## Loading overlay

A full-screen overlay with the Hunter logo cube (spinning over a grid floor, rings, a ZAKPY window with a translated "Loading" text and a scan bar). Pure CSS, built by `zakpy.js`, no markup to copy.

- Automatic: same-site link clicks and plain form submits show it. Hash links, new-tab links, downloads, modifier clicks and `method="dialog"` forms do not. Opt out with `data-zakpy-no-loader` on the element or a parent.
- htmx: put `data-zakpy-loading` on the triggering element (or a parent) and it shows for the length of the request.
- Code: `Zakpy.loading.show()` and `Zakpy.loading.hide()` (counted, so overlapping waits work), or `Zakpy.loading.track(promise)`.
- It only appears if the wait lasts more than about 0.15 s, and once shown it stays at least 0.45 s, so fast pages never flicker. A 30 s safety timer removes it, and the back button restores a clean page.
- Reduced motion: the cube and rings stand still. Accessibility: `role="status"` and `aria-busy` on the page while it shows.
- Text key `ui.loading` can be overridden in `window.ZAKPY_I18N`. The showcase has a "Test the loader" button.

## Icons

44 outline icons in `brand/icons/` (one SVG per file, 24 px grid, 2 px stroke, round ends, `currentColor`). Themes come from the Instagram highlight covers (monitor, chat, heart, calendar, check, home, mail, cloud, star, award, pen, code, lightbulb, book) plus interface icons (menu, close, search, arrows, chevrons, plus, external, download, sun, moon, globe, user, lock, settings, bell, info, alert, clock, shield, play, folder, phone) and social networks (whatsapp, instagram, youtube, github, linkedin).

- `scripts/build.sh` builds the sprite `dist/zakpy-icons.svg` (one `<symbol>` per file, file name is the id). Copy it next to `zakpy.css`.
- Use: `<svg class="icon" aria-hidden="true"><use href="zakpy-icons.svg#home"/></svg>`. Sizes `icon--sm`, `icon--lg`, colour `icon--accent` (red) or inherited text colour. Inside `.btn` the size adjusts itself. Add `icon--flip` to arrows so they mirror in Darija.
- An icon alone needs an `aria-label` on its button, never an empty control. With text next to it, keep `aria-hidden="true"`.
- The sprite is loaded with an external `<use>`: it needs a web server (same origin), not `file://`.
- New icon: add one SVG file in `brand/icons/` following the rules in its README, run `scripts/build.sh`, add nothing else (the showcase lists the folder, regenerate its grid).

