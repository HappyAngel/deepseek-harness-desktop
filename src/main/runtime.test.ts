import { describe, expect, it } from 'vitest'
import { readReadyUrl } from './runtime.js'

describe('readReadyUrl', () => {
  it('accepts the Harness-owned ready line, even among other output', () => {
    expect(readReadyUrl('booting\ndsh web: http://127.0.0.1:41871\nready')).toBe('http://127.0.0.1:41871')
  })

  it('does not trust a non-loopback or malformed URL', () => {
    expect(readReadyUrl('dsh web: http://localhost:3080')).toBeUndefined()
    expect(readReadyUrl('dsh web: http://127.0.0.1:port')).toBeUndefined()
  })
})
