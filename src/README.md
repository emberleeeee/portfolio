# Portfolio source

Everything that generates design.emilyblackwell.com. Edit files here, then rebuild.

## Rebuild the site

From the Website folder:

```
pip3 install beautifulsoup4        # once
python3 src/build.py               # all pages, css/terminal.css, js/terminal.js, js/demos.js
python3 src/merit/build_embed.py   # only after editing the Merit America demo
```

The build writes into the Website folder itself (the parent of `src/`).

## What lives where

| File | What it controls |
| --- | --- |
| `build.py` | Page templates, menus, About, Resume, Lab, Contact, Help, Display, case-file metadata, and where "Run demo" links appear (`TRY`) |
| `cases.json` | Case study text for Team Builder, Tournaments, Fieldhouse and Merit America |
| `arc_case.py` | ARC case study text (kept generic under NDA) |
| `css/css_terminal.css` | The terminal look, type scale and themes (green, amber, white, Weather Channel) |
| `css/css_prog_app.css` | The demo window and every demo's product UI |
| `terminal.js` | Keyboard navigation, command line, display settings, demo launcher |
| `demos/*.js` | One file per demo; concatenated into `js/demos.js` in this order: head, fh_adapted, tb, te, arc, ma |
| `merit/merit-portal-demo.html` | The Merit America "one week" demo; `build_embed.py` turns it into `js/merit-demo.js` |

`tools/sync-chrome.py` (outside `src/`) rewrites only the shared header and footer on every page.

## Notes

- All demo data is fictional. The ARC demo restyles real flows with made-up data; keep ARC names and artifacts out of this repo.
- Live files need permissions 644 (files) and 755 (folders) on the server.
