import { Router, type IRouter } from "express";
import { db, memoryEventsTable, vendorsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { writeMemoryEvent, searchMemoryEvents } from "../agents/memory-agent";

const router: IRouter = Router();

router.get("/memory", async (req, res): Promise<void> => {
  const { vendorId, eventType } = req.query;

  const rows = await db
    .select({
      id: memoryEventsTable.id,
      vendorId: memoryEventsTable.vendorId,
      vendorName: vendorsTable.name,
      invoiceId: memoryEventsTable.invoiceId,
      eventType: memoryEventsTable.eventType,
      content: memoryEventsTable.content,
      importance: memoryEventsTable.importance,
      tags: memoryEventsTable.tags,
      createdAt: memoryEventsTable.createdAt,
    })
    .from(memoryEventsTable)
    .leftJoin(vendorsTable, eq(memoryEventsTable.vendorId, vendorsTable.id))
    .orderBy(desc(memoryEventsTable.createdAt));

  let filtered = rows;
  if (vendorId) filtered = filtered.filter((r) => r.vendorId === Number(vendorId));
  if (eventType) filtered = filtered.filter((r) => r.eventType === eventType);

  res.json(filtered.map(serialize));
});

router.post("/memory", async (req, res): Promise<void> => {
  const { vendorId, invoiceId, eventType, content, importance, tags } = req.body;
  if (!vendorId || !eventType || !content) {
    res.status(400).json({ error: "vendorId, eventType, content are required" });
    return;
  }

  await writeMemoryEvent({ vendorId: Number(vendorId), invoiceId: invoiceId ? Number(invoiceId) : undefined, eventType, content, importance: importance != null ? Number(importance) : undefined, tags });

  const [row] = await db
    .select({ id: memoryEventsTable.id, vendorId: memoryEventsTable.vendorId, vendorName: vendorsTable.name, invoiceId: memoryEventsTable.invoiceId, eventType: memoryEventsTable.eventType, content: memoryEventsTable.content, importance: memoryEventsTable.importance, tags: memoryEventsTable.tags, createdAt: memoryEventsTable.createdAt })
    .from(memoryEventsTable)
    .leftJoin(vendorsTable, eq(memoryEventsTable.vendorId, vendorsTable.id))
    .orderBy(desc(memoryEventsTable.createdAt))
    .limit(1);

  res.status(201).json(serialize(row));
});

router.post("/memory/search", async (req, res): Promise<void> => {
  const { query, vendorId, limit } = req.body;
  if (!query) { res.status(400).json({ error: "query is required" }); return; }

  const results = await searchMemoryEvents(query, vendorId ? Number(vendorId) : undefined, limit ? Number(limit) : 20);
  res.json(results.map(serialize));
});

function serialize(r: { id: number; vendorId: number; vendorName: string | null; invoiceId: number | null; eventType: string; content: string; importance: string | null; tags: string | null; createdAt: Date }) {
  return { ...r, importance: r.importance != null ? Number(r.importance) : null, createdAt: r.createdAt.toISOString() };
}

export default router;
