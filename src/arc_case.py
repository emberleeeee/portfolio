"""ARC case study, rewritten from the project artifacts.
Kept generic on purpose: no internal system, product or file names (per the NDA scope Emily set)."""

ARC = {
  "title": "Airline Settlement Interfaces for Accuracy and Speed",
  "sub": "A UX-led modernization of how travel agencies and airlines find, correct and settle ticket transactions, used by 200+ airlines and agencies.",
  "tags": ["Enterprise UX", "Travel Industry", "Legacy Modernization", "2020–2023"],
  "meta": [
    ["Role", 'Senior UX Designer<br><span class="dim">Financial workflows</span>'],
    ["Company", "Airlines Reporting Corporation (ARC), Arlington, VA"],
    ["Timeline", "2020–2023, multi-year modernization"],
    ["Methods", "Discovery workshops, journey and ecosystem mapping, service blueprints, task modeling, async usability testing"],
  ],
  "hero": "",
  "sections": [
    {"title": "Background", "html": """
<p>I joined a multi-year initiative at <b>Airlines Reporting Corporation (ARC)</b> to modernize the legacy tools behind transaction reporting and settlement.</p>
<div class="callout"><span class="lbl">What ARC Does</span><p>ARC is the financial clearinghouse that sits between airlines and travel agencies. Every refund, exchange, and commission flows through its settlement systems. The accuracy and speed of these tools directly affects airline revenue, agency compliance, and customer trust.</p></div>
<p>Two legacy tools sat at the center of daily work: an archive of settled transactions, and a reporting tool where agents review and correct transactions during the current weekly cycle. Neither had evolved meaningfully in over two decades.</p>
<p>I owned design for three workstreams:</p>
<ul class="lines">
<li><b>Document lookup.</b><br>A new tool for finding any ticket by its document number and understanding everything that has happened to it.</li>
<li><b>The agency reporting and editing tool.</b><br>Modernizing how agents review, correct and authorize their weekly transactions.</li>
<li><b>Transaction file intake.</b><br>Discovery into how ARC receives, validates and troubleshoots the daily transaction files sent by booking systems.</li>
</ul>
"""},
    {"title": "Problem", "html": """
<div class="callout"><span class="lbl">Core Challenge</span><p>How do you modernize a financial compliance workflow that 200+ airlines and agencies depend on daily, without disrupting the precision and timing the industry requires?</p></div>
<p>A ticket moves through several stages before money changes hands. It's issued through a booking system, reaches ARC in a daily file, can be corrected by the agency during the current weekly cycle, and becomes settled when that cycle closes. Each stage lived in a different place, and the friction compounded at every level:</p>
<dl class="record wide">
<dt>Fragmented workflows</dt><dd>Agents had the archive and the editing tool open side by side, cross-referenced document numbers by hand, and often resorted to screenshots or spreadsheets to reconcile mismatched data.</dd>
<dt>Exchanges broke the trail</dt><dd>An exchange or refund creates new documents. The ticket number a customer quotes might be settled history while the answer they want sits on a newer document in a different tool.</dd>
<dt>UI debt</dt><dd>Dense data tables, confusing labels, and cumbersome navigation reflected interfaces that hadn't evolved with user needs in over twenty years.</dd>
<dt>Terminology misalignment</dt><dd>Labels and status indicators meant different things across tools and teams, causing misinterpretation at points where errors had real financial consequences.</dd>
<dt>Manual work behind the scenes</dt><dd>Operations teams tracked incoming transaction files in spreadsheets, switched between many applications to troubleshoot errors, and often couldn't resolve an issue without waiting on another team.</dd>
<dt>No culture of validation</dt><dd>User-centered discovery had not been embedded in ARC's product process. Building that foundation was as much a part of the work as the UI itself.</dd>
</dl>
"""},
    {"title": "Process", "html": """
<p>Due to NDA constraints, I'm describing the approach and decisions in general terms rather than showing screens. The interactive demo on this page is fictional and illustrative.</p>
<h4 class="sub-h">Mapping the system before the screens</h4>
<p>I mapped the full life cycle of a ticket as service blueprints: cash sales, credit sales, early credit billing, a change of payment method, and sales edited by the agency before the cycle closed. Each blueprint traced what the customer, agency, airline and ARC teams see at every step, which systems are involved, and when the data changes from <b>initial</b> (as the agency submitted it) to <b>settled</b> (final for the cycle).</p>
<p>That timing turned out to explain most of the confusion. Users weren't missing data so much as looking in the wrong place for the stage a ticket was in.</p>
<h4 class="sub-h">Document lookup</h4>
<p>I designed a new tool for finding any ticket by its document number, built from task models for every document type: straight sales, refunds, voids, and one-to-one and one-to-many exchanges.</p>
<ul class="lines">
<li>One search by document number, refined by airline or agency depending on the user's permissions.</li>
<li>Results default to settled data, with an option to see the initial data as the agency submitted it.</li>
<li>A transaction history that follows the exchange chain, so one search shows the original ticket, the exchange and any refund together.</li>
<li>Document details shaped to the transaction type, with the summary users need to verify or explain a transaction first and the full record one step away.</li>
<li>Sign-in and session flows designed alongside the customer portal: bookmarked links, many open tabs, timeouts and logging out across apps.</li>
</ul>
<h4 class="sub-h">Editing refunds and exchanges</h4>
<p>In the modernized reporting tool, agents choose which flight segments a refund or exchange covers, and that choice makes it full or partial. I defined what happens to their numbers when they go back and change segments after entering figures, so no one loses edits without being told:</p>
<ul class="lines">
<li>Full to partial: the figures stay as they are. If the agent never edited them, the confirmation step flags that a partial refund still matches the full amount.</li>
<li>Partial to full: the full-document figures are filled in. If the agent had entered figures of their own, they are asked first, so nothing they typed is replaced without warning.</li>
</ul>
<p>I also mapped dependencies for a later release of the tool, sequencing sales reports, transaction edits, memos, payment features, configuration and permissions so each release stood on the one before it.</p>
<h4 class="sub-h">Discovery for transaction file intake</h4>
<p>I facilitated discovery with the teams who receive the daily transaction files. The workshop reframed a broad request ("we have problems with errors") into a problem statement, questioned its assumptions with the five whys, and planned the research to follow.</p>
<p>An ecosystem map and current-state journey maps traced the work across booking systems, data center operations, production support, card operations and the settlement team. They surfaced the opportunities: notify partners automatically when files arrive late or fail, move invalid transactions to a holding area for review instead of dropping them, and replace hard-to-read legacy text reports with reporting partners can actually use.</p>
<h4 class="sub-h">Design principles</h4>
<div class="cards"><div class="card"><h5>Clarity over completeness</h5><span class="lbl">Principle</span><p>Surface the information users most frequently need to verify or explain transactions, not the full depth of the system by default. Progressive disclosure over information overload.</p><span class="lbl">Why it mattered</span><p>Agents under time pressure made more errors when confronted with dense, unfiltered data. Reducing cognitive load at the decision point directly reduced error rates.</p></div><div class="card"><h5>Terminology alignment</h5><span class="lbl">Principle</span><p>Audit, flag, and redesign ambiguous labels that caused misinterpretation across tools and teams. Language is part of the UX.</p><span class="lbl">Why it mattered</span><p>A single misunderstood status label could trigger incorrect downstream actions in a compliance-sensitive workflow. Getting terminology right was a risk-reduction strategy.</p></div><div class="card"><h5>Shareable states</h5><span class="lbl">Principle</span><p>Design streamlined, readable views optimized for communication with end customers, reflecting how agents already worked in practice.</p><span class="lbl">Why it mattered</span><p>Agents were already creating screenshots and workarounds to share transaction status with customers. Designing for that reality eliminated shadow workflows.</p></div></div>
<h4 class="sub-h">Research &amp; Validation</h4>
<p>One of the most significant contributions of this project was introducing a new testing model to ARC. I designed an <b>asynchronous usability testing approach</b> that allowed participants to explore interactive prototypes on their own schedule, reducing scheduling friction and producing more natural behavioral signals than traditional moderated sessions.</p>
<div class="stats"><div class="stat"><b>200+</b><span>Airlines and travel agencies using these systems</span></div><div class="stat"><b>20+ yrs</b><span>Age of the legacy systems being modernized</span></div><div class="stat"><b>3</b><span>Workstreams I owned design for</span></div></div>
<div class="cards"><div class="card"><span class="lbl">Testing Model</span><h5>Async Usability Approach</h5><ul class="lines"><li>Lightweight interactive prototypes</li><li>Behavioral observation without scheduling</li><li>Structured feedback collection</li><li>Later adopted org-wide</li></ul></div><div class="card"><span class="lbl">Discovery Methods</span><h5>Research Toolkit</h5><ul class="lines"><li>Stakeholder and discovery workshops</li><li>Ecosystem maps and current-state journeys</li><li>Service blueprints of the ticket life cycle</li><li>Task models for every document type</li><li>Terminology audits across systems</li></ul></div></div>
<figure class="quote"><blockquote>The testing model proved effective enough that it was adopted more broadly within the organization, shifting how ARC teams approached discovery going forward.</blockquote><figcaption>Project Outcome, ARC Settlement Modernization</figcaption></figure>
"""},
    {"title": "Outcome", "html": """
<p>The document lookup tool launched after I left ARC. The work also had lasting organizational impact, which in legacy transformation is often the harder outcome to achieve.</p>
<div class="cards"><div class="card"><h5>Product Impact</h5><ul class="lines"><li>A single document lookup that follows a ticket through exchanges and refunds, launched after my departure</li><li>Clear rules for editing refunds and exchanges so agents never lose work silently</li><li>Reduced shadow workflows through shareable state design</li></ul></div><div class="card"><h5>Organizational Impact</h5><ul class="lines"><li>Async testing model adopted org-wide</li><li>Contributed to internal frameworks formalizing when design research is embedded in product development</li><li>Service blueprints and journey maps gave teams a shared picture of how a ticket settles</li></ul></div></div>
<figure class="quote"><blockquote>The initiative helped rebuild trust with users by showing that ARC was actively listening and iterating, something that hadn't always been visible before.</blockquote><figcaption>Project Reflection</figcaption></figure>
"""},
    {"title": "Reflection", "html": """
<p>This project taught me that digital transformation in legacy organizations is sometimes less about the interface and more about <b>shifting how a company listens to its users</b>.</p>
<p>I learned to frame design not as a one-time delivery, but as a catalyst for organizational learning, maintaining a constant feedback loop among internal stakeholders and customers. Each usability test, workshop, and conversation nudged ARC closer to that shift.</p>
<div class="cards"><div class="card"><h5>What Worked</h5><ul class="lines"><li>Mapping the ticket life cycle before designing screens</li><li>Async testing removed scheduling friction and produced better behavioral data</li><li>Principle-led design gave the team a shared language for tradeoff decisions</li><li>Treating terminology as a design problem surfaced risk early</li></ul></div><div class="card"><h5>What I'd Explore Next</h5><ul class="lines"><li>Root cause analysis on document-type confusion</li><li>Card sorting and tree testing for navigation and terminology</li><li>Deeper alignment between engineering and design around shared data models</li></ul></div></div>
<div class="callout"><p>The success of this work showed in the mindset shift of a forty-year-old organization beginning to embrace UX as a lens for clarity, trust, and continuous improvement.</p></div>
"""},
  ],
}
