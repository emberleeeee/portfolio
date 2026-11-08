
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

