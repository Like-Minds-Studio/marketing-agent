'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const AUDIENCE_OPTIONS = [
  'All three (Go-Getters, Dreamers, Workaholics)',
  'Go-Getters (hospitality owners/investors, ROI-driven)',
  'Dreamers (first-time operators, passion-led)',
  'Workaholics (hotel/large-scale operators)',
]

const PLATFORM_OPTIONS = ['Instagram', 'LinkedIn', 'TikTok']

function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const daysUntil = day === 1 ? 0 : day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntil)
  return d.toISOString().split('T')[0]
}

function formatDateForPrompt(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function buildCalendarPrompt(fields: {
  weekStart: string
  audience: string
  platforms: string[]
  focus: string
  projects: string
}): string {
  const lines = [
    `Generate a complete weekly social media content calendar for Like Minds Studio.\n`,
    `**WEEK STARTING:** ${formatDateForPrompt(fields.weekStart)}`,
    `**TARGET AUDIENCE:** ${fields.audience}`,
    `**PLATFORMS:** ${fields.platforms.join(', ')}`,
    `**CAMPAIGN FOCUS / KEY MESSAGE:** ${fields.focus || 'General brand awareness and service showcase'}`,
  ]
  if (fields.projects) lines.push(`**ACTIVE PROJECTS TO HIGHLIGHT:** ${fields.projects}`)

  lines.push(`
Create a day-by-day content calendar for Monday through Sunday (7 days). For each post include:

- **Day & Platform** (e.g. Monday — Instagram Reel)
- **Format** (Feed post / Reel / Story / Carousel / LinkedIn article / TikTok)
- **Content Pillar** (Operational Intelligence & ROI / Passion & Culture / Behind-the-Scenes Craft / Hotel & Large-Scale Expertise / Future Trends & Innovation)
- **Target Persona** (Go-Getters / Dreamers / Workaholics)
- **Caption** — complete, ready-to-post copy
- **Hashtags** — 8–12 relevant hashtags (Instagram only; skip for LinkedIn/TikTok)
- **Visual Direction** — one sentence on what to shoot/film/design

Rules:
- Cover all selected platforms across the week; aim for at least one post per platform per day where reasonable
- Vary formats — don't repeat the same format on the same platform two days in a row
- Match caption tone to target persona (Go-Getters: results-driven, fast, confident / Dreamers: warm, inspiring, empathetic / Workaholics: operational, precise, case-study-led)
- Weave in the campaign focus naturally — don't force it into every post
- Include the CTA "Book a 30-min strategy call — david@likemindsstudio.com" in at least 2 posts this week
- Write captions in Like Minds brand voice: short punchy sentences, strong verbs, lead with results, no filler

Format each day clearly with a horizontal rule separator between days.`)

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

export default function CalendarTab({ davidContext, onSave }: Props) {
  const [weekStart, setWeekStart] = useState('')
  const [audience, setAudience] = useState(AUDIENCE_OPTIONS[0])
  const [platforms, setPlatforms] = useState<string[]>(['Instagram', 'LinkedIn'])
  const [focus, setFocus] = useState('')
  const [projects, setProjects] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setWeekStart(getNextMonday())
  }, [])

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function generate() {
    if (platforms.length === 0 || loading) return

    setOutput('')
    setLoading(true)
    abortRef.current = new AbortController()

    const prompt = buildCalendarPrompt({ weekStart, audience, platforms, focus, projects })

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
      const weekLabel = weekStart || 'week'
      saveConversation('[Calendar] ' + weekLabel + (focus ? ' — ' + focus.slice(0, 35) : ''), [
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-lm-bone tracking-tight mb-1">Content Calendar</h2>
          <p className="text-sm text-lm-muted">Set your week and focus — get a full 7-day social content calendar, ready to schedule.</p>
        </div>

        {/* Form */}
        <div className="bg-lm-bone/4 border border-lm-bone/10 rounded-2xl p-6 space-y-5">
          {/* Week start + audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Week Starting
              </label>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone focus:outline-none transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
                Target Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full bg-lm-raised border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone focus:outline-none transition-colors appearance-none"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-xs font-medium text-lm-warm mb-2 uppercase tracking-widest">
              Platforms <span className="text-lm-lilac">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    platforms.includes(p)
                      ? 'bg-lm-lilac/20 border-lm-lilac/50 text-lm-lilac'
                      : 'bg-lm-bone/5 border-lm-bone/10 text-lm-muted hover:text-lm-warm hover:border-lm-bone/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign focus */}
          <div>
            <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
              Campaign Focus / Key Message
            </label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. Kumori launch, multi-site rollout expertise, Good Sides concept"
              className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
            />
          </div>

          {/* Projects to highlight */}
          <div>
            <label className="block text-xs font-medium text-lm-warm mb-1.5 uppercase tracking-widest">
              Projects to Highlight
            </label>
            <input
              type="text"
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              placeholder="e.g. 67 Pall Mall, Strong Pilates Manly, 1 Remedy Potts Point"
              className="w-full bg-lm-bone/5 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-2.5 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors"
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
                disabled={platforms.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-lm-lilac hover:bg-[#C4A3E8] disabled:bg-lm-bone/10 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-black disabled:text-lm-muted transition-colors"
              >
                Generate Calendar
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                {loading ? 'Generating…' : 'Content Calendar'}
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
