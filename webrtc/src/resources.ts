import { 
  WebRtcTransport,
  Router,
  Producer,
  Consumer,
  WebRtcServer
} from 'mediasoup/types';

/** 配信者用のmediasoup resources */
export type BroadcasterResources = {
  /** 配信者からrouterに向けられたmediasoup transport */
  broadcasterTransport: WebRtcTransport | undefined;
  /** 
   * 配信者用transportに関連付けられたmediasoup producer
   * 音声と映像それぞれ、今は1配信者が送信する1つずつ(length: 2)ですが、
   * ビデオ通話や音声通話機能を追加した場合、将来的にはそれ以上作られる可能性があります
   */
  producers: Producer[];
}

/** 視聴者用のmediasoup resources */
export type StreamerResources = {
  /** routerから視聴者へ向けたtransport、これは複数視聴者に対して一つでOK */
  streamerTransport: WebRtcTransport;
  /** 
   * transportに関連付けられた、mediasoup consumer
   * 音声と映像それぞれ、今は1配信者が送信する1つずつ(length: 2)ですが、
   * ビデオ通話や音声通話機能を追加した場合、将来的にはそれ以上作られる可能性があります
   */
  consumers: Consumer[];
}

/**
 * 配信者IDと紐付けて管理される、配信者と視聴者向けのリソースをセットにしたもの
 */
export type Resources = {
  /** 配信者と視聴者の間のデータの送受信を行うためのmediasoup Router */
  router: Router;
  /** 配信者用のmediasoup resources */
  broadcasterResources: BroadcasterResources;
  /** 
   * 視聴用のID、配信前や（一応配信中にも）変更できます 
   * TODO: 配信チャネル変更用のAPIエンドポイントのコードを見ると、配信前は変更厳しそう??
   */
  streamId: string;
  /** 視聴者用のmediasoup resources、視聴者の数だけ用意します */
  streamerResources: StreamerResources[];
}

/**
 * 配信者IDをキーとして作成されるリソース管理用のオブジェクト
 * 
 * - 配信開始時に作成されます
 * - 視聴時に参照されます
 * - 配信管理画面で配信チャネル変更時に参照・変更されます
 */
export type ResourcesDict = Record<string, Resources>;

/**
 * Videmus側で用意した設定に従ってmediasoupのWebRTCTransportを作成します
 *
 * routerに関連付けられたtransportは何度も生成するタイミングがあります
 */
export const createWebRtcTransport = async (
  router: Router,
  webRtcServer: WebRtcServer,
): Promise<WebRtcTransport> => {
  const transport: WebRtcTransport = await router.createWebRtcTransport({
    //listenIps: [
    //  { ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP},
    //],
    webRtcServer,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });
  console.log('WebRTC Transport created: ', transport.id, process.env.ANNOUNCED_IP);
  return transport;
}

