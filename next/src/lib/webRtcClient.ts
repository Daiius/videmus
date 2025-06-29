import { Device } from 'mediasoup-client';
import { 
  Consumer,
  //Transport,
  MediaKind,
  RtpParameters,
} from 'mediasoup-client/types';

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

  const baseUrl = `${process.env.NEXT_PUBLIC_HOST_URL}${process.env.NEXT_PUBLIC_WITHOUT_API ? '' : '/api'}`;

  const routerRtpCapabilitiesResponse = await fetch(
    `${baseUrl}/mediasoup/router-rtp-capabilities/${streamId}`
  );
  if (!routerRtpCapabilitiesResponse.ok) {
    throw new Error(`channel ${streamId} seems to be closed.`);
  }
  const routerRtpCapabilities = await routerRtpCapabilitiesResponse.json();
  const device = new Device();
  await device.load({ routerRtpCapabilities });
  const transportParametersResponse = await fetch(
    `${baseUrl}/mediasoup/streamer-transport-parameters/${streamId}`
  );
  if (!transportParametersResponse.ok) {
    throw new Error(`failed to fetch streaming parameters`);
  }
  const transportParameters = await transportParametersResponse.json();
  const transport = device.createRecvTransport(transportParameters);
  transport.on(
    'connect', 
    async ({ dtlsParameters }, callback, errback) => {
      try {
        await fetch(
          `${baseUrl}/mediasoup/client-connect/${streamId}/${transportParameters.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dtlsParameters),
        })
        callback();
      } catch (error) {
        if (error instanceof Error) {
          errback(error);
        } else {
          console.error(`Unknown error at connect: ${error}`);
        }
      }
    }
  );
  transport.on('connectionstatechange', (connectionState) => {
    if (connectionState === 'failed') {
      onFailed?.();
    } else if (connectionState === 'disconnected') {
      onDisconnected?.();
    }
  });

  const consumerParametersResponse = await fetch(
    `${baseUrl}/mediasoup/consumer-parameters/${streamId}/${transportParameters.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device.rtpCapabilities),
  });
  if (!consumerParametersResponse.ok) {
    throw new Error(`failed to fetch comsumer parameters`);
  }

  const consumerParameters: {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  }[] = await consumerParametersResponse.json();

  const consumers: Consumer[] = [];
  for (const consumerParameter of consumerParameters) {
    consumers.push(await transport.consume(consumerParameter));
  }
  //consumers.forEach(c => c.resume());
  const resumeConsumerResponse = await fetch(
    `${baseUrl}/mediasoup/resume-consumer/${streamId}/${transportParameters.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resumeConsumerResponse.ok) {
    throw new Error('server consumer resume request failed.');
  }
  return consumers;
}

