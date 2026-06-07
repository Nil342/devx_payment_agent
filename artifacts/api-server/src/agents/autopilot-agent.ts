import { db, invoicesTable, memoryEventsTable, settingsTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { orchestrateInvoiceAnalysis } from "./orchestrator";

type AutopilotState = {
  running: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  processedTotal: number;
  currentInvoiceId: number | null;
};

const state: AutopilotState = {
  running: false,
  lastRunAt: null,
  lastError: null,
  processedTotal: 0,
  currentInvoiceId: null,
};

let timer: NodeJS.Timeout | null = null;
let queued = false;

export function startAutopilotAgent(): void {
  if (timer) return;
  timer = setInterval(() => {
    void runAutopilotCycle("interval");
  }, 8_000);
  void runAutopilotCycle("startup");
}

export function triggerAutopilotSoon(): void {
  if (queued) return;
  queued = true;
  setTimeout(() => {
    queued = false;
    void runAutopilotCycle("trigger");
  }, 250);
}

export async function getAutopilotStatus() {
  const [settings] = await db.select().from(settingsTable).limit(1);
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(eq(invoicesTable.status, "pending"));
  const [processing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(eq(invoicesTable.status, "processing"));

  return {
    ...state,
    mode: settings?.approvalMode ?? "hybrid",
    enabled: settings?.approvalMode === "auto",
    pendingInvoices: pending?.count ?? 0,
    processingInvoices: processing?.count ?? 0,
  };
}

async function runAutopilotCycle(reason: string): Promise<void> {
  if (state.running) return;

  const [settings] = await db.select().from(settingsTable).limit(1);
  if (settings?.approvalMode !== "auto") return;

  state.running = true;
  state.lastError = null;
  state.lastRunAt = new Date().toISOString();

  try {
    const pendingInvoices = await db
      .select({
        id: invoicesTable.id,
        vendorId: invoicesTable.vendorId,
        invoiceNumber: invoicesTable.invoiceNumber,
      })
      .from(invoicesTable)
      .where(inArray(invoicesTable.status, ["pending", "processing"]))
      .limit(5);

    logger.info({ reason, count: pendingInvoices.length }, "Autopilot cycle started");

    for (const invoice of pendingInvoices) {
      state.currentInvoiceId = invoice.id;

      const [claimed] = await db
        .update(invoicesTable)
        .set({ status: "processing", assignedReviewer: "AP Agent" })
        .where(and(eq(invoicesTable.id, invoice.id), inArray(invoicesTable.status, ["pending", "processing"])))
        .returning({ id: invoicesTable.id });

      if (!claimed) continue;

      await db.insert(memoryEventsTable).values({
        vendorId: invoice.vendorId,
        invoiceId: invoice.id,
        eventType: "autopilot_started",
        content: `Autopilot picked up invoice ${invoice.invoiceNumber} for real-time AP analysis.`,
        importance: "6",
        tags: "autopilot,automation",
      });

      try {
        await orchestrateInvoiceAnalysis(invoice.id);
        state.processedTotal += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown autopilot error";
        state.lastError = message;
        logger.error({ err, invoiceId: invoice.id }, "Autopilot invoice analysis failed");

        await db
          .update(invoicesTable)
          .set({ status: "flagged", assignedReviewer: "AP Ops" })
          .where(eq(invoicesTable.id, invoice.id));

        await db.insert(memoryEventsTable).values({
          vendorId: invoice.vendorId,
          invoiceId: invoice.id,
          eventType: "autopilot_error",
          content: `Autopilot could not complete invoice ${invoice.invoiceNumber}: ${message}`,
          importance: "8",
          tags: "autopilot,error,review",
        });
      }
    }
  } finally {
    state.currentInvoiceId = null;
    state.running = false;
    state.lastRunAt = new Date().toISOString();
  }
}
