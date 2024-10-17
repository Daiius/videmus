
import clsx from 'clsx';
import GetIdButton from '@/components/GetIdButton';

/**
 * Broadcast setting page
 *
 * Videmus has several routers in its webrtc server.
 * To broadcast, users should reserve a router and get its id
 * from webrtc server.
 * 
 * On successful id acquisition:
 *   router id is returned in its searchParams.
 *   shown in page to broadcast & stream.
 * Failure patterns:
 *   1. all routers are used
 *   2. wrong search parameters are given manually
 *
 */
const BroadcastPage: React.FC = () => (
  <div>
    <div>配信用ページ</div>
    <GetIdButton />
  </div>
);

export default BroadcastPage;

