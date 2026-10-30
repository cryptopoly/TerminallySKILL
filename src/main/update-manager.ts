import { app, shell } from 'electron'
import { existsSync } from 'fs'
import { chmod, mkdir, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { load as parseYaml } from 'js-yaml'
import type { AppUpdater, UpdateCheckResult as ElectronUpdaterCheckResult } from 'electron-updater'
import type { AppSettings } from '../shared/settings-schema'
import type {
  AppUpdateAsset,
  AppUpdateCheckResult,
  AppUpdateInstallResult,
  AppUpdateManifest
} from '../shared/update-schema'
import { getSettings } from './settings-manager'
import { translateNativeSync } from './native-i18n'
import { recordOutboundRequest } from './network-log'
import {
  compareVersions,
  pickBestInstallerAsset,
  resolveUpdateManifestUrls
} from './update-utils'

const DEFAULT_UPDATE_FEED_URL = process.env.TERMINALLY_SKILL_UPDATE_URL?.trim() ?? ''
const UPDATE_DOWNLOAD_DIR = 'terminallyskill-updates'
const AUTO_UPDATE_CONFIG_FILE = 'app-update.yml'

const PLATFORM_ALIASES: Record<string, NodeJS.Platform | 'any'> = {
  any: 'any',
  darwin: 'darwin',
  mac: 'darwin',
  macos: 'darwin',
  osx: 'darwin',
  linux: 'linux',
  win: 'win32',
  win32: 'win32',
  windows: 'win32'
}

const ARCH_ALIASES: Record<string, NodeJS.Architecture | 'universal'> = {
  arm64: 'arm64',
  aarch64: 'arm64',
  x64: 'x64',
  amd64: 'x64',
  universal: 'universal',
  universal2: 'universal'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeNotes(notes: unknown): string | undefined {
  if (typeof notes === 'string') {
    return notes.trim() || undefined
  }

  if (Array.isArray(notes)) {
    const parts = notes
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim()
        if (isRecord(entry) && typeof entry.note === 'string') return entry.note.trim()
        return ''
      })
      .filter(Boolean)

    return parts.length > 0 ? parts.join('\n') : undefined
  }

  return undefined
}

function normalizeCustomFeedUrl(settings: AppSettings): string | null {
  const nextFeedUrl = settings.devUpdateFeedUrl.trim() || DEFAULT_UPDATE_FEED_URL
  if (!nextFeedUrl) return null
  // Enforce HTTPS for update feeds to prevent MITM attacks
  try {
    const parsed = new URL(nextFeedUrl)
    if (parsed.protocol !== 'https:' && !nextFeedUrl.startsWith('file:')) return null
  } catch {
    return null
  }
  return nextFeedUrl
}

function hasBuiltInAutoUpdaterConfig(): boolean {
  if (!app.isPackaged) return false
  return existsSync(join(process.resourcesPath, AUTO_UPDATE_CONFIG_FILE))
}

function shouldUseElectronUpdater(settings: AppSettings): boolean {
  if (settings.devUpdateFeedUrl.trim()) return false
  if (!app.isPackaged) return false
  if (process.platform !== 'darwin' && process.platform !== 'win32') return false

  return hasBuiltInAutoUpdaterConfig() || Boolean(DEFAULT_UPDATE_FEED_URL)
}

function parsePlatformKey(key: string): Pick<AppUpdateAsset, 'platform' | 'arch'> {
  const tokens = key
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .split('-')
    .filter(Boolean)

  let platform: AppUpdateAsset['platform'] = undefined
  let arch: AppUpdateAsset['arch'] = undefined

  for (const token of tokens) {
    if (!platform && token in PLATFORM_ALIASES) {
      platform = PLATFORM_ALIASES[token]
      continue
    }
    if (!arch && token in ARCH_ALIASES) {
      arch = ARCH_ALIASES[token]
    }
  }

  return { platform, arch }
}

function resolveAssetUrl(assetUrl: string, manifestUrl: string): string {
  try {
    return new URL(assetUrl, manifestUrl).toString()
  } catch {
    return assetUrl
  }
}

function inferPlacementFromManifestUrl(
  manifestUrl: string
): Pick<AppUpdateAsset, 'platform' | 'arch'> {
  const fileName = manifestUrl
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .pop()
    ?.toLowerCase() ?? ''

  if (fileName.includes('latest-mac-arm64') || fileName.includes('latest-mac-aarch64')) {
    return { platform: 'darwin', arch: 'arm64' }
  }

  if (fileName.includes('latest-mac-x64') || fileName.includes('latest-mac-amd64')) {
    return { platform: 'darwin', arch: 'x64' }
  }

  if (fileName.includes('latest-mac')) {
    return { platform: 'darwin' }
  }

  if (fileName.includes('latest-linux-arm64') || fileName.includes('latest-linux-aarch64')) {
    return { platform: 'linux', arch: 'arm64' }
  }

  if (fileName.includes('latest-linux-x64') || fileName.includes('latest-linux-amd64')) {
    return { platform: 'linux', arch: 'x64' }
  }

  if (fileName.includes('latest-linux')) {
    return { platform: 'linux' }
  }

  if (fileName.includes('latest-win-arm64') || fileName.includes('latest-win-aarch64')) {
    return { platform: 'win32', arch: 'arm64' }
  }

  if (fileName.includes('latest-win-x64') || fileName.includes('latest-win-amd64')) {
    return { platform: 'win32', arch: 'x64' }
  }

  if (fileName === 'latest.yml' || fileName === 'latest.yaml' || fileName.includes('latest-win')) {
    return { platform: 'win32' }
  }

  return {}
}

function parseElectronBuilderManifest(
  text: string,
  manifestUrl: string
): AppUpdateManifest {
  const parsed = parseYaml(text)
  if (!isRecord(parsed)) {
    throw new Error(translateNativeSync('errors.updateInvalidManifest'))
  }

  const version = typeof parsed.version === 'string' ? parsed.version.trim() : ''
  if (!version) {
    throw new Error(translateNativeSync('errors.updateInvalidVersion'))
  }

  const placement = inferPlacementFromManifestUrl(manifestUrl)
  const assets: AppUpdateAsset[] = []

  if (Array.isArray(parsed.files)) {
    for (const fileEntry of parsed.files) {
      if (!isRecord(fileEntry) || typeof fileEntry.url !== 'string' || !fileEntry.url.trim()) continue
      assets.push({
        ...placement,
        platform:
          typeof fileEntry.platform === 'string' && fileEntry.platform.trim()
            ? fileEntry.platform.trim()
            : placement.platform,
        arch:
          typeof fileEntry.arch === 'string' && fileEntry.arch.trim()
            ? fileEntry.arch.trim()
            : placement.arch,
        url: fileEntry.url.trim(),
        fileName: basename(fileEntry.url.trim())
      })
    }
  }

  if (assets.length === 0 && typeof parsed.path === 'string' && parsed.path.trim()) {
    assets.push({
      ...placement,
      url: parsed.path.trim(),
      fileName: basename(parsed.path.trim())
    })
  }

  return {
    version,
    publishedAt: typeof parsed.releaseDate === 'string' ? parsed.releaseDate : undefined,
    notes: normalizeNotes(parsed.releaseNotes),
    assets
  }
}

function parseUpdateManifest(
  text: string,
  manifestUrl: string,
  contentType: string | null
): AppUpdateManifest {
  const normalizedContentType = contentType?.toLowerCase() ?? ''
  const shouldParseAsJson =
    /\.json($|[?#])/i.test(manifestUrl) ||
    normalizedContentType.includes('application/json')

  if (shouldParseAsJson) {
    const manifest = JSON.parse(text) as AppUpdateManifest
    if (!manifest || typeof manifest.version !== 'string' || !manifest.version.trim()) {
      throw new Error(translateNativeSync('errors.updateInvalidVersion'))
    }
    return manifest
  }

  return parseElectronBuilderManifest(text, manifestUrl)
}

function normalizeAsset(
  asset: AppUpdateAsset,
  manifestUrl: string
): AppUpdateAsset | null {
  const url = typeof asset.url === 'string' ? asset.url.trim() : ''
  if (!url) return null

  return {
    platform: asset.platform?.trim().toLowerCase(),
    arch: asset.arch?.trim().toLowerCase(),
    url: resolveAssetUrl(url, manifestUrl),
    label: asset.label?.trim() || undefined,
    fileName: asset.fileName?.trim() || undefined
  }
}

function collectManifestAssets(
  manifest: AppUpdateManifest,
  manifestUrl: string
): AppUpdateAsset[] {
  const assets: AppUpdateAsset[] = []

  const appendAsset = (asset: AppUpdateAsset): void => {
    const normalized = normalizeAsset(asset, manifestUrl)
    if (!normalized) return
    assets.push(normalized)
  }

  for (const asset of manifest.downloads ?? []) {
    appendAsset(asset)
  }

  for (const asset of manifest.assets ?? []) {
    appendAsset(asset)
  }

  if (isRecord(manifest.platforms)) {
    for (const [key, value] of Object.entries(manifest.platforms)) {
      const placement = parsePlatformKey(key)
      if (typeof value === 'string') {
        appendAsset({
          ...placement,
          url: value
        })
        continue
      }
      if (isRecord(value) && typeof value.url === 'string') {
        appendAsset({
          ...placement,
          platform: typeof value.platform === 'string' ? value.platform : placement.platform,
          arch: typeof value.arch === 'string' ? value.arch : placement.arch,
          url: value.url,
          label: typeof value.label === 'string' ? value.label : undefined,
          fileName: typeof value.fileName === 'string' ? value.fileName : undefined
        })
      }
    }
  }

  if (typeof manifest.url === 'string' && manifest.url.trim()) {
    appendAsset({
      platform: 'any',
      url: manifest.url,
      label: manifest.label,
      fileName: manifest.fileName
    })
  }

  const seen = new Set<string>()
  return assets.filter((asset) => {
    const key = [
      asset.platform ?? 'any',
      asset.arch ?? 'any',
      asset.url.toLowerCase()
    ].join('::')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getDownloadFileName(asset: AppUpdateAsset, latestVersion: string): string {
  if (asset.fileName?.trim()) return asset.fileName.trim()

  try {
    const parsed = new URL(asset.url)
    const derived = basename(parsed.pathname)
    if (derived) return derived
  } catch {
    // fall through to generated file name
  }

  return `TerminallySKILL-${latestVersion}`
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
}

function buildDownloadUrlCandidates(downloadUrl: string): string[] {
  const candidates = [downloadUrl]

  try {
    const parsed = new URL(downloadUrl)
    const decodedPath = decodeURIComponent(parsed.pathname)
    const fileName = basename(decodedPath)
    const versionMatch = fileName.match(/^(.*?)-(\d+\.\d+\.\d+.*)$/)

    if (versionMatch) {
      const prettyPrefix = versionMatch[1].replace(/-/g, ' ')
      const alternateFileName = `${prettyPrefix}-${versionMatch[2]}`
      const compactFileName = `${versionMatch[1].replace(/[-\s]+/g, '')}-${versionMatch[2]}`

      if (alternateFileName !== fileName) {
        const alternateUrl = new URL(downloadUrl)
        alternateUrl.pathname = decodedPath.slice(0, -fileName.length) + alternateFileName
        candidates.push(alternateUrl.toString())
      }

      if (compactFileName !== fileName) {
        const compactUrl = new URL(downloadUrl)
        compactUrl.pathname = decodedPath.slice(0, -fileName.length) + compactFileName
        candidates.push(compactUrl.toString())
      }
    }
  } catch {
    // ignore URL parse failures and keep the original candidate only
  }

  return [...new Set(candidates)]
}

async function resolveElectronUpdater(
  settings: AppSettings
): Promise<{ updater: AppUpdater; feedUrl: string | null }> {
  const { autoUpdater, MacUpdater, NsisUpdater } = await import('electron-updater')
  const defaultFeedUrl = DEFAULT_UPDATE_FEED_URL || null

  let updater: AppUpdater | undefined

  if (defaultFeedUrl && !hasBuiltInAutoUpdaterConfig()) {
    updater =
      process.platform === 'darwin'
        ? new MacUpdater({ provider: 'generic', url: defaultFeedUrl })
        : new NsisUpdater({ provider: 'generic', url: defaultFeedUrl })
  } else if (autoUpdater) {
    updater = autoUpdater
  } else {
    // autoUpdater can be undefined when the dynamic import fails to auto-detect
    // config. Fall back to explicitly creating the updater with GitHub provider.
    const githubOpts = { provider: 'github' as const, owner: 'cryptopoly', repo: 'TerminallySKILL' }
    updater =
      process.platform === 'darwin'
        ? new MacUpdater(githubOpts)
        : new NsisUpdater(githubOpts)
  }

  updater.autoDownload = false
  updater.autoInstallOnAppQuit = true

  return {
    updater,
    feedUrl:
      defaultFeedUrl ||
      (hasBuiltInAutoUpdaterConfig()
        ? join(process.resourcesPath, AUTO_UPDATE_CONFIG_FILE)
        : null)
  }
}

function mapElectronUpdaterCheck(
  currentVersion: string,
  checkedAt: string,
  feedUrl: string | null,
  result: ElectronUpdaterCheckResult | null
): AppUpdateCheckResult {
  const latestVersion = result?.updateInfo?.version?.trim() || currentVersion
  const notes = normalizeNotes(result?.updateInfo?.releaseNotes)
  const publishedAt = result?.updateInfo?.releaseDate
  const candidateFile =
    result?.updateInfo?.files?.[0]?.url ||
    result?.updateInfo?.path ||
    undefined

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return {
      status: 'up-to-date',
      delivery: 'electron-updater',
      currentVersion,
      checkedAt,
      feedUrl,
      latestVersion,
      notes,
      publishedAt,
      fileName: candidateFile ? basename(candidateFile) : undefined,
      message: `TerminallySKILL ${currentVersion} is up to date.`
    }
  }

  return {
    status: 'update-available',
    delivery: 'electron-updater',
    currentVersion,
    checkedAt,
    feedUrl,
    latestVersion,
    notes,
    publishedAt,
    fileName: candidateFile ? basename(candidateFile) : undefined,
    message: `Update ${latestVersion} is available and can be installed in-app.`
  }
}

async function checkForAppUpdateViaElectronUpdater(
  settings: AppSettings
): Promise<AppUpdateCheckResult> {
  const currentVersion = app.getVersion()
  const checkedAt = new Date().toISOString()

  try {
    const { updater, feedUrl } = await resolveElectronUpdater(settings)
    const result = await updater.checkForUpdates()
    return mapElectronUpdaterCheck(currentVersion, checkedAt, feedUrl, result)
  } catch (error) {
    return {
      status: 'error',
      delivery: 'electron-updater',
      currentVersion,
      checkedAt,
      feedUrl: hasBuiltInAutoUpdaterConfig()
        ? join(process.resourcesPath, AUTO_UPDATE_CONFIG_FILE)
        : DEFAULT_UPDATE_FEED_URL || null,
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

async function checkForAppUpdateViaCustomFeed(
  settings: AppSettings
): Promise<AppUpdateCheckResult> {
  const currentVersion = app.getVersion()
  const checkedAt = new Date().toISOString()
  const configuredFeedUrl = normalizeCustomFeedUrl(settings)

  if (!configuredFeedUrl) {
    return {
      status: 'not-configured',
      delivery: 'custom',
      currentVersion,
      checkedAt,
      feedUrl: null,
      message: 'No app update feed is configured yet.'
    }
  }

  const manifestUrls = resolveUpdateManifestUrls(configuredFeedUrl)
  let lastError: string | null = null

  for (const manifestUrl of manifestUrls) {
    try {
      const response = await fetch(manifestUrl, {
        headers: {
          accept: 'application/json, text/yaml, application/x-yaml, text/plain;q=0.9, */*;q=0.8'
        }
      })
      recordOutboundRequest(manifestUrl, 'update', response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const responseText = await response.text()
      const manifest = parseUpdateManifest(
        responseText,
        manifestUrl,
        response.headers.get('content-type')
      )
      const latestVersion = manifest.version.trim()
      const notes = normalizeNotes(manifest.notes)

      if (compareVersions(latestVersion, currentVersion) <= 0) {
        return {
          status: 'up-to-date',
          delivery: 'custom',
          currentVersion,
          checkedAt,
          feedUrl: manifestUrl,
          latestVersion,
          notes,
          publishedAt: manifest.publishedAt,
          message: `TerminallySKILL ${currentVersion} is up to date.`
        }
      }

      const asset = pickBestInstallerAsset(collectManifestAssets(manifest, manifestUrl))
      if (!asset) {
        return {
          status: 'error',
          delivery: 'custom',
          currentVersion,
          checkedAt,
          feedUrl: manifestUrl,
          latestVersion,
          notes,
          publishedAt: manifest.publishedAt,
          message: `Update ${latestVersion} exists, but no downloadable asset matched ${process.platform}/${process.arch}.`
        }
      }

      return {
        status: 'update-available',
        delivery: 'custom',
        currentVersion,
        checkedAt,
        feedUrl: manifestUrl,
        latestVersion,
        notes,
        publishedAt: manifest.publishedAt,
        downloadUrl: asset.url,
        assetLabel: asset.label,
        fileName: getDownloadFileName(asset, latestVersion),
        message: `Update ${latestVersion} is available for ${process.platform}/${process.arch}.`
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  return {
    status: 'error',
    delivery: 'custom',
    currentVersion,
    checkedAt,
    feedUrl: manifestUrls[0] ?? configuredFeedUrl,
    message: lastError ?? 'No release feed could be loaded.'
  }
}

async function downloadAndOpenCustomAppUpdate(
  update: AppUpdateCheckResult
): Promise<AppUpdateInstallResult> {
  if (update.status !== 'update-available' || !update.downloadUrl) {
    return {
      success: false,
      delivery: 'custom',
      message: update.message
    }
  }

  try {
    let response: Response | null = null
    let lastDownloadError: string | null = null

    for (const candidateUrl of buildDownloadUrlCandidates(update.downloadUrl)) {
      const candidateResponse = await fetch(candidateUrl)
      recordOutboundRequest(candidateUrl, 'update', candidateResponse.status)
      if (candidateResponse.ok) {
        response = candidateResponse
        break
      }
      lastDownloadError = `Download failed with HTTP ${candidateResponse.status}`
    }

    if (!response) {
      throw new Error(lastDownloadError ?? translateNativeSync('errors.downloadFailed'))
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const updateDir = join(app.getPath('temp'), UPDATE_DOWNLOAD_DIR)
    await mkdir(updateDir, { recursive: true })

    const targetPath = join(
      updateDir,
      sanitizeFileName(update.fileName ?? `TerminallySKILL-${update.latestVersion}`)
    )

    await writeFile(targetPath, buffer)

    if (/\.(appimage|sh|bin)$/i.test(targetPath)) {
      try {
        await chmod(targetPath, 0o755)
      } catch {
        // Ignore chmod failures for platforms/files that don't need it.
      }
    }

    const openError = await shell.openPath(targetPath)
    if (openError) {
      return {
        success: false,
        delivery: 'custom',
        message: openError,
        filePath: targetPath
      }
    }

    return {
      success: true,
      delivery: 'custom',
      message: `Downloaded ${update.latestVersion} and opened the installer.`,
      filePath: targetPath
    }
  } catch (error) {
    return {
      success: false,
      delivery: 'custom',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

async function downloadAndInstallViaElectronUpdater(
  settings: AppSettings
): Promise<AppUpdateInstallResult> {
  try {
    const { updater } = await resolveElectronUpdater(settings)
    const result = await updater.checkForUpdates()
    const latestVersion = result?.updateInfo?.version?.trim() || app.getVersion()

    if (!result || compareVersions(latestVersion, app.getVersion()) <= 0) {
      return {
        success: false,
        delivery: 'electron-updater',
        message: 'No update is ready to install.'
      }
    }

    await updater.downloadUpdate()
    const { killAllTerminals } = await import('./pty-manager')
    const { stopAllVncSessions } = await import('./vnc-manager')
    await killAllTerminals()
    stopAllVncSessions()
    setTimeout(() => {
      updater.quitAndInstall(false, true)
    }, 500)

    return {
      success: true,
      delivery: 'electron-updater',
      message: `Update ${latestVersion} downloaded. TerminallySKILL will restart to install it.`
    }
  } catch (error) {
    return {
      success: false,
      delivery: 'electron-updater',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function getAppVersion(): Promise<string> {
  return app.getVersion()
}

export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  const settings = await getSettings()

  if (shouldUseElectronUpdater(settings)) {
    return checkForAppUpdateViaElectronUpdater(settings)
  }

  return checkForAppUpdateViaCustomFeed(settings)
}

export async function downloadAndOpenAppUpdate(): Promise<AppUpdateInstallResult> {
  const settings = await getSettings()

  if (shouldUseElectronUpdater(settings)) {
    return downloadAndInstallViaElectronUpdater(settings)
  }

  const update = await checkForAppUpdateViaCustomFeed(settings)
  return downloadAndOpenCustomAppUpdate(update)
}
