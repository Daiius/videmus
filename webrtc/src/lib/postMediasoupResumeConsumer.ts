import { VidemusResult } from '../types'
import { resourcesDict } from '../resources'

import { error } from '../logger'

type PostMediasoupResumeConsumerArgs = {
  streamId: string,
  transportId: string,
}

type PostMediasoupResumeConsumerResult = {
  message :string,
}

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * サーバ側とクライアント側のcapabilities情報を交換して（それまでの手続きが色々ありますが）
 * 生成されたサーバ側のconsumerはpaused状態なので、
 * クライアント側で再生準備が整うとこのAPIエンドポイントが呼ばれ、ストリーム送信が開始されます
 */
export const postMediasoupResumeConsumer = async ({
  streamId,
  transportId,
}: PostMediasoupResumeConsumerArgs): Promise<VidemusResult<PostMediasoupResumeConsumerResult>> => {
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

    const streamerResource = resources
      .streamerResources
      .find(resource => resource.streamerTransport.id === transportId);
    if (streamerResource == null) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `transportId ${transportId} is not found in resources with streamId ${streamId}`,
        }
      }
    }

    streamerResource.consumers.forEach(async c => await c.resume());
    return { success: true, data: { message: ''}, }
  } catch (err) {
    error(`Error at POST resume-consumer: ${err}`);
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at POST resume-consumer: ${err}`,
      }
    }
  }
}

