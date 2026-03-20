function formatToSaE164(input: string) {
  const digitsOnly = input.replace(/\D/g, '')

  if (!digitsOnly) {
    return '+27'
  }

  if (digitsOnly.startsWith('27')) {
    return `+${digitsOnly.slice(0, 11)}`
  }

  if (digitsOnly.startsWith('0')) {
    return `+27${digitsOnly.slice(1, 10)}`
  }

  return `+27${digitsOnly.slice(0, 9)}`
}

function isValidSaE164(phone: string) {
  return /^\+27\d{9}$/.test(phone)
}

function formatCentsToZar(cents: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(cents / 100)
}

function formatDateTime(isoString: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString))
}

export { formatCentsToZar, formatDateTime, formatToSaE164, isValidSaE164 }
