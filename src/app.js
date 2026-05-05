// src/app.js
import { logger } from './utils/logger.js'
import { saveToCsv } from './services/saveToCsv.js'
import { assembleTransactions } from './services/assembleTransactions.js'
import { enrichTransactions } from './utils/payeeMapper.js'
import { config } from './config/config.js'

async function initialize(inputDir, outputPath) {
  try {
    logger('Starting PDF processing...')
    const transactions = await assembleTransactions(inputDir)
    logger(`Found total of ${transactions.length} transactions`)
    
    // Enrich transactions with payee and category
    const enrichedTransactions = await enrichTransactions(transactions)
    logger('Successfully enriched transactions with payee and category')

    // Save to CSV
    await saveToCsv(enrichedTransactions, outputPath)
    logger('Successfully saved to CSV')
    
    return enrichedTransactions
  } catch (err) {
    console.error('Error in PDF to CSV conversion:', err)
    throw err
  }
}

export async function run() {
  const inputDir = config.INPUT_DIRECTORY
  const outputPath = `${config.OUTPUT_DIRECTORY}/${config.OUTPUT_FILE_NAME}.csv`
  await initialize(inputDir, outputPath)
}