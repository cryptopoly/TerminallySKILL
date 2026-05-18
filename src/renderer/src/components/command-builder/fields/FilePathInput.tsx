import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CommandOption } from '../../../../../shared/command-schema'
import { OptionInfoIcon } from '../../ui/OptionInfoIcon'

interface FilePathInputProps {
  option: CommandOption
  value: string
  onChange: (value: string) => void
}

export function FilePathInput({ option, value, onChange }: FilePathInputProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const flag = option.short || option.long || ''
  const isDir = option.type === 'directory-path'

  const browse = async (): Promise<void> => {
    const result = isDir
      ? await window.electronAPI.openDirectoryDialog()
      : await window.electronAPI.openFileDialog()
    if (result) onChange(result)
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-gray-200">{option.label}</label>
        <code className="text-xs text-gray-500 font-mono">{flag}</code>
        <OptionInfoIcon option={option} />
      </div>
      <div className="flex items-center gap-2 max-w-md">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isDir ? '/path/to/directory' : '/path/to/file'}
          className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
        />
        <button
          onClick={browse}
          className="p-2 rounded-lg bg-surface border border-surface-border hover:border-accent/30 text-gray-400 hover:text-accent-light transition-colors"
          title={isDir ? t('fields.browseDirectory') : t('fields.browseFile')}
        >
          <FolderOpen size={16} />
        </button>
      </div>
      {option.description && (
        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
      )}
    </div>
  )
}
