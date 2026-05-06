import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { generateWeeklyReportForStudent, generateWeeklyReports } from "../services/reportGenerator.js";

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const reportQueue = new Queue("weekly-reports", { connection });

export type ReportJob =
  | { mode: "all"; weekStart: string; weekEnd: string }
  | { mode: "student"; studentId: string; weekStart: string; weekEnd: string };

export function startReportWorker() {
  return new Worker<ReportJob>(
    "weekly-reports",
    async (job) => {
      if (job.data.mode === "student") {
        return generateWeeklyReportForStudent(job.data.studentId, new Date(job.data.weekStart), new Date(job.data.weekEnd));
      }
      return generateWeeklyReports(new Date(job.data.weekStart), new Date(job.data.weekEnd));
    },
    { connection, concurrency: 5 }
  );
}
