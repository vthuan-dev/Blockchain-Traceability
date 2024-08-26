/**
 * @packageDocumentation
 *
 * This module makes it easy to send and receive Protobuf encoded messages over
 * streams.
 *
 * @example
 *
 * ```typescript
 * import { pbStream } from 'it-pb-stream'
 * import { MessageType } from './src/my-message-type.js'
 *
 * // RequestType and ResponseType have been generate from `.proto` files and have
 * // `.encode` and `.decode` methods for serialization/deserialization
 *
 * const stream = pbStream(duplex)
 * stream.writePB({
 *   foo: 'bar'
 * }, MessageType)
 * const res = await stream.readPB(MessageType)
 * ```
 */

import * as lp from 'it-length-prefixed'
import type { Duplex } from 'it-stream-types'
import { Uint8ArrayList } from 'uint8arraylist'
import { pushable } from 'it-pushable'
import { unsigned } from 'uint8-varint'
import errCode from 'err-code'

/**
 * A protobuf decoder - takes a byte array and returns an object
 */
export interface Decoder<T> {
  (data: Uint8Array | Uint8ArrayList): T
}

/**
 * A protobuf encoder - takes an object and returns a byte array
 */
export interface Encoder<T> {
  (data: T): Uint8Array
}

/**
 * A message reader/writer that only uses one type of message
 */
export interface MessageStream <T, S extends Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> = Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>> {
  /**
   * Read a message from the stream
   */
  read: () => Promise<T>

  /**
   * Write a message to the stream
   */
  write: (d: T) => void

  /**
   * Unwrap the underlying protobuf stream
   */
  unwrap: () => ProtobufStream<S>
}

/**
 * Convenience methods for working with protobuf streams
 */
export interface ProtobufStream <Stream extends Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> = Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>> {
  /**
   * Read a set number of bytes from the stream
   */
  read: (bytes?: number) => Promise<Uint8ArrayList>

  /**
   * Read the next length-prefixed number of bytes from the stream
   */
  readLP: () => Promise<Uint8ArrayList>

  /**
   * Read the next length-prefixed byte array from the stream and decode it as the passed protobuf format
   */
  readPB: <T>(proto: { decode: Decoder<T> }) => Promise<T>

  /**
   * Write the passed bytes to the stream
   */
  write: (input: Uint8Array | Uint8ArrayList) => void

  /**
   * Write the passed bytes to the stream prefixed by their length
   */
  writeLP: (input: Uint8Array | Uint8ArrayList) => void

  /**
   * Encode the passed object as a protobuf message and write it's length-prefixed bytes tot he stream
   */
  writePB: <T>(data: T, proto: { encode: Encoder<T> }) => void

  /**
   * Returns an object with read/write methods for operating on one specific type of protobuf message
   */
  pb: <T> (proto: { encode: Encoder<T>, decode: Decoder<T> }) => MessageStream<T, Stream>

  /**
   * Returns the underlying stream
   */
  unwrap: () => Stream
}

export interface Opts {
  // encoding opts
  poolSize: number
  minPoolSize: number
  lengthEncoder: lp.LengthEncoderFunction

  // decoding opts
  lengthDecoder: lp.LengthDecoderFunction
  maxLengthLength: number
  maxDataLength: number
}

const defaultLengthDecoder: lp.LengthDecoderFunction = (buf) => {
  return unsigned.decode(buf)
}
defaultLengthDecoder.bytes = 0

export function pbStream <Stream extends Duplex<Uint8ArrayList, Uint8Array | Uint8ArrayList>> (duplex: Stream, opts?: Partial<Opts>): ProtobufStream<Stream>
export function pbStream <Stream extends Duplex<Uint8ArrayList, Uint8Array | Uint8ArrayList>> (duplex: Duplex<Uint8Array>, opts?: Partial<Opts>): ProtobufStream<Stream>
export function pbStream (duplex: any, opts: Partial<Opts> = {}): ProtobufStream<any> {
  const write = pushable()

  duplex.sink(write).catch((err: Error) => {
    write.end(err)
  })

  duplex.sink = async (source: any) => {
    for await (const buf of source) {
      write.push(buf)
    }
  }

  let source = duplex.source

  if (duplex.source[Symbol.iterator] != null) {
    source = duplex.source[Symbol.iterator]()
  } else if (duplex.source[Symbol.asyncIterator] != null) {
    source = duplex.source[Symbol.asyncIterator]()
  }

  const readBuffer = new Uint8ArrayList()

  const W: ProtobufStream<any> = {
    read: async (bytes) => {
      if (bytes == null) {
        // just read whatever arrives
        const { done, value } = await source.next()

        if (done === true) {
          return new Uint8ArrayList()
        }

        return value
      }

      while (readBuffer.byteLength < bytes) {
        const { value, done } = await source.next()

        if (done === true) {
          throw errCode(new Error('unexpected end of input'), 'ERR_UNEXPECTED_EOF')
        }

        readBuffer.append(value)
      }

      const buf = readBuffer.sublist(0, bytes)
      readBuffer.consume(bytes)

      return buf
    },
    readLP: async () => {
      let dataLength: number = -1
      const lengthBuffer = new Uint8ArrayList()
      const decodeLength = opts?.lengthDecoder ?? defaultLengthDecoder

      while (true) {
        // read one byte at a time until we can decode a varint
        lengthBuffer.append(await W.read(1))

        try {
          dataLength = decodeLength(lengthBuffer)
        } catch (err) {
          if (err instanceof RangeError) {
            continue
          }

          throw err
        }

        if (dataLength > -1) {
          break
        }

        if (opts?.maxLengthLength != null && lengthBuffer.byteLength > opts.maxLengthLength) {
          throw errCode(new Error('message length length too long'), 'ERR_MSG_LENGTH_TOO_LONG')
        }
      }

      if (opts?.maxDataLength != null && dataLength > opts.maxDataLength) {
        throw errCode(new Error('message length too long'), 'ERR_MSG_DATA_TOO_LONG')
      }

      return await W.read(dataLength)
    },
    readPB: async (proto) => {
      // readLP, decode
      const value = await W.readLP()

      if (value == null) {
        throw new Error('Value is null')
      }

      // Is this a buffer?
      const buf = value instanceof Uint8Array ? value : value.subarray()

      return proto.decode(buf)
    },
    write: (data) => {
      // just write
      if (data instanceof Uint8Array) {
        write.push(data)
      } else {
        write.push(data.subarray())
      }
    },
    writeLP: (data) => {
      // encode, write
      W.write(lp.encode.single(data, opts))
    },
    writePB: (data, proto) => {
      // encode, writeLP
      W.writeLP(proto.encode(data))
    },
    pb: (proto) => {
      return {
        read: async () => await W.readPB(proto),
        write: (d) => { W.writePB(d, proto) },
        unwrap: () => W
      }
    },
    unwrap: () => {
      const originalStream = duplex.source
      duplex.source = (async function * () {
        yield * readBuffer
        yield * originalStream
      }())

      return duplex
    }
  }

  return W
}
