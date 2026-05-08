import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getSettings } from '../data/store'

const BLUE       = [37, 99, 235]
const GREEN      = [22, 163, 74]
const DARK_TEXT  = [26, 29, 35]
const MID_GRAY   = [107, 114, 128]
const LIGHT_GRAY = [248, 249, 250]
const BORDER     = [232, 233, 236]

// ── helpers ───────────────────────────────────────────────────────────────────
function hex(doc, r, g, b) { doc.setDrawColor(r, g, b) }

function sectionHead(doc, text, y, W, margin) {
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(margin, y, W - margin * 2, 20, 'F')
  doc.setDrawColor(...BORDER)
  doc.rect(margin, y, W - margin * 2, 20, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK_TEXT)
  doc.text(text.toUpperCase(), margin + 10, y + 13.5)
  return y + 20
}

function kv(doc, label, value, x, y, lw = 90) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...MID_GRAY)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_TEXT)
  doc.text(String(value || '—'), x + lw, y)
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generateCompletionReport(job, completionData = {}) {
  const settings = getSettings()
  const co       = settings.company || {}
  const doc      = new jsPDF({ unit: 'pt', format: 'letter' })
  const W        = doc.internal.pageSize.getWidth()
  const pageH    = doc.internal.pageSize.getHeight()
  const margin   = 48
  let y          = 0

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 72, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('FieldFlow CRM', margin, 34)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('HVAC · Plumbing · Electrical · Appliance Repair', margin, 50)

  // "JOB COMPLETION REPORT" right side
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('JOB COMPLETION REPORT', W - margin, 30, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(job.id || '', W - margin, 46, { align: 'right' })

  y = 88

  // ── Job Details ──────────────────────────────────────────────────────────────
  y = sectionHead(doc, 'Job Details', y, W, margin)
  y += 14

  const completedAt = completionData.completedAt
    ? new Date(completionData.completedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const col1x = margin + 10
  const col2x = W / 2 + 10

  kv(doc, 'Job Number:', job.id, col1x, y)
  kv(doc, 'Service Type:', job.type, col2x, y)
  y += 16

  kv(doc, 'Client:', job.clientName, col1x, y)
  kv(doc, 'Technician:', job.techName || '—', col2x, y)
  y += 16

  kv(doc, 'Address:', job.clientAddress || '—', col1x, y)
  kv(doc, 'Phone:', job.clientPhone || '—', col2x, y)
  y += 16

  kv(doc, 'Job Date:', job.startDate || job.date || '—', col1x, y)
  kv(doc, 'Completed At:', completedAt, col2x, y)
  y += 24

  // ── Checklist ────────────────────────────────────────────────────────────────
  y = sectionHead(doc, 'Completion Checklist', y, W, margin)
  y += 12

  const checked = completionData.completionChecklist || completionData.checked || []
  if (checked.length > 0) {
    checked.forEach(item => {
      // Green checkmark
      doc.setFillColor(...GREEN)
      doc.circle(margin + 16, y - 2.5, 5, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 255, 255)
      doc.text('✓', margin + 13.5, y - 0.5)
      doc.setTextColor(...DARK_TEXT)
      doc.text(item, margin + 26, y)
      y += 14
    })
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...MID_GRAY)
    doc.text('No checklist items recorded.', margin + 10, y)
    y += 14
  }
  y += 10

  // ── Parts & Services ─────────────────────────────────────────────────────────
  const parts = (job.lineItems || []).filter(li => li.description?.trim())
  if (parts.length > 0) {
    y = sectionHead(doc, 'Parts & Services Used', y, W, margin)
    y += 6

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: parts.map(li => [
        li.description,
        li.qty,
        `$${(li.unit || 0).toLocaleString()}`,
        `$${(li.total || 0).toLocaleString()}`,
      ]),
      styles: { fontSize: 8.5, cellPadding: 5, textColor: DARK_TEXT },
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
    })
    y = doc.lastAutoTable.finalY + 14
  }

  // ── Completion Notes ─────────────────────────────────────────────────────────
  y = sectionHead(doc, 'Completion Notes', y, W, margin)
  y += 12

  const notes = completionData.completionNotes || completionData.notes || ''
  if (notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK_TEXT)
    const lines = doc.splitTextToSize(notes, W - margin * 2 - 20)
    doc.text(lines, margin + 10, y)
    y += lines.length * 12 + 10
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...MID_GRAY)
    doc.text('No notes recorded.', margin + 10, y)
    y += 20
  }

  // ── Photos ───────────────────────────────────────────────────────────────────
  const beforePhotos = completionData.beforePhotos || []
  const afterPhotos  = completionData.afterPhotos  || []

  if (beforePhotos.length > 0 || afterPhotos.length > 0) {
    // Check if we need a new page
    if (y > pageH - 200) { doc.addPage(); y = margin }

    y = sectionHead(doc, 'Before & After Photos', y, W, margin)
    y += 12

    const photoW = (W - margin * 2 - 16) / 2
    const photoH = 110
    const maxPerRow = 2

    function addPhotoSection(photos, label, startX) {
      if (photos.length === 0) return

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...MID_GRAY)
      doc.text(`${label} (${photos.length})`, startX, y - 2)

      let px = startX
      let py = y + 8

      photos.slice(0, 4).forEach((src, i) => {
        if (i > 0 && i % maxPerRow === 0) {
          py += photoH + 8
          px = startX
        }
        try {
          doc.addImage(src, 'PNG', px, py, photoW / maxPerRow - 4, photoH)
        } catch {}
        px += photoW / maxPerRow
      })
    }

    const midX = margin + photoW + 16
    addPhotoSection(beforePhotos, 'Before Photos', margin + 10)
    addPhotoSection(afterPhotos, 'After Photos', midX)
    y += 130
  }

  // ── Client Signature ─────────────────────────────────────────────────────────
  if (y > pageH - 160) { doc.addPage(); y = margin }

  y = sectionHead(doc, 'Client Signature', y, W, margin)
  y += 14

  const sigSrc = completionData.clientSignature || completionData.signatureDataUrl
  const sigName = completionData.clientPrintedName || ''

  if (sigSrc) {
    try {
      doc.addImage(sigSrc, 'PNG', margin + 10, y, 180, 60)
    } catch {}
  }

  // Printed name + confirmation line
  const sigTextX = sigSrc ? margin + 210 : margin + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK_TEXT)
  doc.text('Printed Name:', sigTextX, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.text(sigName || '—', sigTextX, y + 28)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MID_GRAY)
  doc.text(
    'By signing above, the client confirms the work was completed to their satisfaction.',
    sigTextX,
    y + 46,
    { maxWidth: W - sigTextX - margin }
  )

  y += 80

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = pageH - 36
  doc.setFillColor(...BLUE)
  doc.rect(0, footerY, W, 36, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  const footerLeft = [co.name, co.address, co.phone].filter(Boolean).join('  ·  ')
  doc.text(footerLeft || 'FieldFlow CRM', margin, footerY + 16)
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - margin, footerY + 16, { align: 'right' })
  doc.text('COMPLETION REPORT — CONFIDENTIAL', W / 2, footerY + 27, { align: 'center' })

  // ── Save ──────────────────────────────────────────────────────────────────────
  doc.save(`completion-report-${job.id || 'job'}.pdf`)
}
