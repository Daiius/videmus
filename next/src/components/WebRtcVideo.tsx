'use client'

import { useEffect, useState, useRef } from 'react'
import clsx from 'clsx'

import { createWebRtcStreams } from '@/lib/webRtcClient'

export type WebRtcVideoProps = {
  streamId: string,
}

const WebRtcVideo = ({
  streamId,
}: WebRtcVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mounted, setMounted] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [retryCount, setRetryCount] = useState<number>(0)

  useEffect(() => {
    setMounted(true)
    if (mounted) {
      (async () => {
        if (videoRef.current) {
          try {
            const consumers = await createWebRtcStreams(
              streamId,
              () => {
                setMessage('connection is unstable, reconnecting...')
                setTimeout(
                  () => setRetryCount(count => count + 1), 
                  2_000
                )
              },
              () => {
                setMessage(
                  'connection is failed, but maybe last disconnected one... doing nothing.'
                )
                //setTimeout(() => window.location.reload(), 2_000)
              }
            )
            console.log('consumers: %o', consumers)
            const stream = new MediaStream()
            consumers.forEach(c => {
              console.log('consumer track: ', c.track)
              stream.addTrack(c.track)
            })
            videoRef.current.srcObject = stream
            await videoRef.current?.play()
            console.log('video.play() called!')
          } catch (err) {
            err instanceof Error
              ? setMessage(err.message)
              : setMessage(`unknown error, see console...`)
            console.error('error while playing video: ', err)
          }
        }
      })()
    }
  }, [mounted, retryCount])

  return (
    <div className='relative'>
      {message && 
        <div>
          <div>{message}</div>
        </div>
      }
      <video
        ref={videoRef} 
        className={clsx('w-full')}
        autoPlay controls muted playsInline
      >
      </video>
    </div>
  )
}

export default WebRtcVideo

