import Groq from "groq-sdk";
import { logger } from "../lib/logger";

if (!process.env.GROQ_API_KEY) {
  logger.warn("GROQ_API_KEY not set — AI features will be degraded");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  model = "llama-3.3-70b-versatile",
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function callGroqJson<T>(
  systemPrompt: string,
  userPrompt: string,
  model = "llama-3.3-70b-versatile",
): Promise<T> {
  const raw = await callGroq(
    systemPrompt + "\n\nRespond ONLY with valid JSON. No markdown, no explanation.",
    userPrompt,
    model,
  );
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}
