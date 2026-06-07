import { db, vendorsTable, invoicesTable, exceptionsTable, decisionsTable, memoryEventsTable, settingsTable } from "@workspace/db";
import { logger } from "../../artifacts/api-server/src/lib/logger";

async function seed() {
  logger.info("Seeding database...");

  // Settings
  await db.delete(settingsTable);
  await db.insert(settingsTable).values({
    approvalMode: "hybrid",
    autoApproveThreshold: "50000",
    cfoReviewThreshold: "200000",
    managerReviewThreshold: "100000",
    highRiskThreshold: "70",
    notificationsEnabled: true,
  });

  // Clear existing
  await db.delete(memoryEventsTable);
  await db.delete(decisionsTable);
  await db.delete(exceptionsTable);
  await db.delete(invoicesTable);
  await db.delete(vendorsTable);

  // Vendors
  const [globalTech] = await db.insert(vendorsTable).values({
    name: "GlobalTech Solutions",
    contactEmail: "billing@globaltech.com",
    contactPhone: "+91-98765-43210",
    category: "Technology",
    status: "active",
    trustScore: "38",
    disputeRate: "42",
    totalInvoices: 28,
    totalAmount: "4850000",
    notes: "Recurring tax mismatch issues. Multiple disputed invoices in FY2024. High scrutiny required.",
  }).returning();

  const [swiftLog] = await db.insert(vendorsTable).values({
    name: "Swift Logistics",
    contactEmail: "accounts@swiftlog.in",
    contactPhone: "+91-87654-32109",
    category: "Logistics",
    status: "active",
    trustScore: "62",
    disputeRate: "18",
    totalInvoices: 45,
    totalAmount: "2340000",
    notes: "Frequent late deliveries. Payment terms often disputed.",
  }).returning();

  const [infraCore] = await db.insert(vendorsTable).values({
    name: "InfraCore Ltd",
    contactEmail: "finance@infracore.co.in",
    contactPhone: "+91-76543-21098",
    category: "Infrastructure",
    status: "active",
    trustScore: "94",
    disputeRate: "2",
    totalInvoices: 62,
    totalAmount: "9200000",
    notes: "Excellent track record. Preferred vendor for infrastructure projects.",
  }).returning();

  const [nexaCloud] = await db.insert(vendorsTable).values({
    name: "NexaCloud Services",
    contactEmail: "billing@nexacloud.io",
    contactPhone: "+91-65432-10987",
    category: "Cloud Services",
    status: "active",
    trustScore: "78",
    disputeRate: "8",
    totalInvoices: 18,
    totalAmount: "1560000",
    notes: "New vendor. Moderate history so far.",
  }).returning();

  const [mediaPro] = await db.insert(vendorsTable).values({
    name: "MediaPro Agency",
    contactEmail: "ops@mediapro.in",
    contactPhone: "+91-54321-09876",
    category: "Marketing",
    status: "review",
    trustScore: "51",
    disputeRate: "25",
    totalInvoices: 12,
    totalAmount: "780000",
    notes: "Under review. Recent disputes on service delivery.",
  }).returning();

  // ─── GlobalTech Invoices (high risk pattern) ──────────────────────────────
  const gtInvoices = await db.insert(invoicesTable).values([
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-001", invoiceDate: "2024-03-14", dueDate: "2024-04-14", amount: "320000", taxAmount: "57600", paymentTerms: "Net 30", description: "Software licensing Q1 2024", status: "approved", riskLevel: "high", riskScore: "82" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-002", invoiceDate: "2024-04-22", dueDate: "2024-05-22", amount: "185000", taxAmount: "33300", paymentTerms: "Net 30", description: "Cloud infrastructure setup", status: "flagged", riskLevel: "medium", riskScore: "58" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-003", invoiceDate: "2024-06-02", dueDate: "2024-07-02", amount: "425000", taxAmount: "76500", paymentTerms: "Net 45", description: "Annual maintenance contract", status: "approved", riskLevel: "high", riskScore: "79" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-004", invoiceDate: "2024-07-18", dueDate: "2024-08-18", amount: "210000", taxAmount: "37800", paymentTerms: "Net 30", description: "Hardware procurement", status: "rejected", riskLevel: "high", riskScore: "88" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-005", invoiceDate: "2024-08-09", dueDate: "2024-09-09", amount: "380000", taxAmount: "68400", paymentTerms: "Net 30", description: "IT consulting services Q3", status: "flagged", riskLevel: "high", riskScore: "85" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-006", invoiceDate: "2024-09-30", dueDate: "2024-10-30", amount: "155000", taxAmount: "27900", paymentTerms: "Net 30", description: "Security audit", status: "approved", riskLevel: "medium", riskScore: "52" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2024-007", invoiceDate: "2024-11-15", dueDate: "2024-12-15", amount: "290000", taxAmount: "52200", paymentTerms: "Net 30", description: "Software development milestone 2", status: "flagged", riskLevel: "high", riskScore: "78" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2025-001", invoiceDate: "2025-01-20", dueDate: "2025-02-20", amount: "280000", taxAmount: "50400", paymentTerms: "Net 30", description: "Q1 2025 software license renewal", status: "pending", riskLevel: "high", riskScore: "81" },
    { vendorId: globalTech.id, invoiceNumber: "GT-2025-002", invoiceDate: "2025-05-28", dueDate: "2025-06-28", amount: "350000", taxAmount: "63000", paymentTerms: "Net 30", description: "Cloud migration services - Q2", status: "pending", riskLevel: "high", riskScore: "87" },
  ]).returning();

  // ─── Swift Logistics ──────────────────────────────────────────────────────
  const slInvoices = await db.insert(invoicesTable).values([
    { vendorId: swiftLog.id, invoiceNumber: "SL-2024-011", invoiceDate: "2024-04-05", dueDate: "2024-05-05", amount: "48000", taxAmount: "8640", paymentTerms: "Net 30", description: "April freight charges", status: "approved", riskLevel: "low", riskScore: "22" },
    { vendorId: swiftLog.id, invoiceNumber: "SL-2024-012", invoiceDate: "2024-05-12", dueDate: "2024-06-12", amount: "62000", taxAmount: "11160", paymentTerms: "Net 30", description: "May logistics — oversize shipment", status: "flagged", riskLevel: "medium", riskScore: "48" },
    { vendorId: swiftLog.id, invoiceNumber: "SL-2024-013", invoiceDate: "2024-07-08", dueDate: "2024-08-08", amount: "35000", taxAmount: "6300", paymentTerms: "Net 30", description: "July warehousing", status: "approved", riskLevel: "low", riskScore: "18" },
    { vendorId: swiftLog.id, invoiceNumber: "SL-2024-014", invoiceDate: "2024-09-25", dueDate: "2024-10-25", amount: "92000", taxAmount: "16560", paymentTerms: "Net 45", description: "Q3 consolidated freight", status: "approved", riskLevel: "medium", riskScore: "44" },
    { vendorId: swiftLog.id, invoiceNumber: "SL-2024-015", invoiceDate: "2024-11-30", dueDate: "2024-12-30", amount: "78000", taxAmount: "14040", paymentTerms: "Net 30", description: "Year-end logistics", status: "approved", riskLevel: "low", riskScore: "28" },
    { vendorId: swiftLog.id, invoiceNumber: "SL-2025-001", invoiceDate: "2025-02-14", dueDate: "2025-03-14", amount: "55000", taxAmount: "9900", paymentTerms: "Net 30", description: "February freight", status: "pending", riskLevel: "low", riskScore: "25" },
  ]).returning();

  // ─── InfraCore ────────────────────────────────────────────────────────────
  const icInvoices = await db.insert(invoicesTable).values([
    { vendorId: infraCore.id, invoiceNumber: "IC-2024-031", invoiceDate: "2024-02-01", dueDate: "2024-03-01", amount: "850000", taxAmount: "153000", paymentTerms: "Net 30", description: "Data center construction phase 1", status: "approved", riskLevel: "low", riskScore: "12" },
    { vendorId: infraCore.id, invoiceNumber: "IC-2024-032", invoiceDate: "2024-04-15", dueDate: "2024-05-15", amount: "620000", taxAmount: "111600", paymentTerms: "Net 30", description: "Phase 2 — networking", status: "approved", riskLevel: "low", riskScore: "10" },
    { vendorId: infraCore.id, invoiceNumber: "IC-2024-033", invoiceDate: "2024-06-30", dueDate: "2024-07-30", amount: "430000", taxAmount: "77400", paymentTerms: "Net 30", description: "Power systems upgrade", status: "approved", riskLevel: "low", riskScore: "8" },
    { vendorId: infraCore.id, invoiceNumber: "IC-2024-034", invoiceDate: "2024-09-10", dueDate: "2024-10-10", amount: "780000", taxAmount: "140400", paymentTerms: "Net 45", description: "Q3 maintenance and support", status: "approved", riskLevel: "low", riskScore: "11" },
    { vendorId: infraCore.id, invoiceNumber: "IC-2024-035", invoiceDate: "2024-12-01", dueDate: "2025-01-01", amount: "520000", taxAmount: "93600", paymentTerms: "Net 30", description: "Year-end infrastructure review", status: "approved", riskLevel: "low", riskScore: "9" },
    { vendorId: infraCore.id, invoiceNumber: "IC-2025-001", invoiceDate: "2025-03-01", dueDate: "2025-04-01", amount: "940000", taxAmount: "169200", paymentTerms: "Net 30", description: "New office buildout Q1", status: "approved", riskLevel: "low", riskScore: "14" },
    { vendorId: infraCore.id, invoiceNumber: "IC-2025-002", invoiceDate: "2025-05-15", dueDate: "2025-06-15", amount: "670000", taxAmount: "120600", paymentTerms: "Net 30", description: "Server room expansion", status: "pending", riskLevel: "low", riskScore: "10" },
  ]).returning();

  // ─── NexaCloud + MediaPro ─────────────────────────────────────────────────
  const ncInvoices = await db.insert(invoicesTable).values([
    { vendorId: nexaCloud.id, invoiceNumber: "NC-2024-001", invoiceDate: "2024-05-20", dueDate: "2024-06-20", amount: "125000", taxAmount: "22500", paymentTerms: "Net 30", description: "Cloud hosting Q2", status: "approved", riskLevel: "low", riskScore: "20" },
    { vendorId: nexaCloud.id, invoiceNumber: "NC-2024-002", invoiceDate: "2024-08-15", dueDate: "2024-09-15", amount: "145000", taxAmount: "26100", paymentTerms: "Net 30", description: "Storage expansion", status: "approved", riskLevel: "medium", riskScore: "35" },
    { vendorId: nexaCloud.id, invoiceNumber: "NC-2025-001", invoiceDate: "2025-04-10", dueDate: "2025-05-10", amount: "175000", taxAmount: "31500", paymentTerms: "Net 30", description: "Annual cloud subscription", status: "pending", riskLevel: "medium", riskScore: "42" },
  ]).returning();

  const mpInvoices = await db.insert(invoicesTable).values([
    { vendorId: mediaPro.id, invoiceNumber: "MP-2024-001", invoiceDate: "2024-06-01", dueDate: "2024-07-01", amount: "88000", taxAmount: "15840", paymentTerms: "Net 30", description: "Brand campaign June", status: "flagged", riskLevel: "medium", riskScore: "55" },
    { vendorId: mediaPro.id, invoiceNumber: "MP-2024-002", invoiceDate: "2024-10-18", dueDate: "2024-11-18", amount: "112000", taxAmount: "20160", paymentTerms: "Net 30", description: "Digital marketing Q4", status: "flagged", riskLevel: "high", riskScore: "72" },
    { vendorId: mediaPro.id, invoiceNumber: "MP-2025-001", invoiceDate: "2025-05-01", dueDate: "2025-06-01", amount: "95000", taxAmount: "17100", paymentTerms: "Net 30", description: "Social media retainer May", status: "pending", riskLevel: "medium", riskScore: "58" },
  ]).returning();

  // ─── Exceptions ───────────────────────────────────────────────────────────
  await db.insert(exceptionsTable).values([
    { vendorId: globalTech.id, invoiceId: gtInvoices[0].id, type: "tax_mismatch", description: "GST rate applied at 18% but contract specifies 12%. Discrepancy of ₹19,200.", severity: "high", resolved: true, resolvedAt: new Date("2024-04-02") },
    { vendorId: globalTech.id, invoiceId: gtInvoices[2].id, type: "tax_mismatch", description: "IGST applied instead of CGST+SGST. Tax code mismatch on ₹76,500 tax amount.", severity: "high", resolved: false },
    { vendorId: globalTech.id, invoiceId: gtInvoices[4].id, type: "duplicate", description: "Invoice GT-2024-005 appears to duplicate services billed in GT-2024-003. Amounts differ by 10%.", severity: "high", resolved: false },
    { vendorId: globalTech.id, invoiceId: gtInvoices[6].id, type: "dispute", description: "Vendor disputes payment delay. Claims services delivered 2 weeks prior to invoice date.", severity: "medium", resolved: false },
    { vendorId: globalTech.id, invoiceId: gtInvoices[3].id, type: "amount_discrepancy", description: "PO amount ₹195,000 vs invoice ₹210,000. Unexplained variance of ₹15,000.", severity: "high", resolved: true, resolvedAt: new Date("2024-09-01") },
    { vendorId: swiftLog.id, invoiceId: slInvoices[1].id, type: "late_delivery", description: "Shipment delivered 12 days past contracted SLA. Penalty clause applicable.", severity: "medium", resolved: true, resolvedAt: new Date("2024-06-20") },
    { vendorId: swiftLog.id, invoiceId: slInvoices[3].id, type: "dispute", description: "Disputed fuel surcharge added without prior agreement. ₹8,000 excess charge.", severity: "medium", resolved: false },
    { vendorId: mediaPro.id, invoiceId: mpInvoices[0].id, type: "service_dispute", description: "Campaign deliverables not met. Only 3 of 5 agreed assets delivered.", severity: "high", resolved: false },
    { vendorId: mediaPro.id, invoiceId: mpInvoices[1].id, type: "amount_discrepancy", description: "Invoice exceeds quoted price by ₹22,000 with no change order.", severity: "high", resolved: false },
    { vendorId: nexaCloud.id, invoiceId: ncInvoices[1].id, type: "late_delivery", description: "Storage provisioning delayed by 18 days impacting production deadline.", severity: "medium", resolved: true, resolvedAt: new Date("2024-09-30") },
  ]);

  // ─── Decisions ────────────────────────────────────────────────────────────
  await db.insert(decisionsTable).values([
    { invoiceId: gtInvoices[0].id, vendorId: globalTech.id, action: "cfo_review", reasoning: "GlobalTech has a pattern of tax mismatches. This invoice exceeds ₹2L threshold with 18% GST discrepancy. CFO sign-off required before processing.", madeBy: "agent", confidence: "88", agentVersion: "1.0.0" },
    { invoiceId: gtInvoices[2].id, vendorId: globalTech.id, action: "flag", reasoning: "IGST vs CGST+SGST mismatch detected. Third instance of tax code error from this vendor in 2024. Finance team review mandatory.", madeBy: "agent", confidence: "92", agentVersion: "1.0.0" },
    { invoiceId: gtInvoices[4].id, vendorId: globalTech.id, action: "reject", reasoning: "Duplicate invoice detected. Services described in GT-2024-005 overlap with GT-2024-003. Vendor must clarify before resubmission.", madeBy: "agent", confidence: "95", agentVersion: "1.0.0" },
    { invoiceId: slInvoices[0].id, vendorId: swiftLog.id, action: "approve", reasoning: "Standard freight invoice within auto-approve threshold. No anomalies detected. Clean vendor record for this amount range.", madeBy: "agent", confidence: "91", agentVersion: "1.0.0" },
    { invoiceId: slInvoices[3].id, vendorId: swiftLog.id, action: "manager_review", reasoning: "Disputed fuel surcharge requires manager approval. Amount ₹92,000 near manager threshold.", madeBy: "agent", confidence: "78", agentVersion: "1.0.0" },
    { invoiceId: icInvoices[0].id, vendorId: infraCore.id, action: "cfo_review", reasoning: "Amount ₹8.5L exceeds CFO threshold. InfraCore is a trusted vendor (94/100) — routine CFO sign-off for large capital expenditure.", madeBy: "agent", confidence: "96", agentVersion: "1.0.0" },
    { invoiceId: icInvoices[1].id, vendorId: infraCore.id, action: "cfo_review", reasoning: "Standard CFO review for amounts > ₹2L. InfraCore has excellent track record. Approved on review.", madeBy: "agent", confidence: "97", agentVersion: "1.0.0" },
    { invoiceId: mpInvoices[1].id, vendorId: mediaPro.id, action: "flag", reasoning: "Invoice exceeds PO by ₹22,000 without change order. Vendor under review status. Escalated to procurement.", madeBy: "agent", confidence: "84", agentVersion: "1.0.0" },
  ]);

  // ─── Memory Events ────────────────────────────────────────────────────────
  await db.insert(memoryEventsTable).values([
    // GlobalTech memory
    { vendorId: globalTech.id, invoiceId: gtInvoices[0].id, eventType: "tax_issue", content: "GlobalTech applied 18% GST on software services that qualify for 12% rate. Pattern: wrong GST rate on software licensing.", importance: "9", tags: "tax,gst,high_risk" },
    { vendorId: globalTech.id, invoiceId: gtInvoices[2].id, eventType: "tax_issue", content: "Second instance: IGST used for intra-state transaction. GlobalTech finance team seems unaware of GST rules for domestic transactions.", importance: "9", tags: "tax,igst,pattern" },
    { vendorId: globalTech.id, invoiceId: gtInvoices[4].id, eventType: "duplicate_detected", content: "Invoice GT-2024-005 submitted 45 days after GT-2024-003 for same services. Description changed but amounts within 10%. Classic duplicate pattern.", importance: "10", tags: "duplicate,high_risk,pattern" },
    { vendorId: globalTech.id, eventType: "vendor_pattern", content: "GlobalTech has now submitted 3 tax-mismatched invoices and 1 duplicate in 2024. Risk score elevated to HIGH. All future invoices require dual approval.", importance: "10", tags: "pattern,risk_update,policy" },
    { vendorId: globalTech.id, invoiceId: gtInvoices[6].id, eventType: "dispute_opened", content: "Vendor filed dispute claiming ₹55,000 late payment penalty. Our records show payment was delayed due to pending tax clarification.", importance: "8", tags: "dispute,penalty" },
    { vendorId: globalTech.id, eventType: "review_meeting", content: "Finance director meeting with GlobalTech CFO scheduled. Agenda: standardize GST codes, implement invoice pre-check process.", importance: "7", tags: "meeting,resolution" },

    // Swift Logistics memory
    { vendorId: swiftLog.id, invoiceId: slInvoices[1].id, eventType: "sla_breach", content: "Shipment SLA breached by 12 days. Vendor cited port congestion. Penalty clause invoked for ₹3,200.", importance: "6", tags: "sla,delivery,penalty" },
    { vendorId: swiftLog.id, invoiceId: slInvoices[3].id, eventType: "surcharge_dispute", content: "Unilateral fuel surcharge of ₹8,000 added to invoice without prior agreement. Escalated to vendor account manager.", importance: "7", tags: "surcharge,dispute,unauthorized" },
    { vendorId: swiftLog.id, eventType: "vendor_pattern", content: "SwiftLog has 3 SLA breaches and 2 unauthorized surcharges in 12 months. Payment terms review recommended at next contract renewal.", importance: "6", tags: "pattern,contract_review" },
    { vendorId: swiftLog.id, eventType: "payment_behavior", content: "SwiftLog consistently requests early payment incentives. Offers 2% discount for payment within 10 days. Finance team evaluating.", importance: "5", tags: "payment_terms,discount" },

    // InfraCore memory
    { vendorId: infraCore.id, invoiceId: icInvoices[0].id, eventType: "milestone_approval", content: "IC-2024-031 approved after CFO review. Data center Phase 1 milestone delivered on time and within budget. Exemplary execution.", importance: "8", tags: "milestone,approved,clean" },
    { vendorId: infraCore.id, eventType: "vendor_excellence", content: "InfraCore has zero disputes in 62 invoices over 3 years. Trust score at 94/100. Recommended for preferred vendor status.", importance: "9", tags: "excellence,preferred,clean" },
    { vendorId: infraCore.id, eventType: "contract_renewal", content: "Annual contract renewed at same rates. InfraCore requested 5% increase; negotiated to 2.5%. Both parties satisfied.", importance: "7", tags: "contract,renewal,negotiated" },

    // NexaCloud
    { vendorId: nexaCloud.id, invoiceId: ncInvoices[1].id, eventType: "delivery_delay", content: "Storage provisioning 18 days late. Root cause: supplier component shortage. One-time occurrence, vendor communicated proactively.", importance: "5", tags: "delay,communication" },
    { vendorId: nexaCloud.id, eventType: "vendor_onboarding", content: "NexaCloud onboarded in Q2 2024. Initial assessments positive. Monitoring closely for first 6 months as per policy.", importance: "6", tags: "onboarding,new_vendor" },

    // MediaPro
    { vendorId: mediaPro.id, invoiceId: mpInvoices[0].id, eventType: "delivery_dispute", content: "MediaPro delivered only 3 of 5 agreed campaign assets. Invoiced for 100% of contract value. Dispute raised for ₹35,200 proportional reduction.", importance: "8", tags: "dispute,partial_delivery,marketing" },
    { vendorId: mediaPro.id, invoiceId: mpInvoices[1].id, eventType: "overcharge", content: "MP-2024-002 overcharged by ₹22,000 vs PO. No change order filed. Vendor claims 'scope creep' — rejected without documentation.", importance: "9", tags: "overcharge,dispute,po_variance" },
    { vendorId: mediaPro.id, eventType: "vendor_review", content: "MediaPro placed under review status pending resolution of 2 active disputes totaling ₹57,200. No new POs until disputes resolved.", importance: "10", tags: "review,hold,disputes" },
  ]);

  logger.info("Seed complete!");
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
