import { Hono, type Context } from 'hono'

import { postWhip } from './lib/postWhip'
import { deleteWhip } from './lib/deleteWhip'
import { getBroadcastingStatus } from './lib/getBroadcastingStatus'
import { getStreamingStatus } from './lib/getStreamingStatus'
import { postCurrentChannel } from './lib/postCurrentChannel'

import type { VidemusError } from './types'
import {getMediasoupRouterRtpCapabilities} from './lib/getMediasoupRouterRtpCapabilities'
import {getMediasoupStreamerTransportParameters} from './lib/getMediasoupStreamerTransportParameters'
import {postMediasoupClientConnect} from './lib/postMediasoupClientConnect'
import {postMediasoupConsumerParameters} from './lib/postMediasoupConsumerParameters'
import {postMediasoupResumeConsumer} from './lib/postMediasoupResumeConsumer'


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

const route = 
  /**
   * for OBS WHIP protocol
   * 
   * WHIPプロトコル選択+適切なURL指定の上で、
   * OBSの配信開始ボタンを押すと最初にここにリクエストが来ます
   * bodyにSDP offer、動画や音声のフォーマットや品質の情報の提案が
   * クライアント側から行われます（クライアント側の対応に合わせた内容であるはずです）
   *
   * サーバ側はこのオファー内容に対応できるか、出来るならどんなSDPを返すべきか決定し、
   * レスポンスに決定内容を含めて応答します
   *
   * また、送信者のIDの有効/無効の確認、配信IDをキーとしてのリソース生成と
   * メモリ中への記録を行い、配信に必要なリソースを、配信が終了されるまで保持します
   */
  app.post(
    '/whip/:id',
    async c => {
      const resourcesId = c.req.param('id')
      const sdpOffer = await c.req.text()

      const result = await postWhip({ resourcesId, sdpOffer })
      
      if (!result.success) {
        return handleError(c, result.error)
      }

      c.header('application/json')
      c.header('Location', result.data.url)
      return c.text(result.data.sdpAnswer, 201)
    },
  )
  /**
   * 配信停止用のAPIエンドポイントです
   *
   * OBSの配信停止ボタンを押すとここが呼ばれます
   * 配信開始直後のエラー時などでもOBSはこのエンドポイントを呼び出します
   *
   * リソース解放についてはこちらを参照
   * https://mediasoup.org/documentation/v3/mediasoup/garbage-collection/
   */
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
  /**
   * 配信の状況（開始・停止）と視聴者数の目安を返します
   * 配信者IDを引数にとる、つまり配信者向けのAPIエンドポイントです
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
   * 配信の状況（開始・停止）と視聴者数の目安を返します
   * 視聴IDを引数にとる、つまり視聴者向けのAPIエンドポイントです
   * TODO
   * 視聴者向けの方が呼び出される回数が多いのに、
   * resourcesDictをO(n)で探索するアルゴリズムで良いのか......?
   */
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
  /**
   * 配信IDに関連付けられている配信チャンネルを変更します
   * TODO
   * 配信前は変更できない？あまり直感的ではないかも
   */
  .post(
    '/current-channel/:broadcastId',
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
   * 視聴者とやりとりするためのAPIエンドポイントの一つ
   * 視聴者側（ブラウザ側で動作するmediasoup-client）に、
   * サーバ側のmediasoup routerの、多分音声や動画のフォーマットを伝えます
   */
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
  /**
   * 視聴者とやりとりするためのAPIエンドポイントの一つ
   * サーバ側で視聴者用transportを生成し、
   * クライアント（視聴者ブラウザで動作するmediasoup-client transport）を接続するための
   * パラメータ通知を行います、多分ポート番号とか？
   *
   * クライアント側ではこの結果を元にtransportを生成しています:
   */
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
  /**
   * 視聴者とやりとりするためのAPIエンドポイントの一つ
   * クライアント側でtransportが生成され、接続の準備が整った段階で呼ばれます
   * 視聴用IDと、事前にクライアント側に伝えられていたtransportIdを用いて
   * サーバ側とクライアント側のtransportを接続します
   */
  .post(
    '/mediasoup/client-connect/:streamId/:transportId',
    async c => {
      const streamId = c.req.param('streamId')
      const transportId = c.req.param('transportId')
      const dtlsParameters = await c.req.json()

      const result = await postMediasoupClientConnect({ streamId, transportId, dtlsParameters })

      if (!result.success) {
        return handleError(c, result.error)
      }

      return c.text(result.data.message, 200)
    },
  )
  /**
   * 視聴者とやりとりするためのAPIエンドポイントの一つ
   * サーバ側とクライアント側のtransportが接続された後、
   * 互換性のあるproducerとconsumerのセットを生成するために用いられれます
   * クライアント側の動画や音声のフォーマット対応についての情報が送られてくるので、
   * それがサーバ側のproducerと対応しており、consumerを生成できるなら、生成します
   */
  .post(
    '/mediasoup/consumer-parameters/:streamId/:transportId',
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
  /**
   * 視聴者とやりとりするためのAPIエンドポイントの一つ
   * サーバ側とクライアント側のcapabilities情報を交換して（それまでの手続きが色々ありますが）
   * 生成されたサーバ側のconsumerはpaused状態なので、
   * クライアント側で再生準備が整うとこのAPIエンドポイントが呼ばれ、ストリーム送信が開始されます
   */
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

export type AppType = typeof route

export { hc } from 'hono/client'

