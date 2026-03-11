import { Device } from 'mediasoup-client'
import {
  Consumer,
  MediaKind,
  RtpParameters,
} from 'mediasoup-client/types'

import { client } from '@/lib/api'

export const createWebRtcStreams = async (
  streamId: string,
  /**
   * 接続の調子が悪いときに最初に呼ばれます
   * (この時点で再接続を試みるのも手です)
   */
  onDisconnected?: () => void,
  /**
   * 接続を完全に失った際に呼ばれます
   */
  onFailed?: () => void,
): Promise<Consumer[]> => {

  // 1. サーバ側の動画・音声フォーマット対応状況など取得します
  console.log(`[CLIENT] 1. GET router-rtp-capabilities/${streamId}`)
  const routerRtpCapabilitiesResponse = await client.mediasoup['router-rtp-capabilities'][':id'].$get({ param: { id: streamId } })
  console.log(`[CLIENT] 1. response status: ${routerRtpCapabilitiesResponse.status}`)

  if (!routerRtpCapabilitiesResponse.ok) {
    throw new Error(`channel ${streamId} seems to be closed.`);
  }
  const routerRtpCapabilities = await routerRtpCapabilitiesResponse.json() as Record<string, unknown>;
  console.log(`[CLIENT] 1. routerRtpCapabilities codecs: ${Array.isArray(routerRtpCapabilities.codecs) ? routerRtpCapabilities.codecs.length : 'unknown'}`)

  // クライアント側ではサーバ側の動画・音声フォーマット対応状況に合わせて
  // 初期化が行われます
  const device = new Device();
  await device.load({ routerRtpCapabilities });
  console.log(`[CLIENT] device loaded, canProduce video: ${device.canProduce('video')}`)

  // 2. サーバ側で視聴者毎に用意されるtransportの情報を取得します
  console.log(`[CLIENT] 2. GET streamer-transport-parameters/${streamId}`)
  const transportParametersResponse = await client.mediasoup['streamer-transport-parameters'][':id'].$get({ param: { id: streamId } })
  console.log(`[CLIENT] 2. response status: ${transportParametersResponse.status}`)
  if (!transportParametersResponse.ok) {
    throw new Error(`failed to fetch streaming parameters`);
  }
  const transportParameters = await transportParametersResponse.json();
  console.log(`[CLIENT] 2. transport id: ${transportParameters.id}`)
  console.log(`[CLIENT] 2. iceCandidates: ${JSON.stringify(transportParameters.iceCandidates)}`)
  console.log(`[CLIENT] 2. iceParameters: ${JSON.stringify(transportParameters.iceParameters)}`)

  // サーバ側で生成されたtransportに合わせてクライアント側のtransportを生成します
  const transport = device.createRecvTransport(transportParameters);
  console.log(`[CLIENT] RecvTransport created, id: ${transport.id}`)

  transport.on('connectionstatechange', (state) => {
    console.log(`[CLIENT] transport connectionstatechange: ${state}`);
    if (state === 'failed') {
      onFailed?.();
    } else if (state === 'disconnected') {
      onDisconnected?.();
    }
  });


  transport.on(
    'connect',
    async ({ dtlsParameters }, callback, errback) => {
      try {
        console.log(`[CLIENT] 3. POST client-connect/${streamId}/${transportParameters.id}`)
        console.log(`[CLIENT] 3. dtlsParameters: ${JSON.stringify(dtlsParameters)}`)
        const connectResponse = await client.mediasoup['client-connect'][':streamId'][':transportId'].$post({
          param: { streamId, transportId: transportParameters.id },
          json: dtlsParameters,
        })
        console.log(`[CLIENT] 3. connect response status: ${connectResponse.status}`)
        callback();
      } catch (error) {
        console.error(`[CLIENT] 3. connect error:`, error);
        if (error instanceof Error) {
          errback(error);
        } else {
          console.error(`Unknown error at connect: ${error}`);
        }
      }
    }
  );

  // 4. クライアント側の音声・映像対応状況に合わせたconsumer生成をサーバ側に依頼します
  console.log(`[CLIENT] 4. POST consumer-parameters/${streamId}/${transportParameters.id}`)
  const consumerParametersResponse = await client.mediasoup['consumer-parameters'][':streamId'][':transportId'].$post({
    param: { streamId, transportId: transportParameters.id },
    json: device.rtpCapabilities,
  })
  console.log(`[CLIENT] 4. response status: ${consumerParametersResponse.status}`)

  if (!consumerParametersResponse.ok) {
    throw new Error(`failed to fetch comsumer parameters`);
  }

  const consumerParameters = await consumerParametersResponse.json() as {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  }[];
  console.log(`[CLIENT] 4. consumers count: ${consumerParameters.length}, kinds: ${consumerParameters.map(c => c.kind).join(',')}`)

  // 生成されたconsumerはメモリ上に保持します
  const consumers: Consumer[] = [];
  for (const consumerParameter of consumerParameters) {
    console.log(`[CLIENT] consuming ${consumerParameter.kind} (id: ${consumerParameter.id})`)
    consumers.push(await transport.consume(consumerParameter));
  }

  // 内部 PeerConnection の ICE 状態を監視
  const pc = (transport as any)._handler?._pc as RTCPeerConnection | undefined;
  if (pc) {
    console.log(`[CLIENT] PeerConnection found, iceConnectionState: ${pc.iceConnectionState}, iceGatheringState: ${pc.iceGatheringState}`);
    console.log(`[CLIENT] localDescription: ${JSON.stringify(pc.localDescription?.sdp?.substring(0, 500))}`);
    console.log(`[CLIENT] remoteDescription: ${JSON.stringify(pc.remoteDescription?.sdp?.substring(0, 500))}`);
    pc.onicecandidateerror = (e) => {
      console.error(`[CLIENT] ICE candidate error: code=${e.errorCode} text=${e.errorText} url=${(e as any).url} address=${(e as any).address} port=${(e as any).port}`);
    };
    pc.oniceconnectionstatechange = () => {
      console.log(`[CLIENT] ICE connection state: ${pc.iceConnectionState}`);
    };
    // 5秒後と15秒後にICE statsを取得
    for (const delay of [5000, 15000]) {
      setTimeout(async () => {
        console.log(`[CLIENT] === ICE stats at ${delay/1000}s ===`);
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'candidate-pair') {
            console.log(`[CLIENT] candidate-pair: state=${report.state} local=${report.localCandidateId} remote=${report.remoteCandidateId} nominated=${report.nominated} reqSent=${report.requestsSent} respRecv=${report.responsesReceived} bytesSent=${report.bytesSent} bytesRecv=${report.bytesReceived}`);
          } else if (report.type === 'local-candidate') {
            console.log(`[CLIENT] local-candidate: ${report.candidateType} ${report.protocol} ${report.address}:${report.port}`);
          } else if (report.type === 'remote-candidate') {
            console.log(`[CLIENT] remote-candidate: ${report.candidateType} ${report.protocol} ${report.address}:${report.port}`);
          }
        });
      }, delay);
    }
  } else {
    console.log(`[CLIENT] PeerConnection NOT found after consume`);
  }

  // 5. サーバ側でconsumerはpause状態で生成されているので、ストリーム開始を依頼します
  console.log(`[CLIENT] 5. POST resume-consumer/${streamId}/${transportParameters.id}`)
  const resumeConsumerResponse = await client.mediasoup['resume-consumer'][':streamId'][':transportId'].$post({
    param: { streamId, transportId: transportParameters.id },
  })
  console.log(`[CLIENT] 5. response status: ${resumeConsumerResponse.status}`)

  if (!resumeConsumerResponse.ok) {
    throw new Error('server consumer resume request failed.');
  }
  console.log(`[CLIENT] All steps completed, ${consumers.length} consumers ready`)
  return consumers;
}
