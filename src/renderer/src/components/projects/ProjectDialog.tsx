import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FolderOpen, Trash2, Sparkles, Loader2, CheckCircle2, XCircle, Info, FolderTree } from 'lucide-react'
import { useProjectStore } from '../../store/project-store'
import { useCommandStore } from '../../store/command-store'
import { useScriptStore } from '../../store/script-store'
import { useSnippetStore } from '../../store/snippet-store'
import { useSettingsStore } from '../../store/settings-store'
import {
  createLocalWorkspaceTarget,
  createSSHWorkspaceTarget,
  getProjectWorkspaceTargetConnectionLabel,
  getProjectWorkspaceTargetDisplayName,
  getProjectWorkspaceTargetLabel,
  isSSHProjectWorkspaceTarget,
  PROJECT_COLORS,
  resolveProjectWorkingDirectory
} from '../../../../shared/project-schema'
import type {
  Project,
  EnvVar,
  ProjectLogPreference,
  WorkspaceTargetConnectionResult
} from '../../../../shared/project-schema'
import {
  EMPTY_STARTER_PACK_PREVIEW,
  type StarterPackPreview
} from '../../../../shared/starter-pack-schema'
import { EnvEditor } from './EnvEditor'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Tooltip } from '../ui/Tooltip'

interface ProjectDialogProps {
  project?: Project | null // null = create mode, project = edit mode
  onClose: () => void
}

export function ProjectDialog({ project, onClose }: ProjectDialogProps): JSX.Element {
  const isEdit = !!project
  const { t } = useTranslation('projects')
  const allProjects = useProjectStore((s) => s.projects)
  const settings = useSettingsStore((s) => s.settings)

  // Colors already taken by other projects (exclude the one being edited)
  const takenColors = new Set(
    allProjects
      .filter((p) => p.id !== project?.id)
      .map((p) => p.color)
  )

  // Default to first available color for new projects
  const defaultColor = project?.color ?? PROJECT_COLORS.find((c) => !takenColors.has(c)) ?? PROJECT_COLORS[0]

  // Parse group / name from existing project name using the ' / ' convention
  const parsedGroup = project?.name.includes(' / ') ? project.name.split(' / ')[0].trim() : ''
  const parsedProjectName = project?.name.includes(' / ') ? project.name.split(' / ').slice(1).join(' / ').trim() : (project?.name ?? '')

  const [group, setGroup] = useState(parsedGroup)
  const [projectName, setProjectName] = useState(parsedProjectName)

  // Derive the full combined name (used for save)
  const name = group.trim() ? `${group.trim()} / ${projectName}` : projectName

  // Collect existing group names from all projects for the datalist suggestions
  const existingGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const p of allProjects) {
      if (p.id === project?.id) continue
      if (p.name.includes(' / ')) groups.add(p.name.split(' / ')[0].trim())
    }
    return [...groups].sort()
  }, [allProjects, project?.id])
  const [dir, setDir] = useState(project ? resolveProjectWorkingDirectory(project) : '')
  const [targetType, setTargetType] = useState<'local' | 'ssh'>(project?.workspaceTarget?.type ?? 'local')
  const [sshHost, setSSHHost] = useState(
    project && isSSHProjectWorkspaceTarget(project.workspaceTarget) ? project.workspaceTarget.host : ''
  )
  const [sshUser, setSSHUser] = useState(
    project && isSSHProjectWorkspaceTarget(project.workspaceTarget) ? project.workspaceTarget.user : ''
  )
  const [sshPort, setSSHPort] = useState(
    project && isSSHProjectWorkspaceTarget(project.workspaceTarget) && project.workspaceTarget.port
      ? String(project.workspaceTarget.port)
      : ''
  )
  const [sshLabel, setSSHLabel] = useState(
    project && isSSHProjectWorkspaceTarget(project.workspaceTarget) && project.workspaceTarget.label
      ? project.workspaceTarget.label
      : ''
  )
  const [sshIdentityFile, setSSHIdentityFile] = useState(
    project && isSSHProjectWorkspaceTarget(project.workspaceTarget) && project.workspaceTarget.identityFile
      ? project.workspaceTarget.identityFile
      : project ? '' : '~/.ssh/id_ed25519'
  )
  const [sshVncPort, setSSHVncPort] = useState(
    project && isSSHProjectWorkspaceTarget(project.workspaceTarget) && project.workspaceTarget.vncPort
      ? String(project.workspaceTarget.vncPort)
      : ''
  )
  const [color, setColor] = useState(defaultColor)
  const [envVars, setEnvVars] = useState<EnvVar[]>(project?.envVars ?? [])
  const [logPreference, setLogPreference] = useState<ProjectLogPreference>(project?.logPreference ?? 'inherit')
  const [recentCommandsCount, setRecentCommandsCount] = useState(project?.recentCommands?.length ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [dupWarningAcknowledged, setDupWarningAcknowledged] = useState(false)
  const [starterPack, setStarterPack] = useState<StarterPackPreview>(EMPTY_STARTER_PACK_PREVIEW)
  const [starterPackLoading, setStarterPackLoading] = useState(false)
  const [includeStarterPack, setIncludeStarterPack] = useState(true)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false)
  const [sshTesting, setSSHTesting] = useState(false)
  const [sshTestResult, setSSHTestResult] = useState<WorkspaceTargetConnectionResult | null>(null)

  const { setProjects, setActiveProject, updateProjectInStore, removeProjectFromStore } =
    useProjectStore()
  const saveTerminalLogs = settings.saveTerminalLogs
  const setScripts = useScriptStore((s) => s.setScripts)
  const setActiveScript = useScriptStore((s) => s.setActiveScript)
  const setSnippets = useSnippetStore((s) => s.setSnippets)
  const setActiveSnippet = useSnippetStore((s) => s.setActiveSnippet)
  const setActiveCommand = useCommandStore((s) => s.setActiveCommand)
  const parsedSSHPort = sshPort.trim() ? Number(sshPort.trim()) : null
  const sshPortIsValid = !sshPort.trim() || (Number.isInteger(parsedSSHPort) && parsedSSHPort > 0)
  const parsedVncPort = sshVncPort.trim() ? Number(sshVncPort.trim()) : null
  const vncPortIsValid = !sshVncPort.trim() || (Number.isInteger(parsedVncPort) && parsedVncPort > 0 && parsedVncPort <= 65535)
  const workspaceTarget = targetType === 'ssh'
    ? createSSHWorkspaceTarget(
        sshHost.trim(),
        sshUser.trim(),
        dir.trim(),
        sshPortIsValid ? parsedSSHPort : null,
        sshIdentityFile.trim() || null,
        sshLabel.trim() || null,
        vncPortIsValid ? parsedVncPort : null
      )
    : createLocalWorkspaceTarget(dir.trim())
  const workingDirectory = dir.trim()
  const effectiveLogSaving = logPreference === 'enabled' || (logPreference === 'inherit' && saveTerminalLogs)
  const effectiveLogDescription =
    logPreference === 'enabled'
      ? t('dialog.logEffective.enabled')
      : logPreference === 'disabled'
        ? t('dialog.logEffective.disabled')
        : saveTerminalLogs
          ? t('dialog.logEffective.inheritedOn')
          : t('dialog.logEffective.inheritedOff')

  useEffect(() => {
    setDupWarningAcknowledged(false)
    setError(null)
  }, [dir])

  useEffect(() => {
    if (isEdit || targetType !== 'local' || !dir.trim()) {
      setStarterPack(EMPTY_STARTER_PACK_PREVIEW)
      setStarterPackLoading(false)
      return
    }

    let cancelled = false
    setStarterPackLoading(true)

    void window.electronAPI
      .detectStarterPack(dir.trim())
      .then((preview) => {
        if (!cancelled) setStarterPack(preview)
      })
      .catch(() => {
        if (!cancelled) setStarterPack(EMPTY_STARTER_PACK_PREVIEW)
      })
      .finally(() => {
        if (!cancelled) setStarterPackLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dir, isEdit, targetType])

  useEffect(() => {
    setSSHTesting(false)
    setSSHTestResult(null)
  }, [targetType, sshHost, sshUser, sshPort, sshIdentityFile, sshLabel, sshVncPort, dir])

  const handleBrowse = async (): Promise<void> => {
    if (targetType !== 'local') return
    const result = await window.electronAPI.openDirectoryDialog()
    if (result) {
      setDir(result)
      // Auto-fill name from directory if empty
      if (!projectName) {
        const folderName = result.split('/').pop() || result.split('\\').pop() || ''
        setProjectName(folderName)
      }
    }
  }

  const handleBrowseIdentityFile = async (): Promise<void> => {
    const result = await window.electronAPI.openFileDialog()
    if (result) {
      setSSHIdentityFile(result)
      setError(null)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      setError(t('dialog.errors.nameRequired'))
      return
    }
    if (targetType === 'local' && !workingDirectory) {
      setError(t('dialog.errors.workingDirectoryRequired'))
      return
    }
    if (targetType === 'ssh' && !sshHost.trim()) {
      setError(t('dialog.errors.sshHostRequired'))
      return
    }
    if (targetType === 'ssh' && sshPort.trim()) {
      if (!sshPortIsValid) {
        setError(t('dialog.errors.sshPortInvalid'))
        return
      }
    }
    if (targetType === 'ssh' && sshVncPort.trim()) {
      if (!vncPortIsValid) {
        setError(t('dialog.errors.vncPortInvalid'))
        return
      }
    }

    // Warn about duplicate working directory (but allow proceeding)
    if (!isEdit && !dupWarningAcknowledged) {
      const existingProject = allProjects.find(
        (p) => resolveProjectWorkingDirectory(p).toLowerCase() === workingDirectory.toLowerCase()
      )
      if (existingProject) {
        setError(t('dialog.errors.duplicateDirectory', { name: existingProject.name }))
        setDupWarningAcknowledged(true)
        return
      }
    }

    if (isEdit && project) {
      const updated = await window.electronAPI.updateProject(project.id, {
        name: name.trim(),
        workingDirectory,
        workspaceTarget,
        color,
        envVars: envVars.filter((v) => v.key.trim()),
        logPreference
      })
      if (updated) {
        updateProjectInStore(updated)
      }
      onClose()
      return
    }

    const starterPackAvailable = starterPack.detections.length > 0 || starterPack.categories.length > 0 || starterPack.scripts.length > 0 || starterPack.snippets.length > 0
    const newProject = await window.electronAPI.createProject(
      name.trim(),
      workingDirectory,
      color,
      workspaceTarget,
      logPreference,
      starterPackAvailable && !includeStarterPack
    )
    const [data, scripts, snippets] = await Promise.all([
      window.electronAPI.getAllProjects(),
      window.electronAPI.getAllScripts(),
      window.electronAPI.getAllSnippets()
    ])
    setProjects(data.projects)
    setScripts(scripts)
    setSnippets(snippets)
    setActiveProject(newProject)

    const starterPackState = newProject.starterPack
    const firstStarterScript = starterPackState?.scriptIds?.length
      ? scripts.find((script) => script.id === starterPackState?.scriptIds[0]) ?? null
      : null
    const firstStarterSnippet = !firstStarterScript && starterPackState?.snippetIds?.length
      ? snippets.find((snippet) => snippet.id === starterPackState?.snippetIds[0]) ?? null
      : null
    const firstStarterCommand =
      !firstStarterScript && !firstStarterSnippet && starterPackState?.categoryIds?.length
        ? useCommandStore
            .getState()
            .commands.find((command) => starterPackState?.categoryIds.includes(command.category)) ?? null
        : null

    setActiveScript(firstStarterScript)
    setActiveSnippet(firstStarterSnippet)
    setActiveCommand(firstStarterCommand)
    onClose()
  }

  const handleTestSSH = async (): Promise<void> => {
    if (targetType !== 'ssh') return
    if (!sshHost.trim()) return

    setSSHTesting(true)
    try {
      const result = await window.electronAPI.testWorkspaceTarget(workspaceTarget)
      setSSHTestResult(result)
    } finally {
      setSSHTesting(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!project) return
    await window.electronAPI.deleteProject(project.id)
    removeProjectFromStore(project.id)
    onClose()
  }

  const handleOpenLogsFolder = async (): Promise<void> => {
    if (!project) return
    const logBasePath = await window.electronAPI.getLogBasePath(project.id)
    await window.electronAPI.openInExplorer(logBasePath)
  }

  const handleClearRecentCommands = async (): Promise<void> => {
    if (!project) return
    const updated = await window.electronAPI.updateProject(project.id, { recentCommands: [] })
    if (updated) {
      updateProjectInStore(updated)
      setRecentCommandsCount(0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-surface-light border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-gray-200">
            {isEdit ? t('dialog.titleEdit') : t('dialog.titleNew')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-lighter text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Project name + group */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.projectName')}</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value)
                  setError(null)
                }}
                placeholder={t('dialog.projectNamePlaceholder')}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1.5">
                <FolderTree size={13} className="text-gray-500" />
                {t('dialog.group')} <span className="text-gray-500 font-normal">({t('dialog.optional')})</span>
              </label>
              <input
                type="text"
                list="project-groups-datalist"
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value)
                  setError(null)
                }}
                placeholder={t('dialog.groupPlaceholder')}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              <datalist id="project-groups-datalist">
                {existingGroups.map((g) => <option key={g} value={g} />)}
              </datalist>
              {group.trim() && (
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {t('dialog.willAppearAs', { name: '' })}<span className="text-gray-400 font-mono">{group.trim()} / {projectName || '...'}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.workspaceTarget')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['local', 'ssh'] as const).map((value) => {
                const selected = targetType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTargetType(value)
                      setError(null)
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-accent/40 bg-accent/10 text-accent-light'
                        : 'border-surface-border bg-surface text-gray-400 hover:border-accent/20 hover:text-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {value === 'local' ? t('dialog.localWorkspace') : t('dialog.sshWorkspace')}
                    </div>
                    <div className="text-xs mt-1 text-inherit/80">
                      {value === 'local'
                        ? t('dialog.localWorkspaceDescription')
                        : t('dialog.sshWorkspaceDescription')}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {targetType === 'local' ? (
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.workingDirectory')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dir}
                  onChange={(e) => {
                    setDir(e.target.value)
                    setError(null)
                  }}
                  placeholder={t('dialog.workingDirectoryPlaceholder')}
                  className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                />
                <button
                  onClick={handleBrowse}
                  className="px-3 py-2.5 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
                  title={t('common:actions.browse')}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {t('dialog.workingDirectoryDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.connectionLabel')}</label>
                <input
                  type="text"
                  value={sshLabel}
                  onChange={(e) => {
                    setSSHLabel(e.target.value)
                    setError(null)
                  }}
                  placeholder={t('dialog.connectionLabelPlaceholder')}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  {t('dialog.connectionLabelDescription')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.host')}</label>
                  <input
                    type="text"
                    value={sshHost}
                    onChange={(e) => {
                      setSSHHost(e.target.value)
                      setError(null)
                    }}
                    placeholder="prod.example.com"
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.user')}</label>
                  <input
                    type="text"
                    value={sshUser}
                    onChange={(e) => {
                      setSSHUser(e.target.value)
                      setError(null)
                    }}
                    placeholder="deploy"
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.remoteWorkingDirectory')} <span className="text-gray-500 font-normal">({t('dialog.optional')})</span></label>
                  <input
                    type="text"
                    value={dir}
                    onChange={(e) => {
                      setDir(e.target.value)
                      setError(null)
                    }}
                    placeholder="/srv/app"
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.sshPort')}</label>
                  <input
                    type="text"
                    value={sshPort}
                    onChange={(e) => {
                      setSSHPort(e.target.value)
                      setError(null)
                    }}
                    placeholder="22"
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 items-end">
                <div />
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.vncPort')}</label>
                  <input
                    type="text"
                    value={sshVncPort}
                    onChange={(e) => {
                      setSSHVncPort(e.target.value)
                      setError(null)
                    }}
                    placeholder="5901"
                    className={`w-full bg-surface border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono ${!vncPortIsValid ? 'border-destructive/50' : 'border-surface-border'}`}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-gray-300 mb-1.5">
                  {t('dialog.identityFile')}
                  <Tooltip
                    content={
                      <div className="space-y-2">
                        <p className="text-gray-400">{t('dialog.identityTooltipGenerate')}</p>
                        <pre className="text-gray-200 font-mono text-[11px] whitespace-pre-wrap">{`ssh-keygen -t ed25519 -C "your-email@example.com"`}</pre>
                        <p className="text-gray-400">{t('dialog.identityTooltipDefaults')}</p>
                        <p className="text-gray-400 mt-2">{t('dialog.identityTooltipCopy')}</p>
                        <pre className="text-gray-200 font-mono text-[11px] whitespace-pre-wrap">{`ssh-copy-id user@your-vps-ip`}</pre>
                        <p className="text-gray-400">{t('dialog.identityTooltipPassword')}</p>
                      </div>
                    }
                  >
                    <Info size={13} className="text-gray-500 hover:text-gray-300 cursor-help transition-colors" />
                  </Tooltip>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sshIdentityFile}
                    onChange={(e) => {
                      setSSHIdentityFile(e.target.value)
                      setError(null)
                    }}
                    placeholder="~/.ssh/id_ed25519"
                    className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseIdentityFile}
                    className="px-3 py-2.5 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
                    title={t('dialog.browseIdentityFile')}
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {t('dialog.identityFileDescription')}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                {t('dialog.sshFileBrowsingLocalOnly')}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleTestSSH()}
                  disabled={!sshHost.trim() || sshTesting || !sshPortIsValid}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-surface-border text-sm text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sshTesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {t('dialog.testSSH')}
                </button>
                <span className="text-xs text-gray-500">
                  {t('dialog.testSSHDescription')}
                </span>
              </div>

              {sshTestResult && (
                <div
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    sshTestResult.ok
                      ? 'border-safe/30 bg-safe/10 text-safe'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  {sshTestResult.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}
                  <span className="leading-6">{sshTestResult.message}</span>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-surface-border bg-surface px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">{t('dialog.resolvedTarget')}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-md bg-accent/10 text-xs text-accent-light border border-accent/20">
                {project && targetType === project.workspaceTarget.type
                    ? getProjectWorkspaceTargetLabel(project)
                  : targetType === 'local'
                    ? t('dialog.localWorkspace')
                    : t('dialog.sshWorkspace')}
              </span>
              {targetType === 'ssh' && sshHost.trim() && sshLabel.trim() && (
                <span className="px-2 py-1 rounded-md bg-surface-light text-xs text-gray-300 border border-surface-border">
                  {getProjectWorkspaceTargetDisplayName({ workspaceTarget })}
                </span>
              )}
              {targetType === 'ssh' && sshHost.trim() && (
                <span className="px-2 py-1 rounded-md bg-surface-light text-xs text-gray-300 border border-surface-border font-mono">
                  {getProjectWorkspaceTargetConnectionLabel({ workspaceTarget })}
                </span>
              )}
              {dir.trim() && (
                <span className="text-xs text-gray-500 font-mono truncate">
                  {dir.trim()}
                </span>
              )}
            </div>
          </div>

          {!isEdit && (
            <div className="rounded-xl border border-surface-border bg-surface px-4 py-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStarterPack}
                  onChange={(e) => setIncludeStarterPack(e.target.checked)}
                  className="rounded border-surface-border bg-surface mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-accent-light shrink-0" />
                    <span className="text-sm font-medium text-gray-200">{t('dialog.includeStarterPack')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('dialog.includeStarterPackDescription')}
                  </p>
                </div>
              </label>

              {includeStarterPack && targetType === 'local' && dir.trim() && (
                <div className="mt-3 pl-7">
                  {starterPackLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 size={12} className="animate-spin" />
                      {t('dialog.scanningRepo')}
                    </div>
                  ) : starterPack.detections.length === 0 &&
                      starterPack.categories.length === 0 &&
                      starterPack.scripts.length === 0 &&
                      starterPack.snippets.length === 0 ? (
                    <p className="text-xs text-gray-500">{t('dialog.noRepoSignals')}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {starterPack.detections.map((detection) => (
                          <span
                            key={detection}
                            className="px-2 py-0.5 rounded-md bg-accent/10 text-[11px] text-accent-light border border-accent/20"
                          >
                            {detection}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                        {starterPack.categories.length > 0 && (
                          <span>{t('dialog.commandGroup', { count: starterPack.categories.length })}</span>
                        )}
                        {starterPack.scripts.length > 0 && (
                          <span>{t('dialog.script', { count: starterPack.scripts.length })}</span>
                        )}
                        {starterPack.snippets.length > 0 && (
                          <span>{t('dialog.snippet', { count: starterPack.snippets.length })}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Color picker */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">{t('dialog.color')}</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => {
                const isTaken = takenColors.has(c)
                const isSelected = color === c

                return (
                  <button
                    key={c}
                    onClick={() => !isTaken && setColor(c)}
                    disabled={isTaken}
                    className="w-7 h-7 rounded-full transition-transform relative"
                    style={{
                      backgroundColor: c,
                      opacity: isTaken ? 0.2 : 1,
                      cursor: isTaken ? 'not-allowed' : 'pointer',
                      boxShadow: isSelected ? `0 0 0 2px #1a1a2e, 0 0 0 4px ${c}` : 'none',
                      transform: !isTaken ? undefined : 'none'
                    }}
                    title={isTaken ? t('dialog.colorTaken') : undefined}
                  />
                )
              })}
            </div>
            {takenColors.size > 0 && (
              <p className="text-xs text-gray-600 mt-1.5">{t('dialog.dimmedColors')}</p>
            )}
          </div>

          {/* Environment variables */}
          <EnvEditor envVars={envVars} onChange={setEnvVars} />

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">{t('dialog.projectLogs')}</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'inherit', label: t('dialog.logOptions.inherit.label'), desc: t('dialog.logOptions.inherit.description') },
                { id: 'enabled', label: t('dialog.logOptions.enabled.label'), desc: t('dialog.logOptions.enabled.description') },
                { id: 'disabled', label: t('dialog.logOptions.disabled.label'), desc: t('dialog.logOptions.disabled.description') }
              ] as const).map((option) => {
                const selected = logPreference === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLogPreference(option.id)}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected
                        ? 'border-accent/40 bg-accent/10 text-accent-light'
                        : 'border-surface-border bg-surface text-gray-400 hover:border-accent/20 hover:text-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs mt-1 text-inherit/80 leading-4">{option.desc}</div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              {t('dialog.logFolderDescription')}
            </p>
            <p className={`text-[11px] mt-1 ${effectiveLogSaving ? 'text-accent-light' : 'text-gray-500'}`}>
              {effectiveLogDescription}
            </p>
            {isEdit && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleOpenLogsFolder()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
                >
                  <FolderOpen size={12} />
                  {t('dialog.openLogsFolder')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearRecentCommands()}
                  disabled={recentCommandsCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-2.5 py-1.5 text-xs text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={12} />
                  {t('dialog.clearRecentCommands')}
                </button>
                <span className="text-[11px] text-gray-500">
                  {t('dialog.recentCommand', { count: recentCommandsCount })}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
          <div>
            {isEdit && (
              <button
                onClick={() => setConfirmDeleteProject(true)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-destructive transition-colors"
              >
                <Trash2 size={14} />
                {t('dialog.deleteProject')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors"
            >
              {isEdit ? t('dialog.saveChanges') : t('dialog.createProject')}
            </button>
          </div>
        </div>
      </div>
      {confirmDeleteProject && project && (
        <ConfirmDialog
          title={t('dialog.deleteProject')}
          message={t('dialog.deleteMessage', { name: project.name })}
          confirmLabel={t('dialog.deleteProject')}
          onConfirm={() => {
            setConfirmDeleteProject(false)
            void handleDelete()
          }}
          onCancel={() => setConfirmDeleteProject(false)}
        />
      )}
    </div>
  )
}
