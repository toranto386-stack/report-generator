import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_SECURE || false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!transporter || !env.SMTP_FROM) {
    return null;
  }

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return info.messageId;
}