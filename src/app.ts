import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { ingestRouter } from "./routes/ingest.js";
import { reportsRouter } from "./routes/reports.js";
import { studentsRouter } from "./routes/students.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/students", studentsRouter);
app.use("/ingest", ingestRouter);
app.use("/reports", reportsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation error", issues: error.issues });
    return;
  }

  const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(statusCode).json({ error: message });
});
