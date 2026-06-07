import fs from "fs";
import { uploadInvoice } from "../lib/api-client-react/src/generated/api";

async function main() {
  const file = new File([fs.readFileSync("./tax-invoice-format-2-tallyprime.jpg")], "tax-invoice-format-2-tallyprime.jpg", { type: "image/jpeg" });
  try {
    const result = await uploadInvoice({ file: file as any });
    console.log("OCR Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
