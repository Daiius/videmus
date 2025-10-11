
import { VidemusResult } from '../types'
import { putImageToR2 } from '../api'
import { and, eq } from 'drizzle-orm'
import { db } from 'videmus-database/db'
import { channels } from 'videmus-database/db/schema'

type PostThumbnailImageArgs = {
  broadcastId: string,
  channelId: string,
  file: File,
}

type PostThumbnailImageResult = {
  message: string,
}

/**
 * チャンネルに設定されているサムネイル情報を更新します
 *
 * バイナリデータが記録されるCloudflare R2と、DB側のURLを更新します
 */
export const postThumbnailImage = async ({
  broadcastId,
  channelId,
  file,
}: PostThumbnailImageArgs): Promise<VidemusResult<PostThumbnailImageResult>> => {
  try {
    const channel = await db.query.channels.findFirst({
      where: 
        and(
          eq(channels.broadcastId, broadcastId),
          eq(channels.id, channelId),
        ),
    })

    if (channel == null) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `Specified channel ${channelId} is not found in broadcastId ${broadcastId}`,
        },
      }
    }

    const key = `thumbnail.${broadcastId}.${channelId}`

    const buf = Buffer.from(await file.arrayBuffer())

    await putImageToR2({ key, body: buf, contentType: file.type })

    const timeStamp = Date.now()
    const thumbnailUrl = `${process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN}/${key}?hash=${timeStamp}`
    await db.update(channels).set({ thumbnailUrl }).where(
      and(
        eq(channels.broadcastId, broadcastId),
        eq(channels.id, channelId),
      )
    )

    return {
      success: true,
      data: {
        message: 'thumbnail update succeeded!',
      },
    }

  } catch (err) {
    return {
      success: false,
      error: {
        type: 'Unexpected',
        message: `Error at postThumbnailImage, ${err}`,
      }
    }
  }
}

