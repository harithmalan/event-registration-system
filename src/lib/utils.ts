export function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-LK', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export function getTimeUntilEvent() {
  const event = new Date('2026-05-08T09:00:00+05:30')
  const now = new Date()
  const diff = event.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}