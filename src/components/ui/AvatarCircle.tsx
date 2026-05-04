interface Props {
  avatarUrl?: string | null
  initial: string
  size?: number
}

export default function AvatarCircle({ avatarUrl, initial, size = 40 }: Props) {
  // Only show photo if avatarUrl exists (Google users only)
  if (avatarUrl) {
    return (
      <div
        className="rounded-full overflow-hidden border-2 border-[#E8BC6A] flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={initial}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  // Email users always get initial circle
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold border-2 border-[#E8BC6A] flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #7A1F28, #4E1219)',
        color: '#E8BC6A',
        fontSize: size * 0.38,
      }}
    >
      {initial.toUpperCase()}
    </div>
  )
}
