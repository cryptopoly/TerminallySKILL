# Secret mask gaps

Branch `fix/secret-mask-gaps`. File: `src/shared/secret-mask.ts`.

## Changes

1. **URL password, empty user.** `scheme://:password@host` (Redis style) is now masked. Placeholder checks unchanged.
2. **Names ending in `pass` / `pwd`** (DB_PASS, db-pwd, MYSQL_PWD, dbPass) count as password.
   - The keyword must be the last word of a longer name: preceded by `_`, `-` or `.` (with something before it) or a camelCase edge. Checked in code (`nameBoundaryOk`) because the rules are case-insensitive.
   - Not masked: bare `PASS=1`, `pass=`, `PWD=/path`, `OLDPWD`, `bypass`, `compass`, `PASSENGER`, `PASS_THROUGH`.
   - A 1-3 digit value after a pass name (`ALL_PASS=1`) is treated as a flag and left alone.
   - `isSecretFieldName` uses the same boundary rule.
   - CLI flag rule: `--pass x` left alone on purpose (`--pass` is commonly "passes" or "pass-through" style and help text is dense with it; `--password` is already covered).
3. **Names ending in plain `KEY`** (STRIPE_KEY, DEPLOY_KEY, ENCRYPTION_KEY, signingKey): masked as `api-key` only when the value looks random: 16+ chars, letter and digit, longest alphanumeric run 12+, no whitespace, not a path (`/`, `~`, `./`, `C:\`) and not a URL, not a placeholder. Same boundary rule, so bare `KEY=` never matches. Three new rules (env, JSON, YAML forms). No new SecretKind, so i18n and the Privacy tab are untouched.

`Rule.validate` now also receives the visible text (needed for the boundary check).

## Tests

`src/shared/secret-mask.test.ts`, new describe block "gaps": positives, negatives (all cases from the brief), existing URL cases, idempotence, `isSecretFieldName`. `npm run test:ci`: 61 files, 460 tests pass.

## Performance

1 MB, best of 5 (ms), before to after: random text 5.2 to 6.1; dense keyword-like lines 5.3 to 12.6. The 5 MB perf test in the suite passes.

## Not covered

- `postgres://admin:pw@host` is NOT masked, before or after: `pw` is in the placeholder word list. `pw2x9` style values are masked.
- Bare `pass: x` / `PASS=x` / `PWD=x`, and `--pass x`.
- Short passwords after pass names that are 1-3 digits.
- Plain `KEY` names with low-entropy values (all letters or all digits, or under 16 chars).
- Quoted values containing spaces for KEY names.
- `DATABASE_URL` is not masked by name (only by URL password).
