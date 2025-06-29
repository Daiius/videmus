import createDebug from 'debug';

const LOG_PREFIX = 'videmus:webrtc';

export const debug  = createDebug(`${LOG_PREFIX}`);
export const warn   = createDebug(`${LOG_PREFIX}:WARN`);
export const error  = createDebug(`${LOG_PREFIX}:ERROR`);

