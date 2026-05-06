const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function parseAllowedEmailDomains(value?: string | null) {
  return (value ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

function formatAllowedDomainsMessage(allowedDomains: string[]) {
  if (allowedDomains.length === 1) {
    return `Please use your ${allowedDomains[0]} email address.`
  }

  return `Please use one of these email domains: ${allowedDomains.join(', ')}.`
}

export function isValidEmailFormat(value: string) {
  const email = normalizeEmail(value)
  if (!email || email.length > 254 || !BASIC_EMAIL_REGEX.test(email) || email.includes('..')) {
    return false
  }

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return false
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false
  if (domain.startsWith('.') || domain.endsWith('.')) return false

  const labels = domain.split('.')
  return labels.every((label) => label.length > 0 && /^[a-z0-9-]+$/i.test(label) && !label.startsWith('-') && !label.endsWith('-'))
}

export function validateEmailAddress(value: string, allowedDomains: string[] = []) {
  const email = normalizeEmail(value)

  if (!email) {
    return { email, error: 'Please enter your email address.' }
  }

  if (!isValidEmailFormat(email)) {
    return { email, error: 'Please enter a valid email address.' }
  }

  if (allowedDomains.length > 0) {
    const hasAllowedDomain = allowedDomains.some((domain) => email.endsWith(`@${domain}`))
    if (!hasAllowedDomain) {
      return { email, error: formatAllowedDomainsMessage(allowedDomains) }
    }
  }

  return { email, error: null }
}
