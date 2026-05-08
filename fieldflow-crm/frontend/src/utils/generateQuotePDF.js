import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TEAL       = [8, 145, 178]
const GREEN_STAMP = [22, 163, 74]
const LIGHT_GRAY  = [248, 249, 250]
const DARK_TEXT   = [26, 29, 35]
const MID_GRAY    = [107, 114, 128]

// ── Build the jsPDF document ──────────────────────────────────────────────────
function buildDoc(quote, settings = {}) {
  const co  = settings.company || {}
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const W      = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const margin = 48

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, W, 76, 'F')

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(255, 255, 255)
  doc.text(co.name || 'FieldFlow Services', margin, 38)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(165, 243, 252) // cyan-200
  doc.text('HVAC · Plumbing · Electrical', margin, 54)

  // "QUOTE" label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(255, 255, 255)
  doc.text('QUOTE', W - margin, 46, { align: 'right' })

  // Quote number under QUOTE label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(165, 243, 252)
  doc.text(quote.id || '', W - margin, 62, { align: 'right' })

  // ── Company info (below header, left) ──────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID_GRAY)
  const coAddr = [co.address, co.city, co.zip].filter(Boolean).join(', ')
  if (coAddr) doc.text(coAddr, margin, 96)
  const coContact = [co.phone, co.email].filter(Boolean).join('  ·  ')
  if (coContact) doc.text(coContact, margin, 110)

  // ── Quote meta (top right) ─────────────────────────────────────────────────
  const metaX = W - margin
  const metaRows = [
    ['Quote #',     quote.id      || '—'],
    ['Created',     quote.created || '—'],
    ['Valid Until', quote.expires || '—'],
    ['Status',      quote.status  || '—'],
  ]
  let metaY = 92
  metaRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MID_GRAY)
    doc.text(label, metaX - 130, metaY, { align: 'left' })
    doc.setFont('helvetica', 'bold').setTextColor(...DARK_TEXT)
    doc.text(val, metaX, metaY, { align: 'right' })
    metaY += 14
  })

  // ── Divider ────────────────────────────────────────────────────────────────
  doc.setDrawColor(232, 233, 236).setLineWidth(1)
  doc.line(margin, 126, W - margin, 126)

  // ── Prepared For ──────────────────────────────────────────────────────────
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('PREPARED FOR', margin, 144)

  doc.setTextColor(...DARK_TEXT).setFontSize(12)
  doc.text(quote.clientName || '—', margin, 160)

  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...MID_GRAY)
  let clientY = 174
  if (quote.clientAddress) { doc.text(quote.clientAddress, margin, clientY); clientY += 13 }
  if (quote.clientPhone)   { doc.text(quote.clientPhone,   margin, clientY); clientY += 13 }
  if (quote.clientEmail)   { doc.text(quote.clientEmail,   margin, clientY); clientY += 13 }

  // Service type (right side)
  doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(...MID_GRAY)
  doc.text('SERVICE TYPE', W - margin - 130, 144)
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...DARK_TEXT)
  doc.text(quote.type || '—', W - margin, 160, { align: 'right' })

  // ── APPROVED stamp ─────────────────────────────────────────────────────────
  if (quote.status === 'Approved') {
    const cx = W - margin - 58
    const cy = 148
    doc.setDrawColor(...GREEN_STAMP).setLineWidth(2.5)
    doc.rect(cx - 58, cy - 20, 116, 34)
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...GREEN_STAMP)
    doc.text('APPROVED', cx, cy + 8, { align: 'center', angle: -8 })
  }

  // Description box
  if (quote.description) {
    doc.setFillColor(...LIGHT_GRAY)
    doc.setDrawColor(232, 233, 236)
    doc.roundedRect(margin, clientY + 6, W - margin * 2, 46, 4, 4, 'FD')
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...DARK_TEXT)
    const wrapped = doc.splitTextToSize(quote.description, W - margin * 2 - 24)
    doc.text(wrapped, margin + 12, clientY + 24)
    clientY += 60
  }

  // ── Line Items Table ───────────────────────────────────────────────────────
  const tableTop = clientY + 18
  const items = (quote.lineItems || []).map((li, i) => [
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
      fillColor: TEAL,
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

  // ── Total ──────────────────────────────────────────────────────────────────
  const tableEndY = doc.lastAutoTable.finalY
  const totalsX   = W - margin
  const labelX    = totalsX - 150

  let ty = tableEndY + 18
  doc.setDrawColor(232, 233, 236).setLineWidth(1)
  doc.line(labelX, ty, totalsX, ty)
  ty += 16

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...DARK_TEXT)
  doc.text('Quote Total', labelX, ty)
  doc.setTextColor(...TEAL)
  doc.text(`$${(quote.total || 0).toLocaleString()}`, totalsX, ty, { align: 'right' })

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (quote.notes) {
    const notesY = ty + 28
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...MID_GRAY)
    doc.text('NOTES', margin, notesY)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...DARK_TEXT)
    const wrapped = doc.splitTextToSize(quote.notes, W - margin * 2 - 160)
    doc.text(wrapped, margin, notesY + 13)
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(0, pageH - 52, W, 52, 'F')
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MID_GRAY)
  doc.text('This quote is valid for 14 days · Contact us to approve', W / 2, pageH - 30, { align: 'center' })
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

/** Download as Quote-[id].pdf */
export function generateQuotePDF(quote, settings = {}) {
  buildDoc(quote, settings).save(`Quote-${quote.id || 'draft'}.pdf`)
}

/** Open in new tab for printing */
export function printQuotePDF(quote, settings = {}) {
  const url = buildDoc(quote, settings).output('bloburl')
  window.open(url, '_blank')
}
