import { enrichTransactionWithPayeeAndCategory } from '../payeeMapper.js'

describe('enrichTransactionWithPayeeAndCategory', () => {
  it('keeps notes empty when a category is mapped', () => {
    const transaction = {
      title: 'Migros MM Burgdorf',
      description: ['Bezugsort: Migros MM Burgdorf', 'BC Buchungsnr. 123']
    }

    const result = enrichTransactionWithPayeeAndCategory(transaction, {
      Migros: 'Nahrungsmittel'
    })

    expect(result.payee).toBe('Migros')
    expect(result.category).toBe('Nahrungsmittel')
    expect(result.notes).toBe('')
  })

  it('uses the original description as notes when no payee/category can be mapped', () => {
    const transaction = {
      title: 'Unknown Merchant',
      description: ['First line', 'Second line']
    }

    const result = enrichTransactionWithPayeeAndCategory(transaction, {
      Migros: 'Nahrungsmittel'
    })

    expect(result.payee).toBe('')
    expect(result.category).toBe('')
    expect(result.notes).toBe('First line Second line')
  })

  it('uses the original description as notes when a payee matches but has no category', () => {
    const transaction = {
      title: 'Special Merchant',
      description: 'Original merchant description'
    }

    const result = enrichTransactionWithPayeeAndCategory(transaction, {
      'Special Merchant': ''
    })

    expect(result.payee).toBe('Special Merchant')
    expect(result.category).toBe('')
    expect(result.notes).toBe('Original merchant description')
  })
})
