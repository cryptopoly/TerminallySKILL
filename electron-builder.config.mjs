import { execSync } from 'node:child_process'
import { chmod, lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { Arch } from 'electron-builder'
import { missingConptyFiles, restoreConptyFiles } from './scripts/node-pty-conpty.mjs'

const defaultProductName = 'TerminallySKILL'
const productSlug = 'TerminallySKILL'
const linuxExecutableName = 'terminallyskill'
const productName = process.env.TERMINALLY_SKILL_PRODUCT_NAME?.trim() || defaultProductName
const updateFeedUrl = process.env.TERMINALLY_SKILL_UPDATE_URL?.trim() || ''
const appleId = process.env.APPLE_ID?.trim() || ''
const appleAppSpecificPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD?.trim() || ''
const appleTeamId = process.env.APPLE_TEAM_ID?.trim() || ''

function hasMacCodeSigningIdentity() {
  if (process.platform !== 'darwin') return false

  try {
    const output = execSync('security find-identity -v -p codesigning', {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString()
    return !/0 valid identities found/i.test(output)
  } catch {
    return false
  }
}

// Package file modes otherwise follow the build machine's umask and checkout modes (a 077 umask
// ships a deb whose files only root can read). Files electron-builder writes itself (desktop file,
// install scripts) follow the umask; files copied from the checkout (the app folder, build/icons)
// keep their modes, so normalise those: 0755 for directories and executables, 0644 for the rest.
process.umask(0o022)

async function normaliseModes(file) {
  const stat = await lstat(file)
  if (stat.isSymbolicLink()) return
  if (stat.isDirectory()) {
    await chmod(file, 0o755)
    for (const entry of await readdir(file)) await normaliseModes(path.join(file, entry))
  } else {
    await chmod(file, stat.mode & 0o100 ? 0o755 : 0o644)
  }
}

await normaliseModes('build/icons')

// A node-pty rebuilt for this package has lost its bundled ConPTY (see scripts/node-pty-conpty.mjs): put it
// back in the packaged app, and stop the build rather than ship an app that cannot open a terminal.
function ensureBundledConpty(context) {
  const nodePtyDir = path.join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'node-pty')
  const arch = Arch[context.arch]
  restoreConptyFiles(nodePtyDir, arch)
  const missing = missingConptyFiles(nodePtyDir, arch)
  if (missing.length > 0) {
    throw new Error(`The packaged app could not open a terminal, node-pty's bundled ConPTY is missing: ${missing.join(', ')}`)
  }
}

const canNotarize =
  Boolean(appleId && appleAppSpecificPassword && appleTeamId) &&
  (Boolean(process.env.CSC_LINK) || hasMacCodeSigningIdentity())

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.terminallyskill.app',
  productName,
  icon: 'build/icon.png',
  // Only the build output; production dependencies are added by electron-builder. Without this,
  // everything in the checkout ships, including .claude/ (agent worktrees, local settings).
  files: ['out/**/*', 'package.json'],
  extraResources: [
    {
      from: 'commands',
      to: 'commands'
    }
  ],
  afterPack: async (context) => {
    if (context.electronPlatformName === 'linux') await normaliseModes(context.appOutDir)
    if (context.electronPlatformName === 'win32') ensureBundledConpty(context)
  },
  asarUnpack: [
    '**/node-pty/**'
  ],
  publish: updateFeedUrl
    ? [
        {
          provider: 'generic',
          url: updateFeedUrl
        }
      ]
    : [
        {
          provider: 'github',
          owner: 'cryptopoly',
          repo: 'TerminallySKILL'
        }
      ],
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    artifactName: `${productSlug}-\${version}-\${arch}.\${ext}`,
    notarize: canNotarize
  },
  toolsets: {
    // The legacy AppImage runtime links libz.so and libfuse2, which a stock Ubuntu arm64 lacks. 1.0.3
    // uses the static type-2 runtime, which needs neither.
    appimage: '1.0.3'
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build/icons',
    category: 'Development',
    synopsis: 'Prompt-aware terminal workspace for building, running and reviewing commands.',
    description: 'TerminallySKILL is a prompt-aware terminal workspace for command trees, scripts, snippets, logs and AI-assisted terminal workflows.',
    executableName: linuxExecutableName,
    executableArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ozone-platform=x11'],
    syncDesktopName: true,
    artifactName: `${productSlug}-\${version}-\${arch}.\${ext}`
  },
  deb: {
    packageName: 'terminallyskill'
  },
  win: {
    target: 'nsis',
    artifactName: `${productSlug}-Setup-\${version}-\${arch}.\${ext}`
  }
}

export default config
