import { describe, expect, it } from 'vitest'
import {
  formatSecretMask,
  isPlaceholderValue,
  isSecretFieldName,
  maskSecrets,
  maskSecretsDeep,
  type SecretKind
} from './secret-mask'

// Fixtures are generated at run time so no realistic token literal sits in the repository
// (secret scanners and push protection would flag them).
function fake(length: number, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', seed = 7): string {
  let state = seed
  let out = ''
  for (let i = 0; i < length; i += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    out += alphabet[state % alphabet.length]
  }
  return out
}

const UPPER_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const T = {
  awsId: 'AKIA' + fake(16, UPPER_DIGITS),
  awsTempId: 'ASIA' + fake(16, UPPER_DIGITS, 3),
  awsSecret: fake(40, B64, 11),
  ghp: 'ghp_' + fake(36),
  gho: 'gho_' + fake(36, undefined, 2),
  ghs: 'ghs_' + fake(36, undefined, 4),
  ghu: 'ghu_' + fake(36, undefined, 5),
  githubPat: 'github_pat_' + fake(22, undefined, 6) + '_' + fake(59, undefined, 8),
  glpat: 'glpat-' + fake(20, undefined, 9),
  anthropic: 'sk-ant-api03-' + fake(93, B64URL, 10) + 'AA',
  openaiLegacy: 'sk-' + fake(20, undefined, 12) + 'T3BlbkFJ' + fake(20, undefined, 13),
  openaiProject: 'sk-proj-' + fake(74, B64URL, 14) + 'T3BlbkFJ' + fake(74, B64URL, 15),
  slackBot: 'xoxb-' + fake(12, '0123456789') + '-' + fake(13, '0123456789', 16) + '-' + fake(24, undefined, 17),
  slackUser: 'xoxp-' + fake(12, '0123456789', 18) + '-' + fake(12, '0123456789', 19) + '-' + fake(13, '0123456789', 20) + '-' + fake(32, '0123456789abcdef', 21),
  slackApp: 'xapp-1-' + fake(11, UPPER_DIGITS, 22) + '-' + fake(13, '0123456789', 23) + '-' + fake(64, '0123456789abcdef', 24),
  slackWebhook: 'https://hooks.slack.com/services/T' + fake(8, UPPER_DIGITS, 25) + '/B' + fake(8, UPPER_DIGITS, 26) + '/' + fake(24, undefined, 27),
  stripeLive: 'sk_' + 'live_' + fake(24, undefined, 28),
  stripeTest: 'sk_' + 'test_' + fake(99, undefined, 29),
  stripeRestricted: 'rk_' + 'live_' + fake(24, undefined, 30),
  stripeWebhook: 'whsec_' + fake(32, undefined, 31),
  google: 'AIza' + fake(35, B64URL, 32),
  googleOauth: 'GOCSPX-' + fake(28, B64URL, 33),
  hf: 'hf_' + fake(34, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 34),
  npm: 'npm_' + fake(36, undefined, 35),
  pypi: 'pypi-AgEIcHlwaS5vcmc' + fake(60, B64URL, 36),
  jwt:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.' +
    fake(43, B64URL, 37)
}

function pem(label: string, lines = 5): string {
  const body = Array.from({ length: lines }, (_, i) => fake(64, B64, 40 + i)).join('\n')
  return `-----BEGIN ${label}-----\n${body}\n${fake(20, B64, 99)}==\n-----END ${label}-----`
}

function expectMasked(input: string, secret: string, kind: SecretKind): string {
  const result = maskSecrets(input)
  expect(result.text).not.toContain(secret)
  expect(result.text).toContain(formatSecretMask(kind))
  expect(result.counts[kind]).toBeGreaterThanOrEqual(1)
  return result.text
}

function expectUnchanged(input: string): void {
  const result = maskSecrets(input)
  expect(result.text).toBe(input)
  expect(result.total).toBe(0)
}

describe('maskSecrets true positives', () => {
  it.each([
    ['AWS access key id', `aws_access_key_id = ${T.awsId}`, T.awsId, 'aws-access-key-id'],
    ['AWS temporary key id', `export AWS_ACCESS_KEY_ID=${T.awsTempId}`, T.awsTempId, 'aws-access-key-id'],
    ['AWS secret in env', `AWS_SECRET_ACCESS_KEY=${T.awsSecret}`, T.awsSecret, 'aws-secret-key'],
    ['AWS secret in credentials file', `aws_secret_access_key = ${T.awsSecret}`, T.awsSecret, 'aws-secret-key'],
    ['AWS secret in CLI JSON', `"SecretAccessKey": "${T.awsSecret}",`, T.awsSecret, 'aws-secret-key'],
    ['GitHub classic PAT', `token ${T.ghp} expires`, T.ghp, 'github-token'],
    ['GitHub OAuth token', `GH_TOKEN=${T.gho}`, T.gho, 'github-token'],
    ['GitHub app token', `x-access-token:${T.ghs}`, T.ghs, 'github-token'],
    ['GitHub user-to-server token', T.ghu, T.ghu, 'github-token'],
    ['GitHub fine-grained PAT', `pat=${T.githubPat}`, T.githubPat, 'github-token'],
    ['GitLab PAT', `glab auth login --token ${T.glpat}`, T.glpat, 'gitlab-token'],
    ['Anthropic key', `ANTHROPIC_API_KEY=${T.anthropic}`, T.anthropic, 'anthropic-key'],
    ['OpenAI legacy key', `key: ${T.openaiLegacy}`, T.openaiLegacy, 'openai-key'],
    ['OpenAI project key', `OPENAI_API_KEY="${T.openaiProject}"`, T.openaiProject, 'openai-key'],
    ['Slack bot token', `SLACK_BOT_TOKEN=${T.slackBot}`, T.slackBot, 'slack-token'],
    ['Slack user token', `token=${T.slackUser}`, T.slackUser, 'slack-token'],
    ['Slack app token', T.slackApp, T.slackApp, 'slack-token'],
    ['Slack webhook', `curl -X POST ${T.slackWebhook}`, T.slackWebhook, 'slack-webhook'],
    ['Stripe live secret key', `Stripe.api_key = '${T.stripeLive}'`, T.stripeLive, 'stripe-key'],
    ['Stripe test secret key', `STRIPE_KEY=${T.stripeTest}`, T.stripeTest, 'stripe-key'],
    ['Stripe restricted key', T.stripeRestricted, T.stripeRestricted, 'stripe-key'],
    ['Stripe webhook secret', `signing secret is ${T.stripeWebhook}`, T.stripeWebhook, 'stripe-key'],
    ['Google API key', `https://maps.googleapis.com/x?key=${T.google}`, T.google, 'google-api-key'],
    ['Google OAuth client secret', `"client_secret":"${T.googleOauth}"`, T.googleOauth, 'google-oauth-secret'],
    ['Hugging Face token', `HF_TOKEN=${T.hf}`, T.hf, 'huggingface-token'],
    ['npm token', `//registry.npmjs.org/:_authToken=${T.npm}`, T.npm, 'npm-token'],
    ['PyPI token', `password = ${T.pypi}`, T.pypi, 'pypi-token'],
    ['JWT', `session=${T.jwt}; Path=/`, T.jwt, 'jwt']
  ] as const)('%s', (_name, input, secret, kind) => {
    expectMasked(input, secret, kind)
  })

  it('masks RSA, EC, OpenSSH, encrypted and PGP private key blocks across lines', () => {
    for (const label of ['RSA PRIVATE KEY', 'EC PRIVATE KEY', 'OPENSSH PRIVATE KEY', 'ENCRYPTED PRIVATE KEY', 'PRIVATE KEY', 'PGP PRIVATE KEY BLOCK']) {
      const block = pem(label)
      const result = maskSecrets(`$ cat id\n${block}\n$ echo done`)
      expect(result.text).toBe(`$ cat id\n${formatSecretMask('private-key')}\n$ echo done`)
      expect(result.counts['private-key']).toBe(1)
    }
  })

  it('masks a private key block whose END line was cut off', () => {
    const block = pem('RSA PRIVATE KEY').split('\n').slice(0, 4).join('\n')
    const result = maskSecrets(`before\n${block}`)
    expect(result.text).toBe(`before\n${formatSecretMask('private-key')}`)
  })

  it('masks the body of a private key block whose BEGIN line was cut off', () => {
    const block = pem('OPENSSH PRIVATE KEY').split('\n').slice(2).join('\n')
    const bodyLine = block.split('\n')[0]
    const result = maskSecrets(`${block}\n$ next`)
    expect(result.text).not.toContain(bodyLine)
    expect(result.text).toContain(formatSecretMask('private-key'))
    expect(result.text.endsWith('$ next')).toBe(true)
  })

  it('does not mask public keys or certificates', () => {
    expectUnchanged(`-----BEGIN PUBLIC KEY-----\n${fake(64, B64)}\n-----END PUBLIC KEY-----`)
    expectUnchanged(`-----BEGIN CERTIFICATE-----\n${fake(64, B64)}\n-----END CERTIFICATE-----`)
  })

  it('masks Authorization header values and keeps the scheme', () => {
    const token = fake(40, B64URL, 50)
    expect(maskSecrets(`curl -H "Authorization: Bearer ${token}" https://api.example.com`).text).toBe(
      `curl -H "Authorization: Bearer ${formatSecretMask('auth-header')}" https://api.example.com`
    )
    expect(maskSecrets(`> authorization: Basic ${fake(20, B64, 51)}=`).text).toBe(
      `> authorization: Basic ${formatSecretMask('auth-header')}`
    )
    expectMasked(`Proxy-Authorization: Token ${fake(32, undefined, 52)}`, fake(32, undefined, 52), 'auth-header')
  })

  it('reports a JWT inside an Authorization header once, as a JWT', () => {
    const result = maskSecrets(`Authorization: Bearer ${T.jwt}`)
    expect(result.text).toBe(`Authorization: Bearer ${formatSecretMask('jwt')}`)
    expect(result.total).toBe(1)
  })

  it('masks only the password in URL credentials', () => {
    expect(maskSecrets('psql postgres://admin:s3cr3t-pw@db.local:5432/app').text).toBe(
      `psql postgres://admin:${formatSecretMask('url-password')}@db.local:5432/app`
    )
    expect(maskSecrets('git clone https://dan:hunter2@git.example.com/repo.git').counts['url-password']).toBe(1)
  })

  it.each([
    ['PASSWORD=x', 'x', 'password'],
    ['export DB_PASSWORD="correct horse battery"', 'correct horse battery', 'password'],
    ["MYSQL_PWD_PASSWD='p@ss'", 'p@ss', 'password'],
    ['client_secret = abc123def', 'abc123def', 'secret'],
    ['SECRET_KEY=django-insecure-q1w2e3', 'django-insecure-q1w2e3', 'secret'],
    ['GITHUB_TOKEN=abc123', 'abc123', 'token'],
    ['x-api-key: k3y-value-1', 'k3y-value-1', 'api-key'],
    ['  password: hunter2', 'hunter2', 'password'],
    ['"password": "hunter2"', 'hunter2', 'password'],
    ['"SessionToken": "FwoGZXIvYXdzE123"', 'FwoGZXIvYXdzE123', 'token'],
    ['mysql --password hunter2 -u root', 'hunter2', 'password'],
    ['docker login --password=hunter2', 'hunter2', 'password'],
    ['tool --api-key abc123 run', 'abc123', 'api-key'],
    ['tool --client-secret "a b c"', 'a b c', 'secret'],
    ['cli --auth-token t0k3n', 't0k3n', 'token'],
    ['cli --passphrase open-sesame', 'open-sesame', 'password']
  ] as const)('masks assignment %s', (input, secret, kind) => {
    const text = expectMasked(input, secret, kind)
    expect(maskSecrets(input).total).toBe(1)
    // the name stays readable
    expect(text.toLowerCase()).toMatch(/pass|secret|token|key|pwd/)
  })
})

describe('maskSecrets false-positive guards', () => {
  it.each([
    ['git SHA', 'commit 3f786850e387550fdab836ed7e6dc881de23001b'],
    ['short SHA', 'HEAD is now at 3f78685 Fix build'],
    ['UUID', 'request id 123e4567-e89b-12d3-a456-426614174000'],
    ['long hex blob', fake(128, '0123456789abcdef')],
    ['long base64 blob', fake(400, B64)],
    ['sha256 digest', `sha256:${fake(64, '0123456789abcdef')}`],
    ['npm integrity', `sha512-${fake(86, B64)}==`],
    ['PWD is a directory', 'PWD=/Users/dan/project OLDPWD=/Users/dan'],
    ['tokenizer env', 'TOKENIZERS_PARALLELISM=false'],
    ['max tokens flag', 'llm --max-tokens 4000 --temperature 0.2'],
    ['token count assignment', 'max_tokens=4000'],
    ['password file', 'PASSWORD_FILE=/run/secrets/db'],
    ['token file flag', 'kubectl --token-file /var/run/token'],
    ['docker password-stdin', 'echo $PW | docker login --password-stdin -u dan'],
    ['no-password flag', 'tool --no-password --verbose'],
    ['variable reference', 'curl -H "Authorization: Bearer $GITHUB_TOKEN"'],
    ['braced variable', 'API_KEY=${API_KEY} npm start'],
    ['template placeholder', 'TOKEN={{token}} ./run'],
    ['angle placeholder', 'tool --password <password>'],
    ['ALLCAPS placeholder', 'tool --password PASSWORD'],
    ['type word placeholder', '  -p, --password string   Password for the registry'],
    ['help text padding', '      --token     The access token to use'],
    ['comparison', 'if token == "abc": pass'],
    ['empty prompt', 'Password: '],
    ['masked stars', 'password: ********'],
    ['boolean', 'secret: false'],
    ['ssh url without password', 'git clone ssh://git@github.com:22/org/repo.git'],
    ['scp-like git remote', 'git@github.com:org/repo.git'],
    ['URL with port only', 'http://localhost:3000/path'],
    ['kebab-case sk- name', 'cd sk-feature-branch-name-for-testing-things'],
    ['scikit-learn', 'pip install scikit-learn==1.5.0'],
    ['DeepSeek-like word', 'sk-learn is not a package'],
    ['Stripe publishable key', `pk_live_${fake(24)}`],
    ['plain prose', 'The secret to good logs is a good key and a short token of thanks.'],
    ['author env', 'GIT_AUTHOR_NAME=Dan GIT_AUTHOR_EMAIL=d@example.com'],
    ['AWS key id too short', 'AKIA1234'],
    ['Google key wrong length', `AIza${fake(20)}`]
  ])('leaves %s alone', (_name, input) => {
    expectUnchanged(input)
  })

  it('treats references and placeholders as non-secrets', () => {
    for (const value of ['$X', '${X}', '$(cat f)', '%TOKEN%', '<token>', '{{x}}', '****', 'xxxx', 'YOUR_TOKEN', 'string', 'true']) {
      expect(isPlaceholderValue(value)).toBe(true)
    }
    for (const value of ['x', 'hunter2', 'Abc123', 'changeme']) {
      expect(isPlaceholderValue(value)).toBe(false)
    }
  })
})

describe('maskSecrets ANSI handling', () => {
  it('finds a token split by colour codes and keeps the escape sequences', () => {
    const half = T.ghp.length / 2
    const input = `\x1b[32m${T.ghp.slice(0, half)}\x1b[1m${T.ghp.slice(half)}\x1b[0m done`
    const result = maskSecrets(input)
    expect(result.counts['github-token']).toBe(1)
    expect(result.text).toBe(`\x1b[32m${formatSecretMask('github-token')}\x1b[1m\x1b[0m done`)
  })

  it('finds an assignment whose value is coloured', () => {
    const result = maskSecrets('\x1b[33mPASSWORD\x1b[0m=\x1b[31mhunter2\x1b[0m')
    expect(result.text).not.toContain('hunter2')
    expect(result.counts.password).toBe(1)
  })

  it('leaves text that only has escapes untouched', () => {
    expectUnchanged('\x1b[31merror\x1b[0m: \x1b]0;title\x07build failed')
  })
})

describe('maskSecrets properties', () => {
  const corpus = [
    `export GITHUB_TOKEN=${T.ghp}`,
    `AWS_ACCESS_KEY_ID=${T.awsId}`,
    `AWS_SECRET_ACCESS_KEY=${T.awsSecret}`,
    pem('RSA PRIVATE KEY'),
    `curl -H "Authorization: Bearer ${T.jwt}" https://${'user'}:pw123@example.com`,
    'mysql --password hunter2',
    `"password": "hunter2"`,
    `key=${T.openaiProject}`
  ].join('\n')

  it('is idempotent', () => {
    const once = maskSecrets(corpus)
    const twice = maskSecrets(once.text)
    expect(twice.text).toBe(once.text)
    expect(twice.total).toBe(0)
  })

  it('counts every kind it hides', () => {
    const { counts, total } = maskSecrets(corpus)
    expect(counts).toEqual({
      'github-token': 1,
      'aws-access-key-id': 1,
      'aws-secret-key': 1,
      'private-key': 1,
      jwt: 1,
      'url-password': 1,
      password: 2,
      'openai-key': 1
    })
    expect(total).toBe(9)
  })

  it('returns the input unchanged when nothing matches', () => {
    const text = 'npm run build\n> vite build\n✓ 120 modules transformed.'
    const result = maskSecrets(text)
    expect(result.text).toBe(text)
    expect(result.counts).toEqual({})
  })

  it('masks a secret that arrived split across PTY chunks once the chunks are joined', () => {
    const line = `deploying with ${T.stripeLive} now\n`
    const chunks = [line.slice(0, 20), line.slice(20, 23), line.slice(23)]
    const result = maskSecrets(chunks.join(''))
    expect(result.text).toBe(`deploying with ${formatSecretMask('stripe-key')} now\n`)
  })

  it('handles 5 MB of mixed terminal output quickly', () => {
    const filler = [
      '\x1b[32m✓\x1b[0m compiled src/components/Button.tsx in 12ms',
      'commit 3f786850e387550fdab836ed7e6dc881de23001b',
      'GET /api/v1/users?page=2 200 14ms',
      'drwxr-xr-x  12 dan staff  384 Oct 29 10:00 node_modules',
      'max_tokens=4000 key_count=3 password_file=/etc/pw',
      `sha512-${fake(86, B64)}==`
    ]
    const lines: string[] = []
    let size = 0
    let i = 0
    while (size < 5 * 1024 * 1024) {
      const line = i % 5000 === 0 ? `export GITHUB_TOKEN=${T.ghp}` : filler[i % filler.length]
      lines.push(line)
      size += line.length + 1
      i += 1
    }
    const input = lines.join('\n')
    maskSecrets(input.slice(0, 100_000)) // warm up the regex engine
    const started = performance.now()
    const result = maskSecrets(input)
    const elapsed = performance.now() - started
    expect(result.counts['github-token']).toBeGreaterThan(5)
    expect(result.text).not.toContain(T.ghp)
    console.log(`[secret-mask] 5 MB in ${elapsed.toFixed(1)} ms`)
    expect(elapsed).toBeLessThan(process.env.CI ? 600 : 200)
  })
})

describe('maskSecretsDeep and field names', () => {
  it('masks strings inside nested objects and arrays and sums counts', () => {
    const input = {
      title: `Last command: export TOKEN=${T.ghp}`,
      list: ['ok', `PASSWORD=hunter2`],
      nested: { exitCode: 1, flag: true, text: T.awsId },
      none: null
    }
    const { value, counts, total } = maskSecretsDeep(input)
    expect(JSON.stringify(value)).not.toMatch(/ghp_|hunter2|AKIA/)
    expect(value.nested.exitCode).toBe(1)
    expect(value.none).toBeNull()
    expect(counts).toEqual({ 'github-token': 1, password: 1, 'aws-access-key-id': 1 })
    expect(total).toBe(3)
    expect(input.list[1]).toBe('PASSWORD=hunter2') // input not mutated
  })

  it('recognises secret field names', () => {
    expect(isSecretFieldName('db_password')).toBe('password')
    expect(isSecretFieldName('apiKey')).toBe('api-key')
    expect(isSecretFieldName('GITHUB_TOKEN')).toBe('token')
    expect(isSecretFieldName('branch')).toBeNull()
    expect(isSecretFieldName('max_tokens')).toBeNull()
  })
})
