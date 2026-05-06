import { jest } from '@jest/globals'
import { mockTransaction } from './fixtures/mockData.js'

// Create mock before imports
const mockWriteFile = jest.fn()
jest.unstable_mockModule('fs', () => ({
  promises: {
    writeFile: mockWriteFile
  }
}))

// Import after mocking
const { saveToCsv } = await import('../saveToCsv.js')

describe('saveToCsv', () => {
  beforeEach(() => {
    mockWriteFile.mockClear()
  })

  it('should save transactions to CSV file', async() => {
    const transactions = [{
      ...mockTransaction,
      payee: 'Test Payee',
      notes: 'Original unmatched description',
      category: 'Test Category'
    }]
    const outputPath = 'test.csv'

    await saveToCsv(transactions, outputPath)

    expect(mockWriteFile).toHaveBeenCalled()
    const csvContent = mockWriteFile.mock.calls[0][1]
    
    // Check headers
    expect(csvContent).toContain('date,payee,notes,category,incoming,outgoing')

    // Check data row (with proper CSV escaping)
    const expectedRow = '"2023-12-31","Test Payee","Original unmatched description","Test Category","100.00",""'
    expect(csvContent).toContain(expectedRow)
  })

  it('should handle empty transactions array', async() => {
    const transactions = []
    const outputPath = 'test.csv'

    await saveToCsv(transactions, outputPath)

    expect(mockWriteFile).toHaveBeenCalled()
    const csvContent = mockWriteFile.mock.calls[0][1]
    expect(csvContent).toBe('date,payee,notes,category,incoming,outgoing')
  })
}) 