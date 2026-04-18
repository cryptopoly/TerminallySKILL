import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import type { EnvVar } from '../../../../shared/project-schema'

interface EnvEditorProps {
  envVars: EnvVar[]
  onChange: (envVars: EnvVar[]) => void
}

/** Parse a .env file string into EnvVar entries */
function parseDotEnv(content: string): EnvVar[] {
  const vars: EnvVar[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    vars.push({ key, value, enabled: true })
  }
  return vars
}

export function EnvEditor({ envVars, onChange }: EnvEditorProps): JSX.Element {
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addVar = (): void => {
    onChange([...envVars, { key: '', value: '', enabled: true }])
  }

  const updateVar = (index: number, field: keyof EnvVar, val: string | boolean): void => {
    const updated = envVars.map((v, i) =>
      i === index ? { ...v, [field]: val } : v
    )
    onChange(updated)
  }

  const removeVar = (index: number): void => {
    onChange(envVars.filter((_, i) => i !== index))
  }

  const toggleVar = (index: number): void => {
    updateVar(index, 'enabled', !envVars[index].enabled)
  }

  const handleImportFile = async (): Promise<void> => {
    setImportError(null)
    const filePath = await window.electronAPI.openFileDialog()
    if (!filePath) return

    try {
      const result = await window.electronAPI.readScopedFileContent(filePath)
      if ('error' in result) {
        setImportError(result.error)
        return
      }
      if ('tooLarge' in result) {
        setImportError('File is too large to import')
        return
      }
      const parsed = parseDotEnv(result.content)
      if (parsed.length === 0) {
        setImportError('No valid KEY=VALUE entries found')
        return
      }
      // Merge: update existing keys, add new ones
      const merged = [...envVars]
      for (const newVar of parsed) {
        const existing = merged.findIndex((v) => v.key === newVar.key)
        if (existing >= 0) {
          merged[existing] = { ...merged[existing], value: newVar.value }
        } else {
          merged.push(newVar)
        }
      }
      onChange(merged)
    } catch {
      setImportError('Failed to read file')
    }
  }

  const enabledCount = envVars.filter((v) => v.enabled && v.key.trim()).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm text-gray-300">
          Environment Variables
          {enabledCount > 0 && (
            <span className="ml-1.5 text-xs text-accent">({enabledCount} active)</span>
          )}
        </label>
        <button
          onClick={handleImportFile}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent-light transition-colors"
          title="Import from .env file"
        >
          <Upload size={12} />
          Import .env
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".env,.env.*"
        className="hidden"
      />

      {envVars.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {envVars.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 group"
            >
              {/* Toggle */}
              <button
                onClick={() => toggleVar(i)}
                className={`shrink-0 transition-colors ${
                  v.enabled ? 'text-safe' : 'text-gray-600'
                }`}
                title={v.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
              >
                {v.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>

              {/* Key */}
              <input
                type="text"
                value={v.key}
                onChange={(e) => updateVar(i, 'key', e.target.value.replace(/\s/g, '_').toUpperCase())}
                placeholder="KEY"
                className={`w-[120px] bg-surface border border-surface-border rounded-md px-2 py-1.5 text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                  v.enabled ? 'text-gray-200' : 'text-gray-500'
                }`}
              />

              <span className="text-gray-600 text-xs">=</span>

              {/* Value */}
              <input
                type="text"
                value={v.value}
                onChange={(e) => updateVar(i, 'value', e.target.value)}
                placeholder="value"
                className={`flex-1 bg-surface border border-surface-border rounded-md px-2 py-1.5 text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                  v.enabled ? 'text-gray-200' : 'text-gray-500'
                }`}
              />

              {/* Delete */}
              <button
                onClick={() => removeVar(i)}
                className="shrink-0 p-0.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                title="Remove variable"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addVar}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent-light transition-colors"
      >
        <Plus size={12} />
        Add variable
      </button>

      {importError && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
          <AlertCircle size={12} />
          {importError}
        </div>
      )}

      {envVars.length > 0 && (
        <p className="text-xs text-gray-600 mt-2">
          Variables are injected into new terminal sessions for this project.
        </p>
      )}
    </div>
  )
}
