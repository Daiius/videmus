'use client'

import React from 'react';
import clsx from 'clsx';

import { createWebRtcStreams } from '@/lib/webRtcClient';

const WebRtcVideo: React.FC<{
  streamId: string;
}> = ({
  streamId,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string>('');

  React.useEffect(() => {
    if (!mounted) {
      setMounted(true);
      (async () => {
        if (videoRef.current) {
          try {
            const consumers = await createWebRtcStreams(
              streamId,
              () => setMessage('connection is unstable...'),
              () => {
                setMessage('connection is failed. restarting...');
                setTimeout(() => window.location.reload(), 2_000);
              }
            );
            console.log('consumers: %o', consumers);
            const stream = new MediaStream();
            consumers.forEach(c => {
              console.log('consumer track: ', c.track);
              stream.addTrack(c.track);
            });
            videoRef.current.srcObject = stream;
            await videoRef.current?.play();
            console.log('video.play() called!');
          } catch (err) {
            err instanceof Error
              ? setMessage(err.message)
              : setMessage(`unknown error, see console...`);
            console.error('error while playing video: ', err);
          }
        }
      })();
    }
  }, []);

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
  );
};

export default WebRtcVideo;

