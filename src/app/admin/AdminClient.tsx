'use client'

import { useState, useMemo } from 'react'
import {
  Search, Check, X, RefreshCw, Send, Eye,
  Users, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type ReceiptStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

interface RegistrationRow {
  id: string
  user_id: string
  receipt_url: string | null
  receipt_status: string
  rejection_reason: string | null
  qr_token: string | null
  qr_used: boolean
  email_sent: boolean
  uploaded_at: string | null
  reviewed_at: string | null
  profiles: { full_name: string; student_number: string; email: string; avatar_initial: string | null } | null
}

interface Stats { total: number; pending: number; approved: number; rejected: number }

export default function AdminClient({ initialData, stats }: { initialData: RegistrationRow[]; stats: Stats }) {
  const [rows, setRows] = useState<RegistrationRow[]>(initialData)
  const [filterStatus, setFilterStatus] = useState<'all' | ReceiptStatus>('all')
  const [filterQR, setFilterQR] = useState<'all' | 'sent' | 'used'>('all')
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [rejectModalId, setRejectModalId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [receiptModal, setReceiptModal] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.receipt_status !== filterStatus) return false
      if (filterQR === 'sent' && !(r.qr_token && !r.qr_used)) return false
      if (filterQR === 'used' && !r.qr_used) return false
      if (search) {
        const q = search.toLowerCase()
        const name = r.profiles?.full_name?.toLowerCase() ?? ''
        const snum = r.profiles?.student_number?.toLowerCase() ?? ''
        const email = r.profiles?.email?.toLowerCase() ?? ''
        if (!name.includes(q) && !snum.includes(q) && !email.includes(q)) return false
      }
      return true
    })
  }, [rows, filterStatus, filterQR, search])

  async function handleApprove(row: RegistrationRow) {
    setLoadingId(row.id)
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: row.id,
          userId: row.user_id,
          studentEmail: row.profiles?.email,
          studentName: row.profiles?.full_name,
        }),
      })
      if (res.ok) {
        const { qrToken } = await res.json()
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, receipt_status: 'approved', qr_token: qrToken, email_sent: true } : r))
      }
    } finally { setLoadingId(null) }
  }

  async function handleReject() {
    if (!rejectModalId) return
    const row = rows.find(r => r.id === rejectModalId)
    if (!row) return
    setLoadingId(rejectModalId)
    try {
      await fetch('/api/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: row.id,
          userId: row.user_id,
          studentEmail: row.profiles?.email,
          studentName: row.profiles?.full_name,
          reason: rejectReason,
        }),
      })
      setRows(prev => prev.map(r => r.id === rejectModalId ? { ...r, receipt_status: 'rejected', rejection_reason: rejectReason } : r))
    } finally {
      setLoadingId(null)
      setRejectModalId(null)
      setRejectReason('')
    }
  }

  async function handleSendEmail(row: RegistrationRow) {
    setLoadingId(row.id)
    try {
      await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: row.profiles?.email, studentName: row.profiles?.full_name, qrToken: row.qr_token }),
      })
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, email_sent: true } : r))
    } finally { setLoadingId(null) }
  }

  async function handleReReview(row: RegistrationRow) {
    setLoadingId(row.id)
    try {
      const res = await fetch('/api/re-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: row.id }),
      })
      if (res.ok) setRows(prev => prev.map(r => r.id === row.id ? { ...r, receipt_status: 'pending' } : r))
    } finally { setLoadingId(null) }
  }

  const tabs: Array<{ key: 'all' | ReceiptStatus; label: string; count?: number }> = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
  ]

  const qrBadge = (row: RegistrationRow) => {
    if (row.qr_used) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[#2D7A3A]/10 text-[#2D7A3A] border border-[#2D7A3A]/25">Used</span>
    if (row.qr_token) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[#3A7ABD]/10 text-[#2A5F99] border border-[#3A7ABD]/25">Sent</span>
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[#9C7D5A]/10 text-[#9C7D5A] border border-[#9C7D5A]/20">Not Sent</span>
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-yatra text-2xl text-[#7A1F28]">Admin Panel</h1>
        <p className="text-sm text-[#9C7D5A]">Manage registrations for Awurudu 2026 — BMICH Hidden Escape, 8th May 2026</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { icon: <Users size={18} />, label: 'Total', value: stats.total, accent: '#C9943A' },
          { icon: <Clock size={18} />, label: 'Pending', value: stats.pending, accent: '#8B6914' },
          { icon: <CheckCircle2 size={18} />, label: 'Approved', value: stats.approved, accent: '#2D7A3A' },
          { icon: <XCircle size={18} />, label: 'Rejected', value: stats.rejected, accent: '#8B1A1A' },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-[rgba(201,148,58,0.1)] shadow-[0_4px_24px_rgba(122,31,40,0.08)]" style={{ borderTop: `3px solid ${accent}` }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: accent }}>{icon}<span className="text-[0.72rem] uppercase tracking-wider text-[#9C7D5A]">{label}</span></div>
            <div className="font-yatra text-3xl" style={{ color: '#7A1F28' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-[rgba(201,148,58,0.1)] shadow-[0_4px_24px_rgba(122,31,40,0.08)] mb-4 flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === tab.key ? 'text-[#F5E4B8]' : 'text-[#5C3D2E] hover:bg-[#FAF3E0]'}`}
              style={filterStatus === tab.key ? { background: 'linear-gradient(135deg, #7A1F28, #4E1219)' } : {}}
            >
              {tab.label} {tab.count !== undefined && <span className="ml-1 opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C7D5A]" />
          <input
            id="admin-search"
            type="text"
            placeholder="Search by name, student no, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] outline-none focus:border-[#C9943A] transition-all"
          />
        </div>
        <select
          value={filterQR}
          onChange={(e) => setFilterQR(e.target.value as 'all' | 'sent' | 'used')}
          className="px-3 py-1.5 rounded-lg border border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] outline-none focus:border-[#C9943A]"
        >
          <option value="all">All QR Status</option>
          <option value="sent">QR Sent</option>
          <option value="used">QR Used</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-[rgba(201,148,58,0.1)] shadow-[0_4px_24px_rgba(122,31,40,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead style={{ background: 'linear-gradient(135deg, #4E1219, #7A1F28)' }}>
              <tr>
                {['Student', 'Email', 'Uploaded', 'Receipt', 'Status', 'QR', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-wider text-[#F5E4B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-[#9C7D5A]">No registrations found.</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="border-b border-[#EEE2C8] hover:bg-[rgba(201,148,58,0.03)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#E8BC6A] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)', color: '#E8BC6A' }}>
                        {row.profiles?.avatar_initial ?? row.profiles?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#2B1A0E]">{row.profiles?.full_name ?? '—'}</p>
                        <p className="text-xs text-[#9C7D5A]">{row.profiles?.student_number ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#5C3D2E]">{row.profiles?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#9C7D5A]">{row.uploaded_at ? formatDate(row.uploaded_at) : '—'}</td>
                  <td className="px-4 py-3">
                    {row.receipt_url ? (
                      <button
                        onClick={() => setReceiptModal(row.receipt_url!)}
                        className="w-11 h-9 rounded-lg border-2 border-[#EEE2C8] bg-[#FAF3E0] flex items-center justify-center hover:border-[#C9943A] transition-all"
                        title="View receipt"
                      >
                        <Eye size={13} className="text-[#9C7D5A]" />
                      </button>
                    ) : <span className="text-xs text-[#9C7D5A]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.receipt_status as ReceiptStatus} />
                  </td>
                  <td className="px-4 py-3">{qrBadge(row)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {row.receipt_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(row)}
                            disabled={loadingId === row.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                            style={{ background: '#2D7A3A' }}
                          >
                            {loadingId === row.id ? <LoadingSpinner size={12} color="white" /> : <Check size={12} />}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModalId(row.id)}
                            disabled={loadingId === row.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                            style={{ background: '#8B1A1A' }}
                          >
                            <X size={12} />Reject
                          </button>
                        </>
                      )}
                      {row.receipt_status === 'approved' && !row.email_sent && (
                        <button
                          onClick={() => handleSendEmail(row)}
                          disabled={loadingId === row.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                          style={{ background: '#2A5F99' }}
                        >
                          {loadingId === row.id ? <LoadingSpinner size={12} color="white" /> : <Send size={12} />}
                          Send Email
                        </button>
                      )}
                      {row.receipt_status === 'rejected' && (
                        <button
                          onClick={() => handleReReview(row)}
                          disabled={loadingId === row.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60"
                          style={{ background: '#8B6914' }}
                        >
                          {loadingId === row.id ? <LoadingSpinner size={12} color="white" /> : <RefreshCw size={12} />}
                          Re-review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,10,5,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="relative bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#EEE2C8]">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-yatra text-xl text-[#7A1F28]">Payment Receipt</h2>
              <button onClick={() => setReceiptModal(null)} className="w-8 h-8 rounded-lg bg-[#FAF3E0] flex items-center justify-center hover:bg-[#EEE2C8] transition-all"><X size={16} className="text-[#9C7D5A]" /></button>
            </div>
            {receiptModal.toLowerCase().endsWith('.pdf') ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#5C3D2E] mb-3">PDF receipt — click to open in new tab.</p>
                <a href={receiptModal} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl text-sm font-semibold text-[#F5E4B8]" style={{ background: 'linear-gradient(135deg, #7A1F28, #4E1219)' }}>Open PDF</a>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receiptModal} alt="Payment receipt" className="w-full rounded-xl border-2 border-[#EEE2C8] object-contain max-h-[60vh]" />
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,10,5,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#EEE2C8]">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7A1F28, #C9943A, #7A1F28)' }} />
            <h2 className="font-yatra text-xl text-[#7A1F28] mb-4">Reject Receipt</h2>
            <p className="text-sm text-[#5C3D2E] mb-3">Provide an optional reason. The student will receive an email with this reason.</p>
            <textarea
              id="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt image is blurry or amount is unclear..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[#EEE2C8] bg-[#FAF3E0] text-sm text-[#2B1A0E] outline-none focus:border-[#C9943A] transition-all resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                id="reject-confirm-btn"
                onClick={handleReject}
                disabled={!!loadingId}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: '#8B1A1A' }}
              >
                {loadingId && <LoadingSpinner size={14} color="white" />}
                Confirm Reject
              </button>
              <button onClick={() => { setRejectModalId(null); setRejectReason('') }} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-[#5C3D2E] bg-[#FAF3E0] border border-[#EEE2C8] hover:bg-[#EEE2C8] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
