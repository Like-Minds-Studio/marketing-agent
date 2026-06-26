import Link from 'next/link'

const tools = [
  {
    href: '/audit',
    icon: '🔍',
    title: 'Website Audit',
    description: 'Full 6-dimension marketing score — content, conversion, SEO, positioning, brand, and growth. Client-ready report with revenue impact estimates.',
    badge: 'Most Popular',
    cta: 'Run Audit',
  },
  {
    href: '/copy',
    icon: '✍️',
    title: 'Copy Analysis',
    description: 'Score existing copy across 5 dimensions. Get 10+ headline alternatives, before/after examples, and a complete swipe file — ready to implement.',
    badge: null,
    cta: 'Analyze Copy',
  },
  {
    href: '/emails',
    icon: '📧',
    title: 'Email Sequences',
    description: 'Complete welcome, nurture, and launch sequences. Full subject lines, preview text, and body copy — ready to paste into any ESP.',
    badge: null,
    cta: 'Generate Sequences',
  },
  {
    href: '/competitors',
    icon: '🎯',
    title: 'Competitor Analysis',
    description: 'Identify competitors, compare features and pricing, find content gaps, and get steal-worthy tactics to outposition the competition.',
    badge: null,
    cta: 'Analyze Competition',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">
              LM
            </div>
            <span className="font-semibold text-white">Like Minds Marketing AI</span>
          </div>
          <span className="text-xs text-gray-500 bg-gray-900 border border-gray-800 px-2 py-1 rounded">
            Powered by Claude
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-950 border border-violet-800 text-violet-300 text-sm px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
            AI-Powered Marketing Analysis
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Marketing intelligence<br />
            <span className="text-violet-400">at your fingertips</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Audit any website, generate optimized copy, build email sequences, and outmaneuver competitors — all in minutes, not weeks.
          </p>
        </div>

        {/* Tool grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative bg-gray-900 border border-gray-800 hover:border-violet-700 rounded-xl p-6 transition-all duration-200 hover:bg-gray-900/80"
            >
              {tool.badge && (
                <span className="absolute top-4 right-4 text-xs font-medium text-white px-2 py-0.5 rounded-full bg-violet-600">
                  {tool.badge}
                </span>
              )}
              <div className="text-3xl mb-4">{tool.icon}</div>
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
                {tool.title}
              </h2>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                {tool.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                {tool.cta}
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-12">
          Reports are AI-generated. Always validate recommendations with your specific business context.
        </p>
      </main>
    </div>
  )
}
