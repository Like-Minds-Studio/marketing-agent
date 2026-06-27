'use client'

import { useState } from 'react'

const STEPS = [
  {
    title: 'Welcome, David.',
    body: "Your private CEO advisor — pre-loaded with Like Minds Studio's full context: business model, active deals, partners, team, financials, and live projects. Everything it needs to give you real advice, not generic information.",
    hint: null,
    badge: null,
  },
  {
    title: 'Chat — your strategic advisor',
    body: 'Ask anything: growth decisions, client situations, BD plays, pricing calls, content ideas, email drafts. It thinks like a trusted CEO advisor — direct, specific, no corporate fluff.',
    hint: "No need to over-explain. Say what's on your mind — it already knows Like Minds, the team, the partners, and your live projects.",
    badge: 'Chat',
  },
  {
    title: 'Strategy — CEO-level advisory',
    body: 'Strategic decisions, growth planning, venture building. Pick a guided prompt or type your own — get a structured recommendation with clear actions.',
    hint: 'Use the prompt chips so you don\'t have to type much. Replace [brackets] with your specifics.',
    badge: 'Strategy',
  },
  {
    title: 'Visuals — branded slide posts',
    body: 'Describe a post or carousel and get fully branded slide images (1080×1080) with your Like Minds branding — ready to download and post.',
    hint: 'Drop your logo at public/logo.png and it appears on every slide automatically.',
    badge: 'Visuals',
  },
  {
    title: 'Make it personal',
    body: 'Hit "My Context" in the top-right to tell the AI what you\'re actually working on — current goals, live deals, challenges. It personalises every response to your real situation.',
    hint: 'Update it whenever something changes. The more context you give, the sharper the advice.',
    badge: null,
  },
]

interface Props { onDismiss: () => void }

export default function OnboardingModal({ onDismiss }: Props) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-lm-surface border border-lm-bone/12 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-[3px] bg-lm-bone/5">
          <div className="h-full bg-lm-lilac transition-all duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="p-8">
          {/* Badge or icon */}
          <div className="mb-5">
            {step === 0 ? (
              <div className="w-12 h-12 bg-lm-lilac rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(174,138,221,0.25)]">
                <span className="text-lg font-black text-black tracking-tighter">LM</span>
              </div>
            ) : current.badge ? (
              <span className="inline-flex items-center px-3 py-1.5 bg-lm-lilac/12 border border-lm-lilac/25 rounded-lg text-xs font-semibold text-lm-lilac tracking-wide">
                {current.badge}
              </span>
            ) : (
              <div className="w-9 h-9 border border-lm-bone/15 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-lm-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          <h2 className="text-lg font-bold text-lm-bone mb-3 leading-tight">{current.title}</h2>
          <p className="text-sm text-lm-warm leading-relaxed mb-4">{current.body}</p>

          {current.hint && (
            <div className="bg-lm-raised border border-lm-bone/8 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-lm-muted leading-relaxed">
                <span className="text-lm-lilac font-medium">Tip: </span>{current.hint}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setStep(i)} className={`rounded-full transition-all ${i === step ? 'w-4 h-1.5 bg-lm-lilac' : 'w-1.5 h-1.5 bg-lm-bone/15 hover:bg-lm-bone/30'}`} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              {!isLast && (
                <button onClick={onDismiss} className="text-xs text-lm-muted hover:text-lm-warm transition-colors">Skip</button>
              )}
              <button
                onClick={() => isLast ? onDismiss() : setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-lm-lilac hover:bg-[#C4A3E8] rounded-xl text-sm font-semibold text-black transition-colors"
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
