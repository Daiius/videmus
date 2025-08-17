import { createServer } from 'http';
import express from 'express';

import { debug, warn, error } from './logger';

import { createWorker } from 'mediasoup';
import { 
  Worker,
  RtpParameters,
  MediaKind,
  IceState,
  WebRtcServer,
} from 'mediasoup/types';

import { mediaCodecs } from './codecs';
import { 
  ResourcesDict,
  createWebRtcTransport,
} from './resources';

import { RemoteSdp } from 'mediasoup-client/handlers/sdp/RemoteSdp';

import sdpTransform from 'sdp-transform';
import ortc from 'mediasoup-client/ortc';
import sdpCommonUtils from 'mediasoup-client/handlers/sdp/commonUtils';
import sdpUnifiedPlanUtils from 'mediasoup-client/handlers/sdp/unifiedPlanUtils';

import { eq } from 'drizzle-orm';
import { db } from 'videmus-database/db';
import { broadcastIds } from 'videmus-database/db/schema';


const test = await db.select().from(broadcastIds);
debug(test);
debug(process.env)

const app = express();
app.use(express.json());
app.use(express.text({
  type: ['application/sdp', 'text/plain']
}));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin?.startsWith('http://localhost')) {
    res.header(
      'Access-Control-Allow-Origin', 
      origin
    );
    res.header(
      'Access-Control-Allow-Methods', 
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers', 
      'Content-Type, Authorization'
    );
    res.header(
      'Access-Control-Expose-Headers', 
      '*'
    )
  }
  next();
});

/**
 * mediasoupのワーカプロセスを起動します
 */
const worker: Worker = await createWorker({
  logLevel: 'warn',
  logTags: [ 'info', 'ice', 'dtls', 'rtp', 'rtcp' ],
  rtcMinPort: 44400,
  rtcMaxPort: 44410,
});
debug('Worker created');

const webRtcServer: WebRtcServer | undefined = //undefined
await worker.createWebRtcServer({
  listenInfos: [
    {
      protocol: 'udp',
      ip: '0.0.0.0',
      announcedAddress: process.env.ANNOUNCED_IP,
      port: Number(process.env.WEBRTC_PORT ?? 44400),
    },
    {
      protocol: 'tcp',
      ip: '0.0.0.0',
      announcedAddress: process.env.ANNOUNCED_IP,
      port: Number(process.env.WEBRTC_PORT ?? 44400),
    },
  ],
})

//worker.appData.webRtcServer = webRtcServer;

const resourcesDict: ResourcesDict = {};

/**
 * for OBS WHIP protocol
 * 
 * WHIPプロトコル選択+適切なURL指定の上で、
 * OBSの配信開始ボタンを押すと最初にここにリクエストが来ます
 * bodyにSDP offer、動画や音声のフォーマットや品質の情報の提案が
 * クライアント側から行われます（クライアント側の対応に合わせた内容であるはずです）
 *
 * サーバ側はこのオファー内容に対応できるか、出来るならどんなSDPを返すべきか決定し、
 * レスポンスに決定内容を含めて応答します
 *
 * また、送信者のIDの有効/無効の確認、配信IDをキーとしてのリソース生成と
 * メモリ中への記録を行い、配信に必要なリソースを、配信が終了されるまで保持します
 */
app.post('/whip/:id', async (req, res) => {
  try {
    // resourceIdは配信者のIDを指しますが、
    // これで各種リソースを管理しますので、resourceIdとしています
    const resourcesId = req.params.id;

    const searchedEntries = await db.select()
      .from(broadcastIds)
      .where(
        eq(broadcastIds.id, resourcesId)
      );
    if (searchedEntries.length === 0) {
      res.status(404)
        .send(`resoures with id ${resourcesId} doesn't exist`);
      return;
    }
    const searchedEntry = searchedEntries[0];
    if (!searchedEntry.isAvailable) {
      res.status(403)
        .send(`resources with id ${resourcesId} is not avaliable yet`);
      return;
    }
    const currentChannelId = searchedEntry.currentChannelId;
    if (currentChannelId == null) {
      res.status(404)
        .send(`current channel id is not set`);
      return;
    }

    debug(`/whip/${resourcesId} post access`);

    // リソース初期化開始
    resourcesDict[resourcesId] = {
      router: await worker.createRouter({ mediaCodecs }),
      streamId: currentChannelId, // 視聴用IDを別に与える
      streamerResources: [],
      broadcasterResources: {
        broadcasterTransport: undefined,
        producers: [],
      },
    };

    const resources = resourcesDict[resourcesId];
    const router = resources.router;
    const broadcasterResources = resources.broadcasterResources;

    // クライアントから送信されてきたSDP offerを読み取り、SDP answerを構成します
    const localSdpObject = sdpTransform.parse(req.body.toString());
    const rtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
      sdpObject: localSdpObject
    });
    const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
      sdpObject: localSdpObject
    });
    const extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(
      rtpCapabilities, 
      router.rtpCapabilities,
      true,
    );
    const sendingRtpParametersByKind: Record<
      'audio' | 'video', 
      RtpParameters
    > = {
      audio: 
        ortc.getSendingRtpParameters(
          'audio', extendedRtpCapabilities
        ),
      video: 
        ortc.getSendingRtpParameters(
          'video', extendedRtpCapabilities
        ),
    };
    const sendingRemoteRtpParametersByKind: Record<
      'audio' | 'video', 
      RtpParameters
    > = {
      audio: 
        ortc.getSendingRemoteRtpParameters(
          'audio', extendedRtpCapabilities
        ),
      video:
        ortc.getSendingRemoteRtpParameters(
          'video', extendedRtpCapabilities
        )
    };
   
    // 既存のtransportが存在していたとしても再利用せず、 
    // 毎回作り直してみます
    const broadcasterTransport = await createWebRtcTransport(router, webRtcServer);
    broadcasterResources.broadcasterTransport = broadcasterTransport;

    broadcasterTransport.observer.on(
      'icestatechange', 
      (newIceState) => debug(
        `broadcaster ICE state changed to: ${newIceState}`
      )
    );

    // ここでSDP answerの内容が決まり、以下リソースを生成しつつ
    // このSDP answerの返答準備を行います
    const remoteSdp = new RemoteSdp({
      iceParameters: broadcasterTransport.iceParameters,
      iceCandidates: broadcasterTransport.iceCandidates,
      dtlsParameters: {
        ...broadcasterTransport.dtlsParameters,
        role: 'client',
      },
      sctpParameters: broadcasterTransport.sctpParameters,
    });
    
    // 配信者用transportで、配信者からの接続を待機します
    await broadcasterTransport.connect({ dtlsParameters });


    // SDP answer内容に合うように配信者側リソースを作成しつつ、
    // クライアント側に返答するSDP answer内容を準備します
    //
    // 仮に音声や映像の片方だけしか対応していなくても、
    // 対応している方だけは生成させる......つもりです
    for (const { type, mid } of localSdpObject.media) {

      debug('type, mid: ', { type, mid });

      const mediaSectionIdx = 
        remoteSdp.getNextMediaSectionIdx();
      const offerMediaObject = 
        localSdpObject.media[mediaSectionIdx.idx];
      debug('offerMediaObject: ', offerMediaObject);

      const sendingRtpParameters: RtpParameters = { 
        ...sendingRtpParametersByKind[type as 'video' | 'audio']
      };
      const sendingRemoteRtpParameters: RtpParameters = {
        ...sendingRemoteRtpParametersByKind[type as 'video' | 'audio']
      };

      sendingRtpParameters.mid = 
        (mid as unknown as number).toString();
      sendingRtpParameters.rtcp!.cname =
        sdpCommonUtils.getCname({ offerMediaObject });
      sendingRtpParameters.encodings =
        sdpUnifiedPlanUtils.getRtpEncodings({ offerMediaObject });
    
      debug('%o', sendingRtpParameters);
      debug('%o', sendingRemoteRtpParameters);

      remoteSdp.send({
        offerMediaObject,
        reuseMid: mediaSectionIdx.reuseMid,
        offerRtpParameters: sendingRtpParameters,
        answerRtpParameters: sendingRemoteRtpParameters,
        codecOptions: {},
      });

      const producer = await broadcasterTransport.produce({
        kind: type as 'video' | 'audio',
        rtpParameters: sendingRtpParameters
      });
  
      debug('producer created: ', producer);

      resourcesDict[resourcesId]
        .broadcasterResources
        .producers
        .push(producer);
    }

    const answer = remoteSdp.getSdp();
    debug('answer: ', answer);

    // SDP answerを返します
    // ヘッダーには配信開始URLが含まれ、ここにアクセスすると
    // 配信リソースを用いた動作が開始されます
    //
    // 別にここで返さず固定でも良いのですが、配信開始用URLを
    // 動的に生成したいという場合にも対応出来る様になっていそうです:
    res
      .type('application/sdp')
      .appendHeader(
        'Location', 
        `${process.env.API_URL}/whip/test-broadcast/${resourcesId}`
      )
      .status(201)
      .send(answer.toString());
  } catch (err) {
    error('Error during WebRTC offer handling: ', err);
    res.status(500).send(`Error during WebRTC offer handling: ${error}`);
  }
});

/**
 * 配信停止用のAPIエンドポイントです
 *
 * OBSの配信停止ボタンを押すとここが呼ばれます
 * 配信開始直後のエラー時などでもOBSはこのエンドポイントを呼び出します
 *
 * リソース解放についてはこちらを参照
 * https://mediasoup.org/documentation/v3/mediasoup/garbage-collection/
 */
app.delete('/whip/test-broadcast/:id', async (req, res) => {
  try {
    const resourcesId = req.params.id;
    if (!(resourcesId in resourcesDict)) {
      res.status(404)
        .send(`resoures with id ${resourcesId} doesn't exist`);
      return;
    }

    const broadcasterResources = 
      resourcesDict[resourcesId].broadcasterResources;
    const broadcasterTransport = 
      broadcasterResources.broadcasterTransport;
    const streamerResources =
      resourcesDict[resourcesId].streamerResources;

    debug(
      'broadcasterTransport stats: %o', 
      await broadcasterTransport?.getStats()
    );

    for (const producer of broadcasterResources.producers) {
      debug('producer stats: %o', await producer.getStats());
    }
    // routerを消してしまうと再接続が難しい、
    // 一旦キープしてtransportだけ再生成してみる？

    //resourcesDict[resourcesId].router.close();

    broadcasterTransport?.close();
    broadcasterResources.producers = [];
   
    streamerResources.forEach(resources => resources.streamerTransport.close());
    resourcesDict[resourcesId].streamerResources = [];

    delete resourcesDict[resourcesId];

    res.status(200)
      .send(`router ${resourcesId} closed.`);
    debug(`transport: ${broadcasterTransport?.id} closed.`);
  } catch (err) {
    error(`Error at ending broadcasting: ${err}`);
    res.status(500).send(`Error at ending broadcasting: ${err}`);  
  }
});

/**
 * 配信の状況（開始・停止）と視聴者数の目安を返します
 * 配信者IDを引数にとる、つまり配信者向けのAPIエンドポイントです
 */
app.get('/broadcasting-status/:broadcastId', async (req, res) => {
  const broadcastId = req.params.broadcastId;

  const searchedEntries = await db.select()
    .from(broadcastIds)
    .where(
      eq(broadcastIds.id, broadcastId)
    );

  if (searchedEntries.length === 0) {
    res.status(404)
      .send(`resoures with id ${broadcastId} doesn't exist`);
    return;
  }

  const searchedEntry = searchedEntries[0];
  if (!searchedEntry.isAvailable) {
    res.status(202)
      .send({
        isBroadcasting: false,
        streamingCount: 0,
      });
    return;
  }

  if (!(broadcastId in resourcesDict)) {
    res.status(200)
      .send({
        isBroadcasting: false,
        streamingCount: 0,
      });
    return;
  }

  const streamingCount = 
    resourcesDict[broadcastId].streamerResources.length;

  res.status(200).send({ 
    streamingCount,
    isBroadcasting: true,
  });
});

/**
 * 配信の状況（開始・停止）と視聴者数の目安を返します
 * 視聴IDを引数にとる、つまり視聴者向けのAPIエンドポイントです
 * TODO
 * 視聴者向けの方が呼び出される回数が多いのに、
 * resourcesDictをO(n)で探索するアルゴリズムで良いのか......?
 */
app.get('/streaming-status/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === channelId);
    if (resources == null) {
      res.status(404)
        .send(`resoures with stream id ${channelId} doesn't exist`);
      return;
    }

    // TODO 
    // 配信が終了すると404になるので
    // isBroadcasting を返すのはどうなのだろう...
    res.status(200).send({
      streamingCount: resources.streamerResources.length,
      isBroadcasting: true,
    });

  } catch (err) {
    res.status(500).send(err);
  }
});

/**
 * 配信IDに関連付けられている配信チャンネルを変更します
 * TODO
 * 配信前は変更できない？あまり直感的ではないかも
 */
app.post('/current-channel/:broadcastId', async (req, res) => {
  const broadcastId = req.params.broadcastId;
  const broadcastInfos = await db.select()
    .from(broadcastIds)
    .where(eq(broadcastIds.id, broadcastId));
  if (broadcastInfos.length === 0) {
    res.status(404).send(`specified broadcast id is not registered`);
    return;
  }

  const params = req.body;
  // TODO 
  // 配信開始前にはリソースが存在しないがどうするか？
  if (!(broadcastId in resourcesDict)) {
    res.status(202).send(`broadcast has not started.`);
    return;
  } 
  resourcesDict[broadcastId].streamId = params.currentChannelId;

  res.status(200).send('success: current channel modified');
});

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * 視聴者側（ブラウザ側で動作するmediasoup-client）に、
 * サーバ側のmediasoup routerの、多分音声や動画のフォーマットを伝えます
 */
app.get('/mediasoup/router-rtp-capabilities/:id', async (req, res) => {
  try {
    const streamId = req.params.id;
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      res.status(404)
        .send(`resoures with stream id ${streamId} doesn't exist`);
      return;
    }
    const router = resources.router;
    res.status(200).send(router.rtpCapabilities);
  } catch (err) {
    error(`Error at GET router-rtp-capabilities: ${err}`);
    res.status(500).send(`Error at GET router-rtp-capabilities: ${err}`);  
  }
});

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * サーバ側で視聴者用transportを生成し、
 * クライアント（視聴者ブラウザで動作するmediasoup-client transport）を接続するための
 * パラメータ通知を行います、多分ポート番号とか？
 *
 * クライアント側ではこの結果を元にtransportを生成しています:
 */
app.get('/mediasoup/streamer-transport-parameters/:id', async (req, res) => {
  try {
    const streamId = req.params.id;
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      res.status(404)
        .send(`resoures with stream id ${streamId} doesn't exist`);
      return;
    }

    const router = resources.router;
    const streamerResources = resources.streamerResources;

    // TODO : streamerの人数制限はここで行う
    const streamerTransport = await createWebRtcTransport(router, webRtcServer);

    // 視聴者用のtransport接続状態がdisconnectedになったらリソースを解放する
    streamerTransport.on('icestatechange', (state: IceState) => {
      debug(`streamerTransport (${streamerTransport.id}) ice stage changed to ${state}`);
      if (state === 'disconnected') {
        const streamerResource = resources
          .streamerResources
          .find(resource => 
            resource.streamerTransport.id === streamerTransport.id
           );
        if (streamerResource != null) {
          // 切断されたstreamerのリソース開放
          streamerResource.consumers.forEach(c => c.close());
          resources.streamerResources = resources
            .streamerResources
            .filter(resource => 
              resource.streamerTransport.id !== streamerTransport.id
            );
          debug(`streamer resources (${streamerTransport.id}) has been released`);
        }
      }
    });

    streamerResources.push({
      streamerTransport,
      consumers: [],
    });

    res.status(200).send({
      id: streamerTransport.id,
      dtlsParameters: streamerTransport.dtlsParameters,
      iceParameters: streamerTransport.iceParameters,
      iceCandidates: streamerTransport.iceCandidates,
    });
  } catch (err) {
    error(`Error at GET streamer-transport-parameters: ${err}`);
    res.status(500).send(`Error at GET streamer-transport-parameters: ${err}`);  
  }
});

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * クライアント側でtransportが生成され、接続の準備が整った段階で呼ばれます
 * 視聴用IDと、事前にクライアント側に伝えられていたtransportIdを用いて
 * サーバ側とクライアント側のtransportを接続します
 */
app.post('/mediasoup/client-connect/:streamId/:transportId', async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const transportId = req.params.transportId;
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      res.status(404)
        .send(`resoures with stream id ${streamId} doesn't exist`);
      return;
    }

    const streamerResource = resources
      .streamerResources
      .find(resource => resource.streamerTransport.id === transportId);
    if (streamerResource == null) {
      res.status(404)
        .send(`transportId ${transportId} is not found in resources with streamId ${streamId}`);
        return;
    }

    const streamerTransport = streamerResource.streamerTransport;
    const dtlsParameters = req.body;

    await streamerTransport.connect({ dtlsParameters });
    streamerTransport.on('icestatechange', (iceState) =>
      debug('streamer transport ice change: ', iceState)
    );
    res.status(200).send('client connect callback handled');
  } catch (err) {
    error(`Error at POST client-connect: ${err}`);
    res.status(500).send(`Error at POST client-connect: ${err}`);  
  }
});

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * サーバ側とクライアント側のtransportが接続された後、
 * 互換性のあるproducerとconsumerのセットを生成するために用いられれます
 * クライアント側の動画や音声のフォーマット対応についての情報が送られてくるので、
 * それがサーバ側のproducerと対応しており、consumerを生成できるなら、生成します
 */
app.post('/mediasoup/consumer-parameters/:streamId/:transportId', async (req, res) => {
  try {
    const clientCapabilities = req.body;
    
    const streamId = req.params.streamId;
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      res.status(404)
        .send(`resoures with stream id ${streamId} doesn't exist`);
      return;
    }

    const transportId = req.params.transportId;
    const streamerResource = resources
      .streamerResources
      .find(resource => resource.streamerTransport.id === transportId);
    if (streamerResource == null) {
      res.status(404)
        .send(`transportId ${transportId} is not found in resourcesId ${streamId}`);
        return;
    }

    debug('consumer-parameters: ', streamId, transportId); 

    const broadcasterResources = resources.broadcasterResources;
    const router = resources.router;

    type ConsumerParameters =  {
      id: string;
      producerId: string;
      kind: MediaKind;
      rtpParameters: RtpParameters;
    };
    const consumerParameters: ConsumerParameters[] = [];
    for (const producer of broadcasterResources.producers) {
      const canConsume = router.canConsume({
        producerId: producer.id,
        rtpCapabilities: clientCapabilities,
      });
      if (canConsume) {
        const consumer = await streamerResource
          .streamerTransport.consume({
            producerId: producer.id,
            rtpCapabilities: clientCapabilities,
            paused: true,
          });
        debug('consumer created: ', consumer.id, consumer.kind);
        streamerResource.consumers.push(consumer);
        consumerParameters.push({
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } else {
        warn(
          `streamId ${streamId} cannot consume producer ${producer.id}`
        );
      }
    }

    res.status(200).send(consumerParameters);
  } catch (err) {
    error(`Error at POST consumer-parameters: ${err}`);
    res.status(500).send(`Error at POST consumer-parameters: ${err}`);  
  }
});

/**
 * 視聴者とやりとりするためのAPIエンドポイントの一つ
 * サーバ側とクライアント側のcapabilities情報を交換して（それまでの手続きが色々ありますが）
 * 生成されたサーバ側のconsumerはpaused状態なので、
 * クライアント側で再生準備が整うとこのAPIエンドポイントが呼ばれ、ストリーム送信が開始されます
 */
app.post('/mediasoup/resume-consumer/:streamId/:transportId', async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const resources = Object.values(resourcesDict)
      .find(resources => resources.streamId === streamId);
    if (resources == null) {
      res.status(404)
        .send(`resoures with stream id ${streamId} doesn't exist`);
      return;
    }

    const transportId = req.params.transportId;
    const streamerResource = resources
      .streamerResources
      .find(resource => resource.streamerTransport.id === transportId);
    if (streamerResource == null) {
      res.status(404)
        .send(`transportId ${transportId} is not found in resources with streamId ${streamId}`);
        return;
    }

    streamerResource.consumers.forEach(async c => await c.resume());
    res.status(200).send();
  } catch (err) {
    error(`Error at POST resume-consumer: ${err}`);
    res.status(500).send(`Error at POST resume-consumer: ${err}`);  
  }
});

const httpServer = createServer(app);
const port = Number(process.env.PORT ?? 4000)

httpServer.listen(
  port,
  () => console.log(`videmus webrtc server started on port ${port}`),
);


