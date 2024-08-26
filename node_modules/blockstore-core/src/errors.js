import errCode from 'err-code'

/**
 * @param {Error} [err]
 */
export function notFoundError (err) {
  err = err || new Error('Not Found')
  return errCode(err, 'ERR_NOT_FOUND')
}

/**
 * @param {Error} [err]
 */
export function abortedError (err) {
  err = err || new Error('Aborted')
  return errCode(err, 'ERR_ABORTED')
}
