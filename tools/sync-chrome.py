#!/usr/bin/env python3
"""Keep the terminal frame identical on every page.

Every page has two marked blocks:
    <!-- chrome:top --> ... <!-- /chrome:top -->        the status bar
    <!-- chrome:bottom --> ... <!-- /chrome:bottom -->  command line + function keys

To change the frame, edit TOP or BOTTOM below, then run from the site folder:
    python3 tools/sync-chrome.py

{screen} comes from the page's <body data-screen="...">, and {back} links to its
<body data-parent="...">. Page content between the blocks is never touched.
"""
import pathlib, re, sys

TOP = '''<!-- chrome:top -->
  <header class="bar top">
    <span><a href="index.html" title="Home">BLACKWELL/OS 2.6</a></span>
    <span id="where" class="hide-sm">{screen}</span>
    <span id="clock" aria-hidden="true"></span>
  </header>
  <!-- /chrome:top -->'''

BOTTOM = '''<!-- chrome:bottom -->
  <div class="foot">
  <form class="cmd" id="cmdform" autocomplete="off">
    <label for="cmd">COMMAND ===&gt;</label>
    <input id="cmd" name="cmd" spellcheck="false" aria-describedby="msg">
    <span class="cursor" aria-hidden="true"></span>
  </form>
  <div class="msg" id="msg" role="status">PRESS / TO TYPE A COMMAND. TYPE HELP FOR A LIST.</div>
  <nav class="bar bottom" aria-label="Function keys">
    <span>{back}</span>
    <span class="hide-sm keys-only">&uarr;&darr;=SELECT &nbsp;ENTER=OPEN</span>
    <span><a href="index.html">H=HOME</a></span>
    <span><a href="help.html">?=HELP</a></span>
  </nav>
  </div>
  <!-- /chrome:bottom -->'''

site = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
changed = 0
for page in sorted(site.glob("*.html")):
    text = page.read_text(encoding="utf-8")
    if "<!-- chrome:top -->" not in text:
        continue
    body = re.search(r'<body[^>]*>', text).group(0)
    screen = (re.search(r'data-screen="([^"]*)"', body) or [None, ""])[1]
    parent = (re.search(r'data-parent="([^"]*)"', body) or [None, ""])[1]
    back = f'<a href="{parent}" data-back>ESC=BACK</a>' if parent else '<button type="button" data-back>ESC=BACK</button>'
    new = re.sub(r'<!-- chrome:top -->.*?<!-- /chrome:top -->', lambda m: TOP.format(screen=screen), text, flags=re.S)
    new = re.sub(r'<!-- chrome:bottom -->.*?<!-- /chrome:bottom -->', lambda m: BOTTOM.format(back=back), new, flags=re.S)
    if new != text:
        page.write_text(new, encoding="utf-8")
        changed += 1
        print("updated", page.name)
print(f"{changed} page(s) updated")
