
import type { RtpCapabilities } from 'mediasoup/types'

import { resourcesDict } from '../resources'
import { VidemusResult } from '../types'

import { error } from '../logger'

type GetMediasoupRouterPtpCapabilitiesArgs = {
  streamId: string,
}

type GetMediasoupRouterPtpCapabilitiesResult = RtpCapabilities


/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * 視聴者側（ブラウザ側で動作するmediasoup-client）に、
 * サーバ側のmediasoup routerの、多分音声や動画のフォーマットを伝えます
 */
export const getMediasoupRouterRtpCapabilities = async ({
  streamId,
}: GetMediasoupRouterPtpCapabilitiesArgs): Promise<VidemusResult<GetMediasoupRouterPtpCapabilitiesResult>> => {
  try {
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `resoures with stream id ${streamId} doesn't exist`,
        },
      };
    }
    const router = resources.router;
    return {
      success: true,
      data: router.rtpCapabilities,
    }
  } catch (err) {
    error(`Error at GET router-rtp-capabilities: ${err}`);
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at GET router-rtp-capabilities: ${err}`,
      },
    }
  }
}

