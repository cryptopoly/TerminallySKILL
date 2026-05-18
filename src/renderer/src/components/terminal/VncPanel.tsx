import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import RFB from '@novnc/novnc/lib/rfb.js'
import { MonitorOff, Loader2, Eye, EyeOff, Maximize2, Minimize2, RefreshCw, Clipboard } from 'lucide-react'

interface VncPanelProps {
  sessionId: string
  wsPort: number
  token: string
  vncPort: number
  storageKey: string
  visible: boolean
}

type VncStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function VncPanel({ sessionId, wsPort, token, vncPort, storageKey, visible }: VncPanelProps): JSX.Element {
  const { t } = useTranslation('terminal')
  const containerRef = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<InstanceType<typeof RFB> | null>(null)
  const [status, setStatus] = useState<VncStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectKey, setConnectKey] = useState(0)
  const [passwordPrompt, setPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const outerRef = useRef<HTMLDivElement>(null)
  const hasSavedPassword = useRef(false)
  const triedEmptyPassword = useRef(false)

  const reconnect = useCallback(() => {
    rfbRef.current?.disconnect()
    rfbRef.current = null
    setStatus('connecting')
    setErrorMessage(null)
    setPasswordPrompt(false)
    setConnectKey((k) => k + 1)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!outerRef.current) return
    if (!document.fullscreenElement) {
      void outerRef.current.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const onFsChange = (): void => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── Clipboard: paste local → remote ──
  const pasteToRemote = useCallback(async () => {
    const rfb = rfbRef.current
    if (!rfb || status !== 'connected') return

    try {
      const text = await navigator.clipboard.readText()
      if (!text) return

      // Send local clipboard text to remote clipboard
      rfb.clipboardPasteFrom(text)

      // Then send Ctrl+V so the remote app pastes it
      const ctrlKeysym = 0xffe3 // Control_L
      const vKeysym = 0x0076   // 'v'
      rfb.sendKey(ctrlKeysym, 'ControlLeft', true)
      rfb.sendKey(vKeysym, 'KeyV', true)
      rfb.sendKey(vKeysym, 'KeyV', false)
      rfb.sendKey(ctrlKeysym, 'ControlLeft', false)
    } catch {
      // Clipboard API may not be available or permission denied
    }
  }, [status])

  // Intercept Ctrl+V / Cmd+V before noVNC's keyboard handler
  useEffect(() => {
    const container = containerRef.current
    if (!container || status !== 'connected') return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        e.stopPropagation()
        void pasteToRemote()
      }
    }

    // Capture phase so we intercept before noVNC
    container.addEventListener('keydown', handleKeyDown, true)
    return () => container.removeEventListener('keydown', handleKeyDown, true)
  }, [status, pasteToRemote])

  // ── Clipboard: remote → local (copy out) ──
  useEffect(() => {
    const rfb = rfbRef.current
    if (!rfb || status !== 'connected') return

    const handleClipboard = (e: CustomEvent): void => {
      const text = e.detail?.text
      if (text) {
        void navigator.clipboard.writeText(text).catch(() => {})
      }
    }

    rfb.addEventListener('clipboard', handleClipboard as EventListener)
    return () => rfb.removeEventListener('clipboard', handleClipboard as EventListener)
  }, [status])

  const submitPassword = useCallback(() => {
    if (rememberPassword) {
      void window.electronAPI.saveVncPassword(storageKey, passwordInput)
    }
    rfbRef.current?.sendCredentials({ password: passwordInput })
    setPasswordPrompt(false)
    setPasswordInput('')
    setShowPassword(false)
  }, [passwordInput, rememberPassword, storageKey])

  useEffect(() => {
    if (!containerRef.current) return

    setStatus('connecting')
    setErrorMessage(null)
    setPasswordPrompt(false)
    hasSavedPassword.current = false
    triedEmptyPassword.current = false

    let rfb: InstanceType<typeof RFB>

    const connect = async (): Promise<void> => {
      if (!containerRef.current) return

      // Check for a saved password before connecting
      const saved = await window.electronAPI.getVncPassword(storageKey)
      hasSavedPassword.current = !!saved

      rfb = new RFB(
        containerRef.current,
        `ws://127.0.0.1:${wsPort}?token=${encodeURIComponent(token)}`
      )

      rfb.scaleViewport = true
      rfb.resizeSession = false
      rfbRef.current = rfb

      rfb.addEventListener('connect', () => {
        setStatus('connected')
      })

      rfb.addEventListener('disconnect', (e: CustomEvent) => {
        if (e.detail?.clean) {
          setStatus('disconnected')
        } else {
          setStatus('error')
          setErrorMessage(t('vnc.connectionLost', { port: vncPort }))
        }
      })

      rfb.addEventListener('credentialsrequired', () => {
        if (hasSavedPassword.current && saved) {
          // Try the saved password automatically — no modal
          hasSavedPassword.current = false
          rfb.sendCredentials({ password: saved })
        } else if (!triedEmptyPassword.current) {
          // Many VNC servers behind SSH tunnels don't need a password.
          // Try an empty password silently first before showing the prompt.
          triedEmptyPassword.current = true
          rfb.sendCredentials({ password: '' })
        } else {
          setPasswordPrompt(true)
        }
      })
    }

    void connect()

    const unsubscribe = window.electronAPI.onVncError((id, message) => {
      if (id === sessionId) {
        setStatus('error')
        setErrorMessage(message)
      }
    })

    return () => {
      unsubscribe()
      rfbRef.current?.disconnect()
      rfbRef.current = null
    }
  }, [wsPort, token, sessionId, storageKey, connectKey, vncPort, t])

  return (
    <div
      ref={outerRef}
      className="absolute inset-0 bg-black flex flex-col"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      {/* Status overlay — shown until connected */}
      {status !== 'connected' && !passwordPrompt && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10">
          {status === 'connecting' && (
            <>
              <Loader2 size={24} className="text-accent-light animate-spin" />
              <p className="text-sm text-gray-400">{t('vnc.connecting')}</p>
            </>
          )}
          {(status === 'disconnected' || status === 'error') && (
            <>
              <MonitorOff size={24} className="text-gray-500" />
              <p className="text-sm text-gray-400 text-center max-w-xs px-4">
                {status === 'error' ? (errorMessage ?? t('vnc.connectionError')) : t('vnc.disconnected')}
              </p>
              <button
                onClick={reconnect}
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-gray-300 hover:text-white hover:border-accent/50 transition-colors"
              >
                <RefreshCw size={12} />
                {t('vnc.reconnect')}
              </button>
            </>
          )}
        </div>
      )}

      {/* VNC password modal */}
      {passwordPrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="bg-surface border border-surface-border rounded-xl shadow-2xl shadow-black/50 p-6 w-80 flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-gray-200">{t('vnc.passwordRequired')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('vnc.passwordDescription')}</p>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitPassword() }}
                placeholder={t('vnc.passwordPlaceholder')}
                autoFocus
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 pr-9 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="rounded border-surface-border bg-surface"
              />
              <span className="text-xs text-gray-400">{t('vnc.rememberPassword')}</span>
              <span className="text-xs text-gray-600 ml-auto">({t('vnc.keychain')})</span>
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setPasswordPrompt(false); setPasswordInput('') }}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitPassword}
                className="px-3 py-1.5 rounded-lg bg-accent text-sm text-white hover:bg-accent/90 transition-colors"
              >
                {t('vnc.connect')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar — fades in on hover when connected */}
      {status === 'connected' && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-150 group-hover:opacity-100"
          style={{ opacity: isFullscreen ? 1 : undefined }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => { if (!isFullscreen) e.currentTarget.style.opacity = '0' }}
        >
          <button
            onClick={() => void pasteToRemote()}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-gray-400 hover:text-white hover:bg-black/80 transition-colors"
            title={t('vnc.pasteClipboard')}
          >
            <Clipboard size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-gray-400 hover:text-white hover:bg-black/80 transition-colors"
            title={isFullscreen ? t('vnc.exitFullscreen') : t('vnc.enterFullscreen')}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      )}

      {/* noVNC mounts its canvas into this div */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  )
}
