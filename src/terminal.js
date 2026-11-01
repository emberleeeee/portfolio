/* Blackwell/OS terminal portfolio
   Every page is plain HTML and works without this script. This file layers the
   terminal on top: keyboard selection, letter hotkeys, Esc to go back, the command
   line, the clock, display settings, the start screen, and the Fieldhouse demo. */
(() => {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const body = document.body;
  const screen = $("#screen"), msg = $("#msg"), cmd = $("#cmd");
  const store = {
    get(k){ try{ return localStorage.getItem(k) }catch(e){ return null } },
    set(k,v){ try{ localStorage.setItem(k,v) }catch(e){} }
  };
  const say = t => { if(msg) msg.textContent = t; };
  const go = url => { location.href = url; };

  const EMAIL = "accounts@emilyblackwell.com";
  const CASES = [
    { id:"team-builder", label:"Team Builder", url:"team-builder-case-study.html" },
    { id:"tournaments", label:"Tournament Engine", url:"tournaments-case-study.html" },
    { id:"fieldhouse", label:"Fieldhouse Design System", url:"fieldhouse-ds-case-study.html" },
    { id:"arc", label:"ARC Settlement", url:"arc-settlement-case-study.html" },
    { id:"merit-america", label:"Merit America Portal", url:"merit-america-case-study.html" }
  ];
  const PAGES = { home:"index.html", menu:"index.html", main:"index.html", work:"work.html", about:"about.html",
    resume:"resume.html", cv:"resume.html", lab:"lab.html", contact:"contact.html",
    display:"display.html", settings:"display.html", help:"help.html" };

  // Links from the earlier single-page version (#work-team-builder, #about, #run-fieldhouse) still land correctly.
  if(/(^|\/)(index\.html)?$/.test(location.pathname) && location.hash.length > 1){
    const h = location.hash.slice(1);
    const c = CASES.find(x => "work-"+x.id === h || "run-"+x.id === h);
    if(c){ location.replace(c.url + (h.startsWith("run-") ? "#run" : "")); return; }
    if(PAGES[h]){ location.replace(PAGES[h]); return; }
  }

  // ---------- clock ----------
  const pad = n => String(n).padStart(2,"0");
  function tick(){
    const d = new Date(), el = $("#clock"); if(!el) return;
    el.textContent = `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  tick(); setInterval(tick, 1000);

  // ---------- selection: one highlighted row, always the focused one ----------
  const opts = () => screen ? [...screen.querySelectorAll(".opt")] : [];
  let sel = 0;
  function select(i, scroll=true, focus=true){
    const o = opts(); if(!o.length) return;
    sel = (i + o.length) % o.length;
    o.forEach((el,j) => el.classList.toggle("sel", j===sel));
    if(focus && document.activeElement !== cmd) o[sel].focus({preventScroll:!scroll});
    if(scroll) o[sel].scrollIntoView({block:"nearest"});
  }
  function activate(el){ if(el.dataset.act) act(el.dataset.act, el); else el.click(); }
  if(screen){
    screen.addEventListener("focusin", e => { const b = e.target.closest(".opt"); if(b) select(opts().indexOf(b), false, false); });
    screen.addEventListener("mouseover", e => { const b = e.target.closest(".opt"); if(b && !b.classList.contains("sel")) select(opts().indexOf(b), false, false); });
    screen.addEventListener("click", e => {
      const b = e.target.closest(".opt[data-act]"); if(!b) return;
      e.preventDefault(); select(opts().indexOf(b), false); act(b.dataset.act, b);
    });
  }

  // ---------- display settings ----------
  function refreshDisplay(){
    document.querySelectorAll("[data-state]").forEach(el => {
      const k = el.dataset.state;
      if(k.startsWith("ph:")) el.textContent = (root.dataset.phosphor || "green") === k.slice(3) ? "ACTIVE" : "";
      if(k === "scan") el.textContent = root.dataset.scanlines === "off" ? "OFF" : "ON";
    });
  }
  function setPhosphor(p){ root.dataset.phosphor = p; store.set("bos-ph", p); refreshDisplay(); say(p === "weather" ? "NOW SHOWING: LOCAL ON THE 8S." : "PHOSPHOR SET TO "+p.toUpperCase()+"."); }
  function toggleScan(){
    root.dataset.scanlines = root.dataset.scanlines === "off" ? "on" : "off";
    store.set("bos-scan", root.dataset.scanlines); refreshDisplay(); say("SCANLINES "+root.dataset.scanlines.toUpperCase()+".");
  }
  refreshDisplay();

  // ---------- actions on buttons (data-act) ----------
  function act(a, el){
    if(a.startsWith("ph:")) return setPhosphor(a.slice(3));
    if(a === "scan") return toggleScan();
    if(a.startsWith("run:")) return openProgram(a.slice(4));
    if(a === "email"){
      const done = () => say("EMAIL ADDRESS COPIED: " + EMAIL.toUpperCase());
      const fail = () => say("EMAIL: " + EMAIL.toUpperCase());
      try{ navigator.clipboard.writeText(EMAIL).then(done, fail); }catch(e){ fail(); }
    }
  }

  function back(){
    const p = body.dataset.parent;
    if(p) go(p); else say("ALREADY AT MAIN MENU.");
  }

  // ---------- command line ----------
  function runCommand(raw){
    const c = raw.trim().toLowerCase().replace(/\s+/g," ");
    if(!c) return;
    if(PAGES[c]) return go(PAGES[c]);
    if(c === "back") return back();
    if(["green","amber","white","weather"].includes(c)) return setPhosphor(c);
    if(c === "scanlines" || c === "crt") return toggleScan();
    if(c === "clear") return say("");
    if(c === "whoami") return say("GUEST. ACCESS LEVEL: RECRUITER.");
    const run = c.match(/^run ?(.*)$/);
    if(run){
      const here = body.dataset.program;
      const q = run[1];
      const hit = q ? CASES.find(x => x.id === q || x.label.toLowerCase().includes(q)) : CASES.find(x => x.id === here);
      if(!hit) return say("NO PROGRAM FOUND. TRY: RUN FIELDHOUSE.");
      return hit.id === here ? openProgram(hit.id) : go(hit.url + "#run");
    }
    const q = c.replace(/^(open|cd) /, "");
    const hit = CASES.find(x => x.id === q || x.label.toLowerCase().includes(q));
    if(hit) return go(hit.url);
    say(`COMMAND NOT RECOGNIZED: ${raw.toUpperCase().slice(0,40)}. TYPE HELP.`);
  }
  const fit = () => { if(cmd) cmd.style.width = Math.max(1, cmd.value.length + 1) + "ch"; };
  if(cmd){
    cmd.addEventListener("input", fit);
    $("#cmdform").addEventListener("click", () => cmd.focus());
    $("#cmdform").addEventListener("submit", e => { e.preventDefault(); const v = cmd.value; cmd.value = ""; fit(); cmd.blur(); runCommand(v); });
  }

  const progEl = $("#prog"), progWin = $("#prog-win"), progNotes = $("#prog-notes");

  // ---------- program layer (only on pages that include #prog) ----------
  const prog = { open:null, scene:"", returnFocus:null };
  const PROGRAMS = (progEl && window.BOS_PROGRAMS) || {};
  // scene: optional starting point, so a link in the case study opens the demo at that moment
  function openProgram(id, scene=""){
    const p = PROGRAMS[id]; if(!p || prog.open === id) return;
    prog.open = id; prog.scene = scene; prog.returnFocus = document.activeElement;
    $("#prog-title").textContent = "RUNNING: " + p.title;
    $("#prog-hint").textContent = (p.hints && p.hints[scene]) || p.hint;
    p.init(scene); p.render(progWin, progNotes);
    progEl.hidden = false;
    body.style.overflow = "hidden";
    $(".frame").setAttribute("inert","");
    $("#prog-exit").focus();
    const h = scene ? "#run-" + scene : "#run";
    if(location.hash !== h) history.replaceState(null, "", h);
  }
  function closeProgram(){
    if(!prog.open) return;
    prog.open = null;
    progEl.hidden = true; progWin.innerHTML = ""; progNotes.innerHTML = "";
    body.style.overflow = "";
    $(".frame").removeAttribute("inert");
    history.replaceState(null, "", location.pathname);
    say("PROGRAM ENDED. RETURNED TO CASE FILE.");
    if(prog.returnFocus && prog.returnFocus.focus) prog.returnFocus.focus({preventScroll:true});
  }
  if(progEl){
    progWin.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if(b && prog.open) PROGRAMS[prog.open].action(b.dataset.a, b); });
    const onInput = e => { const el = e.target.closest("[data-in]"); const p = PROGRAMS[prog.open]; if(el && p && p.input) p.input(el, e.type); };
    progWin.addEventListener("input", onInput);
    progWin.addEventListener("change", e => { if(e.target.type === "file" || e.target.type === "checkbox") onInput(e); });
    $("#prog-exit").addEventListener("click", closeProgram);
    $("#prog-reset").addEventListener("click", () => { const p = PROGRAMS[prog.open]; p.init(prog.scene); p.render(progWin, progNotes); say("PROGRAM RESET."); });
    progEl.addEventListener("keydown", e => {
      if(e.key !== "Tab") return;
      const f = [...progEl.querySelectorAll("button:not([disabled]),[href],input,[tabindex]:not([tabindex='-1'])")].filter(x => x.offsetParent !== null);
      if(!f.length) return;
      const first = f[0], last = f[f.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
  }

  // ---------- image viewer ----------
  let viewer = null, viewerReturn = null;
  function openViewer(a){
    if(!viewer){
      viewer = document.createElement("div");
      viewer.id = "viewer"; viewer.hidden = true;
      viewer.setAttribute("role","dialog"); viewer.setAttribute("aria-modal","true"); viewer.setAttribute("aria-label","Image viewer");
      viewer.innerHTML = '<button type="button" class="viewer-close">CLOSE (ESC)</button><figure><img alt=""><figcaption></figcaption></figure>';
      document.body.appendChild(viewer);
      viewer.addEventListener("click", e => { if(e.target === viewer || e.target.closest(".viewer-close")) closeViewer(); });
    }
    const img = a.querySelector("img"), cap = a.closest("figure") && a.closest("figure").querySelector("figcaption");
    viewer.querySelector("img").src = a.getAttribute("href");
    viewer.querySelector("img").alt = img ? img.alt : "";
    viewer.querySelector("figcaption").textContent = cap ? cap.textContent : (img ? img.alt : "");
    viewerReturn = a; viewer.hidden = false; body.style.overflow = "hidden";
    $(".frame").setAttribute("inert","");
    viewer.querySelector(".viewer-close").focus();
  }
  function closeViewer(){
    viewer.hidden = true; body.style.overflow = "";
    $(".frame").removeAttribute("inert");
    if(viewerReturn) viewerReturn.focus({preventScroll:true});
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("a.zoom"); if(!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); openViewer(a);
  });

  // ---------- keyboard ----------
  const bootEl = $("#boot");
  document.addEventListener("keydown", e => {
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    if(bootEl && !bootEl.hidden) return;
    if(viewer && !viewer.hidden){ if(e.key === "Escape"){ e.preventDefault(); closeViewer(); } return; }
    if(prog.open){ if(e.key === "Escape"){ e.preventDefault(); closeProgram(); } return; }
    if(cmd && document.activeElement === cmd){
      if(e.key === "Escape"){ cmd.value = ""; fit(); cmd.blur(); say("COMMAND CANCELLED."); }
      return;
    }
    const t = e.target;
    if(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const k = e.key;
    if((k === "/" || k === ":") && cmd){ e.preventDefault(); cmd.focus(); say("ENTER COMMAND. ESC TO CANCEL."); return; }
    // Arrows move the menu selection on menu pages, or anywhere a menu row has focus.
    // On reading pages (case studies, about, resume) they scroll as usual.
    const ae = document.activeElement;
    const onOpt = ae && ae.classList && ae.classList.contains("opt");
    const idle = !ae || ae === document.body || ae === screen;
    const menuKeys = onOpt || (idle && body.dataset.kind === "menu");
    if(k === "ArrowDown" && menuKeys && opts().length){ e.preventDefault(); select(sel+1); return; }
    if(k === "ArrowUp" && menuKeys && opts().length){ e.preventDefault(); select(sel-1); return; }
    if(k === "Enter"){
      if(!menuKeys) return;
      if(onOpt) return; // the focused link or button handles Enter itself
      const o = opts()[sel]; if(o){ e.preventDefault(); activate(o); } return;
    }
    if(k === "Escape" || k === "Backspace"){ e.preventDefault(); back(); return; }
    // Section pages: left and right arrows page through the case file, like PF7/PF8
    if((k === "ArrowRight" || k === "ArrowLeft") && (idle || onOpt) && "prev" in body.dataset){
      const to = k === "ArrowRight" ? body.dataset.next : body.dataset.prev;
      e.preventDefault(); if(to) go(to); else say("LAST SECTION. ESC FOR THE CASE FILE."); return;
    }
    if(k === "?"){ go("help.html"); return; }
    if(k.length === 1 && /[a-z0-9]/i.test(k)){
      const up = k.toUpperCase();
      const o = opts().find(el => el.dataset.key === up);
      if(o){ select(opts().indexOf(o)); activate(o); return; }
      if(up === "H"){ go("index.html"); return; }
    }
  });

  // ---------- initial selection ----------
  // Focus the first menu row only when it's on screen, so long pages open at the top.
  // Reading pages (case studies, about, resume) start with nothing selected, so arrows scroll.
  (function initSelection(){
    const o = opts(); if(!o.length || body.dataset.kind !== "menu") return;
    const r = o[0].getBoundingClientRect();
    select(0, false, r.top < innerHeight && r.bottom > 0);
  })();

  // ESC=BACK in the function-key bar works like the Escape key
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-back]"); if(!b || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); back();
  });
  // Old in-page section links (case.html#process) now open that section's own page
  if(body.dataset.sections && location.hash.length > 1){
    const h = location.hash.slice(1);
    if(body.dataset.sections.split(" ").includes(h)){ location.replace(location.pathname.replace(/[^/]*$/, "") + location.pathname.split("/").pop().replace(/\.html$/, "") + "-" + h + ".html"); return; }
  }
  if(progEl && /^#run(-|$)/.test(location.hash)) openProgram(body.dataset.program, location.hash.slice(5));
  // "Run demo" links inside the case study open the demo at the matching moment
  document.addEventListener("click", e => {
    const a = e.target.closest('a.run-link'); if(!a || !progEl) return;
    e.preventDefault(); openProgram(body.dataset.program, a.dataset.scene || "");
  });

  // ---------- start screen (homepage only, once per browser session) ----------
  if(!bootEl) return;
  let booted = false; try{ booted = sessionStorage.getItem("bos-booted") === "1" }catch(e){}
  if(booted) return;
  const bootLog = $("#boot-log"), bootGo = $("#boot-go");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;
  $("#boot-cta").textContent = touch ? "TAP TO LOAD" : "PRESS ENTER TO LOAD";
  bootLog.textContent = "BLACKWELL/OS 2.6  (C) 2026\nDESIGN.EMILYBLACKWELL.COM\n\n";
  bootEl.hidden = false;
  $(".frame").setAttribute("inert","");
  bootGo.focus();
  const lines = [
    "MEMORY CHECK ......................... 640K OK",
    "LOADING DESIGN SYSTEM ................ OK",
    "MOUNTING /WORK ....................... 5 RECORDS",
    "MOUNTING /LAB ........................ 2 RECORDS",
    "ESTABLISHING CHANNEL ................. OK",
    "",
    "READY."
  ];
  let started = false, done = false;
  function finish(){
    if(done) return; done = true;
    try{ sessionStorage.setItem("bos-booted","1") }catch(e){}
    bootEl.hidden = true;
    $(".frame").removeAttribute("inert");
    window.removeEventListener("keydown", onKey, true);
    select(sel, false, true);
  }
  function start(){
    if(started){ finish(); return; }
    started = true; bootGo.hidden = true;
    if(reduce){ bootLog.textContent += lines.join("\n"); setTimeout(finish, 300); return; }
    let i = 0;
    (function step(){
      if(done) return;
      if(i < lines.length){ bootLog.textContent += lines[i++] + "\n"; setTimeout(step, 140); }
      else setTimeout(finish, 450);
    })();
  }
  // Before loading, only Enter (or Space on the button) starts; once loading, any key skips.
  function onKey(e){
    if(!started && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); e.stopPropagation(); start();
  }
  window.addEventListener("keydown", onKey, true);
  bootEl.addEventListener("click", start);
})();
