import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import * as schema from './schema'


export const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

export const db = drizzle(connection, { schema, mode: "default" });

