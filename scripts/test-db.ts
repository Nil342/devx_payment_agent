import { db, vendorsTable, invoicesTable } from "@workspace/db";

async function main() {
  try {
    const vendors = await db.select().from(vendorsTable);
    console.log("Vendors:", vendors.length);
    const invoices = await db.select().from(invoicesTable);
    console.log("Invoices:", invoices.length);
    process.exit(0);
  } catch (error) {
    console.error("DB Error:", error);
    process.exit(1);
  }
}

main();
