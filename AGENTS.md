# AGENTS.md (zakpy-front-end)

Read `../AGENTS.md` first for the group rules, then `README.md` here.

- Plain HTML, CSS and JS only. No framework, no npm dependency, no build tool beyond `scripts/build.sh` (shell and cat).
- Colours and fonts come from `../brand/tokens/tokens.css` and `../brand/fonts/`. Never define a brand colour here.
- Edit `css/` and `js/`, then run `scripts/build.sh` and commit `dist/` with the source.
- Every new component goes into `showcase/index.html` in light, dark and RTL.
- Every visible word goes through `data-i18n` with English, French and Darija. Check in a browser before saying it works: light, dark, Darija (RTL), 390 px wide, drawer open and closed.
- No emojis, no external servers, no em dashes. Documents short and accurate.
- Git: small commits on a branch, never commit as the owner unless told, never push to main without asking.
