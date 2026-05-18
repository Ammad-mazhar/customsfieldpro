/**
 * Generates the HTML body for a Google Review request email.
 * @param {object} vars - Template variables
 */
export function generateReviewEmailHTML(vars) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: #185FA5; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${vars.company_name || 'CustomsFieldPro'}</h1>
        <p style="color: #B3D4F5; margin: 5px 0 0;">${vars.company_tagline || 'HVAC · Plumbing · Electrical'}</p>
      </div>
      <!-- Body -->
      <div style="padding: 40px 30px;">
        <h2 style="color: #1a1a1a;">Thank you, ${vars.client_name}! 🙏</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          We hope ${vars.tech_name || 'our technician'} took great care of you today.
          Your satisfaction is our top priority.
        </p>
        <!-- Stars -->
        <div style="text-align: center; font-size: 40px; margin: 20px 0;">⭐⭐⭐⭐⭐</div>
        <p style="color: #444; font-size: 16px; line-height: 1.6; text-align: center;">
          If you're happy with our service, would you mind leaving us a quick Google review?
          <br/><strong>It only takes 30 seconds and helps us tremendously!</strong>
        </p>
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${vars.review_link}"
             style="background: #185FA5; color: white; padding: 16px 40px; border-radius: 8px;
                    text-decoration: none; font-size: 18px; font-weight: bold; display: inline-block;">
            ⭐ Leave a Google Review
          </a>
        </div>
        <p style="color: #888; font-size: 14px; text-align: center;">
          Job Reference: ${vars.job_number || '—'}
        </p>
      </div>
      <!-- Footer -->
      <div style="background: #f5f5f5; padding: 20px 30px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          ${vars.company_name || 'CustomsFieldPro'} · ${vars.company_address || ''}
          <br/>
          <a href="#unsubscribe" style="color: #888;">Unsubscribe from review requests</a>
        </p>
      </div>
    </div>
  `
}

/** Fill {{variable}} placeholders in a string */
export function replacePlaceholders(template = '', vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
}
