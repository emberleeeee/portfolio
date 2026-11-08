"""Builds the portfolio from src/ into the Website folder.

    python3 src/build.py

Writes every .html page, css/terminal.css, js/terminal.js and js/demos.js.
Needs Python 3 and BeautifulSoup:  pip3 install beautifulsoup4
"""
import json, os, html, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)          # the Website folder (src/ lives inside it)
SITE = "https://design.emilyblackwell.com/"
CASES = json.load(open(os.path.join(HERE, "cases.json"), encoding="utf-8"))
import sys; sys.path.insert(0, HERE)
from arc_case import ARC
CASES["arc"] = ARC   # rewritten from the ARC project artifacts, kept generic

# ---- Images are out; demos open in context instead -------------------------
from bs4 import BeautifulSoup
# (case, kind, text the anchor starts with, scene, action label)
TRY = {
  "team-builder": [
    ("card", "Recreational League Roster Formation", "capacity", "Overfill a team and see the inline warning"),
    ("card", 'Auto-detect "Move"', "move-invite", "See a move and an invite detected for you"),
    ("card", "Draft-first", "", "Draft rosters without sending anything"),
    ("card", "Review actions in a slide-out", "review", "Review moves, invitations and sent invites before finalizing"),
    ("dl", "Invite Needed", "statuses", "See every invitation state on one board"),
  ],
  "tournaments": [
    ("card", "Introduce a bulk registration cart", "cart", "Register several teams in one checkout"),
    ("card", "Dynamic payment plan entry", "plan", "Build a payment plan"),
    ("quote", "Registrants were entering parent information", "copy", "Compare the original and updated labels"),
  ],
  "fieldhouse": [
    ("callout", "Core Tension", "off", "See the same colors without the luminance rule"),
    ("card", "Solving the Color Problem", "red", "Generate accessible shades from a red brand color"),
    ("card", "Management Console", "console", "Run the admin theme that stays consistent for every partner"),
    ("callout", "Dynamic shade generation", "", "Try the shade generator with any brand color"),
  ],
  "arc": [
    ("dl", "Fragmented workflows", "reconcile", "Answer a customer question across two tools"),
    ("p+", "I designed a new tool for finding any ticket", "lookup", "Look up a ticket and follow its exchange chain"),
    ("p+", "In the modernized reporting tool", "edit", "Change segments on a refund"),
    ("card", "Clarity over completeness", "clear", "See the clarified record"),
    ("card", "Terminology alignment", "terms", "See every code in plain language"),
    ("card", "Shareable states", "share", "Copy a customer-ready summary"),
  ],
  "merit-america": [
    ("callout", "Two questions, one system", "coach", "See the coach count a learner's proof"),
    ("card", "Weekly status over granular scoring", "status", "See the weekly status a learner starts with"),
    ("card", "Screenshot proof over costly integrations", "proof", "Submit proof and verify it as the coach"),
    ("card", "Mid-week nudges over constant monitoring", "nudge", "See a mid-week nudge go out"),
  ],
}
def try_link(scene, label):
    return BeautifulSoup(f'<p class="try"><a class="run-link" href="#run{"-" + scene if scene else ""}" data-scene="{scene}">'
                         f'<span aria-hidden="true">&gt;&gt; </span>RUN DEMO: {label}</a></p>', "html.parser")
def contextualize(cid, html_in):
    soup = BeautifulSoup(html_in, "html.parser")
    for el in soup.select("figure.fig, div.fig-grid, p.fig-cap"): el.decompose()
    for el in soup.select("a.run-link"): el.find_parent("p").decompose()
    for h in soup.select("h4.sub-h"):            # headings left with nothing under them
        nxt = h.find_next_sibling()
        if nxt is None or (nxt.name == "h4"): h.decompose()
    used = 0
    for kind, start, scene, label in TRY.get(cid, []):
        if kind == "card":
            for card in soup.select("div.card"):
                h = card.find("h5")
                if h and h.get_text(" ", strip=True).startswith(start):
                    card.append(try_link(scene, label)); used += 1; break
        elif kind == "callout":
            for co in soup.select("div.callout"):
                if co.get_text(" ", strip=True).startswith(start):
                    co.append(try_link(scene, label)); used += 1; break
        elif kind == "dl":
            for dl in soup.select("dl.record"):
                if dl.get_text(" ", strip=True).startswith(start):
                    dl.insert_after(try_link(scene, label)); used += 1; break
        elif kind == "p+":   # after the list that follows a paragraph
            for p_ in soup.find_all("p"):
                if p_.get_text(" ", strip=True).startswith(start):
                    tgt = p_.find_next_sibling()
                    (tgt if tgt is not None and tgt.name == "ul" else p_).insert_after(try_link(scene, label)); used += 1; break
        elif kind == "quote":
            for q in soup.select("figure.quote"):
                if q.get_text(" ", strip=True).startswith(start):
                    q.insert_after(try_link(scene, label)); used += 1; break
    return str(soup), used
TRY_COUNT = {}
for _cid, _c in CASES.items():
    _c["hero"] = ""
    for _s in _c["sections"]:
        _s["html"], n = contextualize(_cid, _s["html"])
        TRY_COUNT[_cid] = TRY_COUNT.get(_cid, 0) + n

WORK = [
  ("team-builder","B","Team Builder","LeagueApps","team-builder-case-study.html",
   "Cognitive efficiency in complex roster systems. A drag-and-drop roster tool that replaced spreadsheets and weekend-long data entry."),
  ("tournaments","T","Tournament Engine","LeagueApps","tournaments-case-study.html",
   "The tournament engine for youth sports, reimagined. Bulk registration, dynamic payment plans and waitlists, designed mobile-first for organizers in the field."),
  ("fieldhouse","F","Fieldhouse Design System","LeagueApps","fieldhouse-ds-case-study.html",
   "A modular framework for multi-domain design integrity. Rebuilt from the ground up: accessible by default, two themes, partner branding without the breakage."),
  ("arc","A","ARC Settlement","Airlines Reporting Corp.","arc-settlement-case-study.html",
   "Airline settlement interfaces for accuracy and speed. A UX-led overhaul of reconciliation tools used by 200+ airlines and travel agencies."),
  ("merit-america","M","Merit America Portal","Merit America","merit-america-case-study.html",
   "A learning experience for career transitions. A mobile-first learner portal that replaced spreadsheets and manual tracking."),
]
LAB = [
  ("L","L'Expedition","Etymology","https://etymology.emilyblackwell.com/","An etymology education platform built on a 225-entry database."),
  ("W","We Build the City","Urbanism","https://webuildthecity.org/","Essays on urban planning, placemaking and infrastructure, making the case for human-scale, walkable neighborhoods. Because cities are for people."),
]
RESUME = [
  ("Lead Product Designer","LeagueApps","07.2024 &ndash; Present"),
  ("Senior Product Designer","LeagueApps","01.2023 &ndash; 07.2024"),
  ("Senior User Experience Designer","Airlines Reporting Corporation","11.2020 &ndash; 01.2023"),
  ("Director of Design, Founding Member","Merit America","03.2018 &ndash; 11.2020"),
  ("Principal Interaction Designer + Illustrator","Ralula Design, LLC","08.2016 &ndash; 06.2018"),
]
EMAIL = "accounts@emilyblackwell.com"
LINKEDIN = "https://www.linkedin.com/in/emilyblackwell/"
IU = '<a href="https://www.google.com/search?q=Indiana+University+National+Champions" target="_blank" rel="noopener">We win. Google us.</a>'

def chrome_top(screen):
    return f'''<!-- chrome:top -->
  <header class="bar top">
    <span><a href="index.html" title="Home">BLACKWELL/OS 2.6</a></span>
    <span id="where" class="hide-sm">{screen}</span>
    <span id="clock" aria-hidden="true"></span>
  </header>
  <!-- /chrome:top -->'''

def chrome_bottom(parent):
    back = f'<a href="{parent}" data-back>ESC=BACK</a>' if parent else '<button type="button" data-back>ESC=BACK</button>'
    return f'''<!-- chrome:bottom -->
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

BOOT = '''<div id="boot" hidden>
  <pre id="boot-log"></pre>
  <button type="button" id="boot-go"><span id="boot-cta">PRESS ENTER TO LOAD</span><span class="boot-cursor" aria-hidden="true"></span></button>
</div>
'''
PROG = '''<div id="prog" role="dialog" aria-modal="true" aria-labelledby="prog-title" hidden>
  <div class="prog-bar">
    <span id="prog-title">RUNNING</span>
    <span class="btns"><button type="button" id="prog-reset">RESET</button><button type="button" id="prog-exit">EXIT (ESC)</button></span>
  </div>
  <div class="prog-hint" id="prog-hint"></div>
  <div class="prog-body">
    <div class="prog-win" id="prog-win"></div>
    <aside class="prog-notes" id="prog-notes" aria-label="Design notes"></aside>
  </div>
</div>
'''

def page(path, title, desc, screen, parent, body, extra="", kind="menu", fonts="", program="", battrs=""):
    canon = SITE + ("" if path == "index.html" else path)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{html.escape(desc, quote=True)}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(desc, quote=True)}">
<meta property="og:url" content="{canon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&amp;family=VT323{fonts}&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/terminal.css">
<script>document.documentElement.classList.add("js");try{{var p=localStorage.getItem("bos-ph"),s=localStorage.getItem("bos-scan");if(p)document.documentElement.dataset.phosphor=p;if(s)document.documentElement.dataset.scanlines=s}}catch(e){{}}</script>
</head>
<body class="crt" data-screen="{screen}" data-parent="{parent}" data-kind="{kind}"{f' data-program="{program}"' if program else ""}{battrs}>
<a class="skip" href="#screen">Skip to content</a>
{extra}<div class="frame">
  {chrome_top(screen)}

  <main id="screen" tabindex="-1">
{body}
  </main>

  {chrome_bottom(parent)}
</div>
{'<script src="js/merit-demo.js"></script>' + chr(10) if program == "merit-america" else ""}{'<script src="js/demos.js"></script>' + chr(10) if program else ""}<script src="js/terminal.js"></script>
</body>
</html>
'''

def opt(key, label, meta="", href=None, act=None, desc=None, raw=False, ext=False, mark=None):
    keyhtml = f'<span class="key">[{key}]</span>' if mark is None else f'<span class="key caret" aria-hidden="true">{mark}</span>'
    inner = f'{keyhtml}<span class="label">{label}</span><span class="lead" aria-hidden="true"></span><span class="meta{" raw" if raw else ""}">{meta}</span>'
    attrs = f' data-key="{key}"' + (f' data-act="{act}"' if act else "")
    if href:
        tgt = ' target="_blank" rel="noopener"' if ext else ""
        el = f'<a class="opt" href="{href}"{tgt}{attrs}>{inner}</a>'
    else:
        el = f'<button class="opt" type="button"{attrs}>{inner}</button>'
    d = f'<span class="opt-desc">{desc}</span>' if desc else ""
    return f'      <li>{el}{d}</li>'

def menu(rows, style=""):
    st = f' style="{style}"' if style else ""
    return f'    <ul class="menu"{st}>\n' + "\n".join(rows) + "\n    </ul>"

pages = {}

# ---- home
pages["index.html"] = page("index.html", "Emily Blackwell | Product Designer",
  "Emily Blackwell is a lead product designer specializing in complex B2B SaaS, design systems and embedded finance.",
  "MAIN.MENU", "", f'''    <h1 class="name">HELLO, I&rsquo;M EMILY, A LEAD PRODUCT DESIGNER FOR DATA-HEAVY B2B SAAS.</h1>
{menu([
  opt("W","Selected work",f"{len(WORK)} records","work.html"),
  opt("A","About","Profile","about.html"),
  opt("L","Lab","Side projects","lab.html"),
  opt("R","Resume","Experience","resume.html"),
  opt("C","Contact","Open channel","contact.html"),
  opt("D","Display settings","Phosphor, scanlines","display.html"),
])}''', extra=BOOT)

# ---- work index
pages["work.html"] = page("work.html", "Selected Work | Emily Blackwell",
  "Case studies: Team Builder, Tournament Engine, Fieldhouse Design System, ARC Settlement and Merit America Portal.",
  "WORK.INDEX", "index.html", f'''    <h2 class="screen-title">SELECTED WORK</h2>
    <p class="sub">SELECT A RECORD TO OPEN THE CASE FILE.</p>
{menu([opt(k,l,m,u,desc=d) for (_,k,l,m,u,d) in WORK])}''')

# Case metadata is the same five rows everywhere: Role, Company, Timeline, Focus, Methods.
# Values here fill the gaps, drawn from each case study's own text and former Tools/Standards rows.
META_FILL = {
  "team-builder": {"Company": "LeagueApps, New York City", "Timeline": "2024",
                   "Methods": "Discovery, mental model mapping, phased MVP planning, Figma, Miro, ChatGPT, Lovable"},
  "fieldhouse":   {"Company": "LeagueApps, New York City", "Timeline": "2023&ndash;2024",
                   "Methods": "Customization audit, internal focus groups, qualitative research, competitive benchmarking, WCAG 2.1 AA, Figma, Tokens Studio, Style Dictionary"},
  "merit-america": {"Methods": "Learner interviews, coach workflow shadowing, journey maps, early usability testing, Atomic Design"},
}
# ---- case pages: a case file (menu of sections) plus one subpage per section
def slug(t): return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
def excerpt(h, n=110):
    soup = BeautifulSoup(h, "html.parser")
    hd = soup.find(["h4","h5"]); li = soup.find("li")
    lead = (hd.get_text(" ", strip=True) + ": " + li.get_text(" ", strip=True) + ".") if hd and li else ""
    for el in soup.select(".lbl, .try, h4, h5, figcaption"): el.decompose()
    ps = [p for p in soup.find_all("p") if p.get_text(strip=True)]
    t = re.sub(r"\s+", " ", ps[0].get_text(" ") if ps else (lead or soup.get_text(" "))).strip()
    t = re.sub(r"\s+([.,;:!?])", r"\1", t)
    t = re.split(r"(?<=[.!?])\s", t)[0]
    return html.escape(t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + "\u2026")
SUBPAGES = {}
for i,(cid,key,label,meta,url,desc) in enumerate(WORK):
    c = CASES[cid]
    prev = WORK[(i-1) % len(WORK)]; nxt = WORK[(i+1) % len(WORK)]
    fonts = "&amp;family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700" + ("&amp;family=Source+Sans+3:wght@400;600;700" if cid == "arc" else "") + ("&amp;family=IBM+Plex+Sans+Condensed:wght@600;700" if cid in ("fieldhouse", "team-builder", "tournaments") else "") + ("&amp;family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400" if cid == "merit-america" else "")
    for s in c["sections"]:   # stray line breaks left between bold text and its punctuation
        s["html"] = re.sub(r"<br\s*/?>\s*(?=[.,;:!?])", "", s["html"])
    secs = c["sections"]; total = len(secs)
    base = url[:-5]
    subs = [(s, f"{base}-{slug(s['title'])}.html") for s in secs]
    SUBPAGES[url] = {slug(s["title"]): u for s,u in subs}
    years = [t for t in c["tags"] if re.fullmatch(r"\d{4}([–-]\d{4})?", t)]
    m = {("Role" if k == "My Role" else k): v for k,v in c["meta"]}
    m.update(META_FILL.get(cid, {}))
    m["Focus"] = " / ".join(t for t in c["tags"] if t not in years)
    m.setdefault("Timeline", years[0] if years else "")
    rows = [(k, m[k]) for k in ("Role", "Company", "Timeline", "Focus", "Methods") if m.get(k)]
    rec = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k,v in rows)
    toc = [opt(str(n+1), s["title"], "", u, mark="&gt;") for n,(s,u) in enumerate(subs)]
    body = f'''    <h2 class="screen-title">{label.upper()}</h2>
    <p class="lede case-lede">{c["title"].upper()}</p>
    <p class="sub">{c["sub"]}</p>
    <dl class="record">{rec}</dl>
{menu([opt("R","Run interactive demo","Live",act=f"run:{cid}")], "margin-top:26px")}
    <hr class="rule">
{menu(toc)}
    <hr class="rule">
{menu([opt("I","Work index","","work.html")])}'''
    pages[url] = page(url, f"{label} | Emily Blackwell", html.unescape(re.sub(r"<[^>]+>","",c["sub"])),
                      "WORK." + cid.upper(), "work.html", body, extra=PROG, kind="menu", fonts=fonts, program=cid,
                      battrs=f' data-sections="{" ".join(slug(s["title"]) for s in secs)}"')
    for n,(s,u) in enumerate(subs):
        sid = slug(s["title"])
        pv = subs[n-1] if n else None
        nx = subs[n+1] if n < total-1 else None
        nav = []
        if nx: nav.append(opt("N", f"Next: {nx[0]['title']}", f"{n+2:02}/{total:02}", nx[1]))
        if pv: nav.append(opt("P", f"Previous: {pv[0]['title']}", f"{n:02}/{total:02}", pv[1]))
        nav.append(opt("C", "Back to case file", label, url))
        nav.append(opt("R", "Run interactive demo", "Live", act=f"run:{cid}"))
        sbody = f'''    <p class="crumb"><a href="{url}">{label.upper()}</a> / SECTION {n+1:02} OF {total:02}</p>
    <section class="case-sec solo" id="{sid}" aria-labelledby="{sid}-h">
      <h2 class="screen-title" id="{sid}-h">{s["title"].upper()}</h2>
      {s["html"]}
    </section>
    <hr class="rule">
{menu(nav)}'''
        pages[u] = page(u, f"{s['title']} | {label} | Emily Blackwell", excerpt(s["html"], 155),
                        f"WORK.{cid.upper()}/{sid.upper()}", url, sbody, extra=PROG, kind="case", fonts=fonts, program=cid,
                        battrs=f' data-prev="{pv[1] if pv else url}" data-next="{nx[1] if nx else ""}"')

# ---- about
pages["about.html"] = page("about.html", "About | Emily Blackwell",
  "Emily Blackwell, lead product designer at LeagueApps, based in Washington, D.C.",
  "USER.PROFILE", "index.html", kind="doc", body=f'''    <h2 class="screen-title">ABOUT</h2>
    <p class="lede">I DESIGN FOR COMPLEXITY AND CLARITY AT ONCE.</p>
    <p>I'm a Lead Product Designer with 8+ years of experience building enterprise SaaS products that serve real operational needs. I specialize in systems thinking: designing experiences where the stakes are high and the edge cases are many.</p>
    <p>Currently at LeagueApps, I lead design across two product teams, own the Fieldhouse Design System, and partner with multiple disciplines on AI-assisted tooling that's cut handoff time by 1 to 2 sprints.</p>
    <hr class="rule">
    <dl class="record">
      <dt>Name</dt><dd>Emily Blackwell</dd>
      <dt>Current</dt><dd>Lead Product Designer, LeagueApps</dd>
      <dt>Experience</dt><dd>20+ years in UX and product design</dd>
      <dt>Education</dt><dd>BA in Studio Art + Graphic Design, minor in Art History<br>Indiana University. {IU}</dd>
      <dt>Location</dt><dd>Washington, D.C.</dd>
    </dl>
    <hr class="rule">
    <p>I design for the parts of software where the logic gets dense: pricing rules that stack, permissions that differ by role and environment, money that moves in several directions at once. Most of my work for the past decade has been complex B2B SaaS, with a deep specialization in design systems and embedded finance.</p>
    <p>I lead through influence more than authority, and I care about the craft and the consequences of how we build, including what AI acceleration costs us.</p>
    <p>Away from product work I make things by hand: Risograph and letterpress, small-format painting, compass-and-straightedge geometry, and a long-running interest in etymology and art history.</p>
    <hr class="rule">
{menu([opt("R","Resume","Experience","resume.html"), opt("C","Contact","","contact.html")])}''')

# ---- resume
rows = "\n".join(f'        <tr><td><b>{r}</b><span class="org">{o}</span></td><td class="dates">{d}</td></tr>' for r,o,d in RESUME)
pages["resume.html"] = page("resume.html", "Resume | Emily Blackwell",
  "Experience: LeagueApps, Airlines Reporting Corporation, Merit America and Ralula Design.",
  "USER.RESUME", "index.html", kind="doc", body=f'''    <h2 class="screen-title">RESUME</h2>
    <table class="jobs">
      <caption class="sr">Work history</caption>
      <thead><tr><th scope="col">Role</th><th scope="col">Dates</th></tr></thead>
      <tbody>
{rows}
      </tbody>
    </table>
    <h3>EDUCATION</h3>
    <dl class="record"><dt>BA</dt><dd>Studio Art + Graphic Design, minor in Art History<br>Indiana University. {IU}</dd></dl>''')

# ---- lab
pages["lab.html"] = page("lab.html", "Lab | Emily Blackwell",
  "Self-initiated projects: L'Expedition and We Build the City.",
  "LAB.INDEX", "index.html", f'''    <h2 class="screen-title">LAB</h2>
    <p class="sub">SELF-INITIATED PROJECTS.</p>
{menu([opt(k,l,m,u,desc=d,ext=True) for (k,l,m,u,d) in LAB])}''')

# ---- contact
pages["contact.html"] = page("contact.html", "Contact | Emily Blackwell",
  "Get in touch with Emily Blackwell by email or LinkedIn.",
  "COMM.CHANNEL", "index.html", f'''    <h2 class="screen-title">CONTACT</h2>
    <p class="sub">CHANNEL OPEN. RESPONSES WITHIN 48 HOURS.</p>
{menu([
  opt("E","Email",EMAIL,f"mailto:{EMAIL}",act="email",raw=True),
  opt("L","LinkedIn","linkedin.com/in/emilyblackwell",LINKEDIN,raw=True,ext=True),
  opt("R","Resume","Experience","resume.html"),
])}''')

# ---- display
pages["display.html"] = page("display.html", "Display Settings | Emily Blackwell",
  "Adjust the terminal's phosphor color and scanlines.",
  "SYS.DISPLAY", "index.html", f'''    <h2 class="screen-title">DISPLAY</h2>
    <p class="sub">ADJUST THE TERMINAL. SETTINGS PERSIST ON THIS DEVICE.</p>
{menu([
  opt("G","Green phosphor",'<span data-state="ph:green"></span>',act="ph:green"),
  opt("A","Amber phosphor",'<span data-state="ph:amber"></span>',act="ph:amber"),
  opt("W","White phosphor",'<span data-state="ph:white"></span>',act="ph:white"),
  opt("C","Weather Channel",'<span data-state="ph:weather"></span>',act="ph:weather"),
  opt("S","Scanlines and flicker",'<span data-state="scan"></span>',act="scan"),
])}
    <noscript><p class="dim">Display settings need JavaScript.</p></noscript>''')

# ---- help
pages["help.html"] = page("help.html", "Help | Emily Blackwell",
  "Keyboard shortcuts and commands for this portfolio.",
  "SYS.HELP", "index.html", kind="doc", body='''    <h2 class="screen-title">HELP</h2>
    <dl class="record">
      <dt>Letter and number keys</dt><dd>Jump to the bracketed option, e.g. [W] or [3]</dd>
      <dt>&uarr; &darr;</dt><dd>Move the selection</dd>
      <dt>Enter</dt><dd>Open the selection</dd>
      <dt>&larr; &rarr;</dt><dd>Previous or next section, inside a case study</dd>
      <dt>Esc</dt><dd>Back one level (or select ESC=BACK)</dd>
      <dt>H</dt><dd>Main menu</dd>
      <dt>/</dt><dd>Type a command</dd>
    </dl>
    <hr class="rule">
    <h3>COMMANDS</h3>
    <dl class="record">
      <dt>WORK, ABOUT, RESUME, LAB, CONTACT</dt><dd>Go to a section</dd>
      <dt>OPEN &lt;NAME&gt;</dt><dd>Open a case, e.g. OPEN FIELDHOUSE</dd>
      <dt>RUN &lt;NAME&gt;</dt><dd>Launch a live prototype, e.g. RUN FIELDHOUSE</dd>
      <dt>GREEN, AMBER, WHITE, WEATHER</dt><dd>Change the display theme</dd>
      <dt>SCANLINES</dt><dd>Toggle the CRT effect</dd>
      <dt>HOME, BACK, HELP</dt><dd>Navigate</dd>
    </dl>
    <p class="dim">Everything is also clickable and tappable.</p>''')

# ---- redirects for retired-only addresses
def redirect(target, label):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{label} | Emily Blackwell</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{SITE}{target}">
<meta http-equiv="refresh" content="0; url={target or './'}">
</head>
<body>
<p>This page has moved. <a href="{target or './'}">Continue to {label}</a>.</p>
</body>
</html>
'''
pages["case-study.html"] = redirect("work.html", "Selected Work")
pages["design-system.html"] = redirect("", "Emily Blackwell")

os.makedirs(OUT, exist_ok=True)
for name, content in pages.items():
    open(os.path.join(OUT, name), "w").write(content)
print("\n".join(sorted(pages)))
print("demo links placed:", TRY_COUNT, "expected:", {k: len(v) for k, v in TRY.items()})

# ---- assets: one CSS file and two JS files, assembled from src/
def cat(paths, sep="\n"):
    return sep.join(open(os.path.join(HERE, p), encoding="utf-8").read() for p in paths)
os.makedirs(os.path.join(OUT, "css"), exist_ok=True); os.makedirs(os.path.join(OUT, "js"), exist_ok=True)
open(os.path.join(OUT, "css", "terminal.css"), "w", encoding="utf-8").write(cat(["css/css_terminal.css", "css/css_prog_app.css"]))
open(os.path.join(OUT, "js", "demos.js"), "w", encoding="utf-8").write(
    cat(["demos/" + f for f in ["demos_head.js", "fh_adapted.js", "demos_tb.js", "demos_te.js", "demos_arc.js", "demos_ma.js"]], sep=""))
open(os.path.join(OUT, "js", "terminal.js"), "w", encoding="utf-8").write(cat(["terminal.js"]))
print("assets written: css/terminal.css, js/demos.js, js/terminal.js")
