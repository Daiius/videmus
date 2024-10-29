
import WebRtcVideo from '@/components/WebRtcVideo';

const StreamPage: React.FC<{
  params: Promise<{
    streamId: string
  }>
}> = async ({ params }) => {

  const { streamId } = await params;

  return (
    <div>
      <WebRtcVideo streamId={streamId} />
    </div>
  );
};

export default StreamPage;

