import { 
  WebRtcTransport,
  Router,
  Producer,
  Consumer
} from 'mediasoup/node/lib/types';

export type BroadcasterResources = {
  broadcasterTransport: WebRtcTransport | undefined;
  producers: Producer[];
}

export type StreamerResources = {
  streamerTransport: WebRtcTransport;
  consumers: Consumer[];
}

export type Resources = {
  router: Router;
  broadcasterResources: BroadcasterResources;
  streamerResources: StreamerResources[];
}

export type ResourcesDict = Record<string, Resources>;

export const createWebRtcTransport = async (
  router: Router
): Promise<WebRtcTransport> => {
  const transport: WebRtcTransport = await router.createWebRtcTransport({
    listenIps: [
      { ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP},
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });
  console.log('WebRTC Transport created: ', transport.id, process.env.ANNOUNCED_IP);
  return transport;
}

