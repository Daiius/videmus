'use client'

import React from 'react';
import clsx from 'clsx';
import { useWebRtcStreams } from '@/hooks/useWebRtcStream';

const WebRtcVideo: React.FC<{
  streamId: string;
}> = ({
  streamId,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { consumers } = useWebRtcStreams({ streamId });
  React.useEffect(() => {
    (async () => {
      if (videoRef.current && consumers.length > 0) {
        try {
        const stream = new MediaStream();
        consumers.forEach(c => stream.addTrack(c.track));
        videoRef.current.srcObject = stream;
        await videoRef.current?.play();
        } catch (err) {
          console.error('error while playing video: ', err);
        }
      }
    })();
  }, [consumers]);

  return (
    <video
      ref={videoRef} 
      className={clsx('w-full')}
      controls autoPlay muted playsInline
    >
    </video>
  );
};

export default WebRtcVideo;

