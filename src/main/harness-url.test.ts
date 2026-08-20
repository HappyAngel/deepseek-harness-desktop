import { describe, expect, it } from 'vitest'
import { DEFAULT_HARNESS_URL, resolveHarnessUrl } from './harness-url.js'

describe('resolveHarnessUrl', () => {
  it('uses the default local Web service', () => {
    expect(resolveHarnessUrl(undefined)).toBe(`${DEFAULT_HARNESS_URL}/`)
  })

  it('allows a configured HTTP service', () => {
    expect(resolveHarnessUrl('http://127.0.0.1:3081')).toBe('http://127.0.0.1:3081/')
  })

  it('rejects unsupported endpoint protocols', () => {
    expect(() => resolveHarnessUrl('file:///tmp/index.html')).toThrow('DSH_DESKTOP_URL must use http or https')
  })
})
