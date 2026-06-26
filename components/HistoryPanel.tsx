'use client'

import { useEffect, useState } from 'react'
import { SavedConversation } from '@/lib/types'
import { loadConversations, deleteConversation } from '@/lib/storage'

interface Props {
  open: boolean
  onClose: () => void
  onLoad: (conv: SavedConversation) => void
  refreshTrigger: number
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function HistoryPanel({ open, onClose, onLoad, refreshTrigger }: Props) {
  const [conversations, setConversations] = useState<SavedConversation[]>([])

  useEffect(() => {
    setConversations(loadConversations())
  }, [open, refreshTrigger])

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-20 backdrop-blur-sm" onClick={onClose} />}

      <div className={`fixed top-0 left-0 h-full w-72 bg-lm-surface border-r border-lm-bone/8 z-30 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-lm-bone/8 shrink-0">
          <span className="text-sm font-semibold text-lm-bone tracking-wide">Chat History</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-lm-muted hover:text-lm-bone hover:bg-lm-bone/8 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-lm-muted text-sm">No saved conversations yet.</p>
              <p className="text-lm-muted/60 text-xs mt-1">Start chatting — sessions save automatically.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { onLoad(conv); onClose() }}
                className="w-full text-left px-4 py-3 hover:bg-lm-bone/4 transition-colors group flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-lm-bone/80 truncate leading-snug">{conv.title}</p>
                  <p className="text-[11px] text-lm-muted mt-0.5">{formatDate(conv.updatedAt)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-lm-muted hover:text-lm-fire hover:bg-lm-bone/5 transition-all mt-0.5"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </button>
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-lm-bone/8 px-4 py-3">
          <p className="text-[11px] text-lm-muted text-center">Saved in this browser · Up to 50 sessions</p>
        </div>
      </div>
    </>
  )
}
