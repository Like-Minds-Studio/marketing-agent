'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const EMAIL_TYPES = [
  { id: 'followup', label: 'Post-meeting follow-up', hint: 'After a site visit, call, or first meeting' },
  { id: 'proposal', label: 'Send proposal', hint: 'Cover note when sending the Like Minds proposal doc' },
  { id: 'cold', label: 'Cold outreach', hint: 'First contact to a new prospect or hospitality operator' },
  { id: 'update', label: 'Project update', hint: 'Check-in or milestone update for an active client' },
  { id: 'reengage', label: 'Re-engage', hint: 'Prospect who went quiet or a past client worth reconnecting' },
  { id: 'partner', label: 'Partner comms', hint: 'To AZB Sourcery, Table One, No Filter, Buterin Lestrange, or other partners' },
]

function buildEmailPrompt(type: string, recipient: string, context: string): string {
  const typeLabel = EMAIL_TYPES.find((t) => t.id === type)?.label || type

  return `Write a complete, ready-to-send business email for David Veksler, Founder & Director of Like Minds Studio.

Email type: ${typeLabel}
Recipient: ${recipient || '[name/company]'}
Context: ${context}

Format your response as:
**SUBJECT:** [subject line]

[email body]

David's voice rules:
- No "I hope this email finds you well" or any filler opener — get straight to the point
- Warm and human but never effusive or sycophantic
- Specific — references the actual situation, not generic platitudes
- Confident without being arrogant
- Clear call to action or next step at the end
- Length: follow-ups and re-engages concise (3–5 sentences body), proposals and updates can be 2–3 paragraphs
- No sign-off clichés ("Kind regards", "Best wishes") — use "David" or name + title only

Signature to use:
David Veksler
Founder & Director | Like Minds Studio
david@likemindsstudio.com`
}

function extractMemory(userMessage: string, assistantMessage: string) {
  fetch('/api/memory/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, assistantMessage }),
  }).catch(() => {})
}

async function saveConversation(title: string, messages: { role: 'user' | 'assistant'; content: string }[]) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  try {
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, messages }),
    })
  } catch {}
}

function stripMarkdownForCopy(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

interface Props { davidContext: string; onSave?: () => void }

export default function EmailTab({ davidContext, onSave }: Props) {
  const [emailType, setEmailType] = useState('followup')
  const [recipient, setRecipient] = useState('')
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const [followUpInput, setFollowUpInput] = useState('')
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])

  const canGenerate = context.trim().length > 0

  async function generate() {
    if (!canGenerate || loading) return
    setOutput('')
    setFollowUpInput('')
    setConversationHistory([])
    setLoading(true)
    abortRef.current = new AbortController()

    const prompt = buildEmailPrompt(emailType, recipient, context)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], davidContext }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setOutput(accumulated)
      }
      const typeLabel = EMAIL_TYPES.find((t) => t.id === emailType)?.label || emailType
      saveConversation(
        `[Email] ${typeLabel}${recipient ? ' — ' + recipient.slice(0, 28) : ''}`,
        [
          { role: 'user', content: `${typeLabel} to ${recipient || 'recipient'}: ${context.slice(0, 80)}` },
          { role: 'assistant', content: accumulated },
        ]
      )
      setConversationHistory([
        { role: 'user', content: prompt },
        { role: 'assistant', content: accumulated },
      ])
      if (accumulated.length > 100) extractMemory(`${typeLabel} email to ${recipient || 'client'}`, accumulated)
      onSave?.()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setOutput('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setLoading(false)
  }

  async function followUp() {
    if (!followUpInput.trim() || loading) return
    setOutput('')
    setLoading(true)
    abortRef.current = new AbortController()

    const newMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: followUpInput.trim() },
    ]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, davidContext }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setOutput(accumulated)
      }
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: followUpInput.trim() },
        { role: 'assistant', content: accumulated },
      ])
      setFollowUpInput('')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setOutput('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(stripMarkdownForCopy(output))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-7">
          <h2 className="text-xl font-bold text-lm-bone tracking-tight mb-1">Email Draft</h2>
          <p className="text-sm text-lm-warm">
            Describe the situation — get a ready-to-send email in your voice. Copy it straight into Gmail.
          </p>
        </div>

        {/* Form */}
        <div className="bg-lm-surface border border-lm-bone/8 rounded-2xl p-5 space-y-5">

          {/* Email type */}
          <div>
            <label className="block text-xs font-medium text-lm-muted mb-2 uppercase tracking-widest">Email type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMAIL_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEmailType(t.id)}
                  title={t.hint}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm border transition-all ${
                    emailType === t.id
                      ? 'bg-lm-lilac/15 border-lm-lilac/40 text-lm-lilac'
                      : 'bg-lm-bone/4 border-lm-bone/10 text-lm-muted hover:text-lm-warm hover:border-lm-bone/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-xs font-medium text-lm-muted mb-1.5 uppercase tracking-widest">Recipient</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Marcus at The Grounds, Sarah from Accor, Alex (AZB Sourcery)"
              className="w-full bg-lm-bone/4 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
            />
          </div>

          {/* Context */}
          <div>
            <label className="block text-xs font-medium text-lm-muted mb-1.5 uppercase tracking-widest">
              What to say <span className="text-lm-lilac">*</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generate() } }}
              placeholder="Describe the situation and what you want to communicate. E.g. 'We had a great site visit at their Bondi location yesterday. They loved the concept but hesitated on the fee. Want to reinforce our value and keep momentum without discounting.'"
              rows={4}
              disabled={loading}
              className="w-full bg-lm-bone/4 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-3 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors resize-none leading-relaxed"
            />
            <p className="text-[11px] text-lm-muted mt-1.5">Cmd+Enter to generate</p>
          </div>

          <div className="flex justify-end pt-1">
            {loading ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2.5 bg-lm-bone/10 hover:bg-lm-bone/12 rounded-xl text-sm text-lm-warm transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={!canGenerate}
                className="flex items-center gap-2 px-5 py-2.5 bg-lm-lilac hover:bg-[#C4A3E8] disabled:bg-lm-bone/10 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-black disabled:text-lm-muted transition-colors"
              >
                Draft Email
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Output */}
        {(output || loading) && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-lm-muted uppercase tracking-widest">
                {loading ? 'Drafting…' : 'Email Draft'}
              </span>
              {output && !loading && (
                <button
                  onClick={copyEmail}
                  className="flex items-center gap-1.5 text-xs transition-colors px-3 py-1 rounded-lg hover:bg-lm-bone/5"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-lm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-lm-muted hover:text-lm-bone">Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="bg-lm-bone/4 border border-lm-bone/10 rounded-2xl px-6 py-5">
              {output ? (
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:font-bold prose-headings:text-lm-bone prose-headings:mt-3 prose-headings:mb-2
                  prose-p:text-lm-bone/80 prose-p:my-2 prose-p:leading-relaxed
                  prose-strong:text-lm-bone
                  prose-ul:text-lm-bone/80 prose-li:my-0.5
                  prose-hr:border-lm-bone/10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>
              ) : (
                <span className="inline-flex gap-1 items-center text-lm-muted">
                  <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full animate-bounce" />
                </span>
              )}
            </div>
          </div>
        )}

        {conversationHistory.length > 0 && !loading && (
          <div className="mt-3">
            <div className="bg-lm-bone/4 border border-lm-bone/10 focus-within:border-lm-lilac/40 rounded-2xl px-4 py-3 transition-colors">
              <textarea
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); followUp() } }}
                placeholder="Refine: make it shorter · add more urgency · soften the tone · include the timeline…"
                rows={2}
                className="w-full bg-transparent text-sm text-lm-bone placeholder-lm-muted/50 resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-lm-bone/5">
                <button
                  onClick={() => { setOutput(''); setConversationHistory([]); setFollowUpInput('') }}
                  className="text-xs text-lm-muted hover:text-lm-warm transition-colors"
                >
                  New email
                </button>
                <button
                  onClick={followUp}
                  disabled={!followUpInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-lm-lilac hover:bg-[#C4A3E8] disabled:bg-lm-bone/10 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-black disabled:text-lm-muted transition-colors"
                >
                  Refine
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}
