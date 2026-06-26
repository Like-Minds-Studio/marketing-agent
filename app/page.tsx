'use client'

import { useState, useCallback, useEffect } from 'react'
import ChatTab from '@/components/ChatTab'
import StrategyTab from '@/components/StrategyTab'
import ProposalTab from '@/components/ProposalTab'
import CalendarTab from '@/components/CalendarTab'
import HistoryPanel from '@/components/HistoryPanel'
import ContextSidebar from '@/components/ContextSidebar'
import OnboardingModal from '@/components/OnboardingModal'
import { SavedConversation } from '@/lib/types'

type Tab = 'chat' | 'strategy' | 'proposal' | 'calendar'

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'chat', label: 'Chat', hint: 'Open-ended marketing assistant' },
  { id: 'strategy', label: 'Strategy', hint: 'CEO-level advisory with guided prompts' },
  { id: 'proposal', label: 'Proposal', hint: 'Generate a formatted Like Minds proposal' },
  { id: 'calendar', label: 'Content Calendar', hint: 'Full week of social posts in one click' },
]

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [davidContext, setDavidContext] = useState('')
  const [pendingConversation, setPendingConversation] = useState<SavedConversation | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [onboarded, setOnboarded] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDavidContext(localStorage.getItem('lm_david_context') || '')
    setOnboarded(!!localStorage.getItem('lm_onboarded'))
    setMounted(true)
  }, [])

  function dismissOnboarding() {
    localStorage.setItem('lm_onboarded', '1')
    setOnboarded(true)
  }

  function handleLoadConversation(conv: SavedConversation) {
    setPendingConversation(conv)
    setActiveTab('chat')
    setHistoryOpen(false)
  }

  const handlePendingLoaded = useCallback(() => {
    setPendingConversation(null)
  }, [])

  const handleSave = useCallback(() => {
    setHistoryRefresh((n) => n + 1)
  }, [])

  const hasContext = davidContext.trim().length > 0

  return (
    <div className="flex flex-col h-screen bg-[#090909] text-white overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-white/8 bg-[#0d0d0d]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-3 h-14">

          {/* Logo wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-[#AE8ADD] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(174,138,221,0.3)]">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black">
                <path d="M4 4h4v12H4zM10 4h4v12h-4zM16 4h4v12h-4zM4 18h16v2H4z" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[13px] font-black tracking-[0.18em] text-[#F0EDE4] uppercase">
                Like Minds
                <span className="text-[#AE8ADD] align-super text-[8px] ml-0.5">®</span>
              </span>
              <span className="text-[9px] tracking-[0.25em] text-white/25 uppercase mt-0.5">Studio</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-white/10 mx-1 shrink-0" />

          {/* Tabs */}
          <nav className="flex-1 flex items-center overflow-x-auto gap-0.5 no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.hint}
                className={`group relative shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-[#AE8ADD]'
                    : 'text-white/35 hover:text-white/65 hover:bg-white/4'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#AE8ADD] rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* History */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/65 hover:bg-white/6 transition-colors"
              title="Chat history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Context toggle */}
            <button
              onClick={() => setContextOpen(true)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                hasContext
                  ? 'bg-[#AE8ADD]/10 border-[#AE8ADD]/25 text-[#AE8ADD] hover:bg-[#AE8ADD]/15'
                  : 'bg-white/4 border-white/10 text-white/35 hover:text-white/60 hover:bg-white/8'
              }`}
              title="My business context"
            >
              {hasContext && (
                <span className="w-1.5 h-1.5 bg-[#AE8ADD] rounded-full animate-pulse" />
              )}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:block">My Context</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'chat' && (
          <ChatTab
            pendingConversation={pendingConversation}
            onPendingLoaded={handlePendingLoaded}
            onSave={handleSave}
            davidContext={davidContext}
          />
        )}
        {activeTab === 'strategy' && <StrategyTab davidContext={davidContext} />}
        {activeTab === 'proposal' && <ProposalTab davidContext={davidContext} />}
        {activeTab === 'calendar' && <CalendarTab davidContext={davidContext} />}
      </div>

      {/* Panels & modals */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={handleLoadConversation}
        refreshTrigger={historyRefresh}
      />
      <ContextSidebar
        open={contextOpen}
        onClose={() => setContextOpen(false)}
        value={davidContext}
        onChange={setDavidContext}
      />
      {mounted && !onboarded && <OnboardingModal onDismiss={dismissOnboarding} />}
    </div>
  )
}
