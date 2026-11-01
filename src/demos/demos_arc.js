
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
