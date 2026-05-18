type WorkflowErrorTranslator = (key: string, options?: Record<string, unknown>) => string

const TERMINAL_CLOSED_ERROR = 'Terminal session closed before the workflow completed.'
const WORKFLOW_CANCELLED_ERROR = 'Workflow cancelled.'
const EXIT_CODE_ERROR = /^(.*) failed with exit code (\d+)\.(?: (Retrying\.|Continuing because continue on error is enabled\.))?$/

export function formatWorkflowRunError(
  error: string | null | undefined,
  translate: WorkflowErrorTranslator
): string | null {
  if (!error) return null

  if (error === TERMINAL_CLOSED_ERROR) {
    return translate('runner.errors.terminalClosed')
  }

  if (error === WORKFLOW_CANCELLED_ERROR) {
    return translate('runner.errors.cancelled')
  }

  const exitMatch = error.match(EXIT_CODE_ERROR)
  if (exitMatch) {
    const [, label, code, suffix] = exitMatch
    if (suffix === 'Retrying.') {
      return translate('runner.errors.stepFailedRetrying', { label, code })
    }
    if (suffix === 'Continuing because continue on error is enabled.') {
      return translate('runner.errors.stepFailedContinuing', { label, code })
    }
    return translate('runner.errors.stepFailed', { label, code })
  }

  return error
}
