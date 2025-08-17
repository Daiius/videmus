import { 
  mysqlTable, 
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/mysql-core';

/**
 * 配信IDテーブル
 *
 * 配信用のIDと有効/無効のフラグ、現在のチャンネルを組で管理します
 */
export const broadcastIds = mysqlTable('BroadcastIds', {
  id: 
    varchar('id', { length: 36 })
      .notNull()
      .primaryKey(),
  isAvailable:
    boolean('is_available')
      .notNull(),
  currentChannelId:
    varchar('current_channel_id', { length: 21 })
      .references(() => channels.id, {
        onUpdate: 'cascade',
        onDelete: 'set null',
      }),
});

/**
 * 配信チャンネルテーブル
 *
 * 配信ID毎に、複数の配信チャンネルを作れます
 * 配信チャンネルIDは視聴用URLに使用されます
 * チャンネル名と説明も追記できます
 */
export const channels = mysqlTable('Channels', {
  id:
    varchar('id', { length: 21 })
      .notNull()
      .primaryKey(),
  broadcastId:
    varchar('broadcast_id', { length: 36 })
      .notNull()
      .references(() => broadcastIds.id, {
        onUpdate: 'cascade',
        onDelete: 'cascade',
      }),
  name:
    varchar('name', { length: 256 })
      .notNull()
      .default('チャンネル名'),
  description:
    varchar('description', { length: 1024 })
      .notNull()
      .default(''),
  createdTime:
    timestamp('created_time', { mode: 'date' })
      .notNull()
      .defaultNow(),
});

