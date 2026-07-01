export interface TelegramSkill {
  description: string
  prompt: (args: string) => string
}

export const TELEGRAM_SKILLS: Record<string, TelegramSkill> = {
  brief: {
    description: 'Daily morning brief',
    prompt: () => `Generate David's daily morning brief. Based on everything you know about his businesses and current situation, produce:

1. TOP 3 PRIORITIES TODAY — the most important things he should focus on right now
2. TIME-SENSITIVE THIS WEEK — any deals, deadlines, or decisions that can't wait
3. ONE SHARP OBSERVATION — something insightful about the business he should be thinking about

Keep it tight, direct, no fluff. This is his morning coffee read.`,
  },

  audit: {
    description: '/audit <url> — Quick marketing audit of a website',
    prompt: (url) => `Run a quick marketing audit on: ${url || 'the URL provided'}

Analyse and respond with:
1. HEADLINE CLARITY — Does the homepage pass the 5-second test? What does it say and is it clear?
2. VALUE PROPOSITION — Is the core offer obvious? Who it's for?
3. CTA STRENGTH — What action are they driving and how compelling is it?
4. TRUST SIGNALS — Testimonials, social proof, credibility markers present?
5. TOP 3 QUICK WINS — Specific changes that would move the needle fast
6. OVERALL SCORE — X/10 with one sentence summary

Be blunt, be specific. No generic advice.`,
  },

  competitors: {
    description: '/competitors <url> — Competitive analysis',
    prompt: (url) => `Run a competitive analysis for: ${url || 'the business provided'}

Cover:
1. WHO ARE THE MAIN COMPETITORS — identify 3-5 direct competitors
2. HOW THEY POSITION — what each one leads with
3. PRICING LANDSCAPE — where does this business sit vs the market?
4. BIGGEST GAPS — what are competitors doing that this business isn't?
5. DIFFERENTIATION OPPORTUNITY — where is there white space to own?
6. STEAL-WORTHY TACTICS — 2-3 specific things worth borrowing

Be specific. Name real competitors, quote real positioning where you can.`,
  },

  proposal: {
    description: '/proposal <client name> — Generate a client proposal outline',
    prompt: (client) => `Generate a client proposal outline for: ${client || 'the client mentioned'}

Structure:
1. SITUATION — What's the client's current problem or opportunity (infer from context)
2. RECOMMENDED SCOPE — What Like Minds would deliver (be specific: brand strategy, campaign, event, etc.)
3. DELIVERABLES — Bullet list of tangible outputs
4. TIMELINE — Phased approach with rough timeframes
5. INVESTMENT — Suggested fee range based on scope (use Like Minds' typical rates)
6. WHY LIKE MINDS — 2-3 lines on why we're the right fit for this

Keep it punchy — this is a talking points outline David can take into a meeting, not a final document.`,
  },

  emails: {
    description: '/emails <topic> — Generate an email sequence',
    prompt: (topic) => `Write a 3-part email sequence for: ${topic || 'the topic provided'}

For each email provide:
- SUBJECT LINE (plus one alternative)
- PREVIEW TEXT
- BODY (concise, punchy — 150-250 words)
- CTA

Email 1: Welcome / Problem-aware (day 0)
Email 2: Solution / Value (day 3)
Email 3: Social proof + urgency (day 7)

Write in Like Minds' brand voice: confident, direct, no corporate fluff.`,
  },

  social: {
    description: '/social <topic> — Generate a week of social content',
    prompt: (topic) => `Generate a week of social media content for: ${topic || 'the topic provided'}

For each post provide the platform, format, caption, and hashtags:

MON — LinkedIn: thought leadership post
TUE — Instagram: visual concept + caption
WED — LinkedIn: data point or insight
THU — Instagram Stories: engagement prompt (poll, question)
FRI — LinkedIn + Instagram: behind-the-scenes or team moment
SAT — Instagram: aspirational / lifestyle
SUN — Optional: community post or share

Write in Like Minds' brand voice. Specific, not generic. Real hooks, real angles.`,
  },

  ads: {
    description: '/ads <url or product> — Generate ad copy',
    prompt: (target) => `Generate ad copy for: ${target || 'the product/service provided'}

Produce:
1. META ADS (3 variations)
   - Hook (first line that stops the scroll)
   - Body (2-3 sentences)
   - CTA
   Format: Short, Medium, Long copy versions

2. GOOGLE SEARCH (5 headlines + 2 descriptions)
   Follow 30-char headline / 90-char description limits

3. LINKEDIN (1 sponsored post)
   Professional angle, 150-word body, CTA

For each, note the AUDIENCE and ANGLE being targeted.`,
  },

  copy: {
    description: '/copy <url> — Rewrite and improve website copy',
    prompt: (url) => `Analyse and rewrite the copy for: ${url || 'the page provided'}

Deliver:
1. CURRENT HEADLINE — quote it, score it 1-10, explain why
2. REWRITTEN HEADLINE — 3 alternatives using PAS, AIDA, and 4U frameworks
3. VALUE PROP — current vs improved version
4. CTA — current vs improved version
5. TOP 3 BODY COPY FIXES — specific before/after rewrites with explanation

Every suggestion must be specific and immediately usable. No vague advice.`,
  },

  funnel: {
    description: '/funnel <url> — Sales funnel analysis',
    prompt: (url) => `Analyse the sales funnel for: ${url || 'the business provided'}

Map and evaluate:
1. AWARENESS — how are people finding this business?
2. CONSIDERATION — what does the nurture/consideration stage look like?
3. CONVERSION — where does the sale happen and what's the friction?
4. RETENTION — is there a retention or upsell mechanism?
5. BIGGEST LEAK — where are the most leads likely dropping off?
6. TOP 3 FIXES — specific, prioritised improvements to patch the leaks

Rate overall funnel health: Strong / Moderate / Weak, with one sentence why.`,
  },

  launch: {
    description: '/launch <product or event> — Launch playbook',
    prompt: (target) => `Create a launch playbook for: ${target || 'the product/event provided'}

Cover:
PRE-LAUNCH (2-4 weeks out)
- Audience warming tactics
- Content to create
- Partnerships or outreach to activate

LAUNCH WEEK
- Day-by-day activity plan
- Key messages for each channel
- PR / media angle if relevant

POST-LAUNCH (first 2 weeks)
- Follow-up sequence
- Social proof collection
- Momentum tactics

Keep it actionable — David should be able to hand this to the team and execute.`,
  },

  seo: {
    description: '/seo <url> — SEO content audit',
    prompt: (url) => `Run an SEO content audit for: ${url || 'the site provided'}

Cover:
1. TITLE TAGS — are they optimised? Missing?
2. META DESCRIPTIONS — quality and click-worthiness
3. HEADLINE STRUCTURE — H1/H2 hierarchy and keyword usage
4. CONTENT GAPS — what topics should they be ranking for but aren't?
5. QUICK WINS — 5 specific on-page fixes that would improve rankings fast
6. CONTENT TO CREATE — 3 article/page ideas with target keywords

Prioritise by impact. Skip theoretical — only practical moves.`,
  },

  brand: {
    description: '/brand <url> — Brand voice analysis',
    prompt: (url) => `Analyse the brand voice for: ${url || 'the business provided'}

Deliver:
1. VOICE DIMENSIONS — rate on: Formal↔Casual, Serious↔Playful, Technical↔Simple, Reserved↔Bold (each out of 10)
2. BRAND ARCHETYPE — which one (Authority, Innovator, Friend, Rebel, Guide) and why
3. WORDS THEY USE — 5-10 characteristic words/phrases
4. WORDS THEY AVOID — what's notably absent
5. CONSISTENCY — where the voice breaks down across channels
6. RECOMMENDATION — one sharp suggestion to sharpen the brand voice

Quote specific copy as evidence for every claim.`,
  },

  help: {
    description: 'List available commands',
    prompt: () => `List all available commands in a clean, readable format. For each command show what it does and example usage. Keep it short.`,
  },
}

export function parseCommand(text: string): { skill: TelegramSkill | null; args: string; raw: string } | null {
  if (!text.startsWith('/')) return null

  const [rawCommand, ...rest] = text.slice(1).split(/\s+/)
  const command = rawCommand.toLowerCase()
  const args = rest.join(' ')

  // Skip Telegram built-ins
  if (command === 'start') return null

  const skill = TELEGRAM_SKILLS[command] ?? null
  return { skill, args, raw: command }
}
