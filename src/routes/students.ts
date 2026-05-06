import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

export const studentsRouter = Router();

const studentSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  whatsappNumber: z.string().optional(),
  weekNumber: z.number().int().positive().default(1),
  parent: z
    .object({
      fullName: z.string().min(1),
      email: z.string().email().optional(),
      whatsappNumber: z.string().optional(),
      receiveReports: z.boolean().default(true)
    })
    .optional()
});

studentsRouter.post("/", async (req, res, next) => {
  try {
    const input = studentSchema.parse(req.body);
    const student = await prisma.student.upsert({
      where: { email: input.email },
      update: {
        fullName: input.fullName,
        whatsappNumber: input.whatsappNumber,
        weekNumber: input.weekNumber,
        parent: input.parent
          ? {
              upsert: {
                create: input.parent,
                update: input.parent
              }
            }
          : undefined
      },
      create: {
        fullName: input.fullName,
        email: input.email,
        whatsappNumber: input.whatsappNumber,
        weekNumber: input.weekNumber,
        parent: input.parent ? { create: input.parent } : undefined
      },
      include: { parent: true }
    });
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
});

studentsRouter.get("/", async (_req, res, next) => {
  try {
    const students = await prisma.student.findMany({ include: { parent: true }, orderBy: { createdAt: "desc" } });
    res.json(students);
  } catch (error) {
    next(error);
  }
});
