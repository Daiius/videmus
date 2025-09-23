
import type { VidemusResult } from '../types'
import { resourcesDict } from '../resources'

type GetStreamingStatusArgs = {
  channelId: string,
}

type GetStreamingStatusResult = {
  streamingCount: number,
  isBroadcasting: boolean,
}

/**
 * 配信の状況（開始・停止）と視聴者数の目安を返します
 * 視聴IDを引数にとる、つまり視聴者向けのAPIエンドポイントです
 * TODO
 * 視聴者向けの方が呼び出される回数が多いのに、
 * resourcesDictをO(n)で探索するアルゴリズムで良いのか......?
 */
export const getStreamingStatus = async ({
  channelId,
}: GetStreamingStatusArgs): Promise<VidemusResult<GetStreamingStatusResult>> => {
  try {
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === channelId);
    if (resources == null) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `resoures with stream id ${channelId} doesn't exist`,
        }
      };
    }

    // TODO 
    // 配信が終了すると404になるので
    // isBroadcasting を返すのはどうなのだろう...
    return {
      success: true,
      data: {
        streamingCount: resources.streamerResources.length,
        isBroadcasting: true,
      },
    }

  } catch (err) {
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Unexpected error: ${err}`,
      },
    }
  }
}

