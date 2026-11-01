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

