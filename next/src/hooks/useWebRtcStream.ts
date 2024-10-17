
import React from 'react';

import { Device } from 'mediasoup-client';
import { 
  Consumer,
  Transport,
  MediaKind,
  RtpParameters,
} from 'mediasoup-client/lib/types';

export const useWebRtcStreams = ({
  streamId 
} : {
  streamId: string;
}): { consumers: Consumer[] }  => {

  const [device, _] = React.useState<Device>(new Device());
  const [transport, setTransport] = React.useState<Transport>();
  const [consumers, setConsumers] = React.useState<Consumer[]>([]);

  React.useEffect(() => {
    (async () => {
      const routerRtpCapabilitiesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_HOST_URL}/api/mediasoup/router-rtp-capabilities/${streamId}`
      );
      const routerRtpCapabilities = await routerRtpCapabilitiesResponse.json();
      console.log('routerRtpCapabilities: %o', routerRtpCapabilities);
      await device.load({ routerRtpCapabilities });
      const transportParametersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_HOST_URL}/api/mediasoup/streamer-transport-parameters/${streamId}`
      );
      const transportParameters = await transportParametersResponse.json();
      console.log('transportParmaeters: %o', transportParameters);
      const transport = device.createRecvTransport(transportParameters);
      setTransport(transport);
      transport.on(
        'connect', 
        async ({ dtlsParameters }, callback, errback) => {
          console.log('transport connect');
          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_HOST_URL}/api/mediasoup/client-connect/${streamId}/${transport.id}`, {
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
        `${process.env.NEXT_PUBLIC_HOST_URL}/api/mediasoup/consumer-parameters/${streamId}/${transport.id}`, {
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

      setConsumers(
        await Promise.all(
          consumerParameters.map(async parameter =>
            await transport.consume(parameter)
          )
        )
      );

      console.log('setConsumers done');
    })();


    return () => {
      transport?.close();
      consumers.forEach(c => c.close());
      console.log('useWebRtcStream clean up done');
    };

  }, []);

  return {
    consumers,
  };
};

