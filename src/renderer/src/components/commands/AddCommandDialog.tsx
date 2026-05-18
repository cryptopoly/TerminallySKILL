import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Terminal, Loader2, Search, MapPin, Wrench, Download, CheckCircle2 } from 'lucide-react'
import type { InstallableCommandMatch } from '../../../../shared/cli-install-catalog'

interface AddCommandDialogProps {
  onAdd: (executable: string) => Promise<void> | void
  onInstallCommand: (commandString: string) => Promise<void> | void
  onClose: () => void
}

function formatAliases(match: InstallableCommandMatch): string | null {
  if (match.aliases.length === 0) return null
  return match.aliases.join(', ')
}

export function AddCommandDialog({ onAdd, onInstallCommand, onClose }: AddCommandDialogProps): JSX.Element {
  const { t } = useTranslation('commands')
  const [executable, setExecutable] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // PATH fix state
  const [searching, setSearching] = useState(false)
  const [foundPath, setFoundPath] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState<{ success: boolean; configFile: string } | null>(null)
  const [installableMatches, setInstallableMatches] = useState<InstallableCommandMatch[]>([])
  const [installingCommand, setInstallingCommand] = useState<string | null>(null)

  const normalizedExecutable = executable.trim()
  const exactInstallMatch = useMemo(
    () =>
      installableMatches.find(
        (match) =>
          match.executable.toLowerCase() === normalizedExecutable.toLowerCase() ||
          match.aliases.some((alias) => alias.toLowerCase() === normalizedExecutable.toLowerCase())
      ) ?? null,
    [installableMatches, normalizedExecutable]
  )

  const handleSubmit = async (): Promise<void> => {
    if (!executable.trim()) return
    setAdding(true)
    setError(null)
    setInfo(null)
    try {
      await onAdd(executable.trim())
    } catch (err) {
      setError(t('addDialog.errors.addFailed'))
      console.error('Failed to add command:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleSearch = async (): Promise<void> => {
    if (!executable.trim()) return
    setSearching(true)
    setFoundPath(null)
    setNotFound(false)
    setFixResult(null)
    setError(null)
    setInfo(null)
    try {
      const [path, matches] = await Promise.all([
        window.electronAPI.findCommand(executable.trim()),
        window.electronAPI.searchInstallableCommands(executable.trim(), 10)
      ])

      setInstallableMatches(matches)
      if (path) {
        setFoundPath(path)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setSearching(false)
    }
  }

  const handleFixPath = async (): Promise<void> => {
    if (!foundPath) return
    setFixing(true)
    try {
      const dir = foundPath.substring(0, foundPath.lastIndexOf('/'))
      const result = await window.electronAPI.fixPath(dir)
      setFixResult(result)
    } catch {
      setFixResult({ success: false, configFile: '' })
    } finally {
      setFixing(false)
    }
  }

  const handleAddInstallMatch = async (match: InstallableCommandMatch): Promise<void> => {
    setAdding(true)
    setError(null)
    setInfo(null)
    try {
      await onAdd(match.executable)
      setInfo(t('addDialog.info.added', { executable: match.executable }))
    } catch (err) {
      setError(t('addDialog.errors.addExecutableFailed', { executable: match.executable }))
      console.error('Failed to add install match:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleInstall = async (match: InstallableCommandMatch): Promise<void> => {
    const recipe = match.recipes[0]
    if (!recipe) return

    setInstallingCommand(match.executable)
    setError(null)
    setInfo(null)
    try {
      await onInstallCommand(recipe.command)
      setInfo(t('addDialog.info.installQueued', { label: recipe.label, executable: match.executable }))
    } catch (err) {
      setError(t('addDialog.errors.installTerminalFailed', { executable: match.executable }))
      console.error('Failed to queue install command:', err)
    } finally {
      setInstallingCommand(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-accent-light" />
            <h2 className="text-lg font-semibold text-gray-200">{t('addDialog.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              {t('addDialog.commandLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={executable}
                onChange={(e) => {
                  setExecutable(e.target.value)
                  setFoundPath(null)
                  setNotFound(false)
                  setFixResult(null)
                  setInstallableMatches([])
                  setError(null)
                  setInfo(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSearch()
                  if (e.key === 'Escape') onClose()
                }}
                placeholder={t('addDialog.commandPlaceholder')}
                className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={!executable.trim() || searching}
                className="px-3 py-2 rounded-lg border border-surface-border text-gray-400 hover:text-accent-light hover:border-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title={t('addDialog.searchSystem')}
              >
                {searching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Search result / PATH fix */}
          {foundPath && (
            <div className="rounded-lg border border-safe/20 bg-safe/5 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-safe shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="text-safe font-medium">{t('addDialog.found')}</p>
                  <p className="text-gray-400 font-mono mt-0.5 break-all">{foundPath}</p>
                </div>
              </div>
              {!fixResult && (
                <button
                  onClick={handleFixPath}
                  disabled={fixing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/10 text-accent-light text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                  {fixing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {t('addDialog.fixingPath')}
                    </>
                  ) : (
                    <>
                      <Wrench size={12} />
                      {t('addDialog.fixPath')}
                    </>
                  )}
                </button>
              )}
              {fixResult?.success && (
                <div className="text-xs text-safe">
                  {t('addDialog.fixPathSuccess', { configFile: fixResult.configFile })}
                </div>
              )}
              {fixResult && !fixResult.success && (
                <div className="text-xs text-destructive">
                  {t('addDialog.fixPathFailure')}
                </div>
              )}
            </div>
          )}

          {notFound && (
            <div className="rounded-lg border border-caution/20 bg-caution/5 p-3">
              <p className="text-xs text-caution">
                {t('addDialog.notFound')}
              </p>
            </div>
          )}

          {installableMatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-gray-500">
                  {t('addDialog.installableMatches')}
                </p>
                <p className="text-xs text-gray-600">
                  {t('addDialog.installCatalogSource')}
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {installableMatches.map((match) => {
                  const aliasLabel = formatAliases(match)
                  const primaryRecipe = match.recipes[0] ?? null

                  return (
                    <div
                      key={match.executable}
                      className="rounded-xl border border-surface-border bg-surface p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-gray-100">{match.executable}</span>
                            <span className="text-xs text-gray-500">{match.title}</span>
                            {match.installed ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-safe/30 bg-safe/10 px-2 py-0.5 text-[11px] font-medium text-safe">
                                <CheckCircle2 size={11} />
                                {t('addDialog.installed')}
                              </span>
                            ) : primaryRecipe ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-light">
                                <Download size={11} />
                                {primaryRecipe.label}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-gray-400">{match.description}</p>
                          {aliasLabel && (
                            <p className="text-xs text-gray-600">
                              {t('addDialog.alsoKnownAs', { aliases: aliasLabel })}
                            </p>
                          )}
                          {match.resolvedPath && (
                            <p className="text-xs text-gray-500 font-mono break-all">{match.resolvedPath}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {match.installed ? (
                            <button
                              onClick={() => void handleAddInstallMatch(match)}
                              disabled={adding}
                              className="inline-flex items-center gap-2 rounded-lg border border-safe/20 bg-safe/10 px-3 py-2 text-xs font-medium text-safe hover:bg-safe/15 transition-colors disabled:opacity-50"
                            >
                              {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                              {t('addDialog.addCommand')}
                            </button>
                          ) : primaryRecipe ? (
                            <button
                              onClick={() => void handleInstall(match)}
                              disabled={installingCommand === match.executable}
                              className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-light hover:bg-accent/20 transition-colors disabled:opacity-50"
                            >
                              {installingCommand === match.executable ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Terminal size={12} />
                              )}
                              {t('addDialog.installInTerminal')}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {primaryRecipe && (
                        <div className="rounded-lg border border-surface-border bg-surface-light/70 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mb-1">
                            {t('addDialog.suggestedInstallCommand')}
                          </p>
                          <p className="font-mono text-xs text-gray-300 break-all">{primaryRecipe.command}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-600">
            {t('addDialog.footer')}
          </p>

          {info && <p className="text-xs text-safe">{info}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!executable.trim() || adding}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              exactInstallMatch?.installed
                ? t('addDialog.addSpecific', { executable: exactInstallMatch.executable })
                : t('addDialog.addManualPlaceholder')
            }
          >
            {adding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {t('addDialog.addCommand')}
          </button>
        </div>
      </div>
    </div>
  )
}
