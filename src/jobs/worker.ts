import { startReportWorker } from "../queue/reportQueue.js";

const worker = startReportWorker();

worker.on("completed", (job) => {
  console.log(`Report job ${job.id} completed.`);
});

worker.on("failed", (job, error) => {
  console.error(`Report job ${job?.id} failed:`, error);
});

console.log("Weekly report worker is running.");
