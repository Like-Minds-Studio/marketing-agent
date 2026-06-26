import ToolPage from '@/components/ToolPage'

export const metadata = { title: 'Competitor Analysis — Like Minds Marketing AI' }

export default function CompetitorsPage() {
  return (
    <ToolPage
      tool="competitors"
      icon="🎯"
      title="Competitive Intelligence"
      description="Identify direct, indirect, and aspirational competitors. Get a full analysis: positioning maps, feature matrices, pricing comparisons, review intelligence, and steal-worthy tactics to implement."
      inputLabel="Website URL"
      inputPlaceholder="https://yourwebsite.com"
      inputType="url"
      exampleInputs={['https://mailchimp.com', 'https://hubspot.com', 'https://monday.com']}
    />
  )
}
