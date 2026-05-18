import { AlertTriangle, Plus, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface MismatchInfo {
  /** The project name that owns the current terminal */
  terminalProjectName: string
  /** The project name the user is trying to run from */
  activeProjectName: string
}

interface ProjectMismatchWarningProps {
  mismatch: MismatchInfo
  /** User chose to run in the existing (foreign) terminal anyway */
  onRunAnyway: () => void
  /** User chose to open a new terminal for the active project */
  onNewTerminal: () => void
  onCancel: () => void
}

export function ProjectMismatchWarning({
  mismatch,
  onRunAnyway,
  onNewTerminal,
  onCancel
}: ProjectMismatchWarningProps): JSX.Element {
  const { t } = useTranslation('terminal')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-surface-border rounded-xl shadow-2xl shadow-black/40 w-full max-w-md mx-4 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-caution/10 shrink-0">
            <AlertTriangle size={18} className="text-caution" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">
              {t('mismatch.title')}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {t('mismatch.description', {
                terminalProjectName: mismatch.terminalProjectName,
                activeProjectName: mismatch.activeProjectName
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onNewTerminal}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            {t('mismatch.openNewTerminal', { projectName: mismatch.activeProjectName })}
          </button>
          <button
            onClick={onRunAnyway}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-surface-light border border-surface-border text-sm text-gray-300 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            <Play size={14} />
            {t('mismatch.runAnyway', { projectName: mismatch.terminalProjectName })}
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
