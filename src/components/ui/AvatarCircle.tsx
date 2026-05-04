import Image from 'next/image'

interface AvatarCircleProps {
  avatarUrl?: string | null
  initial: string
  size?: number
}

export default function AvatarCircle({ avatarUrl, initial, size = 36 }: AvatarCircleProps) {
  if (avatarUrl) {
    return (
      <div
        className="rounded-full overflow-hidden border-2 border-[#E8BC6A] flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl}
          alt={initial}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#E8BC6A]"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #7A1F28 0%, #4E1219 100%)',
        fontSize: Math.round(size * 0.4),
        color: '#E8BC6A',
        fontWeight: 700,
      }}
    >
      {initial}
    </div>
  )
}
