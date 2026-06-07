import { callGroqJson } from "./groq-client";
import type { OcrResult } from "./types";
import { logger } from "../lib/logger";

const SYSTEM_PROMPT = `You are an expert OCR and document parsing agent for financial invoices.
Extract structured data from invoice text or descriptions.
Always return valid JSON matching the exact schema requested.
If a field cannot be determined, return null for optional fields.
Amount should always be a number (no currency symbols).
Dates should be in YYYY-MM-DD format when possible.`;

export async function runOcrAgent(buffer: Buffer, mimetype: string): Promise<OcrResult> {
  logger.info("Running OCR agent with Gemini");
  const base64Data = buffer.toString("base64");
  
  const payload = {
    contents: [
      {
        parts: [
          { text: "Extract invoice data from this document and return EXACTLY this JSON structure. Do not return markdown, just the JSON string.\n{\n  \"vendorName\": \"string\",\n  \"invoiceNumber\": \"string\",\n  \"invoiceDate\": \"YYYY-MM-DD or null\",\n  \"dueDate\": \"YYYY-MM-DD or null\",\n  \"amount\": number,\n  \"taxAmount\": number or null,\n  \"paymentTerms\": \"string or null\",\n  \"rawText\": \"first 200 chars of original document\"\n}" },
          {
            inline_data: {
              mime_type: mimetype,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in the environment");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error({ err: text }, "Gemini API error");
    throw new Error(`Gemini API Error: ${text}`);
  }

  const data = await response.json() as any;
  const content = data.candidates[0].content.parts[0].text;
  
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const result = JSON.parse(cleaned) as OcrResult;
  logger.info({ vendorName: result.vendorName }, "OCR agent completed");
  return result;
}

export function parseManualEntry(data: {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  amount: number;
  taxAmount?: number;
  paymentTerms?: string;
}): OcrResult {
  return {
    vendorName: data.vendorName,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate ?? null,
    dueDate: data.dueDate ?? null,
    amount: data.amount,
    taxAmount: data.taxAmount ?? null,
    paymentTerms: data.paymentTerms ?? null,
    rawText: null,
  };
}
