// src/services/saveToCsv.js
import { promises as fs } from 'fs'
import { formatDate, formatAmount, formatCsvField } from '../utils/formatters.js'

export async function saveToCsv(transactions, outputPath) {
  const headers = ['date', 'payee', 'notes', 'category', 'incoming', 'outgoing']

  const csvRows = transactions.map(t => [
    formatDate(t.date),
    t.payee || '',
    t.notes || '',
    t.category || '',
    t.type === 'incoming' ? formatAmount(t.amount) : '',
    t.type === 'outgoing' ? formatAmount(t.amount) : ''
  ].map(formatCsvField).join(','))

  const csvContent = [headers.join(','), ...csvRows].join('\n')
  await fs.writeFile(outputPath, csvContent)
}