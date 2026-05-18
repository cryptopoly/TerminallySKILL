import { Component, useEffect, useState, type ReactNode } from 'react'
import { useCommandStore } from './store/command-store'
import { useProjectStore } from './store/project-store'
import { useScriptStore } from './store/script-store'
import { useSnippetStore } from './store/snippet-store'
import { useSettingsStore } from './store/settings-store'
import { AppShell } from './components/layout/AppShell'
import { initializeI18n, i18n } from './i18n'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }
  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#ff6b6b', background: '#1a1a2e', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ fontSize: 18, marginBottom: 16 }}>{i18n.t('states.reactRenderError')}</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#ccc' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#888', marginTop: 12 }}>{this.state.error.stack}</pre>
          <button
            style={{ marginTop: 16, padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            {i18n.t('states.tryAgain')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App(): JSX.Element {
  const setCommands = useCommandStore((s) => s.setCommands)
  const { setProjects, setActiveProject, setLoading } = useProjectStore()
  const setScripts = useScriptStore((s) => s.setScripts)
  const setSnippets = useSnippetStore((s) => s.setSnippets)
  const setSettings = useSettingsStore((s) => s.setSettings)
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      try {
        const settings = await window.electronAPI.getSettings()
        if (cancelled) return

        await initializeI18n(settings)
        if (cancelled) return

        setSettings(settings)

        const [commands, scripts, snippets, projectsData] = await Promise.all([
          window.electronAPI.loadAllCommands(),
          window.electronAPI.getAllScripts(),
          window.electronAPI.getAllSnippets(),
          window.electronAPI.getAllProjects()
        ])

        if (cancelled) return

        setCommands(commands)
        setScripts(scripts)
        setSnippets(snippets)
        setProjects(projectsData.projects)
        // If opened with a projectId query param, use that; otherwise fall back to persisted active
        const params = new URLSearchParams(window.location.search)
        const requestedProjectId = params.get('projectId') ?? projectsData.activeProjectId
        const active = projectsData.projects.find((p) => p.id === requestedProjectId) ?? null
        setActiveProject(active)
        setLoading(false)
        setReady(true)
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : String(error))
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [setCommands, setProjects, setActiveProject, setLoading, setScripts, setSnippets, setSettings])

  if (bootError) {
    return (
      <ErrorBoundary>
        <div className="flex h-screen items-center justify-center bg-surface text-gray-300">
          <div className="max-w-md rounded-xl border border-destructive/30 bg-surface-light p-5">
            <div className="text-sm font-semibold text-destructive">{i18n.t('states.startupFailed')}</div>
            <div className="mt-2 text-xs leading-5 text-gray-500">{bootError}</div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface text-sm text-gray-500">
        {i18n.isInitialized ? i18n.t('states.loading') : 'Loading TerminallySKILL...'}
      </div>
    )
  }

  return <ErrorBoundary><AppShell /></ErrorBoundary>
}
