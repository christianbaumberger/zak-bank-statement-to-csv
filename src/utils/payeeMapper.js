// src/utils/payeeMapper.js
import { promises as fs } from 'fs'
import path from 'path'

let payeeCategoryMapping = null

/**
 * Load the payee-to-category mapping from JSON file
 * @returns {Promise<Object>}
 */
async function loadMapping() {
  if (payeeCategoryMapping) {
    return payeeCategoryMapping
  }

  try {
    const mappingPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../mapping/payee-category-mapping.json'
    )
    const content = await fs.readFile(mappingPath, 'utf-8')
    payeeCategoryMapping = JSON.parse(content)
    return payeeCategoryMapping
  } catch (err) {
    console.warn('Failed to load payee mapping:', err.message)
    return {}
  }
}

/**
 * Extract payee from title or description by matching against known payees
 * @param {string} title - Transaction title
 * @param {string|string[]} description - Transaction description (string or array)
 * @param {Object} mapping - Payee-to-category mapping
 * @returns {string|null}
 */
function extractPayeeFromTransaction(title, description, mapping) {
  const payeeList = Object.keys(mapping)

  // Combine title and description for searching
  const allText = [
    title,
    ...(Array.isArray(description) ? description : [description])
  ]
    .filter(Boolean)

  // Sort by length descending to match longer/more specific payees first
  const sortedPayees = payeeList.sort((a, b) => b.length - a.length)

  // First, try to find exact match in title or any description line
  for (const text of allText) {
    const textLower = text.toLowerCase()
    for (const payee of sortedPayees) {
      if (!payee) continue
      // Look for payee as a whole word (with word boundaries or at start/end)
      const payeeLower = payee.toLowerCase()
      // Use word boundary approach: check if payee appears as separate word
      const regex = new RegExp(`\\b${payeeLower}\\b`, 'i')
      if (regex.test(textLower)) {
        return payee
      }
    }
  }

  // Fallback: substring match (less strict, for partial matches in specific fields)
  const combinedSearch = allText.join(' ').toLowerCase()
  for (const payee of sortedPayees) {
    if (payee && combinedSearch.includes(payee.toLowerCase())) {
      return payee
    }
  }

  return null
}

/**
 * Get category for a payee
 * @param {string} payee - Payee name
 * @param {Object} mapping - Payee-to-category mapping
 * @returns {string}
 */
function getCategoryForPayee(payee, mapping) {
  if (!payee || !mapping[payee]) {
    return ''
  }
  return mapping[payee]
}

/**
 * Main function to enrich transaction with payee and category
 * @param {Object} transaction - Transaction object with title and description
 * @param {Object} mapping - Payee-to-category mapping
 * @returns {Object} - Enriched transaction with payee and category
 */
export function enrichTransactionWithPayeeAndCategory(transaction, mapping) {
  const payee = extractPayeeFromTransaction(
    transaction.title,
    transaction.description,
    mapping
  )

  const category = getCategoryForPayee(payee, mapping)

  return {
    ...transaction,
    payee: payee || '',
    category: category || '',
    notes: ''
  }
}

/**
 * Load mapping and enrich transaction
 * @param {Object} transaction - Transaction object
 * @returns {Promise<Object>}
 */
export async function enrichTransaction(transaction) {
  const mapping = await loadMapping()
  return enrichTransactionWithPayeeAndCategory(transaction, mapping)
}

/**
 * Enrich multiple transactions
 * @param {Object[]} transactions - Array of transaction objects
 * @returns {Promise<Object[]>}
 */
export async function enrichTransactions(transactions) {
  const mapping = await loadMapping()
  return transactions.map(t => enrichTransactionWithPayeeAndCategory(t, mapping))
}

