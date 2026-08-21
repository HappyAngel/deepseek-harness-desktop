import { describe, expect, it } from 'vitest'
import { compareVersions, parseLatestHarnessRelease, versionFromTag } from './harness-release.js'

describe('Harness release metadata', () => {
  it('selects the first published Harness release, including a prerelease', () => {
    expect(parseLatestHarnessRelease([
      { draft: true, tag_name: 'dsh-v9.0.0', body: 'draft', html_url: 'https://example.test/draft' },
      { draft: false, tag_name: 'dsh-v0.1.0-rc.8', body: 'Changes', html_url: 'https://example.test/release' },
    ])).toEqual({ tag: 'dsh-v0.1.0-rc.8', version: 'v0.1.0-rc.8', notes: 'Changes', url: 'https://example.test/release' })
  })

  it('compares prerelease identifiers numerically', () => {
    expect(compareVersions('v0.1.0-rc.10', 'v0.1.0-rc.8')).toBeGreaterThan(0)
    expect(compareVersions('v0.1.0', 'v0.1.0-rc.10')).toBeGreaterThan(0)
    expect(compareVersions('v0.1.0-rc.8', 'v0.1.0-rc.8')).toBe(0)
  })

  it('accepts both the Git tag and display version forms', () => {
    expect(versionFromTag('dsh-v0.1.0-rc.8')).toBe('v0.1.0-rc.8')
    expect(versionFromTag('v0.1.0-rc.8')).toBe('v0.1.0-rc.8')
    expect(versionFromTag('main')).toBeUndefined()
  })
})
