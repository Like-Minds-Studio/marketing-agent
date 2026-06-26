'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lm_david_context'

const PLACEHOLDER = `What's on your mind right now? E.g.:

• This quarter I'm focused on landing 2 hotel clients and closing Kumori
• Good Sides site assessment underway — Barangaroo is the frontrunner
• Budget pressure on 67 Pall Mall — need to hold the $80k fee
• Trying to reduce reliance on referrals, build inbound through LinkedIn
• Revenue target: $4M by end of FY26`

interface Props {
  open: boolean
  onClose: () => void
  value: string
  onChange: (v: string) => void
}

export default function ContextSidebar({ open, onClose, value, onChange }: Props) {
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(value) }, [value, open])

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

        <div className="flex-1 p-4 min-h-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PLACEHOLDER}
            className="w-full h-full bg-lm-bone/4 border border-lm-bone/10 focus:border-lm-lilac/35 rounded-xl px-4 py-3 text-sm text-lm-bone/85 placeholder-lm-muted/50 focus:outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="shrink-0 px-4 pb-4 flex items-center gap-2">
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
          <p className="text-[10px] text-lm-muted/60 text-center leading-relaxed">Stored in your browser only. Update anytime.</p>
        </div>
      </div>
    </>
  )
}
