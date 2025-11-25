import mysql from "mysql2/promise";

function getPool() {
  const {
    MYSQL_HOST = "localhost",
    MYSQL_PORT = 3306,
    MYSQL_USER = "root",
    MYSQL_PASSWORD = "",
  } = process.env;
  const MYSQL_DB = process.env.MYSQL_DB || process.env.MYSQL_DATABASE || "videogeneration";
  return mysql.createPool({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

export { getPool };
