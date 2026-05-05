// src/services/saveToCsv.js
import { promises as fs } from 'fs'
import { formatDate, formatAmount, formatDescription, formatCsvField } from '../utils/formatters.js'

export async function saveToCsv(transactions, outputPath) {
  const headers = ['date', 'title', 'description', 'incoming', 'outgoing']

  const csvRows = transactions.map(t => [
    formatDate(t.date),
    t.title,
    formatDescription(t.description),
    t.type === 'incoming' ? formatAmount(t.amount) : '',
    t.type === 'outgoing' ? formatAmount(t.amount) : ''
  ].map(formatCsvField).join(','))

  const csvContent = [headers.join(','), ...csvRows].join('\n')
  await fs.writeFile(outputPath, csvContent)
}