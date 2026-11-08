/* Blackwell/OS interactive demos, one per case study.
   Each demo uses fictional, sanitized data and shows the decision at the center of its case.
   terminal.js opens a demo with  P[id].render(windowEl, notesEl)  and routes clicks on
   [data-a] to  P[id].action(name, el)  and edits on [data-in] to  P[id].input(el). */
(() => {
  const P = window.BOS_PROGRAMS = {};
  let W = null, N = null;
  const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  function notes(ctx, head, body, log){
    N.innerHTML = `<h4>DESIGN NOTES</h4><div class="ctx">${ctx}</div><p><b>${head}</b></p><p>${body}</p>` +
      (log && log.length ? `<h4 style="margin-top:22px">LOGIC LOG</h4><ul class="lines" style="font-size:13px">${log.map(l=>`<li>${l}</li>`).join("")}</ul>` : "");
  }
  const money = n => "$" + n.toLocaleString("en-US", {minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2});

  /* =====================================================================
     FIELDHOUSE: color generator (ported from color-generator-core.ts)
     ===================================================================== */
  const FH = { data:null };
  // Ported from color-generator-core.ts (Fieldhouse). Partners pick two colors;
  // each becomes 14 HSL shades, plus hover/active states and a reactive text color.
  const WHITE = "#FFFFFF", DS_DARK = "#263238";
  const SHADE_NAMES = [25,35,50,100,200,300,400,500,600,700,800,900,950,975];
  const LIGHT_CURVE = [98,96,94,86,73,62,54,46,40,33,26,18,15,12];
  const STD_CURVE   = [98,95,88,80,72,64,56,46,40,33,26,18,15,12];

  const hexToRgb = h => { h = h.replace("#",""); if(h.length===3) h = h.split("").map(c=>c+c).join(""); const n = parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; };
  const chan = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  const lum = hex => { const [r,g,b] = hexToRgb(hex); return 0.2126*chan(r) + 0.7152*chan(g) + 0.0722*chan(b); };
  const contrast = (a,b) => { const A = lum(a), B = lum(b); return (Math.max(A,B)+0.05) / (Math.min(A,B)+0.05); };
  const fmt = r => (Math.floor(r*10)/10).toFixed(1) + ":1";
  function hexToHsl(hex){
    let [r,g,b] = hexToRgb(hex).map(v=>v/255);
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b); let h = 0, s = 0; const l = (mx+mn)/2;
    if(mx !== mn){ const d = mx-mn; s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
      h = mx===r ? (g-b)/d + (g<b?6:0) : mx===g ? (b-r)/d + 2 : (r-g)/d + 4; h /= 6; }
    return { h:Math.round(h*360), s:Math.round(s*100), l:Math.round(l*100) };
  }
  function hslToHex(h,s,l){
    l /= 100; const a = s * Math.min(l,1-l) / 100;
    const f = n => { const k = (n + h/30) % 12; return Math.round(255*(l - a*Math.max(Math.min(k-3,9-k,1),-1))).toString(16).padStart(2,"0"); };
    return ("#"+f(0)+f(8)+f(4)).toUpperCase();
  }
  // invert-color in black/white mode: luminance above threshold gets the dark text
  const smartText = hex => lum(hex) > 0.24 ? DS_DARK : WHITE;
  const textOn = c => contrast(c,WHITE) >= contrast(c,DS_DARK) ? WHITE : DS_DARK;

  function generatePalette(hex){
    const { h, s, l } = hexToHsl(hex);
    const light = h >= 55 && h <= 185;
    const sat = s > 90 ? 90 : s;
    const curve = light ? LIGHT_CURVE : STD_CURVE;
    const steps = curve.map(L => hslToHex(h, sat, L));
    let hv, ac, rule;
    if(l > 65){ hv = l-10; ac = l-15; rule = "LIGHT COLOR: DARKER"; }
    else if(h >= 7 && h <= 215 && l > 30){ hv = l+10; ac = l+15; rule = "MID-RANGE HUE: LIGHTER"; }
    else { hv = l-10; ac = l-15; rule = "DARKER"; }
    hv = Math.max(5, Math.min(95, hv)); ac = Math.max(5, Math.min(95, ac));
    return { h, s, l, light, sat, steps, base:hex, hover:hslToHex(h,sat,hv), active:hslToHex(h,sat,ac), text:smartText(hex), rule, L:lum(hex) };
  }

  function fhSolve(st){
    const P = generatePalette(st.p), S = generatePalette(st.s);
    const tP = st.on ? P.text : WHITE, tS = st.on ? S.text : WHITE;
    const checks = [
      ["Primary fill", tP, P.base], ["Primary hover", tP, P.hover], ["Primary pressed", tP, P.active],
      ["Secondary fill", tS, S.base], ["Secondary hover", tS, S.hover]
    ].map(([label, fg, bg]) => ({ label, fg, bg, min:4.5, ratio:contrast(fg,bg) }));
    const log = [];
    const pal = (name, X) => {
      log.push(`${name} HUE ${X.h}&deg;: ${X.light ? "LIGHT CURVE (HUE 55&ndash;185)" : "STANDARD CURVE"}`);
      if(X.s > 90) log.push(`${name} SATURATION ${X.s}% CAPPED AT 90%`);
      log.push(st.on ? `${name} LUMINANCE ${X.L.toFixed(2)} ${X.L > 0.24 ? "&gt;" : "&le;"} 0.24: ${X.text===WHITE ? "WHITE TEXT" : "DARK TEXT #263238"}` : `${name}: WHITE TEXT FORCED`);
      log.push(`${name} HOVER/PRESSED: ${X.rule} BY 10/15`);
    };
    pal("PRIMARY", P); pal("SECONDARY", S);
    return { P, S, tP, tS, checks, log };
  }

  const FH_PRESETS = [
    ["Crimson & Gold","#C8102E","#FFC72C"],
    ["Gold & Black","#FFC72C","#111111"],
    ["Kelly & Navy","#4CBB17","#0B2D5B"],
    ["Sky & Navy","#6CACE4","#0B2D5B"],
    ["Orange & Teal","#FF6A13","#00778B"],
    ["Purple & Gold","#5B2C83","#FFC72C"]
  ];
  const WARN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17h.01"/></svg>`;

  const FH_TABS = `<div class="fh-tabs" role="tablist" aria-label="Fieldhouse themes">
      <button type="button" role="tab" data-a="view:portal">Member portal theming</button>
      <button type="button" role="tab" data-a="view:console">Management console</button></div>`;
  function fhMount(){
    const st = FH.data;
    if(st.view === "console") return fcMount();
    const picker = (k, label) => `<label class="fh-field"><span>${label}</span><span class="fh-pick">
        <input type="color" value="${st[k]}" data-in="${k}" aria-label="${label} color picker">
        <input type="text" value="${st[k]}" data-in="${k}" maxlength="7" aria-label="${label} hex value" spellcheck="false"></span></label>`;
    W.innerHTML = `<div class="app">${FH_TABS}
      <div class="fh-controls">
        ${picker("p","Primary")}${picker("s","Secondary")}
        <div class="fh-field"><span>Try a partner</span><div class="fh-presets">${FH_PRESETS.map(([n,a,b],i)=>
          `<button type="button" class="fh-preset" data-a="preset:${i}" aria-pressed="false"><i style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></i>${n}</button>`).join("")}</div></div>
        <div class="fh-logic"><b id="fh-lbl">Smart text color</b><button type="button" class="switch" role="switch" aria-labelledby="fh-lbl" data-a="logic"></button></div>
      </div>
      <div class="fh-body" id="fh-out"></div></div>`;
    fhTabs();
    fhUpdate();
  }
  function fhTabs(){
    W.querySelectorAll(".fh-tabs [role=tab]").forEach(b => { const on = b.dataset.a === "view:" + FH.data.view; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  }

  /* ---------------------------------------------------------------------
     MANAGEMENT CONSOLE: the second Fieldhouse theme. Token values are the
     Fieldhouse "mgmt" mode: LeagueApps green for brand and interaction,
     blue-grey neutrals, and status colors that never borrow a partner hue.
     --------------------------------------------------------------------- */
  const MC = { brand:"#007A00", brandHover:"#004B00", brandActive:"#002D00", surface:"#FFFFFF", page:"#F9FAFB", subtle:"#F3F5F6",
    text:"#273035", text2:"#485861", border:"#6F8895", borderLight:"#D0D8DC", dark:"#273035",
    success:"#007A00", successBg:"#F1F9F1", danger:"#A20707", dangerBorder:"#D90606", dangerBg:"#FEEBEB", dangerFill:"#BF0808",
    warning:"#AE5404", warningBg:"#FEF0E4", info:"#0B5EE5", infoBg:"#E7F0FE" };
  const FC_ROWS = [
    ["Ava Thompson","U12 Blue","paid"], ["Mateo Alvarez","U12 Blue","plan"], ["Jonah Kim","U12 White","paid"],
    ["Priya Shah","U12 White","due"], ["Eli Brooks","Unassigned","wait"], ["Sam Okafor","U12 Blue","paid"] ];
  const FC_STATUS = { paid:["success","Paid"], plan:["info","Payment plan"], due:["danger","Past due"], wait:["warning","Waitlist"] };
  const OCT = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;

  function fcMount(){
    W.innerHTML = `<div class="app">${FH_TABS}
      <div class="fh-controls"><div class="fh-field"><span>Switch partner</span><div class="fh-presets">${FH_PRESETS.map(([n,a,b],i)=>
          `<button type="button" class="fh-preset" data-a="preset:${i}" aria-pressed="false"><i style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></i>${n}</button>`).join("")}</div></div>
        <p class="fh-aside">Partner colors theme the member portal. Here they only reach the org badge.</p></div>
      <div class="fc-wrap" id="fh-out"></div></div>`;
    fhTabs();
    fcUpdate();
  }
  function fcUpdate(){
    const st = FH.data, P = generatePalette(st.p), c = st.c;
    const org = st.preset >= 0 ? FH_PRESETS[st.preset][0].split(" & ")[0] + " FC" : "Riverside FC";
    const initials = org.split(" ").map(w => w[0]).join("").slice(0,2);
    W.querySelectorAll(".fh-preset").forEach((b,i) => b.setAttribute("aria-pressed", String(st.preset===i)));
    const badge = (k) => `<span class="fc-badge ${FC_STATUS[k][0]}">${FC_STATUS[k][1]}</span>`;
    const tab = (id, label, n) => `<button type="button" role="tab" aria-selected="${c.tab===id}" data-a="ctab:${id}">${label}${n != null ? `<span class="fc-count">${n}</span>` : ""}</button>`;
    const capErr = c.cap !== "" && (+c.cap < 128 || !/^\d+$/.test(c.cap));
    let body;
    if(c.tab === "overview") body = `
      <div class="fc-stats"><div><small>Registrations</small><b>128</b></div><div><small>Open spots</small><b>${c.open ? 12 : 0}</b></div><div><small>Waitlist</small><b>5</b></div></div>
      <div class="fc-card">
        <div class="fc-line"><span><b>Registration</b><small>Families can register from the program page.</small></span>
          <button type="button" class="fc-switch" role="switch" aria-checked="${c.open}" aria-label="Registration open" data-a="copen"></button></div>
        <label class="fc-line fc-check"><input type="checkbox" data-in="cmail" ${c.mail ? "checked" : ""}><span><b>Email families when a spot opens</b><small>Sent to the first family on the waitlist.</small></span></label>
      </div>
      <div class="fc-actions"><button type="button" class="fc-btn tertiary" data-a="cnote:preview">Preview page</button>
        <button type="button" class="fc-btn secondary" data-a="cnote:edit">Edit</button>
        <button type="button" class="fc-btn primary" data-a="cpublish">Publish changes</button></div>`;
    else if(c.tab === "regs") body = `
      <table class="fc-table"><thead><tr><th>Player</th><th>Team</th><th>Payment</th></tr></thead><tbody>
        ${FC_ROWS.map(([n,t,s]) => `<tr><td>${n}</td><td>${t}</td><td>${badge(s)}</td></tr>`).join("")}</tbody></table>
      <p class="fc-help">Status colors come from fixed success, info, warning and danger tokens, so no partner color can be mistaken for one.</p>`;
    else body = `
      <div class="fc-card">
        <label class="fc-field ${capErr ? "is-error" : ""}"><span>Program capacity</span>
          <input type="text" inputmode="numeric" value="${c.cap}" data-in="ccap" aria-invalid="${capErr}" ${capErr ? 'aria-describedby="fc-cap-err"' : ""}>
          ${capErr ? `<small class="fc-err" id="fc-cap-err">${OCT}Capacity can&rsquo;t be lower than the 128 players already registered.</small>` : `<small>At least 128, the number already registered.</small>`}</label>
      </div>
      <div class="fc-actions"><button type="button" class="fc-btn danger" data-a="cclose">Close program</button>
        <button type="button" class="fc-btn primary" data-a="cpublish">Save settings</button></div>`;
    W.querySelector("#fh-out").innerHTML = `
      <div class="fc">
        <nav class="fc-side" aria-label="Console">
          <span class="fc-org"><i style="background:${P.base};color:${P.text}">${initials}</i>${org}</span>
          <a class="is-on">Programs</a><a>Teams</a><a>Registrations</a><a>Payments</a><a>Settings</a>
          <span class="fc-powered">LeagueApps</span></nav>
        <div class="fc-main">
          <p class="fc-crumb">Programs / Spring 2026</p>
          <div class="fc-head"><h3>Spring Travel Tryouts</h3><span class="fc-badge ${c.open ? "success" : "neutral"}">${c.open ? "Registration open" : "Registration closed"}</span></div>
          <div class="fc-tabs" role="tablist" aria-label="Program">${tab("overview","Overview")}${tab("regs","Registrations",128)}${tab("settings","Settings")}</div>
          ${body}
          ${c.toast ? `<p class="fc-toast" role="status">${c.toast}</p>` : ""}
        </div>
        ${c.confirm ? `<div class="dm-scrim"></div><div class="fc-modal" role="alertdialog" aria-modal="true" aria-labelledby="fc-mt" aria-describedby="fc-md">
          <h4 id="fc-mt">Close Spring Travel Tryouts?</h4><p id="fc-md">Registration stops and the program page shows it as closed. Families already registered aren&rsquo;t affected.</p>
          <div class="fc-actions"><button type="button" class="fc-btn secondary" data-a="cconfirm:no" data-autofocus>Cancel</button><button type="button" class="fc-btn danger" data-a="cconfirm:yes">Close program</button></div></div>` : ""}
      </div>`;
    const af = W.querySelector(".fc-modal [data-autofocus]"); if(af) af.focus();

    const checks = [["Primary button text", "#FFFFFF", MC.brand], ["Link and tab rail", MC.brand, MC.surface], ["Secondary text", MC.text2, MC.surface],
      ["Error message", MC.danger, MC.surface], ["Warning badge", MC.warning, MC.warningBg], ["Past-due badge", MC.danger, MC.dangerBg]]
      .map(([l,f,b]) => ({ l, r:contrast(f,b) }));
    N.innerHTML = `<h4>DESIGN NOTES</h4><div class="ctx">MANAGEMENT CONSOLE</div>
      <p><b>Same components, different token mode.</b></p>
      <p>Admins work in one LeagueApps-branded console no matter which partner they run. Buttons, tabs, switches and links use the LeagueApps green ramp; status uses fixed success, info, warning and danger tokens; the partner color reaches only the org badge.</p>
      <p>Errors pair the danger color with an octagon icon and a message, and destructive actions use a red fill that brand green can never be confused with.</p>
      <h4 style="margin-top:22px">LOGIC LOG</h4><ul class="lines" style="font-size:13px">
        <li>PARTNER: ${org.toUpperCase()} (${st.p}) &rarr; ORG BADGE ONLY</li>
        <li>CONSOLE BRAND: GREEN-600 ${MC.brand}, UNCHANGED</li>
        ${checks.map(k => `<li>${k.l.toUpperCase()}: ${fmt(k.r)} ${k.r >= 4.5 ? "PASS" : "FAIL"} AA</li>`).join("")}
      </ul>`;
  }
  function fcAction(cmd, arg){
    const c = FH.data.c; c.toast = "";
    if(cmd === "ctab") c.tab = arg;
    else if(cmd === "copen"){ if(c.open){ c.confirm = true; } else { c.open = true; c.toast = "Registration reopened."; } }
    else if(cmd === "cclose") c.confirm = true;
    else if(cmd === "cconfirm"){ c.confirm = false; if(arg === "yes"){ c.open = false; c.toast = "Program closed to new registrations."; } }
    else if(cmd === "cpublish"){ const bad = c.tab === "settings" && (+c.cap < 128 || !/^\d+$/.test(c.cap)); c.toast = bad ? "" : "Changes published."; if(bad){ fcUpdate(); const i = W.querySelector('[data-in="ccap"]'); if(i) i.focus(); return; } }
    else if(cmd === "cnote") c.toast = arg === "preview" ? "Opening the member portal preview\u2026" : "Editing program details\u2026";
    fcUpdate();
    const f = W.querySelector(`[data-a="${cmd}${arg != null ? ":" + arg : ""}"]`); if(f && !c.confirm) f.focus();
  }

  function fhUpdate(){
    const st = FH.data, x = fhSolve(st), P = x.P, S = x.S;
    W.querySelectorAll("[data-in]").forEach(el => { if(el !== document.activeElement) el.value = st[el.dataset.in]; });
    W.querySelectorAll(".fh-preset").forEach((b,i) => b.setAttribute("aria-pressed", String(st.preset===i)));
    W.querySelector(".switch").setAttribute("aria-checked", String(st.on));

    const scale = (X, name) => `<div class="scale" role="img" aria-label="${name}: fourteen shades from lightest to darkest">${X.steps.map((c,i)=>
      `<div class="sw" style="background:${c};color:${textOn(c)}" title="${SHADE_NAMES[i]} ${c}">${SHADE_NAMES[i]}</div>`).join("")}</div>
      <div class="scale-cap"><span>Lightest</span><span>${X.light ? "Light curve" : "Standard curve"} &middot; sat ${X.sat}%</span><span>Darkest</span></div>
      <div class="states">${[["Base",X.base],["Hover",X.hover],["Pressed",X.active]].map(([n,c])=>
        `<span class="state" style="background:${c};color:${name==="Primary"?x.tP:x.tS}">${n}</span>`).join("")}</div>`;
    const passN = x.checks.filter(c=>c.ratio>=c.min).length;
    const rows = x.checks.map(c => {
      const ok = c.ratio >= c.min;
      return `<tr><td>${c.label}</td><td><span class="pair" style="color:${c.fg};background:${c.bg}">Aa</span></td>
        <td class="ratio">${fmt(c.ratio)}</td><td>4.5:1</td>
        <td><span class="verdict ${ok?"pass":"fail"}">${ok?"Pass":"Fail"}</span></td></tr>`;
    }).join("");

    W.querySelector("#fh-out").innerHTML = `
      <div>
        <div class="fh-sec"><h3>Primary<small>${st.p}</small></h3>${scale(P, "Primary")}</div>
        <div class="fh-sec"><h3>Secondary<small>${st.s}</small></h3>${scale(S, "Secondary")}</div>
        <div class="fh-sec"><h3>Text contrast<small>${passN} of ${x.checks.length} pass WCAG 2.1 AA</small></h3>
          <table class="checks"><thead><tr><th>Surface</th><th>Sample</th><th>Ratio</th><th>Needs</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
      <div class="themes">
        <div><div class="theme-lbl"><span>Member portal</span><span>Partner brand leads</span></div>
          <div class="shot">
            <div class="mp-head" style="background:${P.base};color:${x.tP}">Riverside FC<nav><span>Programs</span><span>Schedule</span><span>Account</span></nav></div>
            <div class="mp-strip" style="background:${S.base}"></div>
            <div class="mp-body">
              <h4>Spring Travel Tryouts</h4>
              <p>Ages 9 to 14. Tryouts run three evenings in March at North Field.</p>
              <div class="chips"><span class="chip" style="background:${S.base};color:${x.tS};border-color:transparent">U12</span><span class="chip">U13</span><span class="chip">U14</span></div>
              <div class="mp-actions">
                <span class="fbtn" style="background:${P.base};color:${x.tP}">Register</span>
                <span class="fbtn" style="background:${S.base};color:${x.tS}">Add a sibling</span>
              </div>
            </div>
          </div></div>
        <div><div class="theme-lbl"><span>Management console</span><span>Platform brand leads</span></div>
          <div class="shot con">
            <div class="con-side"><span class="con-org"><i style="background:${P.base};color:${x.tP}">RF</i>Riverside FC</span><span>Programs</span><span>Rosters</span><span>Payments</span></div>
            <div class="con-main"><h4>Spring Travel Tryouts</h4>
              <div class="con-row"><span>Registrations</span><b>128</b></div>
              <div class="con-row"><span>Open spots</span><b>12</b></div>
              <div class="con-row"><span>Waitlist</span><span class="con-btn">Review</span></div></div>
          </div></div>
      </div>`;

    const head = st.on
      ? ["SMART TEXT ON","Partners pick two colors. The system does the rest.","Each color becomes fourteen shades at fixed lightness steps, with a lighter curve for yellow-to-cyan hues and saturation capped at 90%. Text on any brand fill flips between white and dark by luminance, so partners get readable buttons without knowing the guidelines."]
      : ["SMART TEXT OFF", `Without the luminance rule: ${x.checks.length-passN} of ${x.checks.length} fail.`, "Same colors with white text on every fill. Light brands like gold, kelly green or sky blue drop well below AA."];
    N.innerHTML = `<h4>DESIGN NOTES</h4><div class="ctx">${head[0]}</div><p><b>${head[1]}</b></p><p>${head[2]}</p>
      <h4 style="margin-top:22px">LOGIC LOG</h4><ul class="lines" style="font-size:13px">${x.log.map(l=>`<li>${l}</li>`).join("")}</ul>`;
  }

  function fhAction(a){
    const st = FH.data, [cmd,arg] = a.split(":");
    if(cmd==="view"){ st.view = arg; fhMount(); const t = W.querySelector(`[data-a="view:${arg}"]`); if(t) t.focus(); return; }
    if(cmd==="preset"){ const [,p,s] = FH_PRESETS[+arg]; st.p = p; st.s = s; st.preset = +arg; }
    else if(cmd==="logic"){ st.on = !st.on; }
    else if(cmd[0]==="c" && st.view==="console"){ fcAction(cmd, arg); return; }
    st.view === "console" ? fcUpdate() : fhUpdate();
  }
  function fhInput(el){
    const st = FH.data, k = el.dataset.in;
    if(k === "cmail"){ st.c.mail = el.checked; return; }
    if(k === "ccap"){ st.c.cap = el.value.trim(); return; }
    let v = el.value.trim();
    if(!v.startsWith("#")) v = "#" + v;
    if(!/^#[0-9a-f]{6}$/i.test(v)) return;
    st[k] = v.toUpperCase(); st.preset = -1;
    fhUpdate();
  }


  P.fieldhouse = {
    title:"FIELDHOUSE.COLOR",
    cases:[
      ["red", "Generate accessible shades from a brand color", [""]],
      ["off", "See the same colors without the luminance rule"],
      ["console", "Run the admin theme that stays consistent for every partner"]
    ],
    hint:"TRY: PICK GOLD & BLACK, THEN TURN SMART TEXT COLOR OFF.",
    hints:{
      red:"RED IS THE MOST COMMON SPORTS COLOR. TRY TYPING YOUR OWN RED INTO THE PRIMARY FIELD.",
      off:"SMART TEXT IS OFF: WHITE TEXT ON EVERY FILL. TURN IT BACK ON TO SEE THE FIX.",
      console:"SWITCH PARTNERS: THE CONSOLE STAYS LEAGUEAPPS GREEN. THEN TRY CLOSING THE PROGRAM, OR SET CAPACITY BELOW 128."
    },
    init(scene){
      const pick = i => ({ p:FH_PRESETS[i][1], s:FH_PRESETS[i][2], preset:i });
      FH.data = { ...pick(scene === "off" ? 1 : 0), on:scene !== "off", view:scene === "console" ? "console" : "portal",
                  c:{ tab:"overview", open:true, mail:true, cap:"140", confirm:false, toast:"" } };
    },
    render(w,n){ W = w; N = n; fhMount(); },
    action:fhAction, input:fhInput
  };

  /* =====================================================================
     TEAM BUILDER (V2 club use case + fast follows), rebuilt from the Figma files.
     Decisions shown: the system detects Move vs. Invite from where a player is
     registered; drafts autosave with attribution; invited players are locked;
     over-capacity is allowed while drafting and resolved before finalizing;
     review happens in one modal with three tabs; tryout data lives in a drawer.
     All names and data are fictional.
     ===================================================================== */
  const TB = { data:null };
  const TB_PROGRAM = "15U Travel", TB_SOURCE = "2026 Season Tryouts";
  const TB_TEAMS = [
    { id:"t1", name:"15U Thunder",   coach:"Dana Ruiz",   cap:6, mark:"TH", hue:"#2f5d8a" },
    { id:"t2", name:"15U Lightning", coach:"Marcus Bell", cap:6, mark:"LI", hue:"#7a4d9c" },
    { id:"t3", name:"15U Storm",     coach:"Priya Nair",  cap:6, mark:"ST", hue:"#9a5b1e" } ];
  const AV = ["#5b7c99","#8a6d5a","#6b8e5a","#9a6b8f","#5a7f86","#a07b4a","#6f6aa0","#8c5f5f"];
  // src "program": already registered in 15U Travel, so changing teams is a Move.
  // src "tryout": comes from the tryout program, so joining a team needs an Invitation.
  const TB_SEED = () => ({
    review:false, tab:"moves", drawer:null, dtab:"tryouts", conflicts:false, find:"", sort:"score",
    save:{ state:"idle", by:"Summer Romack", when:"Jun 2, 2026 · 4:30 PM" }, offline:false, banner:false,
    notify:false, invoices:true, sel:{}, confirmDel:null, mtoast:"", open:{}, sent:{},
    players:[
      { id:1,  name:"Maya Chen",       num:7,  pos:"CM", src:"program", team:"t1", saved:"t1", score:8.4 },
      { id:2,  name:"Ava Okonkwo",     num:3,  pos:"CB", src:"program", team:"t1", saved:"t1", score:7.9 },
      { id:3,  name:"Lucia Ferraro",   num:9,  pos:"ST", src:"program", team:"t1", saved:"t1", score:8.8 },
      { id:4,  name:"Hannah Price",    num:1,  pos:"GK", src:"program", team:"t2", saved:"t2", score:7.6 },
      { id:5,  name:"Sofia Duarte",    num:11, pos:"LW", src:"program", team:"t2", saved:"t2", score:8.1 },
      { id:6,  name:"Grace Lindqvist", num:5,  pos:"CB", src:"program", team:"t3", saved:"t3", score:7.2 },
      { id:7,  name:"Imani Brooks",    num:8,  pos:"CM", src:"program", team:"t3", saved:"t3", score:8.0 },
      { id:8,  name:"Nora Haddad",     num:14, pos:"RB", src:"tryout",  team:"t1", saved:"t1", inv:"invited",  sentOn:"May 28" , score:7.7 },
      { id:9,  name:"Elena Petrova",   num:21, pos:"LF", src:"tryout",  team:"t2", saved:"t2", inv:"declined", sentOn:"May 21", score:8.3 },
      { id:10, name:"Zoe Martin",      num:16, pos:"RW", src:"tryout",  team:"t3", saved:"t3", inv:"expired",  sentOn:"May 2",  score:6.9 },
      { id:11, name:"Riley Adeyemi",   num:10, pos:"CAM",src:"tryout",  team:null, saved:null, score:9.1 },
      { id:12, name:"Camila Vega",     num:4,  pos:"LB", src:"tryout",  team:null, saved:null, score:8.6 },
      { id:13, name:"Tessa Novak",     num:19, pos:"ST", src:"tryout",  team:null, saved:null, score:8.2 },
      { id:14, name:"June Park",       num:12, pos:"GK", src:"tryout",  team:null, saved:null, score:7.8 },
      { id:15, name:"Ruby Alvarez",    num:6,  pos:"DM", src:"tryout",  team:null, saved:null, score:7.4 },
      { id:16, name:"Ines Moreau",     num:22, pos:"CM", src:"program", team:null, saved:null, score:7.1 }
    ]
  });
  const tbP = id => TB.data.players.find(p => p.id === id);
  const tbT = id => TB_TEAMS.find(t => t.id === id);
  // What finalizing would do with this player's current placement
  function tbKind(p){
    if(p.src === "program") return p.team !== p.saved ? (p.team ? "move" : "unassign") : null;
    if(p.inv && p.team === p.saved) return null;            // already invited, locked in place
    return p.team ? "invite" : null;
  }
  const tbLocked = p => p.src === "tryout" && p.inv && p.team === p.saved;
  const tbInits = n => n.split(" ").map(w => w[0]).join("").slice(0,2);
  const tbAvatar = (p, big) => `<span class="tb-av${big ? " big" : ""}" style="background:${AV[p.id % AV.length]}" aria-hidden="true">${tbInits(p.name)}<i>${p.num}</i></span>`;
  const TB_BADGE = { invite:["orange","Invitation needed"], invited:["blue","Invited"], declined:["red","Invitation declined"], expired:["grey","Invitation expired"], move:["neutral","Draft"] };
  const tbBadge = k => k ? `<span class="tb-badge ${TB_BADGE[k][0]}">${TB_BADGE[k][1]}</span>` : "";
  const tbScore = p => `<span class="tb-score" title="Tryout average out of 10"><svg width="11" height="10" viewBox="0 0 11 10" aria-hidden="true"><rect x="0" y="6" width="2.5" height="4"/><rect x="4" y="3" width="2.5" height="7"/><rect x="8" y="0" width="2.5" height="10"/></svg>${p.score.toFixed(2)}</span>`;
  function tbMoveSel(p){
    const opts = [`<option value="">Move to…</option>`]
      .concat(TB_TEAMS.filter(t => t.id !== p.team).map(t => `<option value="${t.id}">${t.name}</option>`))
      .concat(p.team ? [`<option value="pool">Available players</option>`] : []);
    return `<select class="tb-move" data-in="move:${p.id}" aria-label="Move ${esc(p.name)} to">${opts.join("")}</select>`;
  }
  function tbCard(p){
    const k = tbKind(p), lock = tbLocked(p), hit = TB.data.find && p.name.toLowerCase().includes(TB.data.find.toLowerCase());
    const badge = lock ? tbBadge(p.inv) : k === "invite" ? tbBadge("invite") : k === "move" ? tbBadge("move") : "";
    return `<li class="tb-card${lock ? " locked" : ""}${hit ? " hit" : ""}${TB.data.find && !hit ? " dim" : ""}" ${lock ? "" : `draggable="true"`} data-id="${p.id}">
      ${tbAvatar(p)}
      <div class="tb-who"><button type="button" class="tb-name" data-a="drawer:${p.id}">${esc(p.name)}</button> <small>${p.pos}</small>${badge ? `<div>${badge}</div>` : ""}</div>
      <div class="tb-side">${tbScore(p)}${lock ? "" : tbMoveSel(p)}</div></li>`;
  }
  function tbStatus(){
    const s = TB.data.save;
    if(s.state === "saving") return `<span class="tb-save saving">Saving…</span>`;
    if(s.state === "saved") return `<span class="tb-save ok">Draft saved!</span>`;
    if(s.state === "reconnecting") return `<span class="tb-save warn">Reconnecting…</span>`;
    if(s.state === "failed") return `<span class="tb-save err"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/></svg>Autosave failed</span> <button type="button" class="tb-link" data-a="retry">Try again</button>`;
    return `<span class="tb-save">Last saved by ${s.by} · ${s.when}</span>`;
  }
  function tbCounts(){
    const ps = TB.data.players;
    return { moves:ps.filter(p => tbKind(p) === "move" || tbKind(p) === "unassign").length,
             invites:ps.filter(p => tbKind(p) === "invite").length,
             pending:ps.filter(p => p.src === "tryout" && p.inv && p.team === p.saved).length };
  }
  const tbOver = () => TB_TEAMS.filter(t => TB.data.players.filter(p => p.team === t.id).length > t.cap);

  function tbRender(){
    const s = TB.data, c = tbCounts(), total = c.moves + c.invites;
    let pool = s.players.filter(p => !p.team);
    pool = pool.sort(s.sort === "name" ? (a,b) => a.name.localeCompare(b.name) : (a,b) => b.score - a.score);
    const teams = TB_TEAMS.map(t => {
      const ps = s.players.filter(p => p.team === t.id), over = ps.length > t.cap;
      const reg = ps.filter(p => p.src === "program"), need = ps.filter(p => tbKind(p) === "invite"), inv = ps.filter(tbLocked);
      const sec = (label, arr, extra = "") => `<h6>${label} (${arr.length})</h6>${extra}<ul>${arr.map(tbCard).join("") || ""}</ul>`;
      return `<section class="tb-team${over ? " over" : ""}" data-drop="${t.id}" aria-label="${t.name}">
        <header><span class="tb-crest" style="background:${t.hue}" aria-hidden="true">${t.mark}</span>
          <div><b>${t.name}</b><small>${TB_PROGRAM}</small><small>Coach: ${t.coach}</small></div></header>
        <div class="tb-capline"><span>${reg.length} registered</span><span class="tb-cap${over ? " over" : ""}">${ps.length} / ${t.cap}${over ? " · Over capacity" : ""}</span></div>
        ${sec("Registered", reg)}${sec("Invitation needed", need)}
        ${sec("Invited", inv, inv.length ? `<p class="tb-lock"><svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><rect x="1" y="5" width="9" height="7" rx="1.5" fill="currentColor"/><path d="M3 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" fill="none" stroke-width="1.4"/></svg>These players are locked until their invitation is accepted or deleted. <button type="button" class="tb-link" data-a="manage">Manage invitations</button></p>` : "")}
      </section>`;
    }).join("");
    W.innerHTML = `<div class="app app-tb">
      <div class="tb-top"><b>Team Builder</b><button type="button" class="tb-exit" data-a="exit">Exit</button></div>
      <div class="tb-bar">
        <label class="tb-find"><span>Find a player</span><input type="search" data-in="find" value="${esc(s.find)}" placeholder="Enter a player’s name"></label>
        <span class="tb-status" id="tb-status" role="status" aria-live="polite" aria-label="Draft save status">${tbStatus()}</span>
        <button type="button" class="tb-btn primary" data-a="finalize" ${total ? "" : "disabled"}>Review &amp; finalize rosters <span class="tb-count">${total}</span></button>
      </div>
      <div class="tb-banner" id="tb-banner" role="alert" ${s.banner ? "" : "hidden"}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22z"/><path d="M12 9v5M12 17.5v.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>We were not able to save your changes at this time. <button type="button" class="tb-link" data-a="retry">Try again</button></div>
      <div class="tb-main">
        <aside class="tb-pool" data-drop="pool" aria-label="Available players">
          <small>Inviting available players from</small><b class="tb-src">${TB_SOURCE}</b>
          <label class="tb-sort"><span>Sort by</span><select data-in="sort"><option value="score" ${s.sort === "score" ? "selected" : ""}>Tryout score</option><option value="name" ${s.sort === "name" ? "selected" : ""}>Name</option></select></label>
          <ul>${pool.map(tbCard).join("") || `<li class="tb-empty">Every available player is on a team.</li>`}</ul>
        </aside>
        <div class="tb-board">
          <div class="tb-board-h"><div><small>Building teams for</small><b>${TB_PROGRAM}</b></div></div>
          <div class="tb-teams">${teams}</div>
        </div>
      </div>
      ${s.conflicts ? tbConflicts() : ""}${s.review ? tbReview() : ""}${s.drawer ? tbDrawer() : ""}
    </div>`;
    tbDnD();
    const af = W.querySelector(".tb-modal [data-autofocus], .tb-drawer [data-autofocus]"); if(af) af.focus();
    tbNotes();
  }

  function tbConflicts(){
    const over = tbOver();
    return `<div class="dm-scrim"></div><div class="tb-modal sm" role="dialog" aria-modal="true" aria-labelledby="tb-ct">
      <header><h4 id="tb-ct">Remove invalid assignments</h4></header>
      <div class="tb-mbody"><p class="tb-warnline"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#df6c06" stroke-width="2" d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5" stroke="#df6c06" stroke-width="2" stroke-linecap="round"/></svg>
        <span><b>Your draft has conflicts that need to be resolved before you can finalize your roster.</b> Remove the invalid assignments below to continue.</span></p>
        <h5>Team conflicts</h5>
        ${over.map(t => { const n = TB.data.players.filter(p => p.team === t.id).length; return `<div class="tb-conf"><span class="tb-crest" style="background:${t.hue}" aria-hidden="true">${t.mark}</span><div><b>${t.name}</b><small>${TB_PROGRAM}</small>
          <small class="tb-conf-err"><b>${n} / ${t.cap}</b> Over capacity. All draft players will be removed from this team.</small></div></div>`; }).join("")}
      </div>
      <footer><button type="button" class="tb-link" data-a="conf:cancel" data-autofocus>Continue editing</button><button type="button" class="tb-btn primary" data-a="conf:remove">Remove invalid assignments</button></footer></div>`;
  }

  function tbReview(){
    const s = TB.data, c = tbCounts();
    const tab = (id, label, n) => `<button type="button" role="tab" aria-selected="${s.tab === id}" data-a="tab:${id}">${label} ${n ? `<span class="tb-count">${n}</span>` : `<svg width="14" height="14" viewBox="0 0 24 24" aria-label="done"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="m7.5 12 3 3 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`}</button>`;
    const acc = (t, inner, n) => `<section class="tb-acc"><button type="button" class="tb-acc-h" aria-expanded="${s.open[t.id] !== false}" data-a="acc:${t.id}"><span><b>${t.name}</b> <span class="tb-pillcount">${n}</span><small>Coach: ${t.coach}</small></span><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button>${s.open[t.id] !== false ? `<div class="tb-acc-b">${inner}</div>` : ""}</section>`;
    let body = "", foot = `<button type="button" class="tb-btn" data-a="close" ${s.tab !== "moves" || !c.moves ? "data-autofocus" : ""}>Continue editing</button>`;
    if(s.tab === "moves"){
      const ms = s.players.filter(p => tbKind(p) === "move" || tbKind(p) === "unassign"), teams = TB_TEAMS.filter(t => ms.some(p => p.team === t.id));
      if(!ms.length) body = `<div class="tb-done"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m7.5 12 3 3 6-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><b>No pending moves.</b></div>`;
      else {
        body = `<p class="tb-sum"><b>${ms.length} player${ms.length > 1 ? "s" : ""}</b> will be moved${teams.length ? ` to <b>${teams.length} team${teams.length > 1 ? "s" : ""}.</b>` : "."}</p>
          <label class="tb-chk"><input type="checkbox" data-in="invoices" ${s.invoices ? "checked" : ""}> Automatically update invoices if moves increase registration fees</label>
          <label class="tb-chk"><input type="checkbox" data-in="notify" ${s.notify ? "checked" : ""}> Notify players</label>` +
          TB_TEAMS.filter(t => ms.some(p => p.team === t.id)).map(t => { const rows = ms.filter(p => p.team === t.id);
            return acc(t, `<table class="tb-table"><thead><tr><th>Player</th><th>Number</th><th>Position</th><th>Moved from</th><th>Evaluation</th></tr></thead><tbody>${rows.map(p => `<tr><td>${tbAvatar(p)} ${esc(p.name)}</td><td>${p.num}</td><td>${p.pos}</td><td>${p.saved ? tbT(p.saved).name : "Available players"}</td><td>${p.score.toFixed(1)}/10</td></tr>`).join("")}</tbody></table>`, rows.length); }).join("") +
          (ms.some(p => !p.team) ? `<p class="dm-small">${ms.filter(p => !p.team).map(p => esc(p.name)).join(", ")} will be unassigned and stay registered in ${TB_PROGRAM}.</p>` : "");
        foot += `<button type="button" class="tb-btn primary" data-a="complete" data-autofocus>Complete moves</button>`;
      }
    } else if(s.tab === "invites"){
      const need = s.players.filter(p => tbKind(p) === "invite");
      body = `<p class="tb-sum"><b>${need.length} player${need.length === 1 ? "" : "s"}</b> need${need.length === 1 ? "s" : ""} invitations to register for their new team.</p>` +
        TB_TEAMS.map(t => { const rows = need.filter(p => p.team === t.id), selN = rows.filter(p => s.sel[p.id]).length;
          const inner = rows.length ? `<p class="dm-small">Select one or more players to send invitations.</p>
            <button type="button" class="tb-btn primary sm" data-a="invite:${t.id}" ${selN ? "" : "disabled"}>Invite selected players${selN ? ` (${selN})` : ""}</button>
            <table class="tb-table"><thead><tr><th><span class="sr">Select</span></th><th>Player</th><th>Position</th><th>Evaluation</th></tr></thead><tbody>${rows.map(p => `<tr><td><input type="checkbox" data-in="sel:${p.id}" ${s.sel[p.id] ? "checked" : ""} aria-label="Select ${esc(p.name)}"></td><td>${tbAvatar(p)} ${esc(p.name)}</td><td>${p.pos}</td><td>${p.score.toFixed(1)}/10</td></tr>`).join("")}</tbody></table>`
            : `<div class="tb-allset"><b>All players have been invited!</b><small>You can view and manage your sent invitations in the Invitation Manager.</small><button type="button" class="tb-btn primary sm" data-a="tab:pending">Manage sent invitations</button></div>`;
          return (rows.length || s.sent[t.id]) ? acc(t, inner, rows.length) : ""; }).join("");
    } else {
      const inv = s.players.filter(tbLocked);
      body = `<p class="tb-sum">View and manage all player invitations across teams.</p>` +
        TB_TEAMS.map(t => { const rows = inv.filter(p => p.team === t.id); if(!rows.length) return "";
          return acc(t, `<table class="tb-table"><thead><tr><th>Player</th><th>Date sent</th><th>Invitation status</th><th class="r">Action</th></tr></thead><tbody>${rows.map(p => `<tr><td>${tbAvatar(p)} ${esc(p.name)}</td><td>${p.sentOn}, 2026</td><td>${tbBadge(p.inv)}</td>
            <td class="r">${s.confirmDel === p.id ? `<button type="button" class="tb-del-confirm" data-a="del:${p.id}">Delete this invitation?</button> <button type="button" class="tb-link" data-a="delno">Keep</button>`
              : `<button type="button" class="tb-icon" data-a="resend:${p.id}" aria-label="Resend invitation to ${esc(p.name)}" title="Resend"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13l-3-3M20 15H7l3 3" fill="none" stroke="#007a00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="tb-icon" data-a="askdel:${p.id}" aria-label="Delete invitation for ${esc(p.name)}" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="#bf0808" stroke-width="2" stroke-linejoin="round"/></svg></button>`}</td></tr>`).join("")}</tbody></table>`, rows.length); }).join("");
    }
    return `<div class="dm-scrim" data-a="close"></div><div class="tb-modal" role="dialog" aria-modal="true" aria-labelledby="tb-rt">
      <header><h4 id="tb-rt">Review &amp; finalize rosters</h4><button type="button" class="tb-x" data-a="close" aria-label="Close">&times;</button></header>
      <div class="tb-tabs" role="tablist">${tab("moves","Pending moves",c.moves)}${tab("invites","Invitations needed",c.invites)}${c.pending ? tab("pending","Pending invitations",c.pending) : ""}</div>
      <div class="tb-mbody">${s.mtoast ? `<p class="tb-mtoast" role="status">${s.mtoast}</p>` : ""}${body}</div>
      <footer>${foot}</footer></div>`;
  }

  function tbDrawer(){
    const s = TB.data, p = tbP(s.drawer), seed = p.id * 7;
    const r = (n, i) => Math.max(1, Math.min(5, Math.round((p.score / 2) + ((seed + i * 3) % 3 - 1) * 0.5)));
    const evals = ["A. Morgan","L. Osei","K. Tran"].map((ev, i) => ({ ev, a:r(1,i), t:(p.score / 2 + (i - 1) * 0.2).toFixed(2), pos:[75,80,70][i], c:r(2,i+1), note:["Communicates well and reads the field.","Strong first touch under pressure.","Works hard off the ball."][(p.id + i) % 3] }));
    const avg = k => (evals.reduce((a,e) => a + +e[k], 0) / evals.length);
    const tabs = [["overview","Overview"],["tryouts","Tryouts"],["regs","Registrations"]].map(([id,l]) => `<button type="button" role="tab" aria-selected="${s.dtab === id}" data-a="dtab:${id}">${l}</button>`).join("");
    let body;
    if(s.dtab === "overview") body = `<div class="tb-panel"><h5>Player details</h5><dl class="tb-qa"><dt>Why do you play?</dt><dd>Being part of a team that works hard together.</dd><dt>What's your biggest strength?</dt><dd>Reading the game</dd><dt>What are you working to improve?</dt><dd>Weak-foot passing</dd></dl></div>`;
    else if(s.dtab === "regs") body = `<div class="tb-panel"><h5>Registrations</h5><ul class="tb-reglist">
      ${p.src === "program" ? `<li><b>${TB_PROGRAM}</b><span>Registered · Paid</span></li>` : ""}<li><b>${TB_SOURCE}</b><span>Tryout registration · Paid</span></li></ul></div>`;
    else body = `<div class="tb-panel tb-tryout"><div class="tb-try-h"><div><b>${TB_SOURCE}</b><small>Tryout #: 12 · Mar 9 – Mar 12, 2026</small></div>
        <div class="tb-avg"><b>${p.score.toFixed(2)}</b><small>Avg (out of 10)</small><span class="tb-meter"><i style="width:${p.score * 10}%"></i></span></div></div>
        <div class="tb-sessions">${["Mar 9 (4:00pm)","Mar 10 (4:00pm)","Mar 12 (1:00pm)"].map((d,i) => `<span class="${i === 0 ? "on" : ""}">${i === 0 ? "✓ " : ""}${d}</span>`).join("")}</div>
        <div class="tb-scroll"><table class="tb-table"><thead><tr><th>Evaluator</th><th>Athleticism</th><th>Technique</th><th>Positioning</th><th>Coachability</th></tr></thead><tbody>
        ${evals.map(e => `<tr><td>${e.ev}<small class="tb-note">${e.ev.split(" ")[1]}: ${e.note}</small></td><td>${e.a}</td><td>${e.t}</td><td>${e.pos}% Yes</td><td>${e.c}</td></tr>`).join("")}
        <tr class="avg"><td>Average score</td><td>${avg("a").toFixed(2)}</td><td>${avg("t").toFixed(2)}</td><td>${Math.round(avg("pos"))}% Yes</td><td>${avg("c").toFixed(1)}</td></tr></tbody></table></div></div>`;
    return `<div class="dm-scrim" data-a="dclose"></div><aside class="tb-drawer" role="dialog" aria-modal="true" aria-labelledby="tb-dt">
      <header><h4 id="tb-dt">Player details</h4><button type="button" class="tb-x" data-a="dclose" aria-label="Close" data-autofocus>&times;</button></header>
      <div class="tb-dbody"><div class="tb-id">${tbAvatar(p, true)}<div><h3>${esc(p.name)} <span class="tb-pos">${{CM:"Center Mid",CB:"Center Back",ST:"Striker",GK:"Goalkeeper",LW:"Left Wing",RW:"Right Wing",RB:"Right Back",LB:"Left Back",LF:"Left Forward",CAM:"Attacking Mid",DM:"Defensive Mid"}[p.pos] || p.pos}</span></h3>
        <dl><div><dt>Email</dt><dd>${p.name.split(" ")[0].toLowerCase()}.family@example.com</dd></div><div><dt>Born</dt><dd>2011</dd></div><div><dt>Source</dt><dd>${p.src === "program" ? TB_PROGRAM : TB_SOURCE}</dd></div></dl></div></div>
        <div class="tb-tabs" role="tablist">${tabs}</div>${body}</div>
      <footer><button type="button" class="tb-btn" data-a="dclose">Close</button></footer></aside>`;
  }

  // Autosave: edit -> Saving... -> Draft saved! -> Last saved by You. Offline: Reconnecting... -> failed + banner.
  let tbTimers = [];
  function tbSave(){
    const s = TB.data; tbTimers.forEach(clearTimeout); tbTimers = [];
    const set = st => { s.save.state = st; const el = W && W.querySelector("#tb-status"); if(el) el.innerHTML = tbStatus(); };
    const done = () => { const d = new Date(); s.save = { state:"saved", by:"you", when:"Today · " + d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) };
      set("saved"); s.banner = false; const b = W && W.querySelector("#tb-banner"); if(b) b.hidden = true; tbTimers.push(setTimeout(() => set("idle"), 1600)); tbNotes(); };
    set("saving");
    if(!s.offline){ tbTimers.push(setTimeout(done, 700)); return; }
    tbTimers.push(setTimeout(() => set("reconnecting"), 900));
    tbTimers.push(setTimeout(() => { set("failed"); s.banner = true; const b = W && W.querySelector("#tb-banner"); if(b) b.hidden = false; tbNotes(); }, 2600));
    TB.retry = done;
  }

  function tbNotes(){
    const s = TB.data, c = tbCounts(), over = tbOver();
    const log = [`DRAFT: ${c.moves} MOVE${c.moves === 1 ? "" : "S"}, ${c.invites} INVITATION${c.invites === 1 ? "" : "S"} NEEDED`, `INVITED (LOCKED): ${c.pending}`,
      over.length ? `OVER CAPACITY: ${over.map(t => t.name.toUpperCase()).join(", ")} (ALLOWED WHILE DRAFTING)` : "CAPACITY: OK", `SAVE STATUS: ${s.save.state.toUpperCase()}`];
    if(s.drawer) notes("PLAYER DRAWER","Tryout data where the decision is made.","Scores sit on every card so admins can sort and compare, and the drawer holds the detail: each evaluator's ratings and notes, averaged per attribute. Admins never leave Team Builder to check a tryout.", log);
    else if(s.conflicts) notes("FINALIZE GUARD","Draft freely, resolve before finalizing.","A team can go over capacity while admins think. Finalizing is where it stops: one modal lists every conflict and what fixing it will do, so nothing is dropped silently.", log);
    else if(s.review) notes("REVIEW & FINALIZE","Consequences, grouped by what they do.","Moves, invitations still needed, and invitations already sent each get a tab with a live count. Moves can update invoices and notify families; invitations go out per team; sent invites can be resent or deleted in place.", log);
    else if(s.save.state === "failed" || s.save.state === "reconnecting") notes("AUTOSAVE","Visible recovery beats silent failure.","After the first failed retry the header says Reconnecting, in amber, so admins stop piling up work. If every retry fails, the header and a page banner both offer Try again, and the banner can't be dismissed until a save succeeds.", log);
    else notes("BOARD","Admins shouldn't need to know Move from Invite.","Players already registered in 15U Travel become a draft move. Players from the tryout program land under Invitation needed. Invited players are locked until they accept or the invite is deleted, and every edit autosaves with the name of whoever saved last.", log);
  }

  function tbDnD(){
    W.querySelectorAll(".tb-card[draggable]").forEach(li => li.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", li.dataset.id); li.classList.add("dragging"); }));
    W.querySelectorAll("[data-drop]").forEach(col => {
      col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drop-on"); });
      col.addEventListener("dragleave", e => { if(!col.contains(e.relatedTarget)) col.classList.remove("drop-on"); });
      col.addEventListener("drop", e => { e.preventDefault(); P["team-builder"].action(`assign:${e.dataTransfer.getData("text/plain")}:${col.dataset.drop}`); });
    });
  }

  P["team-builder"] = {
    title:"TEAMBUILDER.BOARD",
    cases:[
      ["", "Draft rosters without sending anything"],
      ["move-invite", "See a move and an invite detected for you"],
      ["capacity", "Overfill a team and see the inline warning"],
      ["review", "Review moves, invitations and sent invites before finalizing"],
      ["statuses", "See every invitation state on one board"],
      ["drawer", "Compare tryout scores in the player drawer"],
      ["autosave", "Keep drafting when the connection drops"]
    ],
    hint:"DRAG A TRYOUT PLAYER ONTO A TEAM, MOVE A REGISTERED PLAYER, THEN REVIEW & FINALIZE ROSTERS.",
    hints:{
      "move-invite":"MAYA WAS ALREADY REGISTERED, SO SHE'S A DRAFT MOVE. RILEY CAME FROM TRYOUTS, SO SHE NEEDS AN INVITATION.",
      review:"THREE TABS: MOVES, INVITATIONS NEEDED, AND INVITATIONS ALREADY SENT. TRY RESENDING OR DELETING ONE.",
      capacity:"15U THUNDER IS OVER CAPACITY. KEEP DRAFTING, OR PRESS REVIEW & FINALIZE ROSTERS TO SEE THE GUARD.",
      statuses:"EVERY STATE IS ON THE BOARD: REGISTERED, DRAFT, INVITATION NEEDED, INVITED, DECLINED AND EXPIRED.",
      drawer:"TRYOUT SCORES ON EVERY CARD; THE DRAWER SHOWS EACH EVALUATOR. CLICK ANY PLAYER'S NAME.",
      autosave:"THE CONNECTION IS DOWN IN THIS SCENE. MAKE ANY CHANGE AND WATCH THE SAVE STATUS."
    },
    init(scene){
      const s = TB.data = TB_SEED(), p = tbP;
      if(scene === "move-invite" || scene === "review" || scene === "capacity"){ p(1).team = "t2"; p(11).team = "t3"; }
      if(scene === "review"){ p(12).team = "t1"; s.review = true; s.tab = "pending"; }
      if(scene === "capacity"){ p(12).team = "t1"; p(13).team = "t1"; p(16).team = "t1"; p(14).team = "t1"; }
      if(scene === "statuses"){ p(1).team = "t2"; p(12).team = "t3"; }
      if(scene === "drawer"){ s.drawer = 11; s.dtab = "tryouts"; }
      if(scene === "autosave"){ s.offline = true; }
      tbTimers.forEach(clearTimeout); tbTimers = [];
    },
    render(w,n){ W = w; N = n; tbRender(); },
    action(a){
      const s = TB.data, [cmd, x, y] = a.split(":"); let edit = false; s.mtoast = "";
      if(cmd === "assign"){ const p = tbP(+x); if(p && !tbLocked(p)){ const to = y === "pool" ? null : y; if(p.team !== to){ p.team = to; edit = true; } } }
      else if(cmd === "drawer"){ s.drawer = +x; s.dtab = "tryouts"; }
      else if(cmd === "dtab") s.dtab = x;
      else if(cmd === "dclose") s.drawer = null;
      else if(cmd === "finalize"){ if(tbOver().length) s.conflicts = true; else { s.review = true; const c = tbCounts(); s.tab = c.moves ? "moves" : c.invites ? "invites" : "pending"; } }
      else if(cmd === "conf"){
        s.conflicts = false;
        if(x === "remove"){ tbOver().forEach(t => s.players.forEach(p => { if(p.team === t.id && p.team !== p.saved) p.team = p.saved; })); edit = true;
          const c = tbCounts(); if(c.moves + c.invites){ s.review = true; s.tab = c.moves ? "moves" : "invites"; } }
      }
      else if(cmd === "manage"){ s.review = true; s.tab = "pending"; }
      else if(cmd === "tab"){ s.tab = x; s.confirmDel = null; }
      else if(cmd === "close"){ s.review = false; s.confirmDel = null; }
      else if(cmd === "acc") s.open[x] = s.open[x] === false;
      else if(cmd === "complete"){ let n = 0; s.players.forEach(p => { const k = tbKind(p); if(k === "move" || k === "unassign"){ p.saved = p.team; n++; } });
        s.mtoast = `${n} move${n === 1 ? "" : "s"} completed.${s.notify ? " Families were notified." : ""}`; edit = true; const c = tbCounts(); s.tab = c.invites ? "invites" : "moves"; }
      else if(cmd === "invite"){ let n = 0; s.players.forEach(p => { if(p.team === x && tbKind(p) === "invite" && s.sel[p.id]){ p.inv = "invited"; p.saved = p.team; p.sentOn = "Jun 3"; delete s.sel[p.id]; n++; } });
        s.sent[x] = true; s.mtoast = `${n} invitation${n === 1 ? "" : "s"} sent.`; edit = true; }
      else if(cmd === "resend"){ const p = tbP(+x); p.inv = "invited"; p.sentOn = "Jun 3"; s.mtoast = `Invitation resent to ${p.name}.`; edit = true; }
      else if(cmd === "askdel") s.confirmDel = +x;
      else if(cmd === "delno") s.confirmDel = null;
      else if(cmd === "del"){ const p = tbP(+x); p.team = null; p.saved = null; p.inv = null; s.confirmDel = null; s.mtoast = `Invitation deleted. ${p.name} is back in Available players.`; edit = true; if(!tbCounts().pending) s.tab = "invites"; }
      else if(cmd === "retry"){ s.offline = false; tbSave(); return; }
      else if(cmd === "exit"){ s.mtoast = ""; }
      tbRender();
      if(edit) tbSave();
      const f = W.querySelector(`[data-a="${a}"]`); if(f && !W.querySelector(".tb-modal [data-autofocus]:focus, .tb-drawer [data-autofocus]:focus")) f.focus();
    },
    input(el){
      const s = TB.data, k = el.dataset.in;
      if(k === "find"){ s.find = el.value; W.querySelectorAll(".tb-card").forEach(li => { const hit = s.find && li.querySelector(".tb-name").textContent.toLowerCase().includes(s.find.toLowerCase()); li.classList.toggle("hit", !!hit); li.classList.toggle("dim", !!s.find && !hit); }); return; }
      if(k === "sort"){ s.sort = el.value; tbRender(); return; }
      if(k === "invoices"){ s.invoices = el.checked; return; }
      if(k === "notify"){ s.notify = el.checked; return; }
      if(k.startsWith("sel:")){ s.sel[+k.slice(4)] = el.checked; tbRender(); const f = W.querySelector(`[data-in="${k}"]`); if(f) f.focus(); return; }
      if(k.startsWith("move:") && el.value){ P["team-builder"].action(`assign:${k.slice(5)}:${el.value}`); }
    }
  };

  /* =====================================================================
     TOURNAMENT ENGINE: Fieldhouse Member Portal registration and checkout
     Rebuilt from the Figma files: team registration (select teams, add-ons,
     registration insurance, review), player and staff add-ons with the admin
     rules behind them, and the NG checkout (payment terms, discount codes,
     autopay, e-signature). Partner, club and every price are demo values.
     ===================================================================== */
  const TE = { data:null };
  const TE_ICO = {"edit":"M29.06 6.94L25.06 2.94C24.92 2.8 24.76 2.69 24.57 2.61C24.39 2.54 24.2 2.5 24 2.5C23.8 2.5 23.61 2.54 23.42 2.61C23.24 2.69 23.08 2.8 22.94 2.94L10.94 14.94C10.66 15.22 10.5 15.6 10.5 16L10.5 20C10.5 20.4 10.66 20.78 10.94 21.06C11.22 21.34 11.6 21.5 12 21.5L16 21.5C16.2 21.5 16.39 21.46 16.57 21.39C16.76 21.31 16.92 21.2 17.06 21.06L29.06 9.06C29.2 8.92 29.31 8.76 29.39 8.57C29.46 8.39 29.5 8.2 29.5 8C29.5 7.8 29.46 7.61 29.39 7.43C29.31 7.24 29.2 7.08 29.06 6.94ZM24 6.13L25.88 8L24.5 9.38L22.63 7.5L24 6.13ZM15.38 18.5L13.5 18.5L13.5 16.63L20.5 9.63L22.38 11.5L15.38 18.5ZM28.5 16.57L28.5 26C28.5 26.66 28.24 27.3 27.77 27.77C27.3 28.24 26.66 28.5 26 28.5L6 28.5C5.34 28.5 4.7 28.24 4.23 27.77C3.76 27.3 3.5 26.66 3.5 26L3.5 6C3.5 5.34 3.76 4.7 4.23 4.23C4.7 3.76 5.34 3.5 6 3.5L15.43 3.5C15.83 3.5 16.21 3.66 16.49 3.94C16.77 4.22 16.93 4.6 16.93 5C16.93 5.4 16.77 5.78 16.49 6.06C16.21 6.34 15.83 6.5 15.43 6.5L6.5 6.5L6.5 25.5L25.5 25.5L25.5 16.57C25.5 16.17 25.66 15.79 25.94 15.51C26.22 15.23 26.6 15.07 27 15.07C27.4 15.07 27.78 15.23 28.06 15.51C28.34 15.79 28.5 16.17 28.5 16.57Z","trash":"M27 6L22.5 6L22.5 4.5C22.5 3.57 22.13 2.68 21.47 2.03C20.82 1.37 19.93 1 19 1L13 1C12.07 1 11.18 1.37 10.53 2.03C9.87 2.68 9.5 3.57 9.5 4.5L9.5 6L5 6C4.6 6 4.22 6.16 3.94 6.44C3.66 6.72 3.5 7.1 3.5 7.5C3.5 7.9 3.66 8.28 3.94 8.56C4.22 8.84 4.6 9 5 9L5.5 9L5.5 26C5.5 26.66 5.76 27.3 6.23 27.77C6.7 28.24 7.34 28.5 8 28.5L24 28.5C24.66 28.5 25.3 28.24 25.77 27.77C26.24 27.3 26.5 26.66 26.5 26L26.5 9L27 9C27.4 9 27.78 8.84 28.06 8.56C28.34 8.28 28.5 7.9 28.5 7.5C28.5 7.1 28.34 6.72 28.06 6.44C27.78 6.16 27.4 6 27 6ZM12.5 4.5C12.5 4.37 12.55 4.24 12.65 4.15C12.74 4.05 12.87 4 13 4L19 4C19.13 4 19.26 4.05 19.35 4.15C19.45 4.24 19.5 4.37 19.5 4.5L19.5 6L12.5 6L12.5 4.5ZM23.5 25.5L8.5 25.5L8.5 9L23.5 9L23.5 25.5ZM14.5 13L14.5 21C14.5 21.4 14.34 21.78 14.06 22.06C13.78 22.34 13.4 22.5 13 22.5C12.6 22.5 12.22 22.34 11.94 22.06C11.66 21.78 11.5 21.4 11.5 21L11.5 13C11.5 12.6 11.66 12.22 11.94 11.94C12.22 11.66 12.6 11.5 13 11.5C13.4 11.5 13.78 11.66 14.06 11.94C14.34 12.22 14.5 12.6 14.5 13ZM20.5 13L20.5 21C20.5 21.4 20.34 21.78 20.06 22.06C19.78 22.34 19.4 22.5 19 22.5C18.6 22.5 18.22 22.34 17.94 22.06C17.66 21.78 17.5 21.4 17.5 21L17.5 13C17.5 12.6 17.66 12.22 17.94 11.94C18.22 11.66 18.6 11.5 19 11.5C19.4 11.5 19.78 11.66 20.06 11.94C20.34 12.22 20.5 12.6 20.5 13Z","down":"M27.06 13.06L17.06 23.06C16.92 23.2 16.76 23.31 16.57 23.39C16.39 23.46 16.2 23.5 16 23.5C15.8 23.5 15.61 23.46 15.42 23.39C15.24 23.31 15.08 23.2 14.94 23.06L4.94 13.06C4.65 12.78 4.5 12.4 4.5 12C4.5 11.6 4.65 11.22 4.94 10.94C5.22 10.65 5.6 10.5 6 10.5C6.4 10.5 6.78 10.65 7.06 10.94L16 19.88L24.94 10.94C25.22 10.65 25.6 10.49 26 10.49C26.4 10.49 26.78 10.65 27.06 10.94C27.35 11.22 27.5 11.6 27.5 12C27.5 12.4 27.35 12.78 27.06 13.06L27.06 13.06Z","up":"M27.06 21.06C26.92 21.2 26.76 21.31 26.57 21.39C26.39 21.46 26.2 21.5 26 21.5C25.8 21.5 25.61 21.46 25.42 21.39C25.24 21.31 25.08 21.2 24.94 21.06L16 12.13L7.06 21.06C6.78 21.34 6.4 21.5 6 21.5C5.6 21.5 5.22 21.34 4.94 21.06C4.65 20.78 4.5 20.4 4.5 20C4.5 19.6 4.65 19.22 4.94 18.94L14.94 8.94C15.08 8.8 15.24 8.69 15.42 8.61C15.61 8.53 15.8 8.5 16 8.5C16.2 8.5 16.39 8.53 16.57 8.61C16.76 8.69 16.92 8.8 17.06 8.94L27.06 18.94C27.2 19.08 27.31 19.24 27.39 19.42C27.46 19.61 27.5 19.8 27.5 20C27.5 20.2 27.46 20.39 27.39 20.57C27.31 20.76 27.2 20.92 27.06 21.06Z","left":"M21.06 24.94C21.34 25.22 21.5 25.6 21.5 26C21.5 26.4 21.34 26.78 21.06 27.06C20.78 27.35 20.4 27.5 20 27.5C19.6 27.5 19.22 27.35 18.94 27.06L8.94 17.06C8.8 16.92 8.69 16.76 8.61 16.58C8.53 16.39 8.5 16.2 8.5 16C8.5 15.8 8.53 15.61 8.61 15.43C8.69 15.24 8.8 15.08 8.94 14.94L18.94 4.94C19.22 4.66 19.6 4.5 20 4.5C20.4 4.5 20.78 4.66 21.06 4.94C21.34 5.22 21.5 5.6 21.5 6C21.5 6.4 21.34 6.78 21.06 7.06L12.13 16L21.06 24.94Z","check":"M29.06 10.06L13.06 26.06C12.92 26.2 12.76 26.31 12.57 26.39C12.39 26.46 12.2 26.5 12 26.5C11.8 26.5 11.61 26.46 11.42 26.39C11.24 26.31 11.08 26.2 10.94 26.06L3.94 19.06C3.8 18.92 3.69 18.76 3.61 18.57C3.54 18.39 3.5 18.2 3.5 18C3.5 17.8 3.54 17.61 3.61 17.42C3.69 17.24 3.8 17.08 3.94 16.94C4.08 16.8 4.24 16.69 4.42 16.61C4.61 16.54 4.8 16.5 5 16.5C5.2 16.5 5.39 16.54 5.57 16.61C5.76 16.69 5.92 16.8 6.06 16.94L12 22.88L26.94 7.94C27.22 7.66 27.6 7.5 28 7.5C28.4 7.5 28.78 7.66 29.06 7.94C29.35 8.22 29.5 8.6 29.5 9C29.5 9.4 29.35 9.78 29.06 10.06L29.06 10.06Z","err":"M14.5 16.5L14.5 10C14.5 9.6 14.66 9.22 14.94 8.94C15.22 8.66 15.6 8.5 16 8.5C16.4 8.5 16.78 8.66 17.06 8.94C17.34 9.22 17.5 9.6 17.5 10L17.5 16.5C17.5 16.9 17.34 17.28 17.06 17.56C16.78 17.84 16.4 18 16 18C15.6 18 15.22 17.84 14.94 17.56C14.66 17.28 14.5 16.9 14.5 16.5ZM29.5 11.44L29.5 20.56C29.5 20.88 29.44 21.21 29.31 21.51C29.19 21.82 29 22.09 28.77 22.32L22.32 28.77C22.09 29 21.82 29.19 21.51 29.31C21.21 29.44 20.88 29.5 20.56 29.5L11.44 29.5C11.12 29.5 10.79 29.44 10.49 29.31C10.18 29.19 9.91 29 9.68 28.77L3.23 22.32C3 22.09 2.81 21.82 2.69 21.51C2.56 21.21 2.5 20.88 2.5 20.56L2.5 11.44C2.5 11.12 2.56 10.79 2.69 10.49C2.81 10.18 3 9.91 3.23 9.68L9.68 3.23C9.91 3 10.18 2.81 10.49 2.69C10.79 2.56 11.12 2.5 11.44 2.5L20.56 2.5C20.88 2.5 21.21 2.56 21.51 2.69C21.82 2.81 22.09 3 22.32 3.23L28.77 9.68C29 9.91 29.19 10.18 29.31 10.49C29.44 10.79 29.5 11.12 29.5 11.44ZM26.5 11.65L20.35 5.5L11.65 5.5L5.5 11.65L5.5 20.35L11.65 26.5L20.35 26.5L26.5 20.35L26.5 11.65ZM16 19.5C15.6 19.5 15.22 19.62 14.89 19.84C14.56 20.06 14.3 20.37 14.15 20.73C14 21.1 13.96 21.5 14.04 21.89C14.12 22.28 14.31 22.63 14.59 22.91C14.87 23.19 15.22 23.38 15.61 23.46C16 23.54 16.4 23.5 16.77 23.35C17.13 23.2 17.44 22.94 17.66 22.61C17.88 22.28 18 21.9 18 21.5C18 20.97 17.79 20.46 17.41 20.09C17.04 19.71 16.53 19.5 16 19.5Z","info":"M13.5 10.5C13.5 10.1 13.62 9.72 13.84 9.39C14.06 9.06 14.37 8.8 14.73 8.65C15.1 8.5 15.5 8.46 15.89 8.54C16.28 8.62 16.63 8.81 16.91 9.09C17.19 9.37 17.38 9.72 17.46 10.11C17.54 10.5 17.5 10.9 17.35 11.27C17.2 11.63 16.94 11.94 16.61 12.16C16.28 12.38 15.9 12.5 15.5 12.5C14.97 12.5 14.46 12.29 14.09 11.91C13.71 11.54 13.5 11.03 13.5 10.5ZM29.5 16C29.5 18.67 28.71 21.28 27.22 23.5C25.74 25.72 23.63 27.45 21.17 28.47C18.7 29.49 15.99 29.76 13.37 29.24C10.75 28.72 8.34 27.43 6.45 25.55C4.57 23.66 3.28 21.25 2.76 18.63C2.24 16.01 2.51 13.3 3.53 10.83C4.55 8.37 6.28 6.26 8.5 4.78C10.72 3.29 13.33 2.5 16 2.5C19.58 2.5 23.01 3.93 25.54 6.46C28.07 8.99 29.5 12.42 29.5 16ZM26.5 16C26.5 13.92 25.88 11.89 24.73 10.17C23.58 8.44 21.94 7.09 20.02 6.3C18.1 5.5 15.99 5.3 13.95 5.7C11.91 6.11 10.04 7.11 8.58 8.58C7.11 10.04 6.11 11.91 5.7 13.95C5.3 15.99 5.5 18.1 6.3 20.02C7.09 21.94 8.44 23.58 10.17 24.73C11.89 25.88 13.92 26.5 16 26.5C18.78 26.5 21.45 25.39 23.42 23.42C25.39 21.45 26.5 18.78 26.5 16ZM17.5 20.58L17.5 16.5C17.5 15.84 17.24 15.2 16.77 14.73C16.3 14.26 15.66 14 15 14C14.65 14 14.3 14.12 14.03 14.35C13.76 14.58 13.58 14.9 13.52 15.25C13.46 15.6 13.53 15.95 13.7 16.26C13.88 16.57 14.17 16.8 14.5 16.92L14.5 21C14.5 21.66 14.76 22.3 15.23 22.77C15.7 23.24 16.34 23.5 17 23.5C17.35 23.5 17.7 23.38 17.97 23.15C18.24 22.92 18.42 22.6 18.48 22.25C18.54 21.9 18.47 21.55 18.3 21.24C18.12 20.93 17.83 20.7 17.5 20.58Z","tag":"M30.77 16.65L18.35 4.23C18.12 4 17.85 3.81 17.54 3.69C17.24 3.56 16.91 3.5 16.59 3.5L5 3.5C4.6 3.5 4.22 3.66 3.94 3.94C3.66 4.22 3.5 4.6 3.5 5L3.5 16.59C3.5 16.91 3.56 17.24 3.69 17.54C3.81 17.85 4 18.12 4.23 18.35L16.65 30.77C17.12 31.24 17.75 31.5 18.42 31.5C19.08 31.5 19.71 31.24 20.18 30.77L30.77 20.18C31.24 19.71 31.5 19.08 31.5 18.42C31.5 17.75 31.24 17.12 30.77 16.65ZM18.42 28.29L6.5 16.38L6.5 6.5L16.38 6.5L28.29 18.42L18.42 28.29ZM12.5 10.5C12.5 10.9 12.38 11.28 12.16 11.61C11.94 11.94 11.63 12.2 11.27 12.35C10.9 12.5 10.5 12.54 10.11 12.46C9.72 12.38 9.37 12.19 9.09 11.91C8.81 11.63 8.62 11.28 8.54 10.89C8.46 10.5 8.5 10.1 8.65 9.73C8.8 9.37 9.06 9.06 9.39 8.84C9.72 8.62 10.1 8.5 10.5 8.5C11.03 8.5 11.54 8.71 11.91 9.09C12.29 9.46 12.5 9.97 12.5 10.5Z","x":"M26.06 23.94C26.34 24.22 26.5 24.6 26.5 25C26.5 25.4 26.34 25.78 26.06 26.06C25.78 26.35 25.4 26.5 25 26.5C24.6 26.5 24.22 26.35 23.94 26.06L16 18.13L8.06 26.06C7.78 26.34 7.4 26.5 7 26.5C6.6 26.5 6.22 26.34 5.94 26.06C5.65 25.78 5.5 25.4 5.5 25C5.5 24.6 5.65 24.22 5.94 23.94L13.88 16L5.94 8.06C5.66 7.78 5.5 7.4 5.5 7C5.5 6.6 5.66 6.22 5.94 5.94C6.22 5.65 6.6 5.5 7 5.5C7.4 5.5 7.78 5.65 8.06 5.94L16 13.88L23.94 5.93C24.22 5.65 24.6 5.49 25 5.49C25.4 5.49 25.78 5.65 26.06 5.93C26.35 6.22 26.5 6.6 26.5 7C26.5 7.4 26.35 7.78 26.06 8.06L18.13 16L26.06 23.94Z","lock":"M26 9.5L22.5 9.5L22.5 7C22.5 5.28 21.82 3.62 20.6 2.4C19.38 1.18 17.72 0.5 16 0.5C14.28 0.5 12.62 1.18 11.4 2.4C10.18 3.62 9.5 5.28 9.5 7L9.5 9.5L6 9.5C5.34 9.5 4.7 9.76 4.23 10.23C3.76 10.7 3.5 11.34 3.5 12L3.5 26C3.5 26.66 3.76 27.3 4.23 27.77C4.7 28.24 5.34 28.5 6 28.5L26 28.5C26.66 28.5 27.3 28.24 27.77 27.77C28.24 27.3 28.5 26.66 28.5 26L28.5 12C28.5 11.34 28.24 10.7 27.77 10.23C27.3 9.76 26.66 9.5 26 9.5ZM12.5 7C12.5 6.07 12.87 5.18 13.53 4.53C14.18 3.87 15.07 3.5 16 3.5C16.93 3.5 17.82 3.87 18.47 4.53C19.13 5.18 19.5 6.07 19.5 7L19.5 9.5L12.5 9.5L12.5 7ZM25.5 25.5L6.5 25.5L6.5 12.5L25.5 12.5L25.5 25.5ZM18 19C18 19.4 17.88 19.78 17.66 20.11C17.44 20.44 17.13 20.7 16.77 20.85C16.4 21 16 21.04 15.61 20.96C15.22 20.88 14.87 20.69 14.59 20.41C14.31 20.13 14.12 19.78 14.04 19.39C13.96 19 14 18.6 14.15 18.23C14.3 17.87 14.56 17.56 14.89 17.34C15.22 17.12 15.6 17 16 17C16.53 17 17.04 17.21 17.41 17.59C17.79 17.96 18 18.47 18 19Z","bank":"M3 13.5L5.5 13.5L5.5 19.5L4 19.5C3.6 19.5 3.22 19.66 2.94 19.94C2.66 20.22 2.5 20.6 2.5 21C2.5 21.4 2.66 21.78 2.94 22.06C3.22 22.34 3.6 22.5 4 22.5L28 22.5C28.4 22.5 28.78 22.34 29.06 22.06C29.34 21.78 29.5 21.4 29.5 21C29.5 20.6 29.34 20.22 29.06 19.94C28.78 19.66 28.4 19.5 28 19.5L26.5 19.5L26.5 13.5L29 13.5C29.33 13.5 29.64 13.39 29.9 13.2C30.17 13 30.35 12.72 30.44 12.41C30.53 12.09 30.52 11.76 30.4 11.46C30.28 11.15 30.06 10.89 29.79 10.72L16.79 2.72C16.55 2.58 16.28 2.5 16 2.5C15.72 2.5 15.45 2.58 15.21 2.72L2.21 10.72C1.94 10.89 1.72 11.15 1.6 11.46C1.48 11.76 1.47 12.09 1.56 12.41C1.65 12.72 1.83 13 2.1 13.2C2.36 13.39 2.67 13.5 3 13.5ZM8.5 13.5L11.5 13.5L11.5 19.5L8.5 19.5L8.5 13.5ZM17.5 13.5L17.5 19.5L14.5 19.5L14.5 13.5L17.5 13.5ZM23.5 19.5L20.5 19.5L20.5 13.5L23.5 13.5L23.5 19.5ZM16 5.76L23.7 10.5L8.3 10.5L16 5.76ZM31.5 26C31.5 26.4 31.34 26.78 31.06 27.06C30.78 27.34 30.4 27.5 30 27.5L2 27.5C1.6 27.5 1.22 27.34 0.94 27.06C0.66 26.78 0.5 26.4 0.5 26C0.5 25.6 0.66 25.22 0.94 24.94C1.22 24.66 1.6 24.5 2 24.5L30 24.5C30.4 24.5 30.78 24.66 31.06 24.94C31.34 25.22 31.5 25.6 31.5 26Z","pin":"M16 7.5C14.91 7.5 13.85 7.82 12.94 8.43C12.04 9.03 11.33 9.89 10.92 10.9C10.5 11.9 10.39 13.01 10.61 14.07C10.82 15.14 11.34 16.12 12.11 16.89C12.88 17.66 13.86 18.18 14.93 18.39C15.99 18.61 17.1 18.5 18.1 18.08C19.11 17.67 19.97 16.96 20.57 16.06C21.18 15.15 21.5 14.09 21.5 13C21.5 11.54 20.92 10.14 19.89 9.11C18.86 8.08 17.46 7.5 16 7.5ZM16 15.5C15.51 15.5 15.02 15.35 14.61 15.08C14.2 14.8 13.88 14.41 13.69 13.96C13.5 13.5 13.45 13 13.55 12.51C13.64 12.03 13.88 11.58 14.23 11.23C14.58 10.88 15.03 10.64 15.51 10.55C16 10.45 16.5 10.5 16.96 10.69C17.41 10.88 17.8 11.2 18.08 11.61C18.35 12.02 18.5 12.51 18.5 13C18.5 13.66 18.24 14.3 17.77 14.77C17.3 15.24 16.66 15.5 16 15.5ZM16 1.5C12.95 1.5 10.03 2.72 7.87 4.87C5.72 7.03 4.5 9.95 4.5 13C4.5 22.67 14.71 29.93 15.14 30.23C15.39 30.41 15.69 30.5 16 30.5C16.31 30.5 16.61 30.41 16.86 30.23C18.79 28.8 20.56 27.17 22.13 25.35C25.64 21.32 27.5 17.05 27.5 13C27.5 9.95 26.28 7.03 24.13 4.87C21.97 2.72 19.05 1.5 16 1.5ZM19.91 23.34C18.72 24.71 17.41 25.97 16 27.11C14.59 25.97 13.28 24.71 12.09 23.34C10 20.92 7.5 17.16 7.5 13C7.5 10.75 8.4 8.58 9.99 6.99C11.58 5.4 13.75 4.5 16 4.5C18.25 4.5 20.42 5.4 22.01 6.99C23.6 8.58 24.5 10.75 24.5 13C24.5 17.16 22 20.92 19.91 23.34Z","cal":"M26 3.5L23.5 3.5L23.5 3C23.5 2.6 23.34 2.22 23.06 1.94C22.78 1.66 22.4 1.5 22 1.5C21.6 1.5 21.22 1.66 20.94 1.94C20.66 2.22 20.5 2.6 20.5 3L20.5 3.5L11.5 3.5L11.5 3C11.5 2.6 11.34 2.22 11.06 1.94C10.78 1.66 10.4 1.5 10 1.5C9.6 1.5 9.22 1.66 8.94 1.94C8.66 2.22 8.5 2.6 8.5 3L8.5 3.5L6 3.5C5.34 3.5 4.7 3.76 4.23 4.23C3.76 4.7 3.5 5.34 3.5 6L3.5 26C3.5 26.66 3.76 27.3 4.23 27.77C4.7 28.24 5.34 28.5 6 28.5L26 28.5C26.66 28.5 27.3 28.24 27.77 27.77C28.24 27.3 28.5 26.66 28.5 26L28.5 6C28.5 5.34 28.24 4.7 27.77 4.23C27.3 3.76 26.66 3.5 26 3.5ZM8.5 6.5C8.5 6.9 8.66 7.28 8.94 7.56C9.22 7.84 9.6 8 10 8C10.4 8 10.78 7.84 11.06 7.56C11.34 7.28 11.5 6.9 11.5 6.5L20.5 6.5C20.5 6.9 20.66 7.28 20.94 7.56C21.22 7.84 21.6 8 22 8C22.4 8 22.78 7.84 23.06 7.56C23.34 7.28 23.5 6.9 23.5 6.5L25.5 6.5L25.5 9.5L6.5 9.5L6.5 6.5L8.5 6.5ZM6.5 25.5L6.5 12.5L25.5 12.5L25.5 25.5L6.5 25.5Z","plus":"M28.5 16C28.5 16.4 28.34 16.78 28.06 17.06C27.78 17.34 27.4 17.5 27 17.5L17.5 17.5L17.5 27C17.5 27.4 17.34 27.78 17.06 28.06C16.78 28.34 16.4 28.5 16 28.5C15.6 28.5 15.22 28.34 14.94 28.06C14.66 27.78 14.5 27.4 14.5 27L14.5 17.5L5 17.5C4.6 17.5 4.22 17.34 3.94 17.06C3.66 16.78 3.5 16.4 3.5 16C3.5 15.6 3.66 15.22 3.94 14.94C4.22 14.66 4.6 14.5 5 14.5L14.5 14.5L14.5 5C14.5 4.6 14.66 4.22 14.94 3.94C15.22 3.66 15.6 3.5 16 3.5C16.4 3.5 16.78 3.66 17.06 3.94C17.34 4.22 17.5 4.6 17.5 5L17.5 14.5L27 14.5C27.4 14.5 27.78 14.66 28.06 14.94C28.34 15.22 28.5 15.6 28.5 16Z","minus":"M28.5 16C28.5 16.4 28.34 16.78 28.06 17.06C27.78 17.34 27.4 17.5 27 17.5L5 17.5C4.6 17.5 4.22 17.34 3.94 17.06C3.66 16.78 3.5 16.4 3.5 16C3.5 15.6 3.66 15.22 3.94 14.94C4.22 14.66 4.6 14.5 5 14.5L27 14.5C27.4 14.5 27.78 14.66 28.06 14.94C28.34 15.22 28.5 15.6 28.5 16Z","cart":"M28.15 7.04C28.01 6.87 27.83 6.73 27.64 6.64C27.44 6.55 27.22 6.5 27 6.5L7.25 6.5L6.72 3.55C6.61 2.98 6.31 2.46 5.86 2.08C5.41 1.71 4.84 1.5 4.26 1.5L2 1.5C1.6 1.5 1.22 1.66 0.94 1.94C0.66 2.22 0.5 2.6 0.5 3C0.5 3.4 0.66 3.78 0.94 4.06C1.22 4.34 1.6 4.5 2 4.5L3.84 4.5L6.95 21.63C7.04 22.08 7.21 22.51 7.46 22.9C7.01 23.42 6.71 24.05 6.58 24.73C6.44 25.4 6.49 26.1 6.7 26.75C6.92 27.4 7.3 27.99 7.81 28.45C8.31 28.92 8.93 29.24 9.6 29.4C10.27 29.55 10.97 29.53 11.63 29.34C12.29 29.14 12.89 28.78 13.37 28.29C13.85 27.8 14.19 27.19 14.37 26.53C14.54 25.86 14.55 25.17 14.38 24.5L18.63 24.5C18.42 25.31 18.47 26.16 18.77 26.94C19.07 27.72 19.6 28.38 20.3 28.84C20.99 29.3 21.82 29.53 22.65 29.5C23.48 29.47 24.29 29.17 24.95 28.66C25.61 28.15 26.09 27.45 26.33 26.65C26.57 25.85 26.55 25 26.28 24.21C26.01 23.42 25.5 22.73 24.83 22.25C24.15 21.76 23.33 21.5 22.5 21.5L10.4 21.5C10.28 21.5 10.17 21.46 10.08 21.38C9.99 21.31 9.93 21.2 9.9 21.09L9.61 19.5L23.51 19.5C24.33 19.5 25.13 19.21 25.76 18.69C26.38 18.16 26.81 17.43 26.96 16.63L28.48 8.27C28.52 8.05 28.51 7.83 28.45 7.62C28.39 7.4 28.29 7.21 28.15 7.04ZM11.5 25.5C11.5 25.7 11.44 25.89 11.33 26.06C11.22 26.22 11.07 26.35 10.88 26.42C10.7 26.5 10.5 26.52 10.3 26.48C10.11 26.44 9.93 26.35 9.79 26.21C9.65 26.07 9.56 25.89 9.52 25.7C9.48 25.5 9.5 25.3 9.58 25.12C9.65 24.93 9.78 24.78 9.94 24.67C10.11 24.56 10.3 24.5 10.5 24.5C10.77 24.5 11.02 24.61 11.21 24.79C11.39 24.98 11.5 25.23 11.5 25.5ZM22.5 26.5C22.3 26.5 22.11 26.44 21.94 26.33C21.78 26.22 21.65 26.07 21.58 25.88C21.5 25.7 21.48 25.5 21.52 25.3C21.56 25.11 21.65 24.93 21.79 24.79C21.93 24.65 22.11 24.56 22.3 24.52C22.5 24.48 22.7 24.5 22.88 24.58C23.07 24.65 23.22 24.78 23.33 24.94C23.44 25.11 23.5 25.3 23.5 25.5C23.5 25.77 23.39 26.02 23.21 26.21C23.02 26.39 22.77 26.5 22.5 26.5ZM24 16.09C23.98 16.2 23.92 16.31 23.83 16.38C23.74 16.46 23.63 16.5 23.51 16.5L9.07 16.5L7.8 9.5L25.2 9.5L24 16.09Z","out":"M28.5 13C28.5 13.4 28.34 13.78 28.06 14.06C27.78 14.34 27.4 14.5 27 14.5C26.6 14.5 26.22 14.34 25.94 14.06C25.66 13.78 25.5 13.4 25.5 13L25.5 8.63L18.06 16.06C17.78 16.35 17.4 16.5 17 16.5C16.6 16.5 16.22 16.35 15.94 16.06C15.65 15.78 15.5 15.4 15.5 15C15.5 14.6 15.65 14.22 15.94 13.94L23.38 6.5L19 6.5C18.6 6.5 18.22 6.34 17.94 6.06C17.66 5.78 17.5 5.4 17.5 5C17.5 4.6 17.66 4.22 17.94 3.94C18.22 3.66 18.6 3.5 19 3.5L27 3.5C27.4 3.5 27.78 3.66 28.06 3.94C28.34 4.22 28.5 4.6 28.5 5L28.5 13ZM23 16C22.6 16 22.22 16.16 21.94 16.44C21.66 16.72 21.5 17.1 21.5 17.5L21.5 25.5L6.5 25.5L6.5 10.5L14.5 10.5C14.9 10.5 15.28 10.34 15.56 10.06C15.84 9.78 16 9.4 16 9C16 8.6 15.84 8.22 15.56 7.94C15.28 7.66 14.9 7.5 14.5 7.5L6 7.5C5.34 7.5 4.7 7.76 4.23 8.23C3.76 8.7 3.5 9.34 3.5 10L3.5 26C3.5 26.66 3.76 27.3 4.23 27.77C4.7 28.24 5.34 28.5 6 28.5L22 28.5C22.66 28.5 23.3 28.24 23.77 27.77C24.24 27.3 24.5 26.66 24.5 26L24.5 17.5C24.5 17.1 24.34 16.72 24.06 16.44C23.78 16.16 23.4 16 23 16Z","shirt":"M30.77 7.24L24.76 3.71C24.53 3.57 24.27 3.5 24 3.5L20 3.5C19.6 3.5 19.22 3.66 18.94 3.94C18.66 4.22 18.5 4.6 18.5 5C18.5 5.66 18.24 6.3 17.77 6.77C17.3 7.24 16.66 7.5 16 7.5C15.34 7.5 14.7 7.24 14.23 6.77C13.76 6.3 13.5 5.66 13.5 5C13.5 4.6 13.34 4.22 13.06 3.94C12.78 3.66 12.4 3.5 12 3.5L8 3.5C7.73 3.5 7.47 3.57 7.24 3.71L1.23 7.24C0.69 7.56 0.29 8.07 0.11 8.68C-0.08 9.28 -0.02 9.93 0.25 10.5L2.49 15.1C2.69 15.52 3 15.87 3.39 16.12C3.79 16.37 4.24 16.5 4.71 16.5L6.5 16.5L6.5 26C6.5 26.66 6.76 27.3 7.23 27.77C7.7 28.24 8.34 28.5 9 28.5L23 28.5C23.66 28.5 24.3 28.24 24.77 27.77C25.24 27.3 25.5 26.66 25.5 26L25.5 16.5L27.29 16.5C27.75 16.5 28.21 16.37 28.6 16.12C28.99 15.88 29.31 15.52 29.51 15.1L31.75 10.5C32.02 9.93 32.08 9.28 31.89 8.68C31.71 8.07 31.31 7.56 30.77 7.24ZM5.05 13.5L3.15 9.59L6.5 7.63L6.5 13.5L5.05 13.5ZM22.5 25.5L9.5 25.5L9.5 6.5L10.71 6.5C11.03 7.65 11.73 8.67 12.68 9.39C13.64 10.11 14.8 10.5 16 10.5C17.2 10.5 18.36 10.11 19.32 9.39C20.27 8.67 20.97 7.65 21.29 6.5L22.5 6.5L22.5 25.5ZM26.95 13.5L25.5 13.5L25.5 7.63L28.85 9.6L26.95 13.5Z","ball":"M16 2.5C13.33 2.5 10.72 3.29 8.5 4.78C6.28 6.26 4.55 8.37 3.53 10.83C2.51 13.3 2.24 16.01 2.76 18.63C3.28 21.25 4.57 23.66 6.45 25.55C8.34 27.43 10.75 28.72 13.37 29.24C15.99 29.76 18.7 29.49 21.17 28.47C23.63 27.45 25.74 25.72 27.22 23.5C28.71 21.28 29.5 18.67 29.5 16C29.5 12.42 28.07 8.99 25.54 6.46C23.01 3.93 19.58 2.5 16 2.5ZM25.5 11.53L22.75 12.43L17.5 8.72L17.5 5.61C19.22 5.86 20.85 6.53 22.24 7.56C23.64 8.6 24.76 9.96 25.5 11.53ZM13.06 20L11.28 14.67L16 11.34L20.72 14.67L18.94 20L13.06 20ZM14.5 5.61L14.5 8.72L9.25 12.43L6.5 11.53C7.24 9.96 8.36 8.6 9.76 7.56C11.15 6.53 12.78 5.86 14.5 5.61ZM5.5 16C5.5 15.46 5.54 14.93 5.63 14.4L8.32 15.28L10.32 21.24L8.67 23.51C7.67 22.53 6.87 21.36 6.32 20.07C5.78 18.79 5.5 17.4 5.5 16ZM11.09 25.28L12.75 23L19.25 23L20.91 25.28C19.39 26.08 17.71 26.5 16 26.5C14.29 26.5 12.6 26.08 11.09 25.28L11.09 25.28ZM23.33 23.51L21.68 21.25L23.68 15.28L26.38 14.41C26.63 16.06 26.49 17.75 25.96 19.33C25.43 20.91 24.53 22.35 23.33 23.51L23.33 23.51Z","flag":"M4.02 4.86C3.85 5 3.72 5.18 3.63 5.37C3.54 5.57 3.5 5.78 3.5 6L3.5 27C3.5 27.4 3.66 27.78 3.94 28.06C4.22 28.34 4.6 28.5 5 28.5C5.4 28.5 5.78 28.34 6.06 28.06C6.34 27.78 6.5 27.4 6.5 27L6.5 21.72C9.36 19.58 11.76 20.58 15.34 22.34C17.36 23.34 19.68 24.49 22.18 24.49C24.02 24.49 25.97 23.87 27.98 22.13C28.14 21.99 28.27 21.82 28.36 21.62C28.45 21.43 28.5 21.21 28.5 21L28.5 6C28.5 5.71 28.42 5.43 28.26 5.19C28.11 4.95 27.88 4.75 27.62 4.64C27.36 4.52 27.07 4.47 26.79 4.51C26.5 4.56 26.23 4.68 26.02 4.87C22.93 7.54 20.45 6.53 16.67 4.66C13.15 2.91 8.77 0.74 4.02 4.86ZM25.5 20.28C22.64 22.42 20.24 21.42 16.67 19.66C13.77 18.22 10.29 16.5 6.5 18.23L6.5 6.71C9.36 4.57 11.76 5.57 15.34 7.34C17.36 8.34 19.68 9.49 22.18 9.49C23.33 9.49 24.46 9.24 25.5 8.76L25.5 20.28Z","tent":"M31.87 24.39L23.87 6.39C23.76 6.13 23.56 5.9 23.32 5.74C23.08 5.58 22.79 5.5 22.5 5.5L9.5 5.5C9.22 5.5 8.94 5.58 8.7 5.73C8.46 5.89 8.26 6.1 8.14 6.36C8.14 6.37 8.13 6.38 8.13 6.39L8.12 6.41L0.13 24.39C0.02 24.62 -0.02 24.87 0 25.12C0.02 25.37 0.1 25.61 0.24 25.82C0.38 26.03 0.56 26.2 0.78 26.32C1 26.44 1.25 26.5 1.5 26.5L30.5 26.5C30.75 26.5 31 26.44 31.22 26.32C31.44 26.2 31.62 26.03 31.76 25.82C31.9 25.61 31.98 25.37 32 25.12C32.02 24.87 31.98 24.62 31.87 24.39ZM8 14.07L8 23.5L3.81 23.5L8 14.07ZM11 23.5L11 14.07L15.19 23.5L11 23.5ZM18.47 23.5L11.81 8.5L21.52 8.5L28.19 23.5L18.47 23.5Z","shield":"M26 4.5L6 4.5C5.34 4.5 4.7 4.76 4.23 5.23C3.76 5.7 3.5 6.34 3.5 7L3.5 14.35C3.5 25.9 13.26 29.72 15.22 30.37C15.73 30.54 16.27 30.54 16.78 30.37C18.74 29.72 28.5 25.9 28.5 14.35L28.5 7C28.5 6.34 28.24 5.7 27.77 5.23C27.3 4.76 26.66 4.5 26 4.5ZM25.5 14.35C25.5 23.55 17.93 26.79 16 27.48C14.07 26.8 6.5 23.55 6.5 14.36L6.5 7.5L25.5 7.5L25.5 14.35ZM9.94 18.06C9.8 17.92 9.69 17.76 9.61 17.57C9.54 17.39 9.5 17.2 9.5 17C9.5 16.8 9.54 16.61 9.61 16.42C9.69 16.24 9.8 16.08 9.94 15.94C10.08 15.8 10.24 15.69 10.43 15.61C10.61 15.54 10.8 15.5 11 15.5C11.2 15.5 11.39 15.54 11.58 15.61C11.76 15.69 11.92 15.8 12.06 15.94L14 17.88L19.94 11.94C20.22 11.65 20.6 11.5 21 11.5C21.4 11.5 21.78 11.65 22.06 11.94C22.35 12.22 22.5 12.6 22.5 13C22.5 13.4 22.35 13.78 22.06 14.06L15.06 21.06C14.92 21.2 14.76 21.31 14.58 21.39C14.39 21.46 14.2 21.5 14 21.5C13.8 21.5 13.61 21.46 13.43 21.39C13.24 21.31 13.08 21.2 12.94 21.06L9.94 18.06Z","bag":"M21.5 6.07L21.5 4.5C21.5 3.57 21.13 2.68 20.47 2.03C19.82 1.37 18.93 1 18 1L14 1C13.07 1 12.18 1.37 11.53 2.03C10.87 2.68 10.5 3.57 10.5 4.5L10.5 6.07C8.7 6.31 7.05 7.2 5.86 8.57C4.66 9.93 4 11.68 4 13.5L4 27.5C4 28.16 4.26 28.8 4.73 29.27C5.2 29.74 5.84 30 6.5 30L25.5 30C26.16 30 26.8 29.74 27.27 29.27C27.74 28.8 28 28.16 28 27.5L28 13.5C28 11.68 27.34 9.93 26.14 8.57C24.95 7.2 23.3 6.31 21.5 6.07ZM14 4L18 4C18.13 4 18.26 4.05 18.35 4.15C18.45 4.24 18.5 4.37 18.5 4.5L18.5 6L13.5 6L13.5 4.5C13.5 4.37 13.55 4.24 13.65 4.15C13.74 4.05 13.87 4 14 4ZM20 20L12 20L12 19C12 18.87 12.05 18.74 12.15 18.65C12.24 18.55 12.37 18.5 12.5 18.5L19.5 18.5C19.63 18.5 19.76 18.55 19.85 18.65C19.95 18.74 20 18.87 20 19L20 20ZM12 23L16 23L16 23.5C16 23.9 16.16 24.28 16.44 24.56C16.72 24.84 17.1 25 17.5 25C17.9 25 18.28 24.84 18.56 24.56C18.84 24.28 19 23.9 19 23.5L19 23L20 23L20 27L12 27L12 23ZM25 27L23 27L23 19C23 18.07 22.63 17.18 21.97 16.53C21.32 15.87 20.43 15.5 19.5 15.5L12.5 15.5C11.57 15.5 10.68 15.87 10.03 16.53C9.37 17.18 9 18.07 9 19L9 27L7 27L7 13.5C7 12.31 7.47 11.16 8.32 10.32C9.16 9.47 10.31 9 11.5 9L20.5 9C21.69 9 22.84 9.47 23.68 10.32C24.53 11.16 25 12.31 25 13.5L25 27ZM20 12.5C20 12.9 19.84 13.28 19.56 13.56C19.28 13.84 18.9 14 18.5 14L13.5 14C13.1 14 12.72 13.84 12.44 13.56C12.16 13.28 12 12.9 12 12.5C12 12.1 12.16 11.72 12.44 11.44C12.72 11.16 13.1 11 13.5 11L18.5 11C18.9 11 19.28 11.16 19.56 11.44C19.84 11.72 20 12.1 20 12.5Z","shoe":"M31.98 20.37L31.98 20.33C31.87 19.27 31.46 18.28 30.8 17.45C30.14 16.62 29.25 16.01 28.25 15.67L21.17 13.15L21.14 13.13C20.81 13.02 20.51 12.85 20.26 12.62C20 12.38 19.79 12.1 19.65 11.79L16.76 5L16.75 4.98C16.49 4.4 16.02 3.95 15.44 3.7C14.86 3.45 14.21 3.44 13.61 3.65L4.15 7.09C3.66 7.27 3.25 7.59 2.95 8.01C2.66 8.43 2.5 8.93 2.5 9.44L2.5 24C2.5 24.66 2.76 25.3 3.23 25.77C3.7 26.24 4.34 26.5 5 26.5L29.5 26.5C30.16 26.5 30.8 26.24 31.27 25.77C31.74 25.3 32 24.66 32 24L32 20.88C32 20.71 31.99 20.54 31.98 20.37ZM14.19 6.63L14.94 8.38L12.99 9.09C12.8 9.15 12.62 9.26 12.47 9.39C12.33 9.52 12.2 9.68 12.12 9.86C12.03 10.04 11.98 10.24 11.97 10.44C11.96 10.64 11.99 10.84 12.06 11.02C12.13 11.21 12.23 11.38 12.37 11.53C12.5 11.68 12.67 11.79 12.85 11.88C13.03 11.96 13.23 12 13.43 12.01C13.63 12.02 13.83 11.98 14.01 11.91L16.13 11.14L16.69 12.47L14.99 13.1C14.67 13.22 14.39 13.45 14.22 13.76C14.04 14.06 13.98 14.41 14.04 14.76C14.1 15.1 14.28 15.42 14.55 15.64C14.81 15.87 15.15 16 15.5 16C15.67 16 15.85 15.97 16.01 15.91L18.46 15.02C18.97 15.44 19.56 15.76 20.18 15.98L27.26 18.5L27.29 18.51C27.6 18.61 27.9 18.78 28.15 19L5.5 19L5.5 9.79L14.19 6.63ZM5.5 23.5L5.5 22L29 22L29 23.5L5.5 23.5Z","ok":"M22.06 11.94C22.2 12.08 22.31 12.24 22.39 12.43C22.46 12.61 22.5 12.8 22.5 13C22.5 13.2 22.46 13.39 22.39 13.58C22.31 13.76 22.2 13.92 22.06 14.06L15.06 21.06C14.92 21.2 14.76 21.31 14.57 21.39C14.39 21.47 14.2 21.5 14 21.5C13.8 21.5 13.61 21.47 13.42 21.39C13.24 21.31 13.08 21.2 12.94 21.06L9.94 18.06C9.8 17.92 9.69 17.76 9.61 17.58C9.54 17.39 9.5 17.2 9.5 17C9.5 16.8 9.54 16.61 9.61 16.43C9.69 16.24 9.8 16.08 9.94 15.94C10.08 15.8 10.24 15.69 10.42 15.61C10.61 15.54 10.8 15.5 11 15.5C11.2 15.5 11.39 15.54 11.57 15.61C11.76 15.69 11.92 15.8 12.06 15.94L14 17.88L19.94 11.94C20.08 11.8 20.24 11.69 20.43 11.61C20.61 11.54 20.8 11.5 21 11.5C21.2 11.5 21.39 11.54 21.57 11.61C21.76 11.69 21.92 11.8 22.06 11.94ZM29.5 16C29.5 18.67 28.71 21.28 27.22 23.5C25.74 25.72 23.63 27.45 21.17 28.47C18.7 29.49 15.99 29.76 13.37 29.24C10.75 28.72 8.34 27.43 6.45 25.55C4.57 23.66 3.28 21.25 2.76 18.63C2.24 16.01 2.51 13.3 3.53 10.83C4.55 8.37 6.28 6.26 8.5 4.78C10.72 3.29 13.33 2.5 16 2.5C19.58 2.5 23.01 3.93 25.54 6.46C28.07 8.99 29.5 12.42 29.5 16ZM26.5 16C26.5 13.92 25.88 11.89 24.73 10.17C23.58 8.44 21.94 7.09 20.02 6.3C18.1 5.5 15.99 5.3 13.95 5.7C11.91 6.11 10.04 7.11 8.58 8.58C7.11 10.04 6.11 11.91 5.7 13.95C5.3 15.99 5.5 18.1 6.3 20.02C7.09 21.94 8.44 23.58 10.17 24.73C11.89 25.88 13.92 26.5 16 26.5C18.78 26.5 21.45 25.39 23.42 23.42C25.39 21.45 26.5 18.78 26.5 16Z","user":"M29.3 26.25C27.58 23.24 24.91 20.9 21.7 19.6C23.3 18.4 24.47 16.73 25.07 14.83C25.66 12.93 25.64 10.88 25.01 8.99C24.38 7.1 23.17 5.46 21.55 4.29C19.94 3.12 17.99 2.5 16 2.5C14.01 2.5 12.06 3.12 10.45 4.29C8.83 5.46 7.62 7.1 6.99 8.99C6.36 10.88 6.34 12.93 6.93 14.83C7.53 16.73 8.7 18.4 10.3 19.6C7.09 20.9 4.42 23.24 2.7 26.25C2.6 26.42 2.53 26.61 2.49 26.81C2.46 27.01 2.47 27.21 2.52 27.41C2.57 27.6 2.66 27.78 2.78 27.95C2.9 28.11 3.05 28.24 3.23 28.34C3.4 28.44 3.59 28.51 3.79 28.53C3.99 28.56 4.19 28.54 4.39 28.48C4.58 28.43 4.76 28.34 4.92 28.21C5.07 28.08 5.2 27.93 5.3 27.75C7.56 23.83 11.56 21.5 16 21.5C20.44 21.5 24.44 23.84 26.7 27.75C26.91 28.08 27.23 28.32 27.61 28.41C27.99 28.51 28.39 28.45 28.73 28.26C29.06 28.06 29.31 27.74 29.42 27.37C29.52 26.99 29.48 26.59 29.3 26.25ZM9.5 12C9.5 10.71 9.88 9.46 10.6 8.39C11.31 7.32 12.32 6.49 13.51 5.99C14.7 5.5 16.01 5.37 17.27 5.62C18.53 5.88 19.69 6.49 20.6 7.4C21.51 8.31 22.12 9.47 22.38 10.73C22.63 11.99 22.5 13.3 22.01 14.49C21.51 15.68 20.68 16.69 19.61 17.4C18.54 18.12 17.29 18.5 16 18.5C14.28 18.5 12.62 17.81 11.41 16.59C10.19 15.38 9.5 13.72 9.5 12Z","card":"M28 5.5L4 5.5C3.34 5.5 2.7 5.76 2.23 6.23C1.76 6.7 1.5 7.34 1.5 8L1.5 24C1.5 24.66 1.76 25.3 2.23 25.77C2.7 26.24 3.34 26.5 4 26.5L28 26.5C28.66 26.5 29.3 26.24 29.77 25.77C30.24 25.3 30.5 24.66 30.5 24L30.5 8C30.5 7.34 30.24 6.7 29.77 6.23C29.3 5.76 28.66 5.5 28 5.5ZM27.5 8.5L27.5 11L4.5 11L4.5 8.5L27.5 8.5ZM4.5 23.5L4.5 14L27.5 14L27.5 23.5L4.5 23.5ZM26 20.5C26 20.9 25.84 21.28 25.56 21.56C25.28 21.84 24.9 22 24.5 22L20.5 22C20.1 22 19.72 21.84 19.44 21.56C19.16 21.28 19 20.9 19 20.5C19 20.1 19.16 19.72 19.44 19.44C19.72 19.16 20.1 19 20.5 19L24.5 19C24.9 19 25.28 19.16 25.56 19.44C25.84 19.72 26 20.1 26 20.5ZM17.5 20.5C17.5 20.9 17.34 21.28 17.06 21.56C16.78 21.84 16.4 22 16 22L14.5 22C14.1 22 13.72 21.84 13.44 21.56C13.16 21.28 13 20.9 13 20.5C13 20.1 13.16 19.72 13.44 19.44C13.72 19.16 14.1 19 14.5 19L16 19C16.4 19 16.78 19.16 17.06 19.44C17.34 19.72 17.5 20.1 17.5 20.5Z"};
  const ico = (k, s=16, cls="") => `<svg class="te-i ${cls}" width="${s}" height="${s}" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="${TE_ICO[k]}"/></svg>`;
  const usd = n => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
  const r2 = n => Math.round(n * 100) / 100;
  const TAX = 0.05, INS = 0.06, FEE = 10;
  const PARTNER = "Northfield Sports Association";
  const TE_META = `Spring Classic <i aria-hidden="true">&bull;</i> ${PARTNER} <i aria-hidden="true">&bull;</i> Apr 9&ndash;12, 2027`;
  const TE_DIVS = [
    { id:"U10", fee:450, level:"B", ends:"Mar 1, 2027", teams:[{ id:"g10", name:"Riverside FC U10 Green", rep:"Dana Ortiz" }, { id:"o10", name:"Riverside FC U10 Gold", rep:"Marcus Lee" }] },
    { id:"U12", fee:650, level:"A", ends:"Mar 1, 2027", teams:[{ id:"b12", name:"Riverside FC U12 Blue", rep:"Selena Torres" }, { id:"w12", name:"Riverside FC U12 White", rep:"Chris Rios" }, { id:"r12", name:"Riverside FC U12 Red", rep:"Jake Park" }] },
    { id:"U14", fee:750, level:"A", ends:"Mar 8, 2027", teams:[{ id:"n14", name:"Riverside FC U14 Navy", rep:"James Richter" }, { id:"y14", name:"Riverside FC U14 Gray", rep:"Ana Silva" }] }
  ];
  // Team add-ons, priced per team. Required ones are part of registration.
  const TE_ADD = [
    { id:"kit", req:true, name:"Team jersey set", icon:"shirt", price:0, desc:"Home and away jerseys for up to 18 players, printed with numbers.", opts:{ Color:["Navy","White","Red"] } },
    { id:"balls", req:true, name:"Match ball pack", icon:"ball", price:50, tax:true, desc:"Six match balls in your division's size, inflated and waiting at check-in.", opts:{ Size:["Size 4","Size 5"] } },
    { id:"banner", name:"Team banner", icon:"flag", price:35, tax:true, desc:"A 3 by 6 ft vinyl banner with your team name for the sideline.", opts:{ Color:["Navy","White","Red"] }, note:true },
    { id:"tent", name:"Pop-up canopy", icon:"tent", price:125, desc:"A 10 by 10 ft canopy reserved at your field for all four days." }
  ];
  // Player and staff products; where each appears is set on the Admin rules tab.
  const SIZES = ["Youth S","Youth M","Youth L","Adult S","Adult M","Adult L"];
  const TE_PROD = [
    { id:"kit", name:"Training kit", icon:"shirt", price:0, desc:"Shirt, shorts and socks for every session.", opts:{ Size:SIZES, Color:["Navy","White"] } },
    { id:"jersey", name:"Match jersey", icon:"shirt", price:50, tax:true, desc:"Numbered match jersey in your team's colors. Add a note to request a number.", opts:{ Size:SIZES, Color:["Navy","White"] }, note:true },
    { id:"guards", name:"Shin guards", icon:"shield", price:35, tax:true, desc:"Lightweight guards with ankle sleeves.", opts:{ Size:["Youth","Adult"] }, qty:true },
    { id:"bag", name:"Equipment bag", icon:"bag", price:125, desc:"Ventilated bag with a separate cleat compartment.", qty:true }
  ];
  const ROLE = { player:{ label:"Player", title:"Register a Free Agent Player", fee:50 }, staff:{ label:"Staff", title:"Register a Team Staff Member", fee:25 } };
  const TE_PLANS = [{ id:"full", name:"Pay in full", n:1 }, { id:"p3", name:"Season split", n:3 }, { id:"p6", name:"Monthly", n:6 }, { id:"p12", name:"Twelve payments", n:12 }];
  const TE_CODES = {
    SPRING10:{ t:"spring", pct:.10, label:"10% off team fees" },
    SPRING5:{ t:"spring", pct:.05, label:"5% off team fees" },
    SUMMER50:{ t:"summer", amt:50, label:"$50.00 off" }
  };
  const T_STEPS = ["Select teams","Add-ons","Registration insurance","Review registration"];
  const P_STEPS = ["Basic information","Upload documents","Sign documents","Add-ons","Review registration"];

  function teSeed(){
    const add = {};
    TE_DIVS.forEach(d => { add[d.id] = {}; TE_ADD.forEach(p => { add[d.id][p.id] = { on:!!p.req, note:"" }; }); });
    const prod = {};
    TE_PROD.forEach(p => { prod[p.id] = { on:false, qty:1, note:"" }; });
    return {
      tab:"team",
      t:{ step:0, sel:{ U10:[], U12:[], U14:[] }, extra:{ U10:[], U12:[], U14:[] }, menu:null, add, ins:null, tried:-1, sum:{}, rev:{}, view:null },
      c:{ plan:"p3", draft:null, det:null, modal:false, codes:[], code:"", msg:null, method:"bank", autopay:false, agree:false, name:"", tried:false, done:false, details:false, seeded:false },
      p:{ role:"player", prod, tried:false, tot:false, toast:"" },
      rules:{ kit:{ pa:1, pr:1, sa:1, sr:1 }, jersey:{ pa:1, pr:1, sa:0, sr:0 }, guards:{ pa:1, pr:0, sa:0, sr:0 }, bag:{ pa:1, pr:0, sa:1, sr:0 } },
      fixed:false
    };
  }
  // A filled-in team cart, for scenes that start past step one
  function teFill(t){
    t.sel = { U10:["g10"], U12:["b12","w12"], U14:[] };
    ["U10","U12"].forEach(d => { t.add[d].kit.Color = "Navy"; t.add[d].balls.Size = d === "U10" ? "Size 4" : "Size 5"; });
    t.add.U12.banner.on = true; t.add.U12.banner.Color = "White";
    t.ins = "yes";
  }

  /* ---------- shared bits, built to Fieldhouse component anatomy ---------- */
  const teBtn = (label, a, o={}) => `<button type="button" class="te-btn ${o.kind || "filled"}${o.sm ? " sm" : ""}${o.full ? " full" : ""}" data-a="${a}"${o.disabled ? " disabled" : ""}${o.attrs ? " " + o.attrs : ""}>${o.icon ? ico(o.icon, o.sm ? 16 : 18) : ""}<span>${label}</span>${o.trail ? ico(o.trail, 14) : ""}</button>`;
  const teId = k => "te-" + k.replace(/[^a-z0-9]+/gi, "-");
  function teSelect(key, label, options, value, err){
    const id = teId(key);
    return `<div class="te-field${err ? " err" : ""}"><label for="${id}">${label}<span class="te-req" aria-hidden="true">*</span></label>
      <div class="te-sel"><select id="${id}" data-in="${key}" required${err ? ` aria-invalid="true" aria-describedby="${id}-e"` : ""}>
        <option value="">Select an option&hellip;</option>${options.map(o => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>${ico("down", 16)}</div>
      ${err ? `<p class="te-help err" id="${id}-e">${ico("err", 14)}Select an option.</p>` : ""}</div>`;
  }
  const teNote = (key, value) => `<div class="te-field"><label for="${teId(key)}">Add a note <span class="te-opt">(optional)</span></label><textarea id="${teId(key)}" data-in="${key}" rows="2" placeholder="Anything we should know?">${esc(value || "")}</textarea></div>`;
  const teCheck = (key, label, on, o={}) => `<label class="te-check${o.err ? " err" : ""}${o.cls ? " " + o.cls : ""}"><input type="checkbox" data-in="${key}"${on ? " checked" : ""}${o.err ? ' aria-invalid="true"' : ""}${o.aria ? ` aria-label="${o.aria}"` : ""}><span class="te-box${o.indet ? " indet" : ""}">${ico(o.indet ? "minus" : "check", 12)}</span>${label ? `<span class="te-check-l">${label}</span>` : ""}</label>`;
  const teBanner = (status, html) => `<div class="te-banner ${status}" role="${status === "error" ? "alert" : "status"}">${ico(status === "error" ? "err" : status === "success" ? "ok" : "info", 20)}<div>${html}</div></div>`;
  const teThumb = icon => `<span class="te-thumb">${ico(icon, 34)}</span>`;
  const tePrice = p => p.price ? `${usd(p.price)}${p.tax ? ` <small>+ tax</small>` : ""}` : "Included";
  function teSteps(steps, cur, go){
    return `<ol class="te-steps" style="--n:${steps.length}">${steps.map((l, i) => {
      const inner = i < cur && go ? `<button type="button" data-a="${go}:${i}">${l}</button>` : `<span${i === cur ? ' aria-current="step"' : ""}>${l}</span>`;
      return `<li class="${i < cur ? "done" : i === cur ? "cur" : ""}"><i aria-hidden="true"></i>${inner}</li>`;
    }).join("")}</ol>`;
  }
  const teHero = (title, meta) => `<div class="te-util"><b>${PARTNER}</b><span>${ico("user", 14)}Hi, Riley</span></div>
    <div class="te-hero"><h3>${title}</h3>${meta ? `<p>${meta}</p>` : ""}</div>`;

  /* ---------- team registration ---------- */
  const tDiv = id => TE_DIVS.find(d => d.id === id);
  const tTeams = d => d.teams.concat(TE.data.t.extra[d.id]);
  const tSel = () => TE_DIVS.filter(d => TE.data.t.sel[d.id].length);
  const tCount = () => TE_DIVS.reduce((a, d) => a + TE.data.t.sel[d.id].length, 0);
  function tItems(d){
    const n = TE.data.t.sel[d.id].length, a = TE.data.t.add[d.id];
    return TE_ADD.filter(p => a[p.id].on).map(p => ({ p, n, cost:p.price * n, tax:p.tax ? p.price * n * TAX : 0 }));
  }
  const tFees = () => tSel().reduce((a, d) => a + TE.data.t.sel[d.id].length * d.fee, 0);
  const tAddCost = () => tSel().reduce((a, d) => a + tItems(d).reduce((b, i) => b + i.cost, 0), 0);
  const tTax = () => r2(tSel().reduce((a, d) => a + tItems(d).reduce((b, i) => b + i.tax, 0), 0));
  const tIns = () => r2(tFees() * INS);
  function tErrors(){
    const out = [], t = TE.data.t;
    tSel().forEach(d => TE_ADD.forEach(p => { const v = t.add[d.id][p.id]; if(v.on && p.opts) Object.keys(p.opts).forEach(k => { if(!v[k]) out.push(`${d.id}:${p.id}:${k}`); }); }));
    return out;
  }

  function tSide(){
    const t = TE.data.t, ds = tSel();
    if(!ds.length) return `<aside class="te-side te-empty" aria-label="Registration summary"><div><b>Looks like your bench is empty!</b><p>Select your teams to get in the game.</p></div>
      <div class="te-subtotal"><span>Subtotal:</span><b>$0.00</b></div></aside>`;
    const sub = tFees() + tAddCost() + (t.ins === "yes" ? tIns() : 0);
    return `<aside class="te-side" aria-label="Registration summary">${ds.map(d => {
      const n = t.sel[d.id].length, items = tItems(d), open = !!t.sum[d.id];
      const amt = n * d.fee + items.reduce((a, i) => a + i.cost, 0);
      return `<div class="te-card"><div class="te-card-h"><b>${d.id}</b><b>${usd(amt)}</b></div><div class="te-card-b">
        <p class="te-countline">Teams <span class="te-badge">${n}</span></p><p class="te-countline">Add-ons <span class="te-badge">${items.length}</span></p>
        ${open ? `<ul class="te-mini">${t.sel[d.id].map(id => `<li><span>${esc(tTeams(d).find(x => x.id === id).name)}</span><span>${usd(d.fee)}</span></li>`).join("")}
          ${items.map(i => `<li><span>${i.p.name} &times; ${i.n}</span><span>${i.cost ? usd(i.cost) : "Included"}</span></li>`).join("")}</ul>` : ""}
        ${teBtn(open ? "Hide details" : "View details", "t-sum:" + d.id, { kind:"outlined", sm:true, trail:open ? "up" : "down", attrs:`aria-expanded="${open}"` })}</div></div>`;
    }).join("")}
    ${t.ins === "yes" ? `<p class="te-sideline"><span>Registration insurance</span><span>${usd(tIns())}</span></p>` : ""}
    <div class="te-subtotal"><span>Subtotal:</span><b>${usd(sub)}</b></div></aside>`;
  }

  function tStep0(){
    const t = TE.data.t;
    return `<h4 class="te-h">Select your teams</h4><p class="te-lede">Pick your club's returning teams in each division. You can edit team details before you finish registering.</p>
    ${TE_DIVS.map(d => {
      const sel = t.sel[d.id], teams = tTeams(d), open = t.menu === d.id;
      const all = sel.length === teams.length, some = sel.length && !all;
      return `<section class="te-card te-div"><div class="te-card-h"><b>${d.id}</b><span class="te-card-hr">
        <button type="button" class="te-link sm" data-a="t-view:${d.id}">View add-ons</button><b>${usd(d.fee)}</b><small>per team</small></span></div>
      <div class="te-card-b"><p class="te-facts"><span>Age group: <b>${d.id}</b></span><span>Level: <b>${d.level}</b></span><span>Gender: <b>Co-ed</b></span><span>Registration ends: <b>${d.ends}</b></span></p>
        <p class="te-where">${ico("pin", 14)}Valley Park, Northfield ${ico("cal", 14)}Apr 9&ndash;12, 2027</p>
        <div class="te-ms">
          <button type="button" class="te-ms-trigger${sel.length ? " has" : ""}" data-a="t-menu:${d.id}" aria-expanded="${open}" aria-haspopup="listbox">
            <span>${sel.length ? sel.map(id => `<span class="te-tag">${esc(teams.find(x => x.id === id).name)}</span>`).join("") : "<em>Select your teams&hellip;</em>"}</span>${ico(open ? "up" : "down", 16)}</button>
          ${open ? `<div class="te-menu" role="group" aria-label="${d.id} teams">
            ${teCheck("t-all:" + d.id, "Select all teams", all, { indet:some, cls:"te-menu-all" })}
            <div class="te-menu-h"><span>Team name</span><span>Team rep</span></div>
            ${teams.map(x => `<div class="te-menu-row">${teCheck(`t-team:${d.id}:${x.id}`, esc(x.name), sel.includes(x.id))}<em>${esc(x.rep)}</em></div>`).join("")}
            <button type="button" class="te-menu-new" data-a="t-new:${d.id}">${ico("plus", 14)}Create new team</button></div>` : ""}
        </div></div></section>`;
    }).join("")}`;
  }
  function tStep1(){
    const t = TE.data.t, errs = t.tried === 1 ? tErrors() : [];
    return `<h4 class="te-h">Select your add-ons</h4><p class="te-lede">Some items are part of your registration. Others can be added for purchase before you check out. Prices are per team.</p>
    ${errs.length ? teBanner("error", `<b>Choose the missing options before you continue.</b> ${errs.length} required ${errs.length === 1 ? "field is" : "fields are"} empty below.`) : ""}
    ${tSel().map(d => {
      const a = t.add[d.id], n = t.sel[d.id].length;
      const row = p => {
        const v = a[p.id], key = `${d.id}:${p.id}`;
        const opts = v.on && p.opts ? Object.keys(p.opts).map(k => teSelect(`t-opt:${key}:${k}`, k, p.opts[k], v[k], errs.includes(`${key}:${k}`))).join("") : "";
        if(p.req) return `<div class="te-prod">${teThumb(p.icon)}<div class="te-prod-b"><p class="te-prod-n"><b>${p.name}</b> <small>${p.price ? `(${usd(p.price)} + tax)` : "(Included)"}</small></p><p>${p.desc}</p></div><div class="te-prod-f">${opts}</div></div>`;
        return `<div class="te-prod">${teThumb(p.icon)}<div class="te-prod-b">${teCheck(`t-on:${key}`, `<b>${p.name}</b> <span class="te-price">${tePrice(p)}</span>`, v.on)}<p>${p.desc}</p></div>
          <div class="te-prod-f">${opts}${v.on && p.note ? teNote(`t-note:${key}`, v.note) : ""}</div></div>`;
      };
      return `<section class="te-card"><div class="te-card-h"><b>${d.id}</b><span class="te-card-hr"><small>${n} team${n === 1 ? "" : "s"}</small></span></div><div class="te-card-b">
        <h5 class="te-sub">Required for registration</h5>${TE_ADD.filter(p => p.req).map(row).join("")}
        <hr class="te-rule"><h5 class="te-sub">Optional add-ons</h5>${TE_ADD.filter(p => !p.req).map(row).join("")}</div></section>`;
    }).join("")}`;
  }
  function tStep2(){
    const t = TE.data.t, err = t.tried === 2 && !t.ins;
    return `<h4 class="te-h">Registration insurance</h4><p class="te-lede">Insurance refunds your team fees if a team can't play for a covered reason, such as injury, illness or severe weather.</p>
    <fieldset class="te-tiles"${err ? ' aria-describedby="te-ins-e"' : ""}><legend class="sr">Registration insurance</legend>
      ${[["yes","Yes, protect my registration",`Covers all ${tCount()} team${tCount() === 1 ? "" : "s"} for up to 100% of team fees.`,usd(tIns())],
         ["no","No thanks","I understand team fees aren't refundable if a team withdraws.",""]].map(([v, l, dsc, aside]) =>
        `<label class="te-tile${t.ins === v ? " on" : ""}${err ? " err" : ""}"><input type="radio" name="te-ins" data-in="t-ins" value="${v}"${t.ins === v ? " checked" : ""}><span class="te-dot" aria-hidden="true"></span>
          <span class="te-tile-b"><b>${l}</b><span>${dsc}</span></span>${aside ? `<span class="te-tile-a">${aside}</span>` : ""}</label>`).join("")}
    </fieldset>${err ? `<p class="te-help err" id="te-ins-e">${ico("err", 14)}Choose whether to add registration insurance.</p>` : ""}
    <p class="te-fine">Offered by a third-party insurer. Policy terms are sent with your confirmation email.</p>`;
  }
  function tStep3(){
    const t = TE.data.t;
    const edit = (step, what) => `<button type="button" class="te-ibtn" data-a="t-step:${step}" aria-label="Edit ${what}">${ico("edit", 20)}</button>`;
    return `<h4 class="te-h">Review your registration</h4>
    <section class="te-card"><div class="te-card-h"><b>Team selection</b>${edit(0, "team selection")}</div><div class="te-card-b te-rev">
      ${tSel().map(d => { const open = t.rev[d.id] !== false, n = t.sel[d.id].length;
        return `<div class="te-rev-row"><button type="button" class="te-disc" data-a="t-rev:${d.id}" aria-expanded="${open}">${d.id} ${ico(open ? "up" : "down", 14)}</button><b>${usd(n * d.fee)}</b></div>
          ${open ? `<ul class="te-mini indent">${t.sel[d.id].map(id => `<li><span>${esc(tTeams(d).find(x => x.id === id).name)}</span><span>${usd(d.fee)}</span></li>`).join("")}</ul>` : ""}`; }).join("")}
    </div></section>
    <section class="te-card"><div class="te-card-h"><b>Add-ons</b>${edit(1, "add-ons")}</div><div class="te-card-b te-rev">
      ${tSel().map(d => tItems(d).map(i => `<div class="te-rev-row"><span>${i.p.name} <small>${d.id} &middot; ${i.n} team${i.n === 1 ? "" : "s"}${Object.keys(i.p.opts || {}).map(k => " &middot; " + esc(t.add[d.id][i.p.id][k] || "")).join("")}</small></span><b>${i.cost ? usd(i.cost) : "Included"}</b></div>`).join("")).join("")}
      ${tTax() ? `<div class="te-rev-row"><span>Tax (5%)</span><b>${usd(tTax())}</b></div>` : ""}
    </div></section>
    <section class="te-card"><div class="te-card-h"><b>Registration insurance</b>${edit(2, "registration insurance")}</div><div class="te-card-b te-rev">
      <div class="te-rev-row"><span>${t.ins === "yes" ? `Added for ${tCount()} team${tCount() === 1 ? "" : "s"}` : "Declined"}</span><b>${t.ins === "yes" ? usd(tIns()) : "$0.00"}</b></div></div></section>`;
  }
  function tView(){
    const t = TE.data.t, s = t.step, review = s === 3;
    const body = [tStep0, tStep1, tStep2, tStep3][s]();
    const none = !tCount();
    return `${teHero("Register a Team", TE_META)}
      <div class="te-page${review ? " te-narrow" : ""}"><div class="te-main">${teSteps(T_STEPS, s, "t-step")}${body}</div>${review ? "" : tSide()}</div>
      <div class="te-actions"><button type="button" class="te-link" data-a="t-cancel">Cancel</button><span class="te-actions-r">
        ${s ? teBtn("Back", "t-back", { kind:"outlined", icon:"left" }) : ""}
        ${s === 0 && none ? `<span class="te-hint" id="te-none">Select at least one team to continue.</span>` : ""}
        ${review ? teBtn("Continue to checkout", "t-checkout") : teBtn("Save and continue", "t-next", { disabled:s === 0 && none, attrs:s === 0 && none ? 'aria-describedby="te-none"' : "" })}</span></div>
      ${t.view ? tViewAddons() : ""}`;
  }
  function tViewAddons(){
    const sec = (title, list) => `<h5 class="te-sub">${title}</h5>${list.map(p => `<div class="te-prod">${teThumb(p.icon)}<div class="te-prod-b"><p class="te-prod-n"><b>${p.name}</b>${p.price ? ` <small>${usd(p.price)}${p.tax ? " + tax" : ""}</small>` : ""}</p><p>${p.desc}</p></div></div>`).join("")}`;
    return `<div class="te-scrim" data-a="t-view-x"></div><div class="te-modal" role="dialog" aria-modal="true" aria-labelledby="te-mh"><header><h4 id="te-mh">${t_viewTitle()}</h4><button type="button" class="te-x" data-a="t-view-x" aria-label="Close" data-autofocus>${ico("x", 20)}</button></header>
      <div class="te-m-body">${sec("Included in registration", TE_ADD.filter(p => p.req))}${sec("Available for purchase (optional)", TE_ADD.filter(p => !p.req))}</div>
      <footer class="end">${teBtn("Ok", "t-view-x")}</footer></div>`;
  }
  const t_viewTitle = () => `${TE.data.t.view} add-ons`;

  /* ---------- checkout ---------- */
  function coEnsure(){
    const s = TE.data;
    if(!tCount()){ teFill(s.t); s.c.seeded = true; }
  }
  function coSched(total, n){
    const cents = Math.round(total * 100), each = Math.floor(cents / n), first = cents - each * (n - 1), d = new Date();
    return Array.from({ length:n }, (_, i) => {
      const c = i ? each : first;
      return { amt:c / 100, pct:cents ? Math.round(c / cents * 100) : 0,
        due:i ? new Date(d.getFullYear(), d.getMonth() + i, 15).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "Today" };
    });
  }
  const coDiscOf = (code, fees) => { const c = TE_CODES[code]; return c.pct ? r2(fees * c.pct) : Math.min(c.amt, fees); };
  function coOrder(planId){
    const s = TE.data, c = s.c;
    const fees = tFees(), codeFor = tid => c.codes.find(k => TE_CODES[k].t === tid);
    const mk = (id, name, teams, fees, ins, add, tax, plans) => {
      const code = codeFor(id), disc = code ? coDiscOf(code, fees) : 0;
      const reg = r2(fees - disc + ins);
      const plan = plans ? TE_PLANS.find(p => p.id === (planId || c.plan)) : TE_PLANS[0];
      const sched = coSched(reg, plan.n);
      return { id, name, teams, fees, disc, code, ins, add, tax, reg, plans, plan, sched, today:r2(sched[0].amt + add + tax), total:r2(reg + add + tax) };
    };
    const list = [
      mk("spring", "Spring Classic", tCount(), fees, s.t.ins === "yes" ? tIns() : 0, tAddCost(), tTax(), true),
      mk("summer", "Summer Showcase", 2, 1000, 0, 0, 0, false)
    ];
    return { list, due:r2(list.reduce((a, o) => a + o.today, 0) + FEE), total:r2(list.reduce((a, o) => a + o.total, 0) + FEE), teams:list.reduce((a, o) => a + o.teams, 0) };
  }
  function coMissing(o){
    const c = TE.data.c, m = [];
    if(!c.method) m.push(["method","Add a payment method."]);
    if(o.list[0].plan.n > 1 && !c.autopay) m.push(["autopay","Agree to autopay for your installments."]);
    if(!c.agree) m.push(["agree","Agree to the Payment and Refund Policies."]);
    if(!c.name.trim()) m.push(["name","Enter your full name to sign."]);
    return m;
  }
  function coView(){
    const s = TE.data, c = s.c, o = coOrder(), sp = o.list[0];
    if(c.done) return coDone(o);
    const miss = c.tried ? coMissing(o) : [], has = k => miss.some(x => x[0] === k);
    const plan = sp.plan;
    const msg = c.msg ? `<p class="te-help ${c.msg[0]}" id="te-code-m" role="status">${ico(c.msg[0] === "err" ? "err" : c.msg[0] === "ok" ? "ok" : "info", 14)}${c.msg[1]}</p>` : "";
    return `${teHero("Checkout", "")}
    <div class="te-page"><div class="te-main">
      ${miss.length ? teBanner("error", `<b>Finish these before you pay:</b><ul>${miss.map(([k, l]) => `<li><button type="button" class="te-link" data-a="co-goto:${k}">${l}</button></li>`).join("")}</ul>`) : ""}
      ${c.seeded ? teBanner("info", "We filled your cart with a sample team registration so you can try checkout. Build your own on the Team registration tab.") : ""}
      <section class="te-card"><div class="te-card-h"><b>Order summary</b></div><div class="te-card-b">
        <div class="te-row"><span>${o.teams} teams in ${o.list.length} tournaments</span>${teBtn(c.details ? "Hide order details" : "View order details", "co-details", { kind:"outlined", sm:true, attrs:`aria-expanded="${c.details}"` })}</div>
        ${c.details ? `<table class="te-table"><thead><tr><th>Item</th><th>Tournament</th><th>Qty.</th><th>Total price</th></tr></thead><tbody>
          ${tSel().map(d => `<tr><td>${d.id} team registration</td><td>Spring Classic</td><td>${s.t.sel[d.id].length}</td><td>${usd(s.t.sel[d.id].length * d.fee)}</td></tr>`).join("")}
          ${tSel().map(d => tItems(d).map(i => `<tr><td>${i.p.name} (${d.id})</td><td>Spring Classic</td><td>${i.n}</td><td>${i.cost ? usd(i.cost) : "Included"}</td></tr>`).join("")).join("")}
          ${sp.ins ? `<tr><td>Registration insurance</td><td>Spring Classic</td><td>${sp.teams}</td><td>${usd(sp.ins)}</td></tr>` : ""}
          <tr><td>U12 team registration</td><td>Summer Showcase</td><td>2</td><td>${usd(1000)}</td></tr></tbody></table>` : ""}
      </div></section>
      <section class="te-card"><div class="te-card-h"><b>Payment options</b></div><div class="te-card-b">
        <h5 class="te-sub">Select your payment options</h5>
        <div class="te-row"><span>Spring Classic</span><span class="te-row-r">${plan.n > 1 ? `<span class="te-badge lbl">${plan.n} payments</span>` : ""}<b>${plan.name}</b></span></div>
        <div class="te-row"><span>Summer Showcase</span><span class="te-row-r"><b>Pay in full</b> <small>required</small></span></div>
        <div class="te-row end">${teBtn("Edit payment options", "co-plan", { kind:"outlined", sm:true })}</div>
        <hr class="te-rule">
        <h5 class="te-sub"><label for="te-co-code">Apply discount codes</label></h5>
        <div class="te-code"><input id="te-co-code" data-in="co-code" value="${esc(c.code)}" placeholder="Enter discount code" autocomplete="off" spellcheck="false"${c.msg ? ' aria-describedby="te-code-m"' : ""}${c.msg && c.msg[0] === "err" ? ' aria-invalid="true"' : ""}>
          ${teBtn("Apply", "co-apply", { kind:"outlined", disabled:!c.code.trim() })}</div>${msg}
        ${c.codes.length ? `<div class="te-tags">${c.codes.map(k => `<span class="te-chip">${ico("tag", 14)}${k}<button type="button" data-a="co-unc:${k}" aria-label="Remove ${k}">${ico("x", 12)}</button></span>`).join("")}</div>` : ""}
      </div></section>
      <section class="te-card"><div class="te-card-h"><b>Payment method</b></div><div class="te-card-b">
        <h5 class="te-sub">Select your payment method</h5><p class="te-muted">Bank accounts are stored automatically.</p>
        ${c.method ? `<p class="te-pm" id="te-pm">${ico(c.method === "bank" ? "bank" : "card", 20)}${c.method === "bank" ? "Checking account ****1386" : "Visa ending in 4242"}</p>
          <div class="te-row-l">${teBtn("Edit payment method", "co-method:" + (c.method === "bank" ? "card" : "bank"), { kind:"outlined", sm:true })}<button type="button" class="te-link sm" data-a="co-method:none">Clear payment method</button></div>`
        : `<div class="te-row-l${has("method") ? " err" : ""}" id="te-pm">${teBtn("Add bank account", "co-method:bank", { sm:true, icon:"bank" })}${teBtn("Add credit card", "co-method:card", { sm:true, icon:"card" })}</div>
          ${has("method") ? `<p class="te-help err">${ico("err", 14)}Add a payment method to pay today.</p>` : ""}`}
        ${plan.n > 1 ? `<hr class="te-rule">${teCheck("co-autopay", `Agree to autopay<span class="te-req" aria-hidden="true">*</span>`, c.autopay, { err:has("autopay") })}
          <p class="te-fine">By agreeing to autopay, you authorize ${PARTNER} to charge this payment method for each installment in your cart.</p>
          ${has("autopay") ? `<p class="te-help err">${ico("err", 14)}Autopay is required for payment plans.</p>` : ""}` : ""}
      </div></section>
      <section class="te-card"><div class="te-card-b">
        ${teCheck("co-agree", `I have read and agree to all <a class="te-link" href="#" onclick="return false">Payment and Refund Policies</a>.<span class="te-req" aria-hidden="true">*</span>`, c.agree, { err:has("agree") })}
        ${has("agree") ? `<p class="te-help err">${ico("err", 14)}Agree to the policies to continue.</p>` : ""}
        <div class="te-field${has("name") ? " err" : ""}"><label for="te-co-name">Enter your full name<span class="te-req" aria-hidden="true">*</span></label>
          <input id="te-co-name" data-in="co-name" value="${esc(c.name)}" autocomplete="off"${has("name") ? ' aria-invalid="true"' : ""}>
          ${has("name") ? `<p class="te-help err">${ico("err", 14)}Enter your full name.</p>` : ""}</div>
        <p class="te-sig" aria-hidden="true">${ico("x", 16)}<span id="te-sig">${esc(c.name)}</span></p>
        <p class="te-fine">By entering my name, I confirm I have read and agree to be bound by the agreements and waivers for this program and that my electronic signature is the legal equivalent of my handwritten signature.</p>
      </div></section>
    </div>
    <aside class="te-side te-co-side" aria-label="Order total">
      <div class="te-total"><div class="te-row big"><span>Due today:</span><b>${usd(o.due)}</b></div><div class="te-row"><span>Total price:</span><span>${usd(o.total)}</span></div></div>
      ${o.list.map(t => `<div class="te-tline"><div class="te-row"><b>${t.name}:</b><b>${t.plan.n > 1 ? `${usd(t.today)} <span class="te-of">/ ${usd(t.total)}</span>` : usd(t.total)}</b></div>
        <div class="te-row sm"><span>Teams: ${t.teams}</span><span>${t.disc ? `<s>${usd(t.fees)}</s> ` : ""}${usd(t.fees - t.disc)}</span></div>
        ${t.code ? `<p class="te-codeline">${ico("tag", 12)}${t.code} (${usd(t.disc)} discount)</p>` : ""}
        ${t.ins ? `<div class="te-row sm"><span>Registration insurance</span><span>${usd(t.ins)}</span></div>` : ""}
        ${t.add ? `<div class="te-row sm"><span>Add-ons (paid today)</span><span>${usd(t.add + t.tax)}</span></div>` : ""}
        <div class="te-row sm"><span>Payment option</span><span>${t.plans ? t.plan.name : "Pay in full required"}</span></div></div>`).join("")}
      <div class="te-row sm te-fees"><span>Transaction fees:</span><b>${usd(FEE)}</b></div>
      ${teBtn(`Pay ${usd(o.due)} and register`, "co-pay", { full:true })}
      <p class="te-secure">${ico("lock", 12)}Secure checkout powered by LeagueApps</p>
    </aside></div>
    ${c.modal ? coModal() : ""}`;
  }
  function coModal(){
    const c = TE.data.c, o = coOrder(c.draft), sp = o.list[0], su = o.list[1];
    const table = p => { const sc = coSched(sp.reg, p.n);
      return `<table class="te-table sched"><thead><tr><th>#</th><th>Amount due</th><th>Date due</th></tr></thead><tbody>${sc.map((r, i) => `<tr><td>${i + 1}</td><td>${r.pct}% (${usd(r.amt)})</td><td>${r.due}</td></tr>`).join("")}</tbody></table>`; };
    return `<div class="te-scrim" data-a="co-plan-x"></div><div class="te-modal" role="dialog" aria-modal="true" aria-labelledby="te-mh"><header><h4 id="te-mh">Payment terms</h4><button type="button" class="te-x" data-a="co-plan-x" aria-label="Close" data-autofocus>${ico("x", 20)}</button></header>
      <div class="te-m-body">
        <fieldset class="te-terms"><legend><b>Spring Classic</b><b>${usd(sp.reg)}</b></legend>
          ${TE_PLANS.map(p => { const on = c.draft === p.id, det = c.det === p.id;
            return `<div class="te-term"><label class="te-radio"><input type="radio" name="te-plan" data-in="co-plan" value="${p.id}"${on ? " checked" : ""}><span class="te-dot" aria-hidden="true"></span><span>${p.name}</span>${p.n > 1 ? `<span class="te-badge lbl">${p.n} payments</span>` : ""}</label>
              ${p.n > 1 ? `<button type="button" class="te-link sm" data-a="co-det:${p.id}" aria-expanded="${det}">${det ? "Hide details" : "View details"}${ico(det ? "up" : "down", 12)}</button>` : ""}</div>${det && p.n > 1 ? table(p) : ""}`; }).join("")}
          <p class="te-fine">Registration insurance is included in installments. Add-ons and transaction fees are paid today.</p>
        </fieldset>
        <fieldset class="te-terms"><legend><b>Summer Showcase</b><b>${usd(su.reg)}</b></legend>
          <p class="te-muted">Pay in full required. This tournament doesn't offer payment plans.</p></fieldset>
      </div>
      <footer><button type="button" class="te-link" data-a="co-plan-x">Cancel</button>${teBtn("Save", "co-plan-save")}</footer></div>`;
  }
  function coDone(o){
    const sp = o.list[0];
    return `${teHero("Confirmation", "")}<div class="te-page te-done"><div class="te-main">
      <h4 class="te-h big">Registration complete!</h4><p>You'll get a confirmation email shortly. If you have questions, contact the organizer.</p>
      <h5 class="te-sub">What's next?</h5><p>Your teams and payment schedule are on your dashboard. Team reps get an email to finish their rosters.</p>
      <div class="te-row-l">${teBtn("Visit dashboard", "co-dash")}<button type="button" class="te-link" data-a="co-restart">Start a new registration</button></div>
      ${TE.data.c.toast ? `<div class="te-snack" role="status">${ico("info", 18)}${TE.data.c.toast}</div>` : ""}</div>
    <aside class="te-card te-order"><div class="te-card-h"><b>Your order</b></div><div class="te-card-b">
      <div class="te-row big"><span>Paid today:</span><b>${usd(o.due)}</b></div><div class="te-row"><span>Total price:</span><span>${usd(o.total)}</span></div><hr class="te-rule">
      ${o.list.map(t => `<div class="te-row"><b>${t.name}:</b><b>${usd(t.today)}</b></div><div class="te-row sm"><span>Teams: ${t.teams}</span><span>${t.plans ? t.plan.name : "Paid in full"}</span></div>`).join("")}
      ${sp.plan.n > 1 ? `<hr class="te-rule"><h5 class="te-sub">Upcoming payments</h5><ul class="te-mini">${sp.sched.slice(1).map(r => `<li><span>${r.due}</span><span>${usd(r.amt)}</span></li>`).join("")}</ul>` : ""}
    </div></aside></div>`;
  }

  /* ---------- player and staff add-ons ---------- */
  const pAvail = (p, role) => !!TE.data.rules[p.id][role[0] + "a"];
  const pReq = (p, role) => pAvail(p, role) && !!TE.data.rules[p.id][role[0] + "r"];
  function pErrors(){
    const s = TE.data, role = s.p.role, out = [];
    TE_PROD.forEach(p => { const v = s.p.prod[p.id]; if((pReq(p, role) || (pAvail(p, role) && v.on)) && p.opts) Object.keys(p.opts).forEach(k => { if(!v[k]) out.push(`${p.id}:${k}`); }); });
    return out;
  }
  function pLines(){
    const s = TE.data, role = s.p.role;
    return TE_PROD.filter(p => pReq(p, role) || (pAvail(p, role) && s.p.prod[p.id].on)).map(p => {
      const v = s.p.prod[p.id], qty = pReq(p, role) ? 1 : v.qty, cost = p.price * qty, tax = p.tax ? r2(cost * TAX) : 0;
      return { p, v, qty, cost, tax, req:pReq(p, role) };
    });
  }
  function pView(){
    const s = TE.data, P = s.p, role = P.role, R = ROLE[role];
    const errs = P.tried ? pErrors() : [], lines = pLines();
    const total = r2(R.fee + lines.reduce((a, l) => a + l.cost + l.tax, 0));
    const req = TE_PROD.filter(p => pReq(p, role)), opt = TE_PROD.filter(p => pAvail(p, role) && !pReq(p, role));
    const fields = p => { const v = P.prod[p.id];
      return (p.opts ? Object.keys(p.opts).map(k => teSelect(`p-opt:${p.id}:${k}`, k, p.opts[k], v[k], errs.includes(`${p.id}:${k}`))).join("") : "") + (p.note ? teNote(`p-note:${p.id}`, v.note) : ""); };
    return `${teHero(R.title, TE_META)}
    <div class="te-page te-narrow"><div class="te-main">${teSteps(P_STEPS, 3, null)}
      <h4 class="te-h">Select your add-ons</h4>
      ${errs.length ? teBanner("error", "<b>Please fix the errors below before continuing.</b>") : ""}
      ${P.toast ? teBanner("success", P.toast) : ""}
      <h5 class="te-sub lg">Add-ons included in registration</h5>
      ${req.length ? req.map(p => `<div class="te-card te-pcard"><div class="te-card-b te-prod">${teThumb(p.icon)}<div class="te-prod-b"><p class="te-prod-n"><b>${p.name}</b></p><p class="te-price">${tePrice(p)}</p><p>${p.desc}</p><div class="te-prod-f">${fields(p)}</div></div></div></div>`).join("")
        : `<p class="te-muted">No add-ons are required for ${R.label.toLowerCase()}s.</p>`}
      <h5 class="te-sub lg">Optional add-ons</h5>
      ${opt.length ? opt.map(p => { const v = P.prod[p.id];
        return `<div class="te-card te-pcard"><div class="te-card-h"><b>${p.name}</b><span class="te-price">${tePrice(p)}</span></div><div class="te-card-b te-prod">${teThumb(p.icon)}<div class="te-prod-b"><p>${p.desc}</p>
          ${teCheck(`p-on:${p.id}`, `Add to my registration`, v.on)}
          ${v.on ? `<div class="te-prod-f">${fields(p)}${p.qty ? `<div class="te-field"><span class="te-flabel">Quantity</span>${pQty(p, v)}</div>` : ""}</div>` : ""}</div></div></div>`; }).join("")
        : `<p class="te-muted">No optional add-ons are offered to ${R.label.toLowerCase()}s.</p>`}
      <div class="te-float${P.tot ? " open" : ""}"><button type="button" class="te-float-h" data-a="p-tot" aria-expanded="${P.tot}"><b>Total: ${usd(total)}</b>${ico(P.tot ? "down" : "up", 16)}</button>
        ${P.tot ? `<div class="te-float-b"><div class="te-row sm"><span>Registration</span><b>${usd(R.fee)}</b></div>
          ${lines.map(l => `<div class="te-fl"><div class="te-row sm"><span>${l.p.name}${l.qty > 1 ? ` &times; ${l.qty}` : ""}</span><b>${l.cost ? usd(l.cost + l.tax) : "Included"}</b></div>
            ${[...Object.keys(l.p.opts || {}).map(k => l.v[k]).filter(Boolean)].length ? `<small>${Object.keys(l.p.opts).map(k => esc(l.v[k] || "")).filter(Boolean).join(", ")}</small>` : ""}
            ${l.tax ? `<small>Tax: + ${usd(l.tax)} (5%)</small>` : ""}
            ${!l.req ? `<div class="te-row-l">${l.p.qty ? pQty(l.p, l.v) : ""}<button type="button" class="te-ibtn sm" data-a="p-rm:${l.p.id}" aria-label="Remove ${l.p.name}">${ico("trash", 16)}</button></div>` : ""}</div>`).join("")}</div>` : ""}</div>
    </div></div>
    <div class="te-actions"><button type="button" class="te-link" data-a="p-reset">Cancel</button><span class="te-actions-r">${teBtn("Save and continue", "p-save")}</span></div>`;
  }
  const pQty = (p, v) => `<div class="te-qty" role="group" aria-label="${p.name} quantity"><button type="button" data-a="p-dec:${p.id}" aria-label="Decrease"${v.qty <= 1 ? " disabled" : ""}>${ico("minus", 14)}</button><span aria-live="polite">${v.qty}</span><button type="button" data-a="p-inc:${p.id}" aria-label="Increase"${v.qty >= 9 ? " disabled" : ""}>${ico("plus", 14)}</button></div>`;

  /* ---------- admin rules (Management Console) ---------- */
  const A_COLS = [["pa","Players","Available"],["pr","Players","Required"],["sa","Staff","Available"],["sr","Staff","Required"]];
  function aView(){
    const R = TE.data.rules;
    const allOn = k => TE_PROD.every(p => R[p.id][k]), someOn = k => TE_PROD.some(p => R[p.id][k]);
    return `<div class="te-mc-head"><h3>Spring Classic</h3><p>E-commerce products</p></div>
    <div class="te-page te-narrow"><div class="te-main">
      <h4 class="te-h">Program assignments</h4>
      <p class="te-lede">Choose whether each product is available for purchase within this registration as an <b>optional add-on</b> or <b>required for registration</b>.</p>
      <div class="te-scroll"><table class="te-table te-rules"><thead>
        <tr><th rowspan="2" scope="col">Product</th><th colspan="2" scope="colgroup">Players</th><th colspan="2" scope="colgroup">Staff</th></tr>
        <tr>${A_COLS.map(([k, g, l]) => `<th scope="col"><span>${l}</span>${teCheck("a-col:" + k, "Select all", allOn(k), { indet:!allOn(k) && someOn(k), aria:`Select all: ${g} ${l.toLowerCase()}` })}</th>`).join("")}</tr></thead>
        <tbody>${TE_PROD.map(p => `<tr><th scope="row"><b>${p.name}</b><small>${p.price ? usd(p.price) + (p.tax ? " + tax" : "") : "No charge"}</small></th>
          ${A_COLS.map(([k, g, l]) => `<td>${teCheck(`a-rule:${p.id}:${k}`, "", !!R[p.id][k], { aria:`${p.name}: ${g} ${l.toLowerCase()}` })}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${teBanner("info", "Required products are always available, so checking <b>Required</b> also checks <b>Available</b>. Preview the registration to see your rules applied.")}
      <div class="te-row-l">${teBtn("Preview as player", "a-preview:player", { kind:"outlined" })}${teBtn("Preview as staff", "a-preview:staff", { kind:"outlined" })}</div>
    </div></div>`;
  }

  /* ---------- the original microcopy finding, in Fieldhouse ---------- */
  function cpView(){
    const old = !TE.data.fixed;
    const f = (l, v) => `<div class="te-field"><label>${l}</label><input value="${v}" readonly></div>`;
    return `${teHero("Register a Player", TE_META)}<div class="te-page"><div class="te-main">
      <div class="te-seg" role="group" aria-label="Label version"><button type="button" aria-pressed="${old}" data-a="fixed:0">Original labels</button><button type="button" aria-pressed="${!old}" data-a="fixed:1">Updated labels</button></div>
      <section class="te-card"><div class="te-card-h"><b>${old ? "Registrant information" : "Player information"}</b></div><div class="te-card-b te-form">
        ${f(old ? "First name" : "Player first name", old ? "Laura" : "Mia")}${f(old ? "Last name" : "Player last name", "Chen")}${f(old ? "Date of birth" : "Player date of birth", old ? "04/12/1984" : "06/03/2014")}
        ${old ? `<p class="te-help err">${ico("err", 14)}Birth date is outside the U12 age range.</p>` : `<p class="te-help ok">${ico("ok", 14)}Eligible for U12.</p>`}</div></section></div>
      <aside class="te-side"><div class="te-card"><div class="te-card-h"><b>What happened</b></div><div class="te-card-b">
        ${old ? `<p>Parents read "Registrant" as themselves and entered their own details where organizers expected the child's. The sample shows the typical mistake: an adult's birth date on a U12 roster.</p>`
              : `<p>Naming the player in every label removed the ambiguity. In testing, this one change nearly eliminated the error.</p>`}</div></div></aside></div>`;
  }

  /* ---------- frame, notes, events ---------- */
  function teNotes(){
    const s = TE.data, t = s.t, theme = "THEME: FIELDHOUSE MEMBER PORTAL";
    if(s.tab === "team"){
      const n = tCount(), log = [theme, `STEP ${t.step + 1} OF 4: ${T_STEPS[t.step].toUpperCase()}`, `TEAMS SELECTED: ${n}`, `CHECKOUTS SAVED: ${Math.max(0, n - 1)}`];
      if(t.step === 0) return notes("TEAM REGISTRATION", "Every returning team, one picker per division.", "Organizers used to register clubs' returning teams for them, because one checkout per team took too long. Each division card now has a multi-select of the club's teams with their team reps, a select-all row and a way to create a team without leaving the flow. The summary shows what the bench costs as it fills. Partner color carries the header and calls to action; progress, checkboxes and focus stay neutral blue-grey, per Fieldhouse.", log);
      if(t.step === 1) return notes("ADD-ONS", "Required or optional, decided by the partner.", "Partners attach products to a registration as required (included or priced) or optional. Required items block Continue until their options are chosen. Optional items show their options only after they're added.", log.concat([`MISSING OPTIONS: ${tErrors().length}`]));
      if(t.step === 2) return notes("REGISTRATION INSURANCE", "A deliberate choice, not a pre-checked box.", "Insurance is offered as two equal tiles with the price shown up front. Neither is selected by default, so the club decides on purpose.", log.concat([`INSURANCE: ${t.ins ? t.ins.toUpperCase() : "NOT CHOSEN"}`]));
      return notes("REVIEW", "One look before money changes hands.", "Each section links back to its step, and divisions collapse so a club registering a dozen teams can still scan the total.", log);
    }
    if(s.tab === "checkout"){
      const o = coOrder(), sp = o.list[0];
      return notes("CHECKOUT", "Payment terms per tournament, discounts that explain themselves.", "A cart can hold several tournaments, and each partner decides which payment plans it allows, up to 12 installments. Registrants choose terms per tournament in one modal; a tournament that requires full payment says so instead of hiding the choice. Codes stack across tournaments but not within one, and the field says why a code didn't apply. Try SPRING10, SPRING5 or SUMMER50.",
        [theme, `SPRING CLASSIC: ${sp.plan.name.toUpperCase()}${sp.plan.n > 1 ? ` (${sp.plan.n})` : ""}`, `DUE TODAY: ${usd(o.due)}`, `TOTAL: ${usd(o.total)}`, `CODES: ${s.c.codes.join(", ") || "NONE"}`, `AUTOPAY REQUIRED: ${sp.plan.n > 1 ? "YES" : "NO"}`]);
    }
    if(s.tab === "player"){
      const role = s.p.role, lines = pLines();
      return notes("PLAYER AND STAFF ADD-ONS", "Same products, different rules per role.", "Partners set up each product once and decide, for players and staff separately, whether it's available or required. Required add-ons with options must be completed before continuing, and the error banner and inline messages say exactly what's missing. The total follows you down the page.",
        [theme, `ROLE: ${role.toUpperCase()}`, `REQUIRED: ${TE_PROD.filter(p => pReq(p, role)).length}`, `OPTIONAL ADDED: ${lines.filter(l => !l.req).length}`, `MISSING OPTIONS: ${pErrors().length}`]);
    }
    if(s.tab === "admin"){
      const R = s.rules, c = k => TE_PROD.filter(p => R[p.id][k]).length;
      return notes("ADMIN RULES", "The rules behind the registration.", "In the Management Console, administrators decide where a product appears: as an optional add-on or required for registration, for players and staff separately. Required implies available, so the matrix enforces it. The shipped screen assigns one product across many programs; this demo flips the axis to show every product for one tournament.",
        ["THEME: FIELDHOUSE MANAGEMENT CONSOLE", `PLAYERS: ${c("pa")} AVAILABLE, ${c("pr")} REQUIRED`, `STAFF: ${c("sa")} AVAILABLE, ${c("sr")} REQUIRED`]);
    }
    notes("MICROCOPY", "One label, one error class gone.", "Moderated testing showed parents entering their own information in fields meant for their child. Changing the labels fixed it without changing the flow.", [s.fixed ? "LABELS: PLAYER-SPECIFIC" : "LABELS: AMBIGUOUS"]);
  }
  function teRender(){
    const s = TE.data;
    const tabs = [["team","Team registration"],["checkout","Checkout"],["player","Player & staff add-ons"],["admin","Admin rules"],["copy","Form microcopy"]];
    const view = { team:tView, checkout:coView, player:pView, admin:aView, copy:cpView }[s.tab]();
    const sub = s.tab === "player" ? `<div class="dm-subbar"><span class="dm-small" style="margin:0">Register as</span><div class="dm-seg" role="group" aria-label="Register as">
        ${Object.keys(ROLE).map(r => `<button type="button" aria-pressed="${s.p.role === r}" data-a="p-role:${r}">${ROLE[r].label}</button>`).join("")}</div></div>` : "";
    W.innerHTML = `<div class="app app-te${s.tab === "admin" ? " mgmt" : ""}" data-theme="${s.tab === "admin" ? "mgmt" : "member"}">
      <div class="dm-top"><span class="dm-brand">Tournament Registration <span>&middot; Fieldhouse &middot; demo</span></span>
        <div class="dm-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${s.tab === k}" data-a="tab:${k}">${l}</button>`).join("")}</div></div>
      ${sub}<div class="te-frame">${view}</div></div>`;
    tePlace();
    teNotes();
  }
  // Keep a modal inside the visible part of the demo window, wherever it's scrolled
  function tePlace(){
    const m = W.querySelector(".te-modal"); if(!m) return;
    const app = W.querySelector(".app-te").getBoundingClientRect(), w = W.getBoundingClientRect();
    const top = Math.max(w.top, 0), bottom = Math.min(w.bottom, innerHeight);
    m.style.top = (top - app.top + 16) + "px";
    m.style.maxHeight = Math.max(240, bottom - top - 32) + "px";
  }
  function teFocus(sel){
    const el = sel && W.querySelector(sel);
    if(el){ el.focus({ preventScroll:true }); return; }
    const m = W.querySelector(".te-modal [data-autofocus]"); if(m) m.focus();
  }
  const teTop = () => { const f = W.querySelector(".te-frame"); if(f) f.scrollIntoView({ block:"start" }); W.scrollTop = 0; };

  P.tournaments = {
    title:"TOURNAMENT.REGISTRATION",
    cases:[
      ["cart", "Register several teams in one checkout", [""]],
      ["review", "Review a team registration before checkout"],
      ["plan", "Build a payment plan and apply discount codes"],
      ["addons", "Choose required and optional add-ons as a player or staff member"],
      ["admin", "Set which add-ons are available or required"],
      ["copy", "Compare the original and updated labels"]
    ],
    hint:"TRY: PICK TEAMS IN A DIVISION, CHOOSE ADD-ONS, THEN CHECK OUT WITH A PAYMENT PLAN AND THE CODE SPRING10.",
    hints:{
      cart:"OPEN A DIVISION'S TEAM PICKER AND SELECT ALL TEAMS. THE SUMMARY TOTALS THE BENCH.",
      plan:"EDIT PAYMENT OPTIONS TO COMPARE PLANS, THEN TRY THE CODES SPRING10, SPRING5 AND SUMMER50.",
      copy:"SWITCH BETWEEN THE ORIGINAL AND UPDATED LABELS.",
      addons:"SAVE WITHOUT CHOOSING SIZES TO SEE THE ERRORS, THEN SWITCH TO STAFF.",
      admin:"CHANGE WHAT'S REQUIRED, THEN PREVIEW AS A PLAYER OR STAFF MEMBER."
    },
    init(scene){
      const s = TE.data = teSeed();
      if(scene === "plan"){ teFill(s.t); s.tab = "checkout"; s.c.plan = "p3"; }
      if(scene === "review"){ teFill(s.t); s.t.step = 3; }
      if(scene === "copy") s.tab = "copy";
      if(scene === "addons") s.tab = "player";
      if(scene === "admin") s.tab = "admin";
    },
    render(w, n){ W = w; N = n; teRender(); },
    action(a){
      const s = TE.data, t = s.t, c = s.c, i = a.indexOf(":"), cmd = i < 0 ? a : a.slice(0, i), x = i < 0 ? "" : a.slice(i + 1);
      let focus = `[data-a="${a}"]`, top = false;
      if(cmd !== "t-menu" && cmd !== "t-new") t.menu = null;
      if(cmd === "tab"){ s.tab = x; if(x === "checkout") coEnsure(); c.toast = ""; s.p.toast = ""; }
      else if(cmd === "t-menu") t.menu = t.menu === x ? null : x;
      else if(cmd === "t-new"){ const d = tDiv(x), n = t.extra[x].length + 1, id = `new${x}${n}`;
        t.extra[x].push({ id, name:`Riverside FC ${x} New ${n}`, rep:"Not assigned" }); t.sel[x].push(id); focus = `[data-in="t-team:${x}:${id}"]`; }
      else if(cmd === "t-view") t.view = x;
      else if(cmd === "t-view-x"){ focus = `[data-a="t-view:${t.view}"]`; t.view = null; }
      else if(cmd === "t-sum") t.sum[x] = !t.sum[x];
      else if(cmd === "t-rev") t.rev[x] = t.rev[x] === false;
      else if(cmd === "t-step"){ t.step = +x; t.tried = -1; top = true; }
      else if(cmd === "t-back"){ t.step = Math.max(0, t.step - 1); t.tried = -1; top = true; }
      else if(cmd === "t-next"){
        if(t.step === 1 && tErrors().length){ t.tried = 1; teRender(); teTop(); const f = W.querySelector('[aria-invalid="true"]'); if(f) f.focus({ preventScroll:true }); return; }
        if(t.step === 2 && !t.ins){ t.tried = 2; teRender(); const f = W.querySelector('[data-in="t-ins"]'); if(f) f.focus(); return; }
        t.step++; t.tried = -1; top = true;
      }
      else if(cmd === "t-cancel"){ s.t = teSeed().t; top = true; }
      else if(cmd === "t-checkout"){ s.tab = "checkout"; c.seeded = false; c.done = false; top = true; focus = '[data-a="tab:checkout"]'; }
      else if(cmd === "co-details") c.details = !c.details;
      else if(cmd === "co-plan"){ c.modal = true; c.draft = c.plan; c.det = c.plan === "full" ? null : c.plan; focus = null; }
      else if(cmd === "co-plan-x"){ c.modal = false; focus = '[data-a="co-plan"]'; }
      else if(cmd === "co-plan-save"){ c.plan = c.draft; c.modal = false; focus = '[data-a="co-plan"]'; }
      else if(cmd === "co-det") c.det = c.det === x ? null : x;
      else if(cmd === "co-apply"){
        const code = c.code.trim().toUpperCase(), def = TE_CODES[code], fees = coOrder().list.find(o => def && o.id === def.t);
        const cur = def && c.codes.find(k => TE_CODES[k].t === def.t);
        if(!def) c.msg = ["err", "We couldn't find that code. Check the spelling and try again."];
        else if(c.codes.includes(code)) c.msg = ["info", `${code} is already applied.`];
        else if(cur && coDiscOf(cur, fees.fees) >= coDiscOf(code, fees.fees)) c.msg = ["info", "Great news! You've already applied a higher discount, so there's no need to use this one."];
        else { if(cur) c.codes = c.codes.filter(k => k !== cur); c.codes.push(code); c.code = "";
          c.msg = ["ok", `${code} applied: ${def.label}${def.t === "spring" ? " on Spring Classic" : " on Summer Showcase"}.${cur ? ` It replaces ${cur}, a smaller discount.` : ""}`]; }
        focus = "#te-co-code";
      }
      else if(cmd === "co-unc"){ c.codes = c.codes.filter(k => k !== x); c.msg = ["info", `${x} removed.`]; focus = "#te-co-code"; }
      else if(cmd === "co-method"){ c.method = x === "none" ? null : x; focus = x === "none" ? '[data-a="co-method:bank"]' : '[data-a^="co-method:"]'; }
      else if(cmd === "co-goto"){ const map = { method:"#te-pm", autopay:'[data-in="co-autopay"]', agree:'[data-in="co-agree"]', name:"#te-co-name" };
        const el = W.querySelector(map[x]); if(el){ el.scrollIntoView({ block:"center" }); (el.matches("button,input") ? el : el.querySelector("button,input") || el).focus({ preventScroll:true }); } return; }
      else if(cmd === "co-pay"){
        c.tried = true;
        if(coMissing(coOrder()).length){ teRender(); teTop(); const b = W.querySelector(".te-banner.error .te-link"); if(b) b.focus({ preventScroll:true }); return; }
        c.done = true; top = true; focus = '[data-a="co-dash"]';
      }
      else if(cmd === "co-dash"){ c.toast = "Your dashboard lives in the real Member Portal. This demo ends here."; }
      else if(cmd === "co-restart"){ const keep = s.rules; TE.data = teSeed(); TE.data.rules = keep; top = true; focus = '[data-a="tab:team"]'; }
      else if(cmd === "p-role"){ s.p.role = x; s.p.tried = false; s.p.toast = ""; }
      else if(cmd === "p-tot") s.p.tot = !s.p.tot;
      else if(cmd === "p-inc" || cmd === "p-dec"){ const v = s.p.prod[x]; v.qty = Math.min(9, Math.max(1, v.qty + (cmd === "p-inc" ? 1 : -1))); }
      else if(cmd === "p-rm"){ s.p.prod[x].on = false; focus = '[data-a="p-tot"]'; }
      else if(cmd === "p-save"){
        s.p.tried = true;
        if(pErrors().length){ s.p.toast = ""; teRender(); teTop(); const f = W.querySelector('[aria-invalid="true"]'); if(f) f.focus({ preventScroll:true }); return; }
        s.p.toast = "<b>Add-ons saved.</b> Next: review your registration."; top = true;
      }
      else if(cmd === "p-reset"){ const keep = s.p.role; s.p = teSeed().p; s.p.role = keep; top = true; }
      else if(cmd === "a-preview"){ s.tab = "player"; s.p.role = x; s.p.tried = false; s.p.toast = ""; top = true; focus = `[data-a="p-role:${x}"]`; }
      else if(cmd === "fixed") s.fixed = x === "1";
      teRender();
      if(top) teTop();
      teFocus(focus);
    },
    input(el){
      const s = TE.data, t = s.t, k = el.dataset.in, parts = k.split(":"), cmd = parts[0];
      const sel = `[data-in="${k}"]`;
      if(cmd === "co-code"){ s.c.code = el.value; const b = W.querySelector('[data-a="co-apply"]'); if(b) b.disabled = !el.value.trim(); return; }
      if(cmd === "co-name"){ s.c.name = el.value; const g = W.querySelector("#te-sig"); if(g) g.textContent = el.value; return; }
      if(cmd === "t-note"){ t.add[parts[1]][parts[2]].note = el.value; return; }
      if(cmd === "p-note"){ s.p.prod[parts[1]].note = el.value; return; }
      if(cmd === "t-team"){ const [, d, id] = parts, cur = t.sel[d];
        t.sel[d] = el.checked ? (cur.includes(id) ? cur : cur.concat(id)) : cur.filter(v => v !== id); }
      else if(cmd === "t-all"){ const d = tDiv(parts[1]); t.sel[d.id] = el.checked ? tTeams(d).map(x => x.id) : []; }
      else if(cmd === "t-opt") t.add[parts[1]][parts[2]][parts[3]] = el.value;
      else if(cmd === "t-on") t.add[parts[1]][parts[2]].on = el.checked;
      else if(cmd === "t-ins") t.ins = el.value;
      else if(cmd === "co-plan") s.c.draft = el.value;
      else if(cmd === "co-autopay") s.c.autopay = el.checked;
      else if(cmd === "co-agree") s.c.agree = el.checked;
      else if(cmd === "p-opt") s.p.prod[parts[1]][parts[2]] = el.value;
      else if(cmd === "p-on"){ s.p.prod[parts[1]].on = el.checked; s.p.toast = ""; }
      else if(cmd === "a-rule"){ const [, id, col] = parts, r = s.rules[id], on = el.checked ? 1 : 0;
        r[col] = on; if(on && col[1] === "r") r[col[0] + "a"] = 1; if(!on && col[1] === "a") r[col[0] + "r"] = 0; }
      else if(cmd === "a-col"){ const col = parts[1], on = el.checked ? 1 : 0;
        TE_PROD.forEach(p => { const r = s.rules[p.id]; r[col] = on; if(on && col[1] === "r") r[col[0] + "a"] = 1; if(!on && col[1] === "a") r[col[0] + "r"] = 0; }); }
      else return;
      teRender();
      teFocus(sel);
    }
  };


  /* =====================================================================
     ARC SETTLEMENT: principles, not screens (the real UI is under NDA)
     Two parts:
       Customer question: answer one question across two tools (a settled archive and
         the current weekly cycle), then again with one lookup.
       Edit a refund: the rules for switching between full and partial refunds.
       Record: one fictional refund record shown raw, then clarified.
     ===================================================================== */
  const AR = { data:null };
  const AR_FIELDS = [
    ["TRNC","RFND","Transaction type","Refund"],
    ["DOCN","0371234567890","Document number","037 1234567890"],
    ["STAT","S","Status","Settled"],
    ["RPED","2026-01-14","Reporting period","Jan 8 to 14, 2026"],
    ["DAIS","2025-12-02","Original issue date","Dec 2, 2025"],
    ["FOP","CC","Paid with","Credit card"],
    ["TDAM","842.60","Ticket amount","$842.60"],
    ["TMFA","96.20","Taxes and fees","$96.20"],
    ["CPUI","F","Coupon status","Fully refunded"],
    ["COAM","0.00","Agency commission","$0.00"],
    ["AGTN","12345675","Agency code","12345675"],
    ["ALCD","XX","Airline","Example Air (XX)"],
    ["CJCP","N","Conjunction ticket","No"],
    ["AUTH","A1B2C3D4E5","Settlement authorization","A1B2C3D4E5"],
    ["RMKS","FULL RFND PER POLICY 7","Remarks","Full refund under fare policy"]
  ];
  const AR_KEY = ["TRNC","STAT","RPED","TDAM","FOP"];

  // ---- Customer question: fictional records in two systems ----
  const Q_ORIG = "0371234567890", Q_NEW = "0371234567999";
  const fmtDoc = d => d.slice(0,3) + " " + d.slice(3);
  // ARCHIVE: settled history. CYCLE: the open, current weekly cycle.
  const ARCHIVE = [
    { DOCN:"0371234561204", TRNC:"TKTT", STAT:"S", RPED:"2025-12-07", TDAM:"412.00", RMKS:"" },
    { DOCN:Q_ORIG,          TRNC:"TKTT", STAT:"S", RPED:"2025-12-07", TDAM:"842.60", RMKS:"EXCH TO " + Q_NEW },
    { DOCN:"0371234563318", TRNC:"RFND", STAT:"S", RPED:"2025-12-21", TDAM:"188.40", RMKS:"PART RFND" }
  ];
  const CYCLE = [
    { DOCN:"0371234569021", TRNC:"TKTT", STAT:"O", RPED:"2026-01-14", TDAM:"655.10", RMKS:"" },
    { DOCN:Q_NEW,           TRNC:"EXCH", STAT:"O", RPED:"2026-01-14", TDAM:"716.20", RMKS:"RES RFND 126.40 ORIG " + Q_ORIG },
    { DOCN:"0371234569377", TRNC:"RFND", STAT:"O", RPED:"2026-01-14", TDAM:"240.00", RMKS:"" }
  ];
  const ANSWERS = [
    ["settled", "Yes, the refund has gone through."],
    ["pending", "It's in progress and settles after the cycle closes Jan 14."],
    ["none", "There's no refund on file for this ticket."]
  ];
  const SYS = { ARCHIVE:{ name:"Archive", desc:"Settled history" }, CYCLE:{ name:"Current cycle", desc:"Open for edits this week" } };
  const Q_SEED = () => ({ mode:"legacy", sys:"ARCHIVE", q:"", hits:null, clip:"", steps:0, switches:0, copies:0,
    foundOrig:false, foundNew:false, answer:"", wrong:0, clearQ:fmtDoc(Q_ORIG), clearDone:false, legacyScore:null });

  function qLegacy(q){
    const res = q.hits === null ? "" : q.hits.length
      ? `<table class="dm-table mono ar-res"><thead><tr><th>DOCN</th><th>TRNC</th><th>STAT</th><th>RPED</th><th>TDAM</th><th>RMKS</th></tr></thead><tbody>${q.hits.map(r =>
          `<tr><td><button type="button" class="ar-doc" data-a="copy:${r.DOCN}" aria-label="Copy document number ${fmtDoc(r.DOCN)}">${r.DOCN}</button></td><td>${r.TRNC}</td><td>${r.STAT}</td><td>${r.RPED}</td><td>${r.TDAM}</td><td>${r.RMKS.replace(/(\d{13})/g, d => `<button type="button" class="ar-doc" data-a="copy:${d}" aria-label="Copy document number ${fmtDoc(d)}">${d}</button>`)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="ar-none">NO RECORD FOUND IN ${SYS[q.sys].name.toUpperCase()}</p>`;
    return `
      <div class="ar-sys" role="group" aria-label="System">
        ${Object.keys(SYS).map(k => `<button type="button" aria-pressed="${q.sys === k}" data-a="sys:${k}"><b>${SYS[k].name.toUpperCase()}</b><span>${SYS[k].desc}</span></button>`).join("")}
      </div>
      <div class="ar-term">
        <form class="ar-search" data-form="search" onsubmit="return false">
          <label for="ar-q">${q.sys} &gt; DOCN</label>
          <input id="ar-q" data-in="q" value="${esc(q.q)}" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="13-digit document number">
          <button type="button" class="dm-btn sm" data-a="paste" ${q.clip ? "" : "disabled"}>Paste${q.clip ? " " + q.clip.slice(-4) : ""}</button>
          <button type="button" class="dm-btn sm primary" data-a="search">Search</button>
        </form>
        ${res}
        <p class="dm-small">Click any document number to copy it. ${q.clip ? `Clipboard: ${q.clip}` : "Clipboard is empty."}</p>
      </div>`;
  }
  function qClear(q){
    const done = q.clearDone;
    return `
      <form class="ar-search plain" onsubmit="return false">
        <label for="ar-cq">Ticket or document number</label>
        <input id="ar-cq" data-in="clearQ" value="${esc(q.clearQ)}" autocomplete="off" spellcheck="false">
        <button type="button" class="dm-btn sm primary" data-a="clearsearch">Look up</button>
      </form>
      ${done ? `<ol class="ar-timeline">
        <li><span class="pill ok">Settled</span><b>Original ticket</b> 037 1234567890 &middot; $842.60 &middot; issued Dec 2, settled Dec 7</li>
        <li><span class="pill pend">In progress</span><b>Exchanged</b> for 037 1234567999 &middot; $716.20 &middot; current weekly cycle</li>
        <li><span class="pill pend">In progress</span><b>Refund of the difference</b> &middot; $126.40 &middot; settles when the cycle closes Jan 14</li>
      </ol>
      <div class="ar-share"><h5>Suggested reply</h5><p class="ar-quote" id="ar-share">Your exchange went through, and the $126.40 difference is being refunded to your original card. It will settle after January 14.</p>
        <button type="button" class="dm-btn sm" data-a="copy-share">Copy reply</button> <span class="dm-small" role="status">${AR.data.copied ? "Copied." : ""}</span></div>` : ""}`;
  }
  function arQuestion(){
    const q = AR.data.q;
    const answered = q.answer === "pending";
    return `<div class="ar-ask">
        <span class="lbl-sm">Customer on the phone</span>
        <p>&ldquo;I exchanged my ticket last week. Has the refund for the price difference gone through? My ticket number is <b>037 1234567890</b>.&rdquo;</p>
      </div>
      <div class="dm-row" style="margin:0 0 14px">
        <div class="dm-seg" role="group" aria-label="Approach">
          <button type="button" aria-pressed="${q.mode === "legacy"}" data-a="mode:legacy">Two tools (legacy)</button>
          <button type="button" aria-pressed="${q.mode === "clear"}" data-a="mode:clear">One lookup</button></div>
        <div class="ar-count" aria-live="polite">
          ${q.mode === "legacy"
            ? `<span><b>${q.steps}</b> step${q.steps === 1 ? "" : "s"}</span><span><b>${q.switches}</b> system switch${q.switches === 1 ? "" : "es"}</span><span><b>${q.copies}</b> number${q.copies === 1 ? "" : "s"} copied by hand</span>`
            : `<span><b>${q.clearDone ? 1 : 0}</b> step${q.clearDone ? "" : "s"}</span><span><b>0</b> system switches</span><span><b>0</b> numbers copied by hand</span>`}
        </div>
      </div>
      ${q.mode === "legacy" ? qLegacy(q) : qClear(q)}
      ${q.mode === "legacy" ? `<div class="ar-answer">
        <h5>What do you tell the customer?</h5>
        <div class="dm-row">${ANSWERS.map(([k,t]) => `<button type="button" class="dm-btn ${q.answer === k ? (k === "pending" ? "primary" : "") : ""}" data-a="answer:${k}" ${answered ? "disabled" : ""}>${t}</button>`).join("")}</div>
        ${q.answer && !answered ? `<p class="dm-warn">That's not what the records show. Keep digging: the exchange may have created a new document.</p>` : ""}
        ${answered ? `<p class="ar-done">Correct, in <b>${q.steps}</b> step${q.steps === 1 ? "" : "s"} with <b>${q.switches}</b> system switch${q.switches === 1 ? "" : "es"}${q.wrong ? ` and ${q.wrong} wrong answer${q.wrong > 1 ? "s" : ""}` : ""}. <button type="button" class="dm-link" data-a="mode:clear">Now try it with one lookup.</button></p>` : ""}
      </div>` : ""}`;
  }
  function arRecord(){
    const s = AR.data, f = k => AR_FIELDS.find(x => x[0] === k);
    if(s.view === "legacy") return `<div class="dm-row" style="margin:0 0 12px">${arRecordSeg()}</div>
      <div class="ar-term ar-legacy"><p class="dm-small">Every field, raw codes, no hierarchy.</p>
      <table class="dm-table mono"><tbody>${AR_FIELDS.map(([c,v]) => `<tr><th scope="row">${c}</th><td>${v}</td></tr>`).join("")}</tbody></table></div>`;
    const share = `Refund for ticket 037 1234567890 (Example Air): $842.60 to the original credit card. Status: settled in the Jan 8 to 14, 2026 reporting period.`;
    return `<div class="dm-row" style="margin:0 0 12px">${arRecordSeg()}</div>
      <div class="ar-card">
        <div class="ar-head"><span class="pill ok">${f("STAT")[3]}</span><b>${f("TRNC")[3]} &middot; ${f("TDAM")[3]}</b></div>
        <dl class="ar-dl">${AR_KEY.slice(2).map(k => { const x = f(k); return `<dt>${x[2]}</dt><dd>${x[3]}</dd>`; }).join("")}
          <dt>Document</dt><dd>${f("DOCN")[3]}</dd></dl>
        <p class="dm-small">Settled means the airline has been paid and the refund is final for this reporting period.</p>
        <button type="button" class="dm-link" data-a="more" aria-expanded="${s.more}">${s.more ? "Hide" : "Show"} all ${AR_FIELDS.length} fields</button>
        ${s.more ? `<table class="dm-table"><tbody>${AR_FIELDS.map(([c,,l,v]) => `<tr><th scope="row">${l} <span class="code">${c}</span></th><td>${v}</td></tr>`).join("")}</tbody></table>` : ""}
      </div>
      <div class="ar-share"><h5>Share with customer</h5><p class="ar-quote" id="ar-share">${share}</p>
        <button type="button" class="dm-btn sm" data-a="copy-share">Copy summary</button> <span class="dm-small" role="status">${s.copied ? "Copied." : ""}</span></div>`;
  }
  const arRecordSeg = () => `<div class="dm-seg ar-recseg" role="group" aria-label="Record view">
      <button type="button" aria-pressed="${AR.data.view === "legacy"}" data-a="view:legacy">Legacy view</button>
      <button type="button" aria-pressed="${AR.data.view === "clear"}" data-a="view:clear">Clarified view</button></div>`;

  // ---- Edit a refund: two steps (segments, then details), following the real flow ----
  // Full vs partial is set by the segments selected. Changing segments after editing
  // follows four rules; the "even amount on a partial" check happens at confirmation.
  const E_SEGS = [
    { n:1, from:"DCA", to:"ORD", dep:"Jan 9, 8:30 AM", flt:"XX 300", cls:"Y", basis:"Y26NR" },
    { n:2, from:"ORD", to:"DCA", dep:"Jan 12, 6:15 PM", flt:"XX 311", cls:"Y", basis:"Y26NR" }];
  const E_TAXES = [["US","U.S. transportation tax"],["ZP","Flight segment fee"],["AY","Security fee"],["XF","Facility charge"]];
  const E_FULL = { fare:746.40, US:56.00, ZP:9.60, AY:11.20, XF:19.40, fee:0 };
  const E_ZERO = { fare:0, US:0, ZP:0, AY:0, XF:0, fee:0 };
  const E_SEED = () => ({ step:1, segs:[true,true], applied:null, v:{ ...E_ZERO }, base:{ ...E_ZERO }, dialog:null, submitted:false, rule:"" });
  const eType = e => e.segs.every(Boolean) ? "full" : "partial";
  const eEdited = e => Object.keys(E_FULL).some(k => Math.abs(e.v[k] - e.base[k]) > 0.004);
  const eTax = v => E_TAXES.reduce((t,[c]) => t + v[c], 0);
  const eTotal = e => Math.max(0, e.v.fare + eTax(e.v) - e.v.fee);
  const E_FULL_TOTAL = E_FULL.fare + eTax(E_FULL) - E_FULL.fee;
  const m2 = n => "$" + n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
  const eFill = (e, src, type) => { e.v = { ...src }; e.base = { ...src }; e.applied = type; };

  function arEdit(){
    const e = AR.data.e, t = eType(e), n = e.segs.filter(Boolean).length;
    const money$ = (k, label, id) => `<span class="ed-money">$<input type="number" step="0.01" min="0" data-in="e:${k}" value="${e.v[k].toFixed(2)}" aria-label="${label}"${id ? ` id="${id}"` : ""}></span>`;
    const stepper = `<ol class="rf-stepper" aria-label="Progress">
        <li class="${e.step === 1 ? "on" : "done"}" ${e.step === 1 ? 'aria-current="step"' : ""}><i>1</i>Segments</li>
        <li class="${e.step === 2 ? "on" : ""}" ${e.step === 2 ? 'aria-current="step"' : ""}><i>2</i>Details</li></ol>`;
    let body, foot;
    if(e.submitted){
      body = `<div class="rf-sec"><p class="ar-done" role="status">Refund submitted for review: ${m2(eTotal(e))} as a ${t} refund. Refunds are subject to carrier audit.</p></div>`;
      foot = `<span></span><button type="button" class="dm-btn primary" data-a="ereset">Start another refund</button>`;
    } else if(e.step === 1){
      body = `<div class="rf-sec"><div class="rf-row"><span class="dm-small">${n === 2 ? "All segments selected: <b>full refund</b>" : n === 1 ? "Some segments selected: <b>partial refund</b>" : "Select at least one segment"}</span>
          <button type="button" class="dm-link" data-a="eall">${n ? "Deselect all" : "Select all"}</button></div>
        <div class="rf-segs">${E_SEGS.map((s,i) => `<button type="button" class="rf-seg" aria-pressed="${e.segs[i]}" data-a="eseg:${i}">
          <span class="rf-seg-h">${s.n} &nbsp;|&nbsp; ${s.from} &mdash; ${s.to}</span>
          <span class="rf-seg-b"><b>Departs ${s.dep}</b><small>on ${s.flt}</small>
          <span class="rf-kv"><span>Class</span><span>${s.cls}</span></span><span class="rf-kv"><span>Fare basis</span><span>${s.basis}</span></span></span></button>`).join("")}</div></div>`;
      foot = `<button type="button" class="dm-btn" data-a="ereset">Cancel</button><button type="button" class="dm-btn primary" data-a="econt" ${n ? "" : "disabled"}>Continue</button>`;
    } else {
      body = `<div class="rf-sec"><div class="rf-fin">
          <div class="rf-col">
            <label class="ed-field"><span>Base fare</span>${money$("fare","Base fare")}</label>
            <div class="rf-ro"><span>Tax total</span><b id="ed-tax">${m2(eTax(e.v))}</b></div>
            <div class="rf-ro"><span>Total (fare + taxes)</span><b id="ed-sum">${m2(e.v.fare + eTax(e.v))}</b></div>
            <label class="ed-field"><span>Admin / penalty fee</span>${money$("fee","Admin or penalty fee")}</label>
            <div class="rf-ro big"><span>Refund total</span><b id="ed-total">${m2(eTotal(e))}</b></div>
          </div>
          <fieldset class="rf-taxes"><legend>Taxes</legend>
            ${E_TAXES.map(([c,l]) => `<label class="rf-tax"><span class="rf-code" title="${l}">${c}</span><span class="rf-tl">${l}</span>${money$(c, c + " " + l)}</label>`).join("")}
          </fieldset></div>
        <p class="dm-small">${(e.applied || t) === "full" ? "Full refund: amounts come from the full document." : "Partial refund: enter what's being refunded for the selected segment."} <span id="ed-state" class="pill ${eEdited(e) ? "draft" : ""}">${eEdited(e) ? "Edited" : "Not edited"}</span></p></div>`;
      foot = `<button type="button" class="dm-btn" data-a="ereset">Cancel</button><span class="dm-row" style="margin:0"><button type="button" class="dm-btn" data-a="eback">Back</button><button type="button" class="dm-btn primary" data-a="esubmit">Submit</button></span>`;
    }
    let dlg = "";
    if(e.dialog === "update") dlg = `<div class="dm-scrim"></div><div class="ed-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ed-dt" aria-describedby="ed-dd">
        <h5 id="ed-dt">Are you sure you want to update the data?</h5>
        <p id="ed-dd">By changing the segments selected, any financial data you have entered will be replaced by the document's full financial details.</p>
        <div class="dm-row"><button type="button" class="dm-btn danger" data-a="eupdate">Update data</button><button type="button" class="dm-btn" data-a="ecancel" data-autofocus>Cancel</button></div></div>`;
    if(e.dialog === "confirm"){
      const even = t === "partial" && Math.abs(eTotal(e) - E_FULL_TOTAL) < 0.005;
      dlg = `<div class="dm-scrim"></div><div class="ed-dialog wide" role="dialog" aria-modal="true" aria-labelledby="ed-dt">
        <h5 id="ed-dt">Confirm refund details</h5>
        <p class="dm-small">Document 037 1234567890 &middot; ${t === "full" ? "Full" : "Partial"} refund &middot; segment${n > 1 ? "s" : ""} ${E_SEGS.filter((s,i) => e.segs[i]).map(s => s.n).join(", ")}</p>
        ${even ? `<p class="dm-warn" role="alert">The refund amount is even, but you selected a partial refund. Please check your figures.</p>` : ""}
        <dl class="ar-dl"><dt>Base fare</dt><dd>${m2(e.v.fare)}</dd><dt>Tax total</dt><dd>${m2(eTax(e.v))}</dd><dt>Admin / penalty fee</dt><dd>${m2(e.v.fee)}</dd><dt>Refund total</dt><dd><b>${m2(eTotal(e))}</b></dd></dl>
        <div class="dm-row"><button type="button" class="dm-btn primary" data-a="econfirm" ${even ? "" : "data-autofocus"}>Yes, confirm</button><button type="button" class="dm-btn" data-a="eedit" ${even ? "data-autofocus" : ""}>No, continue editing</button></div>
        <p class="dm-small">Refund is subject to carrier audit.</p></div>`;
    }
    return `<div class="ed-wrap rf">
      <div class="rf-panel">
        <div class="rf-title">Refund document</div>
        <div class="rf-doc"><b>037 1234567890</b><span>Example Air &nbsp;|&nbsp; Settled Jan 14</span></div>
        <div class="rf-head"><h4 tabindex="-1">${e.submitted ? "Submitted" : e.step === 1 ? "Step 1: Choose segments to refund" : "Step 2: Add details"}</h4>${stepper}</div>
        ${body}
        <div class="rf-foot">${foot}</div>
      </div>${dlg}</div>`;
  }
  function eContinue(){
    const e = AR.data.e, t = eType(e), edited = eEdited(e);
    if(!e.applied){ eFill(e, t === "full" ? E_FULL : E_ZERO, t); e.rule = t === "full" ? "FULL REFUND: FULL-DOCUMENT FINANCIALS FILLED" : "PARTIAL REFUND: AGENT ENTERS FINANCIALS"; }
    else if(e.applied === "full" && t === "partial"){ e.applied = "partial"; e.rule = edited ? "FULL TO PARTIAL, EDITS: DATA UNCHANGED, CONFIRM AS USUAL" : "FULL TO PARTIAL, NO EDITS: DATA UNCHANGED, FLAGGED AT CONFIRM"; }
    else if(e.applied === "partial" && t === "full"){
      if(edited){ e.dialog = "update"; e.rule = "PARTIAL TO FULL, EDITS: WARN BEFORE REPLACING"; e.step = 2; return; }
      eFill(e, E_FULL, "full"); e.rule = "PARTIAL TO FULL, NO EDITS: FULL DETAILS POPULATED";
    }
    e.step = 2;
  }
  function eNotes(){
    const e = AR.data.e;
    notes("EDITING RULES","Never lose an agent's work without telling them.","Full or partial is set by the segments an agent selects. When they go back and change segments after entering figures, four rules decide what happens: going to partial leaves the figures alone, going to full fills the full-document figures, and only if the agent had edited them are they asked first. A partial refund that still matches the full amount is flagged at confirmation.",
      [`TYPE: ${eType(e).toUpperCase()} (${e.segs.filter(Boolean).length} OF 2 SEGMENTS)`, `EDITED: ${eEdited(e) ? "YES" : "NO"}`, e.rule || "NO STEP TAKEN YET", "Fictional data. Flow and rules follow the original design; screens are restyled."]);
  }


  function arRender(){
    const s = AR.data, q = s.q;
    W.innerHTML = `<div class="app app-arc">
      <div class="dm-top"><span class="dm-brand">Settlement Tools <span>&middot; fictional data &middot; demo</span></span>
        <div class="dm-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="${s.tab === "question"}" data-a="tab:question">Customer question</button>
          <button type="button" role="tab" aria-selected="${s.tab === "edit"}" data-a="tab:edit">Edit a refund</button>
          <button type="button" role="tab" aria-selected="${s.tab === "record"}" data-a="tab:record">Record</button></div></div>
      <div class="arc-band" aria-hidden="true"></div>
      <div class="dm-body ar-body">${s.tab === "question" ? arQuestion() : s.tab === "edit" ? arEdit() : arRecord()}</div></div>`;
    const enter = (sel, act) => { const el = W.querySelector(sel); if(el) el.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); P.arc.action(act); } }); };
    enter("#ar-q", "search"); enter("#ar-cq", "clearsearch");
    const NDA = "Fictional data and illustrative screens; ARC's actual tools are confidential.";
    if(s.tab === "edit"){ eNotes(); const af = W.querySelector('.ed-dialog [data-autofocus]'); if(af) af.focus(); return; }
    if(s.tab === "question" && q.mode === "legacy")
      notes("TWO TOOLS","One question, two tools, numbers matched by hand.","Agents kept the settled archive and the current-cycle tool open side by side, cross-referenced document numbers by hand, and patched the gaps with screenshots and spreadsheets. An exchange creates a new document, so the answer lives in a different tool from the ticket the customer quotes.",
        [`STEPS: ${q.steps}`, `SYSTEM SWITCHES: ${q.switches}`, `NUMBERS COPIED: ${q.copies}`, q.foundOrig ? "ORIGINAL FOUND IN ARCHIVE" : "ORIGINAL: NOT YET FOUND", q.foundNew ? "EXCHANGE FOUND IN CURRENT CYCLE" : "EXCHANGE: NOT YET FOUND", NDA]);
    else if(s.tab === "question")
      notes("ONE LOOKUP","Search once, see the whole story.","One search by document number follows the exchange chain, says what each step means in plain language, and drafts the reply agents were assembling from screenshots. This mirrors the document lookup I designed, which launched after I left ARC.",
        [`STEPS: ${q.clearDone ? 1 : 0}`, "SYSTEM SWITCHES: 0", q.legacyScore ? `LEGACY RUN: ${q.legacyScore.steps} STEPS, ${q.legacyScore.switches} SWITCH${q.legacyScore.switches === 1 ? "" : "ES"}` : "TRY THE LEGACY RUN TO COMPARE", NDA]);
    else if(s.view === "legacy") notes("LEGACY","Completeness was the problem.","Dense, unfiltered data led to more errors under time pressure. Fifteen codes, and the three facts an agent needs aren't distinguishable from the rest.", ["FIELDS SHOWN: 15", "PLAIN-LANGUAGE LABELS: 0", NDA]);
    else notes("CLARIFIED","Clarity over completeness. Language is part of the UX.","The record leads with what agents verify most: what happened, whether it's final, and when. Every code gets a plain-language label, the full record stays one click away, and a shareable summary replaces the screenshots agents were already sending.", [`FIELDS SHOWN: ${s.more ? 15 : 5}`, "CODES TRANSLATED: 15", NDA]);
  }

  function arSearch(){
    const q = AR.data.q, needle = q.q.replace(/\D/g, "");
    q.steps++;
    const rows = q.sys === "ARCHIVE" ? ARCHIVE : CYCLE;
    q.hits = needle.length >= 4 ? rows.filter(r => r.DOCN.includes(needle) || r.RMKS.includes(needle)) : [];
    if(q.sys === "ARCHIVE" && q.hits.some(r => r.DOCN === Q_ORIG)) q.foundOrig = true;
    if(q.sys === "CYCLE" && q.hits.some(r => r.DOCN === Q_NEW)) q.foundNew = true;
  }

  P.arc = {
    title:"SETTLEMENT.TOOLS",
    cases:[
      ["reconcile", "Answer a customer question across two tools", [""]],
      ["lookup", "Look up a ticket and follow its exchange chain"],
      ["edit", "Change segments on a refund"],
      ["legacy", "Read a raw settlement record"],
      ["clear", "See the clarified record"],
      ["terms", "See every code in plain language"],
      ["share", "Copy a customer-ready summary"]
    ],
    hint:"ANSWER THE CUSTOMER USING BOTH TOOLS. THEN TRY IT WITH ONE LOOKUP.",
    hints:{
      reconcile:"FIND THE CUSTOMER'S TICKET IN THE ARCHIVE, FOLLOW THE EXCHANGE INTO THE CURRENT CYCLE, THEN ANSWER. STEPS ARE COUNTED.",
      lookup:"LOOK UP THE CUSTOMER'S TICKET ONCE. THE EXCHANGE AND REFUND COME WITH IT.",
      edit:"PICK SEGMENTS, CONTINUE, EDIT A FIGURE. THEN GO BACK, CHANGE THE SEGMENTS AND SUBMIT. WATCH WHEN YOU'RE ASKED AND WHEN YOU'RE FLAGGED.",
      legacy:"FIND THE STATUS, AMOUNT AND REPORTING PERIOD. THEN SWITCH TO THE CLARIFIED VIEW.",
      clear:"THE THREE FACTS AGENTS VERIFY MOST COME FIRST. THE FULL RECORD IS ONE CLICK AWAY.",
      terms:"EVERY CODE NOW HAS A PLAIN-LANGUAGE LABEL, WITH THE ORIGINAL CODE BESIDE IT.",
      share:"COPY THE SUMMARY AGENTS CAN SEND TO A CUSTOMER INSTEAD OF A SCREENSHOT."
    },
    init(scene){
      const recordScene = ["legacy","clear","terms","share"].includes(scene);
      AR.data = { tab:recordScene ? "record" : scene === "edit" ? "edit" : "question", view:scene === "legacy" || !recordScene ? "legacy" : "clear",
                  more:scene === "terms", copied:false, q:Q_SEED(), e:E_SEED() };
      if(scene === "lookup") AR.data.q.mode = "clear";
    },
    render(w,n){ W = w; N = n; arRender(); },
    action(a){
      const s = AR.data, q = s.q, i = a.indexOf(":"), cmd = i < 0 ? a : a.slice(0,i), x = i < 0 ? "" : a.slice(i+1);
      s.copied = false;
      if(cmd === "tab") s.tab = x;
      else if(cmd === "view") s.view = x;
      else if(cmd === "more") s.more = !s.more;
      else if(cmd === "mode"){ if(x === "clear" && q.answer === "pending") q.legacyScore = { steps:q.steps, switches:q.switches }; q.mode = x; }
      else if(cmd === "sys"){ if(q.sys !== x){ q.sys = x; q.switches++; q.steps++; q.hits = null; q.q = ""; } }
      else if(cmd === "copy"){ q.clip = x; q.copies++; q.steps++; }
      else if(cmd === "paste"){ if(q.clip){ q.q = q.clip; q.steps++; } }
      else if(cmd === "search") arSearch();
      else if(cmd === "answer"){ q.answer = x; q.steps++; if(x !== "pending") q.wrong++; else q.legacyScore = { steps:q.steps, switches:q.switches }; }
      else if(cmd === "clearsearch"){ q.clearDone = q.clearQ.replace(/\D/g, "").includes("1234567890") || q.clearQ.replace(/\D/g, "").includes("1234567999"); }
      else if(cmd === "eseg"){ s.e.segs[+x] = !s.e.segs[+x]; }
      else if(cmd === "eall"){ const any = s.e.segs.some(Boolean); s.e.segs = s.e.segs.map(() => !any); }
      else if(cmd === "econt") eContinue();
      else if(cmd === "eback") s.e.step = 1;
      else if(cmd === "eupdate"){ eFill(s.e, E_FULL, "full"); s.e.dialog = null; s.e.rule = "UPDATED: EDITS DISREGARDED, FULL DETAILS POPULATED"; }
      else if(cmd === "ecancel"){ s.e.dialog = null; s.e.step = 1; s.e.rule = "CANCELLED: FIGURES KEPT, BACK TO SEGMENTS"; }
      else if(cmd === "esubmit") s.e.dialog = "confirm";
      else if(cmd === "eedit") s.e.dialog = null;
      else if(cmd === "econfirm"){ s.e.dialog = null; s.e.submitted = true; s.e.rule = "SUBMITTED"; }
      else if(cmd === "ereset") s.e = E_SEED();
      else if(cmd === "copy-share"){
        const t = W.querySelector("#ar-share").textContent;
        try{ navigator.clipboard.writeText(t).then(() => { s.copied = true; arRender(); }, () => {}); }catch(e){}
      }
      arRender();
      const f = W.querySelector(`[data-a="${a}"]`) || (cmd === "search" || cmd === "paste" ? W.querySelector("#ar-q") : null);
      if(f && !f.disabled && !W.querySelector('.ed-dialog')) f.focus();
      else if(s.tab === "edit" && !W.querySelector('.ed-dialog') && !W.contains(document.activeElement)){ const h = W.querySelector('.rf-head h4'); if(h) h.focus(); }
    },
    input(el){
      const s = AR.data, k = el.dataset.in;
      if(k === "q") s.q.q = el.value;
      if(k === "clearQ") s.q.clearQ = el.value;
      if(k.startsWith("e:")){
        const v = parseFloat(el.value); s.e.v[k.slice(2)] = isNaN(v) ? 0 : v;
        const e = s.e, set = (id, v) => { const n = W.querySelector(id); if(n) n.textContent = v; };
        set("#ed-tax", m2(eTax(e.v))); set("#ed-sum", m2(e.v.fare + eTax(e.v))); set("#ed-total", m2(eTotal(e)));
        const st = W.querySelector("#ed-state"), ed = eEdited(e);
        if(st){ st.textContent = ed ? "Edited" : "Not edited"; st.className = "pill" + (ed ? " draft" : ""); }
        eNotes();
      }
    }
  };
  /* =====================================================================
     MERIT AMERICA: "One week in the Learner Portal" (standalone demo in
     merit-portal-demo.html, built from the portal's design system).
     The learner's phone and the coach's squad view share one state.
     ===================================================================== */
  const MA_STEPS = { status:"mon", nudge:"wed", proof:"proof", coach:"count", close:"sun" };
  const MA_NOTES = {
    mon:["MONDAY","Am I on track this week?","The learner sees this week's expectations and one status, On Track or At Risk, instead of a raw percentage to feel judged by."],
    wed:["MID-WEEK NUDGE","Feedback while it still matters.","On Wednesday an automated nudge goes to learners who are behind, and it's logged beside the squad so the coach knows who has already been contacted."],
    proof:["UPLOAD PROOF","Trust beats automation.","A screenshot proves a Coursera module is done. It replaced an expensive, fragile integration and kept up as the curriculum changed."],
    count:["COACH COUNTS IT","Verify in one place.","The coach reviews proof in one step, count it or ask for a clearer screenshot, and the learner's status updates on both screens."],
    sun:["SUNDAY CLOSE","The week closes.","On Track and At Risk become Complete or Incomplete, and the squad view exports the week for program staff."]
  };
  P["merit-america"] = {
    title:"LEARNER.PORTAL",
    cases:[
      ["status", "See the weekly status a learner starts with", [""]],
      ["nudge", "See a mid-week nudge go out"],
      ["proof", "Submit proof and verify it as the coach"],
      ["coach", "See the coach count a learner's proof"],
      ["close", "Close out the week"]
    ],
    hint:"STEP THROUGH THE WEEK. UPLOAD A SCREENSHOT AS THE LEARNER, THEN COUNT IT AS THE COACH.",
    hints:{
      status:"MONDAY: ONE WEEKLY STATUS INSTEAD OF A PERCENTAGE. USE NEXT STEP TO MOVE THROUGH THE WEEK.",
      nudge:"IT'S WEDNESDAY AND THE LEARNER IS BEHIND, SO THE NUDGE WENT OUT AUTOMATICALLY.",
      proof:"UPLOAD A SCREENSHOT AS THE LEARNER, THEN NEXT STEP TO COUNT IT AS THE COACH.",
      coach:"THE COACH COUNTS THE PROOF AND THE LEARNER'S STATUS UPDATES ON BOTH SCREENS."
    },
    init(scene){ this.step = MA_STEPS[scene] || "mon"; },
    render(w,n){
      W = w; N = n;
      const k = this.step, nt = MA_NOTES[k];
      W.innerHTML = `<div class="ma-host" role="region" aria-label="Merit America Learner Portal: one week, learner and coach views"></div>`;
      if(window.mountMeritDemo) window.mountMeritDemo(W.querySelector(".ma-host"), k);
      else W.innerHTML = `<p class="dm-small" style="padding:20px">The demo didn't load. <a href="merit-portal-demo.html#${k}" target="_blank" rel="noopener">Open it in a new tab</a>.</p>`;
      notes(nt[0], nt[1], nt[2] + " Sample data; colors updated to meet WCAG AA.", ["LEARNER (PHONE) AND COACH (DESKTOP) SHARE ONE STATE", "STATUS: ON TRACK / AT RISK, THEN COMPLETE / INCOMPLETE", "PROOF: SCREENSHOT UPLOAD, COUNTED BY THE COACH", "NUDGE: AUTOMATED MID-WEEK, LOGGED FOR THE COACH"]);
    },
    action(){}, input(){}
  };
})();
