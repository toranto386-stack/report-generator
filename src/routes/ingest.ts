import { DoubtStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";

export const ingestRouter = Router();

const byEmail = z.object({ studentEmail: z.string().email() });

ingestRouter.post("/attendance", async (req, res, next) => {
  try {
    const input = byEmail
      .extend({
        sessionAt: z.coerce.date(),
        present: z.boolean(),
        minutes: z.number().int().nonnegative().default(0),
        topic: z.string().min(1)
      })
      .parse(req.body);

    const student = await requireStudent(input.studentEmail);
    const attendance = await prisma.attendance.create({
      data: { studentId: student.id, sessionAt: input.sessionAt, present: input.present, minutes: input.minutes, topic: input.topic }
    });
    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
});

ingestRouter.post("/assignment-score", async (req, res, next) => {
  try {
    const input = byEmail
      .extend({
        title: z.string().min(1),
        topic: z.string().min(1),
        score: z.number().nonnegative(),
        maxScore: z.number().positive(),
        submittedAt: z.coerce.date()
      })
      .parse(req.body);

    const student = await requireStudent(input.studentEmail);
    const assignment = await prisma.assignmentScore.create({
      data: {
        studentId: student.id,
        title: input.title,
        topic: input.topic,
        score: input.score,
        maxScore: input.maxScore,
        submittedAt: input.submittedAt
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

ingestRouter.post("/doubt", async (req, res, next) => {
  try {
    const input = byEmail
      .extend({
        question: z.string().min(1),
        topic: z.string().min(1),
        status: z.nativeEnum(DoubtStatus),
        openedAt: z.coerce.date(),
        resolvedAt: z.coerce.date().optional()
      })
      .parse(req.body);

    const student = await requireStudent(input.studentEmail);
    const doubt = await prisma.doubt.create({
      data: {
        studentId: student.id,
        question: input.question,
        topic: input.topic,
        status: input.status,
        openedAt: input.openedAt,
        resolvedAt: input.resolvedAt
      }
    });
    res.status(201).json(doubt);
  } catch (error) {
    next(error);
  }
});

ingestRouter.post("/project-milestone", async (req, res, next) => {
  try {
    const input = byEmail
      .extend({
        title: z.string().min(1),
        description: z.string().default(""),
        progress: z.number().int().min(0).max(100),
        dueDate: z.coerce.date()
      })
      .parse(req.body);

    const student = await requireStudent(input.studentEmail);
    const milestone = await prisma.projectMilestone.create({
      data: {
        studentId: student.id,
        title: input.title,
        description: input.description,
        progress: input.progress,
        dueDate: input.dueDate
      }
    });
    res.status(201).json(milestone);
  } catch (error) {
    next(error);
  }
});

async function requireStudent(email: string) {
  const student = await prisma.student.findUnique({ where: { email } });
  if (!student) {
    const error = new Error(`No student found for ${email}. Create the student first.`);
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
  return student;
}
