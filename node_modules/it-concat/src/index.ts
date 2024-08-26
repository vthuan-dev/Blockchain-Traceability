import { Uint8ArrayList, isUint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const TypeDefault: Record<string, () => any> = {
  string: () => '',
  buffer: () => new Uint8ArrayList()
}

function concat (source: Iterable<string> | AsyncIterable<string>, options?: { type: 'string' }): Promise<string>
function concat (source: Iterable<string> | AsyncIterable<string>, options?: { type: 'buffer' }): Promise<Uint8ArrayList>
function concat (source: Iterable<Uint8Array | Uint8ArrayList> | AsyncIterable<Uint8Array | Uint8ArrayList>, options?: { type: 'buffer' }): Promise<Uint8ArrayList>
function concat (source: Iterable<Uint8Array | Uint8ArrayList> | AsyncIterable<Uint8Array | Uint8ArrayList>, options: { type: 'string' }): Promise<string>
async function concat (source: any, options: any): Promise<any> {
  options = options ?? {}
  let type: 'string' | 'buffer' = options.type

  if (type != null && TypeDefault[type] == null) {
    throw new Error(`invalid output type "${type}"`)
  }

  let res: string | Uint8ArrayList | undefined
  for await (const chunk of source) {
    if (res == null) {
      type = type ?? (typeof chunk === 'string' ? 'string' : 'buffer')
      res = TypeDefault[type]()
    }

    if (typeof res === 'string') {
      if (typeof chunk === 'string') {
        res += chunk
      } else if (chunk instanceof Uint8Array) {
        res += uint8ArrayToString(chunk)
      } else if (isUint8ArrayList(chunk)) {
        res += uint8ArrayToString(chunk.subarray())
      } else {
        throw new Error(`invalid chunk type "${typeof chunk}"`)
      }
    } else if (res == null) {
      throw new Error(`invalid output type "${type}"`)
    } else {
      if (typeof chunk === 'string') {
        res.append(uint8ArrayFromString(chunk))
      } else if (chunk instanceof Uint8Array || isUint8ArrayList(chunk)) {
        res.append(chunk)
      } else {
        throw new Error(`invalid chunk type "${typeof chunk}"`)
      }
    }
  }

  return res ?? TypeDefault[type ?? 'buffer']()
}

export default concat
