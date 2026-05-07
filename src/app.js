// src/app.js
import path from 'path'
import { promises as fs } from 'fs'
import { logger } from './utils/logger.js'
import { saveToCsv } from './services/saveToCsv.js'
import { assembleTransactions } from './services/assembleTransactions.js'
import { enrichTransactions } from './utils/payeeMapper.js'
import { config } from './config/config.js'

function deriveOutputPath(outputDir, relativePath) {
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')
  return path.join(outputDir, `${withoutExt}.csv`)
}

async function initialize(inputDir, outputDir) {
  try {
    logger('Starting PDF and CSV processing...')
    const transactionFiles = await assembleTransactions(inputDir)

    let totalTransactions = 0

    for (const file of transactionFiles) {
      // Enrich this file's transactions
      const enriched = await enrichTransactions(file.transactions)

      // Derive mirrored output path
      const outputPath = deriveOutputPath(outputDir, file.relativePath)

      // Ensure output subdirectory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true })

      // Save
      await saveToCsv(enriched, outputPath)
      logger(`Saved ${enriched.length} transactions → ${outputPath}`)
      totalTransactions += enriched.length
    }

    logger(`Done. Wrote ${transactionFiles.length} file(s) with ${totalTransactions} total transactions.`)
  } catch (err) {
    console.error('Error in PDF/CSV to CSV conversion:', err)
    throw err
  }
}

export async function run() {
  const inputDir = config.INPUT_DIRECTORY
  const outputDir = config.OUTPUT_DIRECTORY
  await initialize(inputDir, outputDir)
}