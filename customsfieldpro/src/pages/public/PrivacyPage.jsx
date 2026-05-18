import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Logo({ onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, background: '#16A34A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>CustomsFieldPro</span>
    </div>
  )
}

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly to us, such as when you create an account, fill out a form, or contact us for support. This includes:

• Account information: name, email address, company name, phone number, and password.
• Business data: client records, job details, invoices, schedules, and technician information you enter into the platform.
• Payment information: billing address and payment method details (processed securely via Stripe — we never store raw card numbers).
• Usage data: how you interact with CustomsFieldPro, features used, pages visited, and session duration.
• Device data: IP address, browser type, operating system, and device identifiers.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information we collect to:

• Provide, operate, and improve the CustomsFieldPro platform and services.
• Process transactions and send related information including purchase confirmations and invoices.
• Send technical notices, updates, security alerts, and support messages.
• Respond to comments and questions and provide customer service.
• Monitor and analyze usage trends to improve user experience.
• Detect, investigate, and prevent fraudulent transactions and other illegal activity.
• Comply with legal obligations.

We do not sell your personal information to third parties.`,
  },
  {
    title: '3. Data Sharing',
    body: `We may share your information with:

• Service providers: third-party vendors who perform services on our behalf (hosting, analytics, email delivery, payment processing). These providers are contractually obligated to keep your data confidential.
• Business transfers: if CustomsFieldPro is acquired or merges with another company, your information may be transferred as part of that transaction.
• Legal requirements: we may disclose your information if required by law, court order, or governmental authority.
• With your consent: we may share your information for any other purpose with your explicit consent.

We do not share your client data or business data with competitors or for advertising purposes.`,
  },
  {
    title: '4. Data Security',
    body: `We implement industry-standard security measures to protect your data:

• All data is encrypted in transit using TLS 1.3.
• Data at rest is encrypted using AES-256.
• We use Supabase with row-level security to ensure tenant data isolation.
• Access to production systems is restricted and logged.
• We conduct regular security audits and vulnerability assessments.
• Passwords are hashed using bcrypt and never stored in plaintext.

No method of transmission over the internet is 100% secure. We strive to protect your data but cannot guarantee absolute security.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your information for as long as your account is active or as needed to provide services. If you cancel your account:

• Your data remains accessible for 30 days so you can export it.
• After 30 days, all your data is permanently deleted from our systems.
• Some information may be retained for longer periods where required by law or for legitimate business purposes such as fraud prevention.

You can request deletion of your data at any time by contacting support@customsfieldprocrm.com.`,
  },
  {
    title: '6. Cookies',
    body: `We use cookies and similar tracking technologies to:

• Keep you logged in to your account.
• Remember your preferences and settings.
• Analyze how the platform is used (via anonymized analytics).

You can control cookie settings through your browser. Disabling cookies may affect some functionality of the platform.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your location, you may have the following rights regarding your personal data:

• Access: request a copy of the personal data we hold about you.
• Correction: request that we correct inaccurate or incomplete data.
• Deletion: request that we delete your personal data.
• Portability: receive your data in a structured, machine-readable format.
• Objection: object to processing of your data for certain purposes.

To exercise any of these rights, contact us at privacy@customsfieldprocrm.com. We will respond within 30 days.`,
  },
  {
    title: '8. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of any material changes by:

• Sending an email to the address associated with your account.
• Displaying a notice within the CustomsFieldPro platform.

Your continued use of CustomsFieldPro after the effective date of a revised policy constitutes your acceptance of the changes.`,
  },
  {
    title: '9. Contact Us',
    body: `If you have questions about this Privacy Policy or our data practices, contact us at:

CustomsFieldPro
Email: privacy@customsfieldprocrm.com
Support: support@customsfieldprocrm.com

We take privacy concerns seriously and will respond within 2 business days.`,
  },
]

export default function PrivacyPage() {
  const navigate = useNavigate()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Nav */}
      <nav style={{ height: 64, background: '#fff', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <Logo onClick={() => navigate('/')} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/login')} style={{ fontSize: 14, fontWeight: 600, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit' }}>
            Sign in
          </button>
          <button onClick={() => navigate('/register')} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Start free trial
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>LEGAL</p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>Last updated: May 8, 2026</p>
        </div>

        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ fontSize: 14, color: '#166534', lineHeight: 1.65 }}>
            <strong>Summary:</strong> We collect only what we need to run your account. We never sell your data. You can export or delete everything at any time. If you have questions, email <a href="mailto:privacy@customsfieldprocrm.com" style={{ color: '#16A34A' }}>privacy@customsfieldprocrm.com</a>.
          </p>
        </div>

        {SECTIONS.map((s, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 12, letterSpacing: '-0.3px' }}>{s.title}</h2>
            <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{s.body}</div>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/terms')} style={{ fontSize: 14, color: '#16A34A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Terms of Service →
          </button>
          <button onClick={() => navigate('/')} style={{ fontSize: 14, color: '#64748B', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
