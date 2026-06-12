import { execSync } from 'node:child_process'

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

const canNotarize =
  Boolean(appleId && appleAppSpecificPassword && appleTeamId) &&
  (Boolean(process.env.CSC_LINK) || hasMacCodeSigningIdentity())

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.terminallyskill.app',
  productName,
  icon: 'build/icon.png',
  extraResources: [
    {
      from: 'commands',
      to: 'commands'
    }
  ],
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
      ? {
          teamId: appleTeamId
        }
      : false
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
