import { beforeEach, describe, expect, it } from 'vitest'
import { useFileStore } from './file-store'

function resetFileStore(): void {
  useFileStore.setState({
    openFiles: [],
    activeFilePath: null,
    activeFile: null,
    fileViewerVisible: false
  })
}

describe('file-store', () => {
  beforeEach(() => {
    resetFileStore()
  })

  it('hydrates persisted file tabs and restores the active file', () => {
    useFileStore.getState().hydrateFiles(
      [
        {
          path: '/repo/src/app.ts',
          name: 'app.ts',
          content: 'console.log("app")',
          truncated: false,
          tooLarge: false,
          size: 18
        },
        {
          path: '/repo/README.md',
          name: 'README.md',
          content: '# Readme',
          truncated: false,
          tooLarge: false,
          size: 8
        }
      ],
      '/repo/README.md',
      true
    )

    const state = useFileStore.getState()
    expect(state.openFiles.map((file) => file.path)).toEqual([
      '/repo/src/app.ts',
      '/repo/README.md'
    ])
    expect(state.activeFilePath).toBe('/repo/README.md')
    expect(state.activeFile?.name).toBe('README.md')
    expect(state.activeFile?.readAccess).toBe('permissive')
    expect(state.activeFile?.source).toBe('unknown')
    expect(state.fileViewerVisible).toBe(true)
  })

  it('clears all file tabs when switching to a project without persisted files', () => {
    useFileStore.getState().hydrateFiles(
      [
        {
          path: '/repo/src/app.ts',
          name: 'app.ts',
          content: 'console.log("app")',
          truncated: false,
          tooLarge: false,
          size: 18
        }
      ],
      '/repo/src/app.ts',
      true
    )

    useFileStore.getState().clearFiles()

    const state = useFileStore.getState()
    expect(state.openFiles).toEqual([])
    expect(state.activeFilePath).toBeNull()
    expect(state.activeFile).toBeNull()
    expect(state.fileViewerVisible).toBe(false)
  })

  it('marks external changes and clears them after refreshing from disk', () => {
    useFileStore.getState().hydrateFiles(
      [
        {
          path: '/repo/src/app.ts',
          name: 'app.ts',
          content: 'console.log("before")',
          truncated: false,
          tooLarge: false,
          size: 21,
          modifiedAt: 100
        }
      ],
      '/repo/src/app.ts',
      true
    )

    useFileStore.getState().markExternalFileChange('/repo/src/app.ts', 200, 22)

    let state = useFileStore.getState()
    expect(state.activeFile?.externalModified).toBe(true)
    expect(state.activeFile?.modifiedAt).toBe(200)

    useFileStore.getState().refreshFileFromDisk({
      path: '/repo/src/app.ts',
      name: 'app.ts',
      content: 'console.log("after")',
      truncated: false,
      tooLarge: false,
      size: 20,
      modifiedAt: 200
    })

    state = useFileStore.getState()
    expect(state.activeFile?.content).toBe('console.log("after")')
    expect(state.activeFile?.draftContent).toBe('console.log("after")')
    expect(state.activeFile?.externalModified).toBe(false)
    expect(state.activeFile?.dirty).toBe(false)
  })

  it('preserves scoped trust metadata across disk refreshes', () => {
    useFileStore.getState().hydrateFiles(
      [
        {
          path: '/repo/src/app.ts',
          name: 'app.ts',
          content: 'console.log("before")',
          truncated: false,
          tooLarge: false,
          size: 21,
          modifiedAt: 100,
          readAccess: 'scoped',
          source: 'project-browser'
        }
      ],
      '/repo/src/app.ts',
      true
    )

    useFileStore.getState().refreshFileFromDisk({
      path: '/repo/src/app.ts',
      name: 'app.ts',
      content: 'console.log("after")',
      truncated: false,
      tooLarge: false,
      size: 20,
      modifiedAt: 200
    })

    const state = useFileStore.getState()
    expect(state.activeFile?.content).toBe('console.log("after")')
    expect(state.activeFile?.readAccess).toBe('scoped')
    expect(state.activeFile?.source).toBe('project-browser')
  })
})
