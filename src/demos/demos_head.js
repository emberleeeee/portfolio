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
