
import type { VidemusResult } from '../types'

import { debug, error } from '../logger';

import {
  resourcesDict,
} from '../resources'

export type DeleteWhipArgs = {
  resourcesId: string,
}
export type DeleteWhipResult = {
  message: string,
}

/**
 * 配信停止用のAPIエンドポイントです
 *
 * OBSの配信停止ボタンを押すとここが呼ばれます
 * 配信開始直後のエラー時などでもOBSはこのエンドポイントを呼び出します
 *
 * リソース解放についてはこちらを参照
 * https://mediasoup.org/documentation/v3/mediasoup/garbage-collection/
 */
export const deleteWhip = async ({
  resourcesId,
}: DeleteWhipArgs): Promise<VidemusResult<DeleteWhipResult>> => {
  try {
    
    const broadcasterResources = 
      resourcesDict[resourcesId]?.broadcasterResources;
    const broadcasterTransport = 
      broadcasterResources?.broadcasterTransport;
    const streamerResources =
      resourcesDict[resourcesId]?.streamerResources;
    
    if (
         broadcasterResources == null
      || broadcasterTransport == null
      || streamerResources == null
    ) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `resoures with id ${resourcesId} doesn't exist`,
        },
      };
    }

    debug(
      'broadcasterTransport stats: %o', 
      await broadcasterTransport?.getStats()
    );

    for (const producer of broadcasterResources.producers) {
      debug('producer stats: %o', await producer.getStats());
    }
    // routerを消してしまうと再接続が難しい、
    // 一旦キープしてtransportだけ再生成してみる？

    //resourcesDict[resourcesId].router.close();

    broadcasterTransport?.close();
    broadcasterResources.producers = [];
   
    streamerResources.forEach(resources => resources.streamerTransport.close());
    //resourcesDict[resourcesId].streamerResources = [];

    delete resourcesDict[resourcesId];

    debug(`transport: ${broadcasterTransport?.id} closed.`);
    return {
      success: true,
      data: { message: `router ${resourcesId} closed.` },
    }
  } catch (err) {
    error(`Error at ending broadcasting: ${err}`);
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at ending broadcasting: ${err}`,
      },
    }
  }
}
