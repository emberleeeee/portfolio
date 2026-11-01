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
