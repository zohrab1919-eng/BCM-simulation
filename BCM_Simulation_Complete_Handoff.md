# BCM SIMULATION APP — COMPLETE CLAUDE CODE HANDOFF
### Framework: C.O.I.L.O (Context → Objective → Inputs → Logic → Output)
**Prepared by:** Enablerz Consulting & Solutions
**Version:** 1.0 — Complete Self-Contained Build Package
**Contents:** App specification + Full scenario database (3 industries, 6 scenarios)

---

> **How to use this file with Claude Code**
> Paste the entire contents of this file as your opening prompt in Claude Code.
> Everything Claude Code needs to build and run the app is embedded here —
> including the full scenario database as a JSON block it must save to disk
> as `server/data/scenario_database.json` before writing any other code.
> No external files or references are needed.

---

## C — CONTEXT
### Who is this for?

This app is built for **Enablerz Consulting & Solutions**, an HR advisory and organisational development practice. It is used as a **facilitated learning tool** in Business Continuity Management (BCM) workshops and consulting engagements.

**Two types of users:**

| Role | Device | Network | Access Method |
|------|--------|---------|---------------|
| **Host (Facilitator)** | Laptop (primary) | Public WiFi or mobile hotspot | Runs the host dashboard; controls game flow |
| **Participant** | Laptop (preferred) or mobile phone | Own mobile data, public WiFi, or office WiFi | Joins via QR code scan or shared link |

**Workshop context:**
- Groups of 8–30 participants split into teams of 4–6
- Each team represents a fictional company they set up at the start
- The facilitator controls the pace, triggers disruption events, and manages debriefs
- The app must work reliably on public WiFi and mixed mobile data environments — no dependency on a corporate network
- The app is NOT a standalone self-paced tool; it requires a human facilitator to run

**Tone of the app:** Professional but accessible. No BCM jargon on participant-facing screens. Language is layperson-friendly (e.g. "War Chest" not "contingency budget"; "What breaks first?" not "Business Impact Analysis").

---

## O — OBJECTIVE
### What should it do?

Build a **real-time, browser-based, multiplayer BCM simulation app** that:

1. Allows a host to create a game session and share access with participants via QR code or link
2. Guides teams through setting up a fictional company (industry, departments, roles)
3. Delivers a disruption event (chosen or randomised) that unfolds in escalating waves
4. Requires teams to make recovery decisions under time pressure, drawing from a limited war chest
5. Tracks and scores team performance across four loss dimensions: **Financial, Regulatory, Reputational, and Operational**
6. Ends with an automated **Post-Game Debrief Package** — generating pre-filled document templates per team that become their starting point for real BCM planning

**The experience must feel like a game, not a compliance exercise.**

---

## I — INPUTS
### What data goes in?

### I.1 — Host Inputs (before and during the game)

```
- Host name and organisation name
- Session name / cohort label (e.g. "FWD Indonesia — VERSE Cohort")
- Number of teams
- Industry selection per team (from pre-built list or custom)
- Company archetype per team: Startup / Mid-Market / Enterprise
- Disruption event: Random draw OR facilitator selects from library
- Game clock speed: Normal (real-time minutes = game hours) or Accelerated
- Decision window duration per round (default: 4 minutes)
- Whether to enable post-game template export
```

### I.2 — Participant Inputs (during setup phase)

```
- Team name (they name their fictional company)
- Department selection: choose from pre-loaded defaults, add custom ones
- Role assignment: each team member picks a department role
- Company details: headcount band (Small / Medium / Large), primary revenue activity
```

### I.3 — Participant Inputs (during simulation rounds)

```
- Recovery action selections (choose from available levers per round)
- War chest allocation (how much to spend on each action)
- Optional: free-text crisis communication statement (Corporate Comms role)
- Optional: free-text regulatory response note (Compliance role)
```

### I.4 — Pre-loaded Scenario Database

The full scenario database is embedded in **Section I.4-DATA** below as a JSON block.

**Claude Code instruction:** Save this JSON block verbatim to `server/data/scenario_database.json` as the very first file created. All game logic must load from this file at runtime. Do not hardcode any scenario content in application logic.

#### I.4-DATA — scenario_database.json

```json
{
  "version": "1.0",
  "last_updated": "2026-06",
  "industries": [
    {
      "id": "FIN",
      "name": "Financial Services & Banking",
      "archetype": "High regulatory exposure, system-critical, zero tolerance for downtime",
      "sub_types": ["Banks", "Insurance companies", "Fund managers", "Fintech"],
      "archetype_modifiers": {
        "startup":    { "war_chest_multiplier": 0.6, "escalation_speed": 1.4, "regulatory_penalty_multiplier": 1.2 },
        "mid_market": { "war_chest_multiplier": 1.0, "escalation_speed": 1.0, "regulatory_penalty_multiplier": 1.0 },
        "enterprise": { "war_chest_multiplier": 1.8, "escalation_speed": 0.8, "regulatory_penalty_multiplier": 1.4 }
      },
      "war_chest_base": {
        "small":  500000,
        "medium": 1500000,
        "large":  4000000
      },
      "default_departments": [
        "Operations & Branch Services",
        "IT & Core Banking Systems",
        "Finance & Treasury",
        "Compliance & Risk Management",
        "Corporate Communications / PR",
        "HR & Administration",
        "Customer Service & Relationship Management",
        "Cybersecurity & Fraud Prevention"
      ],
      "scenarios": [
        {
          "id": "FIN-01",
          "name": "Core Banking System Failure",
          "severity": "Critical",
          "probability_weight": 3,
          "regulatory_flag": true,
          "reputation_flag": true,
          "war_chest_impact_label": "RM 800K–1.2M per hour in lost transaction fees and operational costs",
          "trigger_text": "A critical software patch deployed overnight causes the core banking platform to crash at 7:00 AM on a Monday morning. Tellers are frozen at their terminals. The phones are ringing.",
          "threat_summary": "System outage caused by a failed software patch — total core banking platform failure during peak hours.",
          "escalation_waves": [
            {
              "wave": 1,
              "time_label": "Hour 1",
              "event": "ATMs nationwide go offline. Branch tellers cannot process any transactions. Customer calls are flooding the contact centre — hold times exceed 45 minutes.",
              "financial_loss": 800000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 15,
              "operational_score_penalty": 30,
              "departments_activated": ["IT & Core Banking Systems", "Operations & Branch Services", "Customer Service & Relationship Management"]
            },
            {
              "wave": 2,
              "time_label": "Hour 3",
              "event": "#BankDown is trending on social media. Journalists are calling Corporate Communications for a statement. Customer anger is escalating publicly.",
              "financial_loss": 1200000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 25,
              "operational_score_penalty": 10,
              "departments_activated": ["Corporate Communications / PR", "Customer Service & Relationship Management"]
            },
            {
              "wave": 3,
              "time_label": "Hour 6",
              "event": "The Central Bank must now be formally notified. The regulatory breach clock has started. The CEO has been pulled from a board meeting.",
              "financial_loss": 2000000,
              "regulatory_score_penalty": 35,
              "reputation_score_penalty": 15,
              "operational_score_penalty": 10,
              "departments_activated": ["Compliance & Risk Management", "Finance & Treasury"]
            },
            {
              "wave": 4,
              "time_label": "Hour 12",
              "event": "Estimated revenue loss reaches RM 4.2M. Institutional clients are escalating to their relationship managers and threatening to move funds.",
              "financial_loss": 4200000,
              "regulatory_score_penalty": 10,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 15,
              "departments_activated": ["Finance & Treasury", "Customer Service & Relationship Management"]
            },
            {
              "wave": 5,
              "time_label": "Day 2",
              "event": "National media coverage. A competitor quietly issues a press release highlighting their uptime record. Staff morale is visibly affected.",
              "financial_loss": 1000000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 20,
              "operational_score_penalty": 5,
              "departments_activated": ["Corporate Communications / PR", "HR & Administration"]
            },
            {
              "wave": 6,
              "time_label": "Day 3",
              "event": "Regulator issues a formal request for a full incident report within 5 business days. Legal counsel is now involved.",
              "financial_loss": 500000,
              "regulatory_score_penalty": 20,
              "reputation_score_penalty": 5,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management"]
            }
          ],
          "recovery_levers": [
            {
              "id": "FIN01-L1",
              "label": "Activate Backup Systems",
              "description": "Switch to your disaster recovery site and restore core banking systems from last clean backup.",
              "war_chest_cost": 150000,
              "score_recovery": { "operational": 25, "financial": 10 },
              "waves_mitigated": [1, 2],
              "departments_required": ["IT & Core Banking Systems"],
              "if_department_missing": "Backup activation fails — IT team not available to execute the failover."
            },
            {
              "id": "FIN01-L2",
              "label": "Manual Operations Mode",
              "description": "Deploy manual transaction processing at priority branches while systems recover.",
              "war_chest_cost": 50000,
              "score_recovery": { "operational": 15, "reputation": 5 },
              "waves_mitigated": [1],
              "departments_required": ["Operations & Branch Services"],
              "if_department_missing": "No one is available to coordinate branch manual procedures."
            },
            {
              "id": "FIN01-L3",
              "label": "Issue Public Statement",
              "description": "Release a holding statement to media and customers acknowledging the issue and estimated resolution time.",
              "war_chest_cost": 10000,
              "score_recovery": { "reputation": 20 },
              "waves_mitigated": [2, 5],
              "departments_required": ["Corporate Communications / PR"],
              "if_department_missing": "No authorised spokesperson — unofficial statements leak and worsen the situation."
            },
            {
              "id": "FIN01-L4",
              "label": "Proactively Notify Regulator",
              "description": "Contact the Central Bank before the mandatory deadline — demonstrate transparency and good faith.",
              "war_chest_cost": 20000,
              "score_recovery": { "regulatory": 25 },
              "waves_mitigated": [3, 6],
              "departments_required": ["Compliance & Risk Management"],
              "if_department_missing": "Notification missed or delayed — regulator finds out from media instead."
            },
            {
              "id": "FIN01-L5",
              "label": "Customer Compensation Protocol",
              "description": "Activate fee waivers and goodwill credits for affected customers to protect loyalty.",
              "war_chest_cost": 80000,
              "score_recovery": { "reputation": 15, "financial": 5 },
              "waves_mitigated": [4],
              "departments_required": ["Customer Service & Relationship Management", "Finance & Treasury"],
              "if_department_missing": "Compensation cannot be processed — customer anger compounds."
            }
          ],
          "debrief_notes": "Key lesson: IT recovery speed is critical but the regulatory clock runs independently. Teams often forget Compliance until it is too late. The dependency between IT and Operations for manual fallback is frequently underestimated.",
          "debrief_template": "BIA_Financial_Services"
        },
        {
          "id": "FIN-02",
          "name": "Targeted Ransomware Attack",
          "severity": "Critical",
          "probability_weight": 4,
          "regulatory_flag": true,
          "reputation_flag": true,
          "war_chest_impact_label": "USD 2M ransom demand + RM 3–8M estimated remediation and legal costs",
          "trigger_text": "At 11:30 PM, the IT security team detects encrypted files spreading rapidly across internal servers. A ransom note appears on every compromised screen: USD 2,000,000 in cryptocurrency. 48 hours. Or the data goes public.",
          "threat_summary": "Ransomware attack with data breach — customer records compromised, 48-hour ransom deadline.",
          "escalation_waves": [
            {
              "wave": 1,
              "time_label": "Hour 1",
              "event": "IT has isolated affected servers but 40% of internal systems are already compromised. The attack is still spreading through unpatched segments.",
              "financial_loss": 200000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 0,
              "operational_score_penalty": 35,
              "departments_activated": ["IT & Core Banking Systems", "Cybersecurity & Fraud Prevention"]
            },
            {
              "wave": 2,
              "time_label": "Hour 4",
              "event": "Customer data breach confirmed. PDPA obligations are triggered immediately — notification deadline clock has started.",
              "financial_loss": 500000,
              "regulatory_score_penalty": 30,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 10,
              "departments_activated": ["Compliance & Risk Management", "IT & Core Banking Systems"]
            },
            {
              "wave": 3,
              "time_label": "Hour 8",
              "event": "Board convened for emergency session. Insurers have been notified. The ransom deadline is now 40 hours away.",
              "financial_loss": 300000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 5,
              "operational_score_penalty": 10,
              "departments_activated": ["Finance & Treasury", "Compliance & Risk Management"]
            },
            {
              "wave": 4,
              "time_label": "Hour 24",
              "event": "An anonymous source has leaked the story to media. Stock price drops 6% at market opening. Customers begin withdrawing funds.",
              "financial_loss": 2000000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 30,
              "operational_score_penalty": 5,
              "departments_activated": ["Corporate Communications / PR", "Customer Service & Relationship Management"]
            },
            {
              "wave": 5,
              "time_label": "Day 3",
              "event": "Regulator launches a formal investigation. An external forensic firm has been engaged. Legal costs are escalating rapidly.",
              "financial_loss": 1000000,
              "regulatory_score_penalty": 20,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management"]
            },
            {
              "wave": 6,
              "time_label": "Day 7",
              "event": "Full scope of breach confirmed: 280,000 customer records compromised. Class action lawsuit filed.",
              "financial_loss": 3000000,
              "regulatory_score_penalty": 15,
              "reputation_score_penalty": 15,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management", "Corporate Communications / PR"]
            }
          ],
          "recovery_levers": [
            {
              "id": "FIN02-L1",
              "label": "Engage Cybersecurity Response Team",
              "description": "Bring in an external cybersecurity incident response firm to contain and eradicate the attack. Do NOT pay the ransom.",
              "war_chest_cost": 200000,
              "score_recovery": { "operational": 30, "regulatory": 10 },
              "waves_mitigated": [1, 2],
              "departments_required": ["Cybersecurity & Fraud Prevention", "IT & Core Banking Systems"],
              "if_department_missing": "No internal capability to brief the response firm — containment delayed by 12 hours."
            },
            {
              "id": "FIN02-L2",
              "label": "Restore from Clean Backup",
              "description": "Identify and restore systems from the last verified clean backup. Validate backup integrity before execution.",
              "war_chest_cost": 100000,
              "score_recovery": { "operational": 25, "financial": 10 },
              "waves_mitigated": [1],
              "departments_required": ["IT & Core Banking Systems"],
              "if_department_missing": "Backup restoration cannot proceed without IT team oversight."
            },
            {
              "id": "FIN02-L3",
              "label": "Notify Affected Customers",
              "description": "Proactively notify all 280,000 affected customers within 72 hours as required by PDPA. Include what data was exposed and what they should do.",
              "war_chest_cost": 60000,
              "score_recovery": { "regulatory": 20, "reputation": 15 },
              "waves_mitigated": [2, 4],
              "departments_required": ["Compliance & Risk Management", "Corporate Communications / PR"],
              "if_department_missing": "Notification is legally required — failure to notify adds regulatory penalties."
            },
            {
              "id": "FIN02-L4",
              "label": "Crisis Communications Response",
              "description": "Issue a transparent public statement. Hold a press briefing. Emphasise swift action and customer protection steps taken.",
              "war_chest_cost": 30000,
              "score_recovery": { "reputation": 20 },
              "waves_mitigated": [4],
              "departments_required": ["Corporate Communications / PR"],
              "if_department_missing": "No authorised spokesperson — silence interpreted as concealment by media."
            },
            {
              "id": "FIN02-L5",
              "label": "Proactive Regulator Engagement",
              "description": "Brief the regulator with a remediation roadmap before they formally investigate. Demonstrate accountability.",
              "war_chest_cost": 40000,
              "score_recovery": { "regulatory": 25 },
              "waves_mitigated": [5],
              "departments_required": ["Compliance & Risk Management"],
              "if_department_missing": "Regulator receives no proactive briefing — investigation scope widens."
            }
          ],
          "debrief_notes": "Key lesson: Paying the ransom is never listed as a lever — this should provoke discussion. Teams often spend heavily on IT recovery but neglect the PDPA customer notification obligation, which has a hard legal deadline independent of technical recovery. The media leak wave surprises teams who thought containment was complete.",
          "debrief_template": "BIA_Financial_Services"
        }
      ]
    },
    {
      "id": "LOG",
      "name": "Logistics & Transportation — Highway Concessionaire",
      "archetype": "Physical infrastructure-dependent, public safety obligation, government concession agreement",
      "sub_types": ["Highway & toll concessionaires", "Port & shipping terminals", "Public transit operators", "Freight & last-mile logistics"],
      "archetype_modifiers": {
        "startup":    { "war_chest_multiplier": 0.5, "escalation_speed": 1.5, "regulatory_penalty_multiplier": 1.3 },
        "mid_market": { "war_chest_multiplier": 1.0, "escalation_speed": 1.0, "regulatory_penalty_multiplier": 1.0 },
        "enterprise": { "war_chest_multiplier": 1.6, "escalation_speed": 0.9, "regulatory_penalty_multiplier": 1.2 }
      },
      "war_chest_base": {
        "small":  400000,
        "medium": 1200000,
        "large":  3500000
      },
      "default_departments": [
        "Operations & Maintenance",
        "Traffic Management & Incident Response",
        "Finance & Revenue Collection (Tolling)",
        "Compliance & Risk Management",
        "Corporate Communications / PR",
        "HR & Administration",
        "IT & Tolling Systems",
        "Customer Experience & Complaints"
      ],
      "scenarios": [
        {
          "id": "LOG-01",
          "name": "Flash Flood — Partial Highway Closure",
          "severity": "High",
          "probability_weight": 5,
          "regulatory_flag": true,
          "reputation_flag": true,
          "war_chest_impact_label": "RM 200K–800K in lost toll revenue per day depending on closure scope",
          "trigger_text": "Overnight monsoon rainfall has caused flash flooding at three low-lying interchange sections. Traffic sensors trigger automatic alerts at 5:15 AM. The morning commute is already building. Three interchanges are impassable.",
          "threat_summary": "Seasonal flash flood causing partial highway closure during peak commute hours — public safety and concession SLA obligations triggered.",
          "escalation_waves": [
            {
              "wave": 1,
              "time_label": "Hour 1",
              "event": "Three interchanges are closed. Traffic backs up 12 kilometres. Commuter social media posts are going viral — frustrated drivers are filming and posting in real time.",
              "financial_loss": 200000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 20,
              "operational_score_penalty": 30,
              "departments_activated": ["Operations & Maintenance", "Traffic Management & Incident Response", "IT & Tolling Systems"]
            },
            {
              "wave": 2,
              "time_label": "Hour 2",
              "event": "Media helicopters are overhead. Press calls are flooding the Corporate Communications line. A radio station has put an angry commuter on air.",
              "financial_loss": 150000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 25,
              "operational_score_penalty": 5,
              "departments_activated": ["Corporate Communications / PR", "Customer Experience & Complaints"]
            },
            {
              "wave": 3,
              "time_label": "Hour 3",
              "event": "A vehicle is reported stranded in rising floodwater at Interchange 2. Emergency services have been called. The liability clock has started.",
              "financial_loss": 100000,
              "regulatory_score_penalty": 20,
              "reputation_score_penalty": 20,
              "operational_score_penalty": 10,
              "departments_activated": ["Traffic Management & Incident Response", "Compliance & Risk Management"]
            },
            {
              "wave": 4,
              "time_label": "Hour 5",
              "event": "JKR and JPJ have arrived on site. Your concession agreement response time SLA is now under review. Penalty clause exposure is being assessed.",
              "financial_loss": 300000,
              "regulatory_score_penalty": 30,
              "reputation_score_penalty": 5,
              "operational_score_penalty": 10,
              "departments_activated": ["Compliance & Risk Management", "Finance & Revenue Collection (Tolling)"]
            },
            {
              "wave": 5,
              "time_label": "Hour 8",
              "event": "Total toll revenue loss reaches RM 620K. Both alternative diversion routes are now at gridlock capacity.",
              "financial_loss": 620000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 10,
              "departments_activated": ["Finance & Revenue Collection (Tolling)", "Traffic Management & Incident Response"]
            },
            {
              "wave": 6,
              "time_label": "Day 1",
              "event": "The Ministry of Works has formally requested an incident report. An opposition politician has made a public statement about poor infrastructure maintenance.",
              "financial_loss": 200000,
              "regulatory_score_penalty": 15,
              "reputation_score_penalty": 15,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management", "Corporate Communications / PR"]
            }
          ],
          "recovery_levers": [
            {
              "id": "LOG01-L1",
              "label": "Deploy Flood Response Team",
              "description": "Activate flood SOP: deploy water pumps, road closure barriers, and diversion signage at all three interchanges immediately.",
              "war_chest_cost": 80000,
              "score_recovery": { "operational": 25, "regulatory": 10 },
              "waves_mitigated": [1, 4],
              "departments_required": ["Operations & Maintenance"],
              "if_department_missing": "Flood response equipment sits in depot — no team authorised to deploy without Operations."
            },
            {
              "id": "LOG01-L2",
              "label": "Real-Time Public Traffic Updates",
              "description": "Push live updates to Waze, radio traffic services, and official social media. Tell commuters exactly what is closed and what is open.",
              "war_chest_cost": 15000,
              "score_recovery": { "reputation": 20, "operational": 10 },
              "waves_mitigated": [1, 2],
              "departments_required": ["Corporate Communications / PR", "IT & Tolling Systems"],
              "if_department_missing": "No updates reach commuters — frustration compounds and media narrative worsens."
            },
            {
              "id": "LOG01-L3",
              "label": "Emergency Response to Stranded Vehicle",
              "description": "Dispatch emergency response unit to the stranded vehicle at Interchange 2 immediately — this is the top safety priority.",
              "war_chest_cost": 20000,
              "score_recovery": { "regulatory": 20, "reputation": 15 },
              "waves_mitigated": [3],
              "departments_required": ["Traffic Management & Incident Response"],
              "if_department_missing": "Incident response team unavailable — emergency services arrive without concessionaire support, increasing liability."
            },
            {
              "id": "LOG01-L4",
              "label": "Notify Concession Authority",
              "description": "Proactively notify JKR, JPJ, and Ministry of Works within 2 hours — before they arrive on site uninvited.",
              "war_chest_cost": 10000,
              "score_recovery": { "regulatory": 25 },
              "waves_mitigated": [4, 6],
              "departments_required": ["Compliance & Risk Management"],
              "if_department_missing": "Authorities arrive on site with no prior briefing — relationship and penalty exposure worsens."
            },
            {
              "id": "LOG01-L5",
              "label": "Structural Integrity Inspection",
              "description": "Engage structural engineers for a rapid post-flood inspection protocol. Required before reopening — demonstrates responsibility.",
              "war_chest_cost": 60000,
              "score_recovery": { "regulatory": 15, "operational": 15 },
              "waves_mitigated": [5, 6],
              "departments_required": ["Operations & Maintenance", "Compliance & Risk Management"],
              "if_department_missing": "Road reopened without inspection — creates future liability if further incidents occur."
            }
          ],
          "debrief_notes": "Key lesson: Highway concessionaires have layered obligations — public safety first, then regulatory (concession SLA), then reputation. Teams frequently prioritise media response over the stranded vehicle, which is a governance failure. The JKR/JPJ SLA wave surprises teams who assumed flooding is a force majeure exemption.",
          "debrief_template": "BIA_Infrastructure"
        },
        {
          "id": "LOG-02",
          "name": "Multi-Vehicle Accident — Major Expressway Closure",
          "severity": "Critical",
          "probability_weight": 3,
          "regulatory_flag": true,
          "reputation_flag": true,
          "war_chest_impact_label": "Potential RM 5–15M in liability, regulatory penalties, and reputational costs",
          "trigger_text": "A 14-vehicle pile-up involving two tanker lorries occurs at 7:30 AM on the northbound carriageway. Full closure activated. One tanker is on its side. Fuel is leaking onto the road surface. Emergency services are en route.",
          "threat_summary": "Major traffic accident with fuel spill, fatalities, and full carriageway closure during peak hour — multi-agency response, media, and legal liability.",
          "escalation_waves": [
            {
              "wave": 1,
              "time_label": "Hour 1",
              "event": "Full northbound closure is active. EMRS, BOMBA, and POLIS DIRAJA have been called. Hazmat protocol initiated for the fuel spill. 8 km of traffic backed up.",
              "financial_loss": 300000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 35,
              "departments_activated": ["Traffic Management & Incident Response", "Operations & Maintenance", "IT & Tolling Systems"]
            },
            {
              "wave": 2,
              "time_label": "Hour 2",
              "event": "Three fatalities confirmed. Next-of-kin notification process begins. Media vehicles have arrived. Camera crews are filming from the overhead bridge.",
              "financial_loss": 200000,
              "regulatory_score_penalty": 15,
              "reputation_score_penalty": 25,
              "operational_score_penalty": 5,
              "departments_activated": ["Corporate Communications / PR", "HR & Administration", "Compliance & Risk Management"]
            },
            {
              "wave": 3,
              "time_label": "Hour 3",
              "event": "Fuel spill confirmed as environmentally hazardous. Department of Environment (DOE) formally notified. Containment boom deployment required.",
              "financial_loss": 400000,
              "regulatory_score_penalty": 25,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 10,
              "departments_activated": ["Compliance & Risk Management", "Operations & Maintenance"]
            },
            {
              "wave": 4,
              "time_label": "Hour 5",
              "event": "Live TV coverage on two national channels. Corporate Communications is being pressed for a press conference. Every minute of silence is being noted.",
              "financial_loss": 100000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 30,
              "operational_score_penalty": 5,
              "departments_activated": ["Corporate Communications / PR"]
            },
            {
              "wave": 5,
              "time_label": "Hour 8",
              "event": "CEO issues formal public statement. Legal counsel has been engaged. Families of fatalities are being contacted by lawyers.",
              "financial_loss": 500000,
              "regulatory_score_penalty": 10,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management", "HR & Administration"]
            },
            {
              "wave": 6,
              "time_label": "Day 1",
              "event": "SPAD and Ministry of Transport have launched a formal incident investigation. Concession agreement penalty clause review is underway.",
              "financial_loss": 800000,
              "regulatory_score_penalty": 20,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management", "Finance & Revenue Collection (Tolling)"]
            }
          ],
          "recovery_levers": [
            {
              "id": "LOG02-L1",
              "label": "Activate Major Incident SOP",
              "description": "Establish a clear incident command structure immediately. Designate ONE authorised spokesperson. Brief all staff on communication protocol.",
              "war_chest_cost": 20000,
              "score_recovery": { "operational": 20, "reputation": 10 },
              "waves_mitigated": [1, 4],
              "departments_required": ["Traffic Management & Incident Response", "HR & Administration"],
              "if_department_missing": "No command structure — multiple staff speaking to media with conflicting information."
            },
            {
              "id": "LOG02-L2",
              "label": "Issue Authorised Public Statement",
              "description": "Release one authorised public statement within 60 minutes of the incident. Acknowledge, express concern, confirm agencies responding. No speculation.",
              "war_chest_cost": 15000,
              "score_recovery": { "reputation": 25 },
              "waves_mitigated": [2, 4],
              "departments_required": ["Corporate Communications / PR"],
              "if_department_missing": "Silence is interpreted as negligence. Media narrative fills the vacuum negatively."
            },
            {
              "id": "LOG02-L3",
              "label": "Fuel Spill Containment",
              "description": "Coordinate with BOMBA for hazmat response and deploy containment booms. Notify DOE proactively before they arrive on site.",
              "war_chest_cost": 100000,
              "score_recovery": { "regulatory": 25, "operational": 10 },
              "waves_mitigated": [3],
              "departments_required": ["Operations & Maintenance", "Compliance & Risk Management"],
              "if_department_missing": "Spill containment delayed — DOE finds environmental damage uncontrolled, penalties increase significantly."
            },
            {
              "id": "LOG02-L4",
              "label": "Diversion Route Management",
              "description": "Deploy mobile traffic management team to manage all active diversion routes. Coordinate with POLIS DIRAJA for traffic control support.",
              "war_chest_cost": 50000,
              "score_recovery": { "operational": 20, "reputation": 5 },
              "waves_mitigated": [1, 5],
              "departments_required": ["Traffic Management & Incident Response"],
              "if_department_missing": "Diversion routes are unmanaged — secondary gridlock forms and media reports compound congestion."
            },
            {
              "id": "LOG02-L5",
              "label": "Preserve Evidence for Investigation",
              "description": "Immediately preserve all CCTV footage, incident logs, tolling data, and maintenance records. Brief legal counsel before any regulatory interviews.",
              "war_chest_cost": 30000,
              "score_recovery": { "regulatory": 20 },
              "waves_mitigated": [5, 6],
              "departments_required": ["Compliance & Risk Management", "IT & Tolling Systems"],
              "if_department_missing": "Evidence chain compromised — investigation scope widens and liability exposure increases."
            }
          ],
          "debrief_notes": "Key lesson: This scenario tests whether teams understand the hierarchy of obligations — safety and legal evidence preservation must happen simultaneously with public communications. Teams frequently hold off the public statement waiting for 'full information' — which causes the reputation penalty to compound. The DOE environmental wave is consistently underestimated.",
          "debrief_template": "BIA_Infrastructure"
        }
      ]
    },
    {
      "id": "MFG",
      "name": "Manufacturing & Supply Chain",
      "archetype": "Production continuity-driven, supplier-dependent, safety-critical in some sub-sectors",
      "sub_types": ["FMCG", "Industrial goods", "Electronics", "Food processing"],
      "archetype_modifiers": {
        "startup":    { "war_chest_multiplier": 0.5, "escalation_speed": 1.4, "regulatory_penalty_multiplier": 1.0 },
        "mid_market": { "war_chest_multiplier": 1.0, "escalation_speed": 1.0, "regulatory_penalty_multiplier": 1.0 },
        "enterprise": { "war_chest_multiplier": 1.7, "escalation_speed": 0.9, "regulatory_penalty_multiplier": 1.1 }
      },
      "war_chest_base": {
        "small":  400000,
        "medium": 1200000,
        "large":  3500000
      },
      "default_departments": [
        "Production & Operations",
        "Supply Chain & Procurement",
        "Quality Assurance & Control",
        "Finance & Cost Management",
        "Compliance & Risk Management",
        "Corporate Communications / PR",
        "HR & Administration",
        "Logistics & Distribution",
        "IT & Production Systems (SCADA/MES)"
      ],
      "scenarios": [
        {
          "id": "MFG-01",
          "name": "Key Supplier Sudden Shutdown",
          "severity": "High",
          "probability_weight": 4,
          "regulatory_flag": false,
          "reputation_flag": true,
          "war_chest_impact_label": "RM 800K–3M+ in lost production value and contract penalties depending on duration",
          "trigger_text": "Your sole supplier of a critical sub-component has just announced an immediate shutdown due to a labour dispute at their facility. No timeline for resolution. You have exactly 4 days of raw material inventory remaining on the production floor.",
          "threat_summary": "Single-source supplier failure causing production shutdown — no alternate supplier qualified, customer orders at risk.",
          "escalation_waves": [
            {
              "wave": 1,
              "time_label": "Day 1",
              "event": "Supply Chain team is calling every potential alternate supplier. None are immediately qualified. Production continues on reserves — 4 days left.",
              "financial_loss": 150000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 5,
              "operational_score_penalty": 20,
              "departments_activated": ["Supply Chain & Procurement", "Production & Operations"]
            },
            {
              "wave": 2,
              "time_label": "Day 2",
              "event": "Production rate reduced to 60% capacity. Major customer orders are at risk of missing delivery dates. Account managers are starting to receive calls.",
              "financial_loss": 400000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 15,
              "operational_score_penalty": 25,
              "departments_activated": ["Production & Operations", "Logistics & Distribution", "Finance & Cost Management"]
            },
            {
              "wave": 3,
              "time_label": "Day 3",
              "event": "Financial impact assessed: RM 1.1M in unfulfilled orders by end of this week alone. Finance is revising the monthly forecast downward.",
              "financial_loss": 1100000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 15,
              "departments_activated": ["Finance & Cost Management", "Supply Chain & Procurement"]
            },
            {
              "wave": 4,
              "time_label": "Day 4",
              "event": "Production halts on two lines. Raw material inventory exhausted. 120 production workers have no assigned tasks.",
              "financial_loss": 600000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 30,
              "departments_activated": ["Production & Operations", "HR & Administration"]
            },
            {
              "wave": 5,
              "time_label": "Day 7",
              "event": "A major customer cancels a RM 3.2M contract and sources from a competitor. Word is spreading in the industry about your supply reliability.",
              "financial_loss": 3200000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 25,
              "operational_score_penalty": 10,
              "departments_activated": ["Corporate Communications / PR", "Finance & Cost Management"]
            },
            {
              "wave": 6,
              "time_label": "Day 14",
              "event": "A new alternate supplier has been identified but requires a full 3-week qualification process before any material can be used in production.",
              "financial_loss": 800000,
              "regulatory_score_penalty": 0,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 15,
              "departments_activated": ["Supply Chain & Procurement", "Quality Assurance & Control"]
            }
          ],
          "recovery_levers": [
            {
              "id": "MFG01-L1",
              "label": "Emergency Dual-Sourcing Protocol",
              "description": "Activate emergency supplier search across your network and industry contacts. Engage a procurement specialist to fast-track identification.",
              "war_chest_cost": 80000,
              "score_recovery": { "operational": 20, "financial": 10 },
              "waves_mitigated": [1, 2],
              "departments_required": ["Supply Chain & Procurement"],
              "if_department_missing": "No one is authorised or resourced to run an emergency supplier search."
            },
            {
              "id": "MFG01-L2",
              "label": "Prioritise Remaining Stock",
              "description": "Immediately triage remaining inventory — allocate to highest-margin and most contractually-critical orders only. Freeze lower-priority production.",
              "war_chest_cost": 20000,
              "score_recovery": { "financial": 15, "operational": 10 },
              "waves_mitigated": [2, 3],
              "departments_required": ["Production & Operations", "Finance & Cost Management"],
              "if_department_missing": "Stock allocated on first-come-first-served basis — highest-value orders not protected."
            },
            {
              "id": "MFG01-L3",
              "label": "Proactive Customer Communication",
              "description": "Contact at-risk customers before they call you. Be honest about the timeline. Offer partial delivery or revised schedules. Protect the relationship.",
              "war_chest_cost": 15000,
              "score_recovery": { "reputation": 25 },
              "waves_mitigated": [2, 5],
              "departments_required": ["Corporate Communications / PR", "Logistics & Distribution"],
              "if_department_missing": "Customers discover the delay when their delivery fails to arrive — trust damage is significantly worse."
            },
            {
              "id": "MFG01-L4",
              "label": "Bridge Supply Negotiation",
              "description": "Negotiate a short-term component supply bridge with a competitor manufacturer or through a distributor. Higher cost but maintains production.",
              "war_chest_cost": 200000,
              "score_recovery": { "operational": 25, "financial": 5 },
              "waves_mitigated": [3, 4],
              "departments_required": ["Supply Chain & Procurement", "Finance & Cost Management"],
              "if_department_missing": "No budget authority to negotiate premium emergency supply terms without Finance sign-off."
            },
            {
              "id": "MFG01-L5",
              "label": "Fast-Track Supplier Qualification",
              "description": "Dedicate Quality and Procurement teams full-time to compress the 3-week qualification process. Accept higher initial QA costs to move faster.",
              "war_chest_cost": 100000,
              "score_recovery": { "operational": 20, "financial": 10 },
              "waves_mitigated": [6],
              "departments_required": ["Quality Assurance & Control", "Supply Chain & Procurement"],
              "if_department_missing": "Qualification timeline cannot be compressed — 3 weeks becomes 6 weeks."
            }
          ],
          "debrief_notes": "Key lesson: Single-source supplier dependency is the central lesson. Teams learn it the hard way when they realise no alternate lever works without a qualified supplier. The customer communication lever is consistently activated too late — after the customer has already called. The stock prioritisation decision (who gets the last components?) often generates the most debate in debrief.",
          "debrief_template": "BIA_Manufacturing"
        },
        {
          "id": "MFG-02",
          "name": "Factory Fire — Partial Production Facility Loss",
          "severity": "Critical",
          "probability_weight": 2,
          "regulatory_flag": true,
          "reputation_flag": true,
          "war_chest_impact_label": "RM 8M+ in direct asset loss; RM 500K–1.5M per week in lost production revenue",
          "trigger_text": "A fire breaks out in the raw materials storage area at 2:00 AM. BOMBA is on site and contains it within 3 hours — but one production hall is completely destroyed. The good news: no fatalities. The bad news: 45% of your production capacity is gone.",
          "threat_summary": "Fire destroys one production hall — 45% capacity loss, DOSH investigation, insurance claim, and customer supply impact.",
          "escalation_waves": [
            {
              "wave": 1,
              "time_label": "Hour 3",
              "event": "Fire is contained. One production hall confirmed destroyed. RM 8M in equipment lost. Night shift staff are accounted for — no injuries.",
              "financial_loss": 8000000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 5,
              "operational_score_penalty": 40,
              "departments_activated": ["Production & Operations", "HR & Administration", "Finance & Cost Management"]
            },
            {
              "wave": 2,
              "time_label": "Hour 6",
              "event": "CEO and senior leadership on site. Insurance claim process initiated. DOSH (occupational safety authority) has been notified and is sending an inspector.",
              "financial_loss": 300000,
              "regulatory_score_penalty": 20,
              "reputation_score_penalty": 5,
              "operational_score_penalty": 10,
              "departments_activated": ["Compliance & Risk Management", "Finance & Cost Management"]
            },
            {
              "wave": 3,
              "time_label": "Day 2",
              "event": "Key customers notified of supply delays. Legal team reviewing force majeure clauses. Two customers are indicating they may invoke contract penalties.",
              "financial_loss": 500000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 20,
              "operational_score_penalty": 10,
              "departments_activated": ["Corporate Communications / PR", "Logistics & Distribution", "Compliance & Risk Management"]
            },
            {
              "wave": 4,
              "time_label": "Day 7",
              "event": "Insurance assessor on site. Preliminary estimate: 3–6 weeks for partial restoration. Production workers on two lines have no work assignment.",
              "financial_loss": 1000000,
              "regulatory_score_penalty": 10,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 10,
              "departments_activated": ["HR & Administration", "Finance & Cost Management"]
            },
            {
              "wave": 5,
              "time_label": "Day 14",
              "event": "DOSH investigation identifies a maintenance log gap from 6 months ago. Potential compliance violation. Fine and stop-work order possible.",
              "financial_loss": 400000,
              "regulatory_score_penalty": 25,
              "reputation_score_penalty": 10,
              "operational_score_penalty": 5,
              "departments_activated": ["Compliance & Risk Management", "Production & Operations"]
            },
            {
              "wave": 6,
              "time_label": "Day 30",
              "event": "An alternate production site has been shortlisted but requires a 2-week setup. A competitor approaches two of your major customers with a supply offer.",
              "financial_loss": 600000,
              "regulatory_score_penalty": 5,
              "reputation_score_penalty": 15,
              "operational_score_penalty": 10,
              "departments_activated": ["Production & Operations", "Supply Chain & Procurement", "Corporate Communications / PR"]
            }
          ],
          "recovery_levers": [
            {
              "id": "MFG02-L1",
              "label": "Trigger Insurance Claim Immediately",
              "description": "Initiate business interruption insurance claim on Day 1. Document all damage photographically before any clean-up begins. Brief your insurance broker.",
              "war_chest_cost": 30000,
              "score_recovery": { "financial": 30 },
              "waves_mitigated": [1, 4],
              "departments_required": ["Finance & Cost Management", "Compliance & Risk Management"],
              "if_department_missing": "Claim filed late or incompletely — insurance payout delayed or reduced."
            },
            {
              "id": "MFG02-L2",
              "label": "Activate Alternate Site Protocol",
              "description": "Identify and contract a third-party manufacturer or activate a secondary facility for partial production continuity while main site recovers.",
              "war_chest_cost": 250000,
              "score_recovery": { "operational": 30, "financial": 10 },
              "waves_mitigated": [4, 6],
              "departments_required": ["Production & Operations", "Supply Chain & Procurement"],
              "if_department_missing": "No alternate site can be contracted without Production team to specify requirements."
            },
            {
              "id": "MFG02-L3",
              "label": "Proactive Customer Communication",
              "description": "Contact all affected customers within 24 hours with a realistic recovery timeline. Honesty protects the relationship; silence invites contract penalties.",
              "war_chest_cost": 20000,
              "score_recovery": { "reputation": 25, "financial": 10 },
              "waves_mitigated": [3, 6],
              "departments_required": ["Corporate Communications / PR", "Logistics & Distribution"],
              "if_department_missing": "Customers informed only when delivery fails — relationship damage significantly greater."
            },
            {
              "id": "MFG02-L4",
              "label": "DOSH Proactive Engagement",
              "description": "Prepare a preliminary safety incident report and submit to DOSH proactively — before the inspector arrives. Demonstrate compliance commitment.",
              "war_chest_cost": 40000,
              "score_recovery": { "regulatory": 30 },
              "waves_mitigated": [2, 5],
              "departments_required": ["Compliance & Risk Management"],
              "if_department_missing": "DOSH inspector arrives to a company with no prepared documentation — worst possible impression."
            },
            {
              "id": "MFG02-L5",
              "label": "Employee Welfare & Trauma Support",
              "description": "Activate employee assistance programme for night shift staff and workers from the affected hall. Communicate clearly about pay continuity during downtime.",
              "war_chest_cost": 50000,
              "score_recovery": { "operational": 15, "reputation": 10 },
              "waves_mitigated": [4],
              "departments_required": ["HR & Administration"],
              "if_department_missing": "Staff are left without support or clear communication — morale deteriorates, informal social media posts appear."
            }
          ],
          "debrief_notes": "Key lesson: Insurance documentation must happen before clean-up, which feels counterintuitive under pressure. Teams frequently deploy Operations to clean up immediately, inadvertently destroying the evidence trail needed for the claim. The DOSH maintenance log wave is a surprise — it teaches teams that BCM also means keeping compliance records current, not just having a recovery plan.",
          "debrief_template": "BIA_Manufacturing"
        }
      ]
    }
  ],
  "global_defaults": {
    "score_starting_points": {
      "financial": 25,
      "regulatory": 25,
      "reputation": 25,
      "operational": 25
    },
    "scoring_weights": {
      "financial": 0.25,
      "regulatory": 0.25,
      "reputation": 0.25,
      "operational": 0.15,
      "recovery_turnaround": 0.10
    },
    "war_chest_bonus": {
      "per_100k_remaining_multiplier": 0.05,
      "applies_to_dimension": "financial"
    },
    "decision_window_default_seconds": 240,
    "inter_round_pause_seconds": 60,
    "recovery_sprint_window_seconds": 300,
    "max_teams_per_session": 10,
    "max_players_per_team": 6,
    "session_expiry_hours": 4
  },
  "debrief_templates": {
    "BIA_Financial_Services": {
      "document_title": "Business Impact Analysis — Financial Services",
      "sections": ["Company Profile", "Critical Functions", "Threat Assessment", "Impact Analysis Table", "Maximum Tolerable Downtime", "Recovery Priorities", "Gaps to Address"],
      "auto_fill_fields": ["company_name", "industry", "archetype", "departments_activated", "score_deductions", "levers_used", "levers_missed"],
      "blank_fields": ["actual_revenue_figures", "named_personnel", "system_asset_details", "vendor_contacts", "alternate_site_address"]
    },
    "BIA_Infrastructure": {
      "document_title": "Business Impact Analysis — Infrastructure / Concessionaire",
      "sections": ["Company Profile", "Critical Functions", "Regulatory Obligations", "Threat Assessment", "Impact Analysis Table", "Concession Agreement Dependencies", "Recovery Priorities", "Gaps to Address"],
      "auto_fill_fields": ["company_name", "industry", "archetype", "departments_activated", "score_deductions", "levers_used", "levers_missed", "regulatory_flags_triggered"],
      "blank_fields": ["actual_revenue_figures", "named_personnel", "concession_authority_contacts", "SLA_specific_terms", "alternate_site_address"]
    },
    "BIA_Manufacturing": {
      "document_title": "Business Impact Analysis — Manufacturing & Supply Chain",
      "sections": ["Company Profile", "Critical Functions", "Supplier Dependency Map", "Threat Assessment", "Impact Analysis Table", "Production Recovery Sequence", "Recovery Priorities", "Gaps to Address"],
      "auto_fill_fields": ["company_name", "industry", "archetype", "departments_activated", "score_deductions", "levers_used", "levers_missed"],
      "blank_fields": ["actual_revenue_figures", "named_personnel", "supplier_names_and_contacts", "alternate_site_address", "insurance_policy_details"]
    }
  }
}
```

---

## L — LOGIC
### Rules, constraints, and game mechanics

### L.1 — Session Architecture

```
- Each session has a unique 6-character alphanumeric code (e.g. BCM-4X7K)
- Host creates session → gets host dashboard URL + participant join URL + QR code
- Participants join via: scan QR code OR visit join URL and enter session code
- Session persists for duration of workshop (no login/account required)
- All state is held server-side; participants can rejoin if they lose connection
- Maximum 10 teams per session; maximum 6 players per team
```

### L.2 — Game Phases (in sequence)

```
PHASE 0 — LOBBY
  Host waits for all teams to join
  Participants see team waiting room with joined member count
  Host can see all teams live; starts game when ready

PHASE 1 — COMPANY SETUP (10 minutes suggested)
  Each team:
    1. Names their company
    2. Selects industry from dropdown (populated from scenario_database.json)
    3. Selects archetype: Startup / Mid-Market / Enterprise
    4. Reviews default departments (loaded from scenario_database.json);
       can rename, remove, or add (max 10 departments)
    5. Assigns each team member to a department role
    6. Sets headcount band: Small / Medium / Large
       (war chest auto-calculated from archetype_modifiers × war_chest_base)
  Host can see all teams' setup progress live
  Host advances everyone to Phase 2 when ready

PHASE 2 — THREAT BRIEFING (3 minutes)
  All teams receive the same disruption trigger_text simultaneously
  Displayed dramatically on screen — large text, red alert styling
  Teams have 3 minutes to discuss before first decision round begins
  No actions taken yet — observation and discussion only

PHASE 3 — SIMULATION ROUNDS (repeating)
  Each round corresponds to one escalation wave from the scenario data
  Round structure:
    a. ESCALATION EVENT displayed (wave event text — what has just gone wrong)
    b. DECISION WINDOW opens (countdown timer, default 4 minutes)
    c. Teams select recovery levers (only levers whose departments_required
       match the team's active department list are shown as available)
    d. Teams confirm war chest spend for selected levers
    e. Timer expires → all teams lock in simultaneously
    f. OUTCOME CALCULATED:
       — For each selected lever: if departments_required all present →
         apply score_recovery values and mark waves_mitigated
       — If a required department is missing → lever fails silently,
         spend is lost, show if_department_missing message in debrief
       — Apply wave penalties minus any mitigated amounts
       — Update war chest balance
       — Display round outcome narrative per team
    g. 60-second inter-round pause before next wave

  Rounds continue until all waves complete, war chest hits zero,
  or host manually ends the simulation

PHASE 4 — RECOVERY SPRINT (optional, host-enabled)
  After all waves: teams spend remaining war chest on recovery actions
  One final 5-minute decision window
  Goal: reduce total damage and improve recovery turnaround score

PHASE 5 — DEBRIEF & RESULTS
  Live leaderboard on host screen (projector-facing)
  Each team sees their own four-dimension scorecard
  Host triggers post-game template generation (see Output section)
  App holds on results screen during facilitator-led debrief discussion
```

### L.3 — Scoring Logic

```
Each team starts with 100 points across four dimensions:
  Financial Health:        25 points  (weight 25%)
  Regulatory Standing:     25 points  (weight 25%)
  Reputation Index:        25 points  (weight 25%)
  Operational Continuity:  25 points  (weight 15%)

Per wave: deduct penalty values from scenario data
Per lever activated correctly: restore score_recovery values
Scores floor at 0 (cannot go negative)

Archetype penalty multiplier (from scenario_database.json
archetype_modifiers.regulatory_penalty_multiplier):
  Applied only to regulatory dimension penalties

Recovery Turnaround Score (weight 10%):
  = (waves_where_at_least_one_lever_activated / total_waves) × 100

Final Resilience Score:
  = (financial × 0.25) + (regulatory × 0.25) + (reputation × 0.25)
    + (operational × 0.15) + (recovery_turnaround × 0.10)

War chest bonus (applied at end):
  For every RM 100,000 remaining in war chest:
  Add 5% to Financial dimension score (capped at 10 bonus points)
```

### L.4 — War Chest Logic

```
Starting war chest:
  base = scenario_database.industries[x].war_chest_base[headcount_band]
  multiplier = archetype_modifiers[archetype].war_chest_multiplier
  starting_war_chest = base × multiplier

Spending rules:
  — Cannot spend more than current balance (enforce on submission)
  — Lever spend deducted immediately on round lock-in
  — If lever fails due to missing department: spend still deducted
    (this teaches the dependency lesson — highlight in debrief)
  — Unspent war chest at end contributes to financial bonus score
```

### L.5 — Real-Time Sync

```
Technology: Node.js + Express + Socket.io

Socket event namespacing:
  game:*   — game state events (all clients)
  host:*   — host control events (host only)
  team:*   — team-specific events (filtered by team ID)

Key events:
  host:create_session     → server creates session, returns session code + URLs
  host:start_phase        → advances all clients to next phase
  host:trigger_wave       → starts a new escalation round
  host:pause / host:resume → freezes/resumes all timers
  host:extend_timer       → adds 120 seconds to current decision window
  host:broadcast_message  → pushes a text overlay to all participant screens
  host:generate_reports   → triggers post-game document generation
  team:submit_decisions   → team locks in lever selections + spend amounts
  game:phase_update       → broadcast to all: current phase + state
  game:round_outcome      → broadcast to all: scores after round resolution
  game:leaderboard_update → broadcast to all: updated rankings

Connection resilience:
  — On reconnect, server re-sends current game state to the reconnecting client
  — If participant reconnects after timer expired: decisions submitted as blank
  — If host reconnects: full session state restored from server memory

QR code:
  — Generate at session creation using qrcode npm package
  — Encode URL: https://{host-domain}/join/{session-code}
  — Serve as PNG endpoint: GET /session/{code}/qr.png
  — Display on host dashboard with download button
```

### L.6 — Post-Game Template Generation Logic

```
Triggered by host after Phase 5.
Generates one DOCX package per team using the docx npm package.
Host downloads a ZIP of all teams' packages using archiver npm package.

Each team package contains three documents:

DOCUMENT 1 — Business Impact Analysis (BIA) Pre-filled Template
  Template variant selected from scenario_database.debrief_templates
  based on the scenario played (debrief_template field on each scenario)

  AUTO-FILLED from game data:
    — Company name, industry name, archetype label
    — Department list with criticality ranking:
        Critical = activated in 3+ waves
        Important = activated in 1–2 waves
        Supporting = never activated
    — Top 3 identified threats: scenario name + threat_summary field
    — Impact Analysis Table (one row per dimension):
        Dimension | Starting Score | Points Lost | Final Score | Severity
    — Maximum Tolerable Downtime estimate:
        Derived from: first wave time_label where score dropped below 15
        on any single dimension
    — Recovery actions taken: list of lever labels used successfully
    — Recovery actions missed: list of lever labels not activated

  LEFT BLANK (grey shaded placeholder boxes):
    — Actual annual revenue figures
    — Named responsible personnel per department
    — Specific IT systems and asset inventory
    — Vendor and supplier contact details
    — Actual alternate site address

DOCUMENT 2 — Department Recovery Plan Draft
  One section per department that was activated during the scenario
  (departments_activated across all waves)

  AUTO-FILLED per department:
    — Department name and team member assigned to it
    — Waves where this department was needed
    — Recovery levers this department was required for
    — Whether those levers were successfully activated (yes/no)
    — Dependency list: other departments this department needed
    — Gap statement if lever failed due to missing department

  LEFT BLANK (grey shaded placeholder boxes):
    — Specific SOPs and step-by-step procedures
    — Named alternates and deputies
    — Escalation contact list
    — Vendor / supplier contacts
    — Recovery time objective (RTO) — actual target

DOCUMENT 3 — Resilience Scorecard Summary (1 page)
  Visual single-page summary formatted as a leave-behind

  CONTAINS:
    — Company name, scenario played, date
    — Four dimension score bars (visual, not just numbers)
    — Final Resilience Score (large, prominent)
    — Recovery Turnaround Score
    — War chest: started / spent / remaining
    — "What went well" — top 3 bullets (generated from levers successfully used)
    — "Gaps to address" — top 3 bullets (generated from levers missed or failed)
    — Footer: "Generated by Enablerz BCM Simulation | Enablerz Consulting & Solutions"

  FORMAT:
    — Branded header: Enablerz Consulting & Solutions
    — Page header on all pages: "CONFIDENTIAL — BCM Planning Document | [Company Name]"
    — Page footer: "Generated by Enablerz BCM Simulation | [Date]"
    — Grey shaded boxes for all blank fields
    — Approximately: BIA = 4–6 pages, Recovery Plan = 1–2 pages per dept, Scorecard = 1 page
    — Compatible with Microsoft Word 2016 and above
```

### L.7 — Facilitator Controls (Host Dashboard)

```
Available at any time during the simulation:
  — Pause simulation (freezes all timers across all clients)
  — Resume simulation
  — Extend current decision window (+2 minutes)
  — Skip current wave (advance without scoring — for demo or time management)
  — Broadcast message to all participant screens (text overlay)
  — Toggle leaderboard visibility on participant screens
  — Manually adjust a team's score (any dimension, with reason note logged)
  — End simulation early → proceed directly to debrief phase
  — Re-run simulation (reset scores; keep company setup; optionally change scenario)
```

### L.8 — No-Account Architecture

```
  — No user accounts, no login, no passwords
  — All session data lives in server memory only
  — Sessions expire 4 hours after creation or when host closes the dashboard
  — No personal data collected or stored beyond the session lifetime
  — Names entered during setup are ephemeral — lost on session expiry
  — PDPA/privacy compliant by design
```

---

## O — OUTPUT
### What to build and how

### O.1 — Folder Structure

```
bcm-simulation/
├── server/
│   ├── index.js                  # Express + Socket.io server entry point
│   ├── gameEngine.js             # All game logic, scoring, phase management
│   ├── templateGenerator.js      # Post-game DOCX document generation
│   └── data/
│       └── scenario_database.json  # ← SAVE THE JSON FROM I.4-DATA HERE FIRST
├── client/
│   ├── host/
│   │   ├── index.html            # Host dashboard
│   │   ├── host.js               # Host-side Socket.io client
│   │   └── host.css              # Host styling
│   ├── participant/
│   │   ├── index.html            # Participant game screen
│   │   ├── participant.js        # Participant-side Socket.io client
│   │   └── participant.css       # Participant styling
│   └── leaderboard/
│       ├── index.html            # Projector-safe leaderboard view
│       └── leaderboard.js        # Auto-refreshing leaderboard client
├── shared/
│   └── constants.js              # Shared game constants (phases, scoring weights)
├── package.json
├── .env.example
└── README.md
```

### O.2 — Tech Stack

```
Backend:   Node.js (v18+), Express, Socket.io
           docx (npm) — Word document generation
           qrcode (npm) — QR code generation
           archiver (npm) — ZIP bundling for team report downloads
Frontend:  Vanilla HTML / CSS / JavaScript
           No frontend framework — maximises compatibility on older mobile browsers
Storage:   In-memory only — no database required
Hosting:   localhost for facilitator's laptop (primary use case)
           Also deployable to Render / Railway / Heroku (see README)
```

### O.3 — UI/UX Requirements

```
HOST DASHBOARD
  Layout: three-panel on laptop screen (13–15 inch minimum target)
    Left panel:   team list — live status per team
                  (Waiting / Setup in progress / Setup complete / In round / Submitted)
    Centre panel: current game phase display + all facilitator controls
    Right panel:  mini live leaderboard (all teams ranked by current score)
  Top bar:        session code (large) + QR code button + game clock/timer
  Colour scheme:  dark navy background (#1B3A5C), teal accents (#1A7A6E),
                  amber highlights (#E8A020)

PARTICIPANT SCREEN
  Mobile-first responsive layout (375px minimum width)
  Minimum font sizes: 16px body, 24px headings
  War chest balance: always visible in persistent sticky header
  Decision interface: large tap-friendly buttons (minimum 44px touch target)
  Countdown timer: prominent, shifts to amber at 60s remaining, red at 20s
  Score dashboard: visible between rounds, hidden during decision window
  Phase label: always shown at top of screen so participant knows where they are

LEADERBOARD SCREEN
  Designed for projection on large screen — high contrast, large text
  Teams ranked by current Resilience Score
  Show all four dimension scores + total resilience score per team
  Animate score bar changes after each round resolves
  Readable from 5 metres distance minimum

DISRUPTION EVENT DISPLAY
  Full-screen alert overlay when a new wave triggers
  Red/amber urgent visual treatment
  Trigger text: large, centred, bold
  Auto-dismisses after 15 seconds OR on host tap/click
  Optional: browser Audio API chime (host-toggleable, default off)

GENERAL RULES
  No page reloads required during the game (full Socket.io-driven SPA behaviour)
  Tested browsers: Chrome, Safari, Firefox — desktop and mobile
  Graceful degradation on slow connections: loading states, reconnect prompts
  All text in English (Malaysian English spelling conventions)
  No jargon on participant screens — use the plain-language labels from scenario data
```

### O.4 — README Requirements

```
README.md must contain these five sections:

1. QUICK START (facilitator runs this on the day):
   npm install
   npm start
   Open host dashboard: http://localhost:3000/host
   Share participant URL or project QR code
   Begin

2. NETWORK SETUP NOTE:
   For participants to join, either:
   (a) Everyone on same WiFi — share http://[your-laptop-IP]:3000/join
   (b) Mixed networks / public WiFi — deploy to public URL (see section 3)
   Include: how to find your laptop's local IP on Windows and Mac

3. FREE PUBLIC DEPLOYMENT (for mixed-network workshops):
   Step-by-step: deploy to Render.com free tier
   Estimated time: 10 minutes
   Result: a public URL participants join from any network or mobile data

4. ADDING NEW SCENARIOS:
   Document the scenario_database.json structure
   Show a minimal example of adding a new industry and scenario
   Confirm: no code changes needed — app loads JSON at runtime

5. CUSTOMISING BRANDING:
   Which CSS variables to change for colours
   Where to place the Enablerz logo file
   How to update the document footer text in templateGenerator.js
```

### O.5 — Build Sequence for Claude Code

```
Follow this order — each step depends on the previous:

1. Save scenario_database.json from I.4-DATA to server/data/
2. Create package.json with all dependencies
3. Build shared/constants.js (phase names, scoring weights, limits)
4. Build server/gameEngine.js — pure logic, no sockets, fully testable
5. Write unit tests for gameEngine scoring calculations
6. Build server/index.js — Express routes + Socket.io event wiring
7. Build client/host/ — host dashboard (most complex UI)
8. Build client/participant/ — participant screen (mobile-first)
9. Build client/leaderboard/ — projector view
10. Build server/templateGenerator.js — DOCX generation (depends on
    finalised game data structures from step 4)
11. Write README.md
12. End-to-end test: create session, 2 teams, complete one full scenario
```

### O.6 — Edge Cases to Handle

```
— Team submits no actions in a round:
    Apply full wave penalty with no lever mitigation
    Show "No actions taken" in that round's outcome narrative

— Team activates a lever without the required department:
    Lever fails silently during the round
    Spend is still deducted (teaches the dependency lesson)
    In debrief: show if_department_missing message for that lever

— Host refreshes browser mid-game:
    Server holds session state in memory
    Host reconnects by navigating to /host/{session-code}
    Full dashboard state restored

— Participant joins after game has already started:
    If team has open slot: joins as active team member, receives current state
    If team is full: joins as observer (read-only view, no decisions)

— All participants disconnect simultaneously:
    Game auto-pauses (server detects zero connected participants)
    Resumes when host reconnects and clicks Resume

— War chest hits zero mid-round:
    Team cannot select any further levers this round
    Game continues for that team but they receive full penalties for
    all remaining waves (cannot recover further)
    Show "War chest exhausted" banner on their screen

— Scenario has regulatory_flag: false:
    Regulatory dimension still exists in scoring
    But no waves will carry regulatory penalties for that scenario
    Regulatory dimension will naturally stay at 25 — reward for this in debrief
```

---

## APPENDIX — INDUSTRY REFERENCE

### Full industry category list (for future scenario database expansion)

| Code | Industry | Scope / Sub-types |
|------|----------|-------------------|
| FIN | Financial Services & Banking | Banks, insurance, fund managers, fintech |
| HLT | Healthcare & Pharmaceuticals | Hospitals, clinics, pharma manufacturers, medical devices |
| MFG | Manufacturing & Supply Chain | FMCG, industrial goods, electronics, food processing |
| RET | Retail & E-Commerce | Physical retail, online marketplaces, omni-channel |
| TEC | Technology & IT Services | SaaS, IT outsourcing, data centres, telcos |
| HOS | Hospitality & Tourism | Hotels, resorts, travel agencies, F&B groups |
| PRO | Property & Construction | Developers, contractors, property management |
| LOG | Logistics & Transportation | Freight, last-mile, ports, highway concessionaires, public transit |
| EDU | Education & Training | Universities, private colleges, corporate L&D providers |
| PSV | Professional Services | Legal, consulting, accounting, HR advisory |

### Standard default departments (all industries)

All industries share these two departments as fixed additions to their industry-specific defaults:
- **Corporate Communications / PR** — always present; role is critical in reputation management waves
- **Compliance & Risk Management** — always present; role is critical in all regulatory-flagged scenarios

---

*This document was structured using the C.O.I.L.O framework:*
*Context → Objective → Inputs → Logic → Output*
*"You don't need perfect prompts — just clearer ones."*

*Enablerz Consulting & Solutions — Internal Use Only*
