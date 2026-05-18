import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { CommandReferenceHelp } from '../../../../shared/command-schema'
import { useSettingsStore } from '../../store/settings-store'
import { formatDateTime } from '../../i18n/format'

interface CommandReferenceHelpPanelProps {
  help: CommandReferenceHelp
  executable: string
  footer?: ReactNode
  showHeader?: boolean
}

function SectionTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </h3>
  )
}

export function CommandReferenceHelpPanel({
  help,
  executable,
  footer,
  showHeader = true
}: CommandReferenceHelpPanelProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const settings = useSettingsStore((s) => s.settings)
  const sections = help.sections
  const hasStructuredSections =
    Boolean(sections?.overview) ||
    Boolean(sections?.commonOptions?.length) ||
    Boolean(sections?.arguments?.length) ||
    Boolean(sections?.examples?.length) ||
    Boolean(sections?.platformNotes?.length) ||
    Boolean(sections?.cautions?.length)

  return (
    <div
      className={
        showHeader
          ? 'mt-4 rounded-2xl border border-surface-border bg-surface-light/60 overflow-hidden'
          : 'rounded-none border-0 bg-transparent overflow-hidden'
      }
    >
      {showHeader && (
          <div className="border-b border-surface-border px-4 py-3">
          <div className="text-sm font-semibold text-gray-200">
            {t('referenceHelp.title', { executable })}
          </div>
          <div className="text-xs text-gray-500">
            {help.providerLabel ?? 'AI'}
            {help.model ? ` · ${help.model}` : ''}
            {help.generatedAt
              ? ` · ${t('referenceHelp.savedMeta', {
                  timestamp: formatDateTime(help.generatedAt, settings)
                })}`
              : ''}
          </div>
        </div>
      )}

      <div className="space-y-6 px-4 py-4">
        {hasStructuredSections ? (
          <>
            {sections?.overview && (
              <section className="space-y-2">
                <SectionTitle>{t('referenceHelp.overview')}</SectionTitle>
                <p className="text-sm leading-7 text-gray-200">{sections.overview}</p>
              </section>
            )}

            {sections?.commonOptions?.length ? (
              <section className="space-y-4">
                <SectionTitle>{t('referenceHelp.commonOptions')}</SectionTitle>
                {sections.commonOptions.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="text-sm font-medium text-gray-200">{group.title}</div>
                    <div className="space-y-2">
                      {group.rows.map((row) => (
                        <div
                          key={`${group.title}-${row.label}-${row.description}`}
                          className="grid gap-2 rounded-xl border border-surface-border/70 bg-surface/70 px-3 py-3 md:grid-cols-[minmax(180px,240px)_1fr]"
                        >
                          <div className="font-mono text-sm text-accent-light">{row.label}</div>
                          <div className="space-y-1">
                            <div className="text-sm text-gray-200">{row.description}</div>
                            {row.platform && (
                              <div className="text-[11px] uppercase tracking-wider text-gray-500">
                                {row.platform}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            {sections?.arguments?.length ? (
              <section className="space-y-3">
                <SectionTitle>{t('referenceHelp.arguments')}</SectionTitle>
                <div className="space-y-2">
                  {sections.arguments.map((row) => (
                    <div
                      key={`${row.label}-${row.description}`}
                      className="grid gap-2 rounded-xl border border-surface-border/70 bg-surface/70 px-3 py-3 md:grid-cols-[minmax(180px,220px)_1fr]"
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-sm text-accent-light">{row.label}</div>
                        {row.required && (
                          <div className="text-[11px] uppercase tracking-wider text-caution">
                            {t('referenceHelp.required')}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-200">{row.description}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {sections?.examples?.length ? (
              <section className="space-y-3">
                <SectionTitle>{t('referenceHelp.examples')}</SectionTitle>
                <div className="space-y-2">
                  {sections.examples.map((example) => (
                    <div
                      key={`${example.command}-${example.description}`}
                      className="rounded-xl border border-surface-border/70 bg-surface/70 px-3 py-3"
                    >
                      <div className="font-mono text-sm text-accent-light break-all">{example.command}</div>
                      <div className="mt-1 text-sm text-gray-200">{example.description}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {sections?.platformNotes?.length ? (
              <section className="space-y-3">
                <SectionTitle>{t('referenceHelp.platformNotes')}</SectionTitle>
                <div className="space-y-2">
                  {sections.platformNotes.map((note) => (
                    <div
                      key={note}
                      className="rounded-xl border border-surface-border/70 bg-surface/70 px-3 py-3 text-sm leading-6 text-gray-200"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {sections?.cautions?.length ? (
              <section className="space-y-3">
                <SectionTitle>{t('referenceHelp.cautions')}</SectionTitle>
                <div className="space-y-2">
                  {sections.cautions.map((caution) => (
                    <div
                      key={caution}
                      className="rounded-xl border border-caution/20 bg-caution/10 px-3 py-3 text-sm leading-6 text-caution"
                    >
                      {caution}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-200">{help.content}</div>
        )}
      </div>

      {footer && <div className="border-t border-surface-border px-4 py-3">{footer}</div>}
    </div>
  )
}
