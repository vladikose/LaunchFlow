import * as schema from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

async function exportToSQL() {
  const { db } = await import("../server/db");
  
  const exportDir = path.join(process.cwd(), "data-export");
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  console.log("Exporting database to SQL...");
  
  let sql = `-- LaunchFlow Database Export
-- Generated: ${new Date().toISOString()}
-- 
-- To import on new Replit:
-- 1. Create a new PostgreSQL database
-- 2. Run: npm run db:push
-- 3. Run: npx tsx scripts/import-sql.ts
--

`;

  const tables = [
    { name: "companies", table: schema.companies, query: () => db.select().from(schema.companies) },
    { name: "users", table: schema.users, query: () => db.select().from(schema.users) },
    { name: "stage_templates", table: schema.stageTemplates, query: () => db.select().from(schema.stageTemplates) },
    { name: "projects", table: schema.projects, query: () => db.select().from(schema.projects) },
    { name: "products", table: schema.products, query: () => db.select().from(schema.products) },
    { name: "stages", table: schema.stages, query: () => db.select().from(schema.stages) },
    { name: "stage_files", table: schema.stageFiles, query: () => db.select().from(schema.stageFiles) },
    { name: "tasks", table: schema.tasks, query: () => db.select().from(schema.tasks) },
    { name: "comments", table: schema.comments, query: () => db.select().from(schema.comments) },
  ];

  for (const { name, query } of tables) {
    try {
      console.log(`  Exporting ${name}...`);
      const data = await query();
      
      if (data.length === 0) {
        sql += `-- Table ${name}: no data\n\n`;
        continue;
      }

      sql += `-- Table: ${name} (${data.length} rows)\n`;
      
      for (const row of data) {
        const columns = Object.keys(row).filter(k => row[k] !== null && row[k] !== undefined);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val.toString();
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        sql += `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      
      sql += '\n';
      console.log(`    Exported ${data.length} records`);
    } catch (error: any) {
      console.error(`    Error exporting ${name}: ${error.message}`);
    }
  }

  // Reset sequences
  sql += `-- Reset sequences\n`;
  sql += `SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));\n`;
  sql += `SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));\n`;
  sql += `SELECT setval('stage_templates_id_seq', COALESCE((SELECT MAX(id) FROM stage_templates), 1));\n`;
  sql += `SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 1));\n`;
  sql += `SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1));\n`;
  sql += `SELECT setval('stages_id_seq', COALESCE((SELECT MAX(id) FROM stages), 1));\n`;
  sql += `SELECT setval('stage_files_id_seq', COALESCE((SELECT MAX(id) FROM stage_files), 1));\n`;
  sql += `SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1));\n`;
  sql += `SELECT setval('comments_id_seq', COALESCE((SELECT MAX(id) FROM comments), 1));\n`;

  const sqlPath = path.join(exportDir, "database.sql");
  fs.writeFileSync(sqlPath, sql);

  console.log(`\nExport complete!`);
  console.log(`SQL file: ${sqlPath}`);
  console.log(`\nTo migrate to new Replit:`);
  console.log(`1. Copy data-export folder to new project`);
  console.log(`2. Run: npm run db:push`);
  console.log(`3. Run: npx tsx scripts/import-sql.ts`);
  
  process.exit(0);
}

exportToSQL().catch(console.error);
