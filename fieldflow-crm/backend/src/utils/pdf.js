/**
 * PDF generation utility — placeholder for puppeteer / pdfkit / wkhtmltopdf.
 * Replace generatePDF() body with your chosen library.
 */

async function generateInvoicePDF(invoice) {
  // TODO: implement with puppeteer or pdfkit
  // Returns a Buffer of the PDF bytes
  return Buffer.from(`Invoice PDF: ${invoice.invoice_number}`)
}

async function generateQuotePDF(quote) {
  return Buffer.from(`Quote PDF: ${quote.quote_number}`)
}

module.exports = { generateInvoicePDF, generateQuotePDF }
