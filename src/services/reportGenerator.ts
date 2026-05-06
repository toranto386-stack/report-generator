import { Prisma, ReportDeliveryStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { calculateProgressScore, summarizeMastery, WeeklySignals } from "./score.js";
import { generateReportCopy } from "./gemini.js";
import { sendWhatsApp } from "./whatsapp.js";

type StudentWithSignals = Prisma.StudentGetPayload<{
  include: {
    parent: true;
    attendances: true;
    assignments: true;
    doubts: true;
    milestones: true;
  };
}>;

export async function generateWeeklyReportForStudent(studentId: string, weekStart: Date, weekEnd: Date) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: true,
      attendances: { where: { sessionAt: { gte: weekStart, lte: weekEnd } } },
      assignments: { where: { submittedAt: { gte: weekStart, lte: weekEnd } } },
      doubts: { where: { openedAt: { gte: weekStart, lte: weekEnd } } },
      milestones: { where: { updatedAt: { lte: weekEnd } }, orderBy: { updatedAt: "desc" }, take: 3 }
    }
  });

  if (!student) throw new Error(`Student ${studentId} not found`);
  return createAndSendReport(student, weekStart, weekEnd);
}

export async function generateWeeklyReports(weekStart: Date, weekEnd: Date) {
  const students = await prisma.student.findMany({
    include: {
      parent: true,
      attendances: { where: { sessionAt: { gte: weekStart, lte: weekEnd } } },
      assignments: { where: { submittedAt: { gte: weekStart, lte: weekEnd } } },
      doubts: { where: { openedAt: { gte: weekStart, lte: weekEnd } } },
      milestones: { where: { updatedAt: { lte: weekEnd } }, orderBy: { updatedAt: "desc" }, take: 3 }
    }
  });

  const reports = [];
  for (const student of students) {
    reports.push(await createAndSendReport(student, weekStart, weekEnd));
  }
  return reports;
}

async function createAndSendReport(student: StudentWithSignals, weekStart: Date, weekEnd: Date) {
  const signals: WeeklySignals = {
    attendances: student.attendances,
    assignments: student.assignments,
    doubts: student.doubts,
    milestones: student.milestones
  };

  const score = hasWeeklySignals(signals)
    ? calculateProgressScore(signals)
    : baselineStudentScore(student.fullName, student.weekNumber);
  const { masteredTopics, needsWorkTopics } = summarizeMastery(signals);
  const copy = await reportCopy(student, signals, score, masteredTopics, needsWorkTopics);

  const report = await prisma.weeklyReport.upsert({
    where: { studentId_weekStart_weekEnd: { studentId: student.id, weekStart, weekEnd } },
    update: {
      score,
      learnedSummary: copy.learnedSummary,
      focusActions: copy.focusActions,
      encouragement: copy.encouragement,
      trajectory: copy.trajectory,
      masteredTopics,
      needsWorkTopics,
      deliveryStatus: ReportDeliveryStatus.DRAFT
    },
    create: {
      studentId: student.id,
      weekStart,
      weekEnd,
      weekNumber: student.weekNumber,
      score,
      learnedSummary: copy.learnedSummary,
      focusActions: copy.focusActions,
      encouragement: copy.encouragement,
      trajectory: copy.trajectory,
      masteredTopics,
      needsWorkTopics
    }
  });

  const message = formatReportMessage(student.fullName, student.weekNumber, score, copy);

  try {
    const studentSid = await sendWhatsApp(student.whatsappNumber, message);
    const parentSid = student.parent?.receiveReports
      ? await sendWhatsApp(student.parent.whatsappNumber, `Parent update for ${student.fullName}:\n\n${message}`)
      : null;

    return prisma.weeklyReport.update({
      where: { id: report.id },
      data: {
        deliveryStatus: ReportDeliveryStatus.SENT,
        studentMessageSid: studentSid,
        parentMessageSid: parentSid,
        sentAt: new Date()
      }
    });
  } catch (error) {
    return prisma.weeklyReport.update({
      where: { id: report.id },
      data: {
        deliveryStatus: ReportDeliveryStatus.FAILED,
        deliveryError: error instanceof Error ? error.message : "Unknown delivery error"
      }
    });
  }
}

async function reportCopy(
  student: StudentWithSignals,
  signals: WeeklySignals,
  score: number,
  masteredTopics: string[],
  needsWorkTopics: string[]
) {
  const prompt = [
    "You are a supportive education progress coach. Create a concise personalized weekly progress report.",
    "Do not be generic. Mention exact topics, behavior, and next actions from the data.",
    "Return only JSON.",
    JSON.stringify({
      student: { fullName: student.fullName, weekNumber: student.weekNumber },
      score,
      masteredTopics,
      needsWorkTopics,
      attendance: signals.attendances.map((item) => ({ topic: item.topic, present: item.present, minutes: item.minutes })),
      assignments: signals.assignments.map((item) => ({ title: item.title, topic: item.topic, score: item.score, maxScore: item.maxScore })),
      doubts: signals.doubts.map((item) => ({ topic: item.topic, question: item.question, status: item.status })),
      milestones: signals.milestones.map((item) => ({ title: item.title, progress: item.progress }))
    })
  ].join("\n");

  try {
    return await generateReportCopy(prompt);
  } catch {
    const learned = masteredTopics.length ? `You strengthened ${masteredTopics.join(", ")} this week.` : "You kept momentum by showing up in the weekly learning activities.";
    const focus = needsWorkTopics.length ? needsWorkTopics.slice(0, 2) : ["review missed sessions", "complete one project improvement"];
    return {
      learnedSummary: learned,
      focusActions: [`Practice ${focus[0]} with one worked example.`, `Ship one small task connected to ${focus[1] ?? focus[0]}.`] as [string, string],
      encouragement: `${student.fullName.split(" ")[0]}, your current score is ${score}/100 because your work shows real progress in the data. Keep the next step small and specific.`,
      trajectory: score >= 80 ? "on track" : score >= 60 ? "steady with clear next targets" : "needs focused support next week"
    };
  }
}

function hasWeeklySignals(signals: WeeklySignals) {
  return (
    signals.attendances.length > 0 ||
    signals.assignments.length > 0 ||
    signals.doubts.length > 0 ||
    signals.milestones.length > 0
  );
}

function baselineStudentScore(fullName: string, weekNumber: number) {
  const hash = Array.from(fullName.toLowerCase()).reduce((seed, char) => ((seed << 5) - seed + char.charCodeAt(0)) | 0, 0);
  const normalized = Math.abs(hash) % 26;
  const bonus = Math.min(10, Math.max(0, (weekNumber - 1) * 2));
  return Math.min(100, 60 + normalized + bonus);
}

function formatReportMessage(studentName: string, weekNumber: number, score: number, copy: Awaited<ReturnType<typeof reportCopy>>) {
  return `${studentName} - Week ${weekNumber} score: ${score}/100.\n\nThis week you learned: ${copy.learnedSummary}\n\nFocus next week:\n1. ${copy.focusActions[0]}\n2. ${copy.focusActions[1]}\n\n${copy.encouragement}`;
}
