import {
  mysqlTable,
  varchar,
  boolean,
  timestamp,
  text,
} from 'drizzle-orm/mysql-core'

/**
 * BetterAuth ユーザーテーブル
 */
export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isAdmin: boolean('is_admin').notNull().default(false),
})

/**
 * BetterAuth セッションテーブル
 */
export const session = mysqlTable('session', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 255 }),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

/**
 * BetterAuth アカウントテーブル（OAuthプロバイダー連携）
 */
export const account = mysqlTable('account', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * BetterAuth 検証テーブル（メール検証等）
 */
export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 36 }).notNull().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * 配信IDテーブル
 *
 * 配信用のIDと有効/無効のフラグ、現在のチャンネルを組で管理します
 */
export const broadcastIds = mysqlTable(
  'BroadcastIds',
  {
    id:
      varchar('id', { length: 36 })
        .notNull()
        .primaryKey(),
    isAvailable:
      boolean('is_available')
        .notNull(),
    currentChannelId:
      varchar('current_channel_id', { length: 21 }),
        // 循環参照のためコメントアウト
        //.references(() => channels.id, {
        //  onUpdate: 'cascade',
        //  onDelete: 'set null',
        //}),
    ownerId:
      varchar('owner_id', { length: 36 })
        .references(() => user.id, { onUpdate: 'cascade', onDelete: 'set null' }),
  }
);

/**
 * 配信チャンネルテーブル
 *
 * 配信ID毎に、複数の配信チャンネルを作れます
 * 配信チャンネルIDは視聴用URLに使用されます
 * チャンネル名と説明も追記できます
 */
export const channels = mysqlTable(
  'Channels',
  {
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
    requireAuth:
      boolean('require_auth')
        .notNull()
        .default(false),
  }
);

/**
 * 配信用トークンテーブル
 *
 * OBS等から配信する際に使用するBearerトークンを管理します
 */
export const broadcastTokens = mysqlTable(
  'BroadcastTokens',
  {
    id:
      varchar('id', { length: 36 })
        .notNull()
        .primaryKey(),
    broadcastId:
      varchar('broadcast_id', { length: 36 })
        .notNull()
        .references(() => broadcastIds.id, {
          onUpdate: 'cascade',
          onDelete: 'cascade',
        }),
    token:
      varchar('token', { length: 64 })
        .notNull()
        .unique(),
    name:
      varchar('name', { length: 255 })
        .notNull()
        .default('デフォルトトークン'),
    createdAt:
      timestamp('created_at')
        .notNull()
        .defaultNow(),
    lastUsedAt:
      timestamp('last_used_at'),
  }
);

