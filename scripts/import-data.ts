import * as schema from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

async function importData() {
  const { db } = await import("../server/db");
  
  const exportDir = path.join(process.cwd(), "data-export");
  const fullExportPath = path.join(exportDir, "full-export.json");

  if (!fs.existsSync(fullExportPath)) {
    console.error(`Export file not found: ${fullExportPath}`);
    console.error("Run 'npx tsx scripts/export-data.ts' first to export data.");
    process.exit(1);
  }

  console.log("Importing database data...");

  const exportData = JSON.parse(fs.readFileSync(fullExportPath, "utf-8"));

  const importOrder = [
    { name: "companies", table: schema.companies },
    { name: "users", table: schema.users },
    { name: "stageTemplates", table: schema.stageTemplates },
    { name: "projects", table: schema.projects },
    { name: "products", table: schema.products },
    { name: "stages", table: schema.stages },
    { name: "stageFiles", table: schema.stageFiles },
    { name: "tasks", table: schema.tasks },
    { name: "comments", table: schema.comments },
  ];

  for (const { name, table } of importOrder) {
    const data = exportData[name];
    if (!data || data.length === 0) {
      console.log(`  Skipping ${name} (no data)`);
      continue;
    }

    try {
      console.log(`  Importing ${name}...`);
      
      for (const record of data) {
        try {
          await db.insert(table).values(record).onConflictDoNothing();
        } catch (insertError: any) {
          console.warn(`    Warning: Could not insert record in ${name}: ${insertError.message}`);
        }
      }
      
      console.log(`    Imported ${data.length} records`);
    } catch (error: any) {
      console.error(`    Error importing ${name}: ${error.message}`);
    }
  }

  console.log("\nImport complete!");
  process.exit(0);
}

importData().catch(console.error);
