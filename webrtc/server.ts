import { createServer } from 'http';
import { Socket } from 'net';
import express from 'express';
import { createWorker } from 'mediasoup';
import { 
  Worker,
  RtpParameters,
  MediaKind,
} from 'mediasoup/node/lib/types';

import { mediaCodecs } from './codecs';
import { 
  ResourcesDict,
  createWebRtcTransport,
} from './resources';

import { RemoteSdp } from 'mediasoup-client/lib/handlers/sdp/RemoteSdp';

import sdpTransform from 'sdp-transform';
import ortc from 'mediasoup-client/lib/ortc';
import sdpCommonUtils from 'mediasoup-client/lib/handlers/sdp/commonUtils';
import sdpUnifiedPlanUtils from 'mediasoup-client/lib/handlers/sdp/unifiedPlanUtils';

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


const worker: Worker = await createWorker({
  logLevel: 'warn',
  logTags: [ 'info', 'ice', 'dtls', 'rtp', 'rtcp' ],
  rtcMinPort: 50000,
  rtcMaxPort: 50100,
});
console.log('Worker created');

const resourcesDict: ResourcesDict = {};

// 現時点では2種類に留めることで、2配信のみ処理する
// NOTE : IDを推測されづらいように考えた通信フローが台無しではある...
const IdPatterns = [ 'yellow-chart', 'blue-chart' ];

app.post('/id', async (_req, res) => {
  console.log('/id post access');

  try {
    const availableId = IdPatterns.find(id => !(id in resourcesDict));
    if (availableId == null) {
      res.status(503).send('All channels are occupied');
      return;
    }
    console.log(`id: ${availableId} created`);

    resourcesDict[availableId] = {
      router: await worker.createRouter({ mediaCodecs }),
      streamerResources: [],
      broadcasterResources: {
        broadcasterTransport: undefined,
        producers: [],
      },
    };
    
    res.status(200).send({ id: availableId });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.get('/id/:id', async (req, res) => {
  const resourcesId = req.params.id;
  resourcesId in resourcesDict
    ? res.status(200).send()
    : res.status(404).send();
});


/**
 * for OBS WHIP protocol
 * 
 *
 */
app.post('/whip/:id', async (req, res) => {
  const resourcesId = req.params.id;
  if (!(resourcesId in resourcesDict)) {
    res.status(404)
      .send(`resoures with id ${resourcesId} doesn't exist`);
    return;
  }

  console.log(`/whip/${resourcesId} post access`);

  const resources = resourcesDict[resourcesId];
  const router = resources.router;
  const broadcasterResources = resources.broadcasterResources;

  try {
    const localSdpObject = sdpTransform.parse(req.body.toString());
    const rtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
      sdpObject: localSdpObject
    });
    const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
      sdpObject: localSdpObject
    });
    const extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(
      rtpCapabilities, 
      router.rtpCapabilities
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
    // 毎回作り直してみる
    const broadcasterTransport = await createWebRtcTransport(router);
    broadcasterResources.broadcasterTransport = broadcasterTransport;

    broadcasterTransport.observer.on(
      'icestatechange', 
      (newIceState) => console.log(
        `broadcaster ICE state changed to: ${newIceState}`
      )
    );

    const remoteSdp = new RemoteSdp({
      iceParameters: broadcasterTransport.iceParameters,
      iceCandidates: broadcasterTransport.iceCandidates,
      dtlsParameters: {
        ...broadcasterTransport.dtlsParameters,
        role: 'client',
      },
      sctpParameters: broadcasterTransport.sctpParameters,
    });
    
    await broadcasterTransport.connect({ dtlsParameters });


    for (const { type, mid } of localSdpObject.media) {

      console.log('type, mid: ', { type, mid });

      const mediaSectionIdx = 
        remoteSdp.getNextMediaSectionIdx();
      const offerMediaObject = 
        localSdpObject.media[mediaSectionIdx.idx];
      console.log('offerMediaObject: ', offerMediaObject);

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
    
      console.log('%o', sendingRtpParameters);
      console.log('%o', sendingRemoteRtpParameters);

      remoteSdp.send({
        offerMediaObject,
        reuseMid: mediaSectionIdx.reuseMid,
        offerRtpParameters: sendingRtpParameters,
        answerRtpParameters: sendingRemoteRtpParameters,
        codecOptions: {},
        extmapAllowMixed: true
      });

      const producer = await broadcasterTransport.produce({
        kind: type as 'video' | 'audio',
        rtpParameters: sendingRtpParameters
      });
  
      console.log('producer created: ', producer);

      resourcesDict[resourcesId]
        .broadcasterResources
        .producers
        .push(producer);
    }

    const answer = remoteSdp.getSdp();
    console.log('answer: ', answer);

    res
      .type('application/sdp')
      .appendHeader(
        'Location', 
        `${process.env.HOST_URL}/api/whip/test-broadcast/${resourcesId}`
      )
      .status(201)
      .send(answer.toString());
  } catch (error) {
    console.error('Error during WebRTC offer handling: ', error);
    res.status(500);
  }
});

app.delete('/whip/test-broadcast/:id', async (req, res) => {
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

  console.log(
    'broadcasterTransport stats: %o', 
    await broadcasterTransport?.getStats()
  );

  for (const producer of broadcasterResources.producers) {
    console.log('producer stats: %o', await producer.getStats());
  }
  // routerを消してしまうと再接続が難しい、
  // 一旦キープしてtransportだけ再生成してみる？

  //resourcesDict[resourcesId].router.close();

  broadcasterTransport?.close();
  broadcasterResources.producers = [];
 
  streamerResources.forEach(resources => resources.streamerTransport.close());
  resourcesDict[resourcesId].streamerResources = [];


  // TODO : closeしたstreamerTransportを削除する処理
  // TODO : 一定時間再接続が無かった場合にリソース開放を行う処理

  res.status(200)
    .send(`router ${resourcesId} closed.`);
  console.log(`transport: ${broadcasterTransport?.id} closed.`);
});

app.get('/mediasoup/router-rtp-capabilities/:id', async (req, res) => {
  const resourcesId = req.params.id;
  if (!(resourcesId in resourcesDict)) {
    res.status(404)
      .send(`resoures with id ${resourcesId} doesn't exist`);
    return;
  }
  const router = resourcesDict[resourcesId].router;
  res.status(200).send(router.rtpCapabilities);
});

app.get('/mediasoup/streamer-transport-parameters/:id', async (req, res) => {
  const resourcesId = req.params.id;
  if (!(resourcesId in resourcesDict)) {
    res.status(404)
      .send(`resoures with id ${resourcesId} doesn't exist`);
    return;
  }

  const router = resourcesDict[resourcesId].router;
  const streamerResources = 
    resourcesDict[resourcesId].streamerResources;

  // TODO : streamerの人数制限はここで行う
  const streamerTransport = await createWebRtcTransport(router);
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
});

app.post('/mediasoup/client-connect/:resourcesId/:transportId', async (req, res) => {
  const resourcesId = req.params.resourcesId;
  const transportId = req.params.transportId;
  if (!(resourcesId in resourcesDict)) {
    res.status(404)
      .send(`resoures with id ${resourcesId} doesn't exist`);
    return;
  }

  const streamerResource = 
    resourcesDict[resourcesId]
    .streamerResources
    .find(resource => resource.streamerTransport.id === transportId);
  if (streamerResource == null) {
    res.status(404)
      .send(`transportId ${transportId} is not found in resourcesId ${resourcesId}`);
      return;
  }

  const streamerTransport = streamerResource.streamerTransport;
  const dtlsParameters = req.body;
  try {
    // 動くバージョンではなぜかawaitが無い...
    streamerTransport.connect({ dtlsParameters });
    streamerTransport.on('icestatechange', (iceState) =>
      console.log('streamer transport ice change: ', iceState)
    );
    res.status(200).send('client connect callback handled');
  } catch (err) {
    res.status(500).send(`error: ${err}`);
  }
});

app.post('/mediasoup/consumer-parameters/:resourcesId/:transportId', async (req, res) => {
  const clientCapabilities = req.body;
  
  const resourcesId = req.params.resourcesId;
  if (!(resourcesId in resourcesDict)) {
    res.status(404)
      .send(`resoures with id ${resourcesId} doesn't exist`);
    return;
  }

  const transportId = req.params.transportId;
  const streamerResource = 
    resourcesDict[resourcesId]
    .streamerResources
    .find(resource => resource.streamerTransport.id === transportId);
  if (streamerResource == null) {
    res.status(404)
      .send(`transportId ${transportId} is not found in resourcesId ${resourcesId}`);
      return;
  }

  console.log('consumer-parameters: ',resourcesId, transportId); 

  const broadcasterResources =
    resourcesDict[resourcesId].broadcasterResources;
  const router = resourcesDict[resourcesId].router;

  type ConsumerParameters =  {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  };
  try {
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
        console.log('consumer created: ', consumer.id, consumer.kind);
        streamerResource.consumers.push(consumer);
        consumerParameters.push({
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } else {
        console.warn(
          `resourcesId ${resourcesId} cannot consume producer ${producer.id}`
        );
      }
    }

    res.status(200).send(consumerParameters);
  } catch (error) {
    res.status(500).send(`error: ${error}`);
  }
});

app.post('/mediasoup/resume-consumer/:resourcesId/:transportId', async (req, res) => {
  const resourcesId = req.params.resourcesId;
  if (!(resourcesId in resourcesDict)) {
    res.status(404)
      .send(`resoures with id ${resourcesId} doesn't exist`);
    return;
  }

  const transportId = req.params.transportId;
  const streamerResource = 
    resourcesDict[resourcesId]
    .streamerResources
    .find(resource => resource.streamerTransport.id === transportId);
  if (streamerResource == null) {
    res.status(404)
      .send(`transportId ${transportId} is not found in resourcesId ${resourcesId}`);
      return;
  }

  streamerResource.consumers.forEach(async c => await c.resume());

  res.status(200).send();
});

const httpServer = createServer(app);
let connections: Socket[] = [];
httpServer.listen(3000, () => {
  console.log('mediasoup server running on port 3000');
});
httpServer.on('connection', (conn) => {
  connections.push(conn);
  conn.on('close', () => {
    connections = connections.filter(curr => curr !== conn);
  });
});

const shutdown = () => {
  console.log('Recieved shutdown signal');
  httpServer.close(() => console.log('http server closed'));
  worker.close();
  console.log('mediasoup worker closed');
  connections.forEach(conn => conn.destroy());

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

