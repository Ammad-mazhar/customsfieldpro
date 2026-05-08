import { useState, useEffect } from 'react'
import { getInvoices, saveInvoices, saveInvoice, getClients, getJobs, getSettings } from '../data/store'
import { getNextNumber, formatInvoiceNumber } from '../utils/numberGenerator'
import { generateInvoicePDF, printInvoicePDF } from '../utils/generateInvoicePDF'
import { useAuth } from '../auth/AuthContext'
import { logActivity, ACTIONS } from '../utils/activityLog'
import { notifyAdmins, NOTIF_TYPES } from '../utils/notifications'
import { sendInvoiceEmail } from '../utils/emailService'
import { getStripeConfig, generatePaymentLink, markInvoicePaidViaStripe, isStripeConfigured } from '../utils/stripePayments'

const SC = { Paid:{bg:'#f0fdf4',color:'#16a34a'}, Overdue:{bg:'#fef2f2',color:'#dc2626'}, Draft:{bg:'#f3f4f6',color:'#6b7280'}, Sent:{bg:'#eff6ff',color:'#2563eb'}, 'Payment Link Sent':{bg:'#f5f3ff',color:'#7c3aed'} }

const BLANK_FORM = { clientId:'', jobRef:'', issued:new Date().toISOString().split('T')[0], due:'', taxRate:'0', notes:'' }
const BLANK_LINE = () => ({ id:Date.now()+Math.random(), description:'', qty:1, unit:0, total:0 })

function Bdg({label}) {
  const c=SC[label]??{bg:'#f3f4f6',color:'#6b7280'}
  return <span style={{display:'inline-block',fontSize:12,fontWeight:600,padding:'3px 9px',borderRadius:20,background:c.bg,color:c.color}}>{label}</span>
}
function Tabs({tabs,active,onSelect}) {
  return (
    <div style={{display:'flex',borderBottom:'1px solid #e8e9ec'}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>t.enabled!==false&&onSelect(t.id)}
          style={{padding:'11px 20px',fontSize:13.5,fontWeight:active===t.id?600:500,
            color:active===t.id?'#2563eb':t.enabled===false?'#c4c9d4':'#6b7280',
            background:'none',border:'none',borderBottom:`2px solid ${active===t.id?'#2563eb':'transparent'}`,
            cursor:t.enabled===false?'default':'pointer',marginBottom:-1,whiteSpace:'nowrap'}}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function AccessDenied() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:10,textAlign:'center'}}>
      <div style={{width:52,height:52,borderRadius:'50%',background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round"/></svg>
      </div>
      <h2 style={{fontSize:17,fontWeight:700,color:'#1a1d23',margin:0}}>Access Denied</h2>
      <p style={{fontSize:13.5,color:'#9ca3af',margin:0,maxWidth:320}}>You don't have permission to view Invoices. Contact your administrator.</p>
    </div>
  )
}

export default function Invoices() {
  const { isAdmin, hasPermission } = useAuth()
  const [invoices,setInvoices] = useState(() => getInvoices())
  const [clients]              = useState(() => getClients())
  const [notifSettings]        = useState(() => getSettings().notifications)
  const [jobs]                 = useState(() => getJobs())
  const [settings]             = useState(() => getSettings())
  const [tab,setTab]           = useState('all')
  const [selId,setSelId]       = useState(null)
  const [statusF,setStatusF]   = useState('All')
  const [form,setForm]         = useState(BLANK_FORM)
  const [lines,setLines]       = useState([BLANK_LINE()])
  const [errs,setErrs]         = useState({})
  const [banner,setBanner]     = useState('')
  const [sendModal,setSendModal] = useState(null)   // invoice object or null
  const [sendForm,setSendForm]   = useState({})
  const [sendSuccess,setSendSuccess] = useState(false)
  const [payModal,setPayModal]   = useState(null)   // invoice object or null
  const [payLink,setPayLink]     = useState('')
  const [payCopied,setPayCopied] = useState(false)
  const [payLinkSent,setPayLinkSent] = useState(false)
  const [stripeCfg]              = useState(() => getStripeConfig())
  const stripeReady              = isStripeConfigured()

  if (!isAdmin && !hasPermission('view_invoices')) return <AccessDenied />

  const sel = invoices.find(i=>i.id===selId)
  const canCreate = isAdmin || hasPermission('create_invoices')
  const tabs = [
    {id:'all',    label:'All Invoices'},
    {id:'detail', label: sel?`Invoice Detail (${sel.id})`:'Invoice Detail', enabled:!!sel},
    ...(canCreate ? [{id:'create', label:'Create Invoice'}] : []),
  ]

  function open(id) { setSelId(id); setTab('detail') }

  useEffect(() => {
    const flag = sessionStorage.getItem('fieldflow_open_new')
    if (flag === 'invoice') { sessionStorage.removeItem('fieldflow_open_new'); setForm(BLANK_FORM); setLines([BLANK_LINE()]); setErrs({}); setTab('create') }
    function onEscape() { setPayModal(null) }
    window.addEventListener('fieldflow:escape', onEscape)
    return () => window.removeEventListener('fieldflow:escape', onEscape)
  }, [])
  function flash(msg) { setBanner(msg); setTimeout(()=>setBanner(''),3000) }

  function openSendModal(inv) {
    setSendForm({
      to: inv.clientEmail || '',
      subject: `Invoice ${inv.id} from FieldFlow CRM`,
      message: `Hi ${inv.clientName},\n\nPlease find attached Invoice ${inv.id} for the services provided.\n\nAmount Due: $${inv.total.toLocaleString()}\nDue Date: ${inv.due || 'Upon receipt'}\n\nThank you for your business. Please don't hesitate to reach out if you have any questions.\n\nBest regards,\nFieldFlow CRM`,
      attachPdf: true,
    })
    setSendSuccess(false)
    setSendModal(inv)
  }

  function handleSend() {
    if (!sendModal) return
    const now = new Date().toISOString()
    const updatedInv = { ...sendModal, status: 'Sent', sentTo: sendForm.to, sentAt: now, sentSubject: sendForm.subject }
    const newArr = invoices.map(i => i.id === sendModal.id ? updatedInv : i)
    setInvoices(newArr)
    saveInvoices(newArr)
    logActivity(ACTIONS.INVOICE_SENT, 'Invoices', sendModal.id, `${sendModal.id} – ${sendModal.clientName}`, `Invoice sent to ${sendForm.to}.`)
    notifyAdmins(NOTIF_TYPES.QUOTE_APPROVED, 'Invoice Sent', `Invoice ${sendModal.id} sent to ${sendModal.clientName} (${sendForm.to}).`, 'Invoices', sendModal.id)
    // Send real email if toggle is on
    if (notifSettings?.emailOnInvoiceSent) {
      const client = clients.find(c => c.id === sendModal.clientId)
      sendInvoiceEmail({ ...updatedInv, clientEmail: sendForm.to }, client)
    }
    setSendSuccess(true)
    setTimeout(() => { setSendModal(null); flash(`${sendModal.id} sent to ${sendForm.to}.`) }, 1800)
  }

  function openPayModal(inv) {
    setPayLink(generatePaymentLink(inv))
    setPayCopied(false)
    setPayLinkSent(false)
    setPayModal(inv)
  }

  function handleSendPayLink() {
    if (!payModal) return
    const newArr = invoices.map(i => i.id === payModal.id ? { ...i, status: 'Payment Link Sent', paymentLink: payLink } : i)
    setInvoices(newArr)
    saveInvoices(newArr)
    logActivity(ACTIONS.INVOICE_SENT, 'Invoices', payModal.id, `${payModal.id} – ${payModal.clientName}`, `Payment link sent for ${payModal.id}.`)
    setPayLinkSent(true)
    setTimeout(() => { setPayModal(null); flash(`Payment link sent for ${payModal.id}.`) }, 1600)
  }

  async function copyPayLink() {
    try { await navigator.clipboard.writeText(payLink); setPayCopied(true); setTimeout(() => setPayCopied(false), 2000) } catch { /* ignore */ }
  }

  function updateStatus(id, status) {
    const inv = invoices.find(i => i.id === id)
    const newArr = invoices.map(i=>i.id===id?{...i,status}:i)
    setInvoices(newArr)
    saveInvoices(newArr)
    const action = status === 'Paid' ? ACTIONS.INVOICE_PAID : status === 'Sent' ? ACTIONS.INVOICE_SENT : ACTIONS.INVOICE_CREATED
    logActivity(action, 'Invoices', id, `${id} – ${inv?.clientName || ''}`, `Invoice status set to ${status}.`)
  }

  const visible = invoices.filter(i=>statusF==='All'||i.status===statusF)
  const paid = invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+i.total,0)
  const outstanding = invoices.filter(i=>i.status!=='Paid').reduce((s,i)=>s+i.total,0)
  const overdue = invoices.filter(i=>i.status==='Overdue').reduce((s,i)=>s+i.total,0)

  function updateLine(id,field,val) {
    setLines(p=>p.map(li=>{
      if(li.id!==id) return li
      const u={...li,[field]:val}
      if(field==='qty'||field==='unit') u.total=parseFloat(u.qty||0)*parseFloat(u.unit||0)
      return u
    }))
  }

  function calcTotals() {
    const sub = lines.reduce((s,l)=>s+(parseFloat(l.total)||0),0)
    const tax = sub*(parseFloat(form.taxRate||0)/100)
    return {sub,tax,grand:sub+tax}
  }

  function validate() {
    const e={}
    if(!form.clientId) e.clientId='Required'
    if(!form.due) e.due='Required'
    if(!lines.some(l=>l.description.trim())) e.lines='At least one line item required'
    return e
  }

  function submitCreate() {
    const e=validate(); if(Object.keys(e).length){setErrs(e);return}
    const c=clients.find(x=>x.id===form.clientId)
    const {sub,tax,grand}=calcTotals()
    const n={
      id: formatInvoiceNumber(getNextNumber('invoices')),
      clientId:form.clientId,clientName:c?.name||'',clientPhone:c?.phone||'',
      clientEmail:c?.email||'',clientAddress:c?`${c.address}, ${c.city}, ${c.state}`:'',
      jobRef:form.jobRef,linkedJobId:form.jobRef||null,
      linkedQuoteNumber:null,linkedQuoteId:null,
      issued:form.issued,due:form.due,status:'Draft',
      lineItems:lines.filter(l=>l.description.trim()),
      subtotal:sub,taxRate:parseFloat(form.taxRate||0),total:grand,notes:form.notes,
    }
    const updated = saveInvoice(n)
    setInvoices(updated)
    logActivity(ACTIONS.INVOICE_CREATED, 'Invoices', n.id, `${n.id} – ${n.clientName}`, `Invoice created as Draft.`)
    setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('all')
    flash(`${n.id} created as Draft.`)
  }

  // Jobs available for the selected client (for job ref dropdown)
  const clientJobs = jobs.filter(j=>!form.clientId||j.clientId===form.clientId)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {banner&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',borderRadius:8,padding:'10px 16px',fontSize:13.5,fontWeight:600}}>✓ {banner}</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {[['Total Paid',`$${paid.toLocaleString()}`,'#16a34a'],['Outstanding',`$${outstanding.toLocaleString()}`,'#d97706'],['Overdue',`$${overdue.toLocaleString()}`,'#dc2626']].map(([l,v,col])=>(
          <div key={l} style={{background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,padding:'16px 20px',borderLeft:`3px solid ${col}`,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <p style={{fontSize:12,color:'#9ca3af',fontWeight:500,margin:'0 0 4px'}}>{l}</p>
            <p style={{fontSize:24,fontWeight:700,color:col,margin:0}}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
        <Tabs tabs={tabs} active={tab} onSelect={setTab}/>
        <div style={{padding:24}}>

          {/* ALL */}
          {tab==='all'&&(
            <div>
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['All','Paid','Sent','Overdue','Draft'].map(s=>(
                    <button key={s} onClick={()=>setStatusF(s)}
                      style={{height:32,padding:'0 12px',border:`1px solid ${statusF===s?'#bfdbfe':'#e8e9ec'}`,borderRadius:7,fontSize:12.5,fontWeight:500,color:statusF===s?'#2563eb':'#6b7280',background:statusF===s?'#eff6ff':'#fff',cursor:'pointer'}}>{s}</button>
                  ))}
                </div>
                <button onClick={()=>{setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('create')}}
                  style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',marginLeft:'auto'}}>+ New Invoice</button>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Invoice #','Client','Job','Quote','Issued','Due Date','Amount','Status','Actions'].map(h=>(
                    <th key={h} style={{textAlign:'left',fontSize:11.5,fontWeight:600,color:'#9ca3af',letterSpacing:'0.4px',padding:'9px 14px',borderBottom:'1px solid #f0f1f3',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {visible.map(inv=>(
                      <tr key={inv.id} onClick={()=>open(inv.id)} style={{borderBottom:'1px solid #f8f9fa',cursor:'pointer'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'11px 14px'}}><span style={{fontFamily:'monospace',fontSize:12,background:'#f3f4f6',padding:'2px 7px',borderRadius:4,color:'#6b7280'}}>{inv.id}</span></td>
                        <td style={{padding:'11px 14px',fontWeight:600,color:'#1a1d23',fontSize:13.5,whiteSpace:'nowrap'}}>
                          {inv.clientName}
                          {inv.clientId && <span style={{marginLeft:6,fontFamily:'monospace',fontSize:11,background:'#f0f9ff',color:'#0369a1',border:'1px solid #bae6fd',borderRadius:4,padding:'1px 5px'}}>{inv.clientId}</span>}
                        </td>
                        <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                          {(inv.jobRef||inv.linkedJobId)
                            ? <span style={{fontFamily:'monospace',fontSize:11.5,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:4,padding:'2px 6px'}}>{inv.jobRef||inv.linkedJobId}</span>
                            : <span style={{color:'#d1d5db',fontSize:12}}>—</span>}
                        </td>
                        <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                          {inv.linkedQuoteNumber
                            ? <span style={{fontFamily:'monospace',fontSize:11.5,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe',borderRadius:4,padding:'2px 6px'}}>{inv.linkedQuoteNumber}</span>
                            : <span style={{color:'#d1d5db',fontSize:12}}>—</span>}
                        </td>
                        <td style={{padding:'11px 14px',fontSize:13,color:'#9ca3af',whiteSpace:'nowrap'}}>{inv.issued}</td>
                        <td style={{padding:'11px 14px',fontSize:13.5,fontWeight:inv.status==='Overdue'?600:400,color:inv.status==='Overdue'?'#dc2626':'#374151',whiteSpace:'nowrap'}}>{inv.due}</td>
                        <td style={{padding:'11px 14px',fontSize:13.5,fontWeight:700,color:'#1a1d23',whiteSpace:'nowrap'}}>${inv.total.toLocaleString()}</td>
                        <td style={{padding:'11px 14px'}}><Bdg label={inv.status}/></td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>open(inv.id)} style={{fontSize:12.5,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>View</button>
                            {inv.status==='Draft'&&<button onClick={()=>openSendModal(inv)} style={{fontSize:12.5,color:'#2563eb',background:'#eff6ff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Send</button>}
                            {(inv.status==='Sent'||inv.status==='Overdue')&&<button onClick={()=>updateStatus(inv.id,'Paid')} style={{fontSize:12.5,color:'#16a34a',background:'#f0fdf4',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Mark Paid</button>}
                            {stripeReady&&stripeCfg.showPayNowButton&&inv.status!=='Paid'&&<button onClick={()=>openPayModal(inv)} style={{fontSize:12.5,color:'#7c3aed',background:'#f5f3ff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Pay Now</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visible.length&&<tr><td colSpan={9}><div style={{textAlign:'center',padding:'48px 24px'}}>
                      <div style={{width:52,height:52,borderRadius:14,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,color:'#374151',margin:'0 0 6px'}}>No invoices found</p>
                      <p style={{fontSize:13,color:'#9ca3af',margin:'0 0 16px'}}>Jobs you complete will generate invoices here</p>
                      {canCreate&&<button onClick={()=>{setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('create')}} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Create Invoice</button>}
                    </div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL */}
          {tab==='detail'&&sel&&(
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                <div>
                  <button onClick={()=>setTab('all')} style={{background:'none',border:'none',color:'#6b7280',fontSize:13,cursor:'pointer',padding:0,marginBottom:8}}>← All Invoices</button>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontFamily:'monospace',fontSize:15,fontWeight:700,color:'#1a1d23'}}>{sel.id}</span>
                    <Bdg label={sel.status}/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {sel.status==='Draft'&&<>
                    <button onClick={()=>openSendModal(sel)} style={{height:36,padding:'0 16px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Send Invoice</button>
                  </>}
                  {(sel.status==='Sent'||sel.status==='Overdue')&&<>
                    <button onClick={()=>updateStatus(sel.id,'Paid')} style={{height:36,padding:'0 16px',background:'#16a34a',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Mark as Paid</button>
                    <button style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#374151',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>Send Reminder</button>
                  </>}
                  {sel.status==='Paid'&&<>
                    <span style={{height:36,padding:'0 16px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:8,fontSize:13.5,fontWeight:600,display:'inline-flex',alignItems:'center'}}>✓ Paid</span>
                  </>}
                  {stripeReady&&stripeCfg.showPayNowButton&&sel.status!=='Paid'&&(
                    <button onClick={()=>openPayModal(sel)}
                      style={{height:36,padding:'0 16px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      Pay Now
                    </button>
                  )}
                  <button onClick={()=>generateInvoicePDF(sel,settings)} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#374151',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>⬇ Download PDF</button>
                  <button onClick={()=>printInvoicePDF(sel,settings)} style={{height:36,padding:'0 16px',background:'#fff',border:'1px solid #e8e9ec',color:'#374151',borderRadius:8,fontSize:13.5,cursor:'pointer'}}>🖨 Print</button>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={C}>
                  <p style={CT}>Bill To</p>
                  <p style={{fontSize:15,fontWeight:700,color:'#1a1d23',margin:'0 0 6px'}}>
                    {sel.clientName}
                    {sel.clientId && <span style={{marginLeft:8,fontFamily:'monospace',fontSize:11,background:'#f0f9ff',color:'#0369a1',border:'1px solid #bae6fd',borderRadius:4,padding:'2px 6px',fontWeight:400}}>{sel.clientId}</span>}
                  </p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:'0 0 3px'}}>{sel.clientPhone}</p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:'0 0 3px'}}>{sel.clientEmail}</p>
                  <p style={{fontSize:13.5,color:'#6b7280',margin:0}}>{sel.clientAddress}</p>
                </div>
                <div style={C}>
                  <p style={CT}>Invoice Details</p>
                  {[['Invoice #',sel.id],['Issued',sel.issued],['Due Date',sel.due],['Job Reference',sel.jobRef||'—']].map(([l,v])=>(
                    <div key={l} style={{display:'flex',gap:12,marginBottom:8}}>
                      <span style={{fontSize:12,color:'#9ca3af',width:100,flexShrink:0}}>{l}</span>
                      <span style={{fontSize:13.5,color:'#374151',fontWeight:l==='Invoice #'?600:400}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={C}>
                <p style={CT}>Line Items</p>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['Description','Qty','Unit Price','Total'].map(h=>(
                    <th key={h} style={{textAlign:h==='Description'?'left':'right',fontSize:11.5,fontWeight:600,color:'#9ca3af',padding:'7px 12px',borderBottom:'1px solid #f0f1f3'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{sel.lineItems.map(li=>(
                    <tr key={li.id} style={{borderBottom:'1px solid #f8f9fa'}}>
                      <td style={{padding:'10px 12px',fontSize:13.5,color:'#374151'}}>{li.description}</td>
                      <td style={{padding:'10px 12px',fontSize:13.5,color:'#374151',textAlign:'right'}}>{li.qty}</td>
                      <td style={{padding:'10px 12px',fontSize:13.5,color:'#374151',textAlign:'right'}}>${li.unit.toLocaleString()}</td>
                      <td style={{padding:'10px 12px',fontSize:13.5,fontWeight:600,color:'#1a1d23',textAlign:'right'}}>${li.total.toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{borderTop:'2px solid #f0f1f3',marginTop:4}}>
                  {[['Subtotal',`$${(sel.subtotal||sel.total).toLocaleString()}`],[`Tax (${sel.taxRate||0}%)`,`$${((sel.subtotal||sel.total)*(sel.taxRate||0)/100).toFixed(2)}`]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',fontSize:13.5,color:'#6b7280'}}><span>{l}</span><span>{v}</span></div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'12px 12px',fontSize:16,fontWeight:700,color:'#1a1d23',borderTop:'1px solid #f0f1f3'}}>
                    <span>Total Due</span><span>${sel.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {(sel.linkedJobId||sel.jobRef||sel.linkedQuoteNumber)&&(
                <div style={C}>
                  <p style={CT}>Linked Records</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                    {(sel.linkedJobId||sel.jobRef)&&(
                      <div style={{display:'flex',alignItems:'center',gap:8,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 14px'}}>
                        <span style={{fontSize:11,fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:'0.4px'}}>Job</span>
                        <span style={{fontFamily:'monospace',fontSize:13,color:'#15803d',fontWeight:600}}>{sel.linkedJobId||sel.jobRef}</span>
                      </div>
                    )}
                    {sel.linkedQuoteNumber&&(
                      <div style={{display:'flex',alignItems:'center',gap:8,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'8px 14px'}}>
                        <span style={{fontSize:11,fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.4px'}}>Quote</span>
                        <span style={{fontFamily:'monospace',fontSize:13,color:'#5b21b6',fontWeight:600}}>{sel.linkedQuoteNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {sel.notes&&<div style={C}><p style={CT}>Notes</p><p style={{fontSize:13.5,color:'#374151',lineHeight:1.7,margin:0,background:'#f8f9fa',borderRadius:8,padding:'12px 14px'}}>{sel.notes}</p></div>}
            </div>
          )}

          {/* CREATE */}
          {tab==='create'&&(()=>{
            const {sub,tax,grand}=calcTotals()
            return (
              <div style={{maxWidth:720}}>
                <h3 style={{fontSize:17,fontWeight:700,color:'#1a1d23',margin:'0 0 20px'}}>Create Invoice</h3>
                <div style={C}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    <div>
                      <label style={LB}>Client <span style={{color:'#dc2626'}}>*</span></label>
                      <select value={form.clientId} onChange={e=>{setForm(p=>({...p,clientId:e.target.value,jobRef:''}));setErrs(p=>({...p,clientId:undefined}))}}
                        style={{width:'100%',height:38,border:`1px solid ${errs.clientId?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                        <option value="">— Select client —</option>
                        {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {errs.clientId&&<p style={ET}>Required</p>}
                    </div>
                    <div>
                      <label style={LB}>Job Reference (optional)</label>
                      <select value={form.jobRef} onChange={e=>{
                        const jid=e.target.value
                        setForm(p=>({...p,jobRef:jid}))
                        const j=clientJobs.find(x=>x.id===jid)
                        if(j&&j.lineItems?.length) setLines(j.lineItems.map(li=>({...li,id:Date.now()+Math.random()})))
                      }} style={{width:'100%',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',background:'#fff'}}>
                        <option value="">— None —</option>
                        {clientJobs.map(j=><option key={j.id} value={j.id}>{j.id} — {j.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
                    <div>
                      <label style={LB}>Issue Date</label>
                      <input type="date" value={form.issued} onChange={e=>setForm(p=>({...p,issued:e.target.value}))}
                        style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                    </div>
                    <div>
                      <label style={LB}>Due Date <span style={{color:'#dc2626'}}>*</span></label>
                      <input type="date" value={form.due} onChange={e=>{setForm(p=>({...p,due:e.target.value}));setErrs(p=>({...p,due:undefined}))}}
                        style={{width:'100%',boxSizing:'border-box',height:38,border:`1px solid ${errs.due?'#dc2626':'#e8e9ec'}`,borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                      {errs.due&&<p style={ET}>Required</p>}
                    </div>
                  </div>

                  <div style={{marginTop:20}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <p style={{...CT,margin:0}}>Line Items</p>
                      <button onClick={()=>setLines(p=>[...p,BLANK_LINE()])} style={{fontSize:12.5,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>+ Add Line Item</button>
                    </div>
                    {errs.lines&&<p style={ET}>{errs.lines}</p>}
                    <div style={{border:'1px solid #f0f1f3',borderRadius:8,overflow:'hidden'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 60px 90px 90px 32px',background:'#f8f9fa',padding:'8px 12px',fontSize:11.5,fontWeight:600,color:'#9ca3af'}}>
                        <span>Description</span><span style={{textAlign:'center'}}>Qty</span><span style={{textAlign:'right'}}>Unit $</span><span style={{textAlign:'right'}}>Total</span><span/>
                      </div>
                      {lines.map(li=>(
                        <div key={li.id} style={{display:'grid',gridTemplateColumns:'1fr 60px 90px 90px 32px',gap:6,padding:'8px 12px',borderTop:'1px solid #f3f4f6',alignItems:'center'}}>
                          <input value={li.description} onChange={e=>updateLine(li.id,'description',e.target.value)} placeholder="Description"
                            style={{height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 8px',fontSize:13,color:'#374151',outline:'none'}}/>
                          <input type="number" min="1" value={li.qty} onChange={e=>updateLine(li.id,'qty',e.target.value)}
                            style={{height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 6px',fontSize:13,color:'#374151',outline:'none',textAlign:'center'}}/>
                          <input type="number" min="0" value={li.unit} onChange={e=>updateLine(li.id,'unit',e.target.value)}
                            style={{height:34,border:'1px solid #e8e9ec',borderRadius:6,padding:'0 8px',fontSize:13,color:'#374151',outline:'none',textAlign:'right'}}/>
                          <div style={{height:34,background:'#f8f9fa',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:8,fontSize:13,fontWeight:600,color:'#1a1d23'}}>${(parseFloat(li.total)||0).toFixed(2)}</div>
                          <button onClick={()=>lines.length>1&&setLines(p=>p.filter(x=>x.id!==li.id))} style={{height:28,width:28,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',color:lines.length>1?'#9ca3af':'#e8e9ec',cursor:lines.length>1?'pointer':'default',fontSize:16}}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                    <div style={{width:280,background:'#f8f9fa',borderRadius:8,padding:'12px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13.5,color:'#6b7280',marginBottom:6}}><span>Subtotal</span><span>${sub.toFixed(2)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13.5,color:'#6b7280',marginBottom:6,alignItems:'center'}}>
                        <span>Tax %</span>
                        <input type="number" min="0" max="100" value={form.taxRate} onChange={e=>setForm(p=>({...p,taxRate:e.target.value}))}
                          style={{width:60,height:28,border:'1px solid #e8e9ec',borderRadius:5,padding:'0 6px',fontSize:13,textAlign:'right',outline:'none'}}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13.5,color:'#6b7280',marginBottom:8}}><span>Tax Amount</span><span>${tax.toFixed(2)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,color:'#1a1d23',borderTop:'1px solid #e8e9ec',paddingTop:8}}><span>Total</span><span>${grand.toFixed(2)}</span></div>
                    </div>
                  </div>

                  <div style={{marginTop:14}}>
                    <label style={LB}>Notes</label>
                    <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Payment terms, thank you message…"
                      style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13.5,color:'#374151',resize:'vertical',outline:'none'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #f0f1f3'}}>
                    <button onClick={()=>{setForm(BLANK_FORM);setLines([BLANK_LINE()]);setErrs({});setTab('all')}}
                      style={{height:38,padding:'0 18px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,fontSize:13.5,fontWeight:500,cursor:'pointer'}}>Cancel</button>
                    <button onClick={submitCreate}
                      style={{height:38,padding:'0 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Create Invoice</button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Send Invoice Modal */}
      {/* Payment Link Modal */}
      {payModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f1f3',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <h3 style={{margin:0,fontSize:17,fontWeight:700,color:'#1a1d23'}}>Send Payment Link</h3>
                <p style={{margin:'3px 0 0',fontSize:13,color:'#9ca3af'}}>{payModal.id} · ${(payModal.total||0).toLocaleString()}</p>
              </div>
              <button onClick={()=>setPayModal(null)} style={{width:32,height:32,border:'none',background:'#f3f4f6',borderRadius:8,fontSize:18,cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>

            {payLinkSent ? (
              <div style={{padding:'40px 24px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p style={{margin:0,fontSize:16,fontWeight:700,color:'#1a1d23'}}>Payment Link Sent!</p>
                <p style={{margin:0,fontSize:13.5,color:'#6b7280'}}>Invoice marked as "Payment Link Sent"</p>
              </div>
            ) : (
              <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:18}}>
                {/* Amount */}
                <div style={{background:'#f8f9fa',borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 2px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Amount Due</p>
                    <p style={{fontSize:24,fontWeight:800,color:'#1a1d23',margin:0}}>${(payModal.total||0).toLocaleString()}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 2px'}}>Client</p>
                    <p style={{fontSize:13.5,fontWeight:600,color:'#374151',margin:0}}>{payModal.clientName}</p>
                    {payModal.clientEmail&&<p style={{fontSize:12,color:'#6b7280',margin:'2px 0 0'}}>{payModal.clientEmail}</p>}
                  </div>
                </div>

                {/* Payment link URL */}
                <div>
                  <label style={LB}>Payment Link URL</label>
                  <div style={{display:'flex',gap:8}}>
                    <input value={payLink} onChange={e=>setPayLink(e.target.value)}
                      style={{flex:1,height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13,color:'#374151',outline:'none',fontFamily:'monospace'}}/>
                    <button onClick={copyPayLink}
                      style={{height:38,padding:'0 14px',background:payCopied?'#f0fdf4':'#f3f4f6',border:`1px solid ${payCopied?'#bbf7d0':'#e8e9ec'}`,borderRadius:7,fontSize:13,color:payCopied?'#16a34a':'#374151',cursor:'pointer',whiteSpace:'nowrap',fontWeight:600,transition:'all 0.15s'}}>
                      {payCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p style={{fontSize:11.5,color:'#9ca3af',margin:'5px 0 0'}}>Share this link with the client via email, SMS, or any channel.</p>
                </div>

                {/* Stripe info */}
                <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'10px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth="2" style={{flexShrink:0,marginTop:1}}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  <p style={{fontSize:12.5,color:'#6d28d9',margin:0,lineHeight:1.5}}>Powered by Stripe. Client pays securely on Stripe's hosted page. You'll see the payment in your Stripe Dashboard.</p>
                </div>

                {/* Actions */}
                <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4,borderTop:'1px solid #f0f1f3'}}>
                  <button onClick={()=>setPayModal(null)} style={{height:38,padding:'0 18px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,fontSize:13.5,fontWeight:500,cursor:'pointer'}}>Cancel</button>
                  <button onClick={copyPayLink}
                    style={{height:38,padding:'0 16px',background:'#fff',color:'#7c3aed',border:'1px solid #ddd6fe',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Link
                  </button>
                  <button onClick={handleSendPayLink} disabled={!payLink}
                    style={{height:38,padding:'0 20px',background:payLink?'#7c3aed':'#c4b5fd',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:payLink?'pointer':'default'}}>
                    Send Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sendModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:520,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f1f3',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <h3 style={{margin:0,fontSize:17,fontWeight:700,color:'#1a1d23'}}>Send Invoice</h3>
                <p style={{margin:'3px 0 0',fontSize:13,color:'#9ca3af'}}>{sendModal.id} · ${sendModal.total.toLocaleString()}</p>
              </div>
              <button onClick={()=>setSendModal(null)} style={{width:32,height:32,border:'none',background:'#f3f4f6',borderRadius:8,fontSize:18,cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>

            {sendSuccess ? (
              <div style={{padding:'40px 24px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p style={{margin:0,fontSize:16,fontWeight:700,color:'#1a1d23'}}>Invoice Sent!</p>
                <p style={{margin:0,fontSize:13.5,color:'#6b7280'}}>Sent to {sendForm.to}</p>
              </div>
            ) : (
              <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:16}}>
                {/* To */}
                <div>
                  <label style={LB}>To (Email)</label>
                  <input value={sendForm.to} onChange={e=>setSendForm(p=>({...p,to:e.target.value}))}
                    placeholder="client@example.com"
                    style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                </div>
                {/* Subject */}
                <div>
                  <label style={LB}>Subject</label>
                  <input value={sendForm.subject} onChange={e=>setSendForm(p=>({...p,subject:e.target.value}))}
                    style={{width:'100%',boxSizing:'border-box',height:38,border:'1px solid #e8e9ec',borderRadius:7,padding:'0 12px',fontSize:13.5,color:'#374151',outline:'none'}}/>
                </div>
                {/* Message */}
                <div>
                  <label style={LB}>Message</label>
                  <textarea value={sendForm.message} onChange={e=>setSendForm(p=>({...p,message:e.target.value}))} rows={6}
                    style={{width:'100%',boxSizing:'border-box',border:'1px solid #e8e9ec',borderRadius:7,padding:'10px 12px',fontSize:13,color:'#374151',resize:'vertical',outline:'none',lineHeight:1.6}}/>
                </div>
                {/* Attach PDF toggle */}
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
                  <div onClick={()=>setSendForm(p=>({...p,attachPdf:!p.attachPdf}))}
                    style={{width:40,height:22,borderRadius:11,background:sendForm.attachPdf?'#2563eb':'#d1d5db',transition:'background 0.2s',position:'relative',flexShrink:0}}>
                    <div style={{position:'absolute',top:3,left:sendForm.attachPdf?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                  </div>
                  <span style={{fontSize:13.5,color:'#374151',fontWeight:500}}>Attach PDF copy</span>
                </label>
                {/* Actions */}
                <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4,borderTop:'1px solid #f0f1f3',marginTop:4}}>
                  <button onClick={()=>setSendModal(null)} style={{height:38,padding:'0 18px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:8,fontSize:13.5,fontWeight:500,cursor:'pointer'}}>Cancel</button>
                  <button onClick={handleSend} disabled={!sendForm.to}
                    style={{height:38,padding:'0 20px',background:sendForm.to?'#2563eb':'#93c5fd',color:'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:sendForm.to?'pointer':'default'}}>
                    Send Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const C  = {background:'#fff',border:'1px solid #e8e9ec',borderRadius:10,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}
const CT = {fontSize:12,fontWeight:700,color:'#9ca3af',margin:'0 0 14px',textTransform:'uppercase',letterSpacing:'0.5px'}
const LB = {display:'block',fontSize:12,fontWeight:600,color:'#6b7280',marginBottom:5}
const ET = {fontSize:11,color:'#dc2626',margin:'4px 0 0'}
