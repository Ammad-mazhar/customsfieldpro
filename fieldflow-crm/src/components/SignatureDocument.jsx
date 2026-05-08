export default function SignatureDocument({ job, clientName, clientSignature, clientPrintedName, techName, techSignature, techPrintedName, completedAt, title = 'Job Completion Authorization' }) {
  const date = completedAt
    ? new Date(completedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1d23', padding: '20px 24px', color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 4px' }}>Field Service Authorization</p>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 2px', color: '#fff' }}>{title}</h3>
        {job?.id && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Work Order {job.id}</p>}
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {/* Job info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20, padding: '14px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e8e9ec' }}>
          {[
            ['Client',     clientName || job?.clientName || '—'],
            ['Service',    job?.type || '—'],
            ['Address',    job?.address || '—'],
            ['Completed',  date],
            ['Technician', techName || job?.techName || '—'],
            ['Job Total',  job?.total != null ? `$${(job.total).toLocaleString()}` : '—'],
          ].map(([l, v]) => (
            <div key={l}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px', fontFamily: 'system-ui, sans-serif' }}>{l}</p>
              <p style={{ fontSize: 13, color: '#1a1d23', margin: 0, fontFamily: 'system-ui, sans-serif' }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Agreement text */}
        <p style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>
          By signing below, the client confirms that the work described above has been completed to their satisfaction,
          and authorizes payment for the services rendered. The technician's signature certifies that all work was
          performed according to industry standards and company policies.
        </p>

        {/* Signature blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Client signature */}
          <SigBlock
            label="Client Signature"
            signature={clientSignature}
            printedName={clientPrintedName}
            sublabel="Confirms work completion"
          />
          {/* Tech signature */}
          <SigBlock
            label="Technician Signature"
            signature={techSignature}
            printedName={techPrintedName}
            sublabel="Certifies work performed"
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
            Document generated: {new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontFamily: 'system-ui, sans-serif' }}>FieldFlow CRM</p>
        </div>
      </div>
    </div>
  )
}

function SigBlock({ label, signature, printedName, sublabel }) {
  return (
    <div style={{ border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e8e9ec' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 1px', fontFamily: 'system-ui, sans-serif' }}>{label}</p>
        {sublabel && <p style={{ fontSize: 10.5, color: '#9ca3af', margin: 0, fontFamily: 'system-ui, sans-serif' }}>{sublabel}</p>}
      </div>
      <div style={{ padding: '10px 12px', background: '#fff', minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {signature
          ? <img src={signature} alt={label} style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
          : <p style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic', margin: 0, fontFamily: 'system-ui, sans-serif' }}>Not signed</p>
        }
      </div>
      <div style={{ padding: '6px 12px', borderTop: '1px solid #e8e9ec', background: '#fafafa' }}>
        <p style={{ fontSize: 12, color: '#374151', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
          {printedName || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Print name</span>}
        </p>
      </div>
    </div>
  )
}
