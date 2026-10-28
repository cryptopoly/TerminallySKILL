import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { resources } from '../renderer/src/i18n/resources'
import {
  EMPTY_STARTER_PACK_PREVIEW,
  type StarterPackPreview,
  type StarterScriptTemplate,
  type StarterSnippetTemplate
} from '../shared/starter-pack-schema'

const COMPOSE_FILE_NAMES = new Set([
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml'
])
const MAKE_FILE_NAMES = ['Makefile', 'makefile']
const PYTHON_PROJECT_FILES = ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile']
const PYTHON_ENTRYPOINT_FILES = ['manage.py', 'app.py', 'main.py']
const RUST_PROJECT_FILES = ['Cargo.toml']
const GO_PROJECT_FILES = ['go.mod']

export type Translate = (key: string, values?: Record<string, string | number>) => string

function lookupEnglish(key: string): string | undefined {
  let node: unknown = resources.en?.native
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** English translator used when the caller does not supply one (tests, non-UI callers) */
const englishTranslate: Translate = (key, values = {}) =>
  (lookupEnglish(key) ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name: string) => String(values[name] ?? ''))

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
type PythonManager = 'uv' | 'poetry' | 'pip'
type PackageScriptManifest = {
  packageManager: PackageManager
  scripts: Record<string, string>
}
type PythonProjectInfo = {
  manager: PythonManager
  scriptNames: string[]
  hasTests: boolean
  requirementsFile: string | null
  entrypoint: { kind: 'django' | 'file' | 'script'; value: string } | null
}
type RustProjectInfo = {
  packageName: string | null
  hasBinaryTarget: boolean
}
type GoProjectInfo = {
  moduleName: string | null
  hasRunnableTarget: boolean
}

const PRIMARY_SCRIPT_NAMES = ['dev', 'start', 'preview', 'serve']
const VERIFICATION_SCRIPT_NAMES = ['lint', 'typecheck', 'test', 'build']
const PACKAGING_SCRIPT_NAMES = ['package', 'package:mac', 'package:linux', 'build:linux', 'package:win']
const MAKE_RUN_TARGETS = ['dev', 'run', 'start', 'serve']
const MAKE_VERIFY_TARGETS = ['lint', 'test', 'build']

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.name)) return false
    seen.add(item.name)
    return true
  })
}

function detectPackageManager(entryNames: Set<string>): PackageManager {
  if (entryNames.has('pnpm-lock.yaml')) return 'pnpm'
  if (entryNames.has('yarn.lock')) return 'yarn'
  if (entryNames.has('bun.lock') || entryNames.has('bun.lockb')) return 'bun'
  return 'npm'
}

function buildInstallCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm install'
    case 'yarn':
      return 'yarn install'
    case 'bun':
      return 'bun install'
    case 'npm':
      return 'npm install'
  }
}

function buildRunCommand(packageManager: PackageManager, scriptName: string): string {
  switch (packageManager) {
    case 'pnpm':
      return `pnpm run ${scriptName}`
    case 'yarn':
      return `yarn ${scriptName}`
    case 'bun':
      return `bun run ${scriptName}`
    case 'npm':
      return `npm run ${scriptName}`
  }
}

function pickFirstMatch(candidates: string[], available: string[]): string | null {
  return candidates.find((candidate) => available.includes(candidate)) ?? null
}

async function loadPackageManifest(
  workingDirectory: string,
  entryNames: Set<string>
): Promise<PackageScriptManifest | null> {
  try {
    const raw = await readFile(join(workingDirectory, 'package.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { scripts?: Record<string, string> }
    return {
      packageManager: detectPackageManager(entryNames),
      scripts: parsed.scripts ?? {}
    }
  } catch {
    return null
  }
}

function parseTomlSectionAssignments(content: string, sectionName: string): string[] {
  const names: string[] = []
  let inSection = false

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inSection = trimmed === `[${sectionName}]`
      continue
    }

    if (!inSection) continue

    const match = trimmed.match(/^["']?([A-Za-z0-9_.-]+)["']?\s*=/)
    if (match) {
      names.push(match[1])
    }
  }

  return [...new Set(names)]
}

function getInterestingPackageScripts(packageScripts: Record<string, string>): string[] {
  const names = Object.keys(packageScripts)
  const ranked = [
    ...PRIMARY_SCRIPT_NAMES,
    ...VERIFICATION_SCRIPT_NAMES,
    ...PACKAGING_SCRIPT_NAMES
  ]
  const picked = ranked.filter((name, index) => names.includes(name) && ranked.indexOf(name) === index)
  const extras = names.filter((name) => !picked.includes(name) && !name.startsWith('post'))
  return [...picked, ...extras].slice(0, 6)
}

function buildNodeScripts(
  t: Translate,
  packageManager: PackageManager,
  packageScripts: Record<string, string>
): StarterScriptTemplate[] {
  const result: StarterScriptTemplate[] = []
  const scriptNames = Object.keys(packageScripts)
  const runTarget = pickFirstMatch(PRIMARY_SCRIPT_NAMES, scriptNames)

  if (runTarget) {
    result.push({
      name:
        runTarget === 'dev'
          ? t('starterPack.startDevServer')
          : runTarget === 'preview'
            ? t('starterPack.previewApp')
            : t('starterPack.startApp'),
      description: t('starterPack.installAndRunScriptDescription', { script: runTarget }),
      steps: [
        { label: t('starterPack.installDependencies'), commandString: buildInstallCommand(packageManager) },
        { label: t('starterPack.run', { target: runTarget }), commandString: buildRunCommand(packageManager, runTarget) }
      ]
    })
  }

  const verificationScripts = VERIFICATION_SCRIPT_NAMES.filter((name) => packageScripts[name])
  if (verificationScripts.length > 0) {
    result.push({
      name: t('starterPack.verifyProject'),
      description: t('starterPack.verifyProjectDescription'),
      steps: verificationScripts.map((name) => ({
        label: t('starterPack.run', { target: name }),
        commandString: buildRunCommand(packageManager, name)
      }))
    })
  }

  if (packageScripts.build && packageScripts.preview && runTarget !== 'preview') {
    result.push({
      name: t('starterPack.previewProductionBuild'),
      description: t('starterPack.previewProductionBuildDescription'),
      steps: [
        { label: t('starterPack.run', { target: 'build' }), commandString: buildRunCommand(packageManager, 'build') },
        { label: t('starterPack.run', { target: 'preview' }), commandString: buildRunCommand(packageManager, 'preview') }
      ]
    })
  }

  const packagingTarget = pickFirstMatch(PACKAGING_SCRIPT_NAMES, scriptNames)
  if (packagingTarget) {
    result.push({
      name: t('starterPack.packageApp'),
      description: t('starterPack.packageAppDescription', { script: packagingTarget }),
      steps: [{ label: t('starterPack.run', { target: packagingTarget }), commandString: buildRunCommand(packageManager, packagingTarget) }]
    })
  }

  return result
}

function buildNodeSnippets(
  t: Translate,
  packageManager: PackageManager,
  packageScripts: Record<string, string>
): StarterSnippetTemplate[] {
  const defaultScript = getInterestingPackageScripts(packageScripts)[0] ?? 'dev'
  return [
    {
      name: t('starterPack.runPackageScript'),
      description: t('starterPack.runPackageScriptDescription'),
      template: buildRunCommand(packageManager, `{{script:${defaultScript}}}`)
    }
  ]
}

async function loadPythonProjectInfo(
  workingDirectory: string,
  entries: Array<{ name: string; isDirectory: () => boolean }>,
  entryNames: Set<string>
): Promise<PythonProjectInfo | null> {
  const hasPythonSignal =
    PYTHON_PROJECT_FILES.some((fileName) => entryNames.has(fileName)) ||
    entryNames.has('uv.lock') ||
    entryNames.has('poetry.lock') ||
    PYTHON_ENTRYPOINT_FILES.some((fileName) => entryNames.has(fileName))

  if (!hasPythonSignal) return null

  let pyprojectRaw = ''
  if (entryNames.has('pyproject.toml')) {
    try {
      pyprojectRaw = await readFile(join(workingDirectory, 'pyproject.toml'), 'utf-8')
    } catch {
      pyprojectRaw = ''
    }
  }

  const scriptNames = [
    ...parseTomlSectionAssignments(pyprojectRaw, 'project.scripts'),
    ...parseTomlSectionAssignments(pyprojectRaw, 'tool.poetry.scripts')
  ].filter((name, index, all) => all.indexOf(name) === index)

  const manager: PythonManager = entryNames.has('uv.lock')
    ? 'uv'
    : entryNames.has('poetry.lock') || pyprojectRaw.includes('[tool.poetry]')
      ? 'poetry'
      : 'pip'

  const requirementsFile = entryNames.has('requirements.txt')
    ? 'requirements.txt'
    : entryNames.has('Pipfile')
      ? 'Pipfile'
      : null

  const hasTests =
    entryNames.has('pytest.ini') ||
    entryNames.has('tox.ini') ||
    entries.some((entry) => entry.name === 'tests' && entry.isDirectory()) ||
    /\bpytest\b/.test(pyprojectRaw)

  let entrypoint: PythonProjectInfo['entrypoint'] = null
  if (entryNames.has('manage.py')) {
    entrypoint = { kind: 'django', value: 'manage.py' }
  } else if (manager !== 'pip' && scriptNames.length > 0) {
    entrypoint = { kind: 'script', value: scriptNames[0] }
  } else {
    const fileEntry = PYTHON_ENTRYPOINT_FILES.find(
      (fileName) => fileName !== 'manage.py' && entryNames.has(fileName)
    )
    if (fileEntry) {
      entrypoint = { kind: 'file', value: fileEntry }
    }
  }

  return {
    manager,
    scriptNames,
    hasTests,
    requirementsFile,
    entrypoint
  }
}

function buildPythonInstallCommand(
  manager: PythonManager,
  requirementsFile: string | null
): string {
  switch (manager) {
    case 'uv':
      return 'uv sync'
    case 'poetry':
      return 'poetry install'
    case 'pip':
      return requirementsFile === 'requirements.txt'
        ? 'python -m pip install -r requirements.txt'
        : 'python -m pip install -e .'
  }
}

function buildPythonTestCommand(manager: PythonManager): string {
  switch (manager) {
    case 'uv':
      return 'uv run pytest'
    case 'poetry':
      return 'poetry run pytest'
    case 'pip':
      return 'python -m pytest'
  }
}

function buildPythonFileRunCommand(manager: PythonManager, fileName: string, args: string[] = []): string {
  const suffix = args.length > 0 ? ` ${args.join(' ')}` : ''
  switch (manager) {
    case 'uv':
      return `uv run python ${fileName}${suffix}`
    case 'poetry':
      return `poetry run python ${fileName}${suffix}`
    case 'pip':
      return `python ${fileName}${suffix}`
  }
}

function buildPythonScriptRunCommand(manager: PythonManager, scriptName: string): string {
  switch (manager) {
    case 'uv':
      return `uv run ${scriptName}`
    case 'poetry':
      return `poetry run ${scriptName}`
    case 'pip':
      return `python -m ${scriptName}`
  }
}

function buildPythonScripts(t: Translate, info: PythonProjectInfo): StarterScriptTemplate[] {
  const scripts: StarterScriptTemplate[] = [
    {
      name:
        info.manager === 'uv'
          ? t('starterPack.syncPythonEnvironment')
          : info.manager === 'poetry'
            ? t('starterPack.installPoetryEnvironment')
            : t('starterPack.installPythonDependencies'),
      description:
        info.manager === 'pip' && info.requirementsFile === 'requirements.txt'
          ? t('starterPack.installRequirementsDescription')
          : t('starterPack.setUpPythonEnvironmentDescription'),
      steps: [
        {
          label: info.manager === 'pip' && info.requirementsFile === 'requirements.txt'
            ? t('starterPack.installRequirements')
            : t('starterPack.installEnvironment'),
          commandString: buildPythonInstallCommand(info.manager, info.requirementsFile)
        }
      ]
    }
  ]

  if (info.hasTests) {
    scripts.push({
      name: t('starterPack.runPythonTests'),
      description: t('starterPack.runPythonTestsDescription'),
      steps: [{ label: t('starterPack.runTests'), commandString: buildPythonTestCommand(info.manager) }]
    })
  }

  if (info.entrypoint) {
    if (info.entrypoint.kind === 'django') {
      scripts.push({
        name: t('starterPack.startDjangoDevServer'),
        description: t('starterPack.startDjangoDevServerDescription'),
        steps: [
          {
            label: t('starterPack.runDevServer'),
            commandString: buildPythonFileRunCommand(info.manager, 'manage.py', ['runserver'])
          }
        ]
      })
    } else if (info.entrypoint.kind === 'script') {
      scripts.push({
        name: t('starterPack.run', { target: info.entrypoint.value }),
        description: t('starterPack.projectCommandDescription', { name: info.entrypoint.value }),
        steps: [
          {
            label: t('starterPack.run', { target: info.entrypoint.value }),
            commandString: buildPythonScriptRunCommand(info.manager, info.entrypoint.value)
          }
        ]
      })
    } else if (info.entrypoint.kind === 'file') {
      scripts.push({
        name: t('starterPack.run', { target: info.entrypoint.value }),
        description: t('starterPack.entrypointDescription', { name: info.entrypoint.value }),
        steps: [
          {
            label: t('starterPack.run', { target: info.entrypoint.value }),
            commandString: buildPythonFileRunCommand(info.manager, info.entrypoint.value)
          }
        ]
      })
    }
  }

  return scripts
}

function buildPythonSnippets(t: Translate, info: PythonProjectInfo): StarterSnippetTemplate[] {
  const snippets: StarterSnippetTemplate[] = []

  if (info.manager === 'pip') {
    snippets.push({
      name: t('starterPack.runPythonModule'),
      description: t('starterPack.runPythonModuleDescription'),
      template: 'python -m {{module:pytest}}'
    })
  } else {
    snippets.push({
      name: t('starterPack.runPythonCommand'),
      description: t('starterPack.runPythonCommandDescription'),
      template:
        info.manager === 'uv'
          ? 'uv run {{command:pytest}}'
          : 'poetry run {{command:pytest}}'
    })
  }

  if (info.requirementsFile === 'requirements.txt') {
    snippets.push({
      name: t('starterPack.installRequirementsFile'),
      description: t('starterPack.installRequirementsFileDescription'),
      template: 'python -m pip install -r {{requirements:requirements.txt}}'
    })
  }

  return snippets
}

async function loadRustProjectInfo(
  workingDirectory: string,
  entryNames: Set<string>
): Promise<RustProjectInfo | null> {
  if (!RUST_PROJECT_FILES.some((fileName) => entryNames.has(fileName))) return null

  let cargoRaw = ''
  try {
    cargoRaw = await readFile(join(workingDirectory, 'Cargo.toml'), 'utf-8')
  } catch {
    cargoRaw = ''
  }

  const packageName = cargoRaw.match(/\[package\][\s\S]*?name\s*=\s*"([^"]+)"/)?.[1] ?? null
  const explicitBin = /\[\[bin\]\]/.test(cargoRaw)

  let hasMain = false
  let hasBinDir = false
  try {
    const srcEntries = await readdir(join(workingDirectory, 'src'), { withFileTypes: true })
    hasMain = srcEntries.some((entry) => entry.name === 'main.rs')
    hasBinDir = srcEntries.some((entry) => entry.name === 'bin' && entry.isDirectory())
  } catch {
    hasMain = false
    hasBinDir = false
  }

  return {
    packageName,
    hasBinaryTarget: explicitBin || hasMain || hasBinDir
  }
}

function buildRustScripts(t: Translate, info: RustProjectInfo): StarterScriptTemplate[] {
  const scripts: StarterScriptTemplate[] = [
    {
      name: t('starterPack.buildRustProject'),
      description: t('starterPack.buildRustProjectDescription'),
      steps: [{ label: 'cargo build', commandString: 'cargo build' }]
    },
    {
      name: t('starterPack.runRustTests'),
      description: t('starterPack.runRustTestsDescription'),
      steps: [{ label: 'cargo test', commandString: 'cargo test' }]
    }
  ]

  if (info.hasBinaryTarget) {
    scripts.push({
      name: t('starterPack.runRustApp'),
      description: t('starterPack.runRustAppDescription'),
      steps: [{ label: 'cargo run', commandString: 'cargo run' }]
    })
  }

  return scripts
}

function buildRustSnippets(t: Translate, info: RustProjectInfo): StarterSnippetTemplate[] {
  return [
    {
      name: t('starterPack.cargoRunTarget'),
      description: t('starterPack.cargoRunTargetDescription'),
      template: `cargo run --bin {{binary:${info.packageName ?? 'app'}}}`
    },
    {
      name: t('starterPack.cargoTestFilter'),
      description: t('starterPack.cargoTestFilterDescription'),
      template: 'cargo test {{filter:config}}'
    }
  ]
}

async function loadGoProjectInfo(
  workingDirectory: string,
  entries: Array<{ name: string; isDirectory: () => boolean }>,
  entryNames: Set<string>
): Promise<GoProjectInfo | null> {
  if (!GO_PROJECT_FILES.some((fileName) => entryNames.has(fileName))) return null

  let moduleName: string | null = null
  try {
    const raw = await readFile(join(workingDirectory, 'go.mod'), 'utf-8')
    moduleName = raw.match(/^module\s+(.+)$/m)?.[1]?.trim() ?? null
  } catch {
    moduleName = null
  }

  const hasRunnableTarget =
    entryNames.has('main.go') ||
    entries.some((entry) => entry.name === 'cmd' && entry.isDirectory())

  return {
    moduleName,
    hasRunnableTarget
  }
}

function buildGoScripts(t: Translate, info: GoProjectInfo): StarterScriptTemplate[] {
  const scripts: StarterScriptTemplate[] = [
    {
      name: t('starterPack.buildGoModule'),
      description: t('starterPack.buildGoModuleDescription'),
      steps: [{ label: 'go build ./...', commandString: 'go build ./...' }]
    },
    {
      name: t('starterPack.runGoTests'),
      description: t('starterPack.runGoTestsDescription'),
      steps: [{ label: 'go test ./...', commandString: 'go test ./...' }]
    }
  ]

  if (info.hasRunnableTarget) {
    scripts.push({
      name: t('starterPack.runGoApp'),
      description: t('starterPack.runGoAppDescription'),
      steps: [{ label: 'go run .', commandString: 'go run .' }]
    })
  }

  return scripts
}

function buildGoSnippets(t: Translate, _info: GoProjectInfo): StarterSnippetTemplate[] {
  return [
    {
      name: t('starterPack.goRunTarget'),
      description: t('starterPack.goRunTargetDescription'),
      template: 'go run {{target:.}}'
    },
    {
      name: t('starterPack.goTestPackages'),
      description: t('starterPack.goTestPackagesDescription'),
      template: 'go test {{packages:./...}}'
    }
  ]
}

function buildGitScripts(t: Translate): StarterScriptTemplate[] {
  return [
    {
      name: t('starterPack.gitQuickCheck'),
      description: t('starterPack.gitQuickCheckDescription'),
      steps: [
        { label: t('starterPack.checkStatus'), commandString: 'git status' },
        { label: t('starterPack.recentCommits'), commandString: 'git log --oneline -5' }
      ]
    }
  ]
}

function buildGitSnippets(t: Translate): StarterSnippetTemplate[] {
  return [
    {
      name: t('starterPack.gitCheckoutBranch'),
      description: t('starterPack.gitCheckoutBranchDescription'),
      template: 'git checkout {{branch:main}}'
    }
  ]
}

function parseComposeServiceNames(content: string): string[] {
  const services: string[] = []
  const lines = content.split(/\r?\n/)
  let inServices = false
  let servicesIndent = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = line.match(/^ */)?.[0].length ?? 0

    if (!inServices) {
      const match = line.match(/^(\s*)services:\s*$/)
      if (match) {
        inServices = true
        servicesIndent = match[1].length
      }
      continue
    }

    if (indent <= servicesIndent && !line.match(/^(\s*)services:\s*$/)) {
      break
    }

    if (indent !== servicesIndent + 2) continue

    const serviceMatch = trimmed.match(/^([A-Za-z0-9._-]+):\s*$/)
    if (serviceMatch) {
      services.push(serviceMatch[1])
    }
  }

  return [...new Set(services)]
}

async function loadComposeServices(
  workingDirectory: string,
  entryNames: Set<string>
): Promise<string[]> {
  const composeFile = [...COMPOSE_FILE_NAMES].find((fileName) => entryNames.has(fileName))
  if (!composeFile) return []

  try {
    const raw = await readFile(join(workingDirectory, composeFile), 'utf-8')
    return parseComposeServiceNames(raw)
  } catch {
    return []
  }
}

function buildDockerScripts(t: Translate, hasComposeFile: boolean, composeServices: string[]): StarterScriptTemplate[] {
  const result: StarterScriptTemplate[] = []

  if (hasComposeFile) {
    result.push({
      name: t('starterPack.startContainers'),
      description: t('starterPack.startContainersDescription'),
      steps: [{ label: t('starterPack.composeUp'), commandString: 'docker compose up --build' }]
    })
  }

  if (composeServices.length > 0) {
    const firstService = composeServices[0]
    result.push({
      name: t('starterPack.tailServiceLogs', { service: firstService }),
      description: t('starterPack.tailServiceLogsDescription', { service: firstService }),
      steps: [{ label: t('starterPack.logsForService', { service: firstService }), commandString: `docker compose logs -f ${firstService}` }]
    })
  }

  return result
}

function buildDockerSnippets(
  t: Translate,
  hasDockerfile: boolean,
  hasComposeFile: boolean,
  composeServices: string[]
): StarterSnippetTemplate[] {
  const result: StarterSnippetTemplate[] = []

  if (hasDockerfile) {
    result.push({
      name: t('starterPack.buildLocalImage'),
      description: t('starterPack.buildLocalImageDescription'),
      template: 'docker build -t {{imageName:app-local}} .'
    })
  }

  if (hasComposeFile) {
    const defaultService = composeServices[0] ?? 'app'
    result.push({
      name: t('starterPack.composeService'),
      description: t('starterPack.composeServiceDescription'),
      template: `docker compose up {{service:${defaultService}}}`
    })
    result.push({
      name: t('starterPack.composeLogs'),
      description: t('starterPack.composeLogsDescription'),
      template: `docker compose logs -f {{service:${defaultService}}}`
    })
  }

  return result
}

function parseMakeTargets(content: string): string[] {
  const targets: string[] = []

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith(' ') || line.startsWith('\t') || line.startsWith('#')) {
      continue
    }

    const match = line.match(/^([A-Za-z0-9][A-Za-z0-9_.-]*):(?:\s|$)/)
    if (!match) continue

    const target = match[1]
    if (target.startsWith('.') || target.includes('%')) continue
    targets.push(target)
  }

  return [...new Set(targets)]
}

async function loadMakeTargets(
  workingDirectory: string,
  entryNames: Set<string>
): Promise<string[]> {
  const makeFile = MAKE_FILE_NAMES.find((fileName) => entryNames.has(fileName))
  if (!makeFile) return []

  try {
    const raw = await readFile(join(workingDirectory, makeFile), 'utf-8')
    return parseMakeTargets(raw)
  } catch {
    return []
  }
}

function buildMakeScripts(t: Translate, targets: string[]): StarterScriptTemplate[] {
  const result: StarterScriptTemplate[] = []
  const runTarget = pickFirstMatch(MAKE_RUN_TARGETS, targets)
  const verifyTargets = MAKE_VERIFY_TARGETS.filter((target) => targets.includes(target))

  if (runTarget) {
    result.push({
      name: t('starterPack.startViaMake'),
      description: t('starterPack.startViaMakeDescription', { target: runTarget }),
      steps: [{ label: `make ${runTarget}`, commandString: `make ${runTarget}` }]
    })
  }

  if (verifyTargets.length > 0) {
    result.push({
      name: t('starterPack.verifyViaMake'),
      description: t('starterPack.verifyViaMakeDescription'),
      steps: verifyTargets.map((target) => ({
        label: `make ${target}`,
        commandString: `make ${target}`
      }))
    })
  }

  return result
}

function buildMakeSnippets(t: Translate, targets: string[]): StarterSnippetTemplate[] {
  if (targets.length === 0) return []

  const defaultTarget = pickFirstMatch([...MAKE_RUN_TARGETS, ...MAKE_VERIFY_TARGETS], targets) ?? targets[0]
  return [
    {
      name: t('starterPack.runMakeTarget'),
      description: t('starterPack.runMakeTargetDescription'),
      template: `make {{target:${defaultTarget}}}`
    }
  ]
}

export async function detectStarterPack(
  workingDirectory: string,
  translate: Translate = englishTranslate
): Promise<StarterPackPreview> {
  const t = translate
  if (!workingDirectory.trim()) return EMPTY_STARTER_PACK_PREVIEW

  try {
    const entries = await readdir(workingDirectory, { withFileTypes: true })
    const entryNames = new Set(entries.map((entry) => entry.name))
    const categories = new Set<string>()
    const detections: string[] = []
    const scripts: StarterScriptTemplate[] = []
    const snippets: StarterSnippetTemplate[] = []

    const hasGitDir = entries.some((entry) => entry.name === '.git' && entry.isDirectory())
    if (hasGitDir) {
      detections.push('Git repository')
      categories.add('git')
      scripts.push(...buildGitScripts(t))
      snippets.push(...buildGitSnippets(t))
    }

    const packageManifest = entryNames.has('package.json')
      ? await loadPackageManifest(workingDirectory, entryNames)
      : null
    if (packageManifest) {
      detections.push(
        packageManifest.packageManager === 'npm'
          ? 'Node package'
          : `Node package (${packageManifest.packageManager})`
      )
      categories.add('package-managers')
      scripts.push(...buildNodeScripts(t, packageManifest.packageManager, packageManifest.scripts))
      snippets.push(...buildNodeSnippets(t, packageManifest.packageManager, packageManifest.scripts))
    }

    const pythonProject = await loadPythonProjectInfo(workingDirectory, entries, entryNames)
    if (pythonProject) {
      detections.push(
        pythonProject.manager === 'poetry'
          ? 'Python project (Poetry)'
          : `Python project (${pythonProject.manager})`
      )
      categories.add('python')
      scripts.push(...buildPythonScripts(t, pythonProject))
      snippets.push(...buildPythonSnippets(t, pythonProject))
    }

    const rustProject = await loadRustProjectInfo(workingDirectory, entryNames)
    if (rustProject) {
      detections.push('Rust crate')
      categories.add('rust')
      scripts.push(...buildRustScripts(t, rustProject))
      snippets.push(...buildRustSnippets(t, rustProject))
    }

    const goProject = await loadGoProjectInfo(workingDirectory, entries, entryNames)
    if (goProject) {
      detections.push('Go module')
      categories.add('go')
      scripts.push(...buildGoScripts(t, goProject))
      snippets.push(...buildGoSnippets(t, goProject))
    }

    const hasDockerfile = entryNames.has('Dockerfile')
    const hasComposeFile = [...COMPOSE_FILE_NAMES].some((fileName) => entryNames.has(fileName))
    const composeServices = hasComposeFile ? await loadComposeServices(workingDirectory, entryNames) : []
    if (hasDockerfile || hasComposeFile) {
      detections.push(
        hasComposeFile
          ? composeServices.length > 0
            ? `Docker Compose (${composeServices.length} service${composeServices.length === 1 ? '' : 's'})`
            : 'Docker Compose config'
          : 'Dockerfile'
      )
      categories.add('docker')
      scripts.push(...buildDockerScripts(t, hasComposeFile, composeServices))
      snippets.push(...buildDockerSnippets(t, hasDockerfile, hasComposeFile, composeServices))
    }

    const makeTargets = await loadMakeTargets(workingDirectory, entryNames)
    if (makeTargets.length > 0) {
      detections.push(`Makefile (${makeTargets.length} target${makeTargets.length === 1 ? '' : 's'})`)
      scripts.push(...buildMakeScripts(t, makeTargets))
      snippets.push(...buildMakeSnippets(t, makeTargets))
    }

    return {
      detections,
      categories: [...categories],
      scripts: dedupeByName(scripts),
      snippets: dedupeByName(snippets)
    }
  } catch {
    return EMPTY_STARTER_PACK_PREVIEW
  }
}
