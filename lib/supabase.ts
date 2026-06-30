import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
// Service role key bypasses RLS — safe here because this file is server-side only.
// Never import this module in client components.
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY

// Returns null when env vars aren't set — routes handle this gracefully
export const supabase = url && key ? createClient(url, key) : null

export interface ConversationRow {
  id: string
  title: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  created_at: string
  updated_at: string
}

export interface MemoryRow {
  id: string
  content: string
  created_at: string
}
