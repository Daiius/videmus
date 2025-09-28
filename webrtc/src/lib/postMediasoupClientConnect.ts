
import {
  resourcesDict,
} from '../resources'

import {
  DtlsParameters
} from 'mediasoup/types'

import { debug, error } from '../logger';
import { VidemusResult } from '../types';

type PostMediasoupClientConnectArgs = {
  streamId: string,
  transportId: string,
  dtlsParameters: DtlsParameters,
}

type PostMediasoupClientConnectResult = {
  message: string,
}

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * クライアント側でtransportが生成され、接続の準備が整った段階で呼ばれます
 * 視聴用IDと、事前にクライアント側に伝えられていたtransportIdを用いて
 * サーバ側とクライアント側のtransportを接続します
 */
export const postMediasoupClientConnect = async ({
  streamId,
  transportId,
  dtlsParameters,
}: PostMediasoupClientConnectArgs): Promise<VidemusResult<PostMediasoupClientConnectResult>> => {
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
          },
        };
    }

    const streamerTransport = streamerResource.streamerTransport;

    await streamerTransport.connect({ dtlsParameters });
    streamerTransport.on('icestatechange', (iceState) =>
      debug('streamer transport ice change: ', iceState)
    );
    return {
      success: true,
      data: { message: 'client connect callback handled' }
    }
  } catch (err) {
    error(`Error at POST client-connect: ${err}`);
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at POST client-connect: ${err}`,
      },
    }
  }
}

