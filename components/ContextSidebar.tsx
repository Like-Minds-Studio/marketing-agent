'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lm_david_context'

const PLACEHOLDER = `What's on your mind right now? E.g.:

• This quarter I'm focused on landing 2 hotel clients and closing Kumori
• Good Sides site assessment underway — Barangaroo is the frontrunner
• Budget pressure on 67 Pall Mall — need to hold the $80k fee
• Trying to reduce reliance on referrals and build inbound through LinkedIn
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

  useEffect(() => {
    setDraft(value)
  }, [value, open])

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
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[#111] border-l border-white/10 z-30 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-[#F0EDE4] tracking-wide">My Context</span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed">
            Tell the AI what you're working on, your goals, and your current priorities. It'll factor this into every response.
          </p>
        </div>

        {/* Active indicator */}
        {hasContent && !isDirty && (
          <div className="shrink-0 mx-4 mt-3 px-3 py-2 bg-[#AE8ADD]/10 border border-[#AE8ADD]/20 rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#AE8ADD] rounded-full shrink-0" />
            <span className="text-[11px] text-[#AE8ADD]">Context active — AI is personalised to your situation</span>
          </div>
        )}

        {/* Textarea */}
        <div className="flex-1 p-4 min-h-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={PLACEHOLDER}
            className="w-full h-full bg-white/5 border border-white/10 focus:border-[#AE8ADD]/40 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/15 focus:outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 pb-4 flex items-center gap-2">
          {hasContent && (
            <button
              onClick={clear}
              className="text-xs text-white/25 hover:text-white/50 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Clear
            </button>
          )}
          <button
            onClick={save}
            disabled={!isDirty && !saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : isDirty
                ? 'bg-[#AE8ADD] text-black hover:bg-[#C4A3E8]'
                : 'bg-white/5 text-white/30 cursor-default'
            }`}
          >
            {saved ? '✓ Saved' : 'Save Context'}
          </button>
        </div>

        <div className="shrink-0 px-4 pb-4">
          <p className="text-[10px] text-white/15 text-center leading-relaxed">
            Stored in your browser only. Update anytime.
          </p>
        </div>
      </div>
    </>
  )
}
