import type { PeerId } from '@libp2p/interface-peer-id';
import type { QueryEvent } from '@libp2p/interface-dht';
export interface QueryContext {
    key: Uint8Array;
    peer: PeerId;
    signal: AbortSignal;
    pathIndex: number;
    numPaths: number;
}
/**
 * Query function
 */
export interface QueryFunc {
    (context: QueryContext): AsyncIterable<QueryEvent>;
}
//# sourceMappingURL=types.d.ts.map