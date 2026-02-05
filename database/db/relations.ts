import { defineRelations } from 'drizzle-orm'
import {
  user,
  session,
  account,
  verification,
  broadcastIds,
  channels,
  broadcastTokens,
} from './schema'

export const relations = defineRelations({
  user,
  session,
  account,
  verification,
  broadcastIds,
  channels,
  broadcastTokens,
})
