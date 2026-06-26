'use client'

import { useState, useCallback } from 'react'
import ChatTab from '@/components/ChatTab'
import ProposalTab from '@/components/ProposalTab'
import CalendarTab from '@/components/CalendarTab'
import HistoryPanel from '@/components/HistoryPanel'
import { SavedConversation } from '@/lib/types'

type Tab = 'chat' | 'proposal' | 'calendar'

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'proposal', label: 'Proposal Generator' },
  { id: 'calendar', label: 'Content Calendar' },
]

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pendingConversation, setPendingConversation] = useState<SavedConversation | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)

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

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-white/10 bg-black/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-0 flex items-center gap-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 bg-[#AE8ADD] rounded flex items-center justify-center">
              <span className="text-[10px] font-black text-black tracking-tighter">LM</span>
            </div>
            <span className="font-semibold text-sm tracking-wide text-white hidden sm:block">
              LIKE MINDS<span className="text-[#AE8ADD] align-super text-[9px] ml-0.5">®</span>
            </span>
          </div>

          {/* Tabs */}
          <nav className="flex-1 flex items-center overflow-x-auto gap-1 mx-2 no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#AE8ADD]/15 text-[#AE8ADD] border border-[#AE8ADD]/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* History */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            title="Chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:block text-xs">History</span>
          </button>
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'chat' && (
          <ChatTab
            pendingConversation={pendingConversation}
            onPendingLoaded={handlePendingLoaded}
            onSave={handleSave}
          />
        )}
        {activeTab === 'proposal' && <ProposalTab />}
        {activeTab === 'calendar' && <CalendarTab />}
      </div>

      {/* History panel */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={handleLoadConversation}
        refreshTrigger={historyRefresh}
      />
    </div>
  )
}
