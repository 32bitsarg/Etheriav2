import { Hono } from "hono";
import { requireMatecitoAuth } from "../infrastructure/authMiddleware.js";
import { prisma } from "@etheria/database";

export const tutorialRouter = new Hono();

const MAX_STEP = 4;

tutorialRouter.get("/step", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tutorialStep: true } });
  return c.json({ step: user?.tutorialStep ?? 0 });
});

tutorialRouter.post("/advance", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tutorialStep: true } });
  const current = user?.tutorialStep ?? 0;
  if (current >= MAX_STEP) return c.json({ step: current });
  const updated = await prisma.user.update({ where: { id: userId }, data: { tutorialStep: current + 1 } });
  return c.json({ step: updated.tutorialStep });
});

tutorialRouter.post("/complete", requireMatecitoAuth(), async (c) => {
  const userId = c.get("userId");
  const updated = await prisma.user.update({ where: { id: userId }, data: { tutorialStep: MAX_STEP } });
  return c.json({ step: updated.tutorialStep });
});
