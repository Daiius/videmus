
import type {
  DtlsParameters,
  IceParameters,
  IceCandidate,
  IceState,
} from 'mediasoup/types'

import { 
  resourcesDict,
  createWebRtcTransport,
  webRtcServer,
} from '../resources'

import { debug, error } from '../logger';
import {VidemusResult} from '../types';



type GetMediasoupStreamerTransportParametersArgs = {
  streamId: string,
}

type GetMediasoupStreamerTransportParametersResult = {
  id: string,
  dtlsParameters: DtlsParameters, 
  iceParameters: IceParameters,
  iceCandidates: IceCandidate[],
}

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * サーバ側で視聴者用transportを生成し、
 * クライアント（視聴者ブラウザで動作するmediasoup-client transport）を接続するための
 * パラメータ通知を行います、多分ポート番号とか？
 *
 * クライアント側ではこの結果を元にtransportを生成しています:
 */
export const getMediasoupStreamerTransportParameters = async ({
  streamId,
}: GetMediasoupStreamerTransportParametersArgs): Promise<VidemusResult<GetMediasoupStreamerTransportParametersResult>> => {
  try {
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `resoures with stream id ${streamId} doesn't exist`,
        }
      };
    }

    const router = resources.router;
    const streamerResources = resources.streamerResources;

    // TODO : streamerの人数制限はここで行う
    const streamerTransport = await createWebRtcTransport(router, webRtcServer);

    // 視聴者用のtransport接続状態がdisconnectedになったらリソースを解放する
    streamerTransport.on('icestatechange', (state: IceState) => {
      debug(`streamerTransport (${streamerTransport.id}) ice stage changed to ${state}`);
      if (state === 'disconnected') {
        const streamerResource = resources
          .streamerResources
          .find(resource => 
            resource.streamerTransport.id === streamerTransport.id
           );
        if (streamerResource != null) {
          // 切断されたstreamerのリソース開放
          streamerResource.consumers.forEach(c => c.close());
          resources.streamerResources = resources
            .streamerResources
            .filter(resource => 
              resource.streamerTransport.id !== streamerTransport.id
            );
          debug(`streamer resources (${streamerTransport.id}) has been released`);
        }
      }
    });

    streamerResources.push({
      streamerTransport,
      consumers: [],
    });

    return {
      success: true,
      data: {
        id: streamerTransport.id,
        dtlsParameters: streamerTransport.dtlsParameters,
        iceParameters: streamerTransport.iceParameters,
        iceCandidates: streamerTransport.iceCandidates,
      }
    }
  } catch (err) {
    error(`Error at GET streamer-transport-parameters: ${err}`);
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at GET streamer-transport-parameters: ${err}`,
      }
    }
  }
}
