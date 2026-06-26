'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lm_david_context'

const PLACEHOLDER = `What's on your mind right now? E.g.:

• This quarter I'm focused on landing 2 hotel clients and closing Kumori
• Good Sides site assessment underway — Barangaroo is the frontrunner
• Budget pressure on 67 Pall Mall — need to hold the $80k fee
• Trying to reduce reliance on referrals, build inbound through LinkedIn
• Revenue target: $4M by end of FY26`

interface MemoryRow {
  id: string
  content: string
  created_at: string
  pinned?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  value: string
  onChange: (v: string) => void
}

export default function ContextSidebar({ open, onClose, value, onChange }: Props) {
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [newFact, setNewFact] = useState('')
  const [addingFact, setAddingFact] = useState(false)

  useEffect(() => { setDraft(value) }, [value, open])

  useEffect(() => {
    if (!open) return
    setMemoriesLoading(true)
    fetch('/api/memory')
      .then((r) => r.json())
      .then((data) => setMemories(Array.isArray(data) ? data : []))
      .catch(() => setMemories([]))
      .finally(() => setMemoriesLoading(false))
  }, [open])

  function save() {
    onChange(draft)
    localStorage.setItem(STORAGE_KEY, draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  function clear() {
    setDraft('')
    onChange('')
    localStorage.removeItem(STORAGE_KEY)
  }

  async function addFact() {
    const content = newFact.trim()
    if (!content || addingFact) return
    setAddingFact(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const { id } = await res.json()
        setMemories((prev) => [{ id, content, created_at: new Date().toISOString(), pinned: false }, ...prev])
        setNewFact('')
      }
    } catch {}
    setAddingFact(false)
  }

  async function togglePin(id: string, current: boolean) {
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, pinned: !current } : m))
    try {
      await fetch('/api/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pinned: !current }),
      })
    } catch {}
  }

  async function deleteMemory(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id))
    try {
      await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {}
  }

  const pinned = memories.filter((m) => m.pinned)
  const recent = memories.filter((m) => !m.pinned)
  const hasContent = draft.trim().length > 0
  const isDirty = draft !== value

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-20 backdrop-blur-sm" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-80 bg-lm-surface border-l border-lm-bone/8 z-30 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="shrink-0 px-4 py-4 border-b border-lm-bone/8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-lm-bone tracking-wide">My Context</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-lm-muted hover:text-lm-bone hover:bg-lm-bone/8 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-lm-muted leading-relaxed">
            Tell the AI what you're working on, your goals, and priorities. It personalises every response to your real situation.
          </p>
        </div>

        {hasContent && !isDirty && (
          <div className="shrink-0 mx-4 mt-3 px-3 py-2 bg-lm-lilac/8 border border-lm-lilac/20 rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full shrink-0" />
            <span className="text-[11px] text-lm-lilac">Context active — AI is personalised to your situation</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Session context textarea */}
          <div className="p-4 flex flex-col" style={{ minHeight: '200px' }}>
            <p className="text-[11px] font-medium text-lm-warm mb-2 uppercase tracking-wider">Session notes</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={PLACEHOLDER}
              className="flex-1 bg-lm-bone/4 border border-lm-bone/10 focus:border-lm-lilac/35 rounded-xl px-4 py-3 text-sm text-lm-bone/85 placeholder-lm-muted/50 focus:outline-none transition-colors resize-none leading-relaxed"
              style={{ minHeight: '160px' }}
            />
          </div>

          {/* Remembered section */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-lm-warm uppercase tracking-wider">Remembered</p>
              {memories.length > 0 && (
                <span className="text-[10px] text-lm-muted">{memories.length} fact{memories.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Add fact input */}
            <div className="flex gap-1.5 mb-3">
              <input
                type="text"
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFact()}
                placeholder="Add a fact the AI should know…"
                className="flex-1 bg-lm-bone/4 border border-lm-bone/10 focus:border-lm-lilac/35 rounded-lg px-3 py-2 text-[12px] text-lm-bone/85 placeholder-lm-muted/50 focus:outline-none transition-colors"
              />
              <button
                onClick={addFact}
                disabled={!newFact.trim() || addingFact}
                className="shrink-0 px-2.5 py-2 bg-lm-lilac/15 hover:bg-lm-lilac/25 disabled:opacity-40 disabled:cursor-not-allowed text-lm-lilac rounded-lg text-[11px] font-semibold transition-colors"
              >
                Add
              </button>
            </div>

            {memoriesLoading ? (
              <div className="flex items-center gap-2 py-3">
                <span className="w-1.5 h-1.5 bg-lm-muted rounded-full animate-pulse" />
                <span className="text-[11px] text-lm-muted">Loading memories…</span>
              </div>
            ) : memories.length === 0 ? (
              <div className="bg-lm-bone/3 border border-lm-bone/8 rounded-xl px-3 py-3">
                <p className="text-[11px] text-lm-muted leading-relaxed">
                  Facts the AI picks up from your chats will appear here — deal statuses, priorities, decisions.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pinned.length > 0 && (
                  <>
                    <p className="text-[10px] text-lm-warm/60 uppercase tracking-wider px-1 mb-1">Pinned</p>
                    {pinned.map((m) => (
                      <MemoryItem key={m.id} m={m} onPin={togglePin} onDelete={deleteMemory} />
                    ))}
                    {recent.length > 0 && <div className="border-t border-lm-bone/8 my-2" />}
                  </>
                )}
                {recent.map((m) => (
                  <MemoryItem key={m.id} m={m} onPin={togglePin} onDelete={deleteMemory} />
                ))}
              </div>
            )}

            {memories.length > 0 && (
              <p className="text-[10px] text-lm-muted/50 mt-2 text-center">Injected into every AI request</p>
            )}
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4 flex items-center gap-2 border-t border-lm-bone/8 pt-3">
          {hasContent && (
            <button onClick={clear} className="text-xs text-lm-muted hover:text-lm-warm transition-colors px-3 py-2 rounded-lg hover:bg-lm-bone/5">
              Clear
            </button>
          )}
          <button
            onClick={save}
            disabled={!isDirty && !saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : isDirty ? 'bg-lm-lilac text-black hover:bg-[#C4A3E8]'
                : 'bg-lm-bone/5 text-lm-muted cursor-default'
            }`}
          >
            {saved ? '✓ Saved' : 'Save Context'}
          </button>
        </div>

        <div className="shrink-0 px-4 pb-4">
          <p className="text-[10px] text-lm-muted/60 text-center leading-relaxed">Session notes stored in your browser. Memories synced to cloud.</p>
        </div>
      </div>
    </>
  )
}

function MemoryItem({
  m,
  onPin,
  onDelete,
}: {
  m: MemoryRow
  onPin: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="group flex items-start gap-2 bg-lm-bone/3 border border-lm-bone/8 hover:border-lm-bone/15 rounded-xl px-3 py-2.5 transition-colors">
      {m.pinned ? (
        <span className="w-1 h-1 bg-lm-warm rounded-full shrink-0 mt-1.5" />
      ) : (
        <span className="w-1 h-1 bg-lm-lilac/60 rounded-full shrink-0 mt-1.5" />
      )}
      <p className="flex-1 text-[11px] text-lm-bone/75 leading-relaxed">{m.content}</p>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={() => onPin(m.id, !!m.pinned)}
          className="w-5 h-5 flex items-center justify-center rounded text-lm-muted hover:text-lm-warm transition-colors"
          title={m.pinned ? 'Unpin' : 'Pin — always inject into AI context'}
        >
          <svg className="w-3 h-3" fill={m.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(m.id)}
          className="w-5 h-5 flex items-center justify-center rounded text-lm-muted hover:text-lm-fire transition-colors"
          title="Forget this"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
