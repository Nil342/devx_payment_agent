# Video Script

## Suggested Video Titles

- I Stopped Treating Invoices Like Stateless Prompts
- Why This AP Agent Needed Memory First
- How I Gave Invoice Routing a Memory Layer
- This Agent Remembers Vendor Mistakes
- Why Approval Agents Need Retain And Recall

## 3-Minute Demo Script

### 1. Quick Intro - 30 sec

**Narration**

Hi, I’m `[YOUR NAME]`, and I built an Accounts Payable agent that helps finance teams process invoices without re-investigating the same vendor issues every time.

The key idea is simple: instead of treating every invoice like a brand-new request, the system remembers vendor behavior, historical exceptions, previous approvals, and past resolutions, then uses that memory in the next decision.

**On Screen**

- Open the Dashboard in the app
- Briefly show the KPI cards, risk charts, and recent activity
- Point to `Dashboard`, `Invoice Inbox`, `Memory Explorer`, and `Decision Audit` in the sidebar

### 2. Show The Problem - 30 sec

**Narration**

Without memory, an invoice agent usually just looks at the current invoice and maybe a prompt template. That means the same vendor can trigger the same GST issue or approval exception over and over, and the system still behaves like it has never seen it before.

That’s not really automation. That’s repeated triage with nicer UI.

**On Screen**

- Open [orchestrator.ts](file:///c:/Users/theco/Desktop/Agent-Orchestration-Audit/Agent-Orchestration-Audit/artifacts/api-server/src/agents/orchestrator.ts)
- Highlight the call to `retrieveVendorMemory(...)`
- Briefly say: “This is the line that changes the system from stateless to memory-aware”

### 3. Live Demo - 2 min

**Narration**

Now I’ll show the flow end to end.

First, I go to the Invoice Inbox and add a new invoice. The app supports either manual entry or OCR-assisted upload.

Once the invoice is created, it lands in the backend as a pending invoice. From there, the system can pick it up through autopilot or I can trigger analysis directly.

The important part is what happens next. The orchestrator loads the invoice, loads the settings, and then pulls the vendor’s historical memory before doing risk analysis.

After that, the system calculates risk, applies routing policy, writes a decision, and stores a new memory event so the next similar invoice is easier to handle.

What I like about this flow is that policy stays deterministic, but judgment gets better over time because memory is part of the path.

**On Screen**

- Open the `Invoice Inbox`
- Click `Add Invoice`
- Enter or show a high-value invoice for an existing vendor
- Go to `Settings` and briefly show the thresholds:
  - Auto approve
  - Manager review
  - CFO review
  - High risk threshold
- Open [routing-agent.ts](file:///c:/Users/theco/Desktop/Agent-Orchestration-Audit/Agent-Orchestration-Audit/artifacts/api-server/src/agents/routing-agent.ts)
- Highlight the `cfo_review`, `manager_review`, and `approve` branches
- Open `Memory Explorer`
- Search for the vendor or related issue
- Open [memory-agent.ts](file:///c:/Users/theco/Desktop/Agent-Orchestration-Audit/Agent-Orchestration-Audit/artifacts/api-server/src/agents/memory-agent.ts)
- Highlight `writeMemoryEvent(...)` and `searchMemoryEvents(...)`
- Open `Decision Audit`
- Show the final reasoning, confidence, and action

**Optional Terminal / API Demo**

If you want one quick terminal moment, show:

```bash
POST /api/invoices
GET /api/memory?vendorId=...
GET /api/decisions?vendorId=...
```

Or show these backend route files:

- [invoices.ts](file:///c:/Users/theco/Desktop/Agent-Orchestration-Audit/Agent-Orchestration-Audit/artifacts/api-server/src/routes/invoices.ts)
- [memory.ts](file:///c:/Users/theco/Desktop/Agent-Orchestration-Audit/Agent-Orchestration-Audit/artifacts/api-server/src/routes/memory.ts)
- [decisions.ts](file:///c:/Users/theco/Desktop/Agent-Orchestration-Audit/Agent-Orchestration-Audit/artifacts/api-server/src/routes/decisions.ts)

### 4. Wrap Up - 30 sec

**Narration**

The main thing that surprised me is that the model was not the hard part. The hard part was building a memory path that the system could retain, query, and trust during routing.

Once that was in place, the AP agent stopped acting like a stateless prompt wrapper and started behaving like a system that actually learns from operational history.

That’s the big takeaway I’d keep for future agent work: memory is not an add-on. For repeated decisions, memory is the product.

## Recording Notes

- Replace `[YOUR NAME]` before recording
- Do not mention the competition in the recording
- If you publish a version tied to Hindsight, describe it as the memory backbone or retain/recall layer
- Add one screenshot of the dashboard and one screenshot of the memory explorer as cutaways if needed
