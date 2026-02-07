import { mediaCodecs } from '../codecs';

import sdpTransform from 'sdp-transform';
import ortc from 'mediasoup-client/ortc';
import sdpCommonUtils from 'mediasoup-client/handlers/sdp/commonUtils';
import sdpUnifiedPlanUtils from 'mediasoup-client/handlers/sdp/unifiedPlanUtils';
import { RemoteSdp } from 'mediasoup-client/handlers/sdp/RemoteSdp';

import { RtpParameters } from 'mediasoup/types';

import { 
  debug, 
  //warn, 
  error,
} from '../logger';

import type { VidemusResult } from '../types'

import { 
  createWebRtcTransport,
  webRtcServer,
} from '../resources';

import { 
  resourcesDict,
  worker,
} from '../resources';
import {getBroadcastsById} from './getBroadcastsById';
import { getUserById } from 'videmus-database/admin';

export type PostWhipArgs = {
  resourcesId: string,
  sdpOffer: string,
}

export type PostWhipResult = {
  url: string,
  sdpAnswer: string,
}

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
export const postWhip = async ({
  resourcesId,
  sdpOffer,
}: PostWhipArgs): Promise<VidemusResult<PostWhipResult>> => {
  try {
    // resourceIdは配信者のIDを指しますが、
    // これで各種リソースを管理しますので、resourceIdとしています
    const searchedEntry = await getBroadcastsById(resourcesId)
    if (searchedEntry == null) {
      return {
        success: false,
        error: {
          type: 'ResourceNotFound',
          message: `resoures with id ${resourcesId} doesn't exist`,
        },
      } ;
    }
    const owner = await getUserById(searchedEntry.ownerId!)
    if (!owner?.isApproved && !owner?.isAdmin) {
      return {
        success: false,
        error: {
          type: "NotAvailable",
          message: `resources with id ${resourcesId} is not available yet`,
        },
      }
    }
    const currentChannelId = searchedEntry.currentChannelId;
    if (currentChannelId == null) {
      return {
        success: false,
        error: {
          type: "ResourceNotFound",
          message: `current channel id is not set`,
        },
      } 
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
    const localSdpObject = sdpTransform.parse(sdpOffer);
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
      if (offerMediaObject == null) {
        throw new Error(`Media section at index ${mediaSectionIdx.idx} not found`);
      }
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
    return {
      success: true,
      data: {
        url: `${process.env.API_URL}/whip/test-broadcast/${resourcesId}`,
        sdpAnswer: answer.toString(),
      },
    }
  } catch (err) {
    error('Error during WebRTC offer handling: ', err);
    return {
      success: false,
      error: {
        type: "Unexpected",
        message: `Error during WebRTC offer handling: ${err}`,
      },
    }
  }
}

