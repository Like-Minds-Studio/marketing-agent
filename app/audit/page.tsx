import ToolPage from '@/components/ToolPage'

export const metadata = { title: 'Website Audit — Like Minds Marketing AI' }

export default function AuditPage() {
  return (
    <ToolPage
      tool="audit"
      icon="🔍"
      title="Website Marketing Audit"
      description="Full 6-dimension marketing analysis: content, conversion, SEO, competitive positioning, brand trust, and growth strategy. Scored out of 100 with prioritized recommendations."
      inputLabel="Website URL"
      inputPlaceholder="https://yourwebsite.com"
      inputType="url"
      exampleInputs={['https://stripe.com', 'https://notion.so', 'https://framer.com']}
    />
  )
}
