import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { reportQueue } from "../queue/reportQueue.js";
import { generateWeeklyReportForStudent, generateWeeklyReports } from "../services/reportGenerator.js";
import { previousSundayWeek } from "../utils/week.js";
import { sendWhatsApp } from "../services/whatsapp.js";
import { sendEmail } from "../services/email.js";

export const reportsRouter = Router();

reportsRouter.get("/", async (_req, res, next) => {
  try {
    const reports = await prisma.weeklyReport.findMany({
      include: { student: { select: { fullName: true, email: true } } },
      orderBy: { generatedAt: "desc" }
    });
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

reportsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const report = await prisma.weeklyReport.findUnique({ where: { id } });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await prisma.weeklyReport.delete({ where: { id } });
    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/:id/send-whatsapp", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const report = await prisma.weeklyReport.findUnique({ where: { id }, include: { student: true } });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (!report.student.whatsappNumber) {
      return res.status(400).json({ error: "Student does not have a WhatsApp number" });
    }

    const reportText = generateReportText(report);
    const messageSid = await sendWhatsApp(report.student.whatsappNumber, reportText);

    if (messageSid) {
      await prisma.weeklyReport.update({
        where: { id },
        data: {
          deliveryStatus: "SENT",
          studentMessageSid: messageSid,
          sentAt: new Date()
        }
      });
      res.json({ message: "Report sent via WhatsApp", messageSid });
    } else {
      await prisma.weeklyReport.update({
        where: { id },
        data: {
          deliveryStatus: "FAILED",
          deliveryError: "WhatsApp sending disabled or failed"
        }
      });
      res.json({ message: "WhatsApp sending disabled" });
    }
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/generate", async (req, res, next) => {
  try {
    const input = z
      .object({
        studentId: z.string().optional(),
        studentName: z.string().optional(),
        email: z.string().email().optional(),
        whatsappNumber: z.string().optional(),
        weekStart: z.coerce.date().optional(),
        weekEnd: z.coerce.date().optional()
      })
      .parse(req.body);

    const range = input.weekStart && input.weekEnd ? { weekStart: input.weekStart, weekEnd: input.weekEnd } : previousSundayWeek();
    let reports;

    if (input.studentId) {
      reports = [await generateWeeklyReportForStudent(input.studentId, range.weekStart, range.weekEnd)];
    } else if (input.studentName) {
      const student = await findOrCreateStudentByName(input.studentName.trim(), input.email, input.whatsappNumber);
      reports = [await generateWeeklyReportForStudent(student.id, range.weekStart, range.weekEnd)];
    } else {
      reports = await generateWeeklyReports(range.weekStart, range.weekEnd);
    }

    res.status(201).json({ count: reports.length, reports });
  } catch (error) {
    next(error);
  }
});
reportsRouter.post("/:id/send-email", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    
    const report = await prisma.weeklyReport.findUnique({
      where: { id },
      include: { student: true }
    });
    
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    if (!report.student.email) {
      return res.status(400).json({ error: "Student does not have an email address" });
    }
    
    const reportText = generateReportText(report);
    const subject = `Weekly Progress Report - ${report.student.fullName} (Week ${report.weekNumber})`;
    const messageId = await sendEmail(report.student.email, subject, reportText);
    
    if (messageId) {
      await prisma.weeklyReport.update({
        where: { id },
        data: {
          deliveryStatus: "SENT",
          sentAt: new Date()
        }
      });
    } else {
      await prisma.weeklyReport.update({
        where: { id },
        data: {
          deliveryStatus: "FAILED",
          deliveryError: "Email sending disabled or failed"
        }
      });
    }
    
    res.json({ message: messageId ? "Report sent via email" : "Email sending disabled", messageId });
  } catch (error) {
    next(error);
  }
});

function generateReportText(report: any) {
  return `${report.student.fullName} - Week ${report.weekNumber} score: ${report.score}/100.\n\nThis week you learned: ${report.learnedSummary}\n\nFocus next week:\n${report.focusActions.map((action: string, i: number) => `${i + 1}. ${action}`).join('\n')}\n\n${report.encouragement}`;
}

async function findOrCreateStudentByName(studentName: string, email?: string, whatsappNumber?: string) {
  const exactMatch = await prisma.student.findFirst({
    where: { fullName: { equals: studentName, mode: "insensitive" } }
  });

  if (exactMatch) {
    return exactMatch;
  }

  const matches = await prisma.student.findMany({
    where: { fullName: { contains: studentName, mode: "insensitive" } },
    select: { id: true, fullName: true }
  });

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    const exactCaseMatch = matches.find((student) => student.fullName.toLowerCase() === studentName.toLowerCase());
    if (exactCaseMatch) {
      return exactCaseMatch;
    }
    throw new Error(`Multiple students matched '${studentName}'. Please use a more specific name.`);
  }

  return createStudentFromName(studentName, email, whatsappNumber);
}

function normalizeNameToSlug(fullName: string) {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "")
    .slice(0, 40);
}

async function createStudentFromName(fullName: string, email?: string, whatsappNumber?: string) {
  const slug = normalizeNameToSlug(fullName);
  const defaultEmail = email || `${slug || "student"}.${Date.now()}@example.com`;
  const defaultWhatsapp = whatsappNumber || `whatsapp:+919500${String(Math.floor(Math.random() * 900000) + 100000)}`;
  const parentName = `${fullName.split(" ")[0] || "Parent"} Parent`;

  return prisma.student.create({
    data: {
      fullName,
      email: defaultEmail,
      whatsappNumber: defaultWhatsapp,
      weekNumber: 1,
      parent: {
        create: {
          fullName: parentName,
          email: email ? email.replace("@", ".parent@") : `${normalizeNameToSlug(parentName)}.${Date.now()}@parent.example.com`,
          whatsappNumber: defaultWhatsapp.replace("9500", "9400"),
          receiveReports: true
        }
      }
    }
  });
}

reportsRouter.post("/run-sunday-scheduler", async (req, res, next) => {
  try {
    if (req.header("x-scheduler-secret") !== env.SCHEDULER_SECRET) {
      res.status(401).json({ error: "Invalid scheduler secret" });
      return;
    }
    const range = previousSundayWeek();
    const reports = await generateWeeklyReports(range.weekStart, range.weekEnd);
    res.status(201).json({ count: reports.length, reports });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/enqueue", async (req, res, next) => {
  try {
    if (req.header("x-scheduler-secret") !== env.SCHEDULER_SECRET) {
      res.status(401).json({ error: "Invalid scheduler secret" });
      return;
    }

    const input = z
      .object({
        studentId: z.string().optional(),
        weekStart: z.coerce.date().optional(),
        weekEnd: z.coerce.date().optional()
      })
      .parse(req.body);

    const range = input.weekStart && input.weekEnd ? { weekStart: input.weekStart, weekEnd: input.weekEnd } : previousSundayWeek();
    const job = await reportQueue.add(
      "generate",
      input.studentId
        ? { mode: "student", studentId: input.studentId, weekStart: range.weekStart.toISOString(), weekEnd: range.weekEnd.toISOString() }
        : { mode: "all", weekStart: range.weekStart.toISOString(), weekEnd: range.weekEnd.toISOString() },
      { attempts: 3, backoff: { type: "exponential", delay: 30000 }, removeOnComplete: 100, removeOnFail: 100 }
    );

    res.status(202).json({ queued: true, jobId: job.id });
  } catch (error) {
    next(error);
  }
});
