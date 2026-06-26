'use client'

import { useState } from 'react'

const STEPS = [
  {
    icon: '⬛',
    title: 'Welcome, David.',
    body: "This is your Like Minds AI advisor — built specifically for you, pre-loaded with everything about Like Minds Studio, your team, your clients, and your brand.",
    hint: null,
  },
  {
    icon: null,
    tabLabel: 'Chat',
    title: 'Open-ended marketing assistant',
    body: 'Ask anything — social captions, pitch copy, campaign ideas, email drafts, positioning language. It knows the Like Minds tone, your active projects, and your target audiences.',
    hint: 'Ask for an Instagram caption, a LinkedIn post, or a cold email and it writes it in your voice.',
  },
  {
    icon: null,
    tabLabel: 'Strategy',
    title: 'CEO-level advisory',
    body: "Strategic decisions, growth planning, financial framing, venture building. Pick a guided prompt or type your own — you'll get a structured recommendation, not just information.",
    hint: 'Use the prompt chips so you don\'t have to type much. Replace [brackets] with your specifics.',
  },
  {
    icon: null,
    tabLabel: 'Proposal / Calendar',
    title: 'Targeted document tools',
    body: 'Proposal Generator outputs a formatted Like Minds proposal from a single form. Content Calendar generates a full week of social posts across Instagram, LinkedIn, and TikTok.',
    hint: 'For social image/design requests in Chat, you\'ll get a Canva Brief — exact specs ready to build.',
  },
  {
    icon: null,
    contextIcon: true,
    title: 'Make it personal',
    body: "Click My Context in the top-right to tell the AI what you're actually working on — your current goals, live deals, challenges, revenue targets. It'll personalise every response to your real situation.",
    hint: 'Update it whenever something changes. The more context you give, the sharper the advice.',
  },
]

interface Props {
  onDismiss: () => void
}

export default function OnboardingModal({ onDismiss }: Props) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  function next() {
    if (isLast) {
      onDismiss()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-[#AE8ADD] transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Icon or tab badge */}
          <div className="mb-5">
            {step === 0 ? (
              <div className="w-12 h-12 bg-[#AE8ADD] rounded-xl flex items-center justify-center">
                <span className="text-lg font-black text-black tracking-tighter">LM</span>
              </div>
            ) : current.tabLabel ? (
              <span className="inline-flex items-center px-3 py-1.5 bg-[#AE8ADD]/15 border border-[#AE8ADD]/30 rounded-lg text-xs font-semibold text-[#AE8ADD] tracking-wide">
                {current.tabLabel}
              </span>
            ) : current.contextIcon ? (
              <div className="w-9 h-9 border border-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            ) : null}
          </div>

          <h2 className="text-lg font-bold text-[#F0EDE4] mb-3 leading-tight">{current.title}</h2>
          <p className="text-sm text-white/60 leading-relaxed mb-4">{current.body}</p>

          {current.hint && (
            <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-white/45 leading-relaxed">
                <span className="text-[#AE8ADD] font-medium">Tip: </span>
                {current.hint}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all ${
                    i === step ? 'w-4 h-1.5 bg-[#AE8ADD]' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {!isLast && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#AE8ADD] hover:bg-[#C4A3E8] rounded-xl text-sm font-semibold text-black transition-colors"
              >
                {isLast ? "Let's go" : 'Next'}
                {!isLast && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
