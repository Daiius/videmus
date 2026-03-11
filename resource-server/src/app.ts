import { Hono, type Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import { cors } from 'hono/cors'

import { getBroadcastingStatus } from './lib/getBroadcastingStatus'
import { postCurrentChannel } from './lib/postCurrentChannel'

import type { VidemusError } from './types'
import { postBroadcast } from './lib/postBroadcast'
import { getBroadcastsById } from './lib/getBroadcastsById'
import { postBroadcastChannelsCurrent } from './lib/postBroadcastsChannelsCurrent'
import { patchBroadcastsChannels } from './lib/patchBroadcastsChannels'
import { postBroadcastsChannels } from './lib/postBroadcastsChannels'
import { deleteBroadcastsChannels } from './lib/deleteBroadcastsChannels'

import { bearerAuth } from './middlewares'
import { mediaClient } from './lib/mediaClient'

const MEDIA_SERVER_URL = process.env.MEDIA_SERVER_URL;

export const app = new Hono()

const origin = process.env.CORS_ORIGINS?.split(',') ?? []
app.use('*', cors({
  origin,
  allowMethods: ['GET', 'POST', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

const handleError = <C extends Context>(c: C, error: VidemusError) => {
  switch (error.type) {
    case "ResourceNotFound":
      return c.text(error.message, 404) // 存在しないリソース
    case "NotAvailable":
      return c.text(error.message, 403) // 有効化前のリソースアクセス
    case "Unexpected":
      return c.text(error.message, 500)
  }
}

const route =
  /**
   * WHIP enriched proxy: DB検証後、X-Current-Channel-Id ヘッダ付きで Media Server に転送
   */
  app.post(
    '/whip/:id',
    async c => {
      const id = c.req.param('id')

      // DB検証
      const broadcast = await getBroadcastsById(id)
      if (broadcast == null) {
        return c.text(`resoures with id ${id} doesn't exist`, 404)
      }
      if (!broadcast.isAvailable) {
        return c.text(`resources with id ${id} is not avaliable yet`, 403)
      }
      const currentChannelId = broadcast.currentChannelId
      if (currentChannelId == null) {
        return c.text(`current channel id is not set`, 404)
      }

      // Media Server に転送、X-Current-Channel-Id ヘッダ付き
      const headers = new Headers(c.req.raw.headers)
      headers.set('X-Current-Channel-Id', currentChannelId)
      const res = await fetch(`${MEDIA_SERVER_URL}/whip/${id}`, {
        method: 'POST',
        headers,
        body: await c.req.text(),
      })
      return new Response(res.body, { status: res.status, headers: res.headers })
    },
  )
  /**
   * 配信停止: Media Server に RPC
   */
  .delete(
    '/whip/test-broadcast/:id',
    async c => {
      const id = c.req.param('id')
      const res = await mediaClient.whip['test-broadcast'][':id'].$delete({ param: { id } })
      return c.text(await res.text(), res.status as any)
    },
  )
  /**
   * 配信の状況（開始・停止）と視聴者数の目安を返します
   * 配信者IDを引数にとる、つまり配信者向けのAPIエンドポイントです
   * ハイブリッド: DB確認 + Media Server 問い合わせ
   */
  .get(
    '/broadcasting-status/:broadcastId',
    async c => {
      const broadcastId = c.req.param('broadcastId')

      const result = await getBroadcastingStatus({ broadcastId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.json(result.data, result.data.statusCode ?? 200)
    }
  )
  /**
   * 視聴者向けのストリーミング状況: Media Server に RPC
   */
  .get(
    '/streaming-status/:channelId',
    async c => {
      const channelId = c.req.param('channelId')
      const res = await mediaClient['streaming-status'][':channelId'].$get({ param: { channelId } })
      const data = await res.json()
      return c.json(data, res.status as any)
    },
  )
  /**
   * 配信チャンネル変更: ハイブリッド (DB + Media Server)
   */
  .post(
    '/current-channel/:broadcastId',
    bearerAuth,
    async c => {
      const broadcastId = c.req.param('broadcastId')
      const newChannelId = (await c.req.json()).currentChannelId;

      const result = await postCurrentChannel({ broadcastId, newChannelId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.body(null, result.data.statusCode ?? 200)
    },
  )
  /**
   * mediasoup 系ルート: Media Server に RPC
   */
  .get(
    '/mediasoup/router-rtp-capabilities/:id',
    async c => {
      const id = c.req.param('id')
      const res = await mediaClient.mediasoup['router-rtp-capabilities'][':id'].$get({ param: { id } })
      const data = await res.json()
      return c.json(data, res.status as any)
    },
  )
  .get(
    '/mediasoup/streamer-transport-parameters/:id',
    async c => {
      const id = c.req.param('id')
      const res = await mediaClient.mediasoup['streamer-transport-parameters'][':id'].$get({ param: { id } })
      const data = await res.json()
      return c.json(data, res.status as any)
    },
  )
  .post(
    '/mediasoup/client-connect/:streamId/:transportId',
    zValidator('json', z.any()),
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')
      const json = c.req.valid('json')
      const res = await mediaClient.mediasoup['client-connect'][':streamId'][':transportId'].$post({
        param: { streamId, transportId },
        json,
      })
      return c.text(await res.text(), res.status as any)
    },
  )
  .post(
    '/mediasoup/consumer-parameters/:streamId/:transportId',
    zValidator('json', z.any()),
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')
      const json = c.req.valid('json')
      const res = await mediaClient.mediasoup['consumer-parameters'][':streamId'][':transportId'].$post({
        param: { streamId, transportId },
        json,
      })
      const data = await res.json()
      return c.json(data, res.status as any)
    },
  )
  .post(
    '/mediasoup/resume-consumer/:streamId/:transportId',
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')
      const res = await mediaClient.mediasoup['resume-consumer'][':streamId'][':transportId'].$post({
        param: { streamId, transportId },
      })
      return c.text(await res.text(), res.status as any)
    },
  )
  /**
   * DB CRUD ルート (直接処理)
   */
  .post(
    '/broadcasts',
    bearerAuth,
    async c => {
      const result = await postBroadcast()
      return c.json(result, 200)
    },
  )
  .get(
    '/broadcasts/:broadcastId',
    bearerAuth,
    async c => {
      const broadcastId = c.req.param('broadcastId')
      const result = await getBroadcastsById(broadcastId)

      return c.json(result, 200)
    },
  )
  .post(
    '/broadcasts/:broadcastId/channels/current',
    bearerAuth,
    zValidator(
      'json',
      z.object({ newCurrentChannelId: z.string() }),
    ),
    async c => {
      const broadcastId = c.req.param('broadcastId')
      const { newCurrentChannelId }  = c.req.valid('json')

      await postBroadcastChannelsCurrent(broadcastId, newCurrentChannelId)
      return c.body(null, 200)
    },
  )
  .patch(
    '/broadcasts/:broadcastId/channels/:channelId',
    bearerAuth,
    zValidator(
      'json',
      z.object({
        name:
          z.string()
          .max(254, 'channel name is too long!')
          .optional(),
        description:
          z.string()
          .max(1024, 'description is too long!')
          .optional(),
      }),
    ),
    async c => {
      const broadcastId = c.req.param('broadcastId')
      const channelId = c.req.param('channelId')
      const params = c.req.valid('json')

      await patchBroadcastsChannels({ broadcastId, channelId, params })

      return c.body(null, 200)
    },
  )
  .post(
    '/broadcasts/:broadcastId/channels',
    bearerAuth,
    zValidator(
      'json',
      z.object({
        name:
          z.string()
          .max(254, 'channel name is too long!'),
        description:
          z.string()
          .max(1024, 'description is too long!'),
      }),
    ),
    async c => {
      const broadcastId = c.req.param('broadcastId')
      const params = c.req.valid('json')

      console.log('broadcastId, params: %O, %O', broadcastId, params)

      await postBroadcastsChannels({ broadcastId, params })

      return c.body(null, 200)
    },
  )
  .delete(
    '/broadcasts/:broadcastId/channels/:channelId',
    bearerAuth,
    async c => {
      const broadcastId = c.req.param('broadcastId')
      const channelId = c.req.param('channelId')

      await deleteBroadcastsChannels({ broadcastId, channelId })

      return c.body(null, 200)
    },
  )



export type AppType = typeof route

