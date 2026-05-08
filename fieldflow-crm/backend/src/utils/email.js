/**
 * Email utility — placeholder for Resend / SendGrid / Nodemailer.
 * Replace sendEmail() body with your chosen provider.
 */

async function sendEmail({ to, subject, html, text }) {
  // TODO: wire up your email provider
  // Example with Resend:
  //   const resend = new Resend(process.env.RESEND_API_KEY)
  //   return resend.emails.send({ from: 'noreply@fieldflow.app', to, subject, html })
  console.log(`[email] to=${to} subject="${subject}"`)
  return { id: `mock-${Date.now()}` }
}

async function sendInvoiceEmail(invoice, client) {
  return sendEmail({
    to: client.email,
    subject: `Invoice ${invoice.invoice_number} from FieldFlow`,
    html: `<p>Dear ${client.first_name},</p><p>Your invoice #${invoice.invoice_number} for $${invoice.total} is ready.</p>`,
  })
}

async function sendJobAssignedEmail(job, technician) {
  return sendEmail({
    to: technician.email,
    subject: `New Job Assigned: ${job.job_number}`,
    html: `<p>Hi ${technician.full_name},</p><p>You have been assigned job ${job.job_number}: ${job.title}.</p>`,
  })
}

async function sendQuoteEmail(quote, client) {
  return sendEmail({
    to: client.email,
    subject: `Quote ${quote.quote_number} from FieldFlow`,
    html: `<p>Dear ${client.first_name},</p><p>Please review your quote #${quote.quote_number} for $${quote.total}.</p>`,
  })
}

module.exports = { sendEmail, sendInvoiceEmail, sendJobAssignedEmail, sendQuoteEmail }
