// src/utils/payeeMapper.js
import { promises as fs } from 'fs'
import path from 'path'
import { formatDescription } from './formatters.js'

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
 * Normalize whitespace in text (multiple spaces to single space)
 * @param {string} text - Text to normalize
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Normalize text for payee matching
 * @param {string} text - Text to normalize
 * @returns {string}
 */
function normalizeForMatching(text) {
  return normalizeWhitespace(String(text))
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
    .trim()
}

/**
 * Escape a string for regular expression usage
 * @param {string} value - Value to escape
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Check if a normalized payee appears as a whole phrase in normalized text
 * @param {string} normalizedText - Normalized text
 * @param {string} normalizedPayee - Normalized payee
 * @returns {boolean}
 */
function hasWholePhraseMatch(normalizedText, normalizedPayee) {
  const regex = new RegExp(`(^| )${escapeRegExp(normalizedPayee)}(?= |$)`, 'i')
  return regex.test(normalizedText)
}

/**
 * Find the best exact payee match for normalized texts
 * @param {string[]} normalizedTexts - Normalized text lines
 * @param {string[]} sortedPayees - Payees sorted by specificity
 * @param {number} minimumTokenCount - Minimum number of tokens in payee
 * @returns {string|null}
 */
function findExactPayeeMatch(normalizedTexts, sortedPayees, minimumTokenCount = 1) {
  for (const payee of sortedPayees) {
    const normalizedPayee = normalizeForMatching(payee)

    if (!normalizedPayee || normalizedPayee.split(' ').length < minimumTokenCount) {
      continue
    }

    if (normalizedTexts.some(text => hasWholePhraseMatch(text, normalizedPayee))) {
      return payee
    }
  }

  return null
}

/**
 * Try to match a truncated multi-word payee inside normalized text
 * @param {string} normalizedText - Normalized text
 * @param {string} normalizedPayee - Normalized payee
 * @returns {{ exactCount: number, prefixCount: number, totalPrefixLength: number }|null}
 */
function getFuzzyMultiWordMatchScore(normalizedText, normalizedPayee) {
  const payeeTokens = normalizedPayee.split(' ')
  const textTokens = normalizedText.split(' ')

  if (payeeTokens.length < 2 || textTokens.length < payeeTokens.length) {
    return null
  }

  for (let startIndex = 0; startIndex <= textTokens.length - payeeTokens.length; startIndex += 1) {
    let exactCount = 0
    let prefixCount = 0
    let totalPrefixLength = 0
    let matches = true

    for (let tokenIndex = 0; tokenIndex < payeeTokens.length; tokenIndex += 1) {
      const payeeToken = payeeTokens[tokenIndex]
      const textToken = textTokens[startIndex + tokenIndex]

      if (textToken === payeeToken) {
        exactCount += 1
        totalPrefixLength += textToken.length
        continue
      }

      if (textToken.length >= 4 && payeeToken.startsWith(textToken)) {
        prefixCount += 1
        totalPrefixLength += textToken.length
        continue
      }

      matches = false
      break
    }

    if (matches && prefixCount > 0) {
      return { exactCount, prefixCount, totalPrefixLength }
    }
  }

  return null
}

/**
 * Find the best fuzzy multi-word payee match across normalized texts
 * @param {string[]} normalizedTexts - Normalized text lines
 * @param {string[]} sortedPayees - Payees sorted by specificity
 * @returns {string|null}
 */
function findFuzzyMultiWordPayeeMatch(normalizedTexts, sortedPayees) {
  const candidates = []

  for (const payee of sortedPayees) {
    const normalizedPayee = normalizeForMatching(payee)

    if (normalizedPayee.split(' ').length < 2) {
      continue
    }

    for (const text of normalizedTexts) {
      const score = getFuzzyMultiWordMatchScore(text, normalizedPayee)

      if (score) {
        candidates.push({
          payee,
          ...score,
          tokenCount: normalizedPayee.split(' ').length,
          payeeLength: normalizedPayee.length
        })
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((left, right) => {
    if (right.tokenCount !== left.tokenCount) return right.tokenCount - left.tokenCount
    if (right.exactCount !== left.exactCount) return right.exactCount - left.exactCount
    if (right.totalPrefixLength !== left.totalPrefixLength) return right.totalPrefixLength - left.totalPrefixLength
    return right.payeeLength - left.payeeLength
  })

  const [bestCandidate, secondBestCandidate] = candidates

  if (
    secondBestCandidate
    && bestCandidate.tokenCount === secondBestCandidate.tokenCount
    && bestCandidate.exactCount === secondBestCandidate.exactCount
    && bestCandidate.totalPrefixLength === secondBestCandidate.totalPrefixLength
    && bestCandidate.payeeLength === secondBestCandidate.payeeLength
  ) {
    return null
  }

  return bestCandidate.payee
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

  const normalizedTexts = allText.map(normalizeForMatching)

  // Sort by length descending to match longer/more specific payees first
  const sortedPayees = [...payeeList].sort((left, right) => {
    const leftNormalized = normalizeForMatching(left)
    const rightNormalized = normalizeForMatching(right)
    const tokenDifference = rightNormalized.split(' ').length - leftNormalized.split(' ').length

    if (tokenDifference !== 0) {
      return tokenDifference
    }

    return rightNormalized.length - leftNormalized.length
  })

  const exactMultiWordMatch = findExactPayeeMatch(normalizedTexts, sortedPayees, 2)
  if (exactMultiWordMatch) {
    return exactMultiWordMatch
  }

  const fuzzyMultiWordMatch = findFuzzyMultiWordPayeeMatch(normalizedTexts, sortedPayees)
  if (fuzzyMultiWordMatch) {
    return fuzzyMultiWordMatch
  }

  const exactMatch = findExactPayeeMatch(normalizedTexts, sortedPayees)
  if (exactMatch) {
    return exactMatch
  }

  // Fallback: substring match (less strict, for partial matches in specific fields)
  const combinedSearch = normalizeForMatching(allText.join(' '))
  for (const payee of sortedPayees) {
    if (payee && combinedSearch.includes(normalizeForMatching(payee))) {
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
 * Build notes content from title and description
 * @param {string} title - Transaction title
 * @param {string|string[]} description - Original transaction description
 * @returns {string}
 */
function getNotesForTransaction(title, description) {
  const titlePart = title || ''
  const descriptionPart = formatDescription(description)

  if (titlePart && descriptionPart) {
    return `${titlePart}: ${descriptionPart}`
  }

  return titlePart || descriptionPart
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
  const notes = getNotesForTransaction(transaction.title, transaction.description)

  return {
    ...transaction,
    payee: payee || '',
    category: category || '',
    notes
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

