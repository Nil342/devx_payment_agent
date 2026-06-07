import { callGroqJson } from "./groq-client";
import type { OcrResult } from "./types";
import { logger } from "../lib/logger";

const SYSTEM_PROMPT = `You are an expert OCR and document parsing agent for financial invoices.
Extract structured data from invoice text or descriptions.
Always return valid JSON matching the exact schema requested.
If a field cannot be determined, return null for optional fields.
Amount should always be a number (no currency symbols).
Dates should be in YYYY-MM-DD format when possible.`;

export async function runOcrAgent(rawText: string): Promise<OcrResult> {
  logger.info("Running OCR agent");

  const userPrompt = `Extract invoice data from this text and return JSON:

${rawText}

Return exactly this JSON structure:
{
  "vendorName": "string",
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "amount": number,
  "taxAmount": number or null,
  "paymentTerms": "string or null",
  "rawText": "first 200 chars of original text"
}`;

  const result = await callGroqJson<OcrResult>(SYSTEM_PROMPT, userPrompt);
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
