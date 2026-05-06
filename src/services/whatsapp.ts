import twilio from "twilio";
import { env } from "../config/env.js";

const client =
  env.SEND_WHATSAPP && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

export async function sendWhatsApp(to: string | null | undefined, body: string) {
  if (!env.SEND_WHATSAPP || !client || !to || !env.TWILIO_WHATSAPP_FROM) {
    return null;
  }

  const message = await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to,
    body
  });

  return message.sid;
}
