
import type { 
  RtpCapabilities,
  MediaKind,
  RtpParameters,
} from 'mediasoup/types'
import type { VidemusResult } from '../types'

import { resourcesDict } from '../resources'
import { debug, warn, error } from '../logger';

type PostMediasoupConsumerParametersArgs = {
  streamId: string,
  transportId: string,
  clientCapabilities: RtpCapabilities,
}
    
type ConsumerParameters =  {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
};

type PostMediasoupConsumerParametersResult = ConsumerParameters[]

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * サーバ側とクライアント側のtransportが接続された後、
 * 互換性のあるproducerとconsumerのセットを生成するために用いられれます
 * クライアント側の動画や音声のフォーマット対応についての情報が送られてくるので、
 * それがサーバ側のproducerと対応しており、consumerを生成できるなら、生成します
 */
export const postMediasoupConsumerParameters = async ({
  streamId,
  transportId,
  clientCapabilities,
}: PostMediasoupConsumerParametersArgs): Promise<VidemusResult<PostMediasoupConsumerParametersResult>> => {
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
          message: `transportId ${transportId} is not found in resourcesId ${streamId}`,
        },
      };
    }

    debug('consumer-parameters: ', streamId, transportId); 

    const broadcasterResources = resources.broadcasterResources;
    const router = resources.router;

    const consumerParameters: ConsumerParameters[] = [];
    for (const producer of broadcasterResources.producers) {
      const canConsume = router.canConsume({
        producerId: producer.id,
        rtpCapabilities: clientCapabilities,
      });
      if (canConsume) {
        const consumer = await streamerResource
          .streamerTransport.consume({
            producerId: producer.id,
            rtpCapabilities: clientCapabilities,
            paused: true,
          });
        debug('consumer created: ', consumer.id, consumer.kind);
        streamerResource.consumers.push(consumer);
        consumerParameters.push({
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } else {
        warn(
          `streamId ${streamId} cannot consume producer ${producer.id}`
        );
      }
    }

    return {
      success: true,
      data: consumerParameters,
    }
  } catch (err) {
    error(`Error at POST consumer-parameters: ${err}`);
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at POST consumer-parameters: ${err}`,
      }
    }
  }
}
