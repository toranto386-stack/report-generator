import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  REPORT_TIMEZONE: z.string().default("Asia/Kolkata"),
  SCHEDULER_SECRET: z.string().min(12),
  JWT_SECRET: z.string().min(24),
  ADMIN_EMAIL: z.string().email().default("admin@pathpilot.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_WHATSAPP_FROM: z.string().optional().default(""),
  SEND_WHATSAPP: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_SECURE: z.coerce.boolean().optional().default(false),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("")
});

export const env = envSchema.parse(process.env);
