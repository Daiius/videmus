import { RtpCodecCapability } from 'mediasoup/types';

export const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },{
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    preferredPayloadType: 107,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
    }
  }, {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {},
  }
];

