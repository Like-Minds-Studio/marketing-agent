import { SavedConversation } from './types'

const STORAGE_KEY = 'lm_conversations'

export function loadConversations(): SavedConversation[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function upsertConversation(conv: SavedConversation): void {
  const all = loadConversations()
  const idx = all.findIndex((c) => c.id === conv.id)
  if (idx >= 0) {
    all[idx] = conv
  } else {
    all.unshift(conv)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)))
}

export function deleteConversation(id: string): void {
  const all = loadConversations().filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
