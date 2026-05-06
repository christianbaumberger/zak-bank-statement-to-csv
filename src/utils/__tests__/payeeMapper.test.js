import { enrichTransactionWithPayeeAndCategory } from '../payeeMapper.js'

describe('enrichTransactionWithPayeeAndCategory', () => {
  it('always populates notes as "title: description"', () => {
    const transaction = {
      title: 'Migros MM Burgdorf',
      description: ['Bezugsort: Migros MM Burgdorf', 'BC Buchungsnr. 123']
    }

    const result = enrichTransactionWithPayeeAndCategory(transaction, {
      Migros: 'Nahrungsmittel'
    })

    expect(result.payee).toBe('Migros')
    expect(result.category).toBe('Nahrungsmittel')
    expect(result.notes).toBe('Migros MM Burgdorf: Bezugsort: Migros MM Burgdorf BC Buchungsnr. 123')
  })

  it('matches truncated multi-word OCR text to the full mapped payee', () => {
    const transaction = {
      title: 'Warenbezug und Dienstleistungen',
      description: ['Bezugsort: SBB Restaura Soleure', 'BC Buchungsnr. 123']
    }

    const result = enrichTransactionWithPayeeAndCategory(transaction, {
      SBB: 'Income',
      'Sbb Restaurant': 'Nebenkosten'
    })

    expect(result.payee).toBe('Sbb Restaurant')
    expect(result.category).toBe('Nebenkosten')
    expect(result.notes).toBe('Warenbezug und Dienstleistungen: Bezugsort: SBB Restaura Soleure BC Buchungsnr. 123')
  })

  it('prefers a full multi-word exact match over a shorter generic match', () => {
    const transaction = {
      title: 'SBB CORPORATE TREASURY',
      description: ['Lohn/Gehalt']
    }

    const result = enrichTransactionWithPayeeAndCategory(transaction, {
      SBB: 'Income',
      'SBB CORPORATE TREASURY': 'Income'
    })

    expect(result.payee).toBe('SBB CORPORATE TREASURY')
    expect(result.category).toBe('Income')
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
    expect(result.notes).toBe('Unknown Merchant: First line Second line')
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
    expect(result.notes).toBe('Special Merchant: Original merchant description')
  })
})
