'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PromptChip {
  label: string
  prompt: string
}

interface Category {
  id: string
  label: string
  chips: PromptChip[]
}

const CATEGORIES: Category[] = [
  {
    id: 'growth',
    label: 'Growth & Scale',
    chips: [
      { label: 'Prioritise this quarter', prompt: 'How should I prioritise between Good Sides, 1 Remedy, and client work this quarter? Help me make a clear call.' },
      { label: 'Double revenue path', prompt: "What's my fastest, most realistic path to doubling Like Minds' revenue? Be direct — what specifically needs to change?" },
      { label: 'Hire vs stay lean', prompt: 'Should I hire now or stay lean? Walk me through the decision given where Like Minds is today.' },
      { label: 'Expand to new market', prompt: 'Is [Brisbane / Melbourne] ready for Like Minds? Help me evaluate the market opportunity and what it would take to enter.' },
      { label: 'Win hotel clients', prompt: 'What would it take to make hotels and large-scale operators our #1 client type? What needs to change in our approach, positioning, or BD?' },
    ],
  },
  {
    id: 'client',
    label: 'Client & BD',
    chips: [
      { label: 'Handle budget pushback', prompt: "A potential client is hesitating on budget. They love the work but are nervous about the investment. How do I handle this conversation without discounting?" },
      { label: 'Beat competitors', prompt: 'How should I position Like Minds against competing design and fit-out studios? What do we genuinely win on, and how do I make that land?' },
      { label: 'BD strategy for [segment]', prompt: 'Build me a business development strategy for [hotel groups / RSL clubs / multi-site F&B operators]. How do I get in front of them and convert?' },
      { label: 'Close a stalled deal', prompt: 'I have a prospect who went quiet after a great initial meeting. How do I re-engage without looking desperate?' },
      { label: 'Raise my fees', prompt: 'I want to increase my project fees. How do I do it without losing current clients and how do I position it correctly?' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial & Ops',
    chips: [
      { label: 'Project pricing model', prompt: 'Walk me through the right pricing model for a [design only / full design + build / end-to-end] project. What should my margins look like?' },
      { label: 'Build a business case', prompt: 'Help me build a business case for [hiring a new senior designer / opening a Brisbane studio / investing in a new software system].' },
      { label: 'Biggest risks right now', prompt: "What are my biggest financial and operational risks right now? Be honest — what should I be worried about that I might not be thinking about?" },
      { label: 'Multi-site fee structure', prompt: 'How should I structure fees for a multi-site rollout client? I want to reward their volume without undervaluing our work.' },
    ],
  },
  {
    id: 'ventures',
    label: 'Good Sides & 1 Remedy',
    chips: [
      { label: 'Good Sides 90-day plan', prompt: 'Give me a 90-day launch plan for Good Sides at [Barangaroo / Met Centre / Pitt St]. What are the critical path items?' },
      { label: '1 Remedy expansion model', prompt: "What's the right model for 1 Remedy's expansion — franchise, licence, company-owned? Help me think through the options." },
      { label: 'Fund next stage', prompt: 'How do I fund the next stage of [Good Sides / 1 Remedy] without giving away too much equity too early?' },
      { label: 'Balance ventures vs client work', prompt: 'How do I think about the tradeoff between running Like Minds client work and building my own concepts? When do I dedicate more time to the ventures?' },
    ],
  },
  {
    id: 'brand',
    label: 'Personal Brand',
    chips: [
      { label: "Sydney's go-to voice", prompt: "I want to become Sydney's go-to voice on hospitality design and fit-out. Give me a 6-month personal brand plan to build that positioning." },
      { label: 'LinkedIn investor content', prompt: 'What should I post on LinkedIn to attract investors for Good Sides and 1 Remedy without it feeling like a pitch?' },
      { label: 'Speaking opportunity prep', prompt: 'Help me prepare a pitch/talk on [the future of hospitality design / what operators get wrong about fit-out / the multi-site rollout playbook]. What are the key points and story arc?' },
      { label: 'PR and media strategy', prompt: "How do I get Like Minds and David Veksler into the hospitality trade press and mainstream business media? What's the story and who should I be talking to?" },
    ],
  },
  {
    id: 'tableone',
    label: 'Table One',
    chips: [
      { label: 'Revenue performance', prompt: 'Walk me through how Table One is performing against its revenue targets. What are the key levers I should be pulling right now?' },
      { label: 'Ops bottleneck', prompt: "What's the biggest operational bottleneck at Table One right now? Help me diagnose it and give me a fix I can implement this week." },
      { label: 'Team and hiring', prompt: 'Do I have the right team structure for Table One at this stage? Who is the next critical hire and how should I think about the role?' },
      { label: 'Growth vs. profitability', prompt: 'Should Table One be focused on growth or profitability right now? Help me make the call given where the business is.' },
      { label: 'BD and pipeline', prompt: "How should I be building Table One's client pipeline? What's the most efficient path to more revenue given current capacity?" },
    ],
  },
  {
    id: 'nofilter',
    label: 'No Filter',
    chips: [
      { label: 'Business model clarity', prompt: 'Help me get clear on the No Filter business model. What is it really selling, who is the core customer, and what should the revenue engine look like?' },
      { label: 'Position in the market', prompt: 'How should No Filter be positioned in the market? What does it need to own to stand out and win?' },
      { label: 'Prioritise this quarter', prompt: "What should No Filter be focused on this quarter? Help me cut through the noise and identify the 2-3 things that will actually move the needle." },
      { label: 'Resource allocation', prompt: 'How much of my time and capital should I be putting into No Filter right now vs. Like Minds and Table One? Help me think through the allocation.' },
    ],
  },
]

const STRATEGY_FRAMING = `[STRATEGIC ADVISORY REQUEST]

Respond as a senior business advisor who knows David Veksler and Like Minds Studio deeply. Structure your response exactly as:

**Situation Read**
2–3 sentences showing you understand the full context — the business, the stakes, and what's really being asked.

**Key Insight**
The single sharpest strategic observation. Bold, direct, no hedging.

**My Recommendation**
Specific, opinionated. What David should do — not a list of options. 3–5 sentences.

**3 Actions This Week**
Numbered list. Concrete. Each one completable in a single week.

---

David's question: `

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

interface Props { davidContext: string; onSave?: () => void }

export default function StrategyTab({ davidContext, onSave }: Props) {
  const [activeCategory, setActiveCategory] = useState('growth')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [followUpInput, setFollowUpInput] = useState('')
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])

  function selectChip(prompt: string) {
    setInput(prompt)
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }, 50)
  }

  async function generate() {
    if (!input.trim() || loading) return

    setOutput('')
    setFollowUpInput('')
    setConversationHistory([])
    setLoading(true)
    abortRef.current = new AbortController()

    const fullPrompt = STRATEGY_FRAMING + input.trim()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: fullPrompt }],
          davidContext,
        }),
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
      setConversationHistory([
        { role: 'user', content: fullPrompt },
        { role: 'assistant', content: accumulated },
      ])
      saveConversation('[Strategy] ' + input.trim().slice(0, 55), [
        { role: 'user', content: input.trim() },
        { role: 'assistant', content: accumulated },
      ])
      if (accumulated.length > 100) extractMemory(input.trim(), accumulated)
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      generate()
    }
  }

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory)!

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-lm-bone tracking-tight mb-1">Strategy Session</h2>
          <p className="text-sm text-lm-muted">
            CEO-level advisory. Pick a prompt or type your own — get a structured recommendation, not just information.
          </p>
        </div>

        {/* Prompt chips */}
        <div className="mb-5">
          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  activeCategory === cat.id
                    ? 'bg-lm-lilac/15 border-lm-lilac/40 text-lm-lilac'
                    : 'bg-lm-bone/5 border-lm-bone/10 text-lm-muted hover:text-lm-warm hover:border-lm-bone/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Chips for active category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentCategory.chips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => selectChip(chip.prompt)}
                className={`text-left text-sm px-4 py-3 rounded-xl border transition-all duration-150 ${
                  input === chip.prompt
                    ? 'bg-lm-lilac/10 border-lm-lilac/40 text-lm-bone/90'
                    : 'bg-lm-bone/4 border-lm-bone/8 text-lm-warm hover:text-lm-bone hover:bg-lm-bone/8 hover:border-lm-bone/20'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="bg-lm-bone/4 border border-lm-bone/10 focus-within:border-lm-lilac/40 rounded-2xl px-4 py-3 transition-colors mb-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Select a prompt above or type your strategic question…"
            rows={3}
            disabled={loading}
            className="w-full bg-transparent text-sm text-lm-bone placeholder-lm-muted/60 resize-none focus:outline-none leading-relaxed"
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-lm-bone/5">
            <p className="text-[11px] text-lm-muted">Prompts with [brackets] — replace with your specifics before sending</p>
            {loading ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-4 py-2 bg-lm-bone/10 hover:bg-lm-bone/12 rounded-xl text-xs text-lm-warm transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={!input.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-lm-lilac hover:bg-[#C4A3E8] disabled:bg-lm-bone/10 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-black disabled:text-lm-muted transition-colors"
              >
                Get Advice
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Output */}
        {(output || loading) && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-lm-lilac/15 border border-lm-lilac/30 rounded flex items-center justify-center">
                <span className="text-[8px] font-black text-lm-lilac">LM</span>
              </div>
              <span className="text-xs font-medium text-lm-muted uppercase tracking-widest">
                {loading ? 'Analysing…' : 'Advisory'}
              </span>
            </div>

            <div className="bg-lm-bone/4 border border-lm-bone/10 rounded-2xl px-6 py-5">
              {output ? (
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:font-bold prose-headings:text-lm-bone prose-headings:mt-5 prose-headings:mb-2
                  prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                  prose-p:text-lm-bone/80 prose-p:my-2 prose-p:leading-relaxed
                  prose-strong:text-lm-bone
                  prose-ul:text-lm-bone/80 prose-ol:text-lm-bone/80 prose-li:my-1
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

        {conversationHistory.length > 0 && !loading && (
          <div className="mt-3">
            <div className="bg-lm-bone/4 border border-lm-bone/10 focus-within:border-lm-lilac/40 rounded-2xl px-4 py-3 transition-colors">
              <textarea
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); followUp() } }}
                placeholder="Refine: make it shorter · push harder on the risk · add a financial angle · be more direct…"
                rows={2}
                className="w-full bg-transparent text-sm text-lm-bone placeholder-lm-muted/50 resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-lm-bone/5">
                <button
                  onClick={() => { setOutput(''); setConversationHistory([]); setFollowUpInput('') }}
                  className="text-xs text-lm-muted hover:text-lm-warm transition-colors"
                >
                  New question
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
