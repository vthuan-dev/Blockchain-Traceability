# it-concat

[![codecov](https://img.shields.io/codecov/c/github/alanshaw/it-concat.svg?style=flat-square)](https://codecov.io/gh/alanshaw/it-concat)
[![CI](https://img.shields.io/github/actions/workflow/status/alanshaw/it-concat/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/alanshaw/it-concat/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Concat all buffers/strings yielded from an async iterable into a single BufferList/string

# Install

```console
$ npm i it-concat
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `ItConcat` in the global namespace.

```html
<script src="https://unpkg.com/it-concat/dist/index.min.js"></script>
```

## Usage

Concat Uint8Arrays to a single [`Uint8ArrayList`](https://www.npmjs.com/package/uint8arraylist):

```js
import concat from 'it-concat'
import { toString } from 'uint8arrays'
import fs from 'fs'

fs.writeFileSync('./test.txt', 'Hello World!')

// Node.js Readable Streams are async iterables!
const chunks = await concat(fs.createReadStream('./test.txt'))

// chunks is a Uint8ArrayList
console.log(chunks)
/*
Uint8ArrayList {
  _bufs: [ <Uint8Array 48 65 6c 6c 6f 20 57 6f 72 6c 64 21> ],
  length: 12
}
*/
console.log(toString(chunks.subarray)))
// Hello World!
```

Concat Uint8Arrays to a single *string*:

```js
import concat from 'it-concat'
import fs from 'fs'

fs.writeFileSync('./test.txt', 'Hello World!')

// Node.js Readable Streams are async iterables!
// Note that we pass `{ type: 'string' }` to tell concat that we want a string
// back and not a Uint8Array. This is necessary because the source data is Uint8Array(s).
const chunks = await concat(fs.createReadStream('./test.txt'), { type: 'string' })

console.log(chunks)
// Hello World!
```

Concat strings to a single string:

```js
import concat from 'it-concat'
import fs from 'fs'

fs.writeFileSync('./test.txt', 'Hello World!')

// Node.js Readable Streams are async iterables!
// Note that we don't need to pass `{ type: 'string' }` to tell concat that we
// want a string back because the source data is Uint8Array(s).
const chunks = await concat(fs.createReadStream('./test.txt', { encoding: 'utf8' }))

console.log(chunks)
// Hello World!
```

## API

```js
import concat from 'it-concat'
```

### `concat(source, options?): Promise`

Concat all Uint8Arrays or strings yielded from the async iterable `source` into a single [`Uint8ArrayList`](https://www.npmjs.com/package/bl) or `string`.

- `source` (`AsyncIterable<Uint8Array | Uint8ArrayList | string>`) - the source iterable to concat from
- `options` (`Object`) - optional options
- `options.type` (`string`) - return type of the function, pass `'string'` to recieve a string or `'Uint8Array'` for a `Uint8ArrayList`.

Returns a `Promise` that resolves to a `Uint8ArrayList` or `string`.

If `options.type` is *not* passed the type of the objects yielded from the `source` is detected and a `Uint8ArrayList` or `string` is returned appropriately. If the `source` does not yield anything an empty `Uint8ArrayList` is returned. If the source is expected to return strings (but may not yield anything), pass `options.type: 'string'` to ensure an empty string is returned instead of an empty `Uint8ArrayList`.

## Related

- [`stream-to-it`](https://www.npmjs.com/package/stream-to-it) Convert Node.js streams to streaming iterables
- [`it-pipe`](https://www.npmjs.com/package/it-pipe) Utility to "pipe" async iterables together

[List of awesome modules for working with async iterables](https://github.com/alanshaw/it-awesome).

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
