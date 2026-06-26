'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

interface ToolPageProps {
  title: string
  description: string
  inputLabel: string
  inputPlaceholder: string
  inputType: 'url' | 'text'
  tool: string
  exampleInputs: string[]
  icon: string
}

export default function ToolPage({
  title,
  description,
  inputLabel,
  inputPlaceholder,
  inputType,
  tool,
  exampleInputs,
  icon,
}: ToolPageProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    setOutput('')
    setError('')
    setLoading(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, input: input.trim() }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Server error ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setOutput((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(output)
  }

  function handleReset() {
    setInput('')
    setOutput('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Tools
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="font-semibold text-white">{title}</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tool header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400">{description}</p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {inputLabel}
          </label>
          <div className="flex gap-3">
            <input
              type={inputType === 'url' ? 'text' : 'text'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              disabled={loading}
            />
            {loading ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Analyze
              </button>
            )}
          </div>

          {/* Example inputs */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Try:</span>
            {exampleInputs.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInput(ex)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading indicator */}
        {loading && !output && (
          <div className="flex items-center gap-3 text-gray-400 mb-6">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
            </div>
            <span className="text-sm">Analyzing — this takes 30–60 seconds...</span>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="relative">
            {/* Action bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-violet-400">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                    Generating...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500"
                >
                  Copy Markdown
                </button>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500"
                >
                  New Analysis
                </button>
              </div>
            </div>

            {/* Markdown output */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-auto">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:font-bold prose-headings:text-white
                prose-h1:text-2xl prose-h1:mb-4
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-violet-300
                prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-gray-200
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-strong:text-white
                prose-ul:text-gray-300 prose-ol:text-gray-300
                prose-li:my-0.5
                prose-table:text-sm prose-table:w-full
                prose-thead:border-gray-700
                prose-th:text-gray-200 prose-th:font-semibold prose-th:px-3 prose-th:py-2
                prose-td:text-gray-300 prose-td:px-3 prose-td:py-2 prose-td:border-gray-800
                prose-tr:border-gray-800
                prose-code:text-violet-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded
                prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                prose-blockquote:border-violet-500 prose-blockquote:text-gray-400
                prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
                prose-hr:border-gray-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
