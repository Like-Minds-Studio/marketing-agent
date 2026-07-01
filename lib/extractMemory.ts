import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACT_PROMPT = `You are extracting business facts from a conversation to remember for future sessions.

Review the exchange below and extract ONLY specific, evolving facts about David's current business situation — things that change over time and would be useful context in a future conversation.

Extract:
- Live deal statuses (client name, stage, amount, urgency)
- Decisions David has made or is actively considering
- Current priorities, goals, or targets mentioned
- Specific problems or blockers being worked on
- Upcoming deadlines or milestones

Do NOT extract:
- General knowledge about Like Minds Studio (it's already in the system)
- Generic advice or strategy that doesn't reflect David's specific current state
- Things that don't change over time

Respond with ONLY a JSON array of short strings (under 100 chars each). If nothing worth remembering: []

Examples of good extractions:
["Kumori deal at $80k — client deciding this week", "Targeting Barangaroo for Good Sides flagship", "67 Pall Mall budget pressure — holding firm at $80k fee"]`

export async function extractAndSaveMemory(
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  if (!supabase) return
  try {
    const user = userMessage.slice(0, 5000)
    const assistant = assistantMessage.slice(0, 5000)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: EXTRACT_PROMPT,
      messages: [
        {
          role: 'user',
          content: `USER: ${user}\n\nASSISTANT: ${assistant.slice(0, 2000)}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim()
    const facts: string[] = JSON.parse(cleaned)

    if (facts.length > 0) {
      await supabase.from('memories').insert(facts.map((content) => ({ content })))
    }
  } catch {
    // best-effort
  }
}
