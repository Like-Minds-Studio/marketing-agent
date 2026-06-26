'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SCOPE_OPTIONS = [
  'Concept Design Only',
  'Full Interior Design',
  'Design + Construction',
  'Full End-to-End (Design, Build, FFE & Handover)',
]

function buildProposalPrompt(fields: Record<string, string>): string {
  const lines = [
    `Generate a complete, professional Like Minds Studio proposal document for the following project:\n`,
    `**CLIENT / BUSINESS NAME:** ${fields.client}`,
    `**VENUE CONCEPT:** ${fields.concept}`,
    `**LOCATION:** ${fields.location}`,
  ]
  if (fields.size) lines.push(`**APPROXIMATE SIZE:** ${fields.size}sqm`)
  lines.push(`**SCOPE OF WORK:** ${fields.scope}`)
  if (fields.budget) lines.push(`**BUDGET RANGE:** ${fields.budget}`)
  if (fields.timeline) lines.push(`**DESIRED TIMELINE:** ${fields.timeline}`)
  if (fields.notes) lines.push(`**ADDITIONAL NOTES:** ${fields.notes}`)

  lines.push(`
Write this as a formal Like Minds Studio proposal document with the following sections:

**1. PROJECT UNDERSTANDING**
Demonstrate a deep understanding of the client's vision and the opportunity. Reference the location's market context, the concept's competitive landscape, and what makes this project exciting. Show them you've listened.

**2. OUR APPROACH**
How Like Minds will bring this to life — the commercial thinking, the creative lens, the process discipline. Make it clear this isn't a generic studio pitch.

**3. SCOPE OF WORK**
A clear, detailed breakdown of exactly what is included, based on the selected scope. Use bullet points. Be specific.

**4. PROPOSED TEAM**
Who from Like Minds leads this project. Always include David Veksler (Founder & Director), Gemma Chapman (Creative Director). Add relevant team members based on scope (Ben for PM, Jakub for construction, Vibha for FFE, etc.).

**5. HIGH-LEVEL TIMELINE**
Key phases with indicative durations. Keep it realistic and structured.

**6. INVESTMENT**
Write exactly: "Investment will be confirmed following an initial consultation and site review. We scope properly before committing to numbers — that's how we protect your budget and our reputation." Then encourage them to reach out.

**7. NEXT STEPS**
Close with warmth and a clear call to action. Always end with: "Book your 30-minute strategy call — david@likemindsstudio.com"

Write in the Like Minds brand voice throughout: sophisticated but approachable, confident but not arrogant, results-focused, specific. Reference relevant portfolio projects where they strengthen credibility (e.g. Kumori, 67 Pall Mall, 1 Remedy, Stitch Coffee, Cali Press, Salad Days — only where genuinely relevant). Make the client feel understood and excited about working with Like Minds.`)

  return lines.join('\n')
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

interface Props { davidContext: string; onSave?: () => void }

export default function ProposalTab({ davidContext, onSave }: Props) {
  const [fields, setFields] = useState({
    client: '',
    concept: '',
    location: '',
    size: '',
    scope: SCOPE_OPTIONS[2],
    budget: '',
    timeline: '',
    notes: '',
  })
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function generate() {
    if (!fields.client || !fields.concept || !fields.location) return
    if (loading) return

    setOutput('')
    setLoading(true)
    abortRef.current = new AbortController()

    const prompt = buildProposalPrompt(fields)

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
      saveConversation('[Proposal] ' + fields.client.trim().slice(0, 52), [
        { role: 'user', content: prompt },
        { role: 'assistant', content: accumulated },
      ])
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

  async function copyToClipboard() {
    await navigator.clipboard.writeText(output)
  }

  const canGenerate = fields.client.trim() && fields.concept.trim() && fields.location.trim()

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-lm-bone tracking-tight mb-1">Proposal Generator</h2>
          <p className="text-sm text-lm-muted">Fill in the brief — get a complete Like Minds proposal document, ready to refine and send.</p>
        </div>

        {/* Form */}
        <div className="bg-lm-bone/4 border border-lm-bone/10 rounded-2xl p-6 space-y-5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Client / Business Name <span className="text-lm-lilac">*</span>
              </label>
              <input
                type="text"
                value={fields.client}
                onChange={(e) => set('client', e.target.value)}
                placeholder="e.g. Kumori, 67 Pall Mall"
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Venue Concept <span className="text-lm-lilac">*</span>
              </label>
              <input
                type="text"
                value={fields.concept}
                onChange={(e) => set('concept', e.target.value)}
                placeholder="e.g. premium handroll bar, pilates studio"
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Location <span className="text-lm-lilac">*</span>
              </label>
              <input
                type="text"
                value={fields.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Sydney CBD, Bondi, Brisbane"
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Approx Size (sqm)
              </label>
              <input
                type="text"
                value={fields.size}
                onChange={(e) => set('size', e.target.value)}
                placeholder="e.g. 120"
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
              Scope of Work
            </label>
            <select
              value={fields.scope}
              onChange={(e) => set('scope', e.target.value)}
              className="w-full bg-lm-raised border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone focus:outline-none transition-colors appearance-none"
            >
              {SCOPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Budget Range
              </label>
              <input
                type="text"
                value={fields.budget}
                onChange={(e) => set('budget', e.target.value)}
                placeholder="e.g. $150k–$250k"
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Desired Timeline
              </label>
              <input
                type="text"
                value={fields.timeline}
                onChange={(e) => set('timeline', e.target.value)}
                placeholder="e.g. open by October 2026"
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
              Additional Notes
            </label>
            <textarea
              value={fields.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any specific requirements, context, or things to emphasise…"
              rows={3}
              className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Generate button */}
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
                Generate Proposal
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
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
                {loading ? 'Generating…' : 'Proposal Draft'}
              </span>
              {output && !loading && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 text-xs text-lm-muted hover:text-lm-warm transition-colors px-3 py-1 rounded-lg hover:bg-lm-bone/5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              )}
            </div>

            <div className="bg-lm-bone/4 border border-lm-bone/10 rounded-2xl px-6 py-5">
              {output ? (
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:font-bold prose-headings:text-lm-bone prose-headings:mt-5 prose-headings:mb-2
                  prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                  prose-p:text-lm-bone/80 prose-p:my-2 prose-p:leading-relaxed
                  prose-strong:text-lm-bone
                  prose-ul:text-lm-bone/80 prose-ol:text-lm-bone/80 prose-li:my-0.5
                  prose-hr:border-lm-bone/10
                  prose-code:text-lm-lilac prose-code:bg-lm-bone/5 prose-code:px-1 prose-code:rounded
                  prose-blockquote:border-lm-lilac prose-blockquote:text-lm-warm
                  prose-a:text-lm-lilac">
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

        <div className="h-8" />
      </div>
    </div>
  )
}
