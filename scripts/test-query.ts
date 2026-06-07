import { db, invoicesTable, vendorsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

async function main() {
  try {
    const rows = await db
      .select({ 
        id: invoicesTable.id, 
        status: invoicesTable.status, 
        riskLevel: invoicesTable.riskLevel, 
        amount: invoicesTable.amount, 
        vendorId: invoicesTable.vendorId, 
        vendorName: vendorsTable.name, 
        invoiceNumber: invoicesTable.invoiceNumber, 
        invoiceDate: invoicesTable.invoiceDate, 
        dueDate: invoicesTable.dueDate, 
        taxAmount: invoicesTable.taxAmount, 
        paymentTerms: invoicesTable.paymentTerms, 
        description: invoicesTable.description, 
        riskScore: invoicesTable.riskScore, 
        assignedReviewer: invoicesTable.assignedReviewer, 
        fileUrl: invoicesTable.fileUrl, 
        extractedData: invoicesTable.extractedData, 
        createdAt: invoicesTable.createdAt, 
        updatedAt: invoicesTable.updatedAt 
      })
      .from(invoicesTable)
      .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
      .orderBy(desc(invoicesTable.createdAt));
    console.log("Success! Returned rows:", rows.length);
  } catch (e) {
    console.error("Error executing query:", e);
  }
}
main();
