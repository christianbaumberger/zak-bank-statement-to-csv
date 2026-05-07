// src/services/parseNeonCsv.js
import { promises as fs } from 'fs'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Object} Transaction
 * @property {string} date - Transaction date (yyyy-mm-dd format from Neon)
 * @property {string} title - Transaction title (from Description field)
 * @property {string[]} description - Transaction description lines
 * @property {string|null} valuta - Value date (not available in Neon, set to null)
 * @property {string} amount - Transaction amount
 * @property {'incoming'|'outgoing'} type - Transaction type
 * @property {string|null} balance - Account balance after transaction (not available in Neon, set to null)
 * @property {string|null} time - Transaction time (not available in Neon, set to null)
 */

/**
 * Parses a semicolon-delimited CSV file with quoted fields from Neon bank
 * Expected format: "Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
 *
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Transaction[]>} Array of parsed transactions
 * @throws {Error} If file reading or parsing fails
 */
export async function parseNeonCsv(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    if (lines.length < 2) {
      throw new Error('CSV file has no data rows (only header or empty)')
    }

    // Skip header row
    const dataLines = lines.slice(1)
    const transactions = []

    for (const line of dataLines) {
      const fields = parseNeonCsvLine(line)

      if (!fields || fields.length < 11) {
        logger(`Skipping invalid CSV line: ${line}`)
        continue
      }

      const [date, amount, , , , description, subject, category] = fields

      // Skip header row duplicates and empty data rows
      if (date === 'Date' || !date || !amount) {
        continue
      }

      // Validate date format (YYYY-MM-DD)
      if (!isValidNeonDate(date)) {
        logger(`Skipping row with invalid date: ${date}`)
        continue
      }

      // Parse amount to determine incoming/outgoing
      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount)) {
        logger(`Skipping row with invalid amount: ${amount}`)
        continue
      }

      const transaction = {
        date,
        title: description || subject || 'Unknown',
        description: subject ? [subject] : [],
        valuta: null,
        amount: String(Math.abs(parsedAmount)),
        type: parsedAmount >= 0 ? 'incoming' : 'outgoing',
        balance: null,
        time: null,
        neonCategory: category || null // Store for potential enrichment
      }

      logger(`Parsed Neon transaction: ${date} ${transaction.title} ${transaction.amount} (${transaction.type})`)
      transactions.push(transaction)
    }

    if (transactions.length === 0) {
      throw new Error('No valid transactions found in CSV file')
    }

    return transactions

  } catch (err) {
    const error = new Error(`Failed to parse Neon CSV: ${err.message}`)
    error.cause = err
    throw error
  }
}

/**
 * Parses a single line from Neon CSV, handling quoted fields and semicolon delimiters
 * @param {string} line - CSV line to parse
 * @returns {string[]|null} Array of fields or null if parsing fails
 */
function parseNeonCsvLine(line) {
  try {
    const fields = []
    let currentField = ''
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes
        }
      } else if (char === ';' && !insideQuotes) {
        // Field separator
        fields.push(currentField.trim())
        currentField = ''
      } else {
        currentField += char
      }
    }

    // Add last field
    fields.push(currentField.trim())

    return fields
  } catch (err) {
    logger(`Error parsing CSV line: ${err.message}`)
    return null
  }
}

/**
 * Validates if a date string is in YYYY-MM-DD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if date is valid YYYY-MM-DD format
 */
function isValidNeonDate(dateStr) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) {
    return false
  }

  // Basic validation - check if it's a valid date
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date)
}

