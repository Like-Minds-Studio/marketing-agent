'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message, SavedConversation } from '@/lib/types'
import { upsertConversation, generateId } from '@/lib/storage'

const STARTER_PROMPTS = [
  'Write a LinkedIn post about our multi-site rollout expertise',
  'Create 5 Instagram captions for our Go-Getter audience',
  'Draft a cold outreach email to a hospitality investor',
  'Write a Reels script about the 1 Remedy wellness concept',
  'Build a content calendar for this week across all platforms',
  'Give me positioning language for a hotel group pitch',
]

interface Props {
  pendingConversation: SavedConversation | null
  onPendingLoaded: () => void
  onSave: () => void
}

export default function ChatTab({ pendingConversation, onPendingLoaded, onSave }: Props) {
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

  // Load a conversation from history
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
      const now = new Date().toISOString()
      const existing = msgs.length > 2
      upsertConversation({
        id,
        title,
        createdAt: now,
        updatedAt: now,
        messages: msgs,
      })
      if (!existing) onSave()
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
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMessage])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
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

      const finalMessages = [...newMessages, { role: 'assistant' as const, content: accumulated }]
      persist(finalMessages, conversationId)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-[#AE8ADD]/15 border border-[#AE8ADD]/30 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-xl font-black text-[#AE8ADD] tracking-tighter">LM</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Your Like Minds marketing AI
            </h1>
            <p className="text-white/50 text-sm max-w-md leading-relaxed mb-10">
              Ask me anything — social posts, proposals, campaign ideas, pitch copy, or content strategy. I know the brand, the clients, and the tone.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#AE8ADD]/40 rounded-xl px-4 py-3 transition-all duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {/* New chat button when in a conversation */}
            <div className="flex justify-end">
              <button
                onClick={startNewChat}
                className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                + New chat
              </button>
            </div>

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 w-7 h-7 bg-[#AE8ADD]/15 border border-[#AE8ADD]/30 rounded-lg flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-black text-[#AE8ADD] tracking-tighter">LM</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#AE8ADD] text-black font-medium rounded-br-sm'
                      : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && msg.content ? (
                    <div className="prose prose-invert prose-sm max-w-none
                      prose-headings:font-bold prose-headings:text-white prose-headings:mt-4 prose-headings:mb-2
                      prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                      prose-p:text-white/80 prose-p:my-2 prose-p:leading-relaxed
                      prose-strong:text-white
                      prose-ul:text-white/80 prose-ol:text-white/80 prose-li:my-0.5
                      prose-hr:border-white/10
                      prose-code:text-[#AE8ADD] prose-code:bg-white/5 prose-code:px-1 prose-code:rounded
                      prose-blockquote:border-[#AE8ADD] prose-blockquote:text-white/60
                      prose-a:text-[#AE8ADD] prose-a:no-underline hover:prose-a:underline
                      prose-table:text-sm prose-th:text-white/70 prose-td:text-white/70">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <span className="inline-flex gap-1 items-center text-white/40">
                      <span className="w-1.5 h-1.5 bg-[#AE8ADD] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-[#AE8ADD] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-[#AE8ADD] rounded-full animate-bounce" />
                    </span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="shrink-0 w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-bold text-white/60">D</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 bg-black/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-3 bg-white/5 border border-white/10 focus-within:border-[#AE8ADD]/50 rounded-2xl px-4 py-3 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about marketing, content, proposals…"
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none focus:outline-none leading-relaxed"
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="shrink-0 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
              >
                <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="shrink-0 w-8 h-8 bg-[#AE8ADD] disabled:bg-white/10 hover:bg-[#C4A3E8] disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-black rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-[11px] text-white/20 text-center mt-2">
            Press Enter to send · Shift+Enter for new line · Conversations saved automatically
          </p>
        </div>
      </div>
    </div>
  )
}
