import ToolPage from '@/components/ToolPage'

export const metadata = { title: 'Email Sequences — Like Minds Marketing AI' }

export default function EmailsPage() {
  return (
    <ToolPage
      tool="emails"
      icon="📧"
      title="Email Sequence Generator"
      description="Generate complete, ready-to-send email sequences — welcome series, nurture campaigns, product launches. Full subject lines, preview text, body copy, and A/B test variants."
      inputLabel="Website URL or describe your product/service"
      inputPlaceholder="https://yourwebsite.com  or  'SaaS project management tool for remote teams'"
      inputType="text"
      exampleInputs={['https://calendly.com', 'B2B email marketing software', 'Online fitness coaching program']}
    />
  )
}
