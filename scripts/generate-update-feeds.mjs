import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const distDir = path.join(rootDir, 'dist')
const packageJsonPath = path.join(rootDir, 'package.json')

const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
const version = String(packageJson.version ?? '').trim()

if (!version) {
  throw new Error('Could not determine package version')
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

async function fileEntryFor(fileName, arch) {
  const absolutePath = path.join(distDir, fileName)
  const [buffer, stats] = await Promise.all([
    fs.readFile(absolutePath),
    fs.stat(absolutePath)
  ])

  return {
    url: fileName,
    sha512: createHash('sha512').update(buffer).digest('base64'),
    size: stats.size,
    arch,
    modifiedAt: stats.mtime.toISOString()
  }
}

function normalizeLinuxArch(arch) {
  if (arch === 'amd64' || arch === 'x86_64') return 'x64'
  return arch
}

function renderYamlValue(value) {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return "''"
  if (/^[A-Za-z0-9._/@:+-]+$/.test(value)) return value
  return `'${value.replace(/'/g, "''")}'`
}

function renderFeed({ version, files, pathValue, sha512, releaseDate }) {
  const lines = [`version: ${version}`, 'files:']

  for (const file of files) {
    lines.push(`  - url: ${renderYamlValue(file.url)}`)
    lines.push(`    sha512: ${renderYamlValue(file.sha512)}`)
    lines.push(`    size: ${file.size}`)
    if (file.arch) {
      lines.push(`    arch: ${renderYamlValue(file.arch)}`)
    }
  }

  lines.push(`path: ${renderYamlValue(pathValue)}`)
  lines.push(`sha512: ${renderYamlValue(sha512)}`)
  lines.push(`releaseDate: ${renderYamlValue(releaseDate)}`)
  lines.push('')

  return lines.join('\n')
}

async function writeFeed(fileName, files, preferredExtOrder) {
  if (files.length === 0) return

  const sortedFiles = [...files].sort((left, right) => {
    const leftExt = path.extname(left.url).toLowerCase()
    const rightExt = path.extname(right.url).toLowerCase()
    const leftRank = preferredExtOrder.indexOf(leftExt)
    const rightRank = preferredExtOrder.indexOf(rightExt)

    if (leftRank !== rightRank) {
      return (leftRank === -1 ? 999 : leftRank) - (rightRank === -1 ? 999 : rightRank)
    }

    return left.url.localeCompare(right.url)
  })

  const newestDate = sortedFiles
    .map((file) => file.modifiedAt)
    .sort((left, right) => left.localeCompare(right))
    .at(-1)

  const primary = sortedFiles[0]
  const yaml = renderFeed({
    version,
    files: sortedFiles,
    pathValue: primary.url,
    sha512: primary.sha512,
    releaseDate: newestDate ?? new Date().toISOString()
  })

  await fs.writeFile(path.join(distDir, fileName), yaml, 'utf8')
  console.log(`Generated ${toPosix(path.join('dist', fileName))}`)
}

const allFiles = await fs.readdir(distDir)

const macArtifacts = await Promise.all(
  allFiles
    .map((fileName) => {
      const match = fileName.match(
        new RegExp(`^TerminallySKILL-${version}-(arm64|x64)\\.(zip|dmg)$`)
      )
      if (!match) return null
      return fileEntryFor(fileName, match[1])
    })
    .filter(Boolean)
)

const linuxArtifacts = await Promise.all(
  allFiles
    .map((fileName) => {
      const match = fileName.match(
        new RegExp(`^TerminallySKILL-${version}-(arm64|x64|amd64|x86_64)\\.(AppImage|deb)$`)
      )
      if (!match) return null
      return fileEntryFor(fileName, normalizeLinuxArch(match[1]))
    })
    .filter(Boolean)
)

const windowsArtifacts = await Promise.all(
  allFiles
    .map((fileName) => {
      const match = fileName.match(
        new RegExp(`^TerminallySKILL-Setup-${version}(?:-(arm64|x64))?\\.exe$`)
      )
      if (!match) return null
      return fileEntryFor(fileName, match[1] ?? '')
    })
    .filter(Boolean)
)

const macArm64 = macArtifacts.filter((artifact) => artifact.arch === 'arm64')
const macX64 = macArtifacts.filter((artifact) => artifact.arch === 'x64')
const linuxArm64 = linuxArtifacts.filter((artifact) => artifact.arch === 'arm64')
const linuxX64 = linuxArtifacts.filter((artifact) => artifact.arch === 'x64')
const winArm64 = windowsArtifacts.filter((artifact) => artifact.arch === 'arm64')
const winX64 = windowsArtifacts.filter((artifact) => artifact.arch === 'x64' || artifact.arch === '')

await writeFeed('latest-mac.yml', macArtifacts, ['.zip', '.dmg'])
await writeFeed('latest-linux.yml', linuxArtifacts, ['.deb', '.appimage'])
await writeFeed('latest.yml', windowsArtifacts, ['.exe'])
