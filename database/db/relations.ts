import { defineRelations } from 'drizzle-orm'
import {
  broadcastIds,
  channels,
} from './schema'

export const relations = defineRelations({ broadcastIds, channels })
