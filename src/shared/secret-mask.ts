/**
 * Pattern-based secret masking for text that is saved (terminal logs, run records) or sent to an
 * AI provider. Only well-known secret shapes are caught; unknown formats pass through unchanged.
 * Nothing here stores or returns secret values: callers get the masked text and counts per kind.
 *
 * Design notes
 * - Every rule runs against the same "visible" text (ANSI escape sequences removed). Matches are
 *   mapped back to the original text, so a colour code inside a token does not hide it, and the
 *   escape sequences inside a masked range are kept after the mask so terminal state survives.
 * - Rules are tried in priority order and a later match that overlaps an earlier one is dropped,
 *   so `PASSWORD=ghp_...` is reported once, as a GitHub token.
 * - The mask text can never match a rule again, so masking is idempotent.
 */

export type SecretKind =
  | 'private-key'
  | 'aws-access-key-id'
  | 'aws-secret-key'
  | 'github-token'
  | 'gitlab-token'
  | 'anthropic-key'
  | 'openai-key'
  | 'slack-token'
  | 'slack-webhook'
  | 'stripe-key'
  | 'google-api-key'
  | 'google-oauth-secret'
  | 'huggingface-token'
  | 'npm-token'
  | 'pypi-token'
  | 'jwt'
  | 'auth-header'
  | 'url-password'
  | 'password'
  | 'token'
  | 'secret'
  | 'api-key'

/** English labels used inside the mask text written to logs and prompts. */
export const SECRET_KIND_LABELS: Record<SecretKind, string> = {
  'private-key': 'private key',
  'aws-access-key-id': 'AWS access key ID',
  'aws-secret-key': 'AWS secret access key',
  'github-token': 'GitHub token',
  'gitlab-token': 'GitLab token',
  'anthropic-key': 'Anthropic API key',
  'openai-key': 'OpenAI-style API key',
  'slack-token': 'Slack token',
  'slack-webhook': 'Slack webhook URL',
  'stripe-key': 'Stripe secret key',
  'google-api-key': 'Google API key',
  'google-oauth-secret': 'Google OAuth client secret',
  'huggingface-token': 'Hugging Face token',
  'npm-token': 'npm token',
  'pypi-token': 'PyPI token',
  jwt: 'JSON Web Token',
  'auth-header': 'Authorization header',
  'url-password': 'password in URL',
  password: 'password',
  token: 'token',
  secret: 'secret',
  'api-key': 'API key'
}

export const SECRET_KINDS = Object.keys(SECRET_KIND_LABELS) as SecretKind[]

export type SecretCounts = Partial<Record<SecretKind, number>>

export interface MaskResult {
  text: string
  counts: SecretCounts
  total: number
}

const MASK_PREFIX = '[hidden: '

export function formatSecretMask(kind: SecretKind): string {
  return `${MASK_PREFIX}${SECRET_KIND_LABELS[kind]}]`
}

interface Rule {
  kind: SecretKind | ((match: RegExpExecArray) => SecretKind)
  /** Global regex with the `d` flag. */
  re: RegExp
  /** Capture group holding the secret. 0 (default) masks the whole match. */
  group?: number
  /**
   * Literal that must occur for the rule to run. Only for rules without a literal start, whose
   * regex would otherwise be tried at every line. Rules that start with a literal are fast anyway.
   */
  requires?: string
  validate?: (secret: string, match: RegExpExecArray) => boolean
}

// Words that stand for a value in help text, docs and examples rather than being one.
const PLACEHOLDER_WORDS = new Set([
  'string', 'str', 'text', 'value', 'val', 'int', 'integer', 'number', 'num', 'bool', 'boolean',
  'pass', 'password', 'passwd', 'pw', 'pwd', 'passphrase', 'token', 'key', 'secret', 'apikey',
  'api_key', 'api-key', 'file', 'path', 'name', 'user', 'username', 'arg', 'args', 'word',
  'credentials', 'credential', 'none', 'null', 'nil', 'true', 'false', 'yes', 'no', 'on', 'off',
  'undefined', 'required', 'optional', 'redacted', 'hidden', 'masked', 'example', 'stdin', 'env'
])

/** True for values that are references or placeholders rather than secrets. */
export function isPlaceholderValue(value: string): boolean {
  const v = value.trim()
  if (!v) return true
  if (v.startsWith(MASK_PREFIX.trimEnd())) return true
  if (/^\$/.test(v)) return true // $VAR, ${VAR}, $(cmd)
  if (/^%[^%]+%$/.test(v)) return true // %VAR% (Windows)
  if (/^<.*>$/.test(v) || /^\{.*\}$/.test(v) || /^\[.*\]$/.test(v)) return true
  if (/^(?:[*.•]+|[xX]{3,})$/.test(v)) return true // ****, xxxx, ...
  if (/^[|>{[(]$/.test(v)) return true // YAML block scalars and openers
  if (/^[A-Z][A-Z_]*$/.test(v) && v.length > 1) return true // PASSWORD, YOUR_TOKEN
  return PLACEHOLDER_WORDS.has(v.toLowerCase())
}

function hasDigitAndLetter(value: string): boolean {
  return /\d/.test(value) && /[A-Za-z]/.test(value)
}

function longestAlnumRun(value: string): number {
  let best = 0
  for (const run of value.split(/[^A-Za-z0-9]+/)) best = Math.max(best, run.length)
  return best
}

// Name keywords for assignments. A name must END with one of these (GITHUB_TOKEN, db_password,
// _authToken, x-api-key), so TOKENIZERS_PARALLELISM, max_tokens and PASSWORD_FILE are left alone.
const NAME_KEYWORDS =
  'client[_-]?secret|secret[_-]?key|private[_-]?key|access[_-]?key|api[_-]?key|auth[_-]?token|passphrase|password|passwd|secret|token'

function kindFromKeyword(keyword: string): SecretKind {
  const k = keyword.toLowerCase()
  if (k.startsWith('pass')) return 'password'
  if (k.endsWith('token')) return 'token'
  if (k.includes('secret')) return 'secret'
  return 'api-key'
}

const PEM_LABEL = '((?:[A-Z0-9]+ )*)PRIVATE KEY(?: BLOCK)?'
// Unquoted values stop at whitespace, quotes and shell separators.
const BARE_VALUE = `[^\\s'"&;|<>\`]+`

const RULES: Rule[] = [
  // PEM / OpenSSH / PGP private key blocks (multi-line). Complete block first.
  {
    kind: 'private-key',
    re: new RegExp(`-----BEGIN ${PEM_LABEL}-----[\\s\\S]{0,100000}?-----END \\1PRIVATE KEY(?: BLOCK)?-----`, 'gd'),
  },
  // A block cut off at the end (truncated output): mask the BEGIN line and the body lines after it.
  {
    kind: 'private-key',
    re: new RegExp(
      `-----BEGIN ${PEM_LABEL}-----(?:\\r?\\n(?:[A-Za-z0-9+/=]{4,}|[A-Za-z-]+: [^\\r\\n]*|[ \\t]*)){0,400}`,
      'gd'
    ),
  },
  // A block whose start was cut off (log buffer trimmed): the body lines before an END line.
  {
    kind: 'private-key',
    re: new RegExp(`(?:^[A-Za-z0-9+/=]{16,}\\r?\\n){1,400}-----END ${PEM_LABEL}-----`, 'gmd'),
    requires: '-----END '
  },
  // AWS access key IDs: 4-letter prefix + 16 uppercase alphanumerics (AKIA long-term, ASIA temporary).
  {
    kind: 'aws-access-key-id',
    re: /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/gd,
  },
  // GitHub: ghp_ (classic PAT), gho_ (OAuth), ghu_/ghs_ (app tokens), ghr_ (refresh), github_pat_ (fine-grained).
  {
    kind: 'github-token',
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,251}|github_pat_[A-Za-z0-9_]{60,251})\b/gd,
  },
  { kind: 'gitlab-token', re: /\bglpat-[A-Za-z0-9_-]{20,}/gd },
  // Anthropic: sk-ant-api03-..., sk-ant-admin01-..., sk-ant-oat01-...
  { kind: 'anthropic-key', re: /\bsk-ant-[a-z]{2,8}\d{0,3}-[A-Za-z0-9_-]{20,}/gd },
  // OpenAI (sk-, sk-proj-, sk-svcacct-, sk-admin-) and providers that copied the shape (DeepSeek, ...).
  {
    kind: 'openai-key',
    re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/gd,
    // Real keys contain long random runs; kebab-case names like sk-my-long-feature-branch-name do not.
    validate: (secret) => hasDigitAndLetter(secret) && longestAlnumRun(secret.replace(/^sk-/, '')) >= 16
  },
  // Slack: xoxb- (bot), xoxp- (user), xoxa-/xoxr-/xoxs-/xoxo-, xoxe- (refresh), xapp- (app-level).
  {
    kind: 'slack-token',
    re: /\b(?:xox[abeoprs]|xapp)-[0-9A-Za-z-]{10,}/gd,
    validate: (secret) => /\d/.test(secret)
  },
  {
    kind: 'slack-webhook',
    re: /https:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9_/-]{20,}/gd,
  },
  // Stripe secret (sk_) and restricted (rk_) keys, and webhook signing secrets. Publishable pk_ keys are public.
  {
    kind: 'stripe-key',
    re: /\b(?:(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{24,})/gd,
  },
  // Google API keys are exactly "AIza" + 35 characters.
  { kind: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/gd },
  { kind: 'google-oauth-secret', re: /\bGOCSPX-[A-Za-z0-9_-]{28}(?![A-Za-z0-9_-])/gd },
  {
    kind: 'huggingface-token',
    re: /\bhf_[A-Za-z0-9]{34}\b/gd,
    validate: (secret) => /[a-z]/.test(secret) && /[A-Z]/.test(secret)
  },
  { kind: 'npm-token', re: /\bnpm_[A-Za-z0-9]{36}\b/gd },
  // PyPI API tokens are macaroons: "pypi-" + base64 that always starts with "AgE".
  { kind: 'pypi-token', re: /\bpypi-AgE[A-Za-z0-9_-]{50,}/gd },
  // JWT: base64url JSON header and payload both start with {" which encodes as eyJ.
  {
    kind: 'jwt',
    re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/gd,
  },
  // AWS secret access key: 40 base64 characters, only next to its name.
  {
    kind: 'aws-secret-key',
    re: /(?:aws_?secret_?access_?key|secretaccesskey)["']?[ \t]*[:=][ \t]*["']?([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+=])/gid,
    group: 1,
  },
  // Authorization / Proxy-Authorization headers.
  {
    kind: 'auth-header',
    re: /authorization["']?[ \t]*[:=][ \t]*["']?((?:bearer|basic|token|bot|digest)[ \t]+)?([A-Za-z0-9._~+/=:-]+)/gid,
    group: 2,
    validate: (secret, match) =>
      !isPlaceholderValue(secret) && (match[1] ? secret.length >= 4 : secret.length >= 16 && /\d/.test(secret))
  },
  // scheme://user:password@host
  {
    kind: 'url-password',
    re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"]+:([^\s/@'"]+)@/gid,
    group: 1,
    validate: (secret) => !isPlaceholderValue(secret)
  },
  // NAME=value and name = "value" (env files, shell, .npmrc _authToken=, TOML).
  {
    kind: (match) => kindFromKeyword(match[1]),
    re: new RegExp(`(${NAME_KEYWORDS})["']?[ \\t]*=(?!=)[ \\t]*(?:"([^"\\r\\n]*)"|'([^'\\r\\n]*)'|(${BARE_VALUE}))`, 'gid'),
    group: -1,
  },
  // "name": "value" (JSON, including AWS CLI output like "SessionToken": "...").
  {
    kind: (match) => kindFromKeyword(match[1]),
    re: new RegExp(`(${NAME_KEYWORDS})"[ \\t]*:[ \\t]*"([^"\\r\\n]*)"`, 'gid'),
    group: 2,
  },
  // name: value at the start of a line (YAML, HTTP headers such as x-api-key:, curl -v "> " prefixes).
  {
    kind: (match) => kindFromKeyword(match[1]),
    re: new RegExp(`^[ \\t>-]*[\\w.-]*?(${NAME_KEYWORDS})[ \\t]*:[ \\t]+(?:"([^"\\r\\n]*)"|'([^'\\r\\n]*)'|([^\\s'"]+))`, 'gimd'),
    group: -1,
  },
  // CLI flags: --password x, --api-key=x, --client-secret "x". One space only, because help text
  // pads the description with several ("--password    The password to use").
  {
    kind: (match) => kindFromKeyword(match[1]),
    re: new RegExp(
      `--(?:[a-z0-9]+-)*?(client-secret|secret-key|private-key|access-key|api-?key|auth-token|passphrase|password|passwd|secret|token)(?:=| (?! ))(?:"([^"\\r\\n]*)"|'([^'\\r\\n]*)'|(${BARE_VALUE}))`,
      'gid'
    ),
    group: -1,
    validate: (secret, match) => !match[0].toLowerCase().startsWith('--no-') && !secret.startsWith('-')
  }
]

// group -1: the first of groups 2..4 that participated (double-quoted, single-quoted, bare value).
function pickGroup(match: RegExpExecArray, group: number): number {
  if (group >= 0) return group
  for (let g = 2; g <= 4; g += 1) if (match[g] !== undefined) return g
  return 0
}

// CSI, OSC (BEL or ST terminated) and two-character escape sequences.
const ANSI_RE = /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[()][A-Z0-9]|[@-Z\\-_=>])/g

interface Visible {
  text: string
  /** Original index of each visible character; null when the input had no escapes. */
  map: Int32Array | null
}

function toVisible(input: string): Visible {
  if (!input.includes('\x1b')) return { text: input, map: null }
  const map = new Int32Array(input.length)
  let text = ''
  let visibleLength = 0
  let last = 0
  ANSI_RE.lastIndex = 0
  const pushPlain = (from: number, to: number): void => {
    text += input.slice(from, to)
    for (let i = from; i < to; i += 1) map[visibleLength++] = i
  }
  for (let m = ANSI_RE.exec(input); m; m = ANSI_RE.exec(input)) {
    pushPlain(last, m.index)
    last = m.index + m[0].length
  }
  pushPlain(last, input.length)
  return { text, map: map.subarray(0, visibleLength) }
}

interface Range {
  start: number
  end: number
  kind: SecretKind
}

function overlaps(accepted: Range[], start: number, end: number): boolean {
  // accepted is sorted by start and non-overlapping
  let lo = 0
  let hi = accepted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (accepted[mid].end <= start) lo = mid + 1
    else hi = mid
  }
  return lo < accepted.length && accepted[lo].start < end
}

function insertSorted(accepted: Range[], range: Range): void {
  let lo = 0
  let hi = accepted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (accepted[mid].start < range.start) lo = mid + 1
    else hi = mid
  }
  accepted.splice(lo, 0, range)
}

function findRanges(text: string): Range[] {
  const accepted: Range[] = []

  for (const rule of RULES) {
    if (rule.requires && !text.includes(rule.requires)) continue
    rule.re.lastIndex = 0
    for (let match = rule.re.exec(text); match; match = rule.re.exec(text)) {
      if (match[0].length === 0) {
        rule.re.lastIndex += 1
        continue
      }
      const group = pickGroup(match, rule.group ?? 0)
      const secret = match[group]
      const indices = match.indices?.[group]
      if (secret === undefined || !indices) continue
      if (group !== 0 && isPlaceholderValue(secret)) continue
      if (rule.validate && !rule.validate(secret, match)) continue
      const [start, end] = indices
      if (end <= start || overlaps(accepted, start, end)) continue
      const kind = typeof rule.kind === 'function' ? rule.kind(match) : rule.kind
      insertSorted(accepted, { start, end, kind })
    }
  }

  return accepted
}

/** Replace well-known secret shapes in `input` with `[hidden: <kind>]`. */
export function maskSecrets(input: string): MaskResult {
  if (!input) return { text: input, counts: {}, total: 0 }

  const visible = toVisible(input)
  const ranges = findRanges(visible.text)
  if (ranges.length === 0) return { text: input, counts: {}, total: 0 }

  const counts: SecretCounts = {}
  let out = ''
  let cursor = 0
  for (const range of ranges) {
    counts[range.kind] = (counts[range.kind] ?? 0) + 1
    const start = visible.map ? visible.map[range.start] : range.start
    const end = visible.map ? visible.map[range.end - 1] + 1 : range.end
    out += input.slice(cursor, start) + formatSecretMask(range.kind)
    if (visible.map) {
      // Keep escape sequences that sat inside the secret so colours and modes are not left open.
      const escapes = input.slice(start, end).match(ANSI_RE)
      if (escapes) out += escapes.join('')
    }
    cursor = end
  }
  out += input.slice(cursor)

  return { text: out, counts, total: ranges.length }
}

export function addSecretCounts(target: SecretCounts, add: SecretCounts): SecretCounts {
  for (const kind of Object.keys(add) as SecretKind[]) {
    target[kind] = (target[kind] ?? 0) + (add[kind] ?? 0)
  }
  return target
}

export function totalSecretCount(counts: SecretCounts): number {
  return Object.values(counts).reduce<number>((sum, value) => sum + (value ?? 0), 0)
}

/** True when a field name alone marks its value as a secret (input ids like "db_password"). */
export function isSecretFieldName(name: string): SecretKind | null {
  const match = new RegExp(`(${NAME_KEYWORDS})$`, 'i').exec(name)
  return match ? kindFromKeyword(match[1]) : null
}

/** Mask every string inside a JSON-like value (objects, arrays). Other values pass through. */
export function maskSecretsDeep<T>(value: T): { value: T; counts: SecretCounts; total: number } {
  const counts: SecretCounts = {}
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const result = maskSecrets(node)
      addSecretCounts(counts, result.counts)
      return result.text
    }
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object' && Object.getPrototypeOf(node) === Object.prototype) {
      const out: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(node)) out[key] = walk(child)
      return out
    }
    return node
  }
  const masked = walk(value) as T
  return { value: masked, counts, total: totalSecretCount(counts) }
}
