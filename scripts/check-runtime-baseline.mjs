import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'))

const checks = [
  {
    label: 'Node engine is aligned with Electron 42 installer requirements',
    value: packageJson.engines?.node,
    expected: '>=22.12.0'
  },
  {
    label: 'Electron stays on the supported v42 runtime baseline',
    value: packageJson.devDependencies?.electron,
    expected: '^42.4.0'
  },
  {
    label: 'ws stays on the patched runtime baseline',
    value: packageJson.dependencies?.ws,
    expected: '^8.21.0'
  },
  {
    label: 'Linux desktop name stays aligned with Electron window association',
    value: packageJson.desktopName,
    expected: 'terminallyskill.desktop'
  },
  {
    label: 'electron-builder stays on the audit-clean packaging baseline',
    value: packageJson.devDependencies?.['electron-builder'],
    expected: '^26.15.2'
  },
  {
    label: 'electron-vite stays on the audit-clean build baseline',
    value: packageJson.devDependencies?.['electron-vite'],
    expected: '^5.0.0'
  },
  {
    label: 'Vite stays on the audit-clean build baseline',
    value: packageJson.devDependencies?.vite,
    expected: '^7.3.5'
  },
  {
    label: 'Vitest stays on the audit-clean test baseline',
    value: packageJson.devDependencies?.vitest,
    expected: '^4.1.8'
  },
  {
    label: 'React Vite plugin stays compatible with Vite 7',
    value: packageJson.devDependencies?.['@vitejs/plugin-react'],
    expected: '^5.2.0'
  },
  {
    label: 'SWC peer stays available for electron-vite',
    value: packageJson.devDependencies?.['@swc/core'],
    expected: '^1.15.41'
  }
]

const failures = checks.filter((check) => check.value !== check.expected)

if (failures.length > 0) {
  console.error('Runtime baseline check failed:')
  for (const failure of failures) {
    console.error(`- ${failure.label}: expected ${failure.expected}, found ${failure.value ?? 'missing'}`)
  }
  process.exit(1)
}

console.log('Runtime baseline OK')
