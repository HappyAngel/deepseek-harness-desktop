/** The default loopback address served by `dsh web`. */
export const DEFAULT_HARNESS_URL = 'http://127.0.0.1:3080'

/** Validate and normalize the already-running Harness Web endpoint. */
export function resolveHarnessUrl(configured: string | undefined): string {
  const url = new URL(configured ?? DEFAULT_HARNESS_URL)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('DSH_DESKTOP_URL must use http or https')
  return url.href
}
