"""Rebuilds js/merit-demo.js and merit-portal-demo.html from src/merit/merit-portal-demo.html.

    python3 src/merit/build_embed.py
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(os.path.dirname(HERE))
import re,json
s=open(os.path.join(HERE, 'merit-portal-demo.html'), encoding='utf-8').read()
st=s.index('<style>')+len('<style>'); en=s.index('</style>')
css=s[st:en]
css=re.sub(r"(?m)^0,600;0,700;1,400&display=swap'\);\n","",css)
css=css.replace(':root{',':host{',1)
css=css.replace('html, body { height: auto; }\n','')
css=re.sub(r'(?m)^body \{', '.ma-root {', css)
# In the terminal's demo window the stage is narrow: always one pane at a time with the toggle
css=css.replace('@media (max-width: 1180px) {\n  .dm-stage','@media all {\n  .dm-stage',1)
css=css.replace('@media (max-width: 1380px) { .dm-coach-main','@media all { .dm-coach-main',1)
assert '@media all {\n  .dm-stage' in css and '@media all { .dm-coach-main' in css
assert not re.search(r'(?m)^(?:html|body|:root)\b',css)
css=':host{all:initial;display:block}\n'+css
blocks=re.findall(r'<script>(.*?)</script>', s, re.S)
react, rdom, lib, demo = blocks
demo=demo.replace('var k = (location.hash || "").slice(1), i = -1;','var k = MA_START, i = -1;')
demo=demo.replace("document.querySelector('[data-note=\"' + next + '\"]')","MA_ROOT.querySelector('[data-note=\"' + next + '\"]')")
demo=demo.replace('document.getElementById("dm-legend")','MA_ROOT.getElementById("dm-legend")')
old='ReactDOM.createRoot(document.getElementById("app")).render(h(App));'
assert old in demo and 'MA_START' in demo
demo=demo.replace(old,'''window.mountMeritDemo = function (host, step) {
    if (host.__maRoot) { host.__maRoot.unmount(); }
    var sr = host.shadowRoot || host.attachShadow({ mode: "open" });
    sr.innerHTML = "<style>" + MA_CSS + "</style><div class=\\"ma-root\\"></div>";
    MA_ROOT = sr; MA_START = step || "mon";
    host.__maRoot = ReactDOM.createRoot(sr.querySelector(".ma-root"));
    host.__maRoot.render(h(App));
  };''')
out=('/* Merit America Learner Portal demo for the portfolio terminal.\n   Bundles React 18.3.1 (MIT), the portal design system and the "one week" demo.\n   Mounted into a shadow root so its styles never touch the terminal. */\n'
  + react + '\n;\n' + rdom + '\n;\nvar MA_ROOT = document, MA_START = "mon";\nvar MA_CSS = ' + json.dumps(css) + ';\n' + lib + '\n;\n' + demo + '\n').replace('</script','<\\/script')
open(os.path.join(SITE, 'js', 'merit-demo.js'), 'w', encoding='utf-8').write(out)
import shutil; shutil.copy(os.path.join(HERE, 'merit-portal-demo.html'), os.path.join(SITE, 'merit-portal-demo.html'))
print('wrote js/merit-demo.js and merit-portal-demo.html')
