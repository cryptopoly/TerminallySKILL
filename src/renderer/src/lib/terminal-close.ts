import {
  isTerminalRunStatus,
  type WorkflowActiveRun
} from '../store/workflow-runner-store'

type TerminalCloseTranslator = (key: string, options?: Record<string, unknown>) => string

export async function confirmTerminalClose(
  sessionId: string,
  runsBySession: Record<string, WorkflowActiveRun>,
  translate: TerminalCloseTranslator
): Promise<boolean> {
  const run = runsBySession[sessionId] ?? null
  const hasActiveWorkflowRun = Boolean(run && !isTerminalRunStatus(run.status))
  const sessionInfo = await window.electronAPI.getSessionInfo(sessionId)
  const shellIsExecuting = sessionInfo?.shellState === 'executing'

  if (!hasActiveWorkflowRun && !shellIsExecuting) {
    return true
  }

  const reasons: string[] = []
  if (hasActiveWorkflowRun) {
    reasons.push(translate('close.workflowRunning', { name: run?.script.name ?? translate('close.unknownScript') }))
  }
  if (shellIsExecuting) {
    reasons.push(translate('close.shellExecuting'))
  }

  return window.confirm(
    translate('close.confirm', { reasons: reasons.join('\n') })
  )
}
