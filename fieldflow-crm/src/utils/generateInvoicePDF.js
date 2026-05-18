import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE      = [37, 99, 235]
const LIGHT_GRAY = [248, 249, 250]
const DARK_TEXT  = [26, 29, 35]
const MID_GRAY   = [107, 114, 128]
const RED_STAMP  = [220, 38, 38]

// ── Build the jsPDF document ──────────────────────────────────────────────────
function buildDoc(invoice, settings = {}) {
  const co  = settings.company || {}
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const W      = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const margin = 48

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 76, 'F')

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(255, 255, 255)
  doc.text(co.name || 'CustomsFieldPro Services', margin, 38)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(191, 219, 254) // blue-200
  doc.text('HVAC · Plumbing · Electrical', margin, 54)

  // "INVOICE" label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(255, 255, 255)
  doc.text('INVOICE', W - margin, 46, { align: 'right' })

  // Invoice number under INVOICE label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(191, 219, 254)
  doc.text(invoice.id || '', W - margin, 62, { align: 'right' })

  // ── Company info (below header, left) ──────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID_GRAY)
  const coAddr = [co.address, co.city, co.zip].filter(Boolean).join(', ')
  if (coAddr) doc.text(coAddr, margin, 96)
  const coContact = [co.phone, co.email].filter(Boolean).join('  ·  ')
  if (coContact) doc.text(coContact, margin, 110)

  // ── Invoice meta (top right) ───────────────────────────────────────────────
  const metaX = W - margin
  const metaRows = [
    ['Invoice #',  invoice.id    || '—'],
    ['Issued',     invoice.issued || '—'],
    ['Due Date',   invoice.due    || '—'],
    ['Status',     invoice.status || '—'],
  ]
  let metaY = 92
  metaRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MID_GRAY)
    doc.text(label, metaX - 130, metaY, { align: 'left' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_TEXT)
    doc.text(val, metaX, metaY, { align: 'right' })
    metaY += 14
  })

  // ── Divider ────────────────────────────────────────────────────────────────
  doc.setDrawColor(232, 233, 236)
  doc.setLineWidth(1)
  doc.line(margin, 126, W - margin, 126)

  // ── Bill To ────────────────────────────────────────────────────────────────
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('BILL TO', margin, 144)

  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(12)
  doc.text(invoice.clientName || '—', margin, 160)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID_GRAY)
  let billY = 174
  if (invoice.clientAddress) { doc.text(invoice.clientAddress, margin, billY); billY += 13 }
  if (invoice.clientPhone)   { doc.text(invoice.clientPhone,   margin, billY); billY += 13 }
  if (invoice.clientEmail)   { doc.text(invoice.clientEmail,   margin, billY); billY += 13 }

  // References block (right of Bill To)
  let refY = 138
  const refs = [
    invoice.jobRef && ['JOB REFERENCE', invoice.jobRef],
    invoice.linkedQuoteNumber && ['QUOTE REFERENCE', invoice.linkedQuoteNumber],
  ].filter(Boolean)
  refs.forEach(([label, value]) => {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MID_GRAY)
    doc.text(label, W - margin - 130, refY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK_TEXT)
    doc.text(value, W - margin, refY + 14, { align: 'right' })
    refY += 32
  })

  // ── OVERDUE stamp ──────────────────────────────────────────────────────────
  if (invoice.status === 'Overdue') {
    const cx = W - margin - 58
    const cy = 148
    doc.setDrawColor(...RED_STAMP)
    doc.setLineWidth(2.5)
    doc.rect(cx - 52, cy - 20, 104, 34)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...RED_STAMP)
    doc.text('OVERDUE', cx, cy + 8, { align: 'center', angle: -8 })
  }

  // ── Line Items Table ───────────────────────────────────────────────────────
  const tableTop = billY + 20
  const items = (invoice.lineItems || []).map((li, i) => [
    String(i + 1),
    li.description || '',
    String(li.qty ?? 1),
    `$${(li.unit || 0).toLocaleString()}`,
    `$${(li.total || 0).toLocaleString()}`,
  ])

  autoTable(doc, {
    startY: tableTop,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: items,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9.5,
      cellPadding: { top: 8, bottom: 8, left: 9, right: 9 },
      textColor: DARK_TEXT,
    },
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 9, bottom: 9, left: 9, right: 9 },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center', textColor: MID_GRAY },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 44, halign: 'center' },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
    },
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const tableEndY = doc.lastAutoTable.finalY
  const totalsX   = W - margin
  const labelX    = totalsX - 150

  const subtotal = invoice.subtotal ?? invoice.total ?? 0
  const taxRate  = invoice.taxRate ?? 0
  const taxAmt   = subtotal * taxRate / 100
  const total    = invoice.total ?? (subtotal + taxAmt)

  let ty = tableEndY + 18
  // Subtotal
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...MID_GRAY)
  doc.text('Subtotal', labelX, ty)
  doc.text(`$${subtotal.toLocaleString()}`, totalsX, ty, { align: 'right' })
  ty += 16
  // Tax
  doc.text(`Tax (${taxRate}%)`, labelX, ty)
  doc.text(`$${taxAmt.toFixed(2)}`, totalsX, ty, { align: 'right' })
  ty += 10
  // Divider
  doc.setDrawColor(232, 233, 236).setLineWidth(1)
  doc.line(labelX, ty, totalsX, ty)
  ty += 16
  // Total Due
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...DARK_TEXT)
  doc.text('Total Due', labelX, ty)
  doc.setTextColor(...BLUE)
  doc.text(`$${total.toLocaleString()}`, totalsX, ty, { align: 'right' })

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    const notesY = ty + 28
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...MID_GRAY)
    doc.text('NOTES', margin, notesY)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...DARK_TEXT)
    const wrapped = doc.splitTextToSize(invoice.notes, W - margin * 2 - 160)
    doc.text(wrapped, margin, notesY + 13)
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(0, pageH - 52, W, 52, 'F')
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MID_GRAY)
  doc.text('Thank you for your business · Payment due within 14 days', W / 2, pageH - 30, { align: 'center' })
  if (co.phone || co.email) {
    doc.text([co.phone, co.email].filter(Boolean).join('  ·  '), W / 2, pageH - 16, { align: 'center' })
  }

  // ── Page number ────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MID_GRAY)
    doc.text(`Page ${p} of ${totalPages}`, W - margin, pageH - 16, { align: 'right' })
  }

  return doc
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Download as Invoice-[id].pdf */
export function generateInvoicePDF(invoice, settings = {}) {
  buildDoc(invoice, settings).save(`Invoice-${invoice.id || 'draft'}.pdf`)
}

/** Open in new tab for printing */
export function printInvoicePDF(invoice, settings = {}) {
  const url = buildDoc(invoice, settings).output('bloburl')
  window.open(url, '_blank')
}
