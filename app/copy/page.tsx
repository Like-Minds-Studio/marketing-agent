import ToolPage from '@/components/ToolPage'

export const metadata = { title: 'Copy Analysis — Like Minds Marketing AI' }

export default function CopyPage() {
  return (
    <ToolPage
      tool="copy"
      icon="✍️"
      title="Copy Analysis & Generation"
      description="Analyze existing website copy, score it across 5 dimensions (clarity, persuasion, specificity, emotion, action), and get 10+ optimized headline alternatives with before/after examples."
      inputLabel="Website URL"
      inputPlaceholder="https://yourwebsite.com"
      inputType="url"
      exampleInputs={['https://basecamp.com', 'https://linear.app', 'https://webflow.com']}
    />
  )
}
