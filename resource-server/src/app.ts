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


export const app = new Hono()

const MEDIA_SERVER_URL = process.env.MEDIA_SERVER_URL;

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

/**
 * Media Server へのプロキシ
 */
const proxyToMedia = async (c: Context) => {
  const url = new URL(c.req.url)
  const targetUrl = `${MEDIA_SERVER_URL}${url.pathname}${url.search}`
  const reqBody = c.req.method !== 'GET' ? await c.req.text() : undefined
  console.log(`[PROXY→] ${c.req.method} ${url.pathname}`)
  if (reqBody) console.log(`[PROXY→] body length: ${reqBody.length}`)
  const res = await fetch(targetUrl, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: reqBody,
  })
  const resBody = await res.text()
  console.log(`[PROXY←] ${res.status} body length: ${resBody.length}`)
  console.log(`[PROXY←] body preview: ${resBody.substring(0, 200)}`)
  return new Response(resBody, { status: res.status, headers: res.headers })
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
   * 配信停止: そのまま Media Server に転送
   */
  .delete(
    '/whip/test-broadcast/:id',
    proxyToMedia,
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
   * 視聴者向けのストリーミング状況: そのまま Media Server に転送
   */
  .get(
    '/streaming-status/:channelId',
    proxyToMedia,
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
   * mediasoup 系ルート: すべて Media Server にプロキシ
   */
  .get(
    '/mediasoup/router-rtp-capabilities/:id',
    proxyToMedia,
  )
  .get(
    '/mediasoup/streamer-transport-parameters/:id',
    proxyToMedia,
  )
  .post(
    '/mediasoup/client-connect/:streamId/:transportId',
    proxyToMedia,
  )
  .post(
    '/mediasoup/consumer-parameters/:streamId/:transportId',
    proxyToMedia,
  )
  .post(
    '/mediasoup/resume-consumer/:streamId/:transportId',
    proxyToMedia,
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

export { hc } from 'hono/client'
