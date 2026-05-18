# Localization Handoff

TerminallySKILL ships UI locale, regional formatting, and AI response-language controls. Keep command syntax, executable names, flags, file paths, environment variables, code, and shell output unchanged in translations.

## Supported Locales

Launch tier:

- `en`, `en-US`, `en-GB`
- `de-DE`
- `fr-FR`
- `es`
- `pt-BR`
- `zh-Hans`
- `ja-JP`
- `ru-RU`
- `pl-PL`
- `it-IT`

Next/watch tier:

- `zh-Hant`
- `ko-KR`
- `nl-NL`
- `uk-UA`
- `id-ID`
- `tr-TR`
- `pt-PT`
- `ar`
- `hi-IN`

## Resource Layout

- UI strings live in [resources.ts](/Users/dan/TerminallySKILL/src/renderer/src/i18n/resources.ts).
- Locale metadata, fallback behavior, and system-locale matching live in [locale-schema.ts](/Users/dan/TerminallySKILL/src/shared/locale-schema.ts).
- Formatting helpers live in [format.ts](/Users/dan/TerminallySKILL/src/renderer/src/i18n/format.ts).
- The resource checker is [check-i18n.mjs](/Users/dan/TerminallySKILL/scripts/check-i18n.mjs).

## Adding Or Changing Strings

- Add the English source string first.
- Keep interpolation placeholders identical across every translated override, for example `{{count}}`, `{{name}}`, or `{{projectName}}`.
- Use i18next plural keys for counted strings: `item_one` and `item_other`.
- Keep keyboard shortcuts, commands, flags, environment variables, and paths literal.
- Prefer namespace-specific keys over generic buckets when the text belongs to one screen.

## QA Checklist

- Run `npm run i18n:check`. This verifies supported-locale/resource/metadata alignment, namespace coverage, placeholder parity, English plural key pairs, and required P0 non-English surface strings.
- Run `npm run build`.
- Run `npm test`.
- Manually check long-label screens: Settings, Project Dialog, Terminal, Scripts, Files, Logs, and Help Guide.
- Check `de-DE`, `fr-FR`, `pt-BR`, `ru-RU`, `pl-PL`, and `ar` for overflow or direction issues.
- Verify language settings persist after restart.
- Verify date/time formatting in logs, run history, update banners, and snapshots.
- Verify AI response language instructions preserve shell/code tokens.
- For isolated packaged-app smoke runs, launch with `TERMINALLYSKILL_USER_DATA_DIR=/tmp/terminallyskill-locale-smoke` and seed `data/settings.json`.

## Known Follow-Ups

- P0 locales now cover launch chrome plus the common/settings/terminal safety and workflow-error surface. Longer command-builder, logs, files, help-guide, and command-description prose still falls back to English until a native-language review pass fills those namespaces.
- Full human translation review should happen before marketing any locale as fully translated.
- RTL polish should be treated as a dedicated pass before moving `ar` beyond watch tier.
