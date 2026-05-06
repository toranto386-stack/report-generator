import { Router } from "express";
import { prisma } from "../db/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    next(error);
  }
});
