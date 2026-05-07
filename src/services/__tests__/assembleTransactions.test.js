import { jest } from '@jest/globals'
import { mockTransaction } from './fixtures/mockData.js'

// Mock dependencies
const mockReaddir = jest.fn()
const mockAccess = jest.fn()
jest.unstable_mockModule('fs', () => ({
  promises: {
    readdir: mockReaddir,
    access: mockAccess
  }
}))

// Mock logger
jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: jest.fn()
}))

const mockParsePdf = jest.fn()
jest.unstable_mockModule('../parsePdf.js', () => ({
  parsePdf: mockParsePdf
}))

const mockParseNeonCsv = jest.fn()
jest.unstable_mockModule('../parseNeonCsv.js', () => ({
  parseNeonCsv: mockParseNeonCsv
}))

const { assembleTransactions } = await import('../assembleTransactions.js')

// Helper to create dirent-like objects
function createDirent(name, isDir = false) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir
  }
}

describe('assembleTransactions', () => {
  beforeEach(() => {
    mockReaddir.mockClear()
    mockAccess.mockClear()
    mockParsePdf.mockClear()
    mockParseNeonCsv.mockClear()

    // Default successful responses
    mockAccess.mockResolvedValue(undefined)
    mockReaddir.mockResolvedValue([
      createDirent('test1.pdf'),
      createDirent('test2.pdf'),
      createDirent('notapdf.txt')
    ])
    mockParsePdf.mockResolvedValue([mockTransaction])
  })

  it('should process PDF files and return one result per file', async() => {
    const results = await assembleTransactions('input')

    expect(mockReaddir).toHaveBeenCalledWith('input', { withFileTypes: true })
    expect(mockParsePdf).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe('test1.pdf')
    expect(results[0].transactions).toHaveLength(1)
    expect(results[0].transactions[0].date).toBe(mockTransaction.date)
    expect(results[0].relativePath).toBe('test1.pdf')
  })

  it('should handle PDF processing errors', async() => {
    mockParsePdf.mockRejectedValue(new Error('PDF processing failed'))
    mockReaddir.mockResolvedValue([createDirent('test1.pdf')]) // Only one file to simplify test

    await expect(assembleTransactions('input'))
      .rejects
      .toThrow('Failed to process transactions: No transactions were successfully processed')
  })

  it('should throw error if no PDF or CSV files found', async() => {
    mockReaddir.mockResolvedValue([createDirent('notapdf.txt')])

    await expect(assembleTransactions('input'))
      .rejects
      .toThrow('No PDF or CSV files found in input')
  })

  it('should throw error if directory does not exist', async() => {
    mockAccess.mockRejectedValue(new Error('Directory not found'))
    
    await expect(assembleTransactions('invalid'))
      .rejects
      .toThrow('Failed to process transactions: Directory not found')
  })
}, 10000)