interface StatusBadgeProps {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
}

const statusConfig = {
  not_submitted: {
    label: 'Not Submitted',
    dot: 'bg-[#9C7D5A]',
    bg: 'bg-[#9C7D5A]/10',
    text: 'text-[#9C7D5A]',
    border: 'border-[#9C7D5A]/20',
  },
  pending: {
    label: 'Pending Review',
    dot: 'bg-[#8B6914]',
    bg: 'bg-[#8B6914]/12',
    text: 'text-[#8B6914]',
    border: 'border-[#8B6914]/25',
  },
  approved: {
    label: 'Approved',
    dot: 'bg-[#2D7A3A]',
    bg: 'bg-[#2D7A3A]/10',
    text: 'text-[#2D7A3A]',
    border: 'border-[#2D7A3A]/25',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-[#8B1A1A]',
    bg: 'bg-[#8B1A1A]/10',
    text: 'text-[#8B1A1A]',
    border: 'border-[#8B1A1A]/20',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
