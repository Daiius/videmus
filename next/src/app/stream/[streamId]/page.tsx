
import WebRtcVideo from '@/components/WebRtcVideo';

const StreamPage: React.FC<{
  params: {
    streamId: string
  }
}> = ({ params }) => {
  return (
    <div>
      <div>ストリーミング用ページ</div>
      <WebRtcVideo streamId={params.streamId} />
    </div>
  );
};

export default StreamPage;

