import { hc } from 'hono/client'
import type { MediaAppType } from 'videmus-media-server'

const MEDIA_SERVER_URL = process.env.MEDIA_SERVER_URL ?? ''

export const mediaClient = hc<MediaAppType>(MEDIA_SERVER_URL)
