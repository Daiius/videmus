
import WebRtcVideo from '@/components/WebRtcVideo';
import StreamingStatusPanel from '@/components/StreamingStatusPanel';

const StreamPage: React.FC<{
  params: Promise<{
    streamId: string
  }>
}> = async ({ params }) => {

  const { streamId } = await params;

  return (
    <div className='flex flex-col gap-2'>
      <WebRtcVideo streamId={streamId} />
      <StreamingStatusPanel channelId={streamId} />
    </div>
  );
};

export default StreamPage;

