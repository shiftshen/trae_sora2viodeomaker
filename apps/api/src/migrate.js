import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

async function run() {
  const {
    MYSQL_HOST = "localhost",
    MYSQL_PORT = 3306,
    MYSQL_USER = "root",
    MYSQL_PASSWORD = "",
  } = process.env;
  const MYSQL_DB = process.env.MYSQL_DB || process.env.MYSQL_DATABASE || "videogeneration";
  const pool = await mysql.createPool({ host: MYSQL_HOST, port: Number(MYSQL_PORT), user: MYSQL_USER, password: MYSQL_PASSWORD, multipleStatements: true });
  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\``);
  await pool.query(`USE \`${MYSQL_DB}\``);
  const sqlPath = path.resolve(process.cwd(), "src", "db.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter((s) => s.length);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  await pool.end();
  console.log("migrations applied");
}

run().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
