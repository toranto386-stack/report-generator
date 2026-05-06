import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export type GeminiReportCopy = {
  learnedSummary: string;
  focusActions: [string, string];
  encouragement: string;
  trajectory: string;
};

export async function generateReportCopy(prompt: string): Promise<GeminiReportCopy> {
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          learnedSummary: { type: Type.STRING },
          focusActions: {
            type: Type.ARRAY,
            minItems: 2,
            maxItems: 2,
            items: { type: Type.STRING }
          },
          encouragement: { type: Type.STRING },
          trajectory: { type: Type.STRING }
        },
        required: ["learnedSummary", "focusActions", "encouragement", "trajectory"]
      },
      temperature: 0.4
    }
  });

  const parsed = JSON.parse(response.text ?? "{}") as GeminiReportCopy;
  if (!Array.isArray(parsed.focusActions) || parsed.focusActions.length !== 2) {
    throw new Error("Gemini returned an invalid focusActions shape.");
  }
  return parsed;
}
