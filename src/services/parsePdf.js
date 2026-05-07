// src/services/parsePdf.js
import { promises as fs } from 'fs'
import { PdfReader } from 'pdfreader'
import { isDate, isAmount, isNegativeAmount, shouldSkipLine } from '../utils/validators.js'
import { logger } from '../utils/logger.js'

/**
 * @typedef {Object} Transaction
 * @property {string} date - Transaction date (dd.mm.yy)
 * @property {string} title - Transaction title
 * @property {string[]} description - Transaction description lines
 * @property {string} valuta - Value date
 * @property {string} amount - Transaction amount
 * @property {'incoming'|'outgoing'} type - Transaction type
 * @property {string} balance - Account balance after transaction
 * @property {string|null} time - Transaction time (if available)
 */

/**
 * @typedef {Object} PdfItem
 * @property {string} text - Text content
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

const SKIP_WORDS = Object.freeze([
  'Saldo per', 
  'Umsatz', 
  'Datum', 
  'Text', 
  'Valuta', 
  'Belastung', 
  'Gutschrift', 
  'PABC01'
])

const INCOMING_AMOUNT_X_THRESHOLD = 26
// X coordinates for transaction amount columns in the PDF
const OUTGOING_AMOUNT_X_RANGE = [20, 25]  // Belastung column
const INCOMING_AMOUNT_X_RANGE = [27, 32]  // Gutschrift column

/**
 * Creates an empty transaction object
 * @param {string} date - Initial date for the transaction
 * @returns {Transaction}
 */
// function createEmptyTransaction(date) {
//   return {
//     date,
//     title: null,
//     description: [],
//     valuta: null,
//     amount: null,
//     type: null,
//     balance: null,
//     time: null
//   }
// }

export async function parsePdf(filePath) {
  const pdfBuffer = await fs.readFile(filePath)
    
  return new Promise((resolve) => {
    const transactions = []
    let currentTransaction = null
    let nextIsTitle = false
    
    // Add flags for Saldovortrag sequence
    let lastWasSaldo = false
    let lastWasDate = false
    let isSaldovortragSequence = false
    
    new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
      if (err) {
        console.error('Error parsing PDF:', err)
        return
      }

      if (item?.text) {
        const currentText = item.text.trim()
  
        
        // Track exact Saldovortrag sequence
        if (currentText === 'Saldo') {
          lastWasSaldo = true
          return
        } else if (lastWasSaldo && isDate(currentText)) {
          lastWasDate = true
          lastWasSaldo = false  // reset Saldo flag
          // Don't return here - store the date for potential use
          const potentialDate = currentText
  
          // Continue processing in case this is a real transaction date
          if (!currentTransaction) {
            currentTransaction = {
              date: potentialDate,
              title: null,
              description: [],
              valuta: null,
              amount: null,
              type: null,
              balance: null,
              time: null
            }
            nextIsTitle = true
          }
        } else if (lastWasDate && currentText === 'Saldovortrag') {
          // If it was Saldovortrag, cancel the transaction we started
          currentTransaction = null
          nextIsTitle = false
          isSaldovortragSequence = true
          lastWasDate = false
          return
        } else if (isSaldovortragSequence && isAmount(currentText)) {
          isSaldovortragSequence = false
          return
        } else {
          // Reset sequence flags if anything didn't match
          lastWasSaldo = false
          lastWasDate = false
          isSaldovortragSequence = false
        }

        // Regular skip check
        if (shouldSkipLine(currentText, SKIP_WORDS)) {
          return
        }

        logger('Processing:', currentText, 
          'X:', item.x,
          'IsDate:', isDate(currentText), 
          'IsAmount:', isAmount(currentText))
  
        // Start of new transaction
        if (isDate(currentText)) {
          if (!currentTransaction) {
            currentTransaction = {
              date: currentText,
              title: null,
              description: [],
              valuta: null,
              amount: null,
              type: null,
              balance: null,
              time: null
            }
            nextIsTitle = true
          } else if (!currentTransaction.valuta && currentTransaction.description.length > 0) {
            currentTransaction.valuta = currentText
          }
        }
        // Amount or balance
        else if (isAmount(currentText) && currentTransaction) {          
          if (!currentTransaction.amount) {
            // Check if this amount is in a valid transaction column (not in description text)
            // Valid ranges: Belastung (outgoing) x: 20-25, Gutschrift (incoming) x: 27-32, Balance x: 33+
            const isValidAmount = (item.x >= OUTGOING_AMOUNT_X_RANGE[0] && item.x <= OUTGOING_AMOUNT_X_RANGE[1]) ||
                                  (item.x >= INCOMING_AMOUNT_X_RANGE[0] && item.x <= INCOMING_AMOUNT_X_RANGE[1])
            if (isValidAmount) {
              currentTransaction.amount = currentText
              // If amount is in Gutschrift column (x: 27-32), it's incoming
              currentTransaction.type = (item.x >= INCOMING_AMOUNT_X_RANGE[0]) ? 'incoming' : 'outgoing'
              logger(`Added ${currentTransaction.type} amount:`, currentText, 'X:', item.x)
            }
          } else if (!currentTransaction.balance && item.x > 32) {
            // Balance is in a column further to the right
            currentTransaction.balance = currentText
            // Only push transaction if it has a title (skip Saldovortrag)
            if (currentTransaction.title) {
              transactions.push({...currentTransaction})
              logger('Transaction completed:', currentTransaction)
            }
            currentTransaction = null
          }
        }
        // Negative split amount in balance column: close the current transaction without a balance
        else if (isNegativeAmount(currentText) && currentTransaction?.amount && !currentTransaction.balance && item.x > 31) {
          if (currentTransaction.title) {
            transactions.push({...currentTransaction})
            logger('Transaction completed (split):', currentTransaction)
          }
          currentTransaction = null
        }
        // Must be description text
        else if (currentTransaction) {
          if (nextIsTitle) {
            currentTransaction.title = currentText
            nextIsTitle = false
          } else {
            currentTransaction.description.push(currentText)
            
            // Extract time if line contains transaction date and time
            if (currentText.includes('Transaktionsdatum:')) {
              const timeMatch = currentText.match(/(\d{2}:\d{2}:\d{2})/)
              if (timeMatch) {
                currentTransaction.time = timeMatch[1]
              }
            }
          }
        }
      } else if (item === undefined) {
        resolve(transactions)
      }
    })
  })
}
