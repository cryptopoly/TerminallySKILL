# Lazy-load locale bundles (branch feat/lazy-locales)

## What changed
- `resources.ts` no longer imports the 18 locale JSON files. It exports `baseResources` (English plus the inline per-locale overrides) and `applyTranslatedBundle(locale, json)` (JSON merge plus known-English-fallback localisation, identical to the old build step; verified deep-equal against the old `resources` for all 21 locales).
- New `i18n/loader.ts`: `loadLocaleResource(locale)` uses `import.meta.glob('./locales/*.json')` so Vite emits one chunk per locale. Results are cached per locale; unknown locales resolve to English; a failed chunk load degrades to the inline bundle and retries next time. `createLocaleLoader` takes the loaders as an argument so tests can inject them.
- `i18n/index.ts`: startup loads English plus the active locale only. A language switch awaits the load, `addResourceBundle`, `changeLanguage`, then sets `lang`/`dir`/`data-locale` (Arabic is still rtl). A later switch wins if an earlier load finishes late. `App.tsx` already gates the first render on `initializeI18n`, so there is no English flash.
- `main/native-i18n.ts` uses the same loader (menus, close dialog, main-process errors); `starter-pack-detector.ts` and `exit-diagnostics.ts` only need English and read `baseResources.en`.
- `scripts/check-i18n.mjs` builds the merged bundles itself from the locale JSON files with `applyTranslatedBundle` (still 21 locales, 15 namespaces) and now fails if a non-English locale has no JSON file or a JSON file matches no supported locale.

## Bundle sizes (`npm run build`)
| | before | after |
| --- | --- | --- |
| renderer main chunk | 5,027.81 kB | 3,164.08 kB |
| main process `index.js` | 2,644.70 kB | 777.46 kB |
| locale chunks | none | 19 per process, 14 to 165 kB each |

Total bytes are about the same (every locale still ships); the saving is parse and memory at startup: a user loads roughly 1.9 MB less renderer JS and 1.9 MB less in the main process.

## Tests
- `src/renderer/src/i18n/loader.test.ts` (new) and `index.test.ts` (extended): 10 tests in the i18n folder.
- `tests/e2e/i18n-lazy-locales.spec.mjs` (new): German saved, relaunch, German UI and German native menu on first paint; runtime switch to Arabic (rtl) and back to German.

## Not covered
- No visual check of Arabic layout; only `dir`/`lang` and a missing English tab label are asserted.
- Packaged build (`test:package:mac:arm64`) not run: the main process now loads locale chunks from `out/main/*.js` (default electron-builder `files` should include them, unconfirmed).
- The inline per-locale overrides in `resources.ts` (about 150 kB source) are still in the main renderer chunk; splitting them per locale would need a larger refactor.
