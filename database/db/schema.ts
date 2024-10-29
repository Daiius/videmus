import { 
  mysqlTable, 
  varchar,
  boolean,
} from 'drizzle-orm/mysql-core';

/**
 * 配信用のIDと有効/無効のフラグ 
 */
export const broadcastIds = mysqlTable('BroadcastIds', {
  id: 
    varchar('id', { length: 36 }).notNull().primaryKey(),
  isAvailable:
    boolean('is_available').notNull()
});

