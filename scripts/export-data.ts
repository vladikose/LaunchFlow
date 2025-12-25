import * as schema from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

async function exportData() {
  const { db } = await import("../server/db");
  
  const exportDir = path.join(process.cwd(), "data-export");
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  console.log("Exporting database data...");

  const tables = [
    { name: "companies", query: () => db.select().from(schema.companies) },
    { name: "users", query: () => db.select().from(schema.users) },
    { name: "stageTemplates", query: () => db.select().from(schema.stageTemplates) },
    { name: "projects", query: () => db.select().from(schema.projects) },
    { name: "products", query: () => db.select().from(schema.products) },
    { name: "stages", query: () => db.select().from(schema.stages) },
    { name: "stageFiles", query: () => db.select().from(schema.stageFiles) },
    { name: "tasks", query: () => db.select().from(schema.tasks) },
    { name: "comments", query: () => db.select().from(schema.comments) },
  ];

  const exportData: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      console.log(`  Exporting ${table.name}...`);
      const data = await table.query();
      exportData[table.name] = data;
      
      const filePath = path.join(exportDir, `${table.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`    Exported ${data.length} records`);
    } catch (error: any) {
      console.error(`    Error exporting ${table.name}: ${error.message}`);
    }
  }

  const fullExportPath = path.join(exportDir, "full-export.json");
  fs.writeFileSync(fullExportPath, JSON.stringify(exportData, null, 2));

  console.log(`\nExport complete! Files saved to: ${exportDir}`);
  console.log(`Full export: ${fullExportPath}`);
  
  process.exit(0);
}

exportData().catch(console.error);
