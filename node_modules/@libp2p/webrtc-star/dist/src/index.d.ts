import type { PeerDiscovery } from '@libp2p/interface-peer-discovery';
import type { Transport } from '@libp2p/interface-transport';
import { WebRTCStarComponents, WebRTCStarInit } from './transport.js';
export interface WebRTCStarTuple {
    transport: (components: WebRTCStarComponents) => Transport;
    discovery: (components?: WebRTCStarComponents) => PeerDiscovery;
}
export declare function webRTCStar(init?: WebRTCStarInit): WebRTCStarTuple;
//# sourceMappingURL=index.d.ts.map