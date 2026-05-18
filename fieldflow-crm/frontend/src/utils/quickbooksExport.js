import { getInvoices, getClients, getJobs } from '../data/store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  return `${m}/${day}/${y}`
}

function fmtAmt(n) {
  return (n || 0).toFixed(2)
}

/** Build a tab-delimited IIF file string from header + rows */
function buildIIF(sections) {
  return sections.join('\n') + '\n'
}

/** Download a file in the browser */
export function downloadIIF(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Export Invoices (IIF) ────────────────────────────────────────────────────
// Generates QuickBooks IIF invoice records.
// Each invoice becomes one TRNS/SPL/ENDTRNS block.
// Line items come from invoice.items[] if present, otherwise a single line.

export function exportInvoicesToQuickBooks() {
  const invoices = getInvoices()

  const lines = [
    '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tTOPRINT',
    '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tQNTY\tPRICE\tINVITEM\tMEMO',
    '!ENDTRNS',
  ]

  invoices.forEach(inv => {
    const date = fmtDate(inv.issued || inv.due)
    const dueDate = fmtDate(inv.due)
    const name = (inv.clientName || '').replace(/\t/g, ' ')
    const total = fmtAmt(inv.total)
    const docNum = inv.id || ''

    // Main transaction line (negative = receivable)
    lines.push(`TRNS\tINVOICE\t${date}\tAccounts Receivable\t${name}\t-${total}\t${docNum}\t${inv.notes || ''}\tN`)

    // Line items
    const items = Array.isArray(inv.items) && inv.items.length > 0
      ? inv.items
      : [{ description: inv.serviceType || inv.type || 'Service', qty: 1, rate: inv.total || 0 }]

    items.forEach(item => {
      const itemName = (item.description || item.name || 'Service').replace(/\t/g, ' ')
      const qty = item.qty || item.quantity || 1
      const rate = item.rate || item.unitPrice || item.total || 0
      const amt = fmtAmt(qty * rate)
      lines.push(`SPL\tINVOICE\t${date}\tServices Income\t${name}\t${amt}\t${qty}\t${fmtAmt(rate)}\t${itemName}\t`)
    })

    // Tax line if applicable
    if (inv.tax && inv.tax > 0) {
      lines.push(`SPL\tINVOICE\t${date}\tSales Tax Payable\t${name}\t${fmtAmt(inv.tax)}\t\t\tSales Tax\t`)
    }

    lines.push('ENDTRNS')
  })

  const content = buildIIF([lines.join('\n')])
  downloadIIF(content, 'customsfieldpro-invoices.iif')
}

// ─── Export Clients (IIF) ─────────────────────────────────────────────────────
// Generates QuickBooks IIF customer list.

export function exportClientsToQuickBooks() {
  const clients = getClients()

  const lines = [
    '!CUST\tNAME\tFIRSTNAME\tLASTNAME\tCOMPANYNAME\tBLADDR1\tBLADDR2\tBLADDR3\tPHONE1\tFAXNUM\tEMAIL\tNOTE\tTERMS\tTAXABLE',
  ]

  clients.forEach(c => {
    const name = (c.name || '').replace(/\t/g, ' ')
    // Split name into first/last heuristically (last word = last name)
    const parts = name.split(' ')
    const lastName = parts.length > 1 ? parts[parts.length - 1] : ''
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : name
    const company = c.type === 'Business' ? name : ''

    const addr1 = (c.address || c.street || '').replace(/\t/g, ' ')
    const addr2 = [c.city, c.state].filter(Boolean).join(', ').replace(/\t/g, ' ')
    const addr3 = (c.zip || c.postalCode || '').replace(/\t/g, ' ')
    const phone = (c.phone || '').replace(/\t/g, ' ')
    const fax   = (c.fax || '').replace(/\t/g, ' ')
    const email = (c.email || '').replace(/\t/g, ' ')
    const note  = (c.notes || '').replace(/[\t\n]/g, ' ')

    lines.push(`CUST\t${name}\t${firstName}\t${lastName}\t${company}\t${addr1}\t${addr2}\t${addr3}\t${phone}\t${fax}\t${email}\t${note}\tNet 30\tY`)
  })

  const content = buildIIF([lines.join('\n')])
  downloadIIF(content, 'customsfieldpro-clients.iif')
}

// ─── Export Payments (IIF) ────────────────────────────────────────────────────
// Generates QuickBooks IIF payment records for all paid invoices.

export function exportPaymentsToQuickBooks() {
  const invoices = getInvoices().filter(i => i.status === 'Paid')

  const lines = [
    '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO',
    '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO',
    '!ENDTRNS',
  ]

  invoices.forEach(inv => {
    const date = fmtDate(inv.paidAt || inv.due || inv.issued)
    const name = (inv.clientName || '').replace(/\t/g, ' ')
    const amt  = fmtAmt(inv.total)
    const docNum = inv.id || ''
    const memo = `Payment for ${docNum}`

    lines.push(`TRNS\tPAYMENT\t${date}\tUndeposited Funds\t${name}\t${amt}\t${docNum}\t${memo}`)
    lines.push(`SPL\tPAYMENT\t${date}\tAccounts Receivable\t${name}\t-${amt}\t${memo}`)
    lines.push('ENDTRNS')
  })

  const content = buildIIF([lines.join('\n')])
  downloadIIF(content, 'customsfieldpro-payments.iif')
}
