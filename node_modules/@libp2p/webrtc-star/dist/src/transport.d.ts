import type { Multiaddr } from '@multiformats/multiaddr';
import { WebRTCInitiator } from '@libp2p/webrtc-peer';
import { EventEmitter } from '@libp2p/interfaces/events';
import type { Startable } from '@libp2p/interfaces/startable';
import { symbol } from '@libp2p/interface-transport';
import type { WRTC, WebRTCInitiatorInit, WebRTCReceiver, WebRTCReceiverInit } from '@libp2p/webrtc-peer';
import type { Connection, MultiaddrConnection } from '@libp2p/interface-connection';
import type { Transport, Listener, DialOptions, CreateListenerOptions } from '@libp2p/interface-transport';
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery';
import type { WebRTCStarSocket, HandshakeSignal } from '@libp2p/webrtc-star-protocol';
import { symbol as peerDiscoverySymbol } from '@libp2p/interface-peer-discovery';
import type { PeerId } from '@libp2p/interface-peer-id';
export declare class WebRTCStarDiscovery extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery, Startable {
    private started;
    get [peerDiscoverySymbol](): true;
    get [Symbol.toStringTag](): string;
    isStarted(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    dispatchEvent(event: CustomEvent): boolean;
}
export interface WebRTCStarInit {
    wrtc?: WRTC;
}
export interface WebRTCStarDialOptions extends DialOptions {
    channelOptions?: WebRTCInitiatorInit;
}
export interface WebRTCStarListenerOptions extends CreateListenerOptions, WebRTCInitiatorInit {
    channelOptions?: WebRTCReceiverInit;
}
export interface SignalServerServerEvents {
    'error': CustomEvent<Error>;
    'listening': CustomEvent;
    'peer': CustomEvent<string>;
    'connection': CustomEvent<Connection>;
    'disconnect': CustomEvent;
    'reconnect': CustomEvent;
}
export interface SignalServer extends EventEmitter<SignalServerServerEvents> {
    signallingAddr: Multiaddr;
    socket: WebRTCStarSocket;
    connections: MultiaddrConnection[];
    channels: Map<string, WebRTCReceiver>;
    pendingSignals: Map<string, HandshakeSignal[]>;
    close: () => Promise<void>;
}
export interface WebRTCStarComponents {
    peerId: PeerId;
}
/**
 * @class WebRTCStar
 */
export declare class WebRTCStar implements Transport {
    wrtc?: WRTC;
    discovery: () => PeerDiscovery & Startable;
    sigServers: Map<string, SignalServer>;
    private readonly _discovery;
    peerId?: PeerId;
    constructor(init?: WebRTCStarInit);
    get [symbol](): true;
    get [Symbol.toStringTag](): string;
    dial(ma: Multiaddr, options: WebRTCStarDialOptions): Promise<Connection>;
    _connect(ma: Multiaddr, options: WebRTCStarDialOptions): Promise<WebRTCInitiator>;
    /**
     * Creates a WebrtcStar listener. The provided `handler` function will be called
     * anytime a new incoming Connection has been successfully upgraded via
     * `upgrader.upgradeInbound`.
     */
    createListener(options: WebRTCStarListenerOptions): Listener;
    /**
     * Takes a list of `Multiaddr`s and returns only valid TCP addresses
     */
    filter(multiaddrs: Multiaddr[]): Multiaddr[];
    peerDiscovered(maStr: string): void;
}
//# sourceMappingURL=transport.d.ts.map