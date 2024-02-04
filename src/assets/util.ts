export function promiseWithResolvers<T>() {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * Evaluate javascript {@param code} in global scope.
 */
export function globalEval(code: string) {
  const script = document.createElement('script')
  script.text = code
  if (document.head.appendChild(script).parentNode) {
    script.parentNode?.removeChild(script)
  }
}

/**
 * Evaluate `fetch` response as javascript in global scope if the response is ok and the content type is `text/javascript`.
 */
export async function evalResponseJavascript(response: Response) {
  if (response.ok && response.headers.get('Content-Type')?.includes('text/javascript')) {
    globalEval(await response.text())
  }
}

export function ensureNonNull<T>(value?: T | null): T {
  if (value == null) {
    throw new Error('null')
  }
  return value
}
