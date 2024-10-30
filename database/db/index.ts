import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// Next.js開発環境のホットリロードが多数行われると
// Too many connectionsエラーが発生するのを回避する

declare global {
  var _db: ReturnType<typeof drizzle> | undefined;
}

export const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const db = globalThis._db || drizzle(connection);
globalThis._db = db;

export { db }

