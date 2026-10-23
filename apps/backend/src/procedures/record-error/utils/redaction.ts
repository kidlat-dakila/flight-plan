export interface Identity {
  readonly homePath: string
  readonly userName: string
}

type Replacement = readonly [pattern: RegExp, replacement: string]

const REDACTED = "[redacted]"
const EMAIL_MARK = "[email]"
const USER_MARK = "[user]"
const HOME_MARK = "~"
const SHORTEST_REDACTED_NAME = 2
const BACKSLASH = "\\"
const ESCAPED_BACKSLASH = String.raw`\\`

const SECRET_REPLACEMENTS: readonly Replacement[] = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, `${REDACTED} private key`],
  [/\b((?:proxy-)?authorization)(["']?\s*[:=]\s*["']?)[^"'\r\n,}]+/gi, `$1$2${REDACTED}`],
  [/\b(bearer|basic)\s+[\w\-.~+/]+=*/gi, `$1 ${REDACTED}`],
  [/\b(?:gh[pousr]_\w{20,}|github_pat_\w{20,}|glpat-[\w-]{20,}|ATBB\w{20,}|ATATT[\w=-]{20,}|xox[abpr]-[\w-]{10,}|sk-[\w-]{20,}|AKIA[\dA-Z]{16})/g, REDACTED],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, REDACTED],
  [/\b(\w*(?:token|secret|password|passwd|api[_-]?key|access[_-]?key|credential)s?)(["']?\s*[:=]\s*["']?)[^\s"'&,;}]+/gi, `$1$2${REDACTED}`],
  [/\b([a-z][\d+.a-z-]*:\/\/)[^\s/:@]+(?::[^\s/@]*)?@/gi, `$1${REDACTED}@`],
  [/\b[\w%+.-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi, EMAIL_MARK],
]

const escapeForPattern = (text: string): string => text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`)

const replaceAll = (text: string, [pattern, replacement]: Replacement): string => text.replace(pattern, replacement)

const homeReplacements = (homePath: string): readonly Replacement[] =>
  homePath.length === 0
    ? []
    : [
        [new RegExp(escapeForPattern(homePath.replaceAll(BACKSLASH, ESCAPED_BACKSLASH)), "g"), HOME_MARK],
        [new RegExp(escapeForPattern(homePath), "g"), HOME_MARK],
      ]

const userReplacements = (userName: string): readonly Replacement[] =>
  userName.length < SHORTEST_REDACTED_NAME
    ? []
    : [[new RegExp(String.raw`(?<!\w)${escapeForPattern(userName)}(?!\w)`, "gi"), USER_MARK]]

export const redactText = (text: string, identity: Identity): string =>
  [...homeReplacements(identity.homePath), ...SECRET_REPLACEMENTS, ...userReplacements(identity.userName)].reduce(replaceAll, text)
