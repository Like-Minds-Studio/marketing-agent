'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message, SavedConversation } from '@/lib/types'
import { generateId } from '@/lib/storage'

async function saveToSupabase(id: string, title: string, messages: Message[]) {
  try {
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, messages }),
    })
  } catch {}
}

function extractMemory(userMessage: string, assistantMessage: string) {
  // Fire-and-forget — never awaited
  fetch('/api/memory/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, assistantMessage }),
  }).catch(() => {})
}

const STARTER_PROMPTS = [
  'What should I prioritise this week — LM Studio, Good Sides, or 1 Remedy?',
  'Help me prep for a pitch meeting with a new hotel group prospect',
  'Give me a straight read on my biggest business risk right now',
  'How should I price a 400sqm restaurant fit-out at full D&C scope?',
  "A prospect went quiet after our proposal — how do I re-engage without looking desperate?",
  'Write a LinkedIn post about why most hospitality fitouts go wrong',
]

interface Props {
  pendingConversation: SavedConversation | null
  onPendingLoaded: () => void
  onSave: () => void
  davidContext: string
}

export default function ChatTab({ pendingConversation, onPendingLoaded, onSave, davidContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>(() => generateId())
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!pendingConversation) return
    setMessages(pendingConversation.messages)
    setConversationId(pendingConversation.id)
    onPendingLoaded()
  }, [pendingConversation, onPendingLoaded])

  const persist = useCallback(
    (msgs: Message[], id: string) => {
      if (msgs.length === 0) return
      const firstUser = msgs.find((m) => m.role === 'user')
      const title = firstUser
        ? firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '')
        : 'Untitled'
      saveToSupabase(id, title, msgs)
      onSave()
    },
    [onSave]
  )

  function startNewChat() {
    if (loading) abortRef.current?.abort()
    setMessages([])
    setInput('')
    setConversationId(generateId())
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    abortRef.current = new AbortController()
    setMessages([...newMessages, { role: 'assistant', content: '' }])

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
        setMessages([...newMessages, { role: 'assistant', content: accumulated }])
      }
      persist([...newMessages, { role: 'assistant', content: accumulated }], conversationId)
      // Background memory extraction — fire and forget
      if (accumulated.length > 100) {
        extractMemory(text.trim(), accumulated)
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleStop() { abortRef.current?.abort(); setLoading(false) }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-lm-lilac/12 border border-lm-lilac/25 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-xl font-black text-lm-lilac tracking-tighter">LM</span>
            </div>
            <h1 className="text-2xl font-bold text-lm-bone mb-3 tracking-tight">What&apos;s on your mind?</h1>
            <p className="text-lm-warm text-sm max-w-md leading-relaxed mb-10">
              Ask anything — growth decisions, client situations, BD plays, pricing, content. I know Like Minds, your partners, your live projects, and how you like to work.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm text-lm-warm hover:text-lm-bone bg-lm-bone/3 hover:bg-lm-bone/6 border border-lm-bone/8 hover:border-lm-lilac/30 rounded-xl px-4 py-3 transition-all duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <div className="flex justify-end">
              <button
                onClick={startNewChat}
                className="text-xs text-lm-muted hover:text-lm-warm transition-colors px-3 py-1.5 rounded-lg hover:bg-lm-bone/5"
              >
                + New chat
              </button>
            </div>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="shrink-0 w-7 h-7 bg-lm-lilac/12 border border-lm-lilac/25 rounded-lg flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-black text-lm-lilac tracking-tighter">LM</span>
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-lm-lilac text-black font-medium rounded-br-sm'
                    : 'bg-lm-surface border border-lm-bone/8 text-lm-bone/90 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && msg.content ? (
                    <div className="prose prose-invert prose-sm max-w-none
                      prose-headings:font-bold prose-headings:text-lm-bone prose-headings:mt-4 prose-headings:mb-2
                      prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                      prose-p:text-lm-bone/80 prose-p:my-2 prose-p:leading-relaxed
                      prose-strong:text-lm-bone
                      prose-ul:text-lm-bone/80 prose-ol:text-lm-bone/80 prose-li:my-0.5
                      prose-hr:border-lm-bone/10
                      prose-code:text-lm-lilac prose-code:bg-lm-bone/5 prose-code:px-1 prose-code:rounded
                      prose-blockquote:border-lm-lilac prose-blockquote:text-lm-warm
                      prose-a:text-lm-lilac prose-a:no-underline hover:prose-a:underline
                      prose-table:text-sm prose-th:text-lm-warm prose-td:text-lm-bone/70">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.role === 'user' ? msg.content : (
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-lm-lilac rounded-full animate-bounce" />
                    </span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="shrink-0 w-7 h-7 bg-lm-bone/8 rounded-lg flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-bold text-lm-warm">D</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-lm-bone/8 bg-lm-bg/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-3 bg-lm-surface border border-lm-bone/10 focus-within:border-lm-lilac/40 rounded-2xl px-4 py-3 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — strategy, growth, client situations, pricing, BD, content…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-lm-bone placeholder-lm-muted resize-none focus:outline-none leading-relaxed"
            />
            {loading ? (
              <button onClick={handleStop} className="shrink-0 w-8 h-8 bg-lm-bone/8 hover:bg-lm-bone/12 rounded-xl flex items-center justify-center transition-colors">
                <svg className="w-3 h-3 text-lm-warm" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
              </button>
            ) : (
              <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="shrink-0 w-8 h-8 bg-lm-lilac disabled:bg-lm-bone/8 hover:bg-[#C4A3E8] disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-black rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-[11px] text-lm-muted text-center mt-2">Enter to send · Shift+Enter for new line · Saved automatically</p>
        </div>
      </div>
    </div>
  )
}
