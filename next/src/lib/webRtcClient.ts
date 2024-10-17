import { Device } from 'mediasoup-client';
import { 
  Consumer,
  Transport,
  MediaKind,
  RtpParameters,
} from 'mediasoup-client/lib/types';

export const createWebRtcStreams = async (
  streamId: string
): Promise<Consumer[]> => {

  const baseUrl = `${process.env.NEXT_PUBLIC_HOST_URL}${process.env.NEXT_PUBLIC_WITHOUT_API ? '' : '/api'}`;

  const routerRtpCapabilitiesResponse = await fetch(
    `${baseUrl}/mediasoup/router-rtp-capabilities/${streamId}`
  );
  const routerRtpCapabilities = await routerRtpCapabilitiesResponse.json();
  console.log('routerRtpCapabilities: %o', routerRtpCapabilities);
  const device = new Device();
  await device.load({ routerRtpCapabilities });
  const transportParametersResponse = await fetch(
    `${baseUrl}/mediasoup/streamer-transport-parameters/${streamId}`
  );
  const transportParameters = await transportParametersResponse.json();
  console.log('transportParmaeters: %o', transportParameters);
  const transport = device.createRecvTransport(transportParameters);
  transport.on(
    'connect', 
    async ({ dtlsParameters }, callback, errback) => {
      console.log('transport connect');
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
  transport.on('connectionstatechange', (newConnectionState) => {
    console.log('connection stage: ', newConnectionState);
  });

  const consumerParametersResponse = await fetch(
    `${baseUrl}/mediasoup/consumer-parameters/${streamId}/${transportParameters.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device.rtpCapabilities),
  });

  const consumerParameters: {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  }[] = await consumerParametersResponse.json();

  return await Promise.all(
    consumerParameters.map(async parameter =>
      await transport.consume(parameter)
    )
  );
}
