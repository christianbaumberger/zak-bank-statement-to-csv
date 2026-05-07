/**
 * Formats a date string to yyyy-mm-dd format
 * Accepts both dd.mm.yy (ZAK PDF format) and yyyy-mm-dd (Neon CSV format)
 * @param {string} dateStr - Date string in format dd.mm.yy or yyyy-mm-dd
 * @returns {string} Date in format yyyy-mm-dd
 * @throws {Error} If date string is invalid
 */
export function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Invalid date string provided')
  }

  // Check if already in yyyy-mm-dd format (Neon CSV format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Parse dd.mm.yy format (ZAK PDF format)
  const parts = dateStr.split('.')
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`)
  }

  const [day, month, year] = parts
  return `20${year}-${month}-${day}`
}

/**
 * Formats an amount string by removing apostrophes
 * @param {string} amountStr - Amount string
 * @returns {string} Formatted amount
 */
export function formatAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') {
    throw new Error('Invalid amount string provided')
  }
  return amountStr.replace(/'/g, '')
}

/**
 * Formats description array or string into a single string
 * @param {string|string[]} description - Description to format
 * @returns {string} Formatted description
 */
export function formatDescription(description) {
  if (!description) return ''
  return Array.isArray(description) ? description.join(' ') : String(description)
}

/**
 * Formats a field for CSV output
 * @param {any} field - Field to format
 * @returns {string} CSV-formatted field
 */
export function formatCsvField(field) {
  const str = String(field ?? '')
  return `"${str.replace(/"/g, '""')}"`
} 