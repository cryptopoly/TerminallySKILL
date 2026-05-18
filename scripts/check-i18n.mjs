import { readFileSync } from 'node:fs'
import { Script, createContext } from 'node:vm'
import ts from 'typescript'

function loadTypeScriptModule(relativePath) {
  const sourcePath = new URL(relativePath, import.meta.url)
  const source = readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText

  const sandbox = {
    exports: {},
    module: { exports: {} },
    require() {
      throw new Error(`${relativePath} must not require runtime dependencies`)
    }
  }
  sandbox.exports = sandbox.module.exports

  new Script(transpiled, { filename: sourcePath.pathname }).runInContext(createContext(sandbox))
  return sandbox.module.exports
}

const { resources, I18N_NAMESPACES } = loadTypeScriptModule('../src/renderer/src/i18n/resources.ts')
const {
  FALLBACK_LOCALE,
  LOCALE_METADATA,
  SUPPORTED_LOCALES
} = loadTypeScriptModule('../src/shared/locale-schema.ts')

if (!resources || !resources.en) {
  throw new Error('No English i18n resource bundle found')
}

const PLACEHOLDER_PATTERN = /{{\s*([A-Za-z0-9_]+)\s*}}/g

function flatten(value, prefix = '', out = {}) {
  if (typeof value === 'string') {
    out[prefix] = value
    return out
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return out
  }

  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out)
  }
  return out
}

function placeholders(value) {
  const names = new Set()
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
    names.add(match[1])
  }
  return [...names].sort()
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function formatList(values) {
  return values.length > 0 ? values.join(', ') : '(none)'
}

const failures = []
const expectedNamespaces = new Set(I18N_NAMESPACES)
const resourceLocales = Object.keys(resources)
const metadataLocales = Object.keys(LOCALE_METADATA ?? {})

if (!Array.isArray(SUPPORTED_LOCALES) || SUPPORTED_LOCALES.length === 0) {
  failures.push('SUPPORTED_LOCALES must be a non-empty array')
}

if (FALLBACK_LOCALE !== 'en' || !resources[FALLBACK_LOCALE]) {
  failures.push(`Fallback locale ${FALLBACK_LOCALE ?? '(missing)'} must exist in resources`)
}

if (!sameList(resourceLocales, SUPPORTED_LOCALES)) {
  failures.push(
    `resources locale order mismatch: [${formatList(resourceLocales)}] != ` +
      `[${formatList(SUPPORTED_LOCALES ?? [])}]`
  )
}

if (!sameList(metadataLocales, SUPPORTED_LOCALES)) {
  failures.push(
    `locale metadata order mismatch: [${formatList(metadataLocales)}] != ` +
      `[${formatList(SUPPORTED_LOCALES ?? [])}]`
  )
}

const englishNamespaceOrder = Object.keys(resources.en)
if (!sameList(englishNamespaceOrder, I18N_NAMESPACES)) {
  failures.push(
    `English namespace order mismatch: [${formatList(englishNamespaceOrder)}] != ` +
      `[${formatList(I18N_NAMESPACES)}]`
  )
}

for (const locale of SUPPORTED_LOCALES ?? []) {
  const metadata = LOCALE_METADATA?.[locale]
  if (!metadata) {
    failures.push(`${locale}: missing LOCALE_METADATA entry`)
    continue
  }
  if (metadata.code !== locale) {
    failures.push(`${locale}: metadata.code is ${metadata.code}`)
  }
  if (metadata.direction !== 'ltr' && metadata.direction !== 'rtl') {
    failures.push(`${locale}: invalid text direction ${metadata.direction}`)
  }
  if (!['P0', 'P1', 'P2'].includes(metadata.launchTier)) {
    failures.push(`${locale}: invalid launch tier ${metadata.launchTier}`)
  }
  if (!metadata.englishName || !metadata.nativeName) {
    failures.push(`${locale}: metadata names must be non-empty`)
  }
}

for (const locale of Object.keys(resources).sort()) {
  const bundle = resources[locale]
  for (const namespace of Object.keys(bundle)) {
    if (!expectedNamespaces.has(namespace)) {
      failures.push(`${locale}: unexpected namespace ${namespace}`)
    }
  }

  for (const namespace of expectedNamespaces) {
    if (!bundle[namespace]) {
      failures.push(`${locale}: missing namespace ${namespace}`)
    }
  }

  for (const [namespace, englishNamespace] of Object.entries(resources.en)) {
    const englishKeys = flatten(englishNamespace)
    const localeKeys = flatten(bundle[namespace] ?? {})

    for (const [key, englishValue] of Object.entries(englishKeys)) {
      const localizedValue = localeKeys[key]
      if (typeof localizedValue !== 'string') {
        failures.push(`${locale}:${namespace}.${key}: missing string`)
        continue
      }

      const englishPlaceholders = placeholders(englishValue)
      const localizedPlaceholders = placeholders(localizedValue)
      if (!sameList(englishPlaceholders, localizedPlaceholders)) {
        failures.push(
          `${locale}:${namespace}.${key}: placeholder mismatch ` +
            `[${localizedPlaceholders.join(', ')}] != [${englishPlaceholders.join(', ')}]`
        )
      }
    }
  }
}

const englishKeys = Object.fromEntries(
  Object.entries(resources.en).flatMap(([namespace, values]) =>
    Object.keys(flatten(values)).map((key) => [`${namespace}.${key}`, true])
  )
)

const englishValues = Object.fromEntries(
  Object.entries(resources.en).flatMap(([namespace, values]) =>
    Object.entries(flatten(values)).map(([key, value]) => [`${namespace}.${key}`, value])
  )
)

const launchSmokeTranslatedKeys = [
  'dashboard.empty.title',
  'layout.empty.title',
  'layout.sidebar.tabs.commands',
  'projects.selector.none',
  'scripts.actions.newScript',
  'scripts.empty.globalTitle',
  'terminal.panel.noSessions'
]

const p0SurfaceTranslatedKeys = [
  'common.actions.apply',
  'common.actions.browse',
  'common.actions.cancel',
  'common.actions.close',
  'common.actions.delete',
  'common.actions.reset',
  'common.actions.save',
  'common.states.reactRenderError',
  'common.states.tryAgain',
  'common.states.startupFailed',
  'settings.title',
  'settings.tabs.general',
  'settings.tabs.data',
  'settings.tabs.appearance',
  'settings.tabs.about',
  'settings.general.helpTooltips.title',
  'settings.general.startupBehavior.title',
  'settings.general.terminalInput.title',
  'settings.general.safePaste.title',
  'settings.general.resetCommandTrees.title',
  'settings.locale.title',
  'settings.locale.uiLanguage',
  'settings.locale.aiLanguage',
  'settings.locale.appLanguage',
  'settings.logs.saveTerminalLogs',
  'settings.logs.storageFolder',
  'settings.logs.defaultFolder',
  'settings.appearance.title',
  'settings.appearance.darkThemes',
  'settings.appearance.lightThemes',
  'settings.data.title',
  'settings.data.storageTitle',
  'settings.data.folderLabel',
  'settings.data.customLocationActive',
  'settings.data.moveFolder',
  'settings.data.openFolder',
  'settings.data.notConfigured',
  'settings.data.noBackup',
  'settings.data.backUpNow',
  'settings.about.title',
  'settings.about.updatesTitle',
  'settings.about.checkOnStartup',
  'settings.about.checkForUpdates',
  'settings.about.downloadInstall',
  'settings.about.current',
  'settings.about.latest',
  'settings.about.noReleaseFound',
  'settings.about.releaseNotes',
  'settings.about.buyCoffee',
  'settings.ai.title',
  'settings.ai.addProvider',
  'settings.ai.emptyTitle',
  'settings.ai.routingTitle',
  'settings.ai.primaryProvider',
  'settings.ai.selectProvider',
  'settings.ai.primaryModel',
  'settings.ai.fallbackChain',
  'settings.ai.active',
  'settings.ai.connectionType',
  'settings.ai.apiKey',
  'settings.ai.connect',
  'settings.ai.status.notConnected',
  'settings.ai.status.activeDetail',
  'settings.ai.status.connected',
  'settings.toggle.off',
  'settings.toggle.on',
  'scripts.runner.errors.terminalClosed',
  'scripts.runner.errors.cancelled',
  'scripts.runner.errors.stepFailed',
  'scripts.runner.errors.stepFailedRetrying',
  'scripts.runner.errors.stepFailedContinuing',
  'snippets.help.examples',
  'terminal.panel.latestOutput',
  'terminal.editorPrompt.sources.history',
  'terminal.editorPrompt.sources.command',
  'terminal.secureInput.prompts.password',
  'terminal.secureInput.prompts.passphrase',
  'terminal.secureInput.prompts.verificationCode',
  'terminal.safePaste.reasons.multiLine_other',
  'terminal.safePaste.reasons.largePayload',
  'terminal.safePaste.reasons.controlCharacters',
  'terminal.safePaste.reasons.dangerousCommand',
  'terminal.close.confirm',
  'terminal.close.workflowRunning',
  'terminal.close.shellExecuting',
  'terminal.close.unknownScript'
]

const allLocaleSurfaceTranslatedKeys = [
  'common.actions.apply',
  'common.actions.browse',
  'common.actions.cancel',
  'common.actions.close',
  'common.actions.delete',
  'common.actions.reset',
  'common.actions.save',
  'common.states.reactRenderError',
  'common.states.tryAgain',
  'common.states.startupFailed',
  'common.states.loading',
  'common.states.system',
  'settings.title',
  'settings.tabs.general',
  'settings.tabs.data',
  'settings.tabs.logs',
  'settings.tabs.appearance',
  'settings.tabs.about',
  'settings.general.helpTooltips.title',
  'settings.general.helpTooltips.description',
  'settings.general.startupBehavior.title',
  'settings.general.startupBehavior.description',
  'settings.general.startupBehavior.options.dashboard.label',
  'settings.general.startupBehavior.options.dashboard.description',
  'settings.general.startupBehavior.options.lastProject.label',
  'settings.general.startupBehavior.options.lastProject.description',
  'settings.general.terminalInput.title',
  'settings.general.terminalInput.description',
  'settings.general.terminalInput.modes.classic.label',
  'settings.general.terminalInput.modes.classic.description',
  'settings.general.terminalInput.modes.editor.label',
  'settings.general.terminalInput.modes.editor.description',
  'settings.general.safePaste.title',
  'settings.general.safePaste.description',
  'settings.general.resetCommandTrees.title',
  'settings.general.resetCommandTrees.description',
  'settings.general.resetCommandTrees.unaffected',
  'settings.general.resetCommandTrees.confirm',
  'settings.locale.title',
  'settings.locale.description',
  'settings.locale.uiLanguage',
  'settings.locale.formatLocale',
  'settings.locale.aiLanguage',
  'settings.locale.systemDescription',
  'settings.locale.formatDescription',
  'settings.locale.aiDescription',
  'settings.locale.appLanguage',
  'settings.locale.launchTier.P0',
  'settings.locale.launchTier.P1',
  'settings.locale.launchTier.P2',
  'settings.toggle.off',
  'settings.toggle.on',
  'layout.topbar.sshShell',
  'layout.topbar.sshShellDescription',
  'layout.topbar.vncViewer',
  'layout.topbar.vncViewerDescription',
  'layout.topbar.newTerminal',
  'layout.topbar.newTerminalDescription',
  'layout.topbar.helpGuide',
  'layout.topbar.helpGuideDescription',
  'layout.topbar.settings',
  'layout.palette.actions.settingsDescription',
  'layout.topbar.settingsDescription',
  'layout.topbar.githubDescription',
  'layout.palette.actions.newTerminalDescription',
  'layout.palette.actions.openSshShellDescription',
  'layout.palette.actions.infoDescription',
  'layout.palette.actions.newProjectDescription',
  'layout.palette.searchPlaceholder',
  'layout.sidebar.tabs.commands',
  'layout.sidebar.tabs.scripts',
  'layout.sidebar.tabs.snippets',
  'layout.sidebar.tabs.files',
  'layout.sidebar.tabs.logs',
  'layout.sidebar.tabs.search',
  'scripts.actions.addScript',
  'scripts.actions.newScript',
  'scripts.actions.create',
  'scripts.actions.cancel',
  'scripts.actions.duplicate',
  'scripts.actions.removeFromProject',
  'scripts.actions.deletePermanently',
  'scripts.actions.runWorkflow',
  'scripts.addToScript.tooltipLabel',
  'scripts.addToScript.tooltipDescription',
  'scripts.selector.title',
  'snippets.actions.newSnippet',
  'snippets.actions.create',
  'snippets.actions.cancel',
  'snippets.actions.quickRun',
  'snippets.actions.fillVariablesRun',
  'snippets.actions.duplicate',
  'snippets.actions.removeFromProject',
  'snippets.actions.deletePermanently',
  'snippets.empty.title',
  'snippets.editor.noSelectionTitle',
  'snippets.editor.template',
  'snippets.editor.variables',
  'snippets.editor.preview',
  'snippets.editor.copy',
  'snippets.editor.run',
  'snippets.editor.defaultValue',
  'files.search.placeholder',
  'files.search.caseSensitive',
  'files.search.regex',
  'files.search.filterOptions',
  'logs.list.searchPlaceholder',
  'logs.list.workflowRuns',
  'logs.list.terminalLogs',
  'logs.list.runs',
  'logs.list.logs',
  'logs.list.openLogsFolder',
  'logs.status.completed',
  'logs.status.failed',
  'logs.status.cancelled',
  'logs.status.closed',
  'logs.actions.openLog',
  'logs.actions.deleteLog',
  'terminal.panel.newTerminal',
  'terminal.panel.sshShell',
  'terminal.panel.vncViewer',
  'terminal.panel.noSessions',
  'terminal.panel.latestOutput',
  'terminal.toolbar.reviewSession',
  'terminal.toolbar.refreshSession',
  'terminal.search.placeholder',
  'terminal.search.regex',
  'terminal.search.wholeWord',
  'terminal.editorPrompt.helpLabel',
  'terminal.editorPrompt.title',
  'terminal.editorPrompt.run',
  'terminal.editorPrompt.suggestion',
  'terminal.editorPrompt.off',
  'terminal.editorPrompt.on',
  'terminal.editorPrompt.modeOnDescription',
  'terminal.editorPrompt.modeOffDescription',
  'terminal.editorPrompt.sources.history',
  'terminal.editorPrompt.sources.command',
  'terminal.editorPrompt.sources.directory'
]

const requiredP0TranslatedKeys = [...new Set([...launchSmokeTranslatedKeys, ...p0SurfaceTranslatedKeys])]

for (const locale of SUPPORTED_LOCALES ?? []) {
  const metadata = LOCALE_METADATA?.[locale]
  if (!metadata || metadata.launchTier !== 'P0' || locale.startsWith('en')) continue

  const localeValues = Object.fromEntries(
    Object.entries(resources[locale]).flatMap(([namespace, values]) =>
      Object.entries(flatten(values)).map(([key, value]) => [`${namespace}.${key}`, value])
    )
  )

  for (const key of requiredP0TranslatedKeys) {
    if (localeValues[key] === englishValues[key]) {
      failures.push(`${locale}:${key}: required P0 string still matches English`)
    }
  }
}

for (const locale of SUPPORTED_LOCALES ?? []) {
  if (locale.startsWith('en')) continue

  const localeValues = Object.fromEntries(
    Object.entries(resources[locale]).flatMap(([namespace, values]) =>
      Object.entries(flatten(values)).map(([key, value]) => [`${namespace}.${key}`, value])
    )
  )

  for (const key of allLocaleSurfaceTranslatedKeys) {
    if (localeValues[key] === englishValues[key]) {
      failures.push(`${locale}:${key}: required all-locale string still matches English`)
    }
  }
}

for (const key of Object.keys(englishKeys)) {
  if (key.endsWith('_one')) {
    const otherKey = `${key.slice(0, -4)}_other`
    if (!englishKeys[otherKey]) {
      failures.push(`English plural key ${key} is missing ${otherKey}`)
    }
  }
  if (key.endsWith('_other')) {
    const oneKey = `${key.slice(0, -6)}_one`
    if (!englishKeys[oneKey]) {
      failures.push(`English plural key ${key} is missing ${oneKey}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`i18n resources OK (${Object.keys(resources).length} locales, ${I18N_NAMESPACES.length} namespaces)`)
