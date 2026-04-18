import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { writeJsonAtomic } from './atomic-write'
import type { Snippet, SnippetsData } from '../shared/snippet-schema'
import type { StarterSnippetTemplate } from '../shared/starter-pack-schema'
import { applySnippetUpdates, createSnippetRecord, duplicateSnippetRecord } from './snippet-persistence'
import { getDataDir } from './user-data-path'

let cached: SnippetsData | null = null

function getSnippetsFile(): string {
  return join(getDataDir(), 'snippets.json')
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function load(): Promise<SnippetsData> {
  if (cached) return cached
  try {
    const raw = await readFile(getSnippetsFile(), 'utf-8')
    cached = JSON.parse(raw) as SnippetsData
    return cached
  } catch {
    cached = { snippets: [] }
    return cached
  }
}

async function save(data: SnippetsData): Promise<void> {
  await ensureDataDir()
  cached = data
  await writeJsonAtomic(getSnippetsFile(), data)
}

export async function getAllSnippets(): Promise<Snippet[]> {
  const data = await load()
  return data.snippets
}

export async function createSnippet(
  name: string,
  template: string,
  projectId: string | null,
  description?: string
): Promise<Snippet> {
  const data = await load()
  const snippet = createSnippetRecord(
    { name, template, projectId, description },
    new Date().toISOString(),
    randomUUID
  )
  data.snippets.push(snippet)
  await save(data)
  return snippet
}

export async function createStarterSnippets(
  projectId: string,
  templates: StarterSnippetTemplate[]
): Promise<Snippet[]> {
  if (templates.length === 0) return []

  const data = await load()
  const now = new Date().toISOString()
  const snippets = templates.map((template) => {
    const snippet = createSnippetRecord(
      {
        name: template.name,
        template: template.template,
        projectId,
        description: template.description
      },
      now,
      randomUUID
    )

    snippet.tags = ['starter-pack']
    return snippet
  })

  data.snippets.push(...snippets)
  await save(data)
  return snippets
}

export async function updateSnippet(
  id: string,
  updates: Partial<Pick<Snippet, 'name' | 'description' | 'template' | 'tags'>>
): Promise<Snippet | null> {
  const data = await load()
  const snippet = data.snippets.find((s) => s.id === id)
  if (!snippet) return null

  Object.assign(snippet, applySnippetUpdates(snippet, updates, new Date().toISOString()))

  await save(data)
  return snippet
}

export async function deleteSnippet(id: string): Promise<void> {
  const data = await load()
  data.snippets = data.snippets.filter((s) => s.id !== id)
  await save(data)
}

export async function duplicateSnippet(snippetId: string): Promise<Snippet | null> {
  const data = await load()
  const original = data.snippets.find((s) => s.id === snippetId)
  if (!original) return null

  const copy = duplicateSnippetRecord(original, new Date().toISOString(), randomUUID)
  data.snippets.push(copy)
  await save(data)
  return copy
}

export async function markSnippetRun(snippetId: string): Promise<void> {
  const data = await load()
  const snippet = data.snippets.find((s) => s.id === snippetId)
  if (snippet) {
    snippet.lastRunAt = new Date().toISOString()
    await save(data)
  }
}
