'use client'

import useSWR from 'swr';


const fetcher = async (url: string ) => {
  const res = await fetch(url);

  if (res.status === 202) {
    return undefined;
  }

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}

const StreamIdChecker: React.FC<{
  broadcastId: string
}> = ({
  broadcastId,
}) => {
  const { data, error } = useSWR<{ streamId: string }>(
    `/videmus/api/stream-id/${broadcastId}`,
    fetcher,
    { refreshInterval: 5_000 }
  );

  return (
    <div>
      {data == null
        ? <div>配信開始後に視聴用URLを表示します...</div>
        : <div>視聴用URL : {data.streamId}</div>
      }
      {error &&
        <div>エラー： {error.toString()}</div>
      }
    </div>
  );
};

export default StreamIdChecker;

