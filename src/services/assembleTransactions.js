// src/services/assembleTransactions.js
import { promises as fs } from 'fs'
import path from 'path'
import { parsePdf } from './parsePdf.js'
import { parseNeonCsv } from './parseNeonCsv.js'
import { logger } from '../utils/logger.js'
import { formatDate } from '../utils/formatters.js'

/**
 * @typedef {import('./parsePdf.js').Transaction} Transaction
 */

/**
 * @typedef {Object} TransactionFile
 * @property {string} inputPath - Absolute path of the source file
 * @property {string} relativePath - Path relative to the input root directory
 * @property {string} name - Source file name
 * @property {Transaction[]} transactions - Sorted transactions from this file
 */

/**
 * Recursively collects all files from a directory and its subdirectories
 * @param {string} dirPath - Directory path
 * @returns {Promise<Array>} Array of file objects with { name, path }
 */
async function collectFiles(dirPath) {
  const allFiles = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath)
      allFiles.push(...subFiles)
    } else if (entry.isFile()) {
      allFiles.push({ name: entry.name, path: fullPath })
    }
  }
  
  return allFiles
}

/**
 * Assembles transactions per source file from all PDF and CSV files in the specified directory (recursive)
 * Supports both ZAK PDFs and Neon CSV files
 * @param {string} dirPath - Directory containing PDF and CSV files
 * @returns {Promise<TransactionFile[]>} One entry per source file
 * @throws {Error} If directory reading or file processing fails
 */
export async function assembleTransactions(dirPath) {
  try {
    await fs.access(dirPath)
    
    const allFiles = await collectFiles(dirPath)
    const pdfFiles = allFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'))
    const csvFiles = allFiles.filter(file => file.name.toLowerCase().endsWith('.csv'))

    if (pdfFiles.length === 0 && csvFiles.length === 0) {
      throw new Error(`No PDF or CSV files found in ${dirPath}`)
    }
    
    logger(`Found ${pdfFiles.length} PDF files and ${csvFiles.length} CSV files`)
    
    const results = []
    const errors = []

    // Process PDF files (ZAK)
    for (const pdfFile of pdfFiles) {
      logger(`Processing PDF: ${pdfFile.name}...`)
      try {
        const transactions = await parsePdf(pdfFile.path)
        transactions.sort((a, b) => new Date(formatDate(a.date)) - new Date(formatDate(b.date)))
        results.push({
          inputPath: pdfFile.path,
          relativePath: path.relative(dirPath, pdfFile.path),
          name: pdfFile.name,
          transactions
        })
        logger(`Processed ${transactions.length} transactions from ${pdfFile.name}`)
      } catch (err) {
        errors.push(`Failed to process ${pdfFile.name}: ${err.message}`)
        logger(`Error processing ${pdfFile.name}:`, err)
      }
    }

    // Process CSV files (Neon)
    for (const csvFile of csvFiles) {
      logger(`Processing CSV: ${csvFile.name}...`)
      try {
        const transactions = await parseNeonCsv(csvFile.path)
        transactions.sort((a, b) => new Date(formatDate(a.date)) - new Date(formatDate(b.date)))
        results.push({
          inputPath: csvFile.path,
          relativePath: path.relative(dirPath, csvFile.path),
          name: csvFile.name,
          transactions
        })
        logger(`Processed ${transactions.length} transactions from ${csvFile.name}`)
      } catch (err) {
        errors.push(`Failed to process ${csvFile.name}: ${err.message}`)
        logger(`Error processing ${csvFile.name}:`, err)
      }
    }

    if (errors.length > 0) {
      logger('Encountered errors while processing files:', errors)
    }
    
    if (results.length === 0) {
      throw new Error('No transactions were successfully processed')
    }
    
    return results

  } catch (err) {
    const error = new Error(`Failed to process transactions: ${err.message}`)
    error.cause = err
    throw error
  }
}
