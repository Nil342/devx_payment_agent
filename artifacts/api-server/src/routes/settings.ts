import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { triggerAutopilotSoon } from "../agents/autopilot-agent";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);

  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }

  res.json(serialize(settings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);

  if (!settings) {
    [settings] = await db.insert(settingsTable).values({}).returning();
  }

  const allowed = ["approvalMode", "autoApproveThreshold", "cfoReviewThreshold", "managerReviewThreshold", "highRiskThreshold", "notificationsEnabled"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, settings.id)).returning();
  if (updated.approvalMode === "auto") triggerAutopilotSoon();
  res.json(serialize(updated));
});

function serialize(s: typeof settingsTable.$inferSelect) {
  return {
    ...s,
    autoApproveThreshold: Number(s.autoApproveThreshold),
    cfoReviewThreshold: Number(s.cfoReviewThreshold),
    managerReviewThreshold: Number(s.managerReviewThreshold),
    highRiskThreshold: Number(s.highRiskThreshold),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export default router;
