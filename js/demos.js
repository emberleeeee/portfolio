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
     TOURNAMENT ENGINE: bulk cart, dynamic payment plans, the microcopy fix
     All prices are demo values.
     ===================================================================== */
  const TE = { data:null };
  const TE_TEAMS = [
    { id:1, name:"Riverside FC U12 Blue",  div:"U12", players:14, staff:2 },
    { id:2, name:"Riverside FC U12 White", div:"U12", players:13, staff:2 },
    { id:3, name:"Riverside FC U10 Green", div:"U10", players:10, staff:1 },
    { id:4, name:"Riverside FC U14 Navy",  div:"U14", players:16, staff:3 },
    { id:5, name:"Riverside FC U9 Gold",   div:"U9",  players:9,  staff:1 },
    { id:6, name:"Riverside FC U14 Gray",  div:"U14", players:15, staff:2 }
  ];
  // Conditional pricing: team fee by division, plus per-player and per-staff fees.
  const teFee = t => ({ U9:450, U10:450, U12:650, U14:750 }[t.div]);
  const PLAYER_FEE = 25, STAFF_FEE = 10;
  const teTotal = t => teFee(t) + t.players * PLAYER_FEE + t.staff * STAFF_FEE;
  function teSchedule(total, n, depositPct){
    const dep = n > 1 ? Math.round(total * depositPct) / 100 : total;
    const rest = total - dep, each = n > 1 ? Math.floor(rest / (n - 1) * 100) / 100 : 0;
    const out = [], d = new Date();
    for(let i = 0; i < n; i++){
      const due = new Date(d.getFullYear(), d.getMonth() + i, i === 0 ? d.getDate() : 1);
      let amt = i === 0 ? dep : each;
      if(i === n - 1 && n > 1) amt = Math.round((rest - each * (n - 2)) * 100) / 100;
      out.push({ due:due.toLocaleDateString("en-US", { month:"short", day:"numeric" }), amt });
    }
    return out;
  }
  const teSchedHTML = (total, s) => `<table class="dm-table"><thead><tr><th>Due</th><th>Amount</th></tr></thead><tbody>${
    teSchedule(total, s.n, s.dep).map((r,i) => `<tr><td>${i === 0 ? "Today" : r.due}</td><td>${money(r.amt)}</td></tr>`).join("")}</tbody></table>`;
  const teCartTotal = s => TE_TEAMS.filter(t => s.cart.includes(t.id)).reduce((a,t) => a + teTotal(t), 0);
  function teLive(){
    const s = TE.data;
    W.querySelector("#te-n").textContent = s.n === 1 ? "Pay in full" : s.n;
    W.querySelector("#te-dep").textContent = s.dep + "%";
    W.querySelector("#te-dep-wrap").hidden = s.n === 1;
    W.querySelector("#te-sched").innerHTML = teSchedHTML(teCartTotal(s), s);
    W.querySelectorAll('[data-a^="n:"]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.a === "n:" + s.n)));
    notes("PAYMENT PLANS","Flexible, with a sensible default.","Up to 12 installments gives partners control. More options risk decision paralysis, so the plan starts at three payments with a deposit today.", [`INSTALLMENTS: ${s.n}`, s.n > 1 ? `DEPOSIT: ${s.dep}%` : "PAID IN FULL"]);
  }
  function teRender(){
    const s = TE.data, inCart = TE_TEAMS.filter(t => s.cart.includes(t.id));
    const total = inCart.reduce((a,t) => a + teTotal(t), 0);
    const tabs = [["cart","Bulk cart"],["plan","Payment plan"],["copy","Form microcopy"]];
    let body = "";
    if(s.tab === "cart"){
      body = `<div class="te-grid">
        <section><h5>Returning teams</h5><ul class="dm-list">${TE_TEAMS.map(t => {
          const on = s.cart.includes(t.id);
          return `<li><div><b>${t.name}</b><span>${t.div} &middot; ${t.players} players &middot; ${t.staff} staff &middot; ${money(teTotal(t))}</span></div>
            <button type="button" class="dm-btn sm ${on ? "ghost" : ""}" data-a="toggle:${t.id}" aria-pressed="${on}">${on ? "Remove" : "Add to cart"}</button></li>`;
        }).join("")}</ul>
        <button type="button" class="dm-btn sm ghost" data-a="all">Add all returning teams</button></section>
        <section class="te-cart"><h5>Cart</h5>
          ${inCart.length ? `<ul class="dm-list tight">${inCart.map(t => `<li><span>${t.name}</span><b>${money(teTotal(t))}</b></li>`).join("")}</ul>
          <div class="te-sum"><span>Total</span><b>${money(total)}</b></div>
          <p class="dm-small">Team fee by division, plus ${money(PLAYER_FEE)} per player and ${money(STAFF_FEE)} per staff member.</p>
          <div class="te-compare"><div><b>${inCart.length}</b><span>separate checkouts before</span></div><div><b>1</b><span>checkout now</span></div></div>
          <button type="button" class="dm-btn primary" data-a="tab:plan">Choose a payment plan</button>`
          : `<p class="dm-small">Add teams to register them together in one checkout.</p>`}
        </section></div>`;
    } else if(s.tab === "plan"){
      body = total ? `<div class="te-grid">
        <section><h5>Plan options</h5>
          <label class="dm-field"><span>Installments: <b id="te-n">${s.n === 1 ? "Pay in full" : s.n}</b></span>
            <input type="range" min="1" max="12" value="${s.n}" data-in="n" aria-label="Number of installments"></label>
          <div class="dm-chips">${[1,3,6,12].map(n => `<button type="button" class="dm-chip" aria-pressed="${s.n === n}" data-a="n:${n}">${n === 1 ? "In full" : n + " payments"}</button>`).join("")}</div>
          <label class="dm-field" id="te-dep-wrap" ${s.n > 1 ? "" : "hidden"}><span>Deposit: <b id="te-dep">${s.dep}%</b></span>
            <input type="range" min="10" max="50" step="5" value="${s.dep}" data-in="dep" aria-label="Deposit percentage"></label>
          <p class="dm-small">Partners can offer up to 12 installments. Three payments is the smart default.</p>
        </section>
        <section class="te-cart"><h5>Schedule &middot; ${money(total)} for ${inCart.length} team${inCart.length === 1 ? "" : "s"}</h5>
          <div id="te-sched">${teSchedHTML(total, s)}</div>
        </section></div>` : `<p class="dm-small">Your cart is empty. <button type="button" class="dm-link" data-a="tab:cart">Add teams first.</button></p>`;
    } else {
      const old = !s.fixed;
      body = `<div class="te-grid">
        <section><h5>Registration form</h5>
          <div class="dm-seg" role="group" aria-label="Label version">
            <button type="button" aria-pressed="${old}" data-a="fixed:0">Original labels</button>
            <button type="button" aria-pressed="${!old}" data-a="fixed:1">Updated labels</button></div>
          <form class="te-form" onsubmit="return false">
            <p class="te-form-h">${old ? "Registrant information" : "Player information"}</p>
            <label>${old ? "First name" : "Player first name"}<input value="${old ? "Laura" : "Mia"}" readonly></label>
            <label>${old ? "Last name" : "Player last name"}<input value="Chen" readonly></label>
            <label>${old ? "Date of birth" : "Player date of birth"}<input value="${old ? "04/12/1984" : "06/03/2014"}" readonly></label>
          </form></section>
        <section class="te-cart"><h5>What happened</h5>
          ${old ? `<p>Parents read "Registrant" as themselves and entered their own details where organizers expected the child's. The sample on the left shows the typical mistake: an adult's birth date on a U12 roster.</p>`
                : `<p>Naming the player in every label removed the ambiguity. In testing, this one change nearly eliminated the error.</p>`}
        </section></div>`;
    }
    W.innerHTML = `<div class="app">
      <div class="dm-top"><span class="dm-brand">Tournament Registration <span>&middot; Spring Classic &middot; demo</span></span>
        <div class="dm-tabs" role="tablist">${tabs.map(([k,l]) => `<button type="button" role="tab" aria-selected="${s.tab === k}" data-a="tab:${k}">${l}</button>`).join("")}</div></div>
      <div class="dm-body">${body}</div></div>`;
    if(s.tab === "cart") notes("BULK CART","Register every team in one session.","Organizers used to check out once per team, so returning clubs often had the organizer register them by hand. The cart turns many checkouts into one, with pricing that varies by division, players and staff.", [`TEAMS IN CART: ${inCart.length}`, `CHECKOUTS SAVED: ${Math.max(0, inCart.length - 1)}`]);
    else if(s.tab === "plan") notes("PAYMENT PLANS","Flexible, with a sensible default.","Up to 12 installments gives partners control. More options risk decision paralysis, so the plan starts at three payments with a deposit today.", [`INSTALLMENTS: ${s.n}`, s.n > 1 ? `DEPOSIT: ${s.dep}%` : "PAID IN FULL"]);
    else notes("MICROCOPY","One label, one error class gone.","Moderated testing showed parents entering their own information in fields meant for their child. Changing the labels fixed it without changing the flow.", [s.fixed ? "LABELS: PLAYER-SPECIFIC" : "LABELS: AMBIGUOUS"]);
  }
  P.tournaments = {
    title:"TOURNAMENT.CART",
    hint:"TRY: ADD ALL RETURNING TEAMS, BUILD A PAYMENT PLAN, THEN COMPARE THE FORM LABELS.",
    hints:{
      cart:"ADD ALL RETURNING TEAMS AND WATCH SIX CHECKOUTS BECOME ONE.",
      plan:"DRAG THE INSTALLMENTS SLIDER. THREE PAYMENTS IS THE DEFAULT.",
      copy:"SWITCH BETWEEN THE ORIGINAL AND UPDATED LABELS."
    },
    init(scene){
      TE.data = { tab:"cart", cart:[1,2], n:3, dep:25, fixed:false };
      if(scene === "plan"){ TE.data.tab = "plan"; TE.data.cart = TE_TEAMS.map(t => t.id); }
      if(scene === "copy") TE.data.tab = "copy";
    },
    render(w,n){ W = w; N = n; teRender(); },
    action(a){
      const s = TE.data, [cmd, x] = a.split(":");
      if(cmd === "tab") s.tab = x;
      else if(cmd === "toggle"){ const id = +x; s.cart = s.cart.includes(id) ? s.cart.filter(i => i !== id) : [...s.cart, id]; }
      else if(cmd === "all") s.cart = TE_TEAMS.map(t => t.id);
      else if(cmd === "n") s.n = +x;
      else if(cmd === "fixed") s.fixed = x === "1";
      teRender();
      const f = W.querySelector(`[data-a="${a}"]`); if(f) f.focus();
    },
    input(el){ TE.data[el.dataset.in] = +el.value; teLive(); }
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
