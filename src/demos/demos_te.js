
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
