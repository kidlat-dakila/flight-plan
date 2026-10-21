const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+|)(\+[0-9A-Za-z.-]+)?$/

interface Version {
  readonly numbers: readonly [number, number, number]
  readonly isPrerelease: boolean
}

const parseVersion = (text: string): Version | null => {
  const match = VERSION_PATTERN.exec(text.trim())
  if (match === null) return null
  const [, major, minor, patch, prerelease] = match
  return { numbers: [Number(major), Number(minor), Number(patch)], isPrerelease: prerelease !== "" }
}

const compareNumbers = (left: Version, right: Version): number =>
  left.numbers.map((number, index) => number - right.numbers[index]).find((difference) => difference !== 0) ?? 0

export const isNewerVersion = (candidate: string, current: string): boolean => {
  const candidateVersion = parseVersion(candidate)
  const currentVersion = parseVersion(current)
  if (candidateVersion === null || currentVersion === null) return false
  const difference = compareNumbers(candidateVersion, currentVersion)
  if (difference !== 0) return difference > 0
  return currentVersion.isPrerelease && !candidateVersion.isPrerelease
}
