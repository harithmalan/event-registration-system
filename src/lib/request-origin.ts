export function resolveRequestOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (configured) {
    try {
      const parsed = new URL(configured)
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
      const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'

      if (!isProduction || !isLocalhost) {
        return parsed.origin
      }
    } catch {
      // Ignore malformed env values and fall back to request headers.
    }
  }

  const forwardedProto = req.headers.get('x-forwarded-proto')
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost || req.headers.get('host')

  if (host) {
    return `${forwardedProto || 'https'}://${host}`
  }

  return 'http://localhost:3000'
}
