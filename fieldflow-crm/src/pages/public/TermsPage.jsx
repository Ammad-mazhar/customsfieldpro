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
    title: '1. Acceptance of Terms',
    body: `By accessing or using CustomsFieldPro ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.

These Terms apply to all users of the Service, including businesses and their employees, contractors, and agents who access the Service on behalf of a business.`,
  },
  {
    title: '2. Description of Service',
    body: `CustomsFieldPro is a field service management platform that helps businesses manage jobs, schedules, clients, invoices, and team communications. Features include but are not limited to:

• Job scheduling and dispatch
• Client and equipment management
• Invoicing and payment collection
• Route optimization
• AI-powered call answering (AI Receptionist)
• Mobile applications for field technicians
• Reporting and analytics

We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.`,
  },
  {
    title: '3. Account Registration',
    body: `To use CustomsFieldPro, you must create an account. You agree to:

• Provide accurate, current, and complete information during registration.
• Maintain and promptly update your account information.
• Keep your password confidential and not share it with unauthorized parties.
• Notify us immediately at support@customsfieldprocrm.com if you suspect unauthorized access to your account.
• Be responsible for all activity that occurs under your account.

You must be at least 18 years old to create an account. By registering, you represent that you have the authority to bind your business to these Terms.`,
  },
  {
    title: '4. Subscription and Billing',
    body: `CustomsFieldPro offers subscription plans billed monthly or annually. By subscribing, you agree to:

• Pay all fees associated with your chosen plan.
• Provide valid payment information and keep it current.
• Automatic renewal at the end of each billing period unless you cancel before the renewal date.

Free Trial: New accounts receive a 14-day free trial. No credit card is required to start a trial. At the end of the trial, you must subscribe to continue using the Service.

Cancellation: You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial periods.

Price Changes: We may change our pricing with 30 days notice. Continued use after the effective date constitutes acceptance of the new pricing.`,
  },
  {
    title: '5. Acceptable Use',
    body: `You agree not to use CustomsFieldPro to:

• Violate any applicable laws or regulations.
• Transmit spam, unsolicited communications, or malicious code.
• Attempt to gain unauthorized access to the Service or other users' accounts.
• Reverse engineer, decompile, or disassemble any part of the Service.
• Use the Service to store or transmit content that is illegal, harmful, or infringing.
• Interfere with or disrupt the integrity or performance of the Service.
• Resell or sublicense access to the Service without written permission.

We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: '6. Your Data',
    body: `You retain ownership of all data you input into CustomsFieldPro ("Customer Data"). By using the Service, you grant CustomsFieldPro a limited license to process your Customer Data solely to provide and improve the Service.

We will:
• Keep your Customer Data confidential.
• Not sell or share your Customer Data with third parties for their own purposes.
• Allow you to export your Customer Data at any time.
• Delete your Customer Data within 30 days of account cancellation.

You are responsible for the accuracy and legality of your Customer Data.`,
  },
  {
    title: '7. Intellectual Property',
    body: `CustomsFieldPro and its licensors own all intellectual property rights in the Service, including software, design, trademarks, and content. These Terms do not grant you any rights to use CustomsFieldPro trademarks, logos, or brand elements without written permission.

You retain ownership of any content you create using the Service. You grant CustomsFieldPro permission to use anonymized, aggregated data about usage patterns to improve the Service.`,
  },
  {
    title: '8. Disclaimers',
    body: `THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. CUSTOMSFIELDPRO DOES NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, UNINTERRUPTED, OR MEET YOUR SPECIFIC REQUIREMENTS.

We do not warrant that:
• The Service will be available at all times (we aim for 99.9% uptime but do not guarantee it).
• Information provided through the Service is accurate or complete.
• The Service will be free from viruses or other harmful components.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, CUSTOMSFIELDPRO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF THE SERVICE.

OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the American Arbitration Association rules, except that either party may seek injunctive relief in court for intellectual property violations.`,
  },
  {
    title: '11. Changes to Terms',
    body: `We may update these Terms at any time. We will notify you of material changes at least 30 days before they take effect by:

• Sending an email to your registered address.
• Displaying a notice within the CustomsFieldPro platform.

Continued use of the Service after the effective date constitutes acceptance of the updated Terms.`,
  },
  {
    title: '12. Contact',
    body: `For questions about these Terms, contact:

CustomsFieldPro
Email: legal@customsfieldprocrm.com
Support: support@customsfieldprocrm.com`,
  },
]

export default function TermsPage() {
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
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', marginBottom: 12 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>Last updated: May 8, 2026 · Effective: May 8, 2026</p>
        </div>

        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ fontSize: 14, color: '#9A3412', lineHeight: 1.65 }}>
            <strong>Plain English summary:</strong> Use CustomsFieldPro fairly, pay your subscription, keep your password safe, and your data is yours. We run a legitimate business and expect the same from you. Questions? <a href="mailto:legal@customsfieldprocrm.com" style={{ color: '#EA580C' }}>legal@customsfieldprocrm.com</a>
          </p>
        </div>

        {SECTIONS.map((s, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 12, letterSpacing: '-0.3px' }}>{s.title}</h2>
            <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{s.body}</div>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/privacy')} style={{ fontSize: 14, color: '#16A34A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Privacy Policy →
          </button>
          <button onClick={() => navigate('/')} style={{ fontSize: 14, color: '#64748B', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
