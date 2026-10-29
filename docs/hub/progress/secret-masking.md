---
title: Secret masking (idea 15)
status: review
---
# Progress: secret masking in logs and AI requests

Updated: 2026-10-29. Owner: agent. Branch: `feat/secret-masking` (from `origin/integ/0.9.103`).

## Goal

Before terminal text is saved (session logs, workflow run history) or sent to an AI provider, replace well-known secret shapes with `[hidden: <kind>]`. The live terminal is never changed. On by default, one switch in Settings → Privacy, session-only counts per kind (never values).

Honest limit (also in the UI copy): pattern-based. It reduces accidental leaks; unknown formats, secrets with no recognisable name or shape, and secrets split across separate requests are not caught.

## Done

- `src/shared/secret-mask.ts`: pure module, `maskSecrets(text) → { text, counts, total }`, `maskSecretsDeep(obj)`, `isSecretFieldName(name)`. (3f69fedd)
- Wiring in main process, switch, IPC, stats. (cd78378c)
- Privacy tab switch + counts; `SettingToggleCard` moved to its own file; strings in `en-additions.json` and the 18 locale JSON files. (d53f5de5)
- Playwright test `tests/e2e/secret-masking.spec.mjs`. (bf86487c)

### Patterns (priority order; earlier wins on overlap)

| Kind | Shape | Source of the shape |
| --- | --- | --- |
| private key | `-----BEGIN … PRIVATE KEY( BLOCK)-----` … `-----END …` (RSA, EC, DSA, OPENSSH, ENCRYPTED, PKCS#8, PGP); also a block cut at either end | PEM / RFC 7468, OpenSSH, OpenPGP armor |
| AWS access key ID | `AKIA`/`ASIA`/`ABIA`/`ACCA` + 16 `[A-Z0-9]` | AWS IAM identifiers |
| GitHub token | `gh[pousr]_` + 36+ alnum; `github_pat_` + 60+ | GitHub token formats (2021 / fine-grained) |
| GitLab token | `glpat-` + 20+ | GitLab PAT prefix |
| Anthropic API key | `sk-ant-<type><nn>-` + 20+ | Anthropic key prefix |
| OpenAI-style API key | `sk-`, `sk-proj-`, `sk-svcacct-`, `sk-admin-` + 20+, must contain a 16+ alnum run and a digit | OpenAI key formats (also DeepSeek etc.) |
| Slack token / webhook | `xox[abeoprs]-`, `xapp-` (with a digit); `https://hooks.slack.com/services|workflows|triggers/…` | Slack token types |
| Stripe secret key | `sk_live_`/`sk_test_`/`rk_live_`/`rk_test_` + 16+, `whsec_` + 24+ (publishable `pk_` is public, not masked) | Stripe API keys |
| Google API key / OAuth secret | `AIza` + exactly 35; `GOCSPX-` + 28 | Google Cloud |
| Hugging Face token | `hf_` + 34 mixed case | Hugging Face user access tokens |
| npm token | `npm_` + 36 | npm granular/automation tokens |
| PyPI token | `pypi-AgE…` (macaroon) | PyPI API tokens |
| JWT | `eyJ….eyJ….sig` | RFC 7519 (base64url of `{"`) |
| AWS secret access key | 40 base64 chars only next to `aws_secret_access_key` / `SecretAccessKey` | AWS credentials file / CLI JSON |
| Authorization header | `Authorization: Bearer|Basic|Token|Bot|Digest <value>` (scheme kept); no scheme needs 16+ chars with a digit | HTTP |
| password in URL | `scheme://user:PASSWORD@` (only the password) | RFC 3986 userinfo |
| password / token / secret / API key | `NAME=value`, `"name": "value"`, `name: value` at line start (YAML, headers, `curl -v` `> `), `--flag value` / `--flag=value`, where the name ENDS in password, passwd, passphrase, secret, token, api key, access key, private key, secret key, client secret, auth token | env files, `.npmrc` `_authToken=`, CLI flags |

False-positive guards (all tested): git SHAs, UUIDs, long hex/base64, sha256/sha512 digests, `PWD=`, `TOKENIZERS_PARALLELISM`, `--max-tokens 4000`, `max_tokens=`, `PASSWORD_FILE=`, `--token-file`, `docker login --password-stdin`, `--no-password`, `$VAR` / `${VAR}` / `{{x}}` / `<x>` / `%X%` / `****` / ALLCAPS placeholders / type words (`string`, `value`…), help-text padding (`--token    The token…`, flags take exactly one space), `==`, `ssh://git@host:22`, `sk-`-prefixed kebab names, `scikit-learn`, Stripe `pk_`, `GIT_AUTHOR_*`.

### Design choices

- **ANSI**: rules run on the text with escape sequences removed; matches are mapped back to the original indices, and escape sequences that sat inside a masked range are re-emitted after the mask so colours/modes are not left open.
- **Chunk splits in logs**: there is no streaming log writer. The PTY output is buffered in memory and `saveSessionLog` writes the whole joined text once, so masking the joined text sees every secret whole. No carry-over buffer needed. The one edge: when the 10 MB buffer drops its oldest chunks, the first kept line can start mid-token, so that partial line is now dropped (`prepareLogContent(buffer, trimmed)`); a PEM block whose BEGIN line was dropped is caught by the orphan-END rule.
- **AI truncation**: output review keeps only the last 12,000 characters. Masking the finished prompt alone could leave the tail of a token cut at that boundary, so the request object is masked first (`maskSecretsDeep`), then the prompt is built, then the final prompt is masked again (counts add; the second pass normally finds nothing).
- **Overlaps**: one secret is counted once (a JWT in an `Authorization` header is reported as a JWT; `PASSWORD=ghp_…` as a GitHub token).
- **Idempotent**: the mask text can never match a rule again.
- **Counts**: AI counts are per request (a follow-up chat resends the context and counts again). A workflow run record is re-saved on every step, so its count is replaced per run id, not added.
- The mask text written into logs and prompts is English (`[hidden: GitHub token]`); the Privacy tab shows translated kind names.

### Paths checked

| Path | Masked? |
| --- | --- |
| `main/log-manager.ts` `saveSessionLog` (PTY auto-save on exit/close/quit in `pty-manager.ts`, and renderer IPC `LOGS_SAVE_SESSION`) | Yes |
| `main/run-manager.ts` `upsertRunRecord` (renderer IPC `RUNS_UPSERT`): step commands, labels, approval/note text, error, input values (inputs named like `db_password` are hidden whatever their value) | Yes |
| `main/ai-manager.ts` `runAIAction`: all 8 actions (output review = Review Session / Explain & fix / review selection / saved-log review, command review, command explain, command help, command generation incl. builder values, command tree generation, artifact improvement, chat follow-up) → OpenAI, Anthropic, Ollama, Gemini, OpenAI-compatible | Yes (single chokepoint: every provider call sends only the masked prompt) |
| `main/settings-manager.ts` `testAIConnection` / `listAIModels` | No: no terminal text; they send the provider key as auth, which is required |
| `main/update-manager.ts` update feed fetches | No: no user text |
| Live terminal display (`PTY_DATA` to the renderer, xterm) | No, by design |
| Existing logs already on disk | No: masking applies to new saves only |
| Snapshots (`snapshot-store.ts`) | No: in memory only, never saved or sent |
| Promote to snippet/script, workflow editor | No: content the user saves on purpose; masking would break it. Only AI requests about it are masked |
| Backups (`backup-manager.ts`) | Copies the log folder, so new logs are already masked |
| Clipboard copy from the terminal / log viewer | No: local, user action |
| VNC passwords, provider keys (`secret-manager.ts`) | No: stored in the OS keychain, not text logs |

## Tests

- `src/shared/secret-mask.test.ts` (99): true positives per pattern, 37 false-positive guards, PEM complete/cut at either end, public keys/certificates untouched, ANSI split tokens, idempotence, counts per kind, chunk-split, deep masking, 5 MB perf.
- `src/main/ai-manager-masking.test.ts` (7): request bodies for 5 provider types × 5 actions contain no secret; truncation boundary; switch off.
- `log-manager.test.ts` (+2), `run-manager.test.ts` (+2), `pty-output.test.ts` (+1).
- `tests/e2e/secret-masking.spec.mjs`: types a fake GitHub token and `--password` into a real terminal with a mock Ollama on 127.0.0.1; asserts the raw text reaches the renderer and xterm, the AI request body has `[hidden: …]` and no secret, the saved log is masked, and the Privacy tab shows kind + count only.
- Perf: 5 MB of mixed output with ANSI in about 48 ms on this Mac (test limit 200 ms; 600 ms when `CI` is set).
- `npm run test:ci` (382 unit tests, i18n check, typecheck, build) and `npm run test:e2e` (12 passed, 6 skipped as before) pass.

## Not done / not verified

- The e2e test clicks **Review Session**, not the **Explain & fix** button: in the test shell the last-command block did not register, so that button never appeared. Both go through `runAIAction` with the same request type; the unit test covers the `command-block` shape.
- Vendor formats were checked against the published prefixes and lengths as known to the agent, not re-read from vendor docs today; lengths are kept slightly open where vendors say they may grow.
- Windows (PowerShell) and SSH remote sessions were not run; the masking is text-only and shell-independent.
- Translations are machine-written; native review is still needed.
- The packaged build (`test:package:mac:arm64`) was not run.

## How to resume

1. `git switch feat/secret-masking`, `npm ci`.
2. `npm run test:ci`, `npm run test:e2e`.
3. Add a pattern: one entry in `RULES` in `src/shared/secret-mask.ts`, a kind label, a translation key `privacy.masking.kind.<kind>` (en-additions + 18 locales), and positive and negative tests.

## Decisions to propose

- Default on (as built). Recommendation: keep on; false positives are rare and the switch is one click.
- Whether to mask snippets/scripts on save: recommend no (user-intended content).
- Whether to show a "secrets hidden" hint in the AI review dialog: recommend later, only if users ask.
