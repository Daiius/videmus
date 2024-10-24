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
    varchar('id', { length: 32 }).notNull().primaryKey(),
  isAvailable:
    boolean('is_avaiable').notNull()
});

