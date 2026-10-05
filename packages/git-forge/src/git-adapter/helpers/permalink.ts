import * as crypto from "node:crypto"

export function diffAnchor(path: string): string {
  return crypto.createHash("sha256").update(path, "utf8").digest("hex")
}

export function permalink(
  repo: string,
  pr: number,
  path: string,
  range?: { from: number, to: number },
): string {
  const base = `https://github.com/${repo}/pull/${String(pr)}/files#diff-${diffAnchor(path)}`
  if (range === undefined) return base
  return range.from === range.to
    ? `${base}R${String(range.from)}`
    : `${base}R${String(range.from)}-R${String(range.to)}`
}
