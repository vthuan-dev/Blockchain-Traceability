import { WebRTCStar } from './transport.js';
export function webRTCStar(init = {}) {
    const transport = new WebRTCStar(init);
    return {
        transport: (components) => {
            transport.peerId = components.peerId;
            return transport;
        },
        discovery: transport.discovery
    };
}
//# sourceMappingURL=index.js.map