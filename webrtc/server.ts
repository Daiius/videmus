import { createServer } from 'http';
import express from 'express';

import { debug, warn, error } from './logger';

import { createWorker } from 'mediasoup';
import { 
  Worker,
  RtpParameters,
  MediaKind,
  IceState,
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

import { eq } from 'drizzle-orm';
import { db } from 'videmus-database/db';
import { broadcastIds } from 'videmus-database/db/schema';


const test = await db.select().from(broadcastIds);
debug(test);

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
debug('Worker created');

const resourcesDict: ResourcesDict = {};

/**
 * for OBS WHIP protocol
 * 
 *
 */
app.post('/whip/:id', async (req, res) => {
  try {
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
      (newIceState) => debug(
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
        extmapAllowMixed: true
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

    res
      .type('application/sdp')
      .appendHeader(
        'Location', 
        `${process.env.HOST_URL}/api/whip/test-broadcast/${resourcesId}`
      )
      .status(201)
      .send(answer.toString());
  } catch (err) {
    error('Error during WebRTC offer handling: ', err);
    res.status(500).send(`Error during WebRTC offer handling: ${error}`);
  }
});

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
    const streamerTransport = await createWebRtcTransport(router);

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
httpServer.listen(
  3000, 
  () => console.log('videmus webrtc server started on port 3000'),
);


