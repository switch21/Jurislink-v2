/**
 * PII masking utility for audit logs.
 * Conformité Loi 2024/017 (protection des données personnelles, Cameroun).
 * Masks known PII fields by key name while preserving the data structure.
 */

/** Keys that should be treated as email and masked */
const EMAIL_KEYS = new Set(['email', 'emailaddress', 'useremail', 'recipienteemail', 'senderemail'])

/** Keys that should be treated as phone numbers */
const PHONE_KEYS = new Set(['phone', 'telephone', 'tel', 'phonenumber', 'recipientphone', 'senderphone', 'mobilephone', 'mobilenumber'])

/** Keys that should be treated as full names */
const NAME_KEYS = new Set(['fullname', 'full_name', 'name', 'username', 'sendername', 'recipientname', 'clientname'])

/** Keys that should be treated as NIU (Numéro d'Identification Unique) */
const NIU_KEYS = new Set(['niu', 'niu_number', 'nin', 'nationalid', 'idnumber', 'registrationnumber'])

/** Keys whose values should be completely hidden (not partially masked) */
const REDACT_KEYS = new Set(['password', 'passwordhash', 'mfa_secret', 'mfaSecret', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token', 'secret', 'token', 'resettoken', 'reset_token'])

/**
 * Mask an email address: j***@example.com
 */
function maskEmail(value: string): string {
  const at = value.indexOf('@')
  if (at <= 0) return '****'
  const local = value.substring(0, at)
  const domain = value.substring(at)
  return `${local[0]}***${domain}`
}

/**
 * Mask a phone number: +237 6** *** *6
 * Preserves country code prefix and last digit, masks the rest.
 */
function maskPhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, '')
  if (digits.length < 4) return '***'
  // Keep the prefix (everything up to last 4 digits)
  const prefix = digits.slice(0, -4)
  const lastFour = digits.slice(-4)
  return `${prefix}${'*'.repeat(3)} *** *${lastFour[3]}`
}

/**
 * Mask a full name: Jean Dupont → J*** D***
 */
function maskName(value: string): string {
  const parts = value.trim().split(/\s+/)
  return parts.map((part) => {
    if (!part) return ''
    return `${part[0]}***`
  }).join(' ')
}

/**
 * Mask an NIU: M2024ABCD78 → M2***78
 */
function maskNiu(value: string): string {
  const cleaned = value.replace(/[^\w]/g, '')
  if (cleaned.length <= 4) return '****'
  return `${cleaned.slice(0, 2)}***${cleaned.slice(-2)}`
}

/**
 * Detect the PII type of a key and mask the value accordingly.
 */
function maskValue(key: string, value: string): string {
  const lower = key.toLowerCase().replace(/[_-]/g, '')
  if (REDACT_KEYS.has(lower)) return '[CONFIDENTIEL]'
  if (EMAIL_KEYS.has(lower)) return maskEmail(value)
  if (PHONE_KEYS.has(lower)) return maskPhone(value)
  if (NAME_KEYS.has(lower)) return maskName(value)
  if (NIU_KEYS.has(lower)) return maskNiu(value)
  return value
}

/**
 * Recursively mask PII fields in an object.
 * Only masks values for known PII keys; preserves all other data.
 * Handles nested objects and arrays.
 */
export function maskPII(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data

  const result: Record<string, any> = Array.isArray(data) ? [] : {}

  for (const key of Object.keys(data)) {
    const value = data[key]

    if (value === null || value === undefined) {
      result[key] = value
    } else if (typeof value === 'string') {
      result[key] = maskValue(key, value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') return maskValue(key, item)
        if (typeof item === 'object' && item !== null) return maskPII(item as Record<string, any>)
        return item
      })
    } else if (typeof value === 'object') {
      result[key] = maskPII(value as Record<string, any>)
    } else {
      // numbers, booleans, etc. — leave as-is
      result[key] = value
    }
  }

  return result
}
