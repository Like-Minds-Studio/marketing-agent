'use client'

import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import type { Slide, CarouselData } from '@/app/api/visual/route'

const FORMATS = [
  { id: 'Instagram Feed (1:1)', label: 'Feed', dims: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'Instagram Story (9:16)', label: 'Story', dims: '1080 × 1920', w: 1080, h: 1920 },
  { id: 'LinkedIn (1.91:1)', label: 'LinkedIn', dims: '1200 × 628', w: 1200, h: 628 },
]

// ─── Slide themes ──────────────────────────────────────────────────────────
const SLIDE_THEMES = [
  // 0 — dark warm charcoal (hook / dramatic)
  { bg: '#1C1814', headline: '#F0EDE4', body: '#9e8d7a', stat: '#AE8ADD', statLabel: '#9e8d7a', accent: '#AE8ADD', counter: '#5a5047', footerBorder: 'rgba(240,237,228,0.07)', gradient: 'radial-gradient(ellipse at 10% 90%, rgba(126,102,74,0.12) 0%, transparent 60%)', logoBg: '#AE8ADD', logoText: '#000000', siteTxt: '#5a5047' },
  // 1 — bone cream (editorial / light)
  { bg: '#F0EDE4', headline: '#1A1410', body: '#5a5047', stat: '#7B5CAD', statLabel: '#9e8d7a', accent: '#7B5CAD', counter: '#9e8d7a', footerBorder: 'rgba(28,24,20,0.12)', gradient: 'radial-gradient(ellipse at 90% 10%, rgba(123,92,173,0.05) 0%, transparent 60%)', logoBg: '#7B5CAD', logoText: '#ffffff', siteTxt: '#9e8d7a' },
  // 2 — lilac brand pop
  { bg: '#AE8ADD', headline: '#0E0C0A', body: '#2C1F46', stat: '#0E0C0A', statLabel: 'rgba(14,12,10,0.55)', accent: '#0E0C0A', counter: 'rgba(14,12,10,0.38)', footerBorder: 'rgba(14,12,10,0.14)', gradient: 'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 60%)', logoBg: '#0E0C0A', logoText: '#AE8ADD', siteTxt: 'rgba(14,12,10,0.45)' },
  // 3 — warm espresso brown
  { bg: '#281D12', headline: '#F0EDE4', body: '#9e8d7a', stat: '#AE8ADD', statLabel: '#9e8d7a', accent: '#AE8ADD', counter: '#5a5047', footerBorder: 'rgba(240,237,228,0.07)', gradient: 'radial-gradient(ellipse at 80% 20%, rgba(174,138,221,0.08) 0%, transparent 60%)', logoBg: '#AE8ADD', logoText: '#000000', siteTxt: '#5a5047' },
  // 4 — warm sand (CTA / editorial)
  { bg: '#DDD5C5', headline: '#1A1410', body: '#5a5047', stat: '#7B5CAD', statLabel: '#9e8d7a', accent: '#7B5CAD', counter: '#9e8d7a', footerBorder: 'rgba(28,24,20,0.12)', gradient: 'none', logoBg: '#7B5CAD', logoText: '#ffffff', siteTxt: '#9e8d7a' },
]

// ─── Slide renderer (used for both preview and export) ─────────────────────
function SlideCard({
  slide,
  index,
  total,
  w,
  h,
  logoError,
  onLogoError,
}: {
  slide: Slide
  index: number
  total: number
  w: number
  h: number
  logoError: boolean
  onLogoError: () => void
}) {
  const theme = SLIDE_THEMES[index % SLIDE_THEMES.length]
  const isLandscape = w > h
  const headlineSize = isLandscape ? '52px' : slide.headline.length > 30 ? '60px' : '76px'
  const bodySize = isLandscape ? '24px' : '30px'
  const padding = isLandscape ? '60px' : '80px'
  const statSize = isLandscape ? '90px' : '120px'

  return (
    <div
      style={{
        width: `${w}px`,
        height: `${h}px`,
        background: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding,
        position: 'relative',
        fontFamily: 'var(--font-geist-sans), "Helvetica Neue", Helvetica, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Gradient overlay */}
      {theme.gradient !== 'none' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: theme.gradient,
          pointerEvents: 'none',
        }} />
      )}

      {/* Accent bar */}
      <div style={{
        position: 'absolute',
        top: padding,
        left: isLandscape ? '50px' : '72px',
        width: '3px',
        height: isLandscape ? '40px' : '56px',
        background: theme.accent,
        borderRadius: '2px',
      }} />

      {/* Slide counter */}
      <div style={{
        position: 'absolute',
        top: padding,
        right: padding,
        fontSize: '13px',
        color: theme.counter,
        letterSpacing: '0.15em',
        fontWeight: '500',
      }}>
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>

      {/* Main content */}
      <div style={{ paddingTop: isLandscape ? '20px' : '40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {slide.isStat && slide.stat ? (
          <>
            <div style={{
              fontSize: statSize, fontWeight: '800', color: theme.stat,
              lineHeight: '1', letterSpacing: '-0.04em', marginBottom: '16px',
            }}>
              {slide.stat}
            </div>
            <div style={{
              fontSize: isLandscape ? '22px' : '26px', color: theme.statLabel,
              fontWeight: '500', letterSpacing: '0.02em', marginBottom: '24px',
              textTransform: 'uppercase',
            }}>
              {slide.statLabel}
            </div>
          </>
        ) : null}

        <div style={{
          fontSize: headlineSize, fontWeight: '800', color: theme.headline,
          lineHeight: '1.08', letterSpacing: '-0.025em',
          marginBottom: slide.body ? '28px' : '0',
          maxWidth: '900px',
        }}>
          {slide.headline}
        </div>

        {slide.body && (
          <div style={{
            fontSize: bodySize, color: theme.body, lineHeight: '1.6',
            fontWeight: '400', maxWidth: isLandscape ? '800px' : '840px',
          }}>
            {slide.body}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '24px',
        borderTop: `1px solid ${theme.footerBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!logoError ? (
            <img
              src="/logo.png"
              alt="Like Minds Studio"
              style={{ height: isLandscape ? '28px' : '36px', width: 'auto', objectFit: 'contain' }}
              onError={onLogoError}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: isLandscape ? '28px' : '34px',
                height: isLandscape ? '28px' : '34px',
                background: theme.logoBg, borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '9px', fontWeight: '900', color: theme.logoText, letterSpacing: '-0.05em' }}>LM</span>
              </div>
              <span style={{
                fontSize: isLandscape ? '11px' : '13px', fontWeight: '700',
                color: theme.headline, letterSpacing: '0.2em', textTransform: 'uppercase',
              }}>
                Like Minds<span style={{ color: theme.accent, fontSize: '8px', verticalAlign: 'super' }}>®</span>
              </span>
            </div>
          )}
        </div>
        <span style={{
          fontSize: '11px', color: theme.siteTxt, letterSpacing: '0.12em',
          fontWeight: '500', textTransform: 'uppercase',
        }}>
          likemindsstudio.com
        </span>
      </div>
    </div>
  )
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

interface Props { davidContext: string; onSave?: () => void }

export default function VisualsTab({ davidContext, onSave }: Props) {
  const [request, setRequest] = useState('')
  const [format, setFormat] = useState(FORMATS[0])
  const [data, setData] = useState<CarouselData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoError, setLogoError] = useState(false)
  const [downloading, setDownloading] = useState<number | null>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  async function generate() {
    if (!request.trim() || loading) return
    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await fetch('/api/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, format: format.id, davidContext }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong')
      setData(json)
      saveConversation('[Visuals] ' + request.trim().slice(0, 55), [
        { role: 'user', content: request },
        { role: 'assistant', content: json.title || 'Carousel generated' },
      ])
      extractMemory(request, json.title || 'Carousel generated')
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  async function downloadSlide(index: number) {
    const el = slideRefs.current[index]
    if (!el) return
    setDownloading(index)
    try {
      const dataUrl = await toPng(el, { pixelRatio: 1, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `like-minds-slide-${index + 1}.png`
      a.click()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setDownloading(null)
    }
  }

  async function downloadAll() {
    if (!data) return
    for (let i = 0; i < data.slides.length; i++) {
      await downloadSlide(i)
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  async function copyCaption() {
    if (data?.caption) await navigator.clipboard.writeText(`${data.caption}\n\n${data.hashtags}`)
  }

  const SCALE = 0.3
  const previewW = Math.round(format.w * SCALE)
  const previewH = Math.round(format.h * SCALE)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hidden full-res slides for export */}
      <div style={{ position: 'fixed', left: '-99999px', top: 0, zIndex: -1 }}>
        {data?.slides.map((slide, i) => (
          <div key={i} ref={(el) => { slideRefs.current[i] = el }}>
            <SlideCard
              slide={slide}
              index={i}
              total={data.slides.length}
              w={format.w}
              h={format.h}
              logoError={logoError}
              onLogoError={() => setLogoError(true)}
            />
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-7">
          <h2 className="text-xl font-bold text-lm-bone tracking-tight mb-1">Visual Posts</h2>
          <p className="text-sm text-lm-warm">
            Describe what you want — get branded slides you can download as PNG and post directly.
          </p>
        </div>

        {/* Form */}
        <div className="bg-lm-surface border border-lm-bone/8 rounded-2xl p-5 space-y-4">
          {/* Format picker */}
          <div>
            <label className="block text-xs font-medium text-lm-muted mb-2 uppercase tracking-widest">Format</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    format.id === f.id
                      ? 'bg-lm-lilac/15 border-lm-lilac/40 text-lm-lilac'
                      : 'bg-lm-bone/4 border-lm-bone/10 text-lm-muted hover:text-lm-warm hover:border-lm-bone/20'
                  }`}
                >
                  <span className="block">{f.label}</span>
                  <span className="block text-[10px] opacity-60 mt-0.5">{f.dims}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Request input */}
          <div>
            <label className="block text-xs font-medium text-lm-muted mb-2 uppercase tracking-widest">What do you want?</label>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
              placeholder="e.g. Turn our multi-site rollout system into a 5-slide carousel · Make a 3-slide post about the Kumori launch · Create a story about the 9-step customer journey"
              rows={3}
              disabled={loading}
              className="w-full bg-lm-bone/4 border border-lm-bone/10 focus:border-lm-lilac/40 rounded-xl px-4 py-3 text-sm text-lm-bone placeholder-lm-muted/60 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={generate}
              disabled={!request.trim() || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-lm-lilac hover:bg-[#C4A3E8] disabled:bg-lm-bone/8 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-black disabled:text-lm-muted transition-colors"
            >
              {loading ? (
                <>
                  <span className="inline-flex gap-1">
                    <span className="w-1 h-1 bg-black/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 bg-black/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-black/50 rounded-full animate-bounce" />
                  </span>
                  Generating…
                </>
              ) : (
                <>
                  Generate Slides
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 bg-lm-fire/10 border border-lm-fire/25 rounded-xl text-sm text-lm-fire">
            {error}
          </div>
        )}

        {/* Slide previews */}
        {data && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-lm-bone tracking-wide">
                {data.slides.length} Slides · {format.label}
              </h3>
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 px-4 py-2 bg-lm-lilac/15 border border-lm-lilac/30 hover:bg-lm-lilac/20 rounded-xl text-xs font-semibold text-lm-lilac transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All
              </button>
            </div>

            {/* Slide grid */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {data.slides.map((slide, i) => (
                <div key={i} className="shrink-0">
                  <div
                    className="overflow-hidden rounded-xl border border-lm-bone/8 shadow-xl"
                    style={{ width: `${previewW}px`, height: `${previewH}px` }}
                  >
                    <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: `${format.w}px`, height: `${format.h}px` }}>
                      <SlideCard
                        slide={slide}
                        index={i}
                        total={data.slides.length}
                        w={format.w}
                        h={format.h}
                        logoError={logoError}
                        onLogoError={() => setLogoError(true)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => downloadSlide(i)}
                    disabled={downloading === i}
                    className="w-full mt-2 py-1.5 rounded-lg text-xs text-lm-muted hover:text-lm-bone hover:bg-lm-bone/5 transition-colors text-center border border-transparent hover:border-lm-bone/10"
                  >
                    {downloading === i ? 'Saving…' : `↓ Slide ${i + 1}`}
                  </button>
                </div>
              ))}
            </div>

            {/* Caption & Hashtags */}
            <div className="mt-6 bg-lm-surface border border-lm-bone/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-lm-muted uppercase tracking-widest">Caption & Hashtags</span>
                <button
                  onClick={copyCaption}
                  className="flex items-center gap-1.5 text-xs text-lm-muted hover:text-lm-bone transition-colors px-3 py-1 rounded-lg hover:bg-lm-bone/5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <p className="text-sm text-lm-bone/80 leading-relaxed mb-3 whitespace-pre-wrap">{data.caption}</p>
              <p className="text-xs text-lm-lilac/70 leading-relaxed">{data.hashtags}</p>
            </div>

            <div className="mt-4 px-4 py-3 bg-lm-bone/3 border border-lm-bone/8 rounded-xl">
              <p className="text-xs text-lm-muted leading-relaxed">
                <span className="text-lm-warm font-medium">Note:</span> Drop your actual logo at{' '}
                <code className="text-lm-lilac/80 bg-lm-bone/5 px-1 py-0.5 rounded text-[11px]">public/logo.png</code>{' '}
                and it will appear on every slide. The favicon updates too.
              </p>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}
