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
  //const { consumers } = useWebRtcStreams({ streamId });
  React.useEffect(() => {
    if (!mounted) {
      setMounted(true);
      (async () => {
        if (videoRef.current) {
          try {
            const consumers = await createWebRtcStreams(streamId);
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
            console.error('error while playing video: ', err);
          }
        }
      })();
    }
  }, []);

  return (
    <video
      ref={videoRef} 
      className={clsx('w-full')}
      autoPlay controls muted playsInline
    >
    </video>
  );
};

export default WebRtcVideo;

