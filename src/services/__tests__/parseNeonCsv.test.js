// src/services/__tests__/parseNeonCsv.test.js
import { parseNeonCsv } from '../parseNeonCsv.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('parseNeonCsv', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'neon-csv-test-'))
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true })
  })

  it('should parse a valid Neon CSV file', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-04-22";"-26.95";"";"";"";"Company";;"leisure";"";"no";"no"
"2026-04-22";"100.00";"";"";"";"Name";"";"income";"";"no";"no"`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(2)
    expect(transactions[0]).toEqual({
      date: '2026-04-22',
      title: 'Company',
      description: [],
      valuta: null,
      amount: '26.95',
      type: 'outgoing',
      balance: null,
      time: null,
      neonCategory: 'leisure'
    })
    expect(transactions[1]).toEqual({
      date: '2026-04-22',
      title: 'Name',
      description: [],
      valuta: null,
      amount: '100',
      type: 'incoming',
      balance: null,
      time: null,
      neonCategory: 'income'
    })
  })

  it('should parse a CSV with subject field', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-03-15";"-50.00";"";"";"";"Payment";"Invoice #123";"uncategorized";"";"no";"no"`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toEqual({
      date: '2026-03-15',
      title: 'Payment',
      description: ['Invoice #123'],
      valuta: null,
      amount: '50',
      type: 'outgoing',
      balance: null,
      time: null,
      neonCategory: 'uncategorized'
    })
  })

  it('should handle quoted fields with semicolons', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-02-10";"-35.00";"";"";"";"Restaurant; Name";"Main course; Drinks";"food";"";"no";"no"`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(1)
    expect(transactions[0].title).toBe('Restaurant; Name')
    expect(transactions[0].description).toEqual(['Main course; Drinks'])
  })

  it('should skip rows with missing required fields', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-02-10";"-35.00";"";"";"";"Valid";"";"";"no";"no";""
"2026-02-11";"-45.00";"";"";"";"Another";"";"";"no";"no";""`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(2)
    expect(transactions[0].title).toBe('Valid')
    expect(transactions[1].title).toBe('Another')
  })

  it('should throw error for empty CSV file', async () => {
    const csvPath = path.join(tempDir, 'empty.csv')
    await fs.writeFile(csvPath, '')

    await expect(parseNeonCsv(csvPath))
      .rejects
      .toThrow('CSV file has no data rows')
  })

  it('should throw error for CSV with only header', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"`

    const csvPath = path.join(tempDir, 'header-only.csv')
    await fs.writeFile(csvPath, csvContent)

    await expect(parseNeonCsv(csvPath))
      .rejects
      .toThrow('CSV file has no data rows')
  })

  it('should throw error for non-existent file', async () => {
    const csvPath = path.join(tempDir, 'nonexistent.csv')

    await expect(parseNeonCsv(csvPath))
      .rejects
      .toThrow('Failed to parse Neon CSV')
  })

  it('should handle escaped quotes in fields', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-01-15";"-20.00";"";"";"";"Shop A";"Regular item";"";"no";"no";""
"2026-01-16";"-25.00";"";"";"";"Shop B";"Premium item";"";"no";"no";""`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(2)
    expect(transactions[0].title).toBe('Shop A')
    expect(transactions[1].title).toBe('Shop B')
  })

  it('should validate date format (must be YYYY-MM-DD)', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-04-22";"-26.95";"";"";"";"Valid";"";"";"";"no";""
"2026-04-23";"-26.95";"";"";"";"Also Valid";"";"";"";"no";""`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(2)
    expect(transactions[0].title).toBe('Valid')
    expect(transactions[1].title).toBe('Also Valid')
  })

  it('should handle floating point amounts correctly', async () => {
    const csvContent = `"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-02-13";"-56.20";"";"";"";"Shop A";;"household";"";"no";"no"
"2026-02-13";"-90.00";"";"";"";"Shop B";;"leisure";"";"no";"no"
"2026-02-11";"-59.55";"";"";"";"Shop A";;"household";"";"no";"no"`

    const csvPath = path.join(tempDir, 'test.csv')
    await fs.writeFile(csvPath, csvContent)

    const transactions = await parseNeonCsv(csvPath)

    expect(transactions).toHaveLength(3)
    expect(transactions[0].amount).toBe('56.2')
    expect(transactions[1].amount).toBe('90')
    expect(transactions[2].amount).toBe('59.55')
  })
})

