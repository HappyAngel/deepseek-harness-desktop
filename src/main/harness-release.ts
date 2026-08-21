/** The public GitHub endpoint used to read Harness release metadata. */
export const HARNESS_RELEASES_URL = 'https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=20'

/** One published Harness release suitable for a checkout update. */
export interface HarnessRelease {
  readonly tag: string
  readonly version: string
  readonly notes: string
  readonly url: string
}

interface GitHubReleaseWire {
  readonly draft?: unknown
  readonly tag_name?: unknown
  readonly body?: unknown
  readonly html_url?: unknown
}

/** Remove the Git tag prefix used by Harness releases for display and comparison. */
export function versionFromTag(tag: string): string | undefined {
  const version = tag.startsWith('dsh-') ? tag.slice('dsh-'.length) : tag
  return /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version) ? version : undefined
}

/** Parse the subset of a GitHub Release response that the desktop application uses. */
export function parseLatestHarnessRelease(value: unknown): HarnessRelease {
  if (!Array.isArray(value)) throw new Error('GitHub Releases returned an invalid response')
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue
    const release = item as GitHubReleaseWire
    if (release.draft === true || typeof release.tag_name !== 'string') continue
    const version = versionFromTag(release.tag_name)
    if (version === undefined) continue
    if (typeof release.body !== 'string' || typeof release.html_url !== 'string') {
      throw new Error(`GitHub Release ${release.tag_name} is missing its notes or URL`)
    }
    return { tag: release.tag_name, version, notes: release.body, url: release.html_url }
  }
  throw new Error('GitHub Releases returned no published Harness release')
}

/** Read the newest published release, including prereleases, from GitHub. */
export async function fetchLatestHarnessRelease(fetcher: typeof fetch = fetch): Promise<HarnessRelease> {
  const response = await fetcher(HARNESS_RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`GitHub Releases request failed (${response.status} ${response.statusText})`)
  return parseLatestHarnessRelease(await response.json())
}

interface ParsedVersion {
  readonly numbers: readonly number[]
  readonly prerelease: readonly string[]
}

/** Compare two release versions, including numeric prerelease identifiers such as rc.10. */
export function compareVersions(left: string, right: string): number {
  const leftParsed = parseVersion(left)
  const rightParsed = parseVersion(right)
  if (leftParsed === undefined || rightParsed === undefined) throw new Error(`Cannot compare Harness versions "${left}" and "${right}"`)
  for (let index = 0; index < leftParsed.numbers.length; index += 1) {
    const comparison = leftParsed.numbers[index]! - rightParsed.numbers[index]!
    if (comparison !== 0) return Math.sign(comparison)
  }
  if (leftParsed.prerelease.length === 0 || rightParsed.prerelease.length === 0) {
    return leftParsed.prerelease.length === rightParsed.prerelease.length ? 0 : leftParsed.prerelease.length === 0 ? 1 : -1
  }
  const length = Math.max(leftParsed.prerelease.length, rightParsed.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParsed.prerelease[index]
    const rightPart = rightParsed.prerelease[index]
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1
    if (leftPart === rightPart) continue
    const leftNumber = /^\d+$/u.test(leftPart) ? Number(leftPart) : undefined
    const rightNumber = /^\d+$/u.test(rightPart) ? Number(rightPart) : undefined
    if (leftNumber !== undefined && rightNumber !== undefined) return Math.sign(leftNumber - rightNumber)
    if (leftNumber !== undefined) return -1
    if (rightNumber !== undefined) return 1
    return leftPart.localeCompare(rightPart)
  }
  return 0
}

function parseVersion(version: string): ParsedVersion | undefined {
  const match = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/u.exec(version)
  if (match === null) return undefined
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split('.') ?? [],
  }
}
