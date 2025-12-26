import * as fs from "fs";
import * as path from "path";

async function importFromSQL() {
  const { pool } = await import("../server/db");
  
  const sqlPath = path.join(process.cwd(), "data-export", "database.sql");

  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    console.error("Run 'npx tsx scripts/export-sql.ts' on source Replit first.");
    process.exit(1);
  }

  console.log("Importing database from SQL...");
  console.log(`Reading: ${sqlPath}`);

  const sql = fs.readFileSync(sqlPath, "utf-8");
  
  // Split into individual statements
  const statements = sql
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements`);

  const client = await pool.connect();
  
  try {
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await client.query(statement);
        successCount++;
        
        if ((i + 1) % 100 === 0) {
          console.log(`  Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error: any) {
        // Ignore duplicate key errors
        if (!error.message.includes('duplicate key')) {
          console.warn(`  Warning at statement ${i + 1}: ${error.message.substring(0, 100)}`);
        }
        errorCount++;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Skipped/Errors: ${errorCount}`);
    
  } finally {
    client.release();
    await pool.end();
  }
  
  process.exit(0);
}

importFromSQL().catch(console.error);
