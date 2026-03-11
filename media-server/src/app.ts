import { Hono, type Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'

import { postWhip } from './lib/postWhip'
import { deleteWhip } from './lib/deleteWhip'
import { getStreamingStatus } from './lib/getStreamingStatus'

import type { VidemusError } from './types'
import { getMediasoupRouterRtpCapabilities } from './lib/getMediasoupRouterRtpCapabilities'
import { getMediasoupStreamerTransportParameters } from './lib/getMediasoupStreamerTransportParameters'
import { postMediasoupClientConnect } from './lib/postMediasoupClientConnect'
import { postMediasoupConsumerParameters } from './lib/postMediasoupConsumerParameters'
import { postMediasoupResumeConsumer } from './lib/postMediasoupResumeConsumer'

import { resourcesDict } from './resources'


export const app = new Hono()

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

// リクエスト/レスポンスのデバッグログ
app.use('*', async (c, next) => {
  console.log(`[MEDIA←] ${c.req.method} ${c.req.url}`)
  console.log(`[MEDIA←] headers: host=${c.req.header('host')}, content-type=${c.req.header('content-type')}, content-length=${c.req.header('content-length')}`)
  await next()
  console.log(`[MEDIA→] ${c.res.status}`)
})

/**
 * メディア処理ルート
 */
const route =
  app.post(
    '/whip/:id',
    async c => {
      const resourcesId = c.req.param('id')
      const sdpOffer = await c.req.text()
      const currentChannelId = c.req.header('X-Current-Channel-Id')

      if (!currentChannelId) {
        return c.text('X-Current-Channel-Id header is required', 400)
      }

      const result = await postWhip({ resourcesId, sdpOffer, currentChannelId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      c.header('Content-Type', 'application/json')
      c.header('Location', result.data.url)
      return c.text(result.data.sdpAnswer, 201)
    },
  )
  .delete(
    '/whip/test-broadcast/:id',
    async c => {
      const resourcesId = c.req.param('id')

      const result = await deleteWhip({ resourcesId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.text(result.data.message, 200)
    },
  )
  .get(
    '/streaming-status/:channelId',
    async c => {
      const channelId = c.req.param('channelId')

      const result = await getStreamingStatus({ channelId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.json(result.data, 200)
    }
  )
  .get(
    '/mediasoup/router-rtp-capabilities/:id',
    async c => {
      const streamId = c.req.param('id')

      const result = await getMediasoupRouterRtpCapabilities({ streamId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.json(result.data, 200)
    },
  )
  .get(
    '/mediasoup/streamer-transport-parameters/:id',
    async c => {
      const streamId = c.req.param('id')

      const result = await getMediasoupStreamerTransportParameters({ streamId })

      if (!result.success) {
        return handleError(c, result.error)
      }
      return c.json(result.data, 200)
    },
  )
  .post(
    '/mediasoup/client-connect/:streamId/:transportId',
    zValidator(
      'json',
      z.any(),
    ),
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')
      const dtlsParameters = c.req.valid('json')

      const result = await postMediasoupClientConnect({ streamId, transportId, dtlsParameters })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.text(result.data.message, 200)
    },
  )
  .post(
    '/mediasoup/consumer-parameters/:streamId/:transportId',
    zValidator(
      'json',
      z.any(),
    ),
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')
      const clientCapabilities = await c.req.json()

      const result = await postMediasoupConsumerParameters({ streamId, transportId, clientCapabilities })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.json(result.data, 200)
    },
  )
  .post(
    '/mediasoup/resume-consumer/:streamId/:transportId',
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')

      const result = await postMediasoupResumeConsumer({ streamId, transportId })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.text(result.data.message, 200)
    },
  )

/**
 * 内部API (Resource Server から呼ばれる)
 */
app.get(
  '/internal/viewer-count/:broadcastId',
  async c => {
    const broadcastId = c.req.param('broadcastId')
    const streamerResources =
      resourcesDict[broadcastId]?.streamerResources
    return c.json({
      count: streamerResources?.length ?? 0,
      exists: broadcastId in resourcesDict,
    })
  }
)

app.post(
  '/internal/update-stream-id/:broadcastId',
  async c => {
    const broadcastId = c.req.param('broadcastId')
    const resources = resourcesDict[broadcastId]
    if (!resources) {
      return c.json({ updated: false }, 404)
    }
    const { newStreamId } = await c.req.json()
    resources.streamId = newStreamId
    return c.json({ updated: true })
  }
)
